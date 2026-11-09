import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, simplifyPrimitive, meshopt, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'node:fs/promises';
import path from 'node:path';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});
const source=path.resolve('../../work/source-models'), output=path.resolve('public/assets/models');
const report=[];
// Photogrammetry foliage consists of thousands of disconnected leaves. An edge
// simplifier cannot reduce those islands. Retain whole leaves deterministically,
// enlarging each retained leaf slightly; never sample individual triangles.
function thinLeaves(doc,fraction){
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
  if(!/leaves|twig/.test(p.getMaterial()?.getName()||''))continue;
  const pos=p.getAttribute('POSITION'), idx=p.getIndices(), a=idx.getArray(), n=pos.getCount();
  const parent=Int32Array.from({length:n},(_,i)=>i);
  const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
  for(let i=0;i<a.length;i+=3){const r=find(a[i]);parent[find(a[i+1])]=r;parent[find(a[i+2])]=r;}
  const components=new Map();for(let i=0;i<a.length;i+=3){const r=find(a[i]);let list=components.get(r);if(!list)components.set(r,list=[]);list.push(a[i],a[i+1],a[i+2]);}
  const selected=[];let sequence=0;
  for(const values of components.values()){
   sequence++;const hash=((Math.imul(sequence,2654435761)>>>0)/4294967296);
   if(hash>fraction)continue;
   selected.push(...values);
   const vertices=[...new Set(values)],c=[0,0,0];for(const v of vertices){const q=pos.getElement(v,[]);c.forEach((_,k)=>c[k]+=q[k]/vertices.length);}
   for(const v of vertices){const q=pos.getElement(v,[]);pos.setElement(v,q.map((x,k)=>c[k]+(x-c[k])*1.65));}
  }
  idx.setArray(new Uint32Array(selected));
 }
}
const specs=process.argv.includes('--forest')?[['fir',.08],['mountainside',.3],['granite',.25]]:process.argv.includes('--trees')?[['tree',.11],['tree-b',.07]]:process.argv.includes('--rocks')?[['cliff-a',.2],['cliff-b',.14],['shore',.15]]:[['cliff-a',.2],['cliff-b',.14],['shore',.15],['rock-face',.65],['moss-rocks',.45],['tree',.11],['tree-b',.07],['flowers',.22],['ferns',.3]];
for(const [name,ratio] of specs)for(const lod of (name.startsWith('tree')||name==='fir'||name==='mountainside'||name==='granite'||name.startsWith('cliff')||name==='shore'?['','-lod']:[''])){
 const doc=await io.read(path.join(source,name,name+'.gltf'));
 const triangles=()=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
 const before=triangles(), bounds=getBounds(doc.getRoot().listScenes()[0]);
 const tree=name.startsWith('tree')||name==='fir';
 if(tree)thinLeaves(doc,lod?(name==='fir'?.008:.012):.065);
 await doc.transform(dedup(),prune(),weld());
 if(tree){
  for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(!/leaves|twig/.test(p.getMaterial()?.getName()||''))simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:lod?ratio*.4:ratio,error:.02,lockBorder:false});
 }else await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:lod?.025:ratio,error:lod?.018:.004,lockBorder:!lod}));
 const after=triangles();
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
 const file=path.join(output,name+lod+'.glb');await io.write(file,doc);
 const entry={name:name+lod,before,after,bounds,bytes:(await fs.stat(file)).size};report.push(entry);console.log(JSON.stringify(entry));
}
const manifest=path.resolve('public/assets/landscape-manifest.json');
let previous=[];try{previous=JSON.parse(await fs.readFile(manifest,'utf8'));}catch{}
const merged=new Map(previous.map(entry=>[entry.name,entry]));
for(const entry of report)merged.set(entry.name,entry);
await fs.writeFile(manifest,JSON.stringify([...merged.values()],null,2));
