import * as THREE from 'three';
import { Batch, random, archGeometry } from './geometry.js';
import { label, canvasTexture } from './materials.js';
import { routeX, routeYaw, ROUTE_LENGTH, smoothstep } from './journey.js';
import { placeModel } from './train.js';
import {createLandscape,landHeight} from './landscape.js';

const trackPoint=(s,x=0,y=0)=>new THREE.Vector3(routeX(s)+x,y,-s);
export function createScenery(scene,m,models,waterNormals,forestAtlas){
  const relative=new THREE.Group();const world=new THREE.Group();relative.add(world);scene.add(relative);
  const stations=[];const landscape=createLandscape(world,m,models,waterNormals,forestAtlas);
  const houseWindow=new THREE.MeshStandardMaterial({color:'#c9ae70',emissive:'#e7a860',emissiveIntensity:.25,roughness:.6});
  // Ballast is a continuous ribbon following the surveyed route curve.
  const ballastGeo=new THREE.BufferGeometry();const bp=[],bu=[],bi=[];
  for(let i=0;i<=Math.ceil((ROUTE_LENGTH+1000)/8);i++){const s=-500+i*8;for(const x of [-2.1,2.1]){bp.push(routeX(s)+x,-1.36,-s);bu.push(x>0?1:0,s/25);}if(i>0){const a=(i-1)*2;bi.push(a,a+1,a+2,a+1,a+3,a+2);}}
  ballastGeo.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));ballastGeo.setAttribute('uv',new THREE.Float32BufferAttribute(bu,2));ballastGeo.setIndex(bi);ballastGeo.computeVertexNormals();const ballast=new THREE.Mesh(ballastGeo,m.gravel);ballast.receiveShadow=true;world.add(ballast);
  const track=new Batch(world);
  for(let s=-450;s<ROUTE_LENGTH+450;s+=2.5){const x=routeX(s);const yaw=routeYaw(s);track.box(2.65,.10,.19,m.sleeper,x,-1.30,-s,0,yaw);}
  for(let s=-450;s<ROUTE_LENGTH+450;s+=12){const yaw=routeYaw(s);for(const x of [-.7175,.7175]){track.box(.065,.12,12.05,m.rail,routeX(s)+x,-1.17,-s,0,yaw);track.box(.14,.025,12.05,m.rail,routeX(s)+x,-1.225,-s,0,yaw);}}
  // Telegraph poles, insulators and sagging wires add powerful near-field parallax.
  for(let s=-300;s<ROUTE_LENGTH+300;s+=58){
    const x=routeX(s)-9.6,y=landHeight(-9.6,s);track.cylinder(.09,.14,6.3,m.sleeper,x,y+3.15,-s);track.box(2.0,.10,.12,m.sleeper,x,y+5.9,-s);track.box(1.5,.10,.12,m.sleeper,x,y+5.2,-s);
    for(const dx of [-.8,-.35,.35,.8])track.cylinder(.06,.06,.16,m.enamel,x+dx,y+6.04,-s,0,0,0,6);
  }
  track.finish({castShadow:false});
  const wires=[];for(let lane=0;lane<4;lane++)for(let s=-300;s<ROUTE_LENGTH+300;s+=58){for(let k=0;k<8;k++){const a=k/8,b=(k+1)/8;const p=t=>trackPoint(s+t*58,-9.6+[-.8,-.35,.35,.8][lane],4.38-Math.sin(t*Math.PI)*.38);const p1=p(a),p2=p(b);wires.push(p1.x,p1.y,p1.z,p2.x,p2.y,p2.z);}}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));world.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:'#343b32',transparent:true,opacity:.7})));
  // Repeated steel bridge portals and stone piers.
  const bridge=new Batch(world);const steel=new THREE.MeshStandardMaterial({color:'#53625d',metalness:.6,roughness:.58});
  for(let s=2050;s<=2340;s+=18){
    const x=routeX(s),yaw=routeYaw(s);
    for(const side of [-1,1]){bridge.box(.20,5.5,.24,steel,x+side*2.5,1.4,-s);bridge.box(.18,.22,18.1,steel,x+side*2.5,4.1,-s-9,0,yaw);bridge.box(.16,.18,18.1,steel,x+side*2.5,-.65,-s-9,0,yaw);bridge.box(.13,5.9,.13,steel,x+side*2.5,1.7,-s-4.4,.72);}
    bridge.box(5.2,.18,.24,steel,x,4.1,-s);bridge.box(5.4,.32,18.0,m.concrete,x,-1.46,-s-9,0,yaw);
    if(s%36===34)bridge.box(5.0,5.0,1.3,m.concrete,x,-4,-s);
  }bridge.finish();
  // Tunnel lining is a real 450 m enclosure rather than a screen fade.
  const tunnelMat=new THREE.MeshStandardMaterial({color:'#615e51',roughness:.99,side:THREE.DoubleSide});const tunnel=new Batch(world);
  for(let s=4200;s<4650;s+=10){const x=routeX(s),yaw=routeYaw(s);const arch=archGeometry(8.0,4.6,10.1);tunnel.add(arch,tunnelMat,x,-1.05,-s-5,0,yaw);arch.dispose();
    tunnel.box(.35,2.5,10.1,tunnelMat,x-4,-.4,-s-5,0,yaw);tunnel.box(.35,2.5,10.1,tunnelMat,x+4,-.4,-s-5,0,yaw);
    if(s%50===0)for(const side of [-1,1]){tunnel.box(.08,.15,.32,m.lamp,x+side*3.92,1.1,-s);tunnel.box(.13,.35,.38,m.dark,x+side*3.96,1.1,-s);}
  }
  for(const s of [4200,4650]){const x=routeX(s);for(let k=0;k<19;k++){const a=k/18*Math.PI;const px=x+Math.cos(a)*4.2,py=-1.05+Math.sin(a)*4.8;tunnel.box(.72,.65,1.0,m.concrete,px,py,-s,0,0,a-Math.PI/2);}const plate=label('青 山 隧 道',{width:2.3,height:.42,bg:'#ada98d',fg:'#343d34'});plate.position.set(x,4.1,-s+.55);world.add(plate);}
  tunnel.finish();
  for(const [s,name,roman]of [[0,'榆川','YUCHUAN'],[ROUTE_LENGTH,'白鹭湾','BAILUWAN']]){
    const station=new THREE.Group();station.position.copy(trackPoint(s));station.rotation.y=routeYaw(s);world.add(station);stations.push(station);const sb=new Batch(station);
    sb.box(10,.95,140,m.concrete,-6.85,-.475,0);sb.box(.18,.12,140,m.cream,-1.89,.04,0);sb.box(.15,.015,137,m.brass,-2.44,.01,0);
    for(let z=-65;z<65;z+=1.7)for(let x=-2.9;x>-11.6;x-=1.7)sb.box(1.67,.008,.018,m.trim,x,.013,z);
    const roof=new THREE.MeshStandardMaterial({color:'#48554b',metalness:.43,roughness:.57});
    sb.box(6.8,.13,77,roof,-7.3,3.65,0,0,0,-.06);
    for(let z=-35;z<=35;z+=10){sb.box(.16,3.55,.16,m.green,-8.9,1.77,z);sb.box(.19,.70,.19,m.cream,-8.9,.35,z);sb.box(5.5,.13,.13,m.green,-6.9,3.40,z);sb.box(.10,1.2,.1,m.green,-8.35,3.0,z,0,0,-.7);sb.box(.15,.05,1.6,m.lamp,-7,3.46,z);}
    const stationWall=new THREE.MeshStandardMaterial({color:'#c4b79a',roughness:1});const roofTile=new THREE.MeshStandardMaterial({color:'#6a5040',roughness:.94});
    sb.box(7,4.4,38,stationWall,-15,2.2,-8);sb.box(4.2,.16,40,roofTile,-13.3,5.02,-8,0,0,-.3);sb.box(4.2,.16,40,roofTile,-16.7,5.02,-8,0,0,.3);
    for(let z=-24;z<=8;z+=8){sb.box(.06,2.1,2.8,m.green,-11.46,1.8,z);sb.box(.07,1.8,2.5,houseWindow,-11.41,1.83,z);sb.box(.08,2.0,.08,m.cream,-11.36,1.8,z);}
    sb.box(.06,2.8,2.6,m.green,-11.42,1.4,16);sb.box(.07,2.3,2.2,m.dark,-11.37,1.4,16);
    const sign=label(`${name}   ${roman}`,{width:5.6,height:.92,bg:'#e4dfc7',fg:'#274333',border:true});sign.position.set(-11.34,3.42,-7);sign.rotation.y=Math.PI/2;station.add(sign);
    for(const z of [-37,37]){
      sb.box(.08,2.6,.08,m.green,-5.4,1.3,z);sb.box(.08,2.6,.08,m.green,-8.0,1.3,z);
      const p=label(`${name}  ${roman}`,{width:2.9,height:.78,bg:'#e7e2ca',fg:'#2c473a',border:true});p.position.set(-6.7,2.2,z);station.add(p);
      const p2=p.clone();p2.rotation.y=Math.PI;p2.position.z-=.02;station.add(p2);
    }
    for(let z=-56;z<=56;z+=28){
      sb.cylinder(.045,.065,3.7,m.green,-3.5,1.85,z);sb.cylinder(.25,.15,.12,m.trim,-3.5,3.66,z);sb.cylinder(.18,.18,.25,m.lamp,-3.5,3.5,z);
      const light=new THREE.PointLight('#ffd18a',5,8,2);light.position.set(-3.5,3.3,z);station.add(light);
    }
    sb.finish();
    placeModel(models.bench,station,new THREE.Vector3(-7.8,.01,-18),2.4,-Math.PI/2);placeModel(models.bench,station,new THREE.Vector3(-7.8,.01,16),2.4,-Math.PI/2);
    placeModel(models.suitcase,station,new THREE.Vector3(-7.4,.01,14.4),.62,.2);
    const marker=new THREE.Mesh(new THREE.RingGeometry(.30,.34,48),new THREE.MeshBasicMaterial({color:'#efd6a1',transparent:true,opacity:.68,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(-2.8,.025,10.55);station.add(marker);
  }
  const flyGeo=new THREE.BufferGeometry();const flyPositions=[];const rng=random(581);for(let i=0;i<120;i++)flyPositions.push((rng()-.5)*80,-.5+rng()*3,(rng()-.5)*180);flyGeo.setAttribute('position',new THREE.Float32BufferAttribute(flyPositions,3));
  const glow=canvasTexture(64,64,(c,w,h)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff2b0');g.addColorStop(.2,'rgba(255,224,130,.7)');g.addColorStop(1,'rgba(255,224,130,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const flies=new THREE.Points(flyGeo,new THREE.PointsMaterial({map:glow,size:.08,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));scene.add(flies);
  const rainPositions=new Float32Array(1500*6);for(let i=0;i<rainPositions.length;i+=6){let x=(rng()-.5)*70;const z=(rng()-.5)*90,y=rng()*16;if(Math.abs(x)<2&&Math.abs(z)<13)x+=x<0?-3:3;rainPositions.set([x,y,z,x-.06,y-.6,z+.12],i);}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(rainPositions,3));const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#bbc9c7',transparent:true,opacity:.23,depthWrite:false}));scene.add(rain);
  return {relative,world,stations,landscape,
    update(t,j,settings){
      const s=j.distance,yaw=routeYaw(s);relative.rotation.y=-yaw;world.position.set(-routeX(s),0,s);
      landscape.update(t,j,settings);const night=j.environment.night;houseWindow.emissiveIntensity=.2+night*1.5;
      landscape.water.material.uniforms.sunDirection.value.set(.86,.24,-.4).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw).normalize();
      flies.material.opacity=night*.55*(1-j.environment.tunnel);flies.position.y=Math.sin(t*.3)*.2;
      rain.visible=settings.rain;rain.position.y=-(t*8)%16;
    }
  };
}
