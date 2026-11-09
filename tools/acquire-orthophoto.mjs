import fs from 'node:fs/promises';
import sharp from 'sharp';
const cache='../../work/terrain/swissimage';await fs.mkdir(cache,{recursive:true});
const z=14,n=4096,lat=46.58,lon=7.86;
const cx=Math.floor((lon+180)/360*n),cy=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const jobs=Array.from({length:256},(_,i)=>({x:(cx-2)*4+i%16,y:(cy-2)*4+Math.floor(i/16),i}));
let next=0,done=0;const images=[];
await Promise.all(Array.from({length:8},async()=>{while(next<jobs.length){
 const {x,y,i}=jobs[next++],file=`${cache}/${z}-${x}-${y}.jpg`;
 try{await fs.access(file);}catch{
  for(let attempt=0;;attempt++)try{
   const r=await fetch(`https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/${z}/${x}/${y}.jpeg`,{signal:AbortSignal.timeout(25000)});
   if(!r.ok)throw Error(`SWISSIMAGE ${r.status}: ${x},${y}`);const data=Buffer.from(await r.arrayBuffer());await sharp(data).metadata();await fs.writeFile(file,data);break;
  }catch(e){if(attempt===2)throw e;}
 }
 images[i]={input:await sharp(file).resize(256,256).toBuffer(),left:i%16*256,top:Math.floor(i/16)*256};
 done++;if(done%32===0)console.log(`SWISSIMAGE ${done}/256`);
}}));
const image=sharp({create:{width:4096,height:4096,channels:3,background:'#757b67'}}).composite(images);
const png=await image.png().toBuffer();
await sharp(png).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toFile('public/assets/terrain/alpine-orthophoto.jpg');
await fs.writeFile('public/assets/terrain/landcover.bin',await sharp(png).resize(256,256).removeAlpha().raw().toBuffer());
const metadata={name:'SWISSIMAGE orthophoto mosaic',attribution:'© swisstopo',source:'https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10',terms:'https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices',license:'swisstopo OGD: free use for all purposes with source acknowledgement',tiles:{z,x:[(cx-2)*4,(cx+2)*4-1],y:[(cy-2)*4,(cy+2)*4-1]},usage:'Fictionally recomposed terrain imagery, aligned with the source DEM, not a geographically exact railway.'};
await fs.writeFile('public/assets/terrain/orthophoto-source.json',JSON.stringify(metadata,null,2));console.log(metadata);
