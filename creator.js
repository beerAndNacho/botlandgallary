(()=>{
'use strict';
const VERSION='7.2.0';
const SPECIES=[
  {id:'fox',label:'별여우',emoji:'🦊',shape:'큰 삼각 귀 · 풍성한 꼬리'},
  {id:'cat',label:'구름고양이',emoji:'🐱',shape:'둥근 얼굴 · 말린 꼬리'},
  {id:'rabbit',label:'달토끼',emoji:'🐰',shape:'긴 귀 · 통통한 점프 체형'},
  {id:'otter',label:'물수달',emoji:'🦦',shape:'긴 몸 · 넓은 물갈퀴 꼬리'},
  {id:'dragon',label:'꼬마용',emoji:'🐲',shape:'뿔 · 주둥이 · 비늘 꼬리'},
  {id:'bear',label:'새싹곰',emoji:'🐻',shape:'큰 원형 몸 · 짧은 팔다리'},
  {id:'dog',label:'번개강아지',emoji:'🐶',shape:'처진 귀 · 활기찬 서기 자세'},
  {id:'raccoon',label:'오로라라쿤',emoji:'🦝',shape:'눈가 마스크 · 줄무늬 꼬리'},
  {id:'penguin',label:'수정펭귄',emoji:'🐧',shape:'물방울 몸 · 지느러미 팔'},
  {id:'frog',label:'젤리개구리',emoji:'🐸',shape:'돌출 눈 · 넓은 뒷발'},
  {id:'axolotl',label:'별가루아홀로틀',emoji:'🫧',shape:'외부 아가미 · 유선형 몸'},
  {id:'squirrel',label:'빛다람쥐',emoji:'🐿️',shape:'작은 몸 · 거대한 말린 꼬리'}
];
const PALETTES=[
  {name:'오로라',c1:'#73f7ff',c2:'#eefcff',c3:'#ff78df',dark:'#34328f'},
  {name:'레몬팝',c1:'#fff36d',c2:'#fff8d8',c3:'#ff8d55',dark:'#884920'},
  {name:'딸기소다',c1:'#ff7fae',c2:'#ffe1ed',c3:'#9c82ff',dark:'#713061'},
  {name:'민트구름',c1:'#77ffc1',c2:'#eafff7',c3:'#67bfff',dark:'#1c6f74'},
  {name:'은하수',c1:'#736dff',c2:'#d9dcff',c3:'#ff75e5',dark:'#24245f'},
  {name:'복숭아빛',c1:'#ff9b83',c2:'#fff0cf',c3:'#ff70bb',dark:'#8a3d52'},
  {name:'바다유리',c1:'#58d8ff',c2:'#d7ffff',c3:'#5c7dff',dark:'#1c4386'},
  {name:'숲의빛',c1:'#8ee36c',c2:'#f7ffd1',c3:'#48c9a2',dark:'#2a6b4c'}
];
const OPTIONS={
  eyes:[['galaxy','별빛 눈'],['round','동그란 눈'],['happy','웃는 눈'],['spark','반짝 눈'],['sleepy','졸린 눈']],
  face:[['smile','활짝 웃음'],['tiny','작은 미소'],['play','장난스러움'],['shy','수줍음'],['cool','당당함']],
  wings:[['crystal','수정 날개'],['fairy','요정 날개'],['cloud','구름 날개'],['mini','작은 날개'],['none','없음']],
  accessory:[['star','별 목걸이'],['bell','방울'],['scarf','리본 스카프'],['crown','작은 왕관'],['bag','미니 가방'],['orb','마법 구슬'],['none','없음']],
  element:[['star','별빛','✦'],['electric','전기','⚡'],['water','물','💧'],['forest','숲','🌱'],['fire','불꽃','🔥'],['moon','달','☾'],['ice','얼음','❄'],['dream','꿈','☁']],
  rarity:[['COMMON','COMMON'],['RARE','RARE'],['EPIC','EPIC'],['LEGENDARY','LEGENDARY']]
};
let state={species:0,palette:0,eyes:'galaxy',face:'smile',wings:'crystal',accessory:'star',element:'star',rarity:'RARE',name:'루미',seed:1};
const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const STORE='botland-creator-v2';
let volatileStore='[]';
function safeGet(){try{return localStorage.getItem(STORE)||volatileStore}catch{return volatileStore}}
function safeSet(value){volatileStore=value;try{localStorage.setItem(STORE,value)}catch{}}
function safeClear(){volatileStore='[]';try{localStorage.removeItem(STORE)}catch{}}
function hash(value){let x=Number(value)||1;x=Math.imul(x^(x>>>16),2246822507);x=Math.imul(x^(x>>>13),3266489909);return(x^(x>>>16))>>>0}
function pick(list,seed){return list[hash(seed)%list.length]}
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function optionLabel(group,value){return (OPTIONS[group].find(x=>x[0]===value)||['',value])[1]}
function initSelect(selector,items){$(selector).innerHTML=items.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}
function init(){
  $('#species').innerHTML=SPECIES.map((x,i)=>`<button class="chip${i===0?' on':''}" data-species="${i}" title="${x.shape}"><i>${x.emoji}</i><span>${x.label}</span></button>`).join('');
  $('#colors').innerHTML=PALETTES.map((x,i)=>`<button class="swatch${i===0?' on':''}" data-palette="${i}" title="${x.name}" style="--sw:linear-gradient(135deg,${x.c1},${x.c2},${x.c3})"></button>`).join('');
  initSelect('#eyes',OPTIONS.eyes);initSelect('#face',OPTIONS.face);initSelect('#wings',OPTIONS.wings);initSelect('#accessory',OPTIONS.accessory);initSelect('#element',OPTIONS.element);initSelect('#rarity',OPTIONS.rarity);
  bind();render();renderSaved();
}
function bind(){
  document.addEventListener('click',event=>{
    const species=event.target.closest('[data-species]');
    if(species){state.species=Number(species.dataset.species);state.name=nameFor(state);render()}
    const palette=event.target.closest('[data-palette]');
    if(palette){state.palette=Number(palette.dataset.palette);render()}
  });
  ['eyes','face','wings','accessory','element','rarity'].forEach(id=>$('#'+id).addEventListener('change',event=>{state[id]=event.target.value;render()}));
  $('#name').addEventListener('input',event=>{state.name=event.target.value||'이름없음';render()});
  $('#seed').addEventListener('input',event=>{state.seed=Math.max(1,Math.min(999999,Number(event.target.value)||1));render()});
  $('#generate').onclick=()=>{state.seed=1+hash(Date.now())%999999;state.name=nameFor(state);syncControls();render();toast('새 실루엣 캐릭터가 태어났어요')};
  $('#random').onclick=()=>randomize(false);
  $('#variation').onclick=()=>randomize(true);
  $('#save').onclick=saveCharacter;
  $('#clear').onclick=()=>{safeClear();renderSaved();toast('보관함을 비웠어요')};
  $('#svg').onclick=saveSvg;
  $('#png').onclick=savePng;
  $('#copy').onclick=copyRecipe;
  tilt($('#hcard'));
}
function randomize(keepSpecies){
  const q=hash(Date.now()+Math.random()*1e9);
  if(!keepSpecies)state.species=q%SPECIES.length;
  state.palette=(q>>>4)%PALETTES.length;
  state.eyes=pick(OPTIONS.eyes,q+11)[0];
  state.face=pick(OPTIONS.face,q+19)[0];
  state.wings=pick(OPTIONS.wings,q+29)[0];
  state.accessory=pick(OPTIONS.accessory,q+37)[0];
  state.element=pick(OPTIONS.element,q+43)[0];
  state.rarity=pick(OPTIONS.rarity,q+53)[0];
  state.seed=1+q%999999;
  state.name=nameFor(state);
  syncControls();render();toast(keepSpecies?'같은 종족에서 체형과 장식을 다시 뽑았어요':'종족부터 전부 새로 뽑았어요');
}
function nameFor(model){
  const first=['루','미','모','하','코','라','별','소','나','리','토','유','포','누','키','아'];
  const last=['미','루','링','몽','콩','비','니','아','엘','온','푸','리','코','쥬','핀','별'];
  const q=hash(model.seed+model.species*997);
  return first[q%first.length]+last[(q>>>7)%last.length];
}
function syncControls(){
  $('#name').value=state.name;$('#seed').value=state.seed;
  ['eyes','face','wings','accessory','element','rarity'].forEach(key=>$('#'+key).value=state[key]);
}
function render(){
  syncControls();
  $$('[data-species]').forEach((node,index)=>node.classList.toggle('on',index===state.species));
  $$('[data-palette]').forEach((node,index)=>node.classList.toggle('on',index===state.palette));
  const palette=PALETTES[state.palette], element=OPTIONS.element.find(x=>x[0]===state.element), species=SPECIES[state.species];
  $('#mascot').innerHTML=characterSvg(state);
  $('#hcard').style.setProperty('--c1',palette.c1);$('#hcard').style.setProperty('--c2',palette.c3);
  $('#serial').textContent=`BT-${String(state.seed).padStart(6,'0')}`;
  $('#rarityTag').textContent=state.rarity;$('#speciesTag').textContent=species.label;$('#cardName').textContent=state.name;
  $('#cardSub').textContent=`${element[1]} · ${optionLabel('face',state.face)} · ${species.shape}`;$('#elementIcon').textContent=element[2];
}
function defs(model,p,id){
  return `<defs>
  <linearGradient id="body-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".23" stop-color="${p.c2}"/><stop offset=".68" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c3}"/></linearGradient>
  <linearGradient id="accent-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.c3}"/><stop offset=".5" stop-color="${p.c1}"/><stop offset="1" stop-color="#fff275"/></linearGradient>
  <linearGradient id="holo-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.c1}"/><stop offset=".23" stop-color="#fff"/><stop offset=".5" stop-color="${p.c3}"/><stop offset=".74" stop-color="#fff275"/><stop offset="1" stop-color="#72ffc0"/></linearGradient>
  <radialGradient id="eye-${id}" cx="35%" cy="25%"><stop stop-color="#fff"/><stop offset=".18" stop-color="${p.c1}"/><stop offset=".62" stop-color="${p.c3}"/><stop offset="1" stop-color="#17142c"/></radialGradient>
  <filter id="shadow-${id}" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="22" stdDeviation="16" flood-color="#03040c" flood-opacity=".55"/></filter>
  <filter id="glow-${id}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}
function eye(model,id,cx,cy,rx=47,ry=59,tilt=0){
  if(model.eyes==='happy')return `<path d="M${cx-rx*.72} ${cy+4}q${rx*.72}-${ry*.65} ${rx*1.44} 0" fill="none" stroke="#19162b" stroke-width="15" stroke-linecap="round" transform="rotate(${tilt} ${cx} ${cy})"/>`;
  if(model.eyes==='sleepy')return `<path d="M${cx-rx*.78} ${cy}q${rx*.78} ${ry*.35} ${rx*1.56} 0" fill="none" stroke="#19162b" stroke-width="14" stroke-linecap="round" transform="rotate(${tilt} ${cx} ${cy})"/>`;
  const spark=model.eyes==='galaxy'?`<path d="M${cx} ${cy+3}l6 12 14 2-10 9 2 14-12-7-12 7 2-14-10-9 14-2z" fill="#fff" opacity=".92"/>`:model.eyes==='spark'?`<path d="M${cx+4} ${cy+7}l7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fff275"/>`:'';
  return `<g transform="rotate(${tilt} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#17142b"/><ellipse cx="${cx}" cy="${cy+5}" rx="${rx*.72}" ry="${ry*.76}" fill="url(#eye-${id})"/><ellipse cx="${cx-rx*.32}" cy="${cy-ry*.36}" rx="${rx*.25}" ry="${ry*.22}" fill="#fff"/><circle cx="${cx+rx*.28}" cy="${cy+ry*.32}" r="${Math.max(5,rx*.12)}" fill="#fff"/>${spark}</g>`;
}
function mouth(model,cx,cy,scale=1){
  if(model.face==='tiny')return `<path d="M${cx-19*scale} ${cy}q${19*scale} ${15*scale} ${38*scale} 0" fill="none" stroke="#54233c" stroke-width="${8*scale}" stroke-linecap="round"/>`;
  if(model.face==='cool')return `<path d="M${cx-32*scale} ${cy}q${32*scale} ${10*scale} ${64*scale} 0" fill="none" stroke="#54233c" stroke-width="${8*scale}" stroke-linecap="round"/>`;
  if(model.face==='shy')return `<ellipse cx="${cx}" cy="${cy+4*scale}" rx="${17*scale}" ry="${12*scale}" fill="#7f2e4c"/>`;
  return `<path d="M${cx-39*scale} ${cy-5*scale}q${39*scale} ${62*scale} ${78*scale} 0q-${39*scale} ${22*scale}-${78*scale} 0" fill="#8d2949"/><ellipse cx="${cx}" cy="${cy+30*scale}" rx="${24*scale}" ry="${13*scale}" fill="#ff839f"/>${model.face==='play'?`<path d="M${cx-4*scale} ${cy+10*scale}l${12*scale}-${14*scale} ${9*scale} ${17*scale}" fill="#fff"/>`:''}`;
}
function blush(cx,cy,scale=1){return `<ellipse cx="${cx}" cy="${cy}" rx="${35*scale}" ry="${15*scale}" fill="#ff7f9f" opacity=".62"/>`}
function wing(model,id,p,x=400,y=530,scale=1,spread=1){
  if(model.wings==='none')return '';
  if(model.wings==='cloud')return `<g opacity=".95" transform="translate(${x} ${y}) scale(${scale})"><g transform="translate(${-155*spread} 0)"><circle cx="0" cy="0" r="36" fill="#fff"/><circle cx="-30" cy="25" r="29" fill="#fff"/><circle cx="30" cy="25" r="30" fill="#fff"/></g><g transform="translate(${155*spread} 0)"><circle cx="0" cy="0" r="36" fill="#fff"/><circle cx="-30" cy="25" r="29" fill="#fff"/><circle cx="30" cy="25" r="30" fill="#fff"/></g></g>`;
  if(model.wings==='mini')return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-80 5q-86-45-70 43q40-19 69 17" fill="${p.c3}" opacity=".9"/><path d="M80 5q86-45 70 43q-40-19-69 17" fill="${p.c3}" opacity=".9"/></g>`;
  const left=model.wings==='fairy'
    ? 'M -55 25 C -105 -105 -198 -92 -194 40 C -145 18 -102 61 -82 105 C -78 63 -68 38 -55 25 Z'
    : 'M -55 25 C -126 -78 -230 -60 -211 75 C -158 42 -105 82 -77 129 C -84 72 -69 41 -55 25 Z';
  const right=model.wings==='fairy'
    ? 'M 55 25 C 105 -105 198 -92 194 40 C 145 18 102 61 82 105 C 78 63 68 38 55 25 Z'
    : 'M 55 25 C 126 -78 230 -60 211 75 C 158 42 105 82 77 129 C 84 72 69 41 55 25 Z';
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity=".9"><path d="${left}" fill="url(#holo-${id})" stroke="#fff" stroke-width="7"/><path d="${right}" fill="url(#holo-${id})" stroke="#fff" stroke-width="7"/></g>`;
}
function accessory(model,id,p,x=400,y=540,scale=1){
  const a=model.accessory;if(a==='none')return '';
  if(a==='crown')return `<path d="M${x-58*scale} ${y}l${24*scale}-${55*scale} ${27*scale} ${39*scale} ${35*scale}-${47*scale} ${23*scale} ${59*scale}z" fill="#fff275" stroke="#fff" stroke-width="${7*scale}"/>`;
  if(a==='bag')return `<g transform="translate(${x} ${y}) scale(${scale})"><rect x="0" y="0" width="78" height="70" rx="18" fill="${p.c3}" stroke="#fff" stroke-width="7"/><path d="M15 4q23-42 47 0" fill="none" stroke="#fff" stroke-width="7"/></g>`;
  if(a==='orb')return `<circle cx="${x}" cy="${y}" r="${34*scale}" fill="url(#holo-${id})" stroke="#fff" stroke-width="${7*scale}" filter="url(#glow-${id})"/>`;
  if(a==='scarf')return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-75 0q75 40 150 0l-15 49q-60 30-120 0z" fill="${p.c3}" stroke="#fff" stroke-width="5"/><path d="M48 31l72 62-49 18-43-68" fill="${p.c3}"/></g>`;
  const icon=a==='bell'?'●':'★';
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-65-20q65 32 130 0" fill="none" stroke="${p.dark}" stroke-width="21" stroke-linecap="round"/><text x="0" y="31" text-anchor="middle" font-size="58" fill="${a==='bell'?'#fff275':`url(#holo-${id})`}" stroke="#fff" stroke-width="4">${icon}</text></g>`;
}
function shine(path){return `<path d="${path}" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".34"/>`}
function fox(model,id,p){return `${wing(model,id,p,397,535,.95)}<path d="M546 522q164-82 159 74q-4 120-142 111q67-56-24-99z" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M628 680q62-25 77-84q0 109-123 111z" fill="${p.c2}" opacity=".92"/><path d="M242 286Q205 120 350 226Z" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M558 286Q595 120 450 226Z" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M265 242Q252 170 320 218Z" fill="${p.c3}" opacity=".8"/><path d="M535 242Q548 170 480 218Z" fill="${p.c3}" opacity=".8"/><path d="M279 544q-20 125 43 165h156q62-43 42-165q-17-102-120-105q-104 3-121 105z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M202 353q9-148 198-157q189 9 198 157q4 137-90 183q-108 54-216 0q-94-46-90-183z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><path d="M204 399q-53 32-70 95q68-5 105 48M596 399q53 32 70 95q-68-5-105 48" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/>${eye(model,id,318,358,49,62,-5)}${eye(model,id,482,358,49,62,5)}<ellipse cx="400" cy="430" rx="14" ry="10" fill="#2e2436"/>${mouth(model,400,448,.9)}${blush(254,438,.95)}${blush(546,438,.95)}<path d="M286 565q-90 18-76 106q14 50 71 11q-17-41 36-61M514 565q90 18 76 106q-14 50-71 11q17-41-36-61" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="337" cy="700" rx="73" ry="46" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="463" cy="700" rx="73" ry="46" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M267 318q38-75 113-87')}${accessory(model,id,p,400,548,.95)}`}
function cat(model,id,p){return `${wing(model,id,p,400,550,.86)}<path d="M244 306l-32-133 129 72M556 306l32-133-129 72" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M242 265l-13-57 73 42M558 265l13-57-73 42" fill="${p.c3}" opacity=".78"/><path d="M267 521q-79 97-18 185h302q61-88-18-185q-43-70-133-70q-90 0-133 70z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M542 570q120-111 166-9q40 91-69 126q66-79-32-82" fill="none" stroke="url(#body-${id})" stroke-width="54" stroke-linecap="round"/><ellipse cx="400" cy="350" rx="202" ry="166" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><path d="M237 361l-62 27 67 13M563 361l62 27-67 13" fill="none" stroke="#fff" stroke-width="6" opacity=".8"/>${eye(model,id,323,355,46,58,0)}${eye(model,id,477,355,46,58,0)}<path d="M388 426l12 8 12-8-12 15z" fill="#2f2436"/>${mouth(model,400,447,.75)}${blush(265,427,.8)}${blush(535,427,.8)}<path d="M333 565q67 41 134 0" fill="none" stroke="${p.dark}" stroke-width="20" stroke-linecap="round"/><ellipse cx="351" cy="635" rx="51" ry="64" fill="url(#body-${id})" stroke="#fff" stroke-width="7"/><ellipse cx="449" cy="635" rx="51" ry="64" fill="url(#body-${id})" stroke="#fff" stroke-width="7"/><ellipse cx="324" cy="704" rx="78" ry="43" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="476" cy="704" rx="78" ry="43" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M270 306q48-78 126-91')}${accessory(model,id,p,400,545,.86)}`}
function rabbit(model,id,p){return `${wing(model,id,p,400,570,.8)}<ellipse cx="287" cy="181" rx="42" ry="126" fill="url(#body-${id})" stroke="#fff" stroke-width="9" transform="rotate(-12 287 181)"/><ellipse cx="513" cy="181" rx="42" ry="126" fill="url(#body-${id})" stroke="#fff" stroke-width="9" transform="rotate(12 513 181)"/><ellipse cx="289" cy="180" rx="18" ry="88" fill="${p.c3}" opacity=".72" transform="rotate(-12 289 180)"/><ellipse cx="511" cy="180" rx="18" ry="88" fill="${p.c3}" opacity=".72" transform="rotate(12 511 180)"/><circle cx="602" cy="606" r="48" fill="#fff" opacity=".94"/><ellipse cx="400" cy="573" rx="172" ry="139" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><ellipse cx="400" cy="350" rx="192" ry="164" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/>${eye(model,id,326,355,45,58,-2)}${eye(model,id,474,355,45,58,2)}<path d="M389 423l11 8 11-8-11 16z" fill="#34243b"/>${mouth(model,400,447,.75)}${blush(270,430,.82)}${blush(530,430,.82)}<path d="M310 550q-93 38-70 124q17 48 72 5q-14-42 45-63M490 550q93 38 70 124q-17 48-72 5q14-42-45-63" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="318" cy="698" rx="105" ry="48" fill="url(#body-${id})" stroke="#fff" stroke-width="8" transform="rotate(-7 318 698)"/><ellipse cx="482" cy="698" rx="105" ry="48" fill="url(#body-${id})" stroke="#fff" stroke-width="8" transform="rotate(7 482 698)"/>${shine('M266 318q54-64 121-78')}${accessory(model,id,p,400,538,.88)}`}
function otter(model,id,p){return `${wing(model,id,p,400,535,.7)}<path d="M549 599q155 7 130 112q-20 79-101 31q59-60-54-74z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><ellipse cx="400" cy="574" rx="211" ry="127" fill="url(#body-${id})" stroke="#fff" stroke-width="10" transform="rotate(-4 400 574)"/><circle cx="269" cy="272" r="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><circle cx="531" cy="272" r="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="400" cy="365" rx="193" ry="157" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="425" rx="119" ry="87" fill="${p.c2}" opacity=".94"/>${eye(model,id,326,356,43,54,0)}${eye(model,id,474,356,43,54,0)}<ellipse cx="400" cy="414" rx="17" ry="12" fill="#2f2538"/>${mouth(model,400,442,.66)}${blush(270,422,.75)}${blush(530,422,.75)}<path d="M306 529q30 81 94 67q64 14 94-67" fill="none" stroke="url(#body-${id})" stroke-width="54" stroke-linecap="round"/><circle cx="400" cy="563" r="51" fill="url(#holo-${id})" stroke="#fff" stroke-width="8" filter="url(#glow-${id})"/><ellipse cx="294" cy="680" rx="77" ry="41" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="476" cy="692" rx="77" ry="41" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M274 331q52-68 119-73')}${accessory(model,id,p,400,498,.78)}`}
function dragon(model,id,p){return `${wing(model,id,p,400,490,1.08)}<path d="M570 565q163 43 85 164l-38-45-60 27q59-77-32-91z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M292 263l-45-117 102 80M508 263l45-117-102 80" fill="url(#accent-${id})" stroke="#fff" stroke-width="8"/><path d="M372 201l28-82 28 82" fill="url(#accent-${id})" stroke="#fff" stroke-width="8"/><path d="M275 531q-31 129 47 177h156q78-48 47-177q-23-91-125-95q-102 4-125 95z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="344" rx="191" ry="151" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="417" rx="130" ry="84" fill="${p.c2}" opacity=".92"/><path d="M321 270l-38-24 14 47M479 270l38-24-14 47" fill="url(#accent-${id})" stroke="#fff" stroke-width="6"/>${eye(model,id,324,348,46,57,-4)}${eye(model,id,476,348,46,57,4)}<ellipse cx="380" cy="413" rx="7" ry="9" fill="#39283c"/><ellipse cx="420" cy="413" rx="7" ry="9" fill="#39283c"/>${mouth(model,400,448,.75)}${blush(270,424,.74)}${blush(530,424,.74)}<path d="M302 555q-96 19-80 111q15 52 72 7q-15-42 43-61M498 555q96 19 80 111q-15 52-72 7q15-42-43-61" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="336" cy="704" rx="77" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="464" cy="704" rx="77" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M400 500l-20 36 20 36 20-36z" fill="url(#accent-${id})"/>${shine('M265 318q58-66 124-70')}${accessory(model,id,p,400,520,.84)}`}
function bear(model,id,p){return `${wing(model,id,p,400,550,.78)}<circle cx="264" cy="259" r="66" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><circle cx="536" cy="259" r="66" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><circle cx="264" cy="259" r="32" fill="${p.c3}" opacity=".65"/><circle cx="536" cy="259" r="32" fill="${p.c3}" opacity=".65"/><ellipse cx="400" cy="565" rx="188" ry="166" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="590" rx="116" ry="111" fill="${p.c2}" opacity=".82"/><circle cx="400" cy="363" r="190" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="426" rx="111" ry="82" fill="${p.c2}" opacity=".92"/>${eye(model,id,327,356,43,54,0)}${eye(model,id,473,356,43,54,0)}<ellipse cx="400" cy="414" rx="18" ry="13" fill="#33263b"/>${mouth(model,400,445,.65)}${blush(274,424,.78)}${blush(526,424,.78)}<ellipse cx="235" cy="582" rx="61" ry="91" fill="url(#body-${id})" stroke="#fff" stroke-width="8" transform="rotate(18 235 582)"/><ellipse cx="565" cy="582" rx="61" ry="91" fill="url(#body-${id})" stroke="#fff" stroke-width="8" transform="rotate(-18 565 582)"/><ellipse cx="306" cy="699" rx="92" ry="50" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="494" cy="699" rx="92" ry="50" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M276 309q57-63 118-74')}${accessory(model,id,p,400,523,.9)}`}
function dog(model,id,p){return `${wing(model,id,p,400,552,.8)}<path d="M254 281q-103-38-83 97q18 76 94 31l55-81z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M546 281q103-38 83 97q-18 76-94 31l-55-81z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M542 581q120-23 126 65q5 76-82 73" fill="none" stroke="url(#body-${id})" stroke-width="44" stroke-linecap="round"/><path d="M282 533q-27 129 44 175h148q71-46 44-175q-17-89-118-94q-101 5-118 94z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="361" rx="195" ry="169" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="433" rx="121" ry="88" fill="${p.c2}" opacity=".93"/>${eye(model,id,324,357,46,58,-3)}${eye(model,id,476,357,46,58,3)}<ellipse cx="400" cy="420" rx="18" ry="13" fill="#302438"/>${mouth(model,400,451,.73)}${model.face==='play'?'<path d="M382 471q18 61 36 0" fill="#ff7699"/>':''}${blush(269,432,.8)}${blush(531,432,.8)}<path d="M302 558q-92 13-79 103q13 52 70 10q-13-43 43-60M498 558q92 13 79 103q-13 52-70 10q13-43-43-60" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="335" cy="703" rx="76" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="465" cy="703" rx="76" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M270 316q55-67 123-77')}${accessory(model,id,p,400,535,.9)}`}
function raccoon(model,id,p){return `${wing(model,id,p,400,548,.8)}<path d="M537 522q149-76 169 50q18 111-117 137" fill="none" stroke="url(#body-${id})" stroke-width="73" stroke-linecap="round"/><path d="M596 535l30 56M635 586l17 57M655 643l-30 44" stroke="${p.dark}" stroke-width="29" stroke-linecap="round" opacity=".8"/><path d="M252 293l-18-118 112 69M548 293l18-118-112 69" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M282 536q-26 127 44 172h148q70-45 44-172q-18-94-118-96q-100 2-118 96z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="356" rx="197" ry="165" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><path d="M245 334q70-76 142-12q-58 126-151 72M555 334q-70-76-142-12q58 126 151 72" fill="${p.dark}" opacity=".78"/>${eye(model,id,323,356,45,56,-8)}${eye(model,id,477,356,45,56,8)}<ellipse cx="400" cy="425" rx="15" ry="11" fill="#302438"/>${mouth(model,400,449,.72)}${blush(261,432,.72)}${blush(539,432,.72)}<path d="M303 560q-91 19-76 108q14 51 70 9q-14-43 42-62M497 560q91 19 76 108q-14 51-70 9q14-43-42-62" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="336" cy="703" rx="77" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="464" cy="703" rx="77" ry="45" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M273 310q56-66 119-72')}${accessory(model,id,p,400,536,.88)}`}
function penguin(model,id,p){return `${wing(model,id,p,400,548,.7)}<ellipse cx="400" cy="497" rx="209" ry="235" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><path d="M400 279q-139 0-149 151q-5 127 149 214q154-87 149-214q-10-151-149-151z" fill="${p.dark}" opacity=".94"/><path d="M400 317q-103 0-111 115q-4 95 111 161q115-66 111-161q-8-115-111-115z" fill="${p.c2}"/><path d="M252 458q-104 35-94 136q9 68 73 8l74-75M548 458q104 35 94 136q-9 68-73 8l-74-75" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${eye(model,id,337,399,39,49,0)}${eye(model,id,463,399,39,49,0)}<path d="M373 463l27-20 27 20-27 19z" fill="#ffb447" stroke="#fff" stroke-width="5"/>${mouth(model,400,490,.48)}${blush(294,478,.62)}${blush(506,478,.62)}<path d="M273 700q67-90 134 0q-67 35-134 0M393 700q67-90 134 0q-67 35-134 0" fill="#ffbd52" stroke="#fff" stroke-width="7"/>${shine('M286 330q57-61 111-62')}${accessory(model,id,p,400,563,.78)}`}
function frog(model,id,p){return `${wing(model,id,p,400,555,.7)}<ellipse cx="400" cy="573" rx="215" ry="142" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><circle cx="292" cy="277" r="82" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><circle cx="508" cy="277" r="82" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><ellipse cx="400" cy="397" rx="220" ry="171" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/>${eye(model,id,292,277,45,54,0)}${eye(model,id,508,277,45,54,0)}<path d="M301 427q99 59 198 0" fill="none" stroke="#462844" stroke-width="11" stroke-linecap="round"/>${model.face==='smile'||model.face==='play'?'<path d="M357 446q43 55 86 0" fill="#8d2949"/><ellipse cx="400" cy="475" rx="26" ry="12" fill="#ff839f"/>':mouth(model,400,449,.75)}${blush(244,430,.72)}${blush(556,430,.72)}<path d="M282 538q-127-5-142 88q-12 74 85 55l111-68M518 538q127-5 142 88q12 74-85 55l-111-68" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><path d="M286 607q-152 70-115 119q31 41 174-38M514 607q152 70 115 119q-31 41-174-38" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><circle cx="236" cy="688" r="12" fill="${p.c3}"/><circle cx="564" cy="688" r="12" fill="${p.c3}"/>${shine('M238 371q48-72 122-91')}${accessory(model,id,p,400,537,.82)}`}
function axolotl(model,id,p){return `${wing(model,id,p,400,550,.62)}<path d="M224 296l-86-81 29 89-65-10 100 76M576 296l86-81-29 89 65-10-100 76" fill="none" stroke="url(#accent-${id})" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/><path d="M522 542q190 5 151 137q-26 87-127 43q78-67-45-94z" fill="url(#body-${id})" stroke="#fff" stroke-width="9"/><ellipse cx="405" cy="573" rx="210" ry="105" fill="url(#body-${id})" stroke="#fff" stroke-width="10" transform="rotate(4 405 573)"/><rect x="204" y="245" width="392" height="254" rx="126" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/>${eye(model,id,324,349,43,54,0)}${eye(model,id,476,349,43,54,0)}${mouth(model,400,429,.68)}${blush(264,414,.72)}${blush(536,414,.72)}<path d="M301 532q-82 22-70 82q11 48 76 13M499 532q82 22 70 82q-11 48-76 13M316 628q-75 17-66 73q7 42 70 12M484 628q75 17 66 73q-7 42-70 12" fill="url(#body-${id})" stroke="#fff" stroke-width="8" stroke-linecap="round"/>${shine('M259 308q58-50 123-53')}${accessory(model,id,p,400,504,.78)}`}
function squirrel(model,id,p){return `${wing(model,id,p,365,550,.72)}<path d="M532 520q125-166 207-63q76 96-31 198q-68 66-156 25q105-59 39-126z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><path d="M586 518q72-79 113-25q39 52-27 113q-44 40-94 23" fill="none" stroke="${p.c3}" stroke-width="27" stroke-linecap="round"/><path d="M252 291l-14-113 106 65M548 291l14-113-106 65" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><path d="M292 535q-24 123 39 173h138q63-50 39-173q-17-86-108-91q-91 5-108 91z" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/><ellipse cx="400" cy="354" rx="190" ry="161" fill="url(#body-${id})" stroke="#fff" stroke-width="10"/>${eye(model,id,326,355,43,55,-2)}${eye(model,id,474,355,43,55,2)}<ellipse cx="400" cy="424" rx="14" ry="10" fill="#2f2437"/>${mouth(model,400,448,.7)}${blush(270,429,.75)}${blush(530,429,.75)}<path d="M317 546q27 83 83 58q56 25 83-58" fill="none" stroke="url(#body-${id})" stroke-width="46" stroke-linecap="round"/><path d="M400 532q45 0 52 50q4 46-52 82q-56-36-52-82q7-50 52-50z" fill="#a96b35" stroke="#fff" stroke-width="7"/><path d="M360 557q40-45 80 0" fill="${p.dark}"/><ellipse cx="338" cy="703" rx="76" ry="44" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/><ellipse cx="462" cy="703" rx="76" ry="44" fill="url(#body-${id})" stroke="#fff" stroke-width="8"/>${shine('M270 311q57-64 119-71')}${accessory(model,id,p,400,510,.75)}`}
const RENDERERS={fox,cat,rabbit,otter,dragon,bear,dog,raccoon,penguin,frog,axolotl,squirrel};
function sparkles(model,id){
  const q=hash(model.seed*31+model.species*17);
  return Array.from({length:8},(_,index)=>{const x=105+hash(q+index*13)%590,y=115+hash(q+index*29)%525,r=3+hash(q+index*41)%7;return `<g opacity="${.45+(hash(q+index*5)%45)/100}"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><path d="M${x-r*2} ${y}h${r*4}M${x} ${y-r*2}v${r*4}" stroke="#fff" stroke-width="2"/></g>`}).join('');
}
function characterSvg(model=state){
  const species=SPECIES[model.species]||SPECIES[0],p=PALETTES[model.palette]||PALETTES[0];
  const id=`${model.seed}-${model.species}-${model.palette}`.replace(/[^a-zA-Z0-9-]/g,'');
  const renderer=RENDERERS[species.id]||fox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${esc(model.name)} ${species.label}" data-version="${VERSION}">${defs(model,p,id)}<ellipse cx="400" cy="735" rx="238" ry="31" fill="#03040b" opacity=".3"/>${sparkles(model,id)}<g filter="url(#shadow-${id})">${renderer(model,id,p)}</g></svg>`;
}
function saveCharacter(){const saved=loadSaved();saved.unshift({...state,id:Date.now(),version:VERSION});safeSet(JSON.stringify(saved.slice(0,24)));renderSaved();toast('서로 다른 실루엣으로 보관했어요')}
function loadSaved(){try{return JSON.parse(safeGet())}catch{return[]}}
function renderSaved(){
  const saved=loadSaved();
  $('#saved').innerHTML=saved.length?saved.map(item=>`<article class="savedcard" data-load="${item.id}">${characterSvg({...state,...item})}<strong>${esc(item.name)} · ${(SPECIES[item.species]||SPECIES[0]).label}</strong><button data-del="${item.id}" aria-label="삭제">×</button></article>`).join(''):`<div class="empty">아직 보관한 캐릭터가 없습니다.<br>종족 버튼을 바꿔 보면 실루엣부터 완전히 달라집니다.</div>`;
  $$('[data-load]').forEach(node=>node.onclick=event=>{if(event.target.closest('[data-del]'))return;const item=loadSaved().find(x=>String(x.id)===node.dataset.load);if(item){state={...state,...item};delete state.id;render();scrollTo({top:$('#creator').offsetTop-65,behavior:'smooth'})}});
  $$('[data-del]').forEach(node=>node.onclick=event=>{event.stopPropagation();safeSet(JSON.stringify(loadSaved().filter(x=>String(x.id)!==node.dataset.del)));renderSaved()});
}
function download(name,blob){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
function saveSvg(){download(`${state.name}-${state.seed}.svg`,new Blob([characterSvg(state)],{type:'image/svg+xml'}));toast('SVG를 저장했어요')}
function savePng(){const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,1024);ctx.drawImage(image,0,0,1024,1024);canvas.toBlob(blob=>blob&&download(`${state.name}-${state.seed}.png`,blob),'image/png')};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(characterSvg(state));toast('PNG를 준비하고 있어요')}
async function copyRecipe(){const recipe=JSON.stringify({...state,version:VERSION,speciesId:SPECIES[state.species].id,speciesName:SPECIES[state.species].label,silhouette:SPECIES[state.species].shape,paletteName:PALETTES[state.palette].name},null,2);try{await navigator.clipboard.writeText(recipe);toast('캐릭터 설계도를 복사했어요')}catch{prompt('설계도 복사',recipe)}}
function tilt(element){
  const move=event=>{const point=event.touches?event.touches[0]:event,rect=element.getBoundingClientRect(),x=(point.clientX-rect.left)/rect.width,y=(point.clientY-rect.top)/rect.height;element.style.setProperty('--ry',`${(x-.5)*18}deg`);element.style.setProperty('--rx',`${(.5-y)*18}deg`);element.style.setProperty('--gx',`${x*100}%`);element.style.setProperty('--gy',`${y*100}%`)};
  const start=event=>{element.classList.add('active');move(event)},end=()=>{element.classList.remove('active');element.style.setProperty('--rx','0deg');element.style.setProperty('--ry','0deg')};
  element.addEventListener('pointermove',move);element.addEventListener('pointerleave',end);element.addEventListener('touchstart',start,{passive:true});element.addEventListener('touchmove',move,{passive:true});element.addEventListener('touchend',end);
}
let toastTimer;function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('on'),1900)}
init();
})();
