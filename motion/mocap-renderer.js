import {INDEX} from './motion-runtime.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function dist3(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
function lerp3(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

export function resampleSpine(pose){
  const points=[pose[INDEX.pel],pose[INDEX.spine],pose[INDEX.chest],pose[INDEX.neck]];
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+dist3(points[i-1],points[i]));
  const total=lengths.at(-1)||1;
  const at=f=>{const target=total*f;let i=0;while(i+1<lengths.length&&lengths[i+1]<target)i++;const span=lengths[i+1]-lengths[i]||1;return lerp3(points[i],points[i+1],(target-lengths[i])/span);};
  return [points[0],at(.37),at(.74),points.at(-1)];
}

function projector(canvas,pose,{margin=42,zoom=1}={}){
  const ys=pose.map(p=>p[1]),xs=pose.map(p=>p[0]);const minY=Math.min(...ys),maxY=Math.max(...ys),minX=Math.min(...xs),maxX=Math.max(...xs);
  const height=Math.max(.5,maxY-minY),width=Math.max(.5,maxX-minX),scale=Math.min((canvas.height-margin*2)/height,(canvas.width-margin*2)/width)*zoom;
  const centerX=(minX+maxX)/2,groundY=canvas.height-margin;
  return p=>[canvas.width/2+(p[0]-centerX)*scale,groundY-(p[1]-minY)*scale,p[2],scale];
}

function circle(path,x,y,r){path.moveTo(x+r,y);path.arc(x,y,r,0,-Math.PI*2,true);path.closePath();}
function capsule(path,a,b,r){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1e-6){circle(path,a[0],a[1],r);return;}
  const nx=-dy/length,ny=dx/length,angle=Math.atan2(ny,nx);
  path.moveTo(a[0]+nx*r,a[1]+ny*r);
  path.lineTo(b[0]+nx*r,b[1]+ny*r);
  path.arc(b[0],b[1],r,angle,angle-Math.PI,true);
  path.lineTo(a[0]-nx*r,a[1]-ny*r);
  path.arc(a[0],a[1],r,angle-Math.PI,angle-Math.PI*2,true);
  path.closePath();
}
function addBone(path,project,pose,a,b,rMeters,joints=true){const pa=project(pose[INDEX[a]]),pb=project(pose[INDEX[b]]),r=rMeters*pa[3];capsule(path,pa,pb,r);if(joints){circle(path,pa[0],pa[1],r);circle(path,pb[0],pb[1],r);}}
function chainDepth(pose,names){return names.reduce((sum,name)=>sum+pose[INDEX[name]][2],0)/names.length;}

export function drawPose(ctx,pose,options={}){
  const canvas=ctx.canvas,dpr=options.dpr||1;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);const logical={width:canvas.width/dpr,height:canvas.height/dpr};
  ctx.clearRect(0,0,logical.width,logical.height);
  const project=projector(logical,pose,options),pel=project(pose[INDEX.pel]),bodyZ=(pose[INDEX.pel][2]+pose[INDEX.chest][2]+pose[INDEX.neck][2])/3,band=options.depthBand??.10;
  const bg=ctx.createLinearGradient(0,0,logical.width,logical.height);bg.addColorStop(0,options.backgroundA||'#0d1830');bg.addColorStop(.55,options.backgroundB||'#111126');bg.addColorStop(1,options.backgroundC||'#251037');ctx.fillStyle=bg;ctx.fillRect(0,0,logical.width,logical.height);
  ctx.strokeStyle='rgba(120,245,255,.12)';ctx.lineWidth=1;for(let y=logical.height-38;y>logical.height*.62;y-=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(logical.width,y);ctx.stroke();}
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(pel[0],logical.height-30,Math.max(35,pel[3]*.28),10,0,0,Math.PI*2);ctx.fill();

  const limbDefs=[
    {names:['L_hip','L_knee','L_ank','L_toe'],bones:[['L_hip','L_knee',.055],['L_knee','L_ank',.05],['L_ank','L_toe',.04]]},
    {names:['R_hip','R_knee','R_ank','R_toe'],bones:[['R_hip','R_knee',.055],['R_knee','R_ank',.05],['R_ank','R_toe',.04]]},
    {names:['L_sho','L_elb','L_hnd'],bones:[['L_sho','L_elb',.043],['L_elb','L_hnd',.038]]},
    {names:['R_sho','R_elb','R_hnd'],bones:[['R_sho','R_elb',.043],['R_elb','R_hnd',.038]]}
  ];
  const back=[],front=[];for(const limb of limbDefs){const depth=chainDepth(pose,limb.names);(depth>bodyZ+band?back:front).push(limb);}
  const makeLayer=limbs=>{const path=new Path2D();for(const limb of limbs)for(const [a,b,r] of limb.bones)addBone(path,project,pose,a,b,r,true);return path;};
  const palette=options.palette||{back:'#705bc7',body:'#80e9f3',front:'#d6fbff',joint:'#ffffff'};
  const backPath=makeLayer(back);ctx.fillStyle=palette.back;ctx.fill(backPath,'nonzero');

  const torso=new Path2D(),spine=resampleSpine(pose);for(let i=0;i<spine.length-1;i++){const a=project(spine[i]),b=project(spine[i+1]),radius=(.105-i*.012)*a[3];capsule(torso,a,b,radius);circle(torso,a[0],a[1],radius);circle(torso,b[0],b[1],radius);}
  addBone(torso,project,pose,'neck','head',.055,true);
  const head=project(pose[INDEX.head]);circle(torso,head[0],head[1],.105*head[3]);
  addBone(torso,project,pose,'L_sho','R_sho',.055,false);addBone(torso,project,pose,'L_hip','R_hip',.07,false);
  ctx.fillStyle=palette.body;ctx.fill(torso,'nonzero');
  const shine=ctx.createLinearGradient(0,0,logical.width,logical.height);shine.addColorStop(0,'rgba(255,255,255,.52)');shine.addColorStop(.35,'rgba(255,255,255,.04)');shine.addColorStop(.72,'rgba(255,112,220,.16)');shine.addColorStop(1,'rgba(110,247,255,.35)');ctx.fillStyle=shine;ctx.fill(torso,'nonzero');

  const frontPath=makeLayer(front);ctx.fillStyle=palette.front;ctx.fill(frontPath,'nonzero');
  ctx.globalCompositeOperation='screen';ctx.strokeStyle='rgba(115,247,255,.35)';ctx.lineWidth=2;ctx.stroke(backPath);ctx.stroke(torso);ctx.stroke(frontPath);ctx.globalCompositeOperation='source-over';
  ctx.restore();
}

export function renderDeterminismHash(ctx,pose,options={}){
  drawPose(ctx,pose,options);const a=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height).data;let hash=2166136261;for(let i=0;i<a.length;i++){hash^=a[i];hash=Math.imul(hash,16777619);}return hash>>>0;
}
