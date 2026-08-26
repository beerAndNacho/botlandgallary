export const ORDER = [
  'pel','spine','chest','neck','head',
  'L_hip','L_knee','L_ank','L_toe',
  'R_hip','R_knee','R_ank','R_toe',
  'L_sho','L_elb','L_hnd','R_sho','R_elb','R_hnd'
];
export const INDEX = Object.fromEntries(ORDER.map((name,index)=>[name,index]));
const DEG = Math.PI/180;
const PATH_CACHE = new Map();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(v,m)=>((v%m)+m)%m;
const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;
const vlerp=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const length=v=>Math.hypot(v[0],v[1],v[2]);

export function clipDuration(clip){ return Math.max(0,(clip.n-1)/clip.fps); }
export function getFrame(clip,index){ const out=new Array(clip.order.length); const base=clamp(index,0,clip.n-1)*clip.order.length*3; for(let j=0;j<out.length;j++)out[j]=[clip.j[base+j*3],clip.j[base+j*3+1],clip.j[base+j*3+2]]; return out; }
export function sampleClip(clip,time){ const duration=clipDuration(clip),t=clamp(time,0,duration),f=t*clip.fps,lo=Math.floor(f),hi=Math.min(clip.n-1,lo+1),w=f-lo,a=getFrame(clip,lo),b=getFrame(clip,hi); return a.map((p,i)=>vlerp(p,b[i],w)); }

export function poseFacingYaw(pose){
  const lHip=pose[INDEX.L_hip],rHip=pose[INDEX.R_hip],lSho=pose[INDEX.L_sho],rSho=pose[INDEX.R_sho];
  const right=[(rHip[0]-lHip[0]+rSho[0]-lSho[0])*.5,0,(rHip[2]-lHip[2]+rSho[2]-lSho[2])*.5];
  const n=Math.hypot(right[0],right[2])||1,forward=[right[2]/n,0,-right[0]/n];
  return Math.atan2(-forward[0],-forward[2])/DEG;
}
function rotateAroundY(point,pivot,degrees){ const a=degrees*DEG,c=Math.cos(a),s=Math.sin(a),x=point[0]-pivot[0],z=point[2]-pivot[2]; return [pivot[0]+c*x+s*z,point[1],pivot[2]-s*x+c*z]; }
export function alignPose(reference,candidate){
  const refPel=reference[INDEX.pel],srcPel=candidate[INDEX.pel],delta=poseFacingYaw(reference)-poseFacingYaw(candidate);
  return candidate.map(point=>{ const rotated=rotateAroundY(point,srcPel,delta); return [rotated[0]+refPel[0]-srcPel[0],rotated[1]+refPel[1]-srcPel[1],rotated[2]+refPel[2]-srcPel[2]]; });
}
export function blendPoses(a,b,t,{align=true}={}){ const target=align?alignPose(a,b):b; return a.map((p,i)=>vlerp(p,target[i],t)); }

function fritschSlopes(xs,ys){
  const n=xs.length;if(n===1)return [0]; const d=Array(n-1); for(let i=0;i<n-1;i++)d[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
  const m=Array(n);m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])*.5;
  for(let i=0;i<n-1;i++){ if(Math.abs(d[i])<1e-12){m[i]=0;m[i+1]=0;continue;} const a=m[i]/d[i],b=m[i+1]/d[i],q=a*a+b*b;if(q>9){const tau=3/Math.sqrt(q);m[i]=tau*a*d[i];m[i+1]=tau*b*d[i];} }
  return m;
}
class ScalarHermite{
  constructor(points,key){ this.x=points.map(p=>p.t);this.y=points.map(p=>Number(p[key]??0));this.m=fritschSlopes(this.x,this.y); }
  interval(t){ if(t<=this.x[0])return 0;if(t>=this.x.at(-1))return this.x.length-2;let lo=0,hi=this.x.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(this.x[mid]<=t)lo=mid;else hi=mid;}return lo; }
  value(t){ if(this.x.length===1)return this.y[0];const i=this.interval(t),x0=this.x[i],x1=this.x[i+1],h=x1-x0,u=clamp((t-x0)/h,0,1),u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*this.y[i]+(u3-2*u2+u)*h*this.m[i]+(-2*u3+3*u2)*this.y[i+1]+(u3-u2)*h*this.m[i+1]; }
  derivative(t){ if(this.x.length===1)return 0;const i=this.interval(t),x0=this.x[i],x1=this.x[i+1],h=x1-x0,u=clamp((t-x0)/h,0,1),u2=u*u;return ((6*u2-6*u)*this.y[i]+(3*u2-4*u+1)*h*this.m[i]+(-6*u2+6*u)*this.y[i+1]+(3*u2-2*u)*h*this.m[i+1])/h; }
}
export class MotionPath{
  constructor(points){
    if(!Array.isArray(points)||points.length<2)throw new Error('path requires at least two keyframes');
    this.points=points.map(p=>({t:+p.t,x:+p.x||0,y:+p.y||0,z:+p.z||0})).sort((a,b)=>a.t-b.t);
    for(let i=1;i<this.points.length;i++)if(this.points[i].t<=this.points[i-1].t)throw new Error('path times must increase');
    this.x=new ScalarHermite(this.points,'x');this.y=new ScalarHermite(this.points,'y');this.z=new ScalarHermite(this.points,'z');this.buildArcTable();this.buildYawTable();
  }
  value(t){return [this.x.value(t),this.y.value(t),this.z.value(t)];}
  velocity(t){return [this.x.derivative(t),this.y.derivative(t),this.z.derivative(t)];}
  buildArcTable(){ const table=[],steps=64;let total=0,prev=this.value(this.points[0].t);table.push([this.points[0].t,0]);for(let s=0;s<this.points.length-1;s++){const a=this.points[s].t,b=this.points[s+1].t;for(let k=1;k<=steps;k++){const t=a+(b-a)*k/steps,p=this.value(t);total+=length(sub(p,prev));table.push([t,total]);prev=p;}}this.arcTable=table;this.totalLength=total; }
  arcAt(t){const table=this.arcTable;if(t<=table[0][0])return 0;if(t>=table.at(-1)[0])return table.at(-1)[1];let lo=0,hi=table.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(table[m][0]<=t)lo=m;else hi=m;}const [ta,sa]=table[lo],[tb,sb]=table[hi];return lerp(sa,sb,(t-ta)/(tb-ta));}
  arcLength(a,b){return this.arcAt(b)-this.arcAt(a);}
  buildYawTable(){const samples=[];let previous=null,acc=0;for(const [t] of this.arcTable){const v=this.velocity(t);if(Math.hypot(v[0],v[2])<1e-7){samples.push({t,yaw:previous??0});continue;}let raw=Math.atan2(-v[0],-v[2])/DEG;if(previous!==null){let delta=raw-previous;while(delta>180)delta-=360;while(delta<-180)delta+=360;acc+=delta;}else acc=raw;previous=raw;samples.push({t,yaw:acc});}this.yawSamples=samples;}
  yaw(t){const s=this.yawSamples;if(t<=s[0].t)return s[0].yaw;if(t>=s.at(-1).t)return s.at(-1).yaw;let lo=0,hi=s.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(s[m].t<=t)lo=m;else hi=m;}return lerp(s[lo].yaw,s[hi].yaw,(t-s[lo].t)/(s[hi].t-s[lo].t));}
}
export function compilePath(points){const key=JSON.stringify(points);if(!PATH_CACHE.has(key))PATH_CACHE.set(key,new MotionPath(points));return PATH_CACHE.get(key);}
export function unwrapYawKeys(keys){let previous=null,acc=0;return [...keys].sort((a,b)=>a.t-b.t).map(key=>{const raw=+key.yaw;if(previous===null)acc=raw;else{let d=raw-previous;while(d>180)d-=360;while(d<-180)d+=360;acc+=d;}previous=raw;return {t:+key.t,yaw:acc};});}
function sampleYaw(keys,t){if(!keys.length)return 0;if(t<=keys[0].t)return keys[0].yaw;if(t>=keys.at(-1).t)return keys.at(-1).yaw;let i=0;while(i+1<keys.length&&keys[i+1].t<t)i++;return lerp(keys[i].yaw,keys[i+1].yaw,(t-keys[i].t)/(keys[i+1].t-keys[i].t));}
export function phaseContinuousAt(previousAnchor,boundary,previousRate,nextRate){if(!nextRate)throw new Error('nextRate must be non-zero');return boundary-(boundary-previousAnchor)*previousRate/nextRate;}
function normalizeItem(item,index){return {clip:item.clip,at:+item.at||0,phaseAt:item.phaseAt==null?(+item.at||0):+item.phaseAt,rate:item.rate??1,from:+item.from||0,to:item.to==null?null:+item.to,loop:item.loop!==false,pingpong:!!item.pingpong,blend:item.blend==null?.35:+item.blend,index};}
function localTime(item,clip,t,path){
  let elapsed;
  if(item.rate==='path'||item.rate==='auto'){
    if(!path)throw new Error('path rate requires actor.path');if(!clip.inplace)throw new Error(`path clip ${clip.name} must be --inplace`);if(!(clip.mps>0))throw new Error(`path clip ${clip.name} has no positive mps`);
    elapsed=path.arcLength(item.phaseAt,t)/clip.mps;
  }else elapsed=(t-item.phaseAt)*(+item.rate||1);
  let time=item.from+elapsed,from=item.from,to=item.to==null?clipDuration(clip):item.to,span=Math.max(1e-9,to-from);
  if(item.pingpong){const q=mod(time-from,span*2);time=from+(q<=span?q:span*2-q);}else if(item.loop)time=from+mod(time-from,span);else time=clamp(time,from,to);
  return time;
}
function worldTransform(pose,path,yaw,t){
  const position=path?path.value(t):[0,0,0],pel=pose[INDEX.pel],a=yaw*DEG,c=Math.cos(a),s=Math.sin(a),strip=!!path;
  return pose.map(p=>{const x=p[0]-(strip?pel[0]:0),z=p[2]-(strip?pel[2]:0);return [position[0]+c*x+s*z,position[1]+p[1],position[2]-s*x+c*z];});
}
export function compileActor(actor,clips){
  const seq=(actor.seq||[]).map(normalizeItem).sort((a,b)=>a.at-b.at);if(!seq.length)throw new Error('actor.seq is empty');
  const path=actor.path?.length?compilePath(actor.path):null,face=actor.face?.length?unwrapYawKeys(actor.face):null;
  const poseAt=t=>{
    let index=0;for(let i=1;i<seq.length;i++){if(seq[i].at<=t)index=i;else break;}const current=seq[index],clip=clips[current.clip];if(!clip)throw new Error(`unknown clip ${current.clip}`);
    let pose=sampleClip(clip,localTime(current,clip,t,path));const next=seq[index+1];if(next&&t>=next.at-next.blend&&t<next.at){const nextClip=clips[next.clip];if(!nextClip)throw new Error(`unknown clip ${next.clip}`);const w=smoothstep((t-(next.at-next.blend))/Math.max(1e-9,next.blend));pose=blendPoses(pose,sampleClip(nextClip,localTime(next,nextClip,next.at,path)),w,{align:true});}
    const yaw=face?sampleYaw(face,t):path?path.yaw(t):0;return worldTransform(pose,path,yaw,t);
  };
  return {poseAt,path,seq,face,duration:Math.max(seq.at(-1).at+clipDuration(clips[seq.at(-1).clip]),path?path.points.at(-1).t:0)};
}
