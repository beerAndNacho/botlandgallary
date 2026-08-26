import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JOINT,
  ORDER,
  STRIDE,
  phaseContinuousAt,
  poseHash,
  sampleActor,
  sampleClip,
} from '../web/mocap-core.js';
import { buildRenderModel, renderModelSignature } from '../web/mocap-renderer.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clipsDir = process.env.MOTION_CLIPS_DIR || path.resolve(here, '../dist/motion/clips');
const read = (name) => JSON.parse(fs.readFileSync(path.join(clipsDir, `${name}.json`), 'utf8'));
const clips = {
  idle: read('idle'), walk: read('walk'), run: read('run'), crawl: read('crawl'),
  sneak: read('sneak'), wave: read('wave'), sitstand: read('sitstand'), jump: read('jump'),
};

function rms(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / a.length);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : Infinity;
}

test('real CMU demo clips retain the exact 19-joint stream', () => {
  for (const [name, clip] of Object.entries(clips)) {
    assert.deepEqual(clip.order, ORDER, name);
    assert.equal(clip.j.length, clip.n * STRIDE, name);
    assert.ok(clip.j.every(Number.isFinite), name);
  }
});

test('locomotion clips were converted in-place and preserve mps', () => {
  for (const name of ['walk', 'run', 'crawl', 'sneak']) {
    assert.ok(clips[name].mps > 0.05, `${name} mps=${clips[name].mps}`);
    for (let frame = 0; frame < clips[name].n; frame += Math.max(1, Math.floor(clips[name].fps / 3))) {
      const base = frame * STRIDE;
      assert.ok(Math.abs(clips[name].j[base]) <= 0.002, `${name} root x`);
      assert.ok(Math.abs(clips[name].j[base + 2]) <= 0.002, `${name} root z`);
    }
  }
});

test('autoloop and smoothloop produce a controlled walk seam', () => {
  const first = sampleClip(clips.walk, 0, { loop: true });
  const last = sampleClip(clips.walk, (clips.walk.n - 1) / clips.walk.fps, { loop: false });
  assert.ok(rms(first, last) < 0.32, `walk seam=${rms(first, last)}`);
});

test('real walk on a matching straight path has low median planted-foot slip', () => {
  const mps = clips.walk.mps;
  const actor = {
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 10, x: 0, y: 0, z: -mps * 10 }],
    face: [],
  };
  const dt = 1 / 60;
  const speeds = [];
  let previous = sampleActor(actor, 0, clips);
  for (let i = 1; i <= 600; i += 1) {
    const pose = sampleActor(actor, i * dt, clips);
    for (const joint of [JOINT.L_ank, JOINT.R_ank]) {
      const o = joint * 3;
      if (pose[o + 1] < 0.095 && previous[o + 1] < 0.095) {
        speeds.push(Math.hypot(pose[o] - previous[o], pose[o + 2] - previous[o + 2]) / dt);
      }
    }
    previous = pose;
  }
  const value = median(speeds);
  assert.ok(speeds.length > 20, `contact samples=${speeds.length}`);
  assert.ok(value < 0.55, `median planted-foot slip=${value.toFixed(3)}m/s`);
});

test('real idle → walk → sit/get-up → idle sequence has bounded seams', () => {
  const actor = {
    seq: [
      { clip: 'idle', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 },
      { clip: 'walk', at: 2, phaseAt: 2, rate: 1, loop: true, blend: 0.35 },
      { clip: 'sitstand', at: 6, phaseAt: 6, rate: 1, loop: false, blend: 0.45 },
      { clip: 'idle', at: 12, phaseAt: 12, rate: 1, loop: true, blend: 0.5 },
    ],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 2, x: 0, y: 0, z: 0 }, { t: 6, x: 0, y: 0, z: -clips.walk.mps * 4 }, { t: 14, x: 0, y: 0, z: -clips.walk.mps * 4 }],
    face: [],
  };
  for (const boundary of [2, 6, 12]) {
    const before = sampleActor(actor, boundary - 1 / 240, clips);
    const after = sampleActor(actor, boundary + 1 / 240, clips);
    assert.ok(rms(before, after) < 0.42, `boundary ${boundary}, rms=${rms(before, after)}`);
  }
});

test('different real-walk rates preserve phase at the boundary', () => {
  const boundary = 5;
  const phaseAt = phaseContinuousAt(boundary, 0, 0.8, 1.7);
  const actor = {
    seq: [
      { clip: 'walk', at: 0, phaseAt: 0, rate: 0.8, loop: true, blend: 0 },
      { clip: 'walk', at: boundary, phaseAt, rate: 1.7, loop: true, blend: 0 },
    ],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 5, x: 0, y: 0, z: -4 }, { t: 10, x: 0, y: 0, z: -12.5 }],
    face: [],
  };
  const before = sampleActor(actor, boundary - 1e-5, clips);
  const after = sampleActor(actor, boundary + 1e-5, clips);
  assert.ok(rms(before, after) < 0.02, `phase seam=${rms(before, after)}`);
});

test('270° face path and deterministic renderer stay stable', () => {
  const actor = {
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 3, x: -3, y: 0, z: -2 }, { t: 6, x: -1, y: 0, z: -5 }, { t: 9, x: 2, y: 0, z: -4 }, { t: 12, x: 1, y: 0, z: 0 }],
    face: [{ t: 0, yaw: 0 }, { t: 3, yaw: Math.PI / 2 }, { t: 6, yaw: Math.PI }, { t: 9, yaw: Math.PI * 1.5 }, { t: 12, yaw: Math.PI * 1.5 }],
  };
  const a = sampleActor(actor, 8.75, clips);
  const b = sampleActor(actor, 8.75, clips);
  assert.equal(poseHash(a), poseHash(b));
  assert.equal(renderModelSignature(buildRenderModel(a)), renderModelSignature(buildRenderModel(b)));
});
