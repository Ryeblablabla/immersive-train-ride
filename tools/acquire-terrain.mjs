import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('../../work/terrain');await fs.mkdir(root,{recursive:true});
const z=12,lat=46.58,lon=7.86,n=2**z;
const cx=Math.floor((lon+180)/360*n),cy=Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*n);
const tiles=[];
await Promise.all(Array.from({length:16},async(_,i)=>{
 const x=cx-2+i%4,y=cy-2+Math.floor(i/4),file=path.join(root,`${z}-${x}-${y}.png`);
 try{await fs.access(file);}catch{const r=await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`);if(!r.ok)throw Error('Terrain '+r.status);await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));}
 tiles[i]={file,x:i%4,y:Math.floor(i/4)};
}));
const heights=new Float32Array(1024*1024);let min=Infinity,max=-Infinity;
for(const t of tiles){const {data,info}=await sharp(t.file).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(let j=0;j<256;j++)for(let i=0;i<256;i++){const k=(j*256+i)*info.channels,h=data[k]*256+data[k+1]+data[k+2]/256-32768;heights[(j+t.y*256)*1024+t.x*256+i]=h;min=Math.min(min,h);max=Math.max(max,h);}}
await fs.mkdir('public/assets/terrain',{recursive:true});await fs.writeFile('public/assets/terrain/alpine-height.bin',Buffer.from(heights.buffer));
const gray=Buffer.alloc(1024*1024);heights.forEach((h,i)=>gray[i]=(h-min)/(max-min)*255);await sharp(gray,{raw:{width:1024,height:1024,channels:1}}).png().toFile(path.join(root,'height-preview.png'));
const meta={width:1024,height:1024,min,max,center:[lat,lon],zoom:z,source:'https://registry.opendata.aws/terrain-tiles/',attribution:'Elevation tiles by Mapzen / AWS Open Data; source elevation data from SRTM and other open datasets.',usage:'Real Alpine elevation sampled and recomposed for a fictional railway; not a geographically exact route.'};
await fs.writeFile('public/assets/terrain/source.json',JSON.stringify(meta,null,2));console.log(meta);
