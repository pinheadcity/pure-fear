// Asset loading: CC0 photo textures, CC0 prop models, rigged characters, recorded sounds.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const texCache = new Map(), matCache = new Map(), gltfCache = new Map(), sndCache = new Map();

export const SOUNDS = [
  'amb1', 'breath1', 'scream1', 'creak1', 'sting1', 'sting2', 'rip1',
  ...[1, 2, 3, 4, 5, 6].map(i => 'step' + i), ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => 'wet' + i), ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => 'thud' + i),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => 'door' + i), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => 'meat' + i), ...[1, 2, 3, 4, 5, 6, 7].map(i => 'squish' + i),
  ...[1, 2, 3, 4, 5].map(i => 'moan' + i),
  'c_breath', 'c_snore', 'c_scream1', 'c_scream2', 'c_hurt2', 'c_hurt3', 'c_hurt4', 'c_hurt5', 'c_cough1', 'c_cough2', 'c_cough3',
  'c_grunt1', 'c_grunt3', 'c_grunt4', 'c_grunt5', 'c_eat1', 'c_eat2', 'c_eat3', 'c_eat4', 'c_troll1', 'c_troll2', 'c_troll3',
  'c_barking1', 'c_barking2', 'c_howl', 'c_nose', 'c_spit1', 'c_weird1', 'c_weird3',
];
export const MODELS = ['BarberShopChair_01', 'WoodenTable_01', 'Barrel_01', 'wooden_bucket_01', 'bolt_cutters_01', 'crowbar_01', 'wooden_axe', 'rusted_hacksaw',
  'sledgehammer_01', 'hanging_industrial_lamp', 'Rockingchair_01', 'Television_01', 'wooden_crate_01', 'propane_tank', 'painted_wooden_cabinet', 'old_gas_mask',
  'medical_box', 'wooden_stool_01', 'dining_table', 'painted_wooden_chair_01', 'bull_head', 'wooden_lantern_01', 'vintage_oil_lamp', 'metal_toolbox', 'cardboard_box_01', 'handsaw_wood'];

// photo-scanned PBR surface. size = metres per texture repeat
export function surf(name, { size = 2, color = 0xffffff, rough = 0.92, metal = 0, normal = 1 } = {}) {
  const key = name + size + color + rough + metal;
  if (matCache.has(key)) return matCache.get(key);
  const load = (suf, srgb) => {
    const k = name + suf; if (texCache.has(k)) return texCache.get(k);
    const t = texLoader.load(`assets/tex/${name}_${suf}.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; texCache.set(k, t); return t;
  };
  const m = new THREE.MeshStandardMaterial({ map: load('d', true), normalMap: load('n', false), color, roughness: rough, metalness: metal });
  m.normalScale.set(normal, normal);
  m.userData.uvScale = size;
  matCache.set(key, m);
  return m;
}

export async function loadModels(onProgress) {
  let n = 0; const all = [...MODELS, 'Xbot', 'Michelle'];
  await Promise.all(all.map(name => gltfLoader.loadAsync(`assets/mdl/${name}.glb`).then(g => {
    g.scene.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; if (o.material) { o.material.envMapIntensity = 0; } } });
    gltfCache.set(name, g); onProgress && onProgress(++n / all.length);
  }).catch(e => console.warn('model', name, e))));
}
// a static prop instance (geometry/materials shared)
export function prop(name, scale = 1) {
  const g = gltfCache.get(name); if (!g) return new THREE.Group();
  const o = g.scene.clone(true); o.scale.setScalar(scale);
  o.traverse(c => { if (c.isMesh) c.userData.shared = true; });
  return o;
}
// a rigged, animated person
export function character(name) {
  const g = gltfCache.get(name);
  const root = SkeletonUtils.clone(g.scene);
  root.traverse(o => { if (o.isMesh || o.isSkinnedMesh) { o.frustumCulled = false; o.userData.shared = true; } });
  const mixer = new THREE.AnimationMixer(root);
  const actions = {}; for (const clip of g.animations) actions[clip.name] = mixer.clipAction(clip);
  return { root, mixer, actions, bone: n => root.getObjectByName('mixamorig' + n) || root.getObjectByName('mixamorig:' + n) };
}

export async function loadSounds(ctx, onProgress) {
  let n = 0;
  await Promise.all(SOUNDS.map(name => fetch(`assets/snd/${name}.ogg`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { sndCache.set(name, buf); onProgress && onProgress(++n / SOUNDS.length); }).catch(e => console.warn('snd', name, e))));
}
export function sound(name) { return sndCache.get(name); }
export const gltf = name => gltfCache.get(name);
