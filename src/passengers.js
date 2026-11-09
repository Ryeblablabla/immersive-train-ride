import * as THREE from 'three';
import {Batch,random} from './geometry.js';
import {canvasTexture} from './materials.js';

function clothTexture(seed){
 const rng=random(seed);return canvasTexture(512,512,(c,w,h)=>{
  c.fillStyle='#b4b0a5';c.fillRect(0,0,w,h);
  for(let x=0;x<w;x+=3){c.strokeStyle=x%2?'#c1bbae':'#8c8d83';c.globalAlpha=.2;c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
  for(let y=0;y<h;y+=3){c.strokeStyle='#ded8c7';c.globalAlpha=.17;c.fillRect(0,y,w,1);}
  for(let i=0;i<11000;i++){c.globalAlpha=.08+rng()*.12;c.fillStyle=rng()<.5?'#fff':'#282e2b';c.fillRect(rng()*w,rng()*h,1,1);}
 });
}
function loft(rings,n=40){
 const p=[],uv=[],idx=[];
 rings.forEach(([y,rx,front,back,cz=0],j)=>{for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,cs=Math.cos(a);p.push(Math.sin(a)*rx,y,cz-cs*(cs>=0?front:back));uv.push(i/n,j/(rings.length-1));}});
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function ellipsoid(b,m,x,y,z,rx,ry,rz){const g=new THREE.SphereGeometry(1,28,20);b.add(g,m,x,y,z,0,0,0,rx,ry,rz);g.dispose();}
function line(b,m,points,r=.002){const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*5),r,6,false);b.add(g,m);g.dispose();}
function limb(b,m,a,mid,end,r1,r2){
 const curve=new THREE.CatmullRomCurve3([a,mid,end].map(p=>new THREE.Vector3(...p)));const g=new THREE.TubeGeometry(curve,16,r1,12,false);
 const p=g.attributes.position;for(let i=0;i<p.count;i++){const t=Math.floor(i/13)/16,center=curve.getPointAt(Math.min(1,t));const scale=THREE.MathUtils.lerp(1,r2/r1,t);p.setXYZ(i,center.x+(p.getX(i)-center.x)*scale,center.y+(p.getY(i)-center.y)*scale,center.z+(p.getZ(i)-center.z)*scale);}g.computeVertexNormals();b.add(g,m);g.dispose();
 ellipsoid(b,m,...a,r1,r1,r1);ellipsoid(b,m,...end,r2,r2,r2);
}
function hand(b,skin,side,y,z){
 const x=side*.15;ellipsoid(b,skin,x,y,z,.031,.018,.045);
 for(let f=0;f<4;f++){const xx=x+side*(f-1.5)*.013,zz=z-.025-(f===0||f===3?.002:.012);line(b,skin,[[xx,y,zz],[xx-side*.004,y-.003,zz-.025],[xx-side*.008,y-.014,zz-.035]],.0062);}
 line(b,skin,[[x-side*.026,y,z+.012],[x-side*.043,y-.008,z-.007],[x-side*.032,y-.013,z-.025]],.009);
}
function headModel(female,skin,hair,features){
 const head=new THREE.Group(),b=new Batch(head);
 const g=loft([[0,.018,.028,.020],[.014,.036,.046,.027],[.040,.054,.063,.038],[.073,.071,.074,.058],[.110,.078,.078,.073],[.145,.076,.073,.079],[.180,.064,.058,.065],[.209,.040,.034,.037],[.220,.001,.001,.001]],48);
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(z<0){const nose=Math.exp(-((x/.016)**2))*Math.exp(-(((y-.108)/.04)**2))*.010;p.setZ(i,z-nose);}}
 g.computeVertexNormals();b.add(g,skin);g.dispose();
 for(const side of [-1,1]){
  ellipsoid(b,skin,side*.079,.112,.008,.015,.027,.010);
  line(b,features.ear,[[side*.083,.130,.004],[side*.090,.119,.001],[side*.087,.100,.002]],.003);
 }
 ellipsoid(b,skin,0,.101,-.084,.011,.014,.012);ellipsoid(b,skin,-.009,.094,-.082,.007,.006,.006);ellipsoid(b,skin,.009,.094,-.082,.007,.006,.006);
 line(b,features.lip,[[-.021,.053,-.064],[-.009,.055,-.073],[0,.052,-.076],[.009,.055,-.073],[.021,.053,-.064]],.0022);
 line(b,features.lip,[[-.017,.049,-.068],[0,.047,-.075],[.017,.049,-.068]],.0016);
 for(const s of [-1,1]){
  line(b,hair,[[s*.019,.154,-.075],[s*.033,.159,-.073],[s*.046,.153,-.063]],female?.0022:.003);
  line(b,skin,[[s*.019,.134,-.079],[s*.031,.140,-.081],[s*.045,.134,-.073]],.0035);
  line(b,features.ear,[[s*.021,.126,-.078],[s*.032,.124,-.080],[s*.043,.128,-.072]],.0012);
 }
 const hg=new THREE.SphereGeometry(.085,40,28,0,Math.PI*2,0,Math.PI*.55);const hp=hg.attributes.position;
 for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);const front=Math.max(0,-z/.085);hp.setXYZ(i,x*(female?1.06:1.02),y*1.18+front*.025,z*1.03);}
 hg.computeVertexNormals();b.add(hg,hair,0,.134,.005);hg.dispose();
 if(female){ellipsoid(b,hair,0,.094,.063,.075,.104,.041);for(const s of [-1,1])ellipsoid(b,hair,s*.073,.077,.015,.018,.069,.038);}
 b.finish();
 const eyes=[];
 for(const s of [-1,1]){
  const eye=new THREE.Group();eye.position.set(s*.032,.132,-.077);head.add(eye);
  const white=new THREE.Mesh(new THREE.SphereGeometry(.011,20,14),features.white);white.scale.set(1,.55,.48);eye.add(white);
  const iris=new THREE.Mesh(new THREE.SphereGeometry(.0043,16,12),features.iris);iris.scale.set(1,1,.3);iris.position.set(-s*.001,0,-.005);eye.add(iris);
  const pupil=new THREE.Mesh(new THREE.SphereGeometry(.0022,12,10),features.pupil);pupil.scale.z=.2;pupil.position.set(-s*.001,0,-.0063);eye.add(pupil);eyes.push(eye);
 }
 head.userData.eyes=eyes;return head;
}
function readingMaterial(){return new THREE.MeshStandardMaterial({map:canvasTexture(1024,1024,(c,w,h)=>{
 c.fillStyle='#d3c6a9';c.fillRect(0,0,w,h);c.fillStyle='#384037';c.textAlign='center';c.font='bold 74px serif';c.fillText('旅 人 日 报',w/2,110);c.font='22px serif';c.fillText('晚刊 · 留一点时间给窗外',w/2,156);c.fillRect(38,181,w-76,3);c.font='bold 40px serif';c.fillText('慢车驶过山的另一面',w/2,250);
 for(let col=0;col<5;col++)for(let row=0;row<61;row++){c.fillStyle=row%8?'#93917b':'#5b6554';c.fillRect(40+col*196,286+row*11,160-(row%7)*6,2);}c.fillStyle='#697b6d';c.fillRect(45,315,345,205);c.fillStyle='#9eaa91';c.beginPath();c.moveTo(45,520);c.lineTo(160,359);c.lineTo(245,441);c.lineTo(315,337);c.lineTo(390,520);c.fill();
 }),side:THREE.DoubleSide,roughness:1});}

export function createPassengers(body,m,bays){
 const passengers=[],weave=clothTexture(834),paperMat=readingMaterial();
 weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(3,3);
 for(let person=0;person<2;person++){
  const female=person===0,side=female?-1:1,dir=female?1:-1,bay=female?0:3;
  const group=new THREE.Group();group.name=female?'Window traveller':'Evening reader';group.position.set(side*1.03,0,bays[bay]+dir*1.03);group.rotation.y=dir===1?0:Math.PI;body.add(group);
  const coat=new THREE.MeshStandardMaterial({color:female?'#53665b':'#6c5d4a',map:weave,bumpMap:weave,bumpScale:.0008,roughness:.96});
  const trousers=new THREE.MeshStandardMaterial({color:female?'#343c42':'#3b4038',map:weave,roughness:.96});
  const skin=new THREE.MeshStandardMaterial({color:female?'#cba38c':'#bb9175',roughness:.69});
  const hair=new THREE.MeshStandardMaterial({color:female?'#342c25':'#51483c',map:weave,roughness:.76});
  const seam=new THREE.MeshStandardMaterial({color:female?'#394a42':'#514535',roughness:1});
  const features={ear:new THREE.MeshStandardMaterial({color:'#9d765f',roughness:1}),lip:new THREE.MeshStandardMaterial({color:female?'#a7786d':'#947164',roughness:.86}),white:new THREE.MeshStandardMaterial({color:'#b3b1a3',roughness:.48}),iris:new THREE.MeshStandardMaterial({color:'#554e34',roughness:.4}),pupil:new THREE.MeshStandardMaterial({color:'#202723',roughness:.32})};
  const b=new Batch(group),torso=loft([[.53,.126,.10,.09],[.61,.142,.10,.09],[.79,.145,.103,.075],[.96,.179,.095,.074],[1.015,.181,.079,.065],[1.065,.116,.061,.045],[1.09,.051,.038,.031]],40);b.add(torso,coat);torso.dispose();
  b.cylinder(.035,.041,.095,skin,0,1.12,0,0,0,0,24);
  for(const s of [-1,1]){
   const handY=female?.705:.825,handZ=female?-.29:-.305;
   limb(b,coat,[s*.167,.993,.003],[s*.205,.851,-.042],[s*.17,handY+.027,handZ+.043],.058,.037);
   hand(b,skin,s,handY,handZ);
   limb(b,trousers,[s*.084,.507,-.005],[s*.09,.486,-.19],[s*.095,.462,-.34],.074,.061);
   limb(b,trousers,[s*.095,.459,-.34],[s*.095,.28,-.365],[s*.095,.104,-.39],.056,.039);
   b.round(.112,.073,.237,.032,m.dark,s*.095,.062,-.44);
   b.round(.114,.012,.241,.006,m.black,s*.095,.025,-.44);
   for(let k=0;k<4;k++)line(b,m.trim,[[s*.095-.033,.101-k*.002,-.415-k*.013],[s*.095+.033,.101-k*.002,-.418-k*.013]],.0015);
   line(b,seam,[[s*.18,.999,-.02],[s*.19,.91,-.07],[s*.17,handY+.04,handZ+.04]],.0016);
   line(b,seam,[[s*.117,.50,-.03],[s*.13,.48,-.21],[s*.13,.455,-.33]],.0015);
  }
  // A shaped collar, pocket welt, buttons and cloth folds establish real garments.
  for(const s of [-1,1]){
   const collar=new THREE.Shape();collar.moveTo(s*.032,1.10);collar.lineTo(s*.102,1.054);collar.lineTo(s*.049,1.001);collar.lineTo(0,1.075);collar.closePath();const cg=new THREE.ShapeGeometry(collar);cg.rotateY(Math.PI);b.add(cg,m.cream,0,0,-.072);cg.dispose();
   line(b,seam,[[s*.09,.95,-.096],[s*.102,.88,-.107],[s*.125,.83,-.102]],.002);
   line(b,seam,[[s*.05,.64,-.10],[s*.12,.63,-.095],[s*.14,.65,-.085]],.0016);
  }
  for(let y=.70;y<1.0;y+=.078)b.cylinder(.005,.005,.004,m.trim,0,y,-.109,Math.PI/2,0,0,12);
  line(b,seam,[[-.05,.88,-.110],[.06,.875,-.109],[.089,.893,-.100]],.002);
  b.finish();
  const head=headModel(female,skin,hair,features);head.position.set(0,1.16,-.004);head.rotation.y=female?.70:.12;head.rotation.x=female?-.015:.08;group.add(head);
  if(female){
   const book=new Batch(group);book.round(.245,.020,.20,.005,m.seatEdge,0,.665,-.285);book.box(.231,.013,.186,m.cream,0,.675,-.285);book.finish();
   const pages=new THREE.Mesh(new THREE.PlaneGeometry(.228,.18),paperMat);pages.rotation.x=-Math.PI/2;pages.position.set(0,.685,-.285);group.add(pages);
  }else{
   const pg=new THREE.PlaneGeometry(.43,.43,16,16),p=pg.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,.018*Math.cos(x*12)+Math.sin(p.getY(i)*14)*.003);}pg.computeVertexNormals();
   const newspaper=new THREE.Mesh(pg,paperMat);newspaper.rotation.set(-.30,Math.PI,0);newspaper.position.set(0,.927,-.346);newspaper.castShadow=true;group.add(newspaper);
  }
  group.userData.animate=t=>{
   head.rotation.y=(female?.70:.12)+Math.sin(t*.10+person)*.035;
   head.rotation.z=Math.sin(t*.18+person)*.014;
   const blink=(t+person*2.1)%5.9;for(const eye of head.userData.eyes)eye.scale.y=blink<.13?.12:1;
  };
  passengers.push(group);
 }
 return passengers;
}
