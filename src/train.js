import * as THREE from 'three';
import { Batch, archGeometry } from './geometry.js';
import { canvasTexture, label } from './materials.js';
import {createPassengers} from './passengers.js';
import {refineCarriage} from './carriage-detail.js';

export function placeModel(source, parent, position, size, angle = 0) {
  if (!source) return null;
  const clone = source.clone(true); const holder = new THREE.Group(); holder.add(clone);
  const box = new THREE.Box3().setFromObject(clone); const center = box.getCenter(new THREE.Vector3()); const dims = box.getSize(new THREE.Vector3());
  const scale = size / Math.max(dims.x, dims.y, dims.z);
  clone.position.set(-center.x, -box.min.y, -center.z); holder.scale.setScalar(scale); holder.rotation.y = angle; holder.position.copy(position);
  clone.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); parent.add(holder); return holder;
}

export function createTrain(scene, m, models) {
  const root = new THREE.Group(); root.name='Green passenger train';scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const b = new Batch(body);
  const seats = [], colliders = [], windows = [], dynamics = [];
  const bays = [-7.6, -3.8, 0, 3.8, 7.6];
  const curtainTime={value:0},curtainWind={value:.2};
  m.curtain.onBeforeCompile=shader=>{shader.uniforms.railTime=curtainTime;shader.uniforms.railWind=curtainWind;shader.vertexShader='uniform float railTime; uniform float railWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat flutter=pow(clamp((2.0-transformed.y)/1.05,0.0,1.0),1.5);transformed.x+=sin(transformed.z*14.0+railTime*2.5+transformed.y*7.0)*0.008*railWind*flutter;');};
  const dropletMap=canvasTexture(512,512,(c,w,h)=>{for(let i=0;i<170;i++){const x=Math.random()*w,y=Math.random()*h,r=1+Math.random()*3;c.strokeStyle='rgba(226,241,234,.5)';c.lineWidth=1;c.beginPath();c.ellipse(x,y,r,r*1.7,0,0,Math.PI*2);c.stroke();c.fillStyle='rgba(31,55,53,.20)';c.fill();if(i%9===0){c.strokeStyle='rgba(215,230,219,.15)';c.beginPath();c.moveTo(x,y);c.lineTo(x-1,y+15+Math.random()*60);c.stroke();}}});
  dropletMap.wrapS=dropletMap.wrapT=THREE.RepeatWrapping;dropletMap.repeat.set(5.4,1);
  const rainGlassMaterial=new THREE.MeshBasicMaterial({map:dropletMap,transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false});const rainPanes=[];
  b.box(3.24, 0.12, 23.7, m.floor, 0, -0.06, 0);
  b.box(0.55, 0.015, 21.6, m.dark, 0, 0.008, -0.2);
  const roof=archGeometry(3.28,0.55,23.9);b.add(roof,m.ceiling,0,2.12,0);roof.dispose();
  for(const side of [-1,1]){
    const x=side*1.63;
    b.box(.10,.91,20.6,m.wood,x,.455,-.9);
    b.box(.025,.90,20.6,m.green,x+side*.07,.44,-.9);
    b.box(.030,.075,20.6,m.cream,x+side*.085,.84,-.9);
    b.box(.11,.30,20.6,m.cream,x,2.13,-.9);
    b.box(.12,.045,20.7,m.trim,x,.94,-.9);
    b.box(.12,.045,20.7,m.trim,x,1.94,-.9);
    b.box(.12,.20,23.7,m.green,x,-.14,0);
    b.box(.08,.13,20.6,m.green,x+side*.06,.36,-.9);
    const spans=[[-11.8,-9.0],[-6.22,-5.18],[-2.42,-1.38],[1.38,2.42],[5.18,6.22],[8.98,9.75]];
    for(const [a,z]of spans)b.box(.12,1.08,z-a,m.cream,x,1.44,(a+z)/2);
    b.box(.14,2.24,.48,m.cream,x,1.12,11.64);
    if(side===1)b.box(.12,2.1,1.25,m.green,x,1.05,10.5);
    for(let i=0;i<bays.length;i++){
      const z=bays[i];
      for(const edge of [-1,1]){
        b.box(.075,1.08,.045,m.chrome,x-side*.06,1.44,z+edge*1.38);
        b.box(.08,.04,2.78,m.chrome,x-side*.06,1.44+edge*.53,z);
        if(edge===1)b.box(.045,.014,2.76,m.chrome,x-side*.10,1.49,z);
      }
      for(const upper of [false,true]){const paneY=upper?1.70:1.18;const glass=new THREE.Mesh(new THREE.PlaneGeometry(2.70,.50),m.window);glass.rotation.y=side*Math.PI/2;glass.position.set(x,paneY,z);glass.renderOrder=2;glass.userData={side,upper,baseY:paneY,key:`${i}-${side}`};body.add(glass);windows.push(glass);const rainPane=new THREE.Mesh(glass.geometry,rainGlassMaterial);rainPane.rotation.copy(glass.rotation);rainPane.position.copy(glass.position);rainPane.position.x-=side*.007;rainPane.renderOrder=3;body.add(rainPane);rainPanes.push({mesh:rainPane,glass});}
      // Pleated curtains, with geometry folds and a shared low amplitude wind shader.
      for(const edge of [-1,1]){
        const g=new THREE.PlaneGeometry(.26,1.05,16,16);const p=g.attributes.position;
        for(let j=0;j<p.count;j++){const u=p.getX(j);const yy=p.getY(j);p.setXYZ(j,x-side*.07-Math.cos(u*100)*side*.026,1.45+yy,z+edge*1.21+u*(.55+.45*Math.abs(yy)*2));}g.computeVertexNormals();
        b.add(g,m.curtain);g.dispose();
        b.cylinder(.012,.012,.35,m.brass,x-side*.11,1.44,z+edge*1.19,Math.PI/2,0,0);
      }
      // Luggage shelves: parallel rails and closely spaced rungs.
      b.cylinder(.016,.016,3.5,m.chrome,side*1.13,2.12,z,Math.PI/2);
      b.cylinder(.014,.014,3.5,m.chrome,side*1.53,2.12,z,Math.PI/2);
      for(let j=0;j<15;j++)b.cylinder(.008,.008,.44,m.chrome,side*1.33,2.12,z-1.64+j*.235,0,0,Math.PI/2,7);
      for(const dz of [-1.64,1.64])b.cylinder(.014,.014,.34,m.chrome,side*1.5,2.27,z+dz,0,0,-side*.35);
      // Facing upholstered benches, piping, legs and wall-side headrest cloths.
      for(const dir of [-1,1]){
        const seatZ=z+dir*1.03;const sx=side*.98;
        b.round(1.08,.18,.68,.065,m.seat,sx,.48,seatZ);
        b.round(1.08,.72,.14,.045,m.seat,sx,.87,seatZ+dir*.31);
        b.round(1.10,.07,.18,.022,m.seatEdge,sx,1.22,seatZ+dir*.31);
        b.box(.92,.025,.04,m.trim,sx,.57,seatZ-dir*.32);
        for(const dx of [-.39,.39])b.box(.035,.39,.045,m.dark,sx+dx,.23,seatZ);
        b.cylinder(.018,.018,.54,m.chrome,side*.43,.72,seatZ,Math.PI/2);
        b.round(.065,.055,.54,.02,m.seatEdge,side*.43,.75,seatZ);
        colliders.push({minX:sx-.56,maxX:sx+.56,minZ:seatZ-.36,maxZ:seatZ+.4});
        seats.push({id:`${i}-${side}-${dir}`,position:new THREE.Vector3(side*1.04,1.22,seatZ-dir*.06),stand:new THREE.Vector3(side*.13,1.66,seatZ-dir*.17),side,bay:i,dir,z:seatZ,occupied:(i===0&&side===-1&&dir===1)||(i===3&&side===1&&dir===-1)});
      }
      // Small wall-mounted table, with bevel and chrome support.
      b.round(.90,.045,.76,.035,m.wood,side*1.13,.82,z);
      b.box(.035,.42,.035,m.chrome,side*1.29,.60,z);
      b.box(.82,.018,.018,m.brass,side*1.13,.83,z-.38);
      colliders.push({minX:side===1?.64:-1.60,maxX:side===1?1.60:-.64,minZ:z-.4,maxZ:z+.4});
      const number=label(`${i*8+1} — ${i*8+8}`,{width:.32,height:.10,bg:'#ded5b8',fg:'#484738'});number.position.set(side*1.555,2.05,z);number.rotation.y=-side*Math.PI/2;body.add(number);
    }
  }
  // Vestibule partitions, end doors, grab handles, small direction plates.
  for(const z of [-11.9,9.55]){
    b.box(1.14,2.16,.09,m.cream,-1.07,1.08,z);b.box(1.14,2.16,.09,m.cream,1.07,1.08,z);b.box(1.05,.24,.09,m.cream,0,2.28,z);
    if(z<0){b.box(.90,2.11,.06,m.green,0,1.06,z);b.box(.65,.75,.07,m.window,0,1.43,z+.04);}
    else{
      b.box(.025,2.13,.08,m.chrome,-.48,1.07,z);b.box(.025,2.13,.08,m.chrome,.48,1.07,z);
      const sign=label('白鹭湾方向  →',{width:.81,height:.18,bg:'#29473b',fg:'#e8ddbb'});sign.position.set(0,2.23,z-.06);sign.rotation.y=Math.PI;body.add(sign);
    }
  }
  b.box(3.27,.32,.13,m.green,0,-.12,11.95);
  b.box(3.27,1.8,.13,m.green,0,1.09,12.02);
  for(const side of [-1,1])b.cylinder(.018,.018,1.24,m.chrome,side*1.51,1.05,9.84);
  const door=new THREE.Group();door.position.set(-1.64,0,11.15);body.add(door);const db=new Batch(door);
  db.box(.08,2.05,1.13,m.green,0,1.025,-.565);db.box(.085,.72,.65,m.window,0,1.42,-.565);db.cylinder(.018,.018,.24,m.chrome,.07,1.0,-.98);db.finish();
  const carriagePlate=label('06  /  软 座',{width:.75,height:.16,bg:'#e7dbc1',fg:'#294439',border:true});carriagePlate.position.set(-1.74,.65,8.75);carriagePlate.rotation.y=-Math.PI/2;body.add(carriagePlate);
  const directionPlate=label('榆川  YUCHUAN  ↔  白鹭湾  BAILUWAN',{width:2.6,height:.30,bg:'#e4dfc9',fg:'#24483c',border:true});directionPlate.position.set(-1.74,.58,0);directionPlate.rotation.y=-Math.PI/2;body.add(directionPlate);
  // Fluorescent shades and slowly rotating old ceiling fans.
  const fans=[];const lamps=[];
  for(const z of [-7.6,-3.8,0,3.8,7.6]){
    b.round(.30,.075,1.02,.035,m.trim,0,2.57,z);
    b.round(.23,.045,.94,.02,m.lamp,0,2.51,z);
    const light=new THREE.PointLight('#ffdb96',1.9,5.3,2);light.position.set(0,2.23,z);body.add(light);lamps.push(light);
    const fan=new THREE.Group();fan.position.set(0,2.34,z+1.48);const fb=new Batch(fan);fb.cylinder(.09,.09,.09,m.cream,0,0,0);for(let k=0;k<3;k++){const a=k*Math.PI*2/3;fb.round(.12,.012,.32,.03,m.trim,Math.sin(a)*.16,-.03,Math.cos(a)*.16,a);}fb.finish();body.add(fan);fans.push(fan);
  }
  b.finish();
  // Chassis, wheel flanges, suspension and paired bogies.
  const ext=new Batch(body);
  ext.box(2.9,.25,22.4,m.dark,0,-.31,0);
  for(const z of [-8.1,8.1]){
    ext.box(2.6,.22,2.8,m.dark,0,-.57,z);
    for(const dz of [-.92,.92]){
      ext.cylinder(.085,.085,2.5,m.dark,0,-.72,z+dz,0,0,Math.PI/2);
      for(const x of [-1.05,1.05]){ext.cylinder(.39,.39,.15,m.dark,x,-.72,z+dz,0,0,Math.PI/2,24);ext.cylinder(.405,.405,.025,m.rail,x+Math.sign(x)*.08,-.72,z+dz,0,0,Math.PI/2,24);}
    }
    for(const x of [-1.18,1.18]){ext.box(.15,.30,2.4,m.dark,x,-.57,z);for(let j=0;j<4;j++)ext.cylinder(.07,.07,.3,m.rail,x,-.49,z+(j-1.5)*.32);}
  }
  ext.finish();
  // Other carriages establish the length of a real train when seen from the platform.
  for(const offset of [-49.3,-24.7,24.7]){
    const c=new Batch(body);c.box(3.24,2.17,23.7,m.green,0,1.0,offset);c.box(3.29,.12,23.7,m.cream,0,.94,offset);c.add(archGeometry(3.3,.54,23.7),m.ceiling,0,2.08,offset);
    for(const side of [-1,1])for(const z of bays){c.round(.025,1.0,2.6,.025,m.dark,side*1.636,1.44,offset+z);c.box(.03,.035,2.63,m.chrome,side*1.66,1.96,offset+z);c.box(.03,.035,2.63,m.chrome,side*1.66,.93,offset+z);}
    c.box(2.7,.32,22.4,m.dark,0,-.39,offset);
    for(const z of [-8,8])for(const x of [-1.04,1.04])for(const dz of [-.8,.8])c.cylinder(.39,.39,.16,m.dark,x,-.72,offset+z+dz,0,0,Math.PI/2,16);
    c.box(.8,.8,1.2,m.dark,0,.52,offset+12.1);c.finish();
  }
  // Warm human-scale props. The enamel tea is a real geometric object with a liquid surface.
  const props=new THREE.Group();body.add(props);const pb=new Batch(props);
  const cupPos=new THREE.Vector3(1.15,.845,.10);
  const cupShell=new THREE.LatheGeometry([[.035,0],[.055,0],[.060,.006],[.067,.123],[.066,.134],[.062,.134],[.060,.123],[.052,.012],[.035,.012]].map(v=>new THREE.Vector2(...v)),48);pb.add(cupShell,m.enamel,cupPos.x,cupPos.y,cupPos.z);cupShell.dispose();
  pb.cylinder(.060,.060,.004,m.tea,cupPos.x,cupPos.y+.132,cupPos.z,0,0,0,32);
  const rim=new THREE.TorusGeometry(.066,.004,8,40);pb.add(rim,m.seat,cupPos.x,cupPos.y+.132,cupPos.z,Math.PI/2);rim.dispose();
  const handle=new THREE.TorusGeometry(.043,.009,8,24,Math.PI*1.7);pb.add(handle,m.enamel,cupPos.x+.075,cupPos.y+.071,cupPos.z,0,0,-Math.PI*.85);handle.dispose();
  pb.cylinder(.073,.073,.009,m.enamel,1.35,.852,.30,0,0,0,32);
  pb.finish();
  const teaSurface=new THREE.Mesh(new THREE.CircleGeometry(.056,32),m.tea);teaSurface.rotation.x=-Math.PI/2;teaSurface.position.set(cupPos.x,cupPos.y+.136,cupPos.z);body.add(teaSurface);
  const ticketMap=canvasTexture(768,384,(c,w,h)=>{c.fillStyle='#d5b4a0';c.fillRect(0,0,w,h);c.strokeStyle='#9b6153';c.lineWidth=3;c.strokeRect(16,16,w-32,h-32);c.fillStyle='#563b32';c.font='bold 34px serif';c.fillText('中国铁路  CHINA RAILWAY',35,57);c.font='bold 66px serif';c.fillText('榆川  →  白鹭湾',35,155);c.font='25px monospace';c.fillText('K1988   06车  028号   软座',35,220);c.fillText('仅限当日当次车使用    ¥ 18.50',35,269);c.font='18px serif';c.fillText('愿你在路上，找到一点自己的时间。',35,329);for(let x=0;x<w;x+=12){c.fillStyle='#b08474';c.fillRect(x,0,5,5);c.fillRect(x,h-5,5,5);}});
  const ticket=new THREE.Mesh(new THREE.PlaneGeometry(.22,.11),new THREE.MeshStandardMaterial({map:ticketMap,roughness:.96,side:THREE.DoubleSide}));ticket.rotation.set(-Math.PI/2,0,-.28);ticket.position.set(.97,.848,-.19);body.add(ticket);
  const book=new Batch(body);book.round(.21,.035,.29,.008,m.seatEdge,-1.1,.86,-3.79);book.box(.20,.021,.275,m.cream,-1.1,.86,-3.79);book.finish();
  const cover=label('在路上',{width:.17,height:.23,bg:'#786d4f',fg:'#e2d9b8'});cover.rotation.x=-Math.PI/2;cover.position.set(-1.1,.884,-3.79);body.add(cover);
  placeModel(models.kettle,body,new THREE.Vector3(1.29,.845,3.87),.28,.6);
  placeModel(models.suitcase,body,new THREE.Vector3(-1.28,2.14,-3.45),.68,.15);
  placeModel(models.suitcase,body,new THREE.Vector3(1.28,2.14,7.50),.58,-.1);
  placeModel(models.suitcase,body,new THREE.Vector3(-1.04,.02,-8.0),.56,Math.PI*.4);
  // Floating dust and the warm steam rising from tea.
  const steamSprite=canvasTexture(64,64,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,248,225,.65)');g.addColorStop(1,'rgba(255,248,225,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const steamGeo=new THREE.BufferGeometry();steamGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(50*3),3));
  const steam=new THREE.Points(steamGeo,new THREE.PointsMaterial({map:steamSprite,color:'#e8e0cf',size:.085,transparent:true,opacity:.055,depthWrite:false}));body.add(steam);
  const dustPositions=[];for(let i=0;i<220;i++)dustPositions.push((Math.random()-.5)*3,Math.random()*2.3,(Math.random()-.5)*21);
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({map:steamSprite,color:'#ffe0a4',size:.013,opacity:.26,transparent:true,depthWrite:false}));body.add(dust);
  const passengers=createPassengers(body,m,bays);
  refineCarriage(body,m,bays);
  let doorAngle=1.42;
  return {root,body,seats,colliders,windows,passengers,cupPos,
    update(t,dt,j,settings){
      const target=j.doorsOpen?1.42:0;doorAngle+=(target-doorAngle)*(1-Math.exp(-dt*3));door.rotation.y=doorAngle;
      fans.forEach(f=>f.rotation.y=t*2.1);
      lamps.forEach((l,i)=>{l.intensity=(.65+j.environment.night*1.65+j.environment.tunnel*1.15)*(1+Math.sin(t*9.7+i*2)*.008);});
      m.lamp.emissiveIntensity=1.4+j.environment.night*1.0;
      const positions=steamGeo.attributes.position;
      for(let i=0;i<positions.count;i++){const age=(t*.18+i/positions.count)%1;positions.setXYZ(i,cupPos.x+Math.sin(age*8+i)*age*.035,cupPos.y+.15+age*.32,cupPos.z+Math.cos(age*7+i)*age*.026);}positions.needsUpdate=true;
      teaSurface.rotation.x=-Math.PI/2+Math.sin(j.distance*.4)*Math.min(j.speed/18,1)*.035;
      dust.rotation.y=Math.sin(t*.03)*.02;dust.position.y=Math.sin(t*.3)*.015;
      passengers.forEach((p,i)=>{p.userData.animate?.(t);p.rotation.z=Math.sin(t*.8+i)*.003;p.position.y=Math.sin(t*1.3+i)*.002;});
      m.window.opacity=.055+j.environment.night*.07+(settings.rain?.03:0);
      curtainTime.value=t;curtainWind.value=settings.windowOpen?1.5:.2;
      windows.forEach(glass=>{const open=glass.userData.upper&&settings.windowOpen&&glass.userData.key===settings.windowKey;const target=glass.userData.baseY-(open?.46:0);glass.position.y+=(target-glass.position.y)*(1-Math.exp(-dt*5));});
      rainPanes.forEach(({mesh,glass})=>{mesh.visible=!!settings.rain;mesh.position.y=glass.position.y;});dropletMap.offset.y=t*.008;
    }
  };
}
