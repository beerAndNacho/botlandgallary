import { JOINT, ORDER, STRIDE } from './mocap-core.js';

const TWO_PI = Math.PI * 2;
const LIMBS = [
  { name: 'left-arm', joints: [JOINT.L_sho, JOINT.L_elb, JOINT.L_hnd] },
  { name: 'right-arm', joints: [JOINT.R_sho, JOINT.R_elb, JOINT.R_hnd] },
  { name: 'left-leg', joints: [JOINT.L_hip, JOINT.L_knee, JOINT.L_ank, JOINT.L_toe] },
  { name: 'right-leg', joints: [JOINT.R_hip, JOINT.R_knee, JOINT.R_ank, JOINT.R_toe] },
];

function point3(pose, index) {
  const o = index * 3;
  return [pose[o], pose[o + 1], pose[o + 2]];
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function distance3(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function samplePolyline(points, fraction) {
  if (points.length === 1) return [...points[0]];
  const lengths = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const length = distance3(points[i], points[i + 1]);
    lengths.push(length);
    total += length;
  }
  if (total < 1e-9) return [...points[0]];
  let target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (target <= lengths[i] || i === lengths.length - 1) {
      return lerp3(points[i], points[i + 1], lengths[i] < 1e-9 ? 0 : target / lengths[i]);
    }
    target -= lengths[i];
  }
  return [...points[points.length - 1]];
}

export function resampledTorso(pose) {
  const captured = [
    point3(pose, JOINT.pel),
    point3(pose, JOINT.spine),
    point3(pose, JOINT.chest),
    point3(pose, JOINT.neck),
  ];
  return [captured[0], samplePolyline(captured, 0.37), samplePolyline(captured, 0.74), captured[3]];
}

function cameraTransform(point, camera) {
  const yaw = camera.yaw ?? 0;
  const pitch = camera.pitch ?? -0.08;
  const cy = Math.cos(yaw); const sy = Math.sin(yaw);
  const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  const x1 = cy * point[0] + sy * point[2];
  const z1 = -sy * point[0] + cy * point[2];
  const y2 = cp * point[1] - sp * z1;
  const z2 = sp * point[1] + cp * z1;
  return [x1, y2, z2];
}

function project(point, viewport, camera, origin) {
  const transformed = cameraTransform([
    point[0] - origin[0],
    point[1] - origin[1],
    point[2] - origin[2],
  ], camera);
  const scale = camera.scale ?? Math.min(viewport.width, viewport.height) * 0.48;
  return {
    x: viewport.x + viewport.width * 0.5 + transformed[0] * scale,
    y: viewport.y + viewport.height * 0.88 - transformed[1] * scale,
    z: transformed[2],
  };
}

function limbDepth(pose, joints) {
  let sum = 0;
  for (const joint of joints) sum += pose[joint * 3 + 2];
  return sum / joints.length;
}

function capsule(a, b, radius, kind, name) {
  return { type: 'capsule', a, b, radius, kind, name };
}

function circle(center, radius, kind, name) {
  return { type: 'circle', center, radius, kind, name };
}

export function buildRenderModel(pose, options = {}) {
  if (!pose || pose.length !== STRIDE) throw new TypeError(`pose must contain ${STRIDE} numbers`);
  const viewport = {
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 800,
    height: options.height ?? 800,
  };
  const camera = options.camera ?? {};
  const pelvis = point3(pose, JOINT.pel);
  const origin = options.origin ?? [pelvis[0], 0, pelvis[2]];
  const projected = ORDER.map((_, index) => project(point3(pose, index), viewport, camera, origin));
  const torso3 = resampledTorso(pose);
  const torso = torso3.map((point) => project(point, viewport, camera, origin));
  const pxPerMetre = camera.scale ?? Math.min(viewport.width, viewport.height) * 0.48;
  const limbRadius = (options.limbRadius ?? 0.055) * pxPerMetre;
  const torsoRadius = (options.torsoRadius ?? 0.105) * pxPerMetre;
  const jointRadius = (options.jointRadius ?? 0.068) * pxPerMetre;
  const headRadius = Math.max(
    (options.headRadius ?? 0.115) * pxPerMetre,
    Math.hypot(projected[JOINT.head].x - projected[JOINT.neck].x, projected[JOINT.head].y - projected[JOINT.neck].y) * 0.72,
  );

  const torsoDepth = torso.reduce((sum, point) => sum + point.z, 0) / torso.length;
  const band = options.depthBand ?? 0.10;
  const layers = { back: [], torso: [], front: [] };

  for (const limb of LIMBS) {
    const depth = limbDepth(pose, limb.joints);
    // ±0.10 m band: near-torso limbs stay in front instead of being flattened behind.
    const layer = depth < torsoDepth - band ? 'back' : 'front';
    for (let i = 0; i < limb.joints.length - 1; i += 1) {
      const a = projected[limb.joints[i]];
      const b = projected[limb.joints[i + 1]];
      const radius = i === limb.joints.length - 2 && limb.name.includes('leg') ? limbRadius * 0.76 : limbRadius;
      layers[layer].push(capsule(a, b, radius, layer, `${limb.name}-${i}`));
      layers[layer].push(circle(a, radius, layer, `${limb.name}-joint-${i}`));
      if (i === limb.joints.length - 2) layers[layer].push(circle(b, radius, layer, `${limb.name}-end`));
    }
  }

  for (let i = 0; i < torso.length - 1; i += 1) {
    const taper = i === 0 ? 1.12 : i === 2 ? 0.82 : 1;
    layers.torso.push(capsule(torso[i], torso[i + 1], torsoRadius * taper, 'torso', `spine-${i}`));
    layers.torso.push(circle(torso[i], torsoRadius * taper, 'torso', `spine-joint-${i}`));
  }
  layers.torso.push(circle(torso[torso.length - 1], torsoRadius * 0.82, 'torso', 'neck'));
  layers.torso.push(capsule(projected[JOINT.L_hip], projected[JOINT.R_hip], torsoRadius * 0.88, 'torso', 'pelvis-bar'));
  layers.torso.push(capsule(projected[JOINT.L_sho], projected[JOINT.R_sho], torsoRadius * 0.68, 'torso', 'shoulder-bar'));
  layers.torso.push(capsule(projected[JOINT.neck], projected[JOINT.head], limbRadius * 0.72, 'torso', 'neck-head'));
  layers.torso.push(circle(projected[JOINT.head], headRadius, 'torso', 'head'));

  return { layers, projected, torso, torsoDepth, viewport };
}

function addCircle(path, center, radius) {
  path.moveTo(center.x + radius, center.y);
  // Keep the same anticlockwise winding as capsules so a single fill has no holes.
  path.arc(center.x, center.y, radius, 0, -TWO_PI, true);
  path.closePath();
}

function addCapsule(path, a, b, radius) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    addCircle(path, a, radius);
    return;
  }
  const angle = Math.atan2(dy, dx);
  const normal = angle + Math.PI / 2;
  const nx = Math.cos(normal) * radius;
  const ny = Math.sin(normal) * radius;
  path.moveTo(a.x + nx, a.y + ny);
  path.lineTo(b.x + nx, b.y + ny);
  path.arc(b.x, b.y, radius, normal, normal - Math.PI, true);
  path.lineTo(a.x - nx, a.y - ny);
  path.arc(a.x, a.y, radius, normal - Math.PI, normal - TWO_PI, true);
  path.closePath();
}

function layerPath(shapes) {
  const path = new Path2D();
  for (const shape of shapes) {
    if (shape.type === 'circle') addCircle(path, shape.center, shape.radius);
    else addCapsule(path, shape.a, shape.b, shape.radius);
  }
  return path;
}

function drawLayer(ctx, shapes, fill, stroke, lineWidth) {
  if (!shapes.length) return;
  const path = layerPath(shapes);
  ctx.fillStyle = fill;
  ctx.fill(path, 'nonzero');
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }
}

export function renderPose(ctx, pose, options = {}) {
  const model = buildRenderModel(pose, {
    width: ctx.canvas.width,
    height: ctx.canvas.height,
    ...options,
  });
  const style = {
    back: '#516179',
    body: '#e6eef8',
    front: '#ffffff',
    outline: '#182033',
    ...options.style,
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawLayer(ctx, model.layers.back, style.back, style.outline, options.outlineWidth ?? 3);
  drawLayer(ctx, model.layers.torso, style.body, style.outline, options.outlineWidth ?? 3);
  drawLayer(ctx, model.layers.front, style.front, style.outline, options.outlineWidth ?? 3);
  ctx.restore();
  return model;
}

export function renderModelSignature(model) {
  const values = [];
  for (const layerName of ['back', 'torso', 'front']) {
    values.push(layerName);
    for (const shape of model.layers[layerName]) {
      if (shape.type === 'circle') {
        values.push('c', shape.name, shape.center.x.toFixed(4), shape.center.y.toFixed(4), shape.center.z.toFixed(4), shape.radius.toFixed(4));
      } else {
        values.push('p', shape.name,
          shape.a.x.toFixed(4), shape.a.y.toFixed(4), shape.a.z.toFixed(4),
          shape.b.x.toFixed(4), shape.b.y.toFixed(4), shape.b.z.toFixed(4),
          shape.radius.toFixed(4));
      }
    }
  }
  let hash = 2166136261 >>> 0;
  const text = values.join('|');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
