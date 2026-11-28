// The cast: realistic Sketchfab characters, animated either by their own clips or by
// Mixamo clips (from the Xbot rig) retargeted live onto their skeletons. They speak voiced lines.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { gltf, sound } from './assets.js';
import { Retargeter } from './retarget.js';
import { LINES } from './lines.js';

// height in metres; own: name map to the model's own clips (otherwise Mixamo clips are retargeted)
export const CAST = {
  johnny: { file: 'clown', h: 1.8 },
  reverend: { file: 'reverend', h: 1.86 },
  mama: { file: 'mama', h: 1.7 },
  doll: { file: 'doll', h: 1.63, own: { idle: 'Take 001' } },
  dale: { file: 'dale', h: 1.8 },
  victim: { file: 'victim', h: 1.62 },
  brother: { file: 'butcher', h: 2.05, own: { idle: 'Butcher_Idle', walk: 'Butcher_Walk', run: 'Butcher_Run', swing: 'Butcher_SwingAttack_1', swing2: 'Butcher_SwingAttack_2', slice: 'Butcher_SliceAttack', scream: 'Butcher_Scream' }, only: true },
  grandpa: { file: 'grandpa', h: 1.45, own: { idle: 'beer' }, only: true },
};

const _v = new THREE.Vector3();

export class Actor {
  constructor(game, id, { scene } = {}) {
    const def = CAST[id]; this.g = game; this.id = id; this.def = def;
    const src = gltf(def.file);
    this.model = SkeletonUtils.clone(src.scene);
    this.model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; o.userData.shared = true; if (o.material) o.material.envMapIntensity = 0.6; } });
    // scale to a real height, feet on the floor, centred
    this.model.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(this.model); const h = bb.max.y - bb.min.y || 1;
    this.model.scale.multiplyScalar(def.h / h); this.model.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(this.model); const c = bb.getCenter(new THREE.Vector3());
    this.model.position.x -= c.x; this.model.position.z -= c.z; this.model.position.y -= bb.min.y;
    this.root = new THREE.Group(); this.root.add(this.model); (scene || game.engine.world).add(this.root);
    this.height = def.h;
    // animation: own clips
    this.mixer = new THREE.AnimationMixer(this.model); this.acts = {};
    if (def.own) for (const [k, n] of Object.entries(def.own)) { const clip = src.animations.find(a => a.name === n); if (clip) this.acts[k] = this.mixer.clipAction(clip); }
    // animation: Mixamo clips retargeted from a hidden Xbot rig
    if (!def.only) {
      const xb = gltf('Xbot'); this.src = SkeletonUtils.clone(xb.scene); this.src.visible = false;
      this.src.traverse(o => { if (o.isMesh) o.visible = false; });
      this.root.add(this.src); this.root.updateMatrixWorld(true);
      this.rt = new Retargeter(this.model, this.src);
      this.smixer = new THREE.AnimationMixer(this.src);
      for (const clip of xb.animations) if (!this.acts[clip.name]) this.acts[clip.name] = { clip, src: true };
      this.src.position.set(0, 0, 0);
    }
    this.cur = null; this.yaw = 0; this.play('idle');
  }
  get pos() { return this.root.position; }
  get head() { return _v.set(this.root.position.x, this.root.position.y + this.height * 0.93, this.root.position.z).clone(); }
  place(x, z, yaw = 0, y = 0) { this.root.position.set(x, y, z); this.face(yaw); }
  face(yaw) { this.yaw = yaw; this.root.rotation.y = yaw + Math.PI; }
  faceTo(x, z) { this.face(Math.atan2(-(x - this.root.position.x), -(z - this.root.position.z))); }
  play(name, fade = 0.35, ts = 1, once = false) {
    let a = this.acts[name] || this.acts.idle; if (!a) return;
    if (a.src) { a = this.acts[name] = this.smixer.clipAction(a.clip); a._src = true; }
    a.timeScale = ts;
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    if (this.cur === a && !once) return;
    a.reset().fadeIn(fade).play(); if (this.cur && this.cur !== a) this.cur.fadeOut(fade); this.cur = a;
  }
  update(dt) {
    this.mixer.update(dt);
    if (this.rt && this.cur && this.cur._src) { this.smixer.update(dt); this.src.updateMatrixWorld(true); this.rt.apply(); }
  }
  set visible(v) { this.root.visible = v; } get visible() { return this.root.visible; }
  // speak a voiced line: spatial audio at the head + a caption. Resolves when the line ends.
  say(id, { vol = 1.2 } = {}) {
    const L = LINES[id]; const buf = sound('vo_' + id); const dur = buf ? buf.duration : Math.max(2, (L?.text.length || 20) * 0.06);
    if (L) this.g.hud.sub(`${L.who}:  ${L.text}`, dur + 0.5, L.color);
    if (buf) this.g.audio.play('vo_' + id, this.head, { vol, ref: 2.2, jitter: 0 });
    return new Promise(res => this.g.after(dur + 0.25, res));
  }
}

// a voice from nowhere in particular (a PA speaker, a shout across the field)
export function voice(game, id, pos, vol = 1.2) {
  const L = LINES[id], buf = sound('vo_' + id), dur = buf ? buf.duration : 3;
  if (L) game.hud.sub(`${L.who}:  ${L.text}`, dur + 0.5, L.color);
  if (buf) game.audio.play('vo_' + id, pos || null, { vol, ref: 3, jitter: 0 });
  return new Promise(res => game.after(dur + 0.25, res));
}
