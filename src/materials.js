import * as THREE from 'three';
const loader = new THREE.TextureLoader();
const maxAnisotropy = 8;
export function texture(url, repeat = [1, 1], color = false) {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = maxAnisotropy;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function canvasTexture(w, h, paint) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'); paint(ctx, w, h);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function label(text, options = {}) {
  const { width = 1, height = 0.25, bg = '#efe6d0', fg = '#334137', font = '32px serif', border = false } = options;
  const map = canvasTexture(1024, Math.round(1024 * height / width), (c, w, h) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
    if (border) { c.strokeStyle = fg; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24); }
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = font.replace(/\d+px/, Math.round(h * 0.52) + 'px'); c.fillText(text, w / 2, h * 0.53, w * 0.92);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, transparent: !bg, side: THREE.DoubleSide, toneMapped: true }));
}
export function makeMaterials() {
  const pbr = (name, options, repeat) => new THREE.MeshStandardMaterial({
    map: texture(`/assets/textures/${name}-color.jpg`, repeat, true),
    normalMap: texture(`/assets/textures/${name}-normal.jpg`, repeat),
    roughnessMap: texture(`/assets/textures/${name}-roughness.jpg`, repeat),
    normalScale: new THREE.Vector2(0.32, 0.32), ...options,
  });
  const leatherMap = texture('/assets/textures/leather-normal.jpg', [2, 2]);
  const m = {
    green: new THREE.MeshStandardMaterial({ color: '#21483c', metalness: 0.32, roughness: 0.43 }),
    cream: new THREE.MeshStandardMaterial({ color: '#ddd3af', roughness: 0.68, metalness: 0.02 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#ded6bf', roughness: 0.85, side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ color: '#83765a', metalness: 0.65, roughness: 0.33 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#b5b2a2', metalness: 0.9, roughness: 0.29 }),
    brass: new THREE.MeshStandardMaterial({ color: '#b79c5c', metalness: 0.8, roughness: 0.34 }),
    seat: new THREE.MeshStandardMaterial({ color: '#6e3027', normalMap: leatherMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.61, metalness: 0.02 }),
    seatEdge: new THREE.MeshStandardMaterial({ color: '#432d23', roughness: 0.6 }),
    wood: pbr('wood', { color: '#b3a080', roughness: 0.6 }, [1, 1]),
    floor: pbr('concrete', { color: '#514e3c', roughness: 0.82 }, [1.8, 13]),
    concrete: pbr('concrete', { color: '#aaa18c', roughness: 0.9 }, [4, 24]),
    gravel: new THREE.MeshStandardMaterial({ map: texture('/assets/textures/gravel-color.jpg', [3, 40], true), normalMap: texture('/assets/textures/gravel-normal.jpg', [3, 40]), roughness: 0.96, color: '#827c70', normalScale: new THREE.Vector2(0.6, 0.6) }),
    grass: new THREE.MeshStandardMaterial({ map: texture('/assets/textures/grass-color.jpg', [18, 8], true), normalMap: texture('/assets/textures/grass-normal.jpg', [18, 8]), color: '#9da373', roughness: 0.98, normalScale: new THREE.Vector2(0.3, 0.3), vertexColors: true }),
    rail: new THREE.MeshStandardMaterial({ color: '#777c77', metalness: 0.85, roughness: 0.36 }),
    sleeper: new THREE.MeshStandardMaterial({ color: '#504b3f', roughness: 0.95 }),
    dark: new THREE.MeshStandardMaterial({ color: '#242a26', roughness: 0.86, metalness: 0.32 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#d1b889', roughness: 0.96, side: THREE.DoubleSide }),
    enamel: new THREE.MeshStandardMaterial({ color: '#e2ddc5', metalness: 0.19, roughness: 0.28 }),
    tea: new THREE.MeshPhysicalMaterial({ color: '#382d13', roughness: 0.12, metalness: 0.06, clearcoat: 1 }),
    window: new THREE.MeshPhysicalMaterial({ color: '#c6dfcf', transparent: true, opacity: 0.055, roughness: 0.12, metalness: 0.0, envMapIntensity:0, side: THREE.DoubleSide, depthWrite: false }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff4cd', emissive: '#ffe7a2', emissiveIntensity: 2.3, roughness: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: '#1c211e', roughness: 0.72 }),
  };
  return m;
}
