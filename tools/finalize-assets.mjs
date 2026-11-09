import fs from 'node:fs/promises';
const root='public/assets';
let report=JSON.parse(await fs.readFile(root+'/landscape-manifest.json','utf8'));
const entries=new Map(report.map(x=>[x.name,x]));
for(const file of await fs.readdir(root+'/models')){
 if(!file.endsWith('.glb'))continue;
 const data=await fs.readFile(root+'/models/'+file),name=file.slice(0,-4);
 const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
 let triangles=0;for(const mesh of json.meshes||[])for(const p of mesh.primitives){if(p.mode&&p.mode!==4)continue;triangles+=(json.accessors[p.indices??p.attributes.POSITION].count)/3;}
 entries.set(name,{...(entries.get(name)||{}),name,after:triangles,bytes:data.length});
}
await fs.writeFile(root+'/landscape-manifest.json',JSON.stringify([...entries.values()].sort((a,b)=>a.name.localeCompare(b.name)),null,2));
for(const file of ['landscape-credits.json','forest-credits.json']){
 const credits=JSON.parse(await fs.readFile(root+'/'+file,'utf8'));
 for(const entry of credits){if(entry.type==='Full photogrammetry 3D model')entry.type='Optimized 3D model derived from the source asset';}
 await fs.writeFile(root+'/'+file,JSON.stringify(credits.filter(x=>x.type!=='HDRI landscape'),null,2));
}
const replacements=[
 ['src/ui.js',[['稻田 / 旧江大桥 / 临江村','河谷草甸 / 旧江大桥 / 杉林山谷']]],
 ['src/main.js',[[">稻田</button>",">草甸</button>"],['你看，村子里的灯亮了。','你看，河对岸的杉树。']]]
];
for(const [file,pairs]of replacements){let s=await fs.readFile(file,'utf8');for(const [a,b]of pairs)s=s.replaceAll(a,b);await fs.writeFile(file,s);}
const file='src/scenery.js';let s=await fs.readFile(file,'utf8');const start=s.indexOf('export function treeImpostor('),end=s.indexOf('export function createScenery(');if(start!==-1&&end>start){s=s.slice(0,start)+s.slice(end);await fs.writeFile(file,s);}
console.log('Inventoried',entries.size,'GLB files; merged credits and route labels.');
