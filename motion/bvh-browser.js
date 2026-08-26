export const JOINT_ORDER = [
  'pel','spine','chest','neck','head',
  'L_hip','L_knee','L_ank','L_toe',
  'R_hip','R_knee','R_ank','R_toe',
  'L_sho','L_elb','L_hnd','R_sho','R_elb','R_hnd'
];

export const CMU_CREDIT = 'The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.';
export const CMU_BASE = 'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data';

const ALIASES = {
  pel:['Hips','hip','root'], spine:['Spine','LowerBack'], chest:['Spine1','Spine2','Chest'], neck:['Neck1','Neck'], head:['Head'],
  L_hip:['LeftUpLeg','LHip','LeftHip'], L_knee:['LeftLeg','LeftKnee'], L_ank:['LeftFoot','LeftAnkle'], L_toe:['LeftToeBase','LeftToe'],
  R_hip:['RightUpLeg','RHip','RightHip'], R_knee:['RightLeg','RightKnee'], R_ank:['RightFoot','RightAnkle'], R_toe:['RightToeBase','RightToe'],
  L_sho:['LeftArm','LeftShoulder'], L_elb:['LeftForeArm','LeftElbow'], L_hnd:['LeftHand'],
  R_sho:['RightArm','RightShoulder'], R_elb:['RightForeArm','RightElbow'], R_hnd:['RightHand']
};

const I = () => [[1,0,0],[0,1,0],[0,0,1]];
const mul = (a,b) => Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>a[r][0]*b[0][c]+a[r][1]*b[1][c]+a[r][2]*b[2][c]));
const mv = (m,v) => [m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2],m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2],m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]];
const add = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const scale = (v,s) => [v[0]*s,v[1]*s,v[2]*s];
const len = v => Math.hypot(v[0],v[1],v[2]);
const lerp = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const norm = v => { const n=len(v); return n<1e-9?[0,1,0]:scale(v,1/n); };
function rotation(axis,deg){ const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a); if(axis==='X')return [[1,0,0],[0,c,-s],[0,s,c]]; if(axis==='Y')return [[c,0,s],[0,1,0],[-s,0,c]]; return [[c,-s,0],[s,c,0],[0,0,1]]; }

export function cmuUrl(clip){
  if(/^\d{1,3}_\d+$/.test(clip)){ const subject=Number(clip.split('_')[0]).toString().padStart(3,'0'); return `${CMU_BASE}/${subject}/${clip}.bvh`; }
  return clip;
}

export function parseBVH(text){
  const motionAt=text.search(/\bMOTION\b/); if(motionAt<0)throw new Error('BVH has no MOTION section');
  const hierarchy=text.slice(0,motionAt), motion=text.slice(motionAt+6);
  const tokens=hierarchy.match(/[{}]|[^\s{}]+/g)||[]; let cursor=0,channelCursor=0; const joints=[];
  const take=(expected)=>{ if(cursor>=tokens.length)throw new Error('Unexpected end of BVH hierarchy'); const value=tokens[cursor++]; if(expected&&value!==expected)throw new Error(`Expected ${expected}, got ${value}`); return value; };
  const endSite=()=>{ take('Site'); take('{'); let depth=1; while(depth){ const t=take(); if(t==='{')depth++; else if(t==='}')depth--; } };
  const parseJoint=(parent)=>{
    const kind=take(); if(kind!=='ROOT'&&kind!=='JOINT')throw new Error(`Expected ROOT/JOINT, got ${kind}`);
    const name=take(), index=joints.length; const joint={name,parent,offset:[0,0,0],channels:[],channelStart:0,children:[]}; joints.push(joint); if(parent!==null)joints[parent].children.push(index); take('{');
    while(true){ const token=take(); if(token==='}')break; if(token==='OFFSET')joint.offset=[+take(),+take(),+take()]; else if(token==='CHANNELS'){ const n=+take(); joint.channelStart=channelCursor; joint.channels=Array.from({length:n},()=>take()); channelCursor+=n; } else if(token==='JOINT'){ cursor--; parseJoint(index); } else if(token==='End')endSite(); else throw new Error(`Unexpected token ${token} in ${name}`); }
    return index;
  };
  if(take()!=='HIERARCHY')throw new Error('BVH must start with HIERARCHY');
  parseJoint(null); if(cursor!==tokens.length)throw new Error('Unparsed hierarchy tokens');
  const header=motion.match(/Frames:\s*(\d+)\s*Frame\s+Time:\s*([+\-0-9.eE]+)\s*/i); if(!header)throw new Error('Invalid MOTION header');
  const headerIndex=motion.indexOf(header[0]); const raw=motion.slice(headerIndex+header[0].length).match(/[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?/g)||[];
  const frameCount=+header[1],frameTime=+header[2],values=raw.map(Number),expected=frameCount*channelCursor; if(values.length<expected)throw new Error(`Motion has ${values.length} values; expected ${expected}`);
  const frames=Array.from({length:frameCount},(_,i)=>values.slice(i*channelCursor,(i+1)*channelCursor));
  return {joints,frames,frameTime,channelCount:channelCursor};
}

function fkFrame(bvh,values){
  const pos=Array(bvh.joints.length),rots=Array(bvh.joints.length);
  bvh.joints.forEach((joint,index)=>{
    const lp=[...joint.offset]; let lr=I();
    joint.channels.forEach((channel,k)=>{ const value=values[joint.channelStart+k],axis=channel[0].toUpperCase(); if(channel.toLowerCase().endsWith('position'))lp[{X:0,Y:1,Z:2}[axis]]+=value; else lr=mul(lr,rotation(axis,value)); });
    if(joint.parent===null){ pos[index]=lp; rots[index]=lr; } else { pos[index]=add(pos[joint.parent],mv(rots[joint.parent],lp)); rots[index]=mul(rots[joint.parent],lr); }
  });
  return pos;
}

function mappingFor(bvh){ const exact=new Map(bvh.joints.map((j,i)=>[j.name,i])),lower=new Map(bvh.joints.map((j,i)=>[j.name.toLowerCase(),i])),out={}; for(const name of JOINT_ORDER){ for(const alias of ALIASES[name]){ if(exact.has(alias)){out[name]=exact.get(alias);break;} if(lower.has(alias.toLowerCase())){out[name]=lower.get(alias.toLowerCase());break;} } if(out[name]===undefined)throw new Error(`Cannot map required joint ${name}`); } return out; }
function targetScale(bvh,map,targetLeg){ const totals=['L','R'].map(side=>len(bvh.joints[map[`${side}_knee`]].offset)+len(bvh.joints[map[`${side}_ank`]].offset)); return targetLeg/(totals.reduce((a,b)=>a+b,0)/totals.length); }
function yawPoint(p,degrees){ const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a); return [c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]]; }
function mappedFrames(bvh,map,ratio,yaw,mirror,headOffset){
  const pairs=[['L_hip','R_hip'],['L_knee','R_knee'],['L_ank','R_ank'],['L_toe','R_toe'],['L_sho','R_sho'],['L_elb','R_elb'],['L_hnd','R_hnd']];
  return bvh.frames.map(values=>{ const world=fkFrame(bvh,values),pose={}; for(const [name,index] of Object.entries(map))pose[name]=yawPoint(scale(world[index],ratio),yaw); pose.head=add(pose.head,scale(norm(sub(pose.head,pose.neck)),headOffset)); if(mirror){ const reflected={}; for(const [name,p] of Object.entries(pose))reflected[name]=[-p[0],p[1],p[2]]; Object.assign(pose,reflected); for(const [l,r] of pairs)[pose[l],pose[r]]=[reflected[r],reflected[l]]; } return JOINT_ORDER.map(name=>pose[name]); });
}
function resample(frames,sourceDt,start,dur,fps){ const sourceEnd=(frames.length-1)*sourceDt,s=Math.min(Math.max(0,start),sourceEnd),end=dur==null?sourceEnd:Math.min(sourceEnd,s+Math.max(0,dur)),count=Math.max(1,Math.round((end-s)*fps)+1),out=[]; for(let i=0;i<count;i++){ const t=Math.min(end,s+i/fps),x=t/sourceDt,lo=Math.min(frames.length-1,Math.floor(x)),hi=Math.min(frames.length-1,lo+1),w=x-lo; out.push(frames[lo].map((p,j)=>lerp(p,frames[hi][j],w))); } return out; }
function seat(frames){ const li=JOINT_ORDER.indexOf('L_ank'),ri=JOINT_ORDER.indexOf('R_ank'),pi=0,floor=Math.min(...frames.map(f=>Math.min(f[li][1],f[ri][1]))),[ox,,oz]=frames[0][pi]; frames.forEach((frame,fi)=>frames[fi]=frame.map(([x,y,z])=>[x-ox,y-floor,z-oz])); }
function posture(a,b){ const ca=a[0],cb=b[0]; let sum=0; for(let i=0;i<a.length;i++){ const d=sub(sub(a[i],ca),sub(b[i],cb)); sum+=d[0]*d[0]+d[1]*d[1]+d[2]*d[2]; } return sum/a.length; }
function autoLoop(frames,fps){ const n=frames.length,min=Math.max(8,Math.round(fps*.75)); if(n<=min+2)return {frames,range:[0,n-1]}; const step=Math.max(1,Math.floor(n/380)); let best=[Infinity,0,n-1]; for(let i=0;i<n-min;i+=step)for(let j=i+min;j<n;j+=step){ const seconds=(j-i)/fps,score=posture(frames[i],frames[j])-.0015*Math.min(seconds,12); if(score<best[0])best=[score,i,j]; } return {frames:frames.slice(best[1],best[2]+1).map(f=>f.map(p=>[...p])),range:[best[1],best[2]]}; }
function inplace(frames,fps){ if(frames.length<2)return 0; const a=frames[0][0],b=frames.at(-1)[0],mps=Math.hypot(b[0]-a[0],b[2]-a[2])/((frames.length-1)/fps); frames.forEach((frame,fi)=>{ const p=frame[0],dx=p[0]-a[0],dz=p[2]-a[2]; frames[fi]=frame.map(([x,y,z])=>[x-dx,y,z-dz]); }); return mps; }
function smoothLoop(frames,n){ n=Math.max(0,Math.min(n,Math.floor(frames.length/2))); if(!n)return; const src=frames.map(f=>f.map(p=>[...p])); const ss=t=>t*t*(3-2*t); for(let k=0;k<n;k++){ const edge=1-k/Math.max(1,n-1),w=.5*ss(edge),a=src[k],b=src[frames.length-n+k]; frames[k]=a.map((p,j)=>lerp(p,b[j],w)); frames[frames.length-n+k]=b.map((p,j)=>lerp(p,a[j],w)); } }

export function convertBVH(text,{name='clip',src='',targetLeg=.87,start=0,dur=null,fps=30,yaw=180,mirror=false,headOffset=.125,autoloop=false,inplace:makeInplace=false,smoothloop=0}={}){
  const bvh=parseBVH(text),map=mappingFor(bvh),ratio=targetScale(bvh,map,targetLeg); let frames=resample(mappedFrames(bvh,map,ratio,yaw,mirror,headOffset),bvh.frameTime,start,dur,fps); seat(frames); let loop=null,mps;
  if(autoloop){ const chosen=autoLoop(frames,fps); frames=chosen.frames;loop=chosen.range;seat(frames); }
  if(makeInplace)mps=inplace(frames,fps); if(smoothloop)smoothLoop(frames,smoothloop); seat(frames);
  const out={v:1,kind:'mocap',name,fps,n:frames.length,order:JOINT_ORDER,j:frames.flat(2).map(v=>Math.round(v*1000)/1000),src:{url:src,credit:CMU_CREDIT}}; if(makeInplace){out.inplace=true;out.mps=Math.round(mps*10000)/10000;} if(loop)out.loop={sourceStartFrame:loop[0],sourceEndFrame:loop[1],smooth:smoothloop}; return out;
}

export async function fetchCMUClip(clip,options={}){ const url=cmuUrl(clip),response=await fetch(url,{cache:'force-cache'}); if(!response.ok)throw new Error(`CMU BVH request failed: ${response.status}`); const text=await response.text(); return convertBVH(text,{...options,name:options.name||clip,src:url}); }
