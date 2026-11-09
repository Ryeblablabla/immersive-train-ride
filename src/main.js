import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { createUI } from './ui.js';
import { makeMaterials } from './materials.js';
import { createTrain } from './train.js';
import { createScenery } from './scenery.js';
import { Journey, ROUTE_LENGTH, routeYaw, suspension, clamp } from './journey.js';
import { RailAudio } from './audio.js';
import { createSky } from './sky.js';
import {loadElevation} from './landscape.js';
import { createFilm } from './film.js';
import './style.css';

const ui=createUI(),$=ui.$;
const diagnostics={errors:[],assetErrors:[],frames:0,fps:0,ready:false};
window.addEventListener('error',e=>diagnostics.errors.push(e.message));
window.addEventListener('unhandledrejection',e=>diagnostics.errors.push(String(e.reason)));
const preferences={volume:.65,sway:matchMedia('(prefers-reduced-motion: reduce)').matches?0:.6,rain:false,quality:'high',pace:1};
try{Object.assign(preferences,JSON.parse(localStorage.getItem('hours-between-settings')||'{}'));}catch{}
const save=()=>{try{localStorage.setItem('hours-between-settings',JSON.stringify(preferences));}catch{}};
const journey=new Journey(),audio=new RailAudio();
let renderer,scene,camera,composer,train,scenery,m,environment,hemi,sun,bloom,grade,sky,ssao;
let ready=false,started=false,paused=false,modal=null,inside=false,seated=null,leaning=false,windowOpen=false,hudHidden=false;
let player=new THREE.Vector3(-4.7,1.66,10.5),velocity=new THREE.Vector3(),yaw=-Math.PI/2,pitch=-.02;
let lookYaw=yaw,lookPitch=pitch,transition=null,interaction=null,clockTime=0,simulationTime=0,previewS=5700;
let stepDistance=0,lastPhase='',lastLandmark=-1,completedTime=0,dragging=false,dragX=0,dragY=0,photoPending=false;
let windowKey=null,lookInputReadyAt=0;
let frameTime=0,frameCount=0,fpsTime=0,lastUi=0;
let film;
const keys=new Set(),Y=new THREE.Vector3(0,1,0);
const npcLines=[['你也去白鹭湾吗？听说那边的湖，傍晚最好看。','我以前总嫌这趟车慢。后来才发现，能慢慢坐一会儿的机会并不多。','你看，河对岸的杉树。'],['每次过这座桥，我都会把书合上。','有时候，记住一趟旅行的，是窗外很小的一件事。','快到了。祝你接下来的路，一切都好。']];
const npcIndex=[0,0];

function fatal(error){console.error(error);document.querySelector('#app').insertAdjacentHTML('beforeend',`<div id="fatal"><div><h2>旅程暂时未能启动</h2><p>请使用项目里的“启动旅程.cmd”打开，<br>并确认浏览器已启用硬件加速。</p><code></code><p><button onclick="location.reload()">重新加载</button></p></div></div>`);$('fatal').querySelector('code').textContent=String(error.message||error);}
function releaseMouse(){if(document.pointerLockElement)document.exitPointerLock();keys.clear();dragging=false;}
function lockMouse(){if(!started||modal)return;try{const request=$('world').requestPointerLock?.();request?.catch(()=>{});}catch{}}
function setLook(y,p=0){yaw=y;pitch=p;lookYaw=y;lookPitch=p;lookInputReadyAt=performance.now()+300;}
function moveTo(position,duration=.9,callback){transition={from:player.clone(),to:position.clone(),duration,elapsed:0,callback};velocity.set(0,0,0);}
function subtitle(text,time){ui.subtitle(text,time);}
function openModal(name){modal=name;paused=started;releaseMouse();$(name).classList.remove('hidden');if(name==='journal')$('journal-note').textContent=journey.landmark.note;}
function closeModal(){if(modal)$(modal).classList.add('hidden');modal=null;paused=false;$('world').focus();}

function setQuality(){
  const scale={medium:.85,high:1.25,ultra:1.75}[preferences.quality]||1.25;
  renderer.setPixelRatio(Math.min(devicePixelRatio,scale));renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(Math.min(devicePixelRatio,scale));composer.setSize(innerWidth,innerHeight);
  bloom.enabled=preferences.quality!=='medium';
  if(ssao){ssao.enabled=preferences.quality!=='medium';ssao.setSize(Math.round(innerWidth*.65),Math.round(innerHeight*.65));}
  const shadowSize=preferences.quality==='ultra'?4096:2048;
  if(sun.shadow.mapSize.x!==shadowSize){sun.shadow.mapSize.set(shadowSize,shadowSize);sun.shadow.map?.dispose();sun.shadow.map=null;}
}

async function initialize(){
  THREE.DefaultLoadingManager.onProgress=(url,loaded,total)=>{if(!ready)ui.loading(loaded,total,url);};
  THREE.DefaultLoadingManager.onError=url=>diagnostics.assetErrors.push(url);
  renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.info.autoReset=false;
  scene=new THREE.Scene();scene.background=new THREE.Color('#a3b2ac');scene.fog=new THREE.FogExp2('#a3b2ac',.00115);
  camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.055,11000);camera.rotation.order='YXZ';
  hemi=new THREE.HemisphereLight('#c6d7de','#625f40',1.12);scene.add(hemi);
  sun=new THREE.DirectionalLight('#ffd2a0',3.3);sun.position.set(65,17,-28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.camera.near=.1;sun.shadow.camera.far=140;sun.shadow.normalBias=.025;sun.shadow.bias=-.00008;sun.shadow.radius=3;sun.target.position.set(0,.7,0);scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#a7c3c8',.28);fill.position.set(-20,8,30);scene.add(fill);
  const gltf=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const names=['suitcase','kettle','bench','cliff-a','cliff-b','shore','cliff-a-lod','cliff-b-lod','shore-lod','rock-face','moss-rocks','tree','tree-lod','tree-b','tree-b-lod','flowers','ferns','fir','fir-lod','mountainside','mountainside-lod','granite','granite-lod'];const assets=await Promise.all(names.map(async name=>[name,(await gltf.loadAsync(`/assets/models/${name}.glb?v=landscape-4`)).scene]));const models=Object.fromEntries(assets);
  const sharedMaterials=new Map();for(const model of Object.values(models))model.traverse(o=>{if(o.isMesh){const name=o.material.name;if(name&&sharedMaterials.has(name)){const old=o.material;o.material=sharedMaterials.get(name);for(const slot of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(old[slot]&&old[slot]!==o.material[slot])old[slot].dispose();old.dispose();}else if(name)sharedMaterials.set(name,o.material);}});
  for(const kind of ['fir','fir-lod'])models[kind].children.forEach((tree,i)=>models['fir-'+i+(kind.endsWith('-lod')?'-lod':'')]=tree);
  environment=await new HDRLoader().loadAsync('/assets/sky/sunset.hdr');environment.mapping=THREE.EquirectangularReflectionMapping;
  scene.environment=environment;scene.environmentIntensity=.36;scene.background=new THREE.Color('#8cacae');scene.environmentRotation.y=1.3;sky=createSky(scene,environment);
  await loadElevation();
  const waterNormals=await new THREE.TextureLoader().loadAsync('/assets/textures/waternormals.jpg');waterNormals.wrapS=waterNormals.wrapT=THREE.RepeatWrapping;
  models.tree.traverse(o=>{if(o.isMesh){o.material.envMapIntensity=.6;}});models['tree-b'].traverse(o=>{if(o.isMesh){o.material.envMapIntensity=.6;}});
  const forestTexture=await new THREE.TextureLoader().loadAsync('/assets/vegetation/forest-atlas.png?v=2');forestTexture.colorSpace=THREE.SRGBColorSpace;forestTexture.anisotropy=8;
  const forestAtlas={texture:forestTexture};
  m=makeMaterials();train=createTrain(scene,m,models);scenery=createScenery(scene,m,models,waterNormals,forestAtlas);
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  ssao=new SSAOPass(scene,camera,innerWidth*.65,innerHeight*.65,12);ssao.kernelRadius=.26;ssao.minDistance=.001;ssao.maxDistance=.16;composer.addPass(ssao);
  bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.20,.55,1.35);composer.addPass(bloom);
  grade=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},night:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float night;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec2 q=vUv-.5;vec3 c=texture2D(tDiffuse,vUv).rgb;float vignette=1.-dot(q*vec2(.95,1.),q*vec2(.95,1.))*.46;c*=vignette;c=mix(c,c*vec3(.91,1.01,1.07),night*.27);float grain=(hash(gl_FragCoord.xy+fract(time)*91.)-.5)*.007;c+=grain;gl_FragColor=vec4(c,1.);}`});composer.addPass(grade);composer.addPass(new OutputPass());
  setQuality();
  if(new URLSearchParams(location.search).has('film'))film=createFilm({renderer,audio,begin,ready:()=>ready,onEnter(shot){
    paused=false;modal=null;inside=shot.inside!==false;seated=null;leaning=false;transition=null;velocity.set(0,0,0);
    journey.distance=shot.distance;journey.speed=shot.speed??18;journey.acceleration=0;journey.phase=shot.phase||'running';
    preferences.rain=!!shot.rain;windowOpen=!!shot.open;windowKey=windowOpen?'2-1':null;lastPhase=journey.phase;lastLandmark=journey.landmark.at;
    hudHidden=true;$('hud').classList.remove('visible');releaseMouse();
  },onPose(position,target){
    player.fromArray(position);const d=new THREE.Vector3(...target).sub(player);setLook(Math.atan2(-d.x,-d.z),Math.atan2(d.y,Math.hypot(d.x,d.z)));
  },onStop(){openModal('settings');}});
  ready=true;diagnostics.ready=true;ui.ready();
  // Warm the material programs before the first journey, rather than at the carriage door.
  camera.position.set(-.24,1.26,1.05);camera.lookAt(1.6,1.38,-.2);await renderer.compileAsync(scene,camera);
  requestAnimationFrame(frame);
}

function begin(quick=false){
  if(!ready)return;
  closeModal();journey.reset();started=true;inside=false;seated=null;leaning=false;windowOpen=false;completedTime=0;train.root.position.set(0,0,0);hudHidden=false;lastLandmark=-1;lastPhase='';npcIndex.fill(0);previewS=1660;
  player.set(-4.7,1.66,10.5);velocity.set(0,0,0);setLook(-Math.PI/2,-.02);transition=null;
  $('intro').classList.add('departed');$('ending').classList.add('hidden');$('hud').classList.add('visible');
  audio.start().then(()=>audio.setVolume(preferences.volume)).catch(e=>{diagnostics.errors.push('Audio: '+e.message);ui.toast('浏览器暂未启用声音；可在设置中重新开启。');});
  if(quick){inside=true;journey.board();journey.depart();seated=train.seats.find(s=>s.bay===2&&s.side===1&&s.dir===1);player.copy(seated.position);setLook(-1.25,-.035);subtitle('车窗外，今天正在慢慢远去。');}
  else{subtitle('榆川站。车门就在前方，走近后按 E 上车。',8000);ui.toast('WASD 走动 · 鼠标环顾 · E 互动',5000);}
  $('world').focus();
}

function board(){
  if(!journey.board())return;inside=true;moveTo(new THREE.Vector3(-.15,1.66,10.4),1.1,()=>{setLook(0,-.015);ui.toast('找一个喜欢的位置坐下。列车即将出发。',5000);});
  audio.clack(0,.04);subtitle('欢迎乘坐 K1988 次列车，本次列车开往白鹭湾。',6500);audio.announce('欢迎乘坐本次列车。前方终点站，白鹭湾。');
}
function sit(seat){
  seated=seat;leaning=false;const dir=seat.side===1?-1:1;moveTo(seat.position,.75);setLook(dir*1.20,-.025);ui.toast('E 起身 · F 靠近窗户 · O 推开车窗',5000);
}
function stand(){if(!seated)return;const seat=seated;seated=null;leaning=false;moveTo(seat.stand,.65);setLook(0,-.025);}
function alight(){
  if(!journey.alight())return;inside=false;seated=null;leaning=false;moveTo(new THREE.Vector3(-3.6,1.66,10.45),1,()=>{setLook(-Math.PI/2,.015);$('ending').classList.remove('hidden');releaseMouse();});
  subtitle('白鹭湾到了。谢谢你，把这一段时间留在路上。',9000);audio.announce('白鹭湾站到了。下车的旅客，请带好随身物品。');
}

function findInteraction(){
  if(!started||modal||transition||journey.phase==='complete')return null;
  if(seated)return {text:'起身，去车厢里走走',action:stand};
  const door=new THREE.Vector3(-1.65,1.4,10.55);const doorDist=Math.hypot(player.x-door.x,player.z-door.z);
  if(!inside&&doorDist<3.2&&journey.phase==='platform')return {text:'踏上开往白鹭湾的列车',action:board};
  if(inside&&doorDist<2.3&&journey.phase==='arrived')return {text:'下车 · 白鹭湾站',action:alight};
  if(inside&&doorDist<1.8&&journey.phase==='boarding')return {text:'列车即将出发 · 提前发车',action:()=>journey.depart()};
  if(inside){
    const view=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));let best=null,bestScore=Infinity;
    for(const seat of train.seats){const delta=seat.position.clone().sub(player);delta.y=0;const d=delta.length();const dot=delta.normalize().dot(view);if(d<2.3&&dot>-.25&&d-dot*.6<bestScore){bestScore=d-dot*.6;best=seat;}}
    if(best){if(best.occupied){const idx=best.bay===0?0:1;return{text:'和邻座说几句话',action:()=>{const line=npcLines[idx][npcIndex[idx]%npcLines[idx].length];npcIndex[idx]++;subtitle('邻座：'+line,8000);$('journal-note').textContent=line;}};}return{text:'坐到窗边 · '+(best.side===1?'江水一侧':'山野一侧'),action:()=>sit(best)};}
  }
  return null;
}
function interact(){const target=findInteraction();target?.action();}
function canWalk(x,z){
  if(inside){
    if(x< -1.36||x>1.36||z< -11.5||z>11.55)return false;
    if(z>9.35&&z<9.75&&Math.abs(x)>.34)return false;
    for(const c of train.colliders)if(x>c.minX-.13&&x<c.maxX+.13&&z>c.minZ-.13&&z<c.maxZ+.13)return false;
    return true;
  }
  return x>=-11.1&&x<=-2.18&&z>=-62&&z<=62;
}
function updatePlayer(dt){
  if(transition){const tr=transition;tr.elapsed+=dt;const t=clamp(tr.elapsed/tr.duration,0,1),ease=t*t*(3-2*t);player.lerpVectors(tr.from,tr.to,ease);if(t>=1){transition=null;tr.callback?.();}return;}
  if(seated){const target=seated.position.clone();if(leaning)target.x+=seated.side*.23;player.lerp(target,1-Math.exp(-dt*5));return;}
  if(modal)return;
  const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);const r=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const target=new THREE.Vector3(-Math.sin(yaw)*f+Math.cos(yaw)*r,0,-Math.cos(yaw)*f-Math.sin(yaw)*r);if(target.lengthSq()>1)target.normalize();target.multiplyScalar(inside?1.45:1.95);velocity.lerp(target,1-Math.exp(-dt*11));
  const dx=velocity.x*dt,dz=velocity.z*dt;if(canWalk(player.x+dx,player.z))player.x+=dx;if(canWalk(player.x,player.z+dz))player.z+=dz;
  stepDistance+=Math.hypot(dx,dz);if(stepDistance>.7){stepDistance=0;audio.step(inside);}
  player.y=1.66;
}
function updateLighting(j){
  const env=j.environment,n=env.night*.6,dark=env.tunnel;const yaw=routeYaw(j.distance);
  sun.position.set(65,17-n*13,-28).applyAxisAngle(Y,-yaw);sun.intensity=(3.3-n*2.95)*(1-dark*.97)*(preferences.rain?.48:1);
  sun.color.set('#ffd2a0').lerp(new THREE.Color('#dca285'),n*.7);
  hemi.intensity=(1.12-n*.60)*(1-dark*.73)*(preferences.rain?.75:1);
  scene.environmentIntensity=(.42-n*.20)*(1-dark*.8);
  scene.backgroundIntensity=(.80-n*.51)*(preferences.rain?.67:1);
  scene.backgroundRotation.y=1.3-yaw;scene.environmentRotation.y=1.3-yaw;
  const fog=new THREE.Color('#a5b0a3').lerp(new THREE.Color('#526b78'),n*.85).lerp(new THREE.Color('#191e20'),dark*.92);
  if(preferences.rain)fog.lerp(new THREE.Color('#697f82'),.35);
  scene.fog.color.copy(fog);scene.fog.density=.00014+(preferences.rain?.00018:0)+dark*.015;
  grade.uniforms.night.value=n;
  renderer.toneMappingExposure=.94+n*.16+dark*.12;
  scenery.stations.forEach((s,i)=>s.visible=Math.abs(j.distance-(i===0?0:ROUTE_LENGTH))<260);
  sky.update(clockTime,n,preferences.rain,yaw,camera);
}

function updateHud(){
  const p=journey.progress;const minutes=17*60+42+Math.floor(p*38);$('clock').textContent=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;$('speed').textContent=Math.round(journey.speed*3.6);
  const phase={platform:'榆川站 · 候车',boarding:'06车 · 准备出发',running:journey.landmark.name,braking:'即将抵达 · 白鹭湾',arrived:'白鹭湾站 · 请带好行李',complete:'白鹭湾站 · 旅程已抵达'}[journey.phase];$('location-label').textContent=phase;
  $('progress-fill').style.width=p*100+'%';$('train-dot').style.left=`calc(${p*100}% - 3px)`;
  $('journey-detail').textContent=!inside?'沿站台走近 06 车门 · E 上车':seated?`06车 · 靠窗软座 · ${leaning?'贴近窗边':'看风景'}${windowOpen?' · 车窗已打开':''}`:journey.phase==='arrived'?'沿过道走向车门 · E 下车':'06车 · 自由走动 · 看向座位按 E 坐下';
  if(journey.phase==='complete')$('journey-detail').textContent='你可以在站台，再停留一会儿。';
  const status={phase:journey.phase,distance:Math.round(journey.distance),speed:Math.round(journey.speed*3.6),inside,seated:seated?.id||null,player:player.toArray().map(v=>+v.toFixed(2)),windowOpen,leaning,paused,environment:journey.environment,fps:diagnostics.fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,visibility:document.visibilityState,focused:document.hasFocus(),audioState:audio.context?.state,audioLevel:+audio.level().toFixed(5),errors:diagnostics.errors,assetErrors:diagnostics.assetErrors};
  $('world').dataset.status=JSON.stringify(status);const qaOutput=$('qa-state');if(qaOutput)qaOutput.textContent=`${status.phase} · ${status.distance}m · ${status.fps} FPS · ${status.visibility}`;
}
function onPhase(){
  if(journey.phase===lastPhase)return;const old=lastPhase;lastPhase=journey.phase;
  if(journey.phase==='running'&&old==='boarding'){audio.announce('列车即将开动。请站稳扶好，祝您旅途愉快。');subtitle('车门合上。旅程，从这一刻开始。',6500);ui.chapter('从榆川出发');}
  if(journey.phase==='braking'){subtitle('前方即将到达白鹭湾站。请提前整理随身行李。',8000);audio.announce('列车即将到达终点站，白鹭湾。');}
  if(journey.phase==='arrived'){subtitle('白鹭湾到了。按 E 起身，沿过道向车门走去。',10000);ui.chapter('抵达 · 白鹭湾');audio.bell();ui.toast('车门已打开。起身后，沿过道走到上车的位置即可下车。',9000);}
}

function frame(ms){
  requestAnimationFrame(frame);const rawDt=(ms-frameTime)/1000||.016;const dt=Math.min(rawDt,.06);frameTime=ms;clockTime+=dt;frameCount++;fpsTime+=rawDt;diagnostics.frames++;
  if(fpsTime>.8){diagnostics.fps=Math.round(frameCount/fpsTime);frameCount=0;fpsTime=0;}
  film?.update(rawDt);
  let active=journey;
  if(!started){previewS+=dt*4;const p=new Journey();p.distance=previewS;p.speed=12;p.phase='running';active=p;camera.position.set(-.24,1.26+Math.sin(clockTime*.6)*.003,1.05);camera.lookAt(1.6,1.38,-.2);}
  else{
    if(!paused){const pace=film?.active?1:Number(preferences.pace)||1;let remaining=dt*pace;while(remaining>0){const step=Math.min(.04,remaining);journey.update(step);remaining-=step;}simulationTime+=dt*pace;if(!film?.active)updatePlayer(dt);onPhase();
      const landmark=journey.landmark;if(landmark.at!==lastLandmark&&journey.distance>300){lastLandmark=landmark.at;ui.chapter(landmark.name);subtitle(landmark.note,7000);}
    }
    lookYaw+=(yaw-lookYaw)*(1-Math.exp(-dt*20));lookPitch+=(pitch-lookPitch)*(1-Math.exp(-dt*20));
    const motion=suspension(journey.distance,paused?0:journey.speed,paused?0:journey.acceleration,simulationTime,preferences.sway);
    camera.position.copy(player);if(inside){camera.position.y+=motion.y+motion.body;camera.position.x+=Math.sin(journey.distance*.2)*.004*preferences.sway;}
    if(!seated&&velocity.length()>.2)camera.position.y+=Math.sin(stepDistance/.7*Math.PI*2)*.009*preferences.sway;
    camera.rotation.set(lookPitch+(inside?motion.pitch:0),lookYaw,inside?motion.roll:0,'YXZ');
    interaction=findInteraction();ui.prompt(interaction?.text);$('crosshair').classList.toggle('hidden',!!modal||hudHidden);
    if(journey.phase==='complete'&&!paused){completedTime+=dt;train.root.position.z=-(Math.max(0,completedTime-5)**2)*.15;}
    if(clockTime-lastUi>.15){updateHud();lastUi=clockTime;}
  }
  const visualTime=started?simulationTime:clockTime;
  scenery.update(visualTime,active,preferences);train.update(visualTime,dt,active,{...preferences,windowOpen,windowKey});updateLighting(active);
  const carMotion=suspension(active.distance,paused?0:active.speed,active.acceleration,visualTime,.45);train.body.rotation.z=carMotion.roll*.6;train.body.position.y=carMotion.y*.35;
  audio.update(journey,{windowOpen,rain:preferences.rain,inside,paused,yaw,positionZ:player.z,windowSide:windowKey?.includes('--')?-1:1});
  grade.uniforms.time.value=clockTime;renderer.info.reset();composer.render();
  film?.capture();
  if(photoPending){
    photoPending=false;
    const shot=document.createElement('canvas');shot.width=renderer.domElement.width;shot.height=renderer.domElement.height;
    const ctx=shot.getContext('2d');ctx.drawImage(renderer.domElement,0,0);
    const size=Math.max(12,Math.round(shot.width/180));ctx.font=`${size}px system-ui`;ctx.textAlign='right';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillStyle='#ffffffe0';
    ctx.fillText('Terrain imagery © swisstopo · Elevation Mapzen / AWS',shot.width-size,size*2);
    const a=document.createElement('a');a.href=shot.toDataURL('image/png');a.download=`晚点之前-${journey.landmark.name}-${Math.round(journey.distance)}m.png`;a.click();$('flash').classList.add('flash');setTimeout(()=>$('flash').classList.remove('flash'),60);ui.toast('已留住这一刻。照片已保存。');
  }
}

function snapshot(){if(!started||!ready)return;photoPending=true;audio.clack(0,.045);}
function toggleWindow(){if(!inside)return;const seat=seated||train.seats.reduce((a,b)=>Math.abs(b.z-player.z)<Math.abs(a.z-player.z)?b:a);const key=`${seat.bay}-${seat.side}`;windowOpen=!(windowOpen&&windowKey===key);windowKey=windowOpen?key:null;ui.toast(windowOpen?'上半扇车窗缓缓推开，风和远方一起进来。':'车窗合上，车厢又安静了一些。');audio.clack(0,.06);}
function bind(){
  $('begin').onclick=()=>begin(false);$('quick-start').onclick=()=>begin(true);$('interact').onclick=interact;
  $('settings-button').onclick=()=>openModal('settings');$('intro-settings').onclick=()=>openModal('settings');$('close-settings').onclick=closeModal;$('resume').onclick=closeModal;
  $('ticket-button').onclick=()=>openModal('journal');$('close-journal').onclick=closeModal;$('photo-button').onclick=snapshot;
  $('restart').onclick=()=>begin(false);$('again').onclick=()=>begin(false);$('stay').onclick=()=>{$('ending').classList.add('hidden');$('world').focus();};
  for(const key of ['volume','sway']){$(key).value=Math.round(preferences[key]*100);$(key+'-value').textContent=Math.round(preferences[key]*100)+'%';$(key).oninput=()=>{preferences[key]=Number($(key).value)/100;$(key+'-value').textContent=$(key).value+'%';audio.setVolume(preferences.volume);save();};}
  $('quality').value=preferences.quality;$('quality').onchange=()=>{preferences.quality=$('quality').value;if(ready)setQuality();save();};
  $('pace').value=preferences.pace;$('pace').onchange=()=>{preferences.pace=Number($('pace').value);save();};
  document.querySelectorAll('[data-rain]').forEach(button=>{button.classList.toggle('selected',String(preferences.rain)===button.dataset.rain);button.onclick=()=>{preferences.rain=button.dataset.rain==='true';document.querySelectorAll('[data-rain]').forEach(b=>b.classList.toggle('selected',b===button));save();};});
  $('world').addEventListener('pointerdown',e=>{if(!started||modal)return;dragging=true;dragX=e.clientX;dragY=e.clientY;$('world').focus();if(e.button===0&&!document.pointerLockElement)lockMouse();});
  window.addEventListener('pointerup',()=>dragging=false);
  window.addEventListener('pointermove',e=>{if(!started||modal||performance.now()<lookInputReadyAt)return;const locked=document.pointerLockElement===$('world');if(locked||dragging){const dx=locked?e.movementX:e.clientX-dragX,dy=locked?e.movementY:e.clientY-dragY;dragX=e.clientX;dragY=e.clientY;yaw-=clamp(dx,-180,180)*.0022;pitch=clamp(pitch-clamp(dy,-150,150)*.0019,-1.14,1.12);}});
  document.addEventListener('pointerlockchange',()=>{lookInputReadyAt=performance.now()+200;});
  window.addEventListener('keydown',e=>{
    if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)&&e.code!=='Escape')return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){if(modal)closeModal();else if(started)openModal('settings');return;}
    if(!started||modal)return;keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyE')interact();if(e.code==='KeyF'&&seated){leaning=!leaning;ui.toast(leaning?'把额头靠近玻璃，看看外面。':'靠回座椅。');}if(e.code==='KeyO')toggleWindow();if(e.code==='KeyJ')openModal('journal');if(e.code==='KeyP')snapshot();if(e.code==='KeyH'){hudHidden=!hudHidden;$('hud').classList.toggle('visible',!hudHidden);}
  });window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});
  window.addEventListener('resize',()=>{if(!ready)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();setQuality();});
  $('world').addEventListener('webglcontextlost',e=>{e.preventDefault();ui.toast('图形上下文暂时丢失，请重新加载旅程。',15000);});
}
bind();
window.__rail={
  get state(){return {ready,started,paused,phase:journey.phase,distance:journey.distance,speed:journey.speed,inside,seated:seated?.id||null,leaning,windowOpen,player:player.toArray(),yaw,pitch,environment:journey.environment,preferences:{...preferences},fps:diagnostics.fps,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,audioState:audio.context?.state,audioLevel:audio.level(),errors:[...diagnostics.errors],assetErrors:[...diagnostics.assetErrors]};},
};
if(new URLSearchParams(location.search).has('qa')){
  Object.assign(window.__rail,{
    travelTo(s){journey.distance=clamp(s,0,ROUTE_LENGTH);journey.speed=s>=ROUTE_LENGTH?0:18;journey.phase=s>=ROUTE_LENGTH?'arrived':'running';lastLandmark=-1;},
    look(y,p=0){setLook(y,p);},
    pose(x,y,z){player.set(x,y,z);transition=null;},
    screenshot(){return renderer.domElement.toDataURL('image/png');},
    board(){board();},
    sit(bay=2,side=1,dir=1){if(!inside){inside=true;journey.board();journey.depart();}sit(train.seats.find(s=>s.bay===bay&&s.side===side&&s.dir===dir));},
    stand,alight,
  });
  const qa=document.createElement('details');qa.id='qa-tools';qa.style.cssText='position:fixed;right:18px;bottom:85px;z-index:30;background:#173329e8;border:1px solid #b9ad8160;padding:10px;color:#e9dec2;font:11px system-ui;max-width:330px';
  qa.innerHTML='<summary style="cursor:pointer">开发验证</summary><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"><button data-action="begin">站台起点</button><button data-action="seat">窗边起点</button><button data-distance="1550">草甸</button><button data-distance="2200">江桥</button><button data-distance="4400">隧道</button><button data-distance="6400">湖畔</button><button data-distance="3700">峡谷</button><button data-action="right">正看车窗</button><button data-action="left">看左侧山壁</button><button data-action="terrain">地形纯色对比</button><button data-distance="7800">到站</button><button data-action="door">走到车门</button><button data-action="corridor">看过道</button><button data-action="reader">阅读乘客近景</button><button data-action="traveller">窗边乘客近景</button><button data-action="tea">茶杯近景</button><button data-action="pause">暂停时光</button></div><output id="qa-state" style="display:block;margin-top:8px"></output>';document.body.appendChild(qa);
  qa.addEventListener('click',event=>{const action=event.target.closest('button')?.dataset.action;const poses={reader:[[.12,1.38,4.2],[1.03,1.03,2.82]],traveller:[[-.10,1.38,-7.9],[-1.03,1.12,-6.57]],tea:[[.68,1.24,.62],[1.23,1.0,-.07]]};if(poses[action]){const [pos,target]=poses[action];seated=null;leaning=false;inside=true;transition=null;player.fromArray(pos);const d=new THREE.Vector3(...target).sub(player);setLook(Math.atan2(-d.x,-d.z),Math.atan2(d.y,Math.hypot(d.x,d.z)));}});
  qa.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||!ready)return;releaseMouse();if(b.dataset.distance){window.__rail.travelTo(Number(b.dataset.distance));if(seated)setLook(-1.30,-.04);}if(b.dataset.action==='begin')begin(false);if(b.dataset.action==='seat')begin(true);if(b.dataset.action==='door'){seated=null;leaning=false;inside=true;transition=null;player.set(-.15,1.66,10.5);setLook(-Math.PI/2,0);}if(b.dataset.action==='corridor'){seated=null;leaning=false;inside=true;transition=null;player.set(0,1.66,8.9);setLook(0,0);}if(b.dataset.action==='pause')paused=!paused;if(b.dataset.action==='right')setLook(-Math.PI/2,.025);if(b.dataset.action==='left')setLook(Math.PI/2,.025);if(b.dataset.action==='terrain')scenery.landscape.debugTerrain();});
}
initialize().catch(fatal);
