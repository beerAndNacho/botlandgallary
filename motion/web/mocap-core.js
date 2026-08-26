export const ORDER = [
  'pel', 'spine', 'chest', 'neck', 'head',
  'L_hip', 'L_knee', 'L_ank', 'L_toe',
  'R_hip', 'R_knee', 'R_ank', 'R_toe',
  'L_sho', 'L_elb', 'L_hnd',
  'R_sho', 'R_elb', 'R_hnd',
];

export const JOINT = Object.freeze(Object.fromEntries(ORDER.map((name, index) => [name, index])));
export const STRIDE = ORDER.length * 3;
const EPS = 1e-9;
const actorCache = new Map();

export function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function mod(value, period) {
  if (!(period > 0)) return 0;
  return ((value % period) + period) % period;
}

export function validateClip(clip) {
  if (!clip || clip.kind !== 'mocap') throw new TypeError('clip.kind must be "mocap"');
  if (!Array.isArray(clip.order) || clip.order.length !== ORDER.length) throw new TypeError('clip.order must contain 19 joints');
  for (let i = 0; i < ORDER.length; i += 1) {
    if (clip.order[i] !== ORDER[i]) throw new TypeError(`clip.order[${i}] must be ${ORDER[i]}`);
  }
  if (!(clip.fps > 0) || !Number.isInteger(clip.n) || clip.n < 1) throw new TypeError('invalid clip fps/n');
  if (!Array.isArray(clip.j) && !ArrayBuffer.isView(clip.j)) throw new TypeError('clip.j must be an array');
  if (clip.j.length !== clip.n * STRIDE) throw new TypeError(`clip.j length ${clip.j.length} != ${clip.n * STRIDE}`);
  return clip;
}

export function clipDuration(clip) {
  validateClip(clip);
  return clip.n / clip.fps;
}

export function framePose(clip, frameIndex, out = new Float64Array(STRIDE)) {
  validateClip(clip);
  const index = Math.max(0, Math.min(clip.n - 1, frameIndex | 0));
  const start = index * STRIDE;
  for (let i = 0; i < STRIDE; i += 1) out[i] = clip.j[start + i];
  return out;
}

export function sampleClip(clip, seconds, options = {}, out = new Float64Array(STRIDE)) {
  validateClip(clip);
  const fps = clip.fps;
  const fullPeriod = clip.n / fps;
  const from = Math.max(0, Number(options.from ?? 0));
  const to = Math.max(from + 1 / fps, Math.min(fullPeriod, Number(options.to ?? fullPeriod)));
  const range = to - from;
  let local = Number(seconds) || 0;
  const loop = Boolean(options.loop);
  const pingpong = Boolean(options.pingpong);

  if (pingpong) {
    const p = mod(local, range * 2);
    local = p <= range ? p : range * 2 - p;
  } else if (loop) {
    local = mod(local, range);
  } else {
    local = Math.max(0, Math.min(range - 1 / fps, local));
  }

  const sampleTime = from + local;
  let frame = sampleTime * fps;
  const fromFrame = Math.max(0, Math.min(clip.n - 1, Math.floor(from * fps)));
  const toFrameExclusive = Math.max(fromFrame + 1, Math.min(clip.n, Math.ceil(to * fps)));
  const count = toFrameExclusive - fromFrame;

  if (loop && !pingpong) {
    frame = fromFrame + mod(frame - fromFrame, count);
  } else {
    frame = Math.max(fromFrame, Math.min(toFrameExclusive - 1, frame));
  }

  const lo = Math.floor(frame);
  const alpha = frame - lo;
  const hi = loop && !pingpong
    ? fromFrame + ((lo - fromFrame + 1) % count)
    : Math.min(toFrameExclusive - 1, lo + 1);
  const a = lo * STRIDE;
  const b = hi * STRIDE;
  for (let i = 0; i < STRIDE; i += 1) {
    const av = clip.j[a + i];
    out[i] = av + (clip.j[b + i] - av) * alpha;
  }
  return out;
}

function jointOffset(index) {
  return index * 3;
}

export function poseHeading(pose) {
  const li = jointOffset(JOINT.L_sho);
  const ri = jointOffset(JOINT.R_sho);
  let sx = pose[li] - pose[ri];
  let sz = pose[li + 2] - pose[ri + 2];
  let length = Math.hypot(sx, sz);
  if (length < 1e-6) {
    const lh = jointOffset(JOINT.L_hip);
    const rh = jointOffset(JOINT.R_hip);
    sx = pose[lh] - pose[rh];
    sz = pose[lh + 2] - pose[rh + 2];
    length = Math.hypot(sx, sz);
  }
  if (length < 1e-6) return 0;
  sx /= length;
  sz /= length;
  // forward = up x side. side +x means forward -z.
  const fx = sz;
  const fz = -sx;
  return Math.atan2(-fx, -fz);
}

export function rotatePoseY(pose, yaw, rootX = 0, rootZ = 0, out = new Float64Array(STRIDE)) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let i = 0; i < ORDER.length; i += 1) {
    const o = i * 3;
    const x = pose[o] - rootX;
    const z = pose[o + 2] - rootZ;
    out[o] = c * x + s * z + rootX;
    out[o + 1] = pose[o + 1];
    out[o + 2] = -s * x + c * z + rootZ;
  }
  return out;
}

export function canonicalizePose(pose, out = new Float64Array(STRIDE)) {
  const px = pose[0];
  const pz = pose[2];
  const heading = poseHeading(pose);
  const c = Math.cos(-heading);
  const s = Math.sin(-heading);
  for (let i = 0; i < ORDER.length; i += 1) {
    const o = i * 3;
    const x = pose[o] - px;
    const z = pose[o + 2] - pz;
    out[o] = c * x + s * z;
    out[o + 1] = pose[o + 1];
    out[o + 2] = -s * x + c * z;
  }
  return out;
}

export function blendPoses(a, b, weight, out = new Float64Array(STRIDE)) {
  const w = Math.max(0, Math.min(1, weight));
  for (let i = 0; i < STRIDE; i += 1) out[i] = a[i] + (b[i] - a[i]) * w;
  return out;
}

export function transformPose(pose, position, yaw, out = new Float64Array(STRIDE)) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  for (let i = 0; i < ORDER.length; i += 1) {
    const o = i * 3;
    const x = pose[o];
    const z = pose[o + 2];
    out[o] = c * x + s * z + position[0];
    out[o + 1] = pose[o + 1] + position[1];
    out[o + 2] = -s * x + c * z + position[2];
  }
  return out;
}

function pchipSlopes(t, values) {
  const n = t.length;
  if (n === 1) return [0];
  const h = new Array(n - 1);
  const delta = new Array(n - 1);
  for (let i = 0; i < n - 1; i += 1) {
    h[i] = t[i + 1] - t[i];
    if (!(h[i] > 0)) throw new TypeError('keyframe times must be strictly increasing');
    delta[i] = (values[i + 1] - values[i]) / h[i];
  }
  if (n === 2) return [delta[0], delta[0]];
  const m = new Array(n).fill(0);
  m[0] = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (Math.sign(m[0]) !== Math.sign(delta[0])) m[0] = 0;
  else if (Math.sign(delta[0]) !== Math.sign(delta[1]) && Math.abs(m[0]) > Math.abs(3 * delta[0])) m[0] = 3 * delta[0];
  for (let i = 1; i < n - 1; i += 1) {
    if (delta[i - 1] === 0 || delta[i] === 0 || Math.sign(delta[i - 1]) !== Math.sign(delta[i])) {
      m[i] = 0;
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }
  m[n - 1] = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);
  if (Math.sign(m[n - 1]) !== Math.sign(delta[n - 2])) m[n - 1] = 0;
  else if (Math.sign(delta[n - 2]) !== Math.sign(delta[n - 3]) && Math.abs(m[n - 1]) > Math.abs(3 * delta[n - 2])) m[n - 1] = 3 * delta[n - 2];
  return m;
}

export function createPchip(keyframes, fields) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    return {
      start: 0,
      end: 0,
      eval: () => Object.fromEntries(fields.map((field) => [field, 0])),
      derivative: () => Object.fromEntries(fields.map((field) => [field, 0])),
    };
  }
  const points = [...keyframes].sort((a, b) => a.t - b.t);
  const times = points.map((point) => Number(point.t));
  const values = Object.fromEntries(fields.map((field) => [field, points.map((point) => Number(point[field] ?? 0))]));
  const slopes = Object.fromEntries(fields.map((field) => [field, pchipSlopes(times, values[field])]));

  function segmentAt(time) {
    if (time <= times[0]) return 0;
    if (time >= times[times.length - 1]) return Math.max(0, times.length - 2);
    let lo = 0;
    let hi = times.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  function evaluateField(field, time, derivative) {
    if (times.length === 1) return derivative ? 0 : values[field][0];
    if (time <= times[0]) return derivative ? slopes[field][0] : values[field][0];
    if (time >= times[times.length - 1]) return derivative ? slopes[field][times.length - 1] : values[field][times.length - 1];
    const i = segmentAt(time);
    const dt = times[i + 1] - times[i];
    const u = (time - times[i]) / dt;
    const y0 = values[field][i];
    const y1 = values[field][i + 1];
    const m0 = slopes[field][i];
    const m1 = slopes[field][i + 1];
    if (!derivative) {
      const u2 = u * u;
      const u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * y0
        + (u3 - 2 * u2 + u) * dt * m0
        + (-2 * u3 + 3 * u2) * y1
        + (u3 - u2) * dt * m1;
    }
    return ((6 * u * u - 6 * u) * y0
      + (3 * u * u - 4 * u + 1) * dt * m0
      + (-6 * u * u + 6 * u) * y1
      + (3 * u * u - 2 * u) * dt * m1) / dt;
  }

  return {
    start: times[0],
    end: times[times.length - 1],
    eval(time) {
      return Object.fromEntries(fields.map((field) => [field, evaluateField(field, time, false)]));
    },
    derivative(time) {
      return Object.fromEntries(fields.map((field) => [field, evaluateField(field, time, true)]));
    },
  };
}

export function unwrapYawValues(points) {
  if (!points?.length) return [];
  const result = [{ ...points[0], yaw: Number(points[0].yaw) || 0 }];
  for (let i = 1; i < points.length; i += 1) {
    let yaw = Number(points[i].yaw) || 0;
    const previous = result[i - 1].yaw;
    while (yaw - previous > Math.PI) yaw -= Math.PI * 2;
    while (yaw - previous < -Math.PI) yaw += Math.PI * 2;
    result.push({ ...points[i], yaw });
  }
  return result;
}

export function phaseContinuousAt(boundaryTime, previousAt, previousRate, nextRate) {
  if (Math.abs(nextRate) < EPS) throw new RangeError('nextRate must be non-zero');
  return boundaryTime - ((boundaryTime - previousAt) * previousRate) / nextRate;
}

function pathKey(actor) {
  return JSON.stringify({ path: actor.path ?? [], face: actor.face ?? [], seq: actor.seq ?? [] });
}

function compileActor(actor, clips) {
  const key = pathKey(actor);
  if (actorCache.has(key)) return actorCache.get(key);
  const pathPoints = actor.path?.length ? actor.path : [{ t: 0, x: 0, y: 0, z: 0 }];
  const pathCurve = createPchip(pathPoints, ['x', 'y', 'z']);
  let facePoints;
  if (actor.face?.length) {
    facePoints = unwrapYawValues(actor.face);
  } else {
    let previous = 0;
    facePoints = pathPoints.map((point, index) => {
      const velocity = pathCurve.derivative(point.t);
      let yaw = Math.hypot(velocity.x, velocity.z) < 1e-5 ? previous : Math.atan2(-velocity.x, -velocity.z);
      if (index > 0) {
        while (yaw - previous > Math.PI) yaw -= Math.PI * 2;
        while (yaw - previous < -Math.PI) yaw += Math.PI * 2;
      }
      previous = yaw;
      return { t: point.t, yaw };
    });
  }
  const faceCurve = createPchip(facePoints, ['yaw']);
  const seq = [...(actor.seq ?? [])].sort((a, b) => a.at - b.at).map((item) => ({ blend: 0.35, rate: 1, ...item }));
  if (!seq.length) throw new TypeError('actor.seq must contain at least one item');
  if (actor.path?.length) {
    for (const item of seq) {
      const clip = clips[item.clip];
      validateClip(clip);
      if (!(clip.mps >= 0)) throw new TypeError(`clip ${item.clip} must be converted with --inplace when actor.path is used`);
    }
  }
  const compiled = { key, pathCurve, faceCurve, seq };
  actorCache.set(key, compiled);
  return compiled;
}

function itemPose(item, worldTime, clip, out) {
  const rate = Number(item.rate ?? 1);
  const phaseOrigin = Number(item.phaseAt ?? item.at ?? 0);
  const local = Math.max(0, worldTime - phaseOrigin) * rate;
  return sampleClip(clip, local, item, out);
}

export function sampleActor(actor, time, clips, out = new Float64Array(STRIDE)) {
  const compiled = compileActor(actor, clips);
  const seq = compiled.seq;
  let index = 0;
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i].at <= time) index = i;
    else break;
  }
  const current = seq[index];
  const currentClip = clips[current.clip];
  validateClip(currentClip);
  let localPose = canonicalizePose(itemPose(current, time, currentClip, new Float64Array(STRIDE)));

  const next = seq[index + 1];
  if (next) {
    const blendSeconds = Math.max(0, Number(next.blend ?? current.blend ?? 0.35));
    const blendStart = next.at - blendSeconds;
    if (blendSeconds > 0 && time >= blendStart && time < next.at) {
      const nextClip = clips[next.clip];
      validateClip(nextClip);
      // During the pre-roll blend the next motion is aligned at its first selected pose.
      const nextPose = itemPose(next, next.at, nextClip, new Float64Array(STRIDE));
      const canonicalNext = canonicalizePose(nextPose);
      const weight = smoothstep((time - blendStart) / blendSeconds);
      localPose = blendPoses(localPose, canonicalNext, weight);
    }
  }

  const position = compiled.pathCurve.eval(time);
  const yaw = compiled.faceCurve.eval(time).yaw;
  return transformPose(localPose, [position.x, position.y, position.z], yaw, out);
}

export function pathSpeed(path, time) {
  const curve = createPchip(path?.length ? path : [{ t: 0, x: 0, y: 0, z: 0 }], ['x', 'y', 'z']);
  const velocity = curve.derivative(time);
  return Math.hypot(velocity.x, velocity.y, velocity.z);
}

export function averagePathSpeed(path, start, end, samples = 120) {
  const curve = createPchip(path, ['x', 'y', 'z']);
  if (!(end > start)) return 0;
  let distance = 0;
  let previous = curve.eval(start);
  for (let i = 1; i <= samples; i += 1) {
    const t = start + ((end - start) * i) / samples;
    const point = curve.eval(t);
    distance += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
    previous = point;
  }
  return distance / (end - start);
}

export function matchedRate(path, start, end, clip) {
  validateClip(clip);
  if (!(clip.mps > EPS)) return 1;
  return averagePathSpeed(path, start, end) / clip.mps;
}

export function poseHash(pose) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < pose.length; i += 1) {
    const value = Math.round(pose[i] * 10000);
    hash ^= value & 0xff; hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= (value >>> 8) & 0xff; hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= (value >>> 16) & 0xff; hash = Math.imul(hash, 16777619) >>> 0;
    hash ^= (value >>> 24) & 0xff; hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function clearCompiledActorCache() {
  actorCache.clear();
}
