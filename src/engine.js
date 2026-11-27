// Renderer, scene graph, player rig, static world builder (merged geometry) and collision.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from './textures.js';

export class Engine {
  constructor() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    r.setSize(innerWidth, innerHeight);
    r.xr.enabled = true;
    r.xr.setReferenceSpaceType('local-floor');
    if (r.xr.setFoveation) r.xr.setFoveation(1);
    document.body.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.09);
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 220);
    this.camera.rotation.order = 'YXZ';
    this.rig = new THREE.Group();
    this.rig.add(this.camera);
    this.scene.add(this.rig);
    this.world = new THREE.Group();
    this.scene.add(this.world);

    // Fixed light set (never changes count -> no shader recompiles)
    this.hemi = new THREE.HemisphereLight(0x8890a0, 0x201810, 0.25);
    this.scene.add(this.hemi);
    this.flash = new THREE.SpotLight(0xfff2dd, 30, 18, 0.5, 0.45, 1.6);
    this.flashTarget = new THREE.Object3D();
    this.flash.target = this.flashTarget;
    this.scene.add(this.flash, this.flashTarget);
    this.points = [0, 1].map(() => { const p = new THREE.PointLight(0xffffff, 0, 10, 1.8); this.scene.add(p); return p; });

    // Fade sphere around the head
    this.fadeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, fog: false }));
    this.fadeMesh.renderOrder = 10000;
    this.camera.add(this.fadeMesh);
    this.fade = 0; this.fadeTarget = 0; this.fadeColor = new THREE.Color(0);

    addEventListener('resize', () => {
      if (r.xr.isPresenting) return;
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      r.setSize(innerWidth, innerHeight);
    });
    this.colliders = new Colliders();
    this._v = new THREE.Vector3();
  }
  get xr() { return this.renderer.xr.isPresenting; }
  headPos(out = new THREE.Vector3()) { return this.camera.getWorldPosition(out); }
  headDir(out = new THREE.Vector3()) { return this.camera.getWorldDirection(out); }
  headYaw() { const d = this.headDir(this._v); return Math.atan2(-d.x, -d.z); }
  setFade(target, color) { this.fadeTarget = target; if (color !== undefined) this.fadeMesh.material.color.set(color); }
  updateFade(dt) {
    const k = Math.min(1, dt * 2.5);
    this.fade += (this.fadeTarget - this.fade) * k;
    if (Math.abs(this.fade - this.fadeTarget) < 0.003) this.fade = this.fadeTarget;
    this.fadeMesh.material.opacity = this.fade;
    this.fadeMesh.visible = this.fade > 0.002;
  }
  clearWorld() {
    const disposeList = [];
    this.world.traverse(o => { if (o.geometry && !o.userData.shared) disposeList.push(o.geometry); });
    disposeList.forEach(g => g.dispose());
    this.world.clear();
    this.colliders.clear();
    this.points.forEach(p => p.intensity = 0);
  }
  setAtmosphere({ fog = 0x000000, density = 0.09, bg, hemi = 0.25, hemiSky = 0x8890a0, hemiGround = 0x201810 }) {
    this.scene.fog.color.set(fog); this.scene.fog.density = density;
    this.scene.background.set(bg ?? fog);
    this.hemi.intensity = hemi; this.hemi.color.set(hemiSky); this.hemi.groundColor.set(hemiGround);
  }
}

// --- Collision: axis aligned boxes on the XZ plane ---
export class Colliders {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }
  add(x0, z0, x1, z1, tag) { const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), on: true, tag }; this.list.push(b); return b; }
  remove(b) { const i = this.list.indexOf(b); if (i >= 0) this.list.splice(i, 1); }
  // push a circle (x,z,r) out of all boxes, returns corrected {x,z}
  resolve(x, z, r = 0.22) {
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const b of this.list) {
        if (!b.on) continue;
        const cx = Math.max(b.x0, Math.min(x, b.x1)), cz = Math.max(b.z0, Math.min(z, b.z1));
        let dx = x - cx, dz = z - cz; const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 1e-8) { const d = Math.sqrt(d2), p = (r - d) / d; x += dx * p; z += dz * p; }
          else { // centre inside box: push out on the shortest axis
            const l = x - b.x0, rr = b.x1 - x, t = z - b.z0, bb = b.z1 - z, m = Math.min(l, rr, t, bb);
            if (m === l) x = b.x0 - r; else if (m === rr) x = b.x1 + r; else if (m === t) z = b.z0 - r; else z = b.z1 + r;
          }
          moved = true;
        }
      }
      if (!moved) break;
    }
    return { x, z };
  }
  blocked(x, z, r = 0.15) { for (const b of this.list) if (b.on && x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true; return false; }
}

// --- Builder: accumulate static geometry per material, then merge into one mesh per material ---
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function uvBox(geo, w, h, d, s) {
  const uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s);
  }
  return geo;
}
export class Builder {
  constructor(engine) { this.engine = engine; this.buckets = new Map(); }
  _push(material, geo) { if (!this.buckets.has(material)) this.buckets.set(material, []); this.buckets.get(material).push(geo); }
  // centre x,z; y is the BOTTOM of the box
  box(x, y, z, w, h, d, material, o = {}) {
    const g = uvBox(new THREE.BoxGeometry(w, h, d), w, h, d, material.userData.uvScale || 2);
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); _p.set(x, y + h / 2, z); _s.set(1, 1, 1);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    this._push(material, g);
    if (o.collide) {
      if (o.ry) { const c = Math.abs(Math.cos(o.ry)), s = Math.abs(Math.sin(o.ry)); const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; this.engine.colliders.add(x - hw, z - hd, x + hw, z + hd); }
      else this.engine.colliders.add(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
    }
    return g;
  }
  geo(g, material, x = 0, y = 0, z = 0, ry = 0, sc = 1) {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sc, sc, sc);
    const gg = g.index ? g.clone() : g.clone();
    gg.applyMatrix4(_m.compose(_p, _q, _s)); this._push(material, gg); return gg;
  }
  // flat horizontal slab (floor/ceiling)
  slab(x0, z0, x1, z1, y, material, t = 0.05) { return this.box((x0 + x1) / 2, y - (y > 0.5 ? 0 : t), (z0 + z1) / 2, Math.abs(x1 - x0), t, Math.abs(z1 - z0), material); }
  flush(parent = this.engine.world) {
    const out = [];
    for (const [material, list] of this.buckets) {
      const norm = list.map(g => { if (!g.index) return g; return g; });
      const merged = mergeGeometries(norm, false);
      list.forEach(g => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      parent.add(mesh); out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}

// Wall helpers using gaps.  gaps: [{at, w}] positions along the wall axis.
export function wallSegments(a0, a1, gaps = []) {
  const segs = []; let cur = a0;
  const gs = gaps.map(g => typeof g === 'number' ? { at: g, w: 1.2 } : { w: 1.2, ...g }).sort((a, b) => a.at - b.at);
  for (const g of gs) { const s = g.at - g.w / 2, e = g.at + g.w / 2; if (s > cur) segs.push([cur, s, g]); cur = Math.max(cur, e); }
  if (a1 > cur) segs.push([cur, a1, null]);
  return { segs, gaps: gs };
}

export { THREE, mat };
