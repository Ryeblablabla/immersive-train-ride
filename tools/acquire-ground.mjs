import fs from 'node:fs/promises';
const names=['aerial_grass_rock','cliff_side','aerial_rocks_04'];const credits=[];
await Promise.all(names.map(async id=>{
 const data=await(await fetch('https://api.polyhaven.com/files/'+id)).json();
 for(const [key,suffix]of [['Diffuse','color'],['nor_gl','normal'],['Rough','roughness']]){
  const item=data[key]?.['2k']?.jpg;if(!item){console.log(id,key,'missing',Object.keys(data));continue;}
  const file='public/assets/textures/'+id+'-'+suffix+'.jpg';
  try{if((await fs.stat(file)).size===item.size)continue;}catch{}
  const r=await fetch(item.url,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(r.status);await fs.writeFile(file,Buffer.from(await r.arrayBuffer()));console.log(file);
 }
 credits.push({id,source:'https://polyhaven.com/a/'+id,license:'CC0',resolution:'2k',usage:'Seamless landscape PBR texture'});
}));await fs.writeFile('public/assets/ground-credits.json',JSON.stringify(credits,null,2));
