import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.02);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(25, 22, 25);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 8;
controls.maxDistance = 80;
camera.lookAt(controls.target);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xe4f5ff, 0x455b2b, 0.75);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
sunLight.position.set(40, 60, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 200;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
scene.add(sunLight);

function createBlockTexture({ base, accents, noise = 120, edgeDarken = 0 }) {
  const size = 64;
  const canvasTex = document.createElement('canvas');
  canvasTex.width = size;
  canvasTex.height = size;
  const ctx = canvasTex.getContext('2d');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const accentColors = accents ?? [];
  const pixels = noise;
  for (let i = 0; i < pixels; i += 1) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const color = accentColors[Math.floor(Math.random() * accentColors.length)] ?? base;
    ctx.fillStyle = color;
    const alpha = 0.3 + Math.random() * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  if (edgeDarken > 0) {
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${edgeDarken})`);
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${edgeDarken})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvasTex);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

const textures = {
  grassTop: createBlockTexture({
    base: '#3da23c',
    accents: ['#60c946', '#2f7e2e', '#47a844'],
    noise: 260,
    edgeDarken: 0.08
  }),
  grassSide: createBlockTexture({
    base: '#5c8b34',
    accents: ['#3f5c21', '#80a84c'],
    noise: 220,
    edgeDarken: 0.1
  }),
  dirt: createBlockTexture({
    base: '#7b512f',
    accents: ['#633f25', '#91633d', '#3d2413'],
    noise: 200,
    edgeDarken: 0.05
  }),
  stone: createBlockTexture({
    base: '#8f8f8f',
    accents: ['#6c6c6c', '#b7b7b7', '#4f4f4f'],
    noise: 180,
    edgeDarken: 0.05
  }),
  sand: createBlockTexture({
    base: '#e0d3a4',
    accents: ['#cdbf8f', '#f7e8b6', '#bcae79'],
    noise: 200,
    edgeDarken: 0.04
  }),
  leaf: createBlockTexture({
    base: '#3e7e3a',
    accents: ['#4da44b', '#275b28', '#66c060'],
    noise: 300,
    edgeDarken: 0.12
  }),
  wood: createBlockTexture({
    base: '#9c6b3f',
    accents: ['#c28c54', '#7d4e2a', '#5d331a'],
    noise: 240,
    edgeDarken: 0.08
  })
};

const materials = {
  grass: [
    new THREE.MeshStandardMaterial({ map: textures.grassSide }),
    new THREE.MeshStandardMaterial({ map: textures.grassSide }),
    new THREE.MeshStandardMaterial({ map: textures.grassTop }),
    new THREE.MeshStandardMaterial({ map: textures.dirt }),
    new THREE.MeshStandardMaterial({ map: textures.grassSide }),
    new THREE.MeshStandardMaterial({ map: textures.grassSide })
  ],
  dirt: new THREE.MeshStandardMaterial({ map: textures.dirt }),
  stone: new THREE.MeshStandardMaterial({ map: textures.stone }),
  sand: new THREE.MeshStandardMaterial({ map: textures.sand }),
  leaf: new THREE.MeshStandardMaterial({ map: textures.leaf, transparent: true, opacity: 0.95 }),
  wood: new THREE.MeshStandardMaterial({ map: textures.wood })
};

const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x3fa7d6,
  transparent: true,
  opacity: 0.65,
  roughness: 0.15,
  metalness: 0.1
});
waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.time = { value: 0 };
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>\nuniform float time;`
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    `float wave = sin((vUv.x + vUv.y + time) * 4.0) * 0.03;\nvec3 mixed = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.05, 0.08, 0.12), wave);\ngl_FragColor.rgb = mixed;\n#include <dithering_fragment>`
  );
  waterMaterial.userData.shader = shader;
};

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const waterGeometry = new THREE.BoxGeometry(1, 1, 1);

const waterBlocks = [];

function addBlock(x, y, z, type) {
  const mesh = new THREE.Mesh(blockGeometry, materials[type] ?? materials.dirt);
  mesh.position.set(x, y, z);
  mesh.castShadow = type !== 'leaf' && type !== 'water';
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addWaterBlock(x, y, z) {
  const mesh = new THREE.Mesh(waterGeometry, waterMaterial);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  mesh.userData.baseY = mesh.position.y;
  waterBlocks.push(mesh);
}

function addTree(x, y, z) {
  const height = 4 + Math.floor(Math.random() * 2);
  for (let i = 1; i <= height; i += 1) {
    const trunk = addBlock(x, y + i, z, 'wood');
    trunk.castShadow = true;
  }

  const leafStart = y + height - 1;
  for (let lx = -2; lx <= 2; lx += 1) {
    for (let ly = 0; ly <= 2; ly += 1) {
      for (let lz = -2; lz <= 2; lz += 1) {
        const distance = Math.abs(lx) + Math.abs(ly) + Math.abs(lz);
        if (distance <= 3 && !(lx === 0 && ly === 2 && lz === 0)) {
          const leaf = addBlock(x + lx, leafStart + ly, z + lz, 'leaf');
          leaf.material = leaf.material.clone();
          leaf.material.side = THREE.DoubleSide;
          leaf.castShadow = false;
        }
      }
    }
  }
}

function generateWorld() {
  const size = 32;
  const waterLevel = 2;
  for (let x = 0; x < size; x += 1) {
    for (let z = 0; z < size; z += 1) {
      const worldX = x - size / 2;
      const worldZ = z - size / 2;
      const heightValue =
        Math.sin(worldX * 0.25) * 2 +
        Math.cos(worldZ * 0.3) * 1.5 +
        Math.sin((worldX + worldZ) * 0.15) * 3;
      const groundHeight = Math.round(4 + heightValue);

      for (let y = 0; y <= groundHeight; y += 1) {
        let type = 'dirt';
        if (y === groundHeight) {
          if (groundHeight <= waterLevel + 1) {
            type = 'sand';
          } else {
            type = 'grass';
          }
        } else if (y < groundHeight - 2) {
          type = 'stone';
        } else {
          type = 'dirt';
        }

        addBlock(worldX, y, worldZ, type);
      }

      if (groundHeight < waterLevel) {
        for (let y = groundHeight + 1; y <= waterLevel; y += 1) {
          addWaterBlock(worldX, y - 0.3, worldZ);
        }
      }

      if (groundHeight >= waterLevel + 2 && Math.random() < 0.06) {
        addTree(worldX, groundHeight, worldZ);
      }
    }
  }
}

generateWorld();

const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const cloudGeometry = new THREE.BoxGeometry(4, 1, 2);
for (let i = 0; i < 12; i += 1) {
  const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
  cloud.position.set(
    (Math.random() - 0.5) * 80,
    20 + Math.random() * 10,
    (Math.random() - 0.5) * 80
  );
  cloud.rotation.y = Math.random() * Math.PI;
  cloud.castShadow = false;
  cloud.receiveShadow = false;
  scene.add(cloud);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (waterMaterial.userData.shader) {
    waterMaterial.userData.shader.uniforms.time.value = elapsed * 0.7;
  }

  waterBlocks.forEach((block, index) => {
    const wave = Math.sin(elapsed * 1.5 + index * 0.5) * 0.08;
    block.position.y = block.userData.baseY + wave;
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();
