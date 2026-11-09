import * as THREE from 'three';
import {Batch,random} from './geometry.js';
import {canvasTexture,label} from './materials.js';

function tube(b,material,points,r=.004,closed=false){const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),Math.max(16,points.length*3),r,7,closed);b.add(geo,material);geo.dispose();}
function piping(b,material,x,y,z,w,d,r=.045){
 const points=[];for(let k=0;k<4;k++){const a=k*Math.PI/2,cx=x+Math.cos(a+Math.PI/4)*(w/2-r)*Math.SQRT2,cz=z+Math.sin(a+Math.PI/4)*(d/2-r)*Math.SQRT2;for(let j=0;j<=5;j++){const theta=a+j/5*Math.PI/2;points.push([cx+Math.cos(theta)*r,y,cz+Math.sin(theta)*r]);}}tube(b,material,points,.003,true);
}
export function refineCarriage(body,m,bays){
 const b=new Batch(body),rubber=new THREE.MeshStandardMaterial({color:'#2b3028',roughness:.96}),stitch=new THREE.MeshStandardMaterial({color:'#8c6551',roughness:.95});
 const painted=canvasTexture(512,512,(c,w,h)=>{const rng=random(71);c.fillStyle='#999';c.fillRect(0,0,w,h);for(let i=0;i<16000;i++){c.globalAlpha=.05+rng()*.08;c.fillStyle=rng()<.5?'#fff':'#000';c.fillRect(rng()*w,rng()*h,rng()*2+.2,.5);}for(let i=0;i<30;i++){c.globalAlpha=.04;c.strokeStyle='#222';c.beginPath();c.moveTo(rng()*w,rng()*h);c.lineTo(rng()*w,rng()*h);c.stroke();}});
 painted.wrapS=painted.wrapT=THREE.RepeatWrapping;painted.repeat.set(2,3);m.cream.bumpMap=painted;m.cream.bumpScale=.0007;m.green.bumpMap=painted;m.green.bumpScale=.0005;
 const fabric=new THREE.MeshStandardMaterial({color:'#dfd6be',map:painted,bumpMap:painted,bumpScale:.00035,roughness:1,side:THREE.DoubleSide});
 for(const side of [-1,1])for(const z of bays){
  const x=side*1.63;
  // Rubber glazing gaskets, catches and slotted screws have their actual scale.
  for(const edge of [-1,1]){
   b.round(.025,1.016,.014,.006,rubber,x-side*.063,1.44,z+edge*1.347);
   b.round(.026,.014,2.68,.006,rubber,x-side*.065,1.44+edge*.498,z);
   for(const yy of [1.01,1.88]){b.cylinder(.006,.006,.003,m.chrome,x-side*.104,yy,z+edge*1.36,0,0,Math.PI/2,12);b.box(.004,.001,.006,m.dark,x-side*.107,yy,z+edge*1.36);}
   b.round(.035,.052,.105,.008,m.trim,x-side*.119,1.49,z+edge*1.12);
   b.round(.030,.018,.071,.005,m.chrome,x-side*.145,1.485,z+edge*1.095);
  }
  b.round(.16,.027,2.81,.011,m.wood,x-side*.045,.928,z);
  // Headrest cloth has hanging fabric thickness, rolled hems and gentle folds.
  for(const dir of [-1,1]){
   const sx=side*.98,sz=z+dir*1.03;
   piping(b,stitch,sx,.574,sz,1.02,.63);
   for(const dx of [-.235,.235])tube(b,stitch,[[sx+dx,.575,sz-.26],[sx+dx,.572,sz],[sx+dx,.575,sz+.26]],.0015);
   tube(b,m.seatEdge,[[sx-.49,.59,sz+dir*.223],[sx-.49,1.11,sz+dir*.223],[sx-.45,1.18,sz+dir*.223],[sx+.45,1.18,sz+dir*.223],[sx+.49,1.11,sz+dir*.223],[sx+.49,.59,sz+dir*.223]],.003);
   const cloth=new THREE.PlaneGeometry(.38,.224,16,12),p=cloth.attributes.position;
   for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i);p.setZ(i,Math.sin(px*72)*.0025+Math.cos(py*22)*.002);}cloth.computeVertexNormals();
   b.add(cloth,fabric,sx,1.085,sz+dir*.219,0,dir===1?Math.PI:0);cloth.dispose();
   tube(b,fabric,[[sx-.188,.979,sz+dir*.213],[sx, .976,sz+dir*.213],[sx+.188,.979,sz+dir*.213]],.002);
   b.cylinder(.011,.011,.88,m.chrome,sx,.164,sz-dir*.24,0,0,Math.PI/2,12);
   for(const dx of [-.40,.40]){b.round(.09,.018,.07,.007,rubber,sx+dx,.028,sz);b.cylinder(.004,.004,.009,m.chrome,sx+dx,.594,sz-dir*.319,Math.PI/2,0,0,10);}
  }
  // A small wire wastebasket tucked under each table.
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2;tube(b,m.chrome,[[side*1.43+Math.cos(a)*.095,.16,z+Math.sin(a)*.075],[side*1.43+Math.cos(a)*.12,.42,z+Math.sin(a)*.095]],.0025);}
  for(const yy of [.18,.40]){const ring=[];for(let j=0;j<24;j++){const a=j/24*Math.PI*2;ring.push([side*1.43+Math.cos(a)*(yy===.18?.097:.12),yy,z+Math.sin(a)*(yy===.18?.077:.095)]);}tube(b,m.chrome,ring,.003,true);}
 }
 for(const z of bays){
  // Fixed cage around the moving ceiling fan. The rotor remains independently animated.
  const fz=z+1.48;
  for(let ring=0;ring<4;ring++){const radius=.105+ring*.067,y=2.315-Math.sin(ring/3*Math.PI/2)*.018;const g=new THREE.TorusGeometry(radius,.0025,6,48);b.add(g,m.chrome,0,y,fz,Math.PI/2);g.dispose();}
  for(let j=0;j<16;j++){const a=j/16*Math.PI*2;tube(b,m.chrome,[[Math.cos(a)*.07,2.29,fz+Math.sin(a)*.07],[Math.cos(a)*.20,2.291,fz+Math.sin(a)*.20],[Math.cos(a)*.32,2.32,fz+Math.sin(a)*.32]],.0023);}
  b.cylinder(.026,.026,.18,m.trim,0,2.48,fz,0,0,0,20);
  for(const sx of [-.36,.36])for(let k=0;k<8;k++)b.round(.003,.008,.047,.001,rubber,sx,2.565,z-.18+k*.051);
 }
 for(const z of [-9.2,-5.4,-1.6,2.2,6,9.4])for(const side of [-1,1]){
  b.round(.035,.12,.055,.008,m.trim,side*1.554,1.68,z);
  tube(b,m.chrome,[[side*1.53,1.70,z],[side*1.48,1.68,z],[side*1.475,1.62,z],[side*1.50,1.61,z]],.007);
 }
 for(const x of [-.75,.75])b.box(.003,.003,20.8,m.trim,x,2.606,-.6);
 // Drainage grooves and threshold hardware in the vestibule.
 for(let k=0;k<9;k++)b.round(.006,.008,.72,.003,rubber,-.38+k*.095,.012,10.55);
 b.finish();

 const props=new THREE.Group();body.add(props);const p=new Batch(props);
 // Vacuum flask with a shaped shoulder, rolled base, cap, carrying handle and enamel badge.
 const flask=new THREE.LatheGeometry([[.045,0],[.056,.006],[.058,.025],[.058,.255],[.054,.273],[.036,.287],[.034,.305]].map(a=>new THREE.Vector2(...a)),48);p.add(flask,m.green,1.43,.846,-.27);flask.dispose();
 p.cylinder(.037,.037,.036,m.trim,1.43,1.169,-.27,0,0,0,40);p.cylinder(.057,.057,.008,m.chrome,1.43,.859,-.27,0,0,0,40);
 const cap=new THREE.TorusGeometry(.035,.0022,8,40);p.add(cap,m.chrome,1.43,1.187,-.27,Math.PI/2);cap.dispose();
 tube(p,m.chrome,[[1.43,.925,-.21],[1.43,1.105,-.182],[1.43,1.16,-.23]],.005);
 const badge=label('暖',{width:.031,height:.044,bg:'#c4b087',fg:'#3c4c3c',font:'32px serif'});badge.position.set(1.43,1.028,-.210);props.add(badge);
 const cupMark=label('旅',{width:.026,height:.030,bg:null,fg:'#4d665b'});cupMark.position.set(1.15,.926,.162);props.add(cupMark);
 // A woven overnight bag: seams, zipper teeth, leather handles and metal buckles.
 const canvas=new THREE.MeshStandardMaterial({color:'#77735a',map:painted,bumpMap:painted,bumpScale:.0008,roughness:.98});
 p.round(.42,.24,.22,.05,canvas,-1.29,2.267,3.70);
 for(const dx of [-.13,.13]){
  tube(p,m.seatEdge,[[-1.29+dx,2.18,3.589],[-1.29+dx,2.36,3.602],[-1.29+dx,2.40,3.70],[-1.29+dx,2.36,3.798],[-1.29+dx,2.18,3.811]],.009);
  tube(p,m.seatEdge,[[-1.29+dx-.05,2.39,3.68],[-1.29+dx-.03,2.49,3.68],[-1.29+dx+.03,2.49,3.68],[-1.29+dx+.05,2.39,3.68]],.010);
  p.round(.026,.033,.006,.004,m.brass,-1.29+dx,2.288,3.584);
 }
 for(let k=0;k<31;k++)p.box(.006,.003,.007,m.chrome,-1.47+k*.012,2.391,3.70);
 // A glass tumbler and a folded cloth sit on an otherwise empty table.
 const glass=new THREE.MeshPhysicalMaterial({color:'#c6d2bf',metalness:0,roughness:.09,transmission:.25,transparent:true,opacity:.55,thickness:.002,ior:1.47});
 const tumbler=new THREE.LatheGeometry([[.029,0],[.035,.005],[.037,.114],[.034,.118],[.032,.008],[.029,.006]].map(v=>new THREE.Vector2(...v)),40);p.add(tumbler,glass,-1.28,.846,-7.52);tumbler.dispose();
 p.round(.15,.012,.12,.006,fabric,-.99,.851,-7.55);
 p.finish();
 return {props};
}
