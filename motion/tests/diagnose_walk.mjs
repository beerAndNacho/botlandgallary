import fs from 'node:fs';
import path from 'node:path';
import {
  JOINT,
  STRIDE,
  canonicalizePose,
  sampleActor,
  sampleClip,
} from '../web/mocap-core.js';

const dir = process.env.MOTION_CLIPS_DIR || path.resolve('motion/dist/motion/clips');
const clip = JSON.parse(fs.readFileSync(path.join(dir, 'walk.json'), 'utf8'));
const clips = { walk: clip };
const fps = clip.fps;
const duration = 10;

function actor(pathPoints, face = []) {
  return {
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0 }],
    path: pathPoints,
    face,
  };
}

const zero = actor([{ t: 0, x: 0, y: 0, z: 0 }, { t: duration, x: 0, y: 0, z: 0 }], [{ t: 0, yaw: 0 }, { t: duration, yaw: 0 }]);
const forward = actor([{ t: 0, x: 0, y: 0, z: 0 }, { t: duration, x: 0, y: 0, z: -clip.mps * duration }]);
const reverseFacing = actor(
  [{ t: 0, x: 0, y: 0, z: 0 }, { t: duration, x: 0, y: 0, z: -clip.mps * duration }],
  [{ t: 0, yaw: Math.PI }, { t: duration, yaw: Math.PI }],
);

function point(pose, joint) {
  const o = joint * 3;
  return [pose[o], pose[o + 1], pose[o + 2]];
}
function speed(a, b) {
  return [(b[0] - a[0]) * fps, (b[1] - a[1]) * fps, (b[2] - a[2]) * fps];
}
function mag(v) { return Math.hypot(v[0], v[2]); }
function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  return sorted[Math.floor(sorted.length / 2)];
}
function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

const rawFrames = [];
for (let i = 0; i < clip.n; i += 1) {
  rawFrames.push(canonicalizePose(sampleClip(clip, i / fps, { loop: false }, new Float64Array(STRIDE))));
}
const ankleJoints = [JOINT.L_ank, JOINT.R_ank];
const toeJoints = [JOINT.L_toe, JOINT.R_toe];
const ankleMin = Math.min(...rawFrames.flatMap((pose) => ankleJoints.map((joint) => point(pose, joint)[1])));
const toeMin = Math.min(...rawFrames.flatMap((pose) => toeJoints.map((joint) => point(pose, joint)[1])));

const localVz = [];
const localVx = [];
const localSpeed = [];
const worldSpeed = [];
const reverseSpeed = [];
const ankleOnlySpeed = [];
let previous = null;
for (let frame = 1; frame < duration * fps; frame += 1) {
  const t = frame / fps;
  const localPose = sampleActor(zero, t, clips);
  const worldPose = sampleActor(forward, t, clips);
  const reversedPose = sampleActor(reverseFacing, t, clips);
  if (!previous) {
    previous = { localPose, worldPose, reversedPose };
    continue;
  }
  for (let side = 0; side < 2; side += 1) {
    const ankle = point(localPose, ankleJoints[side]);
    const toe = point(localPose, toeJoints[side]);
    const prevAnkle = point(previous.localPose, ankleJoints[side]);
    const prevToe = point(previous.localPose, toeJoints[side]);
    const ankleVelocity = speed(prevAnkle, ankle);
    const toeVelocity = speed(prevToe, toe);
    const contact = (
      (ankle[1] < ankleMin + 0.13 || toe[1] < toeMin + 0.075)
      && Math.min(Math.abs(ankleVelocity[1]), Math.abs(toeVelocity[1])) < 0.65
    );
    if (ankle[1] < ankleMin + 0.095) {
      ankleOnlySpeed.push(mag(speed(point(previous.worldPose, ankleJoints[side]), point(worldPose, ankleJoints[side]))));
    }
    if (!contact) continue;
    const selected = Math.abs(ankleVelocity[1]) <= Math.abs(toeVelocity[1]) ? ankleVelocity : toeVelocity;
    localVx.push(selected[0]);
    localVz.push(selected[2]);
    localSpeed.push(mag(selected));
    const worldJoint = Math.abs(ankleVelocity[1]) <= Math.abs(toeVelocity[1]) ? ankleJoints[side] : toeJoints[side];
    worldSpeed.push(mag(speed(point(previous.worldPose, worldJoint), point(worldPose, worldJoint))));
    reverseSpeed.push(mag(speed(point(previous.reversedPose, worldJoint), point(reversedPose, worldJoint))));
  }
  previous = { localPose, worldPose, reversedPose };
}

console.log(JSON.stringify({
  clipMps: clip.mps,
  clipFrames: clip.n,
  ankleMin,
  toeMin,
  contactSamples: localVz.length,
  localVxMedian: median(localVx),
  localVzMedian: median(localVz),
  localSpeedMedian: median(localSpeed),
  localVzP10: percentile(localVz, 0.1),
  localVzP90: percentile(localVz, 0.9),
  existingAnkleMetricMedian: median(ankleOnlySpeed),
  contactMetricMedian: median(worldSpeed),
  reverseFacingMedian: median(reverseSpeed),
}, null, 2));
