import * as THREE from 'three';

// Official CC0 tree renders serve distant woods; near trees retain scanned 3D.
export function forestMaterial(atlas){
 const material=new THREE.MeshBasicMaterial({map:atlas.texture,alphaTest:.16,side:THREE.DoubleSide,color:'#ffffff',fog:true,toneMapped:false});material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='attribute vec2 forestTile;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvMapUv=(uv+forestTile)*.5;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vec4 forestCenter=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
   vec2 forestSize=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
   vec4 mvPosition=forestCenter;mvPosition.xy+=position.xy*forestSize;
   gl_Position=projectionMatrix*mvPosition;
  `);
 };
 return material;
}
