import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'node:fs/promises';
import path from 'node:path';
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const source=path.resolve('../../work/source-models');
const output=path.resolve('public/assets/models');await fs.mkdir(output,{recursive:true});
for(const name of ['suitcase','kettle','bench']) {
 try {
  const doc=await io.read(path.join(source,name,name+'.gltf'));
  await doc.transform(dedup(),prune(),weld());
  if(name==='tree') await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:0.12,error:0.005,lockBorder:true}));
  await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
  await io.write(path.join(output,name+'.glb'),doc);
  const size=(await fs.stat(path.join(output,name+'.glb'))).size;
  console.log(name,Math.round(size/1024)+' KB');
 }catch(e){console.error(name,e);process.exitCode=1;}
}
