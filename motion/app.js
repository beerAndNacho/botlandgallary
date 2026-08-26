import {fetchCMUClip, CMU_CREDIT} from './bvh-browser.js';
import {DEMO_CLIPS} from './demo-clips.js';
import {compileActor, compilePath, phaseContinuousAt, INDEX} from './motion-runtime.js';
import {drawPose, renderDeterminismHash} from './mocap-renderer.js';

const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const INDEX_URL='https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/cmu-mocap-index-text.txt';
const clips={...DEMO_CLIPS};
let scene=null,compiled=null,playing=false,playStart=0,playFrom=0,dirty=true,indexEntries=null;
const stage=$('#stage'),ctx=stage.getContext('2d',{alpha:false,willReadFrequently:true});

const PRESETS={
  sequence:{label:'서기 → 걷기 → 앉기 → 서기',seq:[
    {clip:'stand',at:0,rate:1,from:0,to:1,loop:true,blend:.35},
    {clip:'walk',at:1,rate:'path',from:0,to:1,loop:true,blend:.35},
    {clip:'sit',at:5,rate:1,from:0,to:2,loop:false,blend:.42},
    {clip:'stand-up',at:7,rate:1,from:0,to:2,loop:false,blend:.38},
    {clip:'stand',at:9,rate:1,from:0,to:1,loop:true,blend:.35}
  ],path:[{t:0,x:0,y:0,z:0},{t:1,x:0,y:0,z:0},{t:5,x:0,y:0,z:-4.8},{t:7,x:0,y:0,z:-4.8},{t:9,x:0,y:0,z:-4.8},{t:10,x:0,y:0,z:-4.8}],face:[]},
  walk:{label:'10초 직선 걷기 · mps 동기화',seq:[{clip:'walk',at:0,rate:'path',from:0,to:1,loop:true,blend:.35}],path:[{t:0,x:0,y:0,z:0},{t:10,x:0,y:0,z:-12}],face:[]},
  phase:{label:'0.8 → 1.8 m/s · 위상 연속',seq:(()=>{const r1=.8/1.2,r2=1.8/1.2;return [{clip:'walk',at:0,phaseAt:0,rate:r1,from:0,to:1,loop:true,blend:.2},{clip:'walk',at:5,phaseAt:phaseContinuousAt(0,5,r1,r2),rate:r2,from:0,to:1,loop:true,blend:.2}];})(),path:[{t:0,x:0,y:0,z:0},{t:5,x:0,y:0,z:-4},{t:10,x:0,y:0,z:-13}],face:[]},
  turn:{label:'270° 회전 경로 · yaw 언랩',seq:[{clip:'walk',at:0,rate:'path',from:0,to:1,loop:true,blend:.25}],path:Array.from({length:49},(_,i)=>{const a=(i/48)*Math.PI*1.5,r=2.25;return {t:i/4,x:r*Math.sin(a),y:0,z:r*(Math.cos(a)-1)};}),face:[]},
  crawl:{label:'기어가기 · 척추 4점',seq:[{clip:'crawl',at:0,rate:'path',from:0,to:2,loop:true,blend:.3}],path:[{t:0,x:0,y:0,z:0},{t:10,x:0,y:0,z:-5.5}],face:[]}
};

function clone(value){return JSON.parse(JSON.stringify(value));}
function setPreset(name){scene=clone(PRESETS[name]);$('#sceneBadge').textContent=scene.label;$$('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));renderTimeline();syncTextareas();applyScene();}
function clipOptions(selected){return Object.keys(clips).sort().map(name=>`<option value="${escapeHtml(name)}"${name===selected?' selected':''}>${escapeHtml(name)}</option>`).join('');}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderTimeline(){
  $('#timeline').innerHTML=scene.seq.map((item,i)=>`<div class="timeline-row" data-row="${i}">
    <label><span>clip</span><select data-key="clip">${clipOptions(item.clip)}</select></label>
    <label><span>at</span><input data-key="at" type="number" step="0.01" value="${item.at}"></label>
    <label><span>rate / path</span><input data-key="rate" value="${item.rate}"></label>
    <label><span>from</span><input data-key="from" type="number" step="0.01" value="${item.from??0}"></label>
    <label><span>to</span><input data-key="to" type="number" step="0.01" value="${item.to??''}"></label>
    <div class="flags"><label><input data-key="loop" type="checkbox" ${item.loop!==false?'checked':''}> loop</label><label><input data-key="pingpong" type="checkbox" ${item.pingpong?'checked':''}> pingpong</label><label>blend <input data-key="blend" type="number" min="0" step="0.05" value="${item.blend??.35}" style="width:68px"></label>${item.phaseAt!=null?`<label>phaseAt <input data-key="phaseAt" type="number" step="0.001" value="${item.phaseAt}" style="width:75px"></label>`:''}</div>
    <button class="remove" data-remove="${i}" aria-label="삭제">×</button>
  </div>`).join('');
  $$('#timeline [data-key]').forEach(input=>input.addEventListener('change',()=>{readTimeline();dirty=true;}));
  $$('[data-remove]').forEach(button=>button.onclick=()=>{scene.seq.splice(+button.dataset.remove,1);renderTimeline();applyScene();});
}
function readTimeline(){
  scene.seq=$$('.timeline-row').map(row=>{const item={};row.querySelectorAll('[data-key]').forEach(input=>{const key=input.dataset.key;if(input.type==='checkbox')item[key]=input.checked;else if(key==='clip')item[key]=input.value;else if(key==='rate')item[key]=input.value==='path'||input.value==='auto'?input.value:Number(input.value||1);else if(key==='to')item[key]=input.value===''?null:Number(input.value);else item[key]=Number(input.value);});return item;});
}
function syncTextareas(){$('#pathJson').value=JSON.stringify(scene.path,null,2);$('#faceJson').value=scene.face?.length?JSON.stringify(scene.face,null,2):'';}
function parseScene(){readTimeline();const path=JSON.parse($('#pathJson').value||'[]'),face=$('#faceJson').value.trim()?JSON.parse($('#faceJson').value):[];return {seq:scene.seq,path,face};}
function applyScene(){
  try{scene={...scene,...parseScene()};compiled=compileActor(scene,clips);dirty=false;const max=Math.max(1,compiled.duration,scene.path?.at(-1)?.t||0);$('#time').max=max;$('#pathWarning').textContent='';if(+$('#time').value>max)$('#time').value=0;renderAt(+$('#time').value);}
  catch(error){compiled=null;$('#pathWarning').textContent=error.message;console.error(error);}
}
function resize(){const rect=stage.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.max(320,Math.round(rect.width*dpr)),h=Math.max(320,Math.round(rect.height*dpr));if(stage.width!==w||stage.height!==h){stage.width=w;stage.height=h;renderAt(+$('#time').value);}}
function renderAt(t){
  if(dirty)applyScene();if(!compiled)return;const pose=compiled.poseAt(t),dpr=Math.min(2,devicePixelRatio||1);drawPose(ctx,pose,{dpr,depthBand:.10,zoom:.92});$('#timeReadout').textContent=`${t.toFixed(2)}s`;const yaw=compiled.face?.length?sampleFace(scene.face,t):compiled.path?compiled.path.yaw(t):0;$('#yawReadout').textContent=`yaw ${yaw.toFixed(1)}°`;$('#time').value=t;
}
function sampleFace(keys,t){if(!keys?.length)return 0;const sorted=[...keys].sort((a,b)=>a.t-b.t);if(t<=sorted[0].t)return sorted[0].yaw;if(t>=sorted.at(-1).t)return sorted.at(-1).yaw;let i=0;while(sorted[i+1].t<t)i++;return sorted[i].yaw+(sorted[i+1].yaw-sorted[i].yaw)*(t-sorted[i].t)/(sorted[i+1].t-sorted[i].t);}
function animation(now){if(!playing)return;const speed=+$('#speed').value,t=playFrom+(now-playStart)/1000*speed,max=+$('#time').max;if(t>=max){playing=false;$('#play').textContent='▶';renderAt(max);return;}renderAt(t);requestAnimationFrame(animation);}
function togglePlay(){playing=!playing;$('#play').textContent=playing?'❚❚':'▶';if(playing){playStart=performance.now();playFrom=+$('#time').value;if(playFrom>=+$('#time').max-.01)playFrom=0;requestAnimationFrame(animation);}}

async function loadIndex(){if(indexEntries)return indexEntries;const response=await fetch(INDEX_URL,{cache:'force-cache'});if(!response.ok)throw new Error(`index ${response.status}`);const text=await response.text(),entries=[];let subject='';for(const raw of text.split(/\r?\n/)){const heading=raw.match(/Subject #(\d+)(?:\s*\((.*)\))?/);if(heading){subject=heading[2]||'';continue;}const row=raw.trim().match(/^(\d{2,3}_\d+)\s+(.+)$/);if(row)entries.push({id:row[1],description:row[2],subject});}indexEntries=entries;return entries;}
const KOREAN={걷기:'walk',달리기:'run',기어가기:'crawl',손흔들기:'wave',앉기:'sit',점프:'jump',살금살금:'stealth',청소:'sweep',악수:'shake hands',하이파이브:'high-five',비틀거림:'stumble'};
async function searchIndex(){const box=$('#searchResults'),raw=$('#indexQuery').value.trim(),query=(KOREAN[raw]||raw||'walk').toLowerCase();box.innerHTML='<span class="status">검색 중…</span>';try{const entries=await loadIndex(),found=entries.filter(e=>(e.id+' '+e.description+' '+e.subject).toLowerCase().includes(query)).slice(0,36);box.innerHTML=found.length?found.map(e=>`<button data-clip="${e.id}" title="${escapeHtml(e.description)}"><b>${e.id}</b> ${escapeHtml(e.description.slice(0,38))}</button>`).join(''):'<span class="status">검색 결과가 없습니다.</span>';$$('[data-clip]').forEach(b=>b.onclick=()=>{$('#clipId').value=b.dataset.clip;});}catch(error){box.innerHTML=`<span class="status">인덱스를 불러오지 못했습니다: ${escapeHtml(error.message)}</span>`;}}
async function loadCMU(){const id=$('#clipId').value.trim();if(!/^\d{1,3}_\d+$/.test(id)){setStatus('클립 ID 형식은 02_01입니다.',true);return;}$('#loading').hidden=false;setStatus(`${id}.bvh 다운로드 및 순운동학 변환 중…`);try{const clip=await fetchCMUClip(id,{name:id,targetLeg:+$('#optLeg').value||.87,fps:30,yaw:+$('#optYaw').value||0,mirror:$('#optMirror').checked,autoloop:$('#optLoop').checked,inplace:$('#optInplace').checked,smoothloop:+$('#optSmooth').value||0});clips[id]=clip;renderTimeline();setStatus(`${id} 완료 · ${clip.n} frames · ${clip.fps} fps${clip.mps!=null?` · ${clip.mps.toFixed(3)} m/s`:''}`);scene.seq.push({clip:id,at:Math.ceil(compiled?.duration||0),rate:clip.inplace&&clip.mps>0&&scene.path?.length?'path':1,from:0,to:(clip.n-1)/clip.fps,loop:true,blend:.35});renderTimeline();}
  catch(error){setStatus(`변환 실패: ${error.message}`,true);console.error(error);}finally{$('#loading').hidden=true;}}
function setStatus(text,error=false){$('#loadStatus').textContent=text;$('#loadStatus').style.color=error?'var(--danger)':'var(--muted)';}
function addSequence(){const names=Object.keys(clips),last=scene.seq.at(-1),at=last?last.at+2:0;scene.seq.push({clip:names[0],at,rate:1,from:0,to:null,loop:true,blend:.35});renderTimeline();}
function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function exportActor(){try{const actor=parseScene();download('botland-actor.json',JSON.stringify({v:1,actor,clips:Object.fromEntries(Object.entries(clips).map(([name,c])=>[name,{name:c.name,fps:c.fps,n:c.n,mps:c.mps,inplace:c.inplace,src:c.src}]))},null,2));}catch(error){$('#pathWarning').textContent=error.message;}}

function jointDistance(a,b){let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.hypot(a[i][0]-b[i][0],a[i][1]-b[i][1],a[i][2]-b[i][2]));return max;}
function validateFootSlip(){const actor=compileActor(PRESETS.walk,clips),dt=1/60,speeds=[];for(let t=dt;t<=10;t+=dt){const a=actor.poseAt(t-dt),b=actor.poseAt(t);for(const name of ['L_ank','R_ank']){const i=INDEX[name];const vy=Math.abs((b[i][1]-a[i][1])/dt);if(a[i][1]<.095&&b[i][1]<.095&&vy<.05)speeds.push(Math.hypot(b[i][0]-a[i][0],b[i][2]-a[i][2])/dt);}}speeds.sort((a,b)=>a-b);const p95=speeds[Math.floor(speeds.length*.95)]||0;return {pass:p95<.09,value:`p95 ${p95.toFixed(3)} m/s`,detail:'10초 직선 경로의 접지 발 수평 속도'};}
function validateSeams(){const actor=compileActor(PRESETS.sequence,clips),eps=1/240;let max=0;for(const t of [1,5,7,9])max=Math.max(max,jointDistance(actor.poseAt(t-eps),actor.poseAt(t+eps)));return {pass:max<.12,value:`max ${max.toFixed(3)} m`,detail:'서기→걷기→앉기→서기 경계 관절 점프'};}
function validatePhase(){const r1=.8/1.2,r2=1.8/1.2,b=5,a2=phaseContinuousAt(0,b,r1,r2),left=(b-0)*r1,right=(b-a2)*r2,d=Math.abs(left-right);return {pass:d<1e-10,value:`Δ ${d.toExponential(1)}`,detail:`phaseAt₂ ${a2.toFixed(4)}s`};}
function validateYaw(){const path=compilePath(PRESETS.turn.path),delta=path.yaw(12)-path.yaw(0);return {pass:Math.abs(delta)>250&&Math.abs(delta)<290,value:`${delta.toFixed(1)}°`,detail:'270° 경로의 누적 yaw 방향'};}
function validateDeterminism(){const pose=compiled.poseAt(Math.min(2.345,+$('#time').max)),dpr=Math.min(2,devicePixelRatio||1),a=renderDeterminismHash(ctx,pose,{dpr,depthBand:.10,zoom:.92}),b=renderDeterminismHash(ctx,pose,{dpr,depthBand:.10,zoom:.92});renderAt(+$('#time').value);return {pass:a===b,value:a===b?`0x${a.toString(16)}`:'mismatch',detail:'같은 t를 두 번 그린 픽셀 FNV-1a'};}
function runValidation(){const tests=[['발 미끄럼',validateFootSlip],['클립 이음매',validateSeams],['속도 위상',validatePhase],['270° 방향',validateYaw],['결정적 픽셀',validateDeterminism]],results=[];for(const [name,test] of tests){try{results.push({name,...test()});}catch(error){results.push({name,pass:false,value:'error',detail:error.message});}}$('#validation').innerHTML=results.map(r=>`<div class="test ${r.pass?'pass':'fail'}"><i>${r.pass?'✓':'!'}</i><div><b>${r.name}</b><small>${escapeHtml(r.detail)}</small></div><strong>${escapeHtml(r.value)}</strong></div>`).join('');}

$('#play').onclick=togglePlay;$('#restart').onclick=()=>{playing=false;$('#play').textContent='▶';renderAt(0);};$('#time').oninput=e=>{playing=false;$('#play').textContent='▶';renderAt(+e.target.value);};$('#applyScene').onclick=applyScene;$('#addSequence').onclick=addSequence;$('#loadClip').onclick=loadCMU;$('#searchIndex').onclick=searchIndex;$('#indexQuery').addEventListener('keydown',e=>{if(e.key==='Enter')searchIndex();});$('#exportActor').onclick=exportActor;$('#runValidation').onclick=runValidation;$$('[data-preset]').forEach(b=>b.onclick=()=>setPreset(b.dataset.preset));
new ResizeObserver(resize).observe(stage);setPreset('sequence');requestAnimationFrame(()=>{resize();runValidation();});
console.info(CMU_CREDIT);
