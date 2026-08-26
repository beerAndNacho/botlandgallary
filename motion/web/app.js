import {
  STRIDE,
  clearCompiledActorCache,
  matchedRate,
  phaseContinuousAt,
  poseHash,
  sampleActor,
} from './mocap-core.js';
import { buildRenderModel, renderModelSignature, renderPose } from './mocap-renderer.js';

const $ = (selector) => document.querySelector(selector);
const stage = $('#stage');
const ctx = stage.getContext('2d');
const mapCanvas = $('#map');
const mapCtx = mapCanvas.getContext('2d');
const clips = {};
let manifest = null;
let indexData = null;
let actor = null;
let duration = 12;
let currentTime = 0;
let playing = false;
let lastTick = null;
let toastTimer = 0;

const PRESETS = {
  walk: {
    duration: 10,
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 10, x: 0, y: 0, z: -8 }],
    face: [],
  },
  sequence: {
    duration: 14,
    seq: [
      { clip: 'idle', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 },
      { clip: 'walk', at: 2, phaseAt: 2, rate: 1, loop: true, blend: 0.35 },
      { clip: 'sitstand', at: 6.5, phaseAt: 6.5, rate: 1, loop: false, blend: 0.45 },
      { clip: 'idle', at: 12.2, phaseAt: 12.2, rate: 1, loop: true, blend: 0.5 },
    ],
    path: [
      { t: 0, x: 0, y: 0, z: 0 },
      { t: 2, x: 0, y: 0, z: 0 },
      { t: 6.5, x: 0.5, y: 0, z: -3.4 },
      { t: 14, x: 0.5, y: 0, z: -3.4 },
    ],
    face: [],
  },
  speed: {
    duration: 10,
    seq: [
      { clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0 },
      { clip: 'walk', at: 5, phaseAt: 5, rate: 1.8, loop: true, blend: 0 },
    ],
    path: [
      { t: 0, x: 0, y: 0, z: 0 },
      { t: 5, x: 0, y: 0, z: -3 },
      { t: 10, x: 0, y: 0, z: -10 },
    ],
    face: [],
  },
  turn270: {
    duration: 12,
    seq: [{ clip: 'walk', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 }],
    path: [
      { t: 0, x: 0, y: 0, z: 0 },
      { t: 3, x: -3, y: 0, z: -2.5 },
      { t: 6, x: -1.5, y: 0, z: -5.5 },
      { t: 9, x: 2, y: 0, z: -4 },
      { t: 12, x: 1, y: 0, z: -0.5 },
    ],
    face: [
      { t: 0, yaw: 0 },
      { t: 3, yaw: Math.PI * 0.5 },
      { t: 6, yaw: Math.PI },
      { t: 9, yaw: Math.PI * 1.5 },
      { t: 12, yaw: Math.PI * 1.5 },
    ],
  },
  crawl: {
    duration: 10,
    seq: [{ clip: 'crawl', at: 0, phaseAt: 0, rate: 1, loop: true, blend: 0.35 }],
    path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 5, x: -1.4, y: 0, z: -2.3 }, { t: 10, x: 1.2, y: 0, z: -5 }],
    face: [],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showToast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('on'), 1900);
}

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function loadClip(entry) {
  if (clips[entry.id]) return clips[entry.id];
  const clip = await loadJson(`./clips/${entry.file}`);
  clips[entry.id] = clip;
  return clip;
}

async function boot() {
  try {
    manifest = await loadJson('./clips/manifest.json');
    await Promise.all(manifest.clips.map(loadClip));
    $('#clipStatus').textContent = `${manifest.clips.length}개 실제 CMU 클립 준비됨`;
    applyPreset('walk');
    indexData = await loadJson('./clips/index.json');
    renderCatalog('');
    $('#search').addEventListener('input', (event) => renderCatalog(event.target.value));
    wireControls();
    requestAnimationFrame(tick);
  } catch (error) {
    console.error(error);
    $('#clipStatus').textContent = '클립 로드 실패';
    $('#validation').innerHTML = `<span class="bad">${String(error.message || error)}</span>`;
  }
}

function wireControls() {
  $('#play').addEventListener('click', () => {
    playing = !playing;
    lastTick = null;
    $('#play').textContent = playing ? '❚❚ 일시정지' : '▶ 재생';
  });
  $('#restart').addEventListener('click', () => setTime(0));
  $('#time').addEventListener('input', (event) => setTime(Number(event.target.value), false));
  $('#applyPreset').addEventListener('click', () => applyPreset($('#preset').value));
  $('#applyJson').addEventListener('click', applyEditors);
  $('#matchRates').addEventListener('click', matchAllRates);
  $('#phaseFix').addEventListener('click', fixAllPhases);
  $('#validate').addEventListener('click', runValidation);
}

function applyPreset(name) {
  actor = clone(PRESETS[name]);
  duration = actor.duration;
  delete actor.duration;
  clearCompiledActorCache();
  matchAllRates(false);
  if (name === 'speed') fixAllPhases(false);
  updateEditors();
  setTime(0);
  showToast('검수 프리셋을 적용했습니다');
}

function updateEditors() {
  $('#seqEditor').value = JSON.stringify(actor.seq, null, 2);
  $('#pathEditor').value = JSON.stringify(actor.path, null, 2);
  $('#faceEditor').value = JSON.stringify(actor.face ?? [], null, 2);
  $('#time').max = String(duration);
  updateTimeLabel();
}

function applyEditors() {
  try {
    const seq = JSON.parse($('#seqEditor').value);
    const path = JSON.parse($('#pathEditor').value);
    const face = JSON.parse($('#faceEditor').value || '[]');
    if (!Array.isArray(seq) || !Array.isArray(path) || !Array.isArray(face)) throw new TypeError('seq/path/face는 배열이어야 합니다.');
    actor = { seq, path, face };
    duration = Math.max(1, ...path.map((point) => Number(point.t) || 0), ...seq.map((item) => Number(item.at) || 0)) + 1;
    clearCompiledActorCache();
    updateEditors();
    setTime(Math.min(currentTime, duration));
    showToast('JSON 변경을 적용했습니다');
  } catch (error) {
    $('#validation').innerHTML = `<span class="bad">JSON 오류: ${String(error.message || error)}</span>`;
  }
}

function segmentEnd(index) {
  return actor.seq[index + 1]?.at ?? duration;
}

function matchAllRates(show = true) {
  if (!actor) return;
  for (let i = 0; i < actor.seq.length; i += 1) {
    const item = actor.seq[i];
    const clip = clips[item.clip];
    if (!clip?.mps || clip.mps <= 0) continue;
    const end = Math.max(item.at + 0.001, segmentEnd(i));
    item.rate = Number(matchedRate(actor.path, item.at, end, clip).toFixed(4));
  }
  clearCompiledActorCache();
  updateEditors();
  if (show) showToast('경로 속도 / mps로 rate를 맞췄습니다');
}

function fixAllPhases(show = true) {
  if (!actor) return;
  if (actor.seq.length) actor.seq[0].phaseAt = actor.seq[0].phaseAt ?? actor.seq[0].at;
  for (let i = 0; i < actor.seq.length - 1; i += 1) {
    const previous = actor.seq[i];
    const next = actor.seq[i + 1];
    next.phaseAt = Number(phaseContinuousAt(next.at, previous.phaseAt ?? previous.at, Number(previous.rate ?? 1), Number(next.rate ?? 1)).toFixed(6));
  }
  clearCompiledActorCache();
  updateEditors();
  if (show) showToast('속도 경계의 다리 위상을 이어 붙였습니다');
}

function setTime(value, updateRange = true) {
  currentTime = Math.max(0, Math.min(duration, value));
  if (updateRange) $('#time').value = String(currentTime);
  updateTimeLabel();
  render(currentTime);
}

function updateTimeLabel() {
  $('#timeLabel').value = `${currentTime.toFixed(2)} / ${duration.toFixed(2)} s`;
  $('#timeLabel').textContent = $('#timeLabel').value;
}

function tick(timestamp) {
  if (playing && actor) {
    if (lastTick == null) lastTick = timestamp;
    const dt = Math.min(0.1, (timestamp - lastTick) / 1000) * Number($('#playback').value);
    lastTick = timestamp;
    currentTime += dt;
    if (currentTime >= duration) currentTime = 0;
    $('#time').value = String(currentTime);
    updateTimeLabel();
  } else {
    lastTick = timestamp;
  }
  if (actor) render(currentTime);
  requestAnimationFrame(tick);
}

function canvasScale(canvas) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return ratio;
}

function pathPositionAt(time) {
  // The actor pose already contains world root translation. Use pelvis for deterministic follow-camera.
  const pose = sampleActor(actor, time, clips, new Float64Array(STRIDE));
  return [pose[0], 0, pose[2]];
}

function drawBackground(context, width, height, worldPosition) {
  const gradient = context.createRadialGradient(width * 0.5, height * 0.36, 10, width * 0.5, height * 0.5, width * 0.7);
  gradient.addColorStop(0, '#243461');
  gradient.addColorStop(0.55, '#10152c');
  gradient.addColorStop(1, '#070914');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(width * 0.5, height * 0.84);
  const spacing = Math.max(28, width / 16);
  const offsetX = ((-worldPosition[0] * spacing) % spacing + spacing) % spacing;
  const offsetZ = ((worldPosition[2] * spacing) % spacing + spacing) % spacing;
  context.strokeStyle = '#68f4ff18';
  context.lineWidth = 1;
  for (let x = -width; x <= width; x += spacing) {
    context.beginPath(); context.moveTo(x + offsetX, -height); context.lineTo(x + offsetX, height * 0.2); context.stroke();
  }
  for (let y = -height; y <= height * 0.2; y += spacing) {
    const yy = y + offsetZ;
    context.beginPath(); context.moveTo(-width, yy); context.lineTo(width, yy); context.stroke();
  }
  context.restore();
}

function render(time) {
  canvasScale(stage);
  const pose = sampleActor(actor, time, clips, new Float64Array(STRIDE));
  const follow = [pose[0], 0, pose[2]];
  drawBackground(ctx, stage.width, stage.height, follow);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(stage.width * 0.5, stage.height * 0.86, stage.width * 0.13, stage.height * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const style = { back: '#64748c', body: '#dfe8f5', front: '#ffffff', outline: '#162035' };
  const model = renderPose(ctx, pose, {
    origin: follow,
    camera: { yaw: Math.PI, pitch: -0.04, scale: Math.min(stage.width, stage.height) * 0.43 },
    style,
    outlineWidth: Math.max(2, stage.width / 400),
  });
  $('#renderHash').textContent = `${poseHash(pose)}·${renderModelSignature(model)}`;
  renderMap(time);
}

function renderMap(time) {
  canvasScale(mapCanvas);
  const points = actor.path;
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = '#080b1d'; mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  if (!points.length) return;
  const xs = points.map((p) => p.x); const zs = points.map((p) => p.z);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs);
  const spanX = Math.max(1, maxX - minX); const spanZ = Math.max(1, maxZ - minZ);
  const pad = 20;
  const mapPoint = (p) => [pad + ((p.x - minX) / spanX) * (mapCanvas.width - pad * 2), pad + ((p.z - minZ) / spanZ) * (mapCanvas.height - pad * 2)];
  mapCtx.strokeStyle = '#68f4ff99'; mapCtx.lineWidth = 3; mapCtx.beginPath();
  points.forEach((point, index) => { const [x, y] = mapPoint(point); if (index) mapCtx.lineTo(x, y); else mapCtx.moveTo(x, y); }); mapCtx.stroke();
  const pose = sampleActor(actor, time, clips, new Float64Array(STRIDE));
  const [x, y] = mapPoint({ x: pose[0], z: pose[2] });
  mapCtx.fillStyle = '#ff70d7'; mapCtx.beginPath(); mapCtx.arc(x, y, 7, 0, Math.PI * 2); mapCtx.fill();
}

function runValidation() {
  try {
    const checks = [];
    const t = Math.min(duration * 0.47, duration - 0.001);
    const poseA = sampleActor(actor, t, clips, new Float64Array(STRIDE));
    const poseB = sampleActor(actor, t, clips, new Float64Array(STRIDE));
    checks.push(['같은 시각의 포즈 해시 일치', poseHash(poseA) === poseHash(poseB)]);
    checks.push(['모든 클립 19개 관절 유지', actor.seq.every((item) => clips[item.clip]?.order?.length === 19)]);
    checks.push(['경로 클립이 --inplace 결과', actor.seq.every((item) => Number.isFinite(clips[item.clip]?.mps))]);
    checks.push(['yaw 언랩: 인접 차이 ≤ 180°', !actor.face?.length || actor.face.every((point, index) => index === 0 || Math.abs(point.yaw - actor.face[index - 1].yaw) <= Math.PI + 1e-6)]);
    let maxJump = 0;
    for (const item of actor.seq.slice(1)) {
      const before = sampleActor(actor, Math.max(0, item.at - 1 / 120), clips, new Float64Array(STRIDE));
      const after = sampleActor(actor, item.at + 1 / 120, clips, new Float64Array(STRIDE));
      let sum = 0;
      for (let i = 0; i < STRIDE; i += 1) sum += (after[i] - before[i]) ** 2;
      maxJump = Math.max(maxJump, Math.sqrt(sum / STRIDE));
    }
    checks.push([`이음매 RMS 점프 ${maxJump.toFixed(3)} m`, maxJump < 0.28]);
    $('#validation').innerHTML = checks.map(([label, ok]) => `<div class="${ok ? 'good' : 'bad'}">${ok ? '✓' : '✗'} ${label}</div>`).join('');
  } catch (error) {
    $('#validation').innerHTML = `<span class="bad">검수 실패: ${String(error.message || error)}</span>`;
  }
}

function renderCatalog(query) {
  if (!indexData) return;
  const normalized = query.trim().toLowerCase();
  const converted = new Map(manifest.clips.map((entry) => [entry.sourceId, entry]));
  const results = indexData.clips.filter((clip) => !normalized || `${clip.id} ${clip.description} ${clip.subjectLabel}`.toLowerCase().includes(normalized)).slice(0, 32);
  $('#catalogGrid').innerHTML = results.map((clip) => {
    const ready = converted.get(clip.id);
    return `<article class="motion-card"><code>${clip.id}</code><h3>${escapeHtml(clip.description)}</h3><p>${escapeHtml(clip.subjectLabel || `Subject ${clip.subject}`)}</p><button data-cmu="${clip.id}">${ready ? '이 클립으로 재생' : '변환 명령 복사'}</button></article>`;
  }).join('') || '<p>검색 결과가 없습니다.</p>';
  document.querySelectorAll('[data-cmu]').forEach((button) => button.addEventListener('click', () => {
    const clip = indexData.clips.find((item) => item.id === button.dataset.cmu);
    const ready = converted.get(clip.id);
    if (ready) {
      actor = { seq: [{ clip: ready.id, at: 0, phaseAt: 0, rate: 1, loop: ready.loop, blend: 0.35 }], path: [{ t: 0, x: 0, y: 0, z: 0 }, { t: 10, x: 0, y: 0, z: ready.inplace ? -Math.max(1, clips[ready.id].mps * 10) : 0 }], face: [] };
      duration = 10; matchAllRates(false); updateEditors(); setTime(0); scrollTo({ top: $('#studio').offsetTop - 70, behavior: 'smooth' });
    } else {
      const command = `python tools/bvh_to_mocap.py "${clip.bvh}" ${clip.id}.json --target-leg 0.87 --fps 30 --yaw 180 --inplace`;
      navigator.clipboard?.writeText(command).then(() => showToast('변환 명령을 복사했습니다')).catch(() => prompt('변환 명령', command));
    }
  }));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

boot();
