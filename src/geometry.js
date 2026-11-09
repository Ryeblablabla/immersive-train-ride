import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export class Batch {
  constructor(parent) { this.parent = parent; this.parts = new Map(); }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
    const g = geo.clone().applyMatrix4(matrix);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = mat.uuid; if (!this.parts.has(key)) this.parts.set(key, { mat, geos: [] }); this.parts.get(key).geos.push(g);
  }
  box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const g = new THREE.BoxGeometry(w, h, d); this.add(g, mat, x, y, z, rx, ry, rz); g.dispose(); }
  round(w, h, d, radius, mat, x, y, z, ry = 0) { const g = new RoundedBoxGeometry(w, h, d, 2, radius); this.add(g, mat, x, y, z, 0, ry); g.dispose(); }
  cylinder(r1, r2, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, segments = 12) { const g = new THREE.CylinderGeometry(r1, r2, h, segments); this.add(g, mat, x, y, z, rx, ry, rz); g.dispose(); }
  finish({ castShadow = true, receiveShadow = true } = {}) {
    const meshes=[];
    for (const { mat, geos } of this.parts.values()) {
      const merged = mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false);
      const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; this.parent.add(mesh); meshes.push(mesh); geos.forEach(g => g.dispose());
    }
    this.parts.clear(); return meshes;
  }
}
export function random(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function archGeometry(width, height, length) {
  const positions=[],uv=[],idx=[]; const n=24;
  for(let j=0;j<2;j++) for(let i=0;i<=n;i++){const t=i/n*Math.PI;positions.push(Math.cos(t)*width/2,Math.sin(t)*height,j===0?-length/2:length/2);uv.push(i/n,j);}
  for(let i=0;i<n;i++){const a=i,b=i+1,c=i+n+1,d=i+n+2;idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
