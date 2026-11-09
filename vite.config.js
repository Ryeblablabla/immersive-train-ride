import { defineConfig } from 'vite';
export default defineConfig({
 build:{rollupOptions:{output:{manualChunks(id){if(id.includes('/node_modules/three/src/')||id.endsWith('/three/build/three.module.js')||id.endsWith('/three/build/three.core.js'))return 'three-core';if(id.includes('meshopt_decoder'))return 'meshopt';if(id.includes('/three/examples/jsm/'))return 'three-addons';}}}},
});
