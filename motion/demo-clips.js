import {JOINT_ORDER} from './bvh-browser.js';
const FPS=30;
const idx=Object.fromEntries(JOINT_ORDER.map((n,i)=>[n,i]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ss=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function base(){return [
  [0,1.00,0],[0,1.15,0],[0,1.34,0],[0,1.52,0],[0,1.72,-.01],
  [-.11,.98,0],[-.11,.55,.01],[-.11,.09,.04],[-.11,.03,-.12],
  [.11,.98,0],[.11,.55,.01],[.11,.09,.04],[.11,.03,-.12],
  [-.24,1.43,0],[-.48,1.18,0],[-.69,.98,0],
  [.24,1.43,0],[.48,1.18,0],[.69,.98,0]
];}
function flatten(frames){return frames.flat(2).map(v=>Math.round(v*1000)/1000);}
function clip(name,frames,{mps=0,inplace=true}={}){return {v:1,kind:'mocap',name,fps:FPS,n:frames.length,order:JOINT_ORDER,j:flatten(frames),mps,inplace,src:{url:'builtin://deterministic-test',credit:'Built-in deterministic validation clip; load a CMU clip for captured human motion.'}};}
function legAt(pose,side,phase,speed,run=false){
  const sign=side==='L'?-1:1,hip=idx[`${side}_hip`],knee=idx[`${side}_knee`],ank=idx[`${side}_ank`],toe=idx[`${side}_toe`];
  const c=(phase+(side==='R'?.5:0))%1,stance=c<.62,step=speed*.62;
  let z,y;if(stance){const u=c/.62;z=lerp(-step*.5,step*.5,u);y=.085;}else{const u=(c-.62)/.38;z=lerp(step*.5,-step*.5,ss(u));y=.085+(run?.22:.13)*Math.sin(Math.PI*u);}
  pose[hip]=[sign*.11,.98,0];pose[ank]=[sign*.11,y,z];pose[toe]=[sign*.11,.03+Math.max(0,y-.085)*.25,z-.16];
  const mid=[sign*.11,(pose[hip][1]+y)/2,z*.42],bend=(stance?.08:.15)+(run?.08:0);pose[knee]=[mid[0]+sign*.02,mid[1],mid[2]-bend];
}
function locomotion(name,speed,run=false){
  const frames=[],count=FPS+1;for(let i=0;i<count;i++){const t=i/FPS,phase=t%1,p=base(),bob=(run?.055:.025)*Math.sin(phase*Math.PI*4);p[idx.pel][1]+=bob;p[idx.spine][1]+=bob;p[idx.chest][1]+=bob;p[idx.neck][1]+=bob;p[idx.head][1]+=bob;legAt(p,'L',phase,speed,run);legAt(p,'R',phase,speed,run);
    const swing=(run?.48:.30)*Math.sin(phase*Math.PI*2);p[idx.L_elb]=[-.48,1.18,-swing];p[idx.L_hnd]=[-.67,1.02,-swing*1.18];p[idx.R_elb]=[.48,1.18,swing];p[idx.R_hnd]=[.67,1.02,swing*1.18];frames.push(p);}
  return clip(name,frames,{mps:speed,inplace:true});
}
function stand(){return clip('stand',Array.from({length:31},()=>base()),{mps:0,inplace:true});}
function sit(){const frames=[];for(let i=0;i<=60;i++){const u=ss(i/60),p=base(),drop=.47*u,back=.10*u;p[idx.pel]=[0,1-drop,back];p[idx.spine]=[0,1.15-drop,back+.02];p[idx.chest]=[0,1.34-drop*.82,back+.04];p[idx.neck]=[0,1.52-drop*.72,back+.03];p[idx.head]=[0,1.72-drop*.65,back];for(const side of ['L','R']){const s=side==='L'?-1:1;p[idx[`${side}_hip`]]=[s*.11,.98-drop,back];p[idx[`${side}_knee`]]=[s*.13,.48-drop*.38,-.25*u];p[idx[`${side}_ank`]]=[s*.13,.09,-.02-.38*u];p[idx[`${side}_toe`]]=[s*.13,.03,-.18-.38*u];}p[idx.L_elb]=[-.42,1.2-drop*.7,-.08];p[idx.L_hnd]=[-.28,.92-drop*.3,-.25];p[idx.R_elb]=[.42,1.2-drop*.7,-.08];p[idx.R_hnd]=[.28,.92-drop*.3,-.25];frames.push(p);}return clip('sit-down',frames);}
function standUp(){const down=sit(),frames=[];for(let i=0;i<down.n;i++){const source=down.n-1-i,baseIndex=source*57,p=[];for(let j=0;j<19;j++)p.push([down.j[baseIndex+j*3],down.j[baseIndex+j*3+1],down.j[baseIndex+j*3+2]]);frames.push(p);}return clip('stand-up',frames);}
function wave(){const frames=[];for(let i=0;i<=60;i++){const t=i/FPS,p=base(),angle=Math.sin(t*Math.PI*4),lift=ss(Math.min(1,t*2))*ss(Math.min(1,(2-t)*2));p[idx.R_elb]=[.43,1.5+lift*.17,-.04];p[idx.R_hnd]=[.43+angle*.18,1.72+lift*.16,-.04];p[idx.head][2]=-.02*Math.sin(t*Math.PI*2);frames.push(p);}return clip('wave',frames);}
function crawl(){const frames=[];for(let i=0;i<=60;i++){const phase=i/60,p=base();p[idx.pel]=[0,.48,.12];p[idx.spine]=[0,.54,.02];p[idx.chest]=[0,.58,-.22];p[idx.neck]=[0,.64,-.42];p[idx.head]=[0,.78,-.56];const a=Math.sin(phase*Math.PI*4),b=-a;for(const [side,s,ph] of [['L',-1,a],['R',1,b]]){p[idx[`${side}_hip`]]=[s*.13,.45,.13];p[idx[`${side}_knee`]]=[s*.26,.16,.05+ph*.11];p[idx[`${side}_ank`]]=[s*.23,.07,.27+ph*.18];p[idx[`${side}_toe`]]=[s*.23,.03,.12+ph*.18];p[idx[`${side}_sho`]]=[s*.24,.58,-.22];p[idx[`${side}_elb`]]=[s*.37,.26,-.37-ph*.13];p[idx[`${side}_hnd`]]=[s*.38,.04,-.59-ph*.22];}frames.push(p);}return clip('crawl',frames,{mps:.55,inplace:true});}
export const DEMO_CLIPS={stand:stand(),walk:locomotion('walk',1.2,false),run:locomotion('run',2.6,true),sit:sit(),'stand-up':standUp(),wave:wave(),crawl:crawl()};
