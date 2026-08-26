import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOINT,
  ORDER,
  STRIDE,
  createPchip,
  phaseContinuousAt,
  poseHash,
  sampleActor,
  unwrapYawValues,
} from '../web/mocap-core.js';
import { buildRenderModel, renderModelSignature } from '../web/mocap-renderer.js';

function setJoint(frame, joint, x, y, z) {
  const o = joint * 3;
  frame[o] = x; frame[o + 1] = y; frame[o + 2] = z;
}

function basePose() {
  const p = new Float64Array(STRIDE);
  setJoint(p, JOINT.pel, 0, 0.95, 0);
  setJoint(p, JOINT.spine, 0, 1.15, 0);
  setJoint(p, JOINT.chest, 0, 1.38, 0);
  setJoint(p, JOINT.neck, 0, 1.58, 0);
  setJoint(p, JOINT.head, 0, 1.78, 0);
  setJoint(p, JOINT.L_hip, 0.17, 0.92, 0);
  setJoint(p, JOINT.L_knee, 0.17, 0.48, 0);
  setJoint(p, JOINT.L_ank, 0.17, 0.06, 0);
  setJoint(p, JOINT.L_toe, 0.17, 0.02, -0.19);
  setJoint(p, JOINT.R_hip, -0.17, 0.92, 0);
  setJoint(p, JOINT.R_knee, -0.17, 0.48, 0);
  setJoint(p, JOINT.R_ank, -0.17, 0.06, 0);
  setJoint(p, JOINT.R_toe, -0.17, 0.02, -0.19);
  setJoint(p, JOINT.L_sho, 0.31, 1.48, 0);
  setJoint(p, JOINT.L_elb, 0.54, 1.17, 0);
  setJoint(p, JOINT.L_hnd, 0.61, 0.91, 0);
  setJoint(p, JOINT.R_sho, -0.31, 1.48, 0);
  setJoint(p, JOINT.R_elb, -0.54, 1.17, 0);
  setJoint(p, JOINT.R_hnd, -0.61, 0.91, 0);
  return p;
}

function clipFromFrames(name, frames, fps = 30, mps = 0) {
  return {
    v: 1, kind: 'mocap', name, fps, n: frames.length, order: ORDER,
    j: frames.flatMap((frame) => Array.from(frame)), src: 'synthetic', mps,
  };
}

function makeWalkClip() {
  const fps = 30;
  const frames = [];
  for (let i = 0; i < 60; i += 1) {
    const t = i / fps;
    const phase = t % 2;
    const p = basePose();
    const leftStance = phase < 1;
    const leftZ = leftStance ? phase : 1 - (phase - 1);
    const rightZ = leftStance ? phase : phase - 1;
    setJoint(p, JOINT.L_ank, 0.17, leftStance ? 0.02 : 0.12 + Math.sin((phase - 1) * Math.PI) * 0.08, leftZ);
    setJoint(p, JOINT.L_toe, 0.17, leftStance ? 0 : 0.08, leftZ - 0.19);
    setJoint(p, JOINT.R_ank, -0.17, leftStance ? 0.12 + Math.sin(phase * Math.PI) * 0.08 : 0.02, rightZ);
    setJoint(p, JOINT.R_toe, -0.17, leftStance ? 0.08 : 0, rightZ - 0.19);
    const swing = Math.sin(phase * Math.PI);
    p[JOINT.L_hnd * 3 + 2] = -swing * 0.25;
    p[JOINT.R_hnd * 3 + 2] = swing * 0.25;
    frames.push(p);
  }
  return clipFromFrames('walk', frames, fps, 1);
}

function makeStandClip() {
  return clipFromFrames('stand', Array.from({ length: 30 }, () => basePose()), 30, 0);
}

function makeSitClip() {
  const frames = [];
  for (let i = 0; i < 60; i += 1) {
    const p = basePose();
    const u = i / 59;
    const down = u < 0.5 ? u * 2 : (1 - u) * 2;
    for (let j = 0; j < ORDER.length; j += 1) p[j * 3 + 1] -= down * (j <= JOINT.head ? 0.48 : 0.25);
    p[JOINT.L_knee * 3 + 2] -= down * 0.35;
    p[JOINT.R_knee * 3 + 2] -= down * 0.35;
    frames.push(p);
  }
  return clipFromFrames('sit', frames, 30, 0);
}

const clips = { walk: makeWalkClip(), stand: makeStandClip(), sit: makeSitClip() };

function rms(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / a.length);
}

test('Fritsch-Carlson path does not overshoot monotone coordinates', () => {
  const curve = createPchip([{ t: 0, x: 0 }, { t: 1, x: 1 }, { t: 2, x: 1.2 }, { t: 3, x: 4 }], ['x']);
  for (let i = 0; i <= 300; i += 1) {
    const t = i / 100;
    const x = curve.eval(t).x;
    assert.ok(x >= -1e-9 && x <= 4 + 1e-9);
  }
});

test('straight 10 second walk keeps stance feet planted when rate = speed / mps', () => {
  const actor = {
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 10, x: 0, y: 0, z: -10 }],
    face: [],
  };
  let leftAnchor = null;
  let rightAnchor = null;
  let maxSlip = 0;
  for (let frame = 0; frame < 300; frame += 1) {
    const t = frame / 30;
    const phase = t % 2;
    const pose = sampleActor(actor, t, clips);
    const leftZ = pose[JOINT.L_ank * 3 + 2];
    const rightZ = pose[JOINT.R_ank * 3 + 2];
    if (phase < 0.94) {
      if (leftAnchor == null || phase < 1 / 30) leftAnchor = leftZ;
      maxSlip = Math.max(maxSlip, Math.abs(leftZ - leftAnchor));
    } else leftAnchor = null;
    if (phase > 1.04) {
      if (rightAnchor == null || phase < 1.08) rightAnchor = rightZ;
      maxSlip = Math.max(maxSlip, Math.abs(rightZ - rightAnchor));
    } else rightAnchor = null;
  }
  assert.ok(maxSlip < 0.045, `max foot slip ${maxSlip}`);
});

test('stand → walk → sit → stand blends without a limb pop', () => {
  const actor = {
    seq: [
      { clip: 'stand', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 },
      { clip: 'walk', at: 1.5, phaseAt: 1.5, rate: 1, loop: true, blend: 0.35 },
      { clip: 'sit', at: 4, phaseAt: 4, rate: 1, loop: false, blend: 0.4 },
      { clip: 'stand', at: 6, phaseAt: 6, rate: 1, loop: true, blend: 0.4 },
    ],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 4, x: 0, y: 0, z: -2 }, { t: 8, x: 0, y: 0, z: -2 }],
    face: [],
  };
  for (const boundary of [1.5, 4, 6]) {
    const before = sampleActor(actor, boundary - 1 / 240, clips);
    const after = sampleActor(actor, boundary + 1 / 240, clips);
    assert.ok(rms(before, after) < 0.08, `pop at ${boundary}: ${rms(before, after)}`);
  }
});

test('phase continuity formula preserves a walk cycle across rate change', () => {
  const boundary = 5;
  const nextPhaseAt = phaseContinuousAt(boundary, 0, 1, 1.8);
  const actor = {
    seq: [
      { clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0 },
      { clip: 'walk', at: boundary, phaseAt: nextPhaseAt, rate: 1.8, loop: true, blend: 0 },
    ],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 5, x: 0, y: 0, z: -5 }, { t: 10, x: 0, y: 0, z: -14 }],
    face: [],
  };
  const before = sampleActor(actor, boundary - 1e-5, clips);
  const after = sampleActor(actor, boundary + 1e-5, clips);
  assert.ok(rms(before, after) < 0.015, `phase jump ${rms(before, after)}`);
});

test('270 degree yaw remains unwrapped instead of spinning backward', () => {
  const points = unwrapYawValues([
    { t: 0, yaw: 0 },
    { t: 1, yaw: Math.PI / 2 },
    { t: 2, yaw: Math.PI },
    { t: 3, yaw: Math.PI * 1.5 },
  ]);
  assert.equal(points.at(-1).yaw, Math.PI * 1.5);
  for (let i = 1; i < points.length; i += 1) assert.ok(points[i].yaw >= points[i - 1].yaw);
});

test('same time renders the same pose and renderer command signature', () => {
  const actor = {
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 10, x: 2, y: 0, z: -8 }],
    face: [],
  };
  const a = sampleActor(actor, 4.321, clips);
  const b = sampleActor(actor, 4.321, clips);
  assert.equal(poseHash(a), poseHash(b));
  const ma = buildRenderModel(a, { width: 800, height: 800 });
  const mb = buildRenderModel(b, { width: 800, height: 800 });
  assert.equal(renderModelSignature(ma), renderModelSignature(mb));
});

test('±0.10 m depth band keeps side-hanging arms in the front layer', () => {
  const pose = basePose();
  pose[JOINT.L_sho * 3 + 2] = -0.05;
  pose[JOINT.L_elb * 3 + 2] = -0.05;
  pose[JOINT.L_hnd * 3 + 2] = -0.05;
  pose[JOINT.R_sho * 3 + 2] = -0.22;
  pose[JOINT.R_elb * 3 + 2] = -0.22;
  pose[JOINT.R_hnd * 3 + 2] = -0.22;
  const model = buildRenderModel(pose, { width: 800, height: 800, depthBand: 0.10 });
  assert.ok(model.layers.front.some((shape) => shape.name.startsWith('left-arm')));
  assert.ok(model.layers.back.some((shape) => shape.name.startsWith('right-arm')));
});
