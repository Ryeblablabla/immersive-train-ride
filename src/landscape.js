import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { random } from './geometry.js';
import {texture} from './materials.js';
import {forestMaterial} from './forest.js';
import { routeX, smoothstep } from './journey.js';

let elevation,landcover;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sourceV=s=>THREE.MathUtils.lerp((s+1200)/11000,.22+(s-5600)*.00003,smoothstep(4450,5050,s));
function dem(u,v){
 if(!elevation)return 1000;
 const x=clamp(u,0,.999)*1023,z=clamp(v,0,.999)*1023,ix=x|0,iz=z|0,fx=x-ix,fz=z-iz;
 const at=(a,b)=>elevation[b*1024+a];
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iz),at(ix+1,iz),fx),THREE.MathUtils.lerp(at(ix,iz+1),at(ix+1,iz+1),fx),fz);
}
function noise(x,z){return Math.sin(x*.14+Math.sin(z*.11))*Math.cos(z*.13+x*.04)*.55+Math.sin(x*.41-z*.37)*.22;}
function wooded(x,s){
 if(!landcover)return true;
 const u=clamp((x+4200)/8400,0,.999),v=clamp(sourceV(s),0,.999),i=((v*256|0)*256+(u*256|0))*3;
 const r=landcover[i]/255,g=landcover[i+1]/255,b=landcover[i+2]/255;
 return (r+g+b)/3<.39&&g>r*.91&&g>b*1.015;
}
export const shoreX=s=>22+Math.sin(s*.0043)*8+Math.sin(s*.011)*3;
const farShore=s=>180+smoothstep(4650,5900,s)*1370+Math.sin(s*.0028)*65+Math.sin(s*.007)*28;
export function landHeight(x,s){
 const ax=Math.abs(x);if(ax<5)return -1.44;
 const small=noise(x,s)*smoothstep(7,30,ax);
 const raw=Math.max(0,dem((x+4200)/8400,sourceV(s))-720)*(.39+smoothstep(4750,5600,s)*.16);
 let y=-1.7+small+raw*smoothstep(75,1150,ax);
 // The canyon cut has a continuous backing hillside behind the rock scans.
 if(x<0)y+=smoothstep(3200,3500,s)*(1-smoothstep(4930,5320,s))*smoothstep(7,43,ax)*(1-smoothstep(160,350,ax))*(31+Math.sin(s*.009)*7);
 if(x>0&&s>1850&&s<7560){
  const edge=shoreX(s),far=farShore(s);
  if(x>edge&&x<far)y=-5.5-8*smoothstep(edge,edge+40,x);
  else if(x>=far)y=-3.5+raw*smoothstep(far,far+420,x)+small*.15;
  else y=-1.7+small*.25-smoothstep(edge-6,edge,x)*1.9;
 }
 // A cut through the real relief makes room for the tunnel and railway.
 const tunnel=smoothstep(4020,4200,s)*(1-smoothstep(4650,4850,s));
 y+=tunnel*smoothstep(4.7,22,ax)*(1-smoothstep(120,260,ax))*34;
 const bridge=smoothstep(1980,2050,s)*(1-smoothstep(2340,2410,s));
 y-=bridge*(1-smoothstep(75,180,ax))*13;
 return y;
}

function terrainMaterial(m,models){
 const mat=new THREE.MeshStandardMaterial({roughness:.97,envMapIntensity:.55,normalMap:texture('/assets/textures/aerial_grass_rock-normal.jpg',[1,1]),normalScale:new THREE.Vector2(.32,.32),roughnessMap:texture('/assets/textures/aerial_grass_rock-roughness.jpg',[1,1])});
 const rock=texture('/assets/textures/cliff_side-color.jpg',[1,1],true);
 const meadow=texture('/assets/textures/aerial_grass_rock-color.jpg',[1,1],true);
 const rubble=texture('/assets/textures/aerial_rocks_04-color.jpg',[1,1],true);
 const orthophoto=new THREE.TextureLoader().load('/assets/terrain/alpine-orthophoto.jpg');orthophoto.colorSpace=THREE.SRGBColorSpace;orthophoto.anisotropy=8;
 // Triplanar rock, world-scale meadow, altitude/slope masks and patchy snow.
 // Model UVs remain reserved for the scanned foreground assets.
 mat.onBeforeCompile=shader=>{
  shader.uniforms.meadowMap={value:meadow};shader.uniforms.rockMap={value:rock};shader.uniforms.rubbleMap={value:rubble};shader.uniforms.orthophoto={value:orthophoto};
  shader.vertexShader='attribute vec2 geoUv;varying vec3 vLand;varying vec3 vSlope;varying vec2 vOrthoUv;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLand=position;vSlope=normal;vOrthoUv=vec2(geoUv.x,1.-geoUv.y);');
  shader.fragmentShader=`varying vec3 vLand;varying vec3 vSlope;varying vec2 vOrthoUv;uniform sampler2D meadowMap;uniform sampler2D rockMap;uniform sampler2D rubbleMap;uniform sampler2D orthophoto;
   vec3 landSample(sampler2D t,vec2 uv){float k=.5+.5*sin(uv.x*.27+sin(uv.y*.23)*2.);return mix(texture2D(t,uv).rgb,texture2D(t,mat2(.8,-.6,.6,.8)*uv*.73+vec2(.37,.71)).rgb,k*.66);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 w=pow(abs(normalize(vSlope)),vec3(5.));w/=max(w.x+w.y+w.z,.001);
   vec3 rock=landSample(rockMap,vLand.zy*.018)*w.x+landSample(rockMap,vLand.xz*.018)*w.y+landSample(rockMap,vLand.xy*.018)*w.z;
   float stoneLuma=dot(rock,vec3(.3,.59,.11));rock=mix(rock,vec3(stoneLuma*.95,stoneLuma,stoneLuma*1.06),.92);
   vec3 meadow=landSample(meadowMap,vLand.xz*.004);
   vec3 grain=landSample(meadowMap,vLand.xz*.022);
   meadow=mix(meadow,grain,.22)*vec3(.73,.87,.61);
   vec3 scree=landSample(rubbleMap,vLand.xz*.007);
   float slope=1.-abs(normalize(vSlope).y);
   float snowBreakup=sin(vLand.x*.008+sin(vLand.z*.006)*2.)*.5+sin(vLand.z*.016-vLand.x*.011)*.25;
   float bare=smoothstep(.28,.68,slope)+smoothstep(600.,1100.,vLand.y)*.6;
   vec3 ground=mix(meadow,mix(scree,rock,smoothstep(.25,.65,slope))*vec3(.83,.85,.81),clamp(bare,0.,1.));
   float snow=smoothstep(1060.+snowBreakup*100.,1250.+snowBreakup*100.,vLand.y)*(1.-smoothstep(.28,.7,slope));
   ground=mix(ground,vec3(.82,.87,.85),snow);
   float woods=(sin(-vLand.z*.003+vLand.x*.0045)+sin(vLand.x*.012+vLand.z*.007)*.35);
   float forestFloor=smoothstep(-.35,.3,woods)*(1.-smoothstep(750.,1050.,vLand.y))*(1.-smoothstep(.48,.75,slope));
   float mapped=smoothstep(85.,420.,abs(vOrthoUv.x*8400.-4200.));
   ground*=mix(vec3(1.),vec3(.56,.65,.49),forestFloor*.72*(1.-mapped));
   vec3 aerial=texture2D(orthophoto,clamp(vOrthoUv,vec2(.001),vec2(.999))).rgb;
   ground=mix(ground,aerial,mapped);
   diffuseColor.rgb*=ground;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(roughnessFactor,.87);');
 };
 mat.customProgramCacheKey=()=> 'georeferenced-alpine-terrain-v3';return mat;
}

function createMeadow(){
 const rng=random(7201),positions=[],colors=[],indices=[];
 for(let blade=0;blade<16;blade++){
  const a=rng()*Math.PI*2,h=.4+rng()*.5,w=.014+rng()*.018,x=(rng()-.5)*.24,z=(rng()-.5)*.24;
  const base=positions.length/3;
  for(let j=0;j<=3;j++){const t=j/3,lean=t*t*.23;for(const side of [-1,1]){positions.push(x+Math.cos(a)*(side*w*(1-t)+lean),h*t,z+Math.sin(a)*(side*w*(1-t)+lean));const c=new THREE.Color().setHSL(.18+rng()*.025,.24,.15+t*.17);colors.push(c.r,c.g,c.b);}}
  for(let j=0;j<3;j++){const k=base+j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const time={value:0};const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.95,envMapIntensity:.7});material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{shader.uniforms.meadowTime=time;shader.vertexShader='uniform float meadowTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  transformed.x+=sin(instanceMatrix[3].z*.12+meadowTime*1.5+position.y)*position.y*position.y*.07;
 `);};
 return {geometry,material,time};
}

// One draw per model primitive per terrain chunk. Every placement retains its
// original scanned geometry, UVs and physical materials, with true 3D parallax.
function scatterModel(source,parent,placements,{axis='height',shadows=false}={}){
 if(!source||!placements.length)return;
 source.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(source),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const base=new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z);
 const dim=axis==='width'?size.x:axis==='max'?Math.max(size.x,size.y,size.z):size.y;
 const dummy=new THREE.Object3D(),matrix=new THREE.Matrix4();
 source.traverse(mesh=>{if(!mesh.isMesh)return;
  const inst=new THREE.InstancedMesh(mesh.geometry,mesh.material,placements.length);inst.castShadow=shadows;inst.receiveShadow=true;
  const local=new THREE.Matrix4().multiplyMatrices(base,mesh.matrixWorld);
  placements.forEach((p,i)=>{const scale=p.size/dim;dummy.position.set(routeX(p.s)+p.x,p.y,-p.s);dummy.rotation.set(p.rx||0,p.a||0,p.rz||0);dummy.scale.set(scale*(p.sx||1),scale*(p.sy||1),scale*(p.sz||1));dummy.updateMatrix();matrix.multiplyMatrices(dummy.matrix,local);inst.setMatrixAt(i,matrix);});
  inst.computeBoundingSphere();parent.add(inst);
 });
}

export async function loadElevation(){
 const files=await Promise.all(['/assets/terrain/alpine-height.bin','/assets/terrain/landcover.bin'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('Terrain '+r.status);return r.arrayBuffer();}));
 elevation=new Float32Array(files[0]);landcover=new Uint8Array(files[1]);
}

export function createLandscape(world,m,models,waterNormals,atlas){
 const chunks=[],material=terrainMaterial(m,models),meadow=createMeadow(),distantForest=forestMaterial(atlas);
 const xs=[];for(let x=-4800;x<=4800;){xs.push(x);x+=Math.abs(x)<80?4:Math.abs(x)<350?10:Math.abs(x)<1400?18:35;}
 if(xs.at(-1)<4800)xs.push(4800);
 for(let start=-1200;start<9400;start+=320){
  const group=new THREE.Group();world.add(group);chunks.push({group,s:start});
  const rng=random(start*31+84791),p=[],uv=[],geoUv=[],idx=[],nx=xs.length,nz=24;
  for(let j=0;j<=nz;j++)for(let i=0;i<nx;i++){const s=start+j/nz*320,x=xs[i];p.push(routeX(s)+x,landHeight(x,s),-s);uv.push(x/60,s/60);geoUv.push((x+4200)/8400,sourceV(s));}
  for(let j=0;j<nz;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i;idx.push(a,a+1,a+nx,a+1,a+nx+1,a+nx);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('geoUv',new THREE.Float32BufferAttribute(geoUv,2));geo.setIndex(idx);geo.computeVertexNormals();const terrain=new THREE.Mesh(geo,material);terrain.receiveShadow=false;group.add(terrain);chunks.at(-1).terrain=terrain;
  const grasses=[];for(let i=0;i<10000;i++){const s=start+rng()*320,x=(rng()<.53?-1:1)*(5+rng()*20),y=landHeight(x,s);if(y<-2.35||s<160||s>7650||s>2020&&s<2390||s>4140&&s<4700)continue;grasses.push({s,x,y,h:.3+rng()*.65});}
  const grass=new THREE.InstancedMesh(meadow.geometry,meadow.material,grasses.length),dummy=new THREE.Object3D();
  grasses.forEach((p,i)=>{dummy.position.set(routeX(p.s)+p.x,p.y,-p.s);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.setScalar(p.h);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);});grass.receiveShadow=true;grass.computeBoundingSphere();group.add(grass);chunks.at(-1).grass=grass;
  const placement={tree:[], 'tree-b':[], 'tree-lod':[], 'tree-b-lod':[], 'moss-rocks':[],flowers:[],ferns:[],'cliff-a':[],'cliff-b':[],shore:[],'rock-face':[],mountainside:[],granite:[]};
  for(let i=0;i<3;i++){placement['fir-'+i]=[];placement['fir-'+i+'-lod']=[];}
  const add=(name,s,x,size,extra={})=>{const y=extra.y??landHeight(x,s);placement[name].push({s,x,y,size,a:rng()*Math.PI*2,...extra});};
  const station=s=>s<150||s>7660;
  // Irregular groves, with deliberate openings toward peaks and the lake.
  for(let i=0;i<120;i++){
   const s=start+rng()*320,side=rng()<.64?-1:1,near=i<10;
   let x=side*(near?11+rng()*85:100+rng()*1100);
   if(side>0&&s>1850&&s<7560)x=near?(rng()<.6?8+rng()*8:farShore(s)+10+rng()*45):farShore(s)+25+rng()*650;
   const y=landHeight(x,s);if(y<-2.3||y>820||station(s)&&Math.abs(x)<40||s>4140&&s<4700&&Math.abs(x)<38)continue;
   const grove=Math.sin(s*.013+x*.021)+Math.cos(s*.005-x*.032);if(grove<-.4||x>0&&near&&s>5100&&s<7300&&i%5!==0)continue;
   const conifer=s>3200&&i%4!==0;
   const variant=conifer?'fir-'+(i%3):i%3===0?'tree-b':'tree';add(variant+(near?'':'-lod'),s,x,conifer?12+rng()*16:near?5+rng()*7:7+rng()*16,{y});
  }
  // Scan-based rock bands have varying scale, position and gaps, not a tiled wall.
  if(start>800&&start<7600){
   for(let i=0;i<4;i++){
    const s=start+25+i*78+rng()*25;if(s>4160&&s<4700)continue;
    const canyon=s>3400&&s<5200;
    const x=-(canyon?23+rng()*17:55+rng()*70),width=canyon?35+rng()*30:55+rng()*65;
    add(canyon?(i%2?'mountainside':'granite'):i%2?'cliff-a':'cliff-b',s,x,width,{a:Math.PI/2+(rng()-.5)*.35,y:canyon?-7:landHeight(x,s)-4,sy:canyon?1.3:1.2});
   }
   for(let i=0;i<3;i++){
    const s=start+i*110+rng()*35;if(s<1860||s>2030&&s<2380)continue;
    add('shore',s,shoreX(s)-1,80+rng()*35,{a:Math.PI/2,y:-4.1,sy:.38,sz:.23});
   }
   if(start>4700)for(let i=0;i<2;i++){
    const s=start+i*130+rng()*30,x=farShore(s)+170+i*105,width=145+rng()*90;
    add(i?'cliff-b':'granite',s,x,width,{a:-Math.PI/2+(rng()-.5)*.35,y:landHeight(x,s)-width*.26,sy:.85});
   }
  }
  for(let i=0;i<24;i++){
   const s=start+rng()*320,x=(rng()<.5?-1:1)*(5+rng()*18),y=landHeight(x,s);
   if(y<-2.4||station(s)||s>2030&&s<2370||s>4140&&s<4700)continue;
   add('moss-rocks',s,x,1.5+rng()*4,{y:y-.3});
  }
  for(let i=0;i<50;i++){
   const s=start+rng()*320,x=(rng()<.58?-1:1)*(5+rng()*18),y=landHeight(x,s);
   if(y<-2.1||station(s)||s>2020&&s<2390||s>4140&&s<4700)continue;
   add(i%3===0?'flowers':'ferns',s,x,i%3===0?.35+rng()*.5:.18+rng()*.32,{y});
  }
  const detail=new THREE.Group(),rocksHigh=new THREE.Group(),rocksLow=new THREE.Group();group.add(detail,rocksHigh,rocksLow);
  chunks.at(-1).detail=detail;chunks.at(-1).rocksHigh=rocksHigh;chunks.at(-1).rocksLow=rocksLow;
  for(const [name,list]of Object.entries(placement)){
   const isRock=name.startsWith('cliff')||name==='shore'||name==='granite'||name==='mountainside';
   scatterModel(models[name],isRock?rocksHigh:detail,list,{axis:isRock?'width':name==='moss-rocks'?'max':'height',shadows:name==='tree'||name==='tree-b'||name.startsWith('fir-')&&!name.endsWith('-lod')});
   if(isRock)scatterModel(models[name+'-lod'],rocksLow,list,{axis:'width'});
  }
  const forest=[];
  for(let i=0;i<15000;i++){
   const s=start+rng()*320,x=-2800+rng()*6600,ax=Math.abs(x);if(ax<160)continue;
   const y=landHeight(x,s);if(y<-2||y>900||!wooded(x,s))continue;
   const grove=Math.sin(s*.003+x*.0045)+Math.sin(x*.012-s*.007)*.35;
   if(grove<-.35||s>4140&&s<4700&&ax<80)continue;
   const slope=Math.abs(landHeight(x+6,s)-landHeight(x-6,s))/12;if(slope>1.6)continue;
   const conifer=s>3000||y>350,tile=conifer?2+(i%2):i%2;
   forest.push({x,s,y,h:conifer?19+rng()*18:13+rng()*13,tile});
  }
  const fg=new THREE.PlaneGeometry(1.3,1.18);fg.translate(0,.56,0);const tiles=new Float32Array(forest.length*2);fg.setAttribute('forestTile',new THREE.InstancedBufferAttribute(tiles,2));
  const woods=new THREE.InstancedMesh(fg,distantForest,forest.length);
  forest.forEach((p,i)=>{dummy.position.set(routeX(p.s)+p.x,p.y,-p.s);dummy.rotation.set(0,0,0);dummy.scale.set(p.h*(.8+rng()*.25),p.h,1);dummy.updateMatrix();woods.setMatrixAt(i,dummy.matrix);tiles[i*2]=p.tile%2;tiles[i*2+1]=Math.floor(p.tile/2);woods.setColorAt(i,new THREE.Color().setHSL(.18,.04,.70+rng()*.28));});
  woods.computeBoundingSphere();group.add(woods);
 }
 // The reflection is rendered from the actual scene, including mountains,
 // clouds and cliffs; moving wave normals disturb the reflected image.
 const wg=new THREE.PlaneGeometry(10000,12000);
 const water=new Water(wg,{textureWidth:1024,textureHeight:1024,waterNormals,sunDirection:new THREE.Vector3(.86,.24,-.4).normalize(),sunColor:0xffe6ba,waterColor:0x174f4c,distortionScale:1.9,fog:true});
 water.rotation.x=-Math.PI/2;water.position.set(0,-3.05,-4100);world.add(water);
 // Thin foam/littoral details are geometry, so shorelines have a real contact edge.
 const foamPositions=[];for(let s=1870;s<7530;s+=4){const x=shoreX(s)+1;foamPositions.push(routeX(s)+x,-3.015,-s);}
 const fg=new THREE.BufferGeometry().setFromPoints(Array.from({length:foamPositions.length/3},(_,i)=>new THREE.Vector3().fromArray(foamPositions,i*3)));
 const foam=new THREE.Line(fg,new THREE.LineBasicMaterial({color:'#a4b5a0',transparent:true,opacity:.19}));world.add(foam);
 const diagnosticMaterial=new THREE.MeshStandardMaterial({color:'#829080',roughness:1});
 let diagnostic=false;
 return {water,chunks,debugTerrain(){diagnostic=!diagnostic;chunks.forEach(c=>c.terrain.material=diagnostic?diagnosticMaterial:material);},update(t,j,settings){
  meadow.time.value=t;
  distantForest.color.set('#ffffff').lerp(new THREE.Color('#bbc8d1'),j.environment.night*.27);
  for(const c of chunks){const distance=Math.abs(c.s+160-j.distance);c.group.visible=distance<(settings.quality==='medium'?3600:5200);c.detail.visible=distance<900;c.grass.visible=distance<500;c.rocksHigh.visible=distance<400;c.rocksLow.visible=distance>=400&&distance<2000;}
  water.material.uniforms.time.value=t*.36;
  water.material.uniforms.sunColor.value.set('#ffe6ba').multiplyScalar(1-j.environment.night*.72);
  water.material.uniforms.waterColor.value.set(j.distance>5100?'#2b938b':'#174f4c').multiplyScalar(1-j.environment.night*.25);
 }};
}
