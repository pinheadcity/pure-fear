// The compound: farmhouse, yard, kill floor, smokehouse, basement. Plus the scripting toolkit.
import * as THREE from 'three';
import { Builder, wallSegments } from './engine.js';
import { surf, prop, character } from './assets.js';
import { textCanvas, canvasTex, wrapText } from './textures.js';
import { Nav } from './hunter.js';

const _v = new THREE.Vector3();
const FONT = '"Courier New", Courier, monospace';

// ---------- procedural gore decals ----------
const decalTex = {};
function decal(kind) {
  if (decalTex[kind]) return decalTex[kind];
  const { c, g } = textCanvas(256, 256);
  const red = (a) => `rgba(${60 + Math.random() * 40},${Math.random() * 6},${Math.random() * 4},${a})`;
  if (kind === 'pool') {
    for (let i = 0; i < 9; i++) { const x = 128 + (Math.random() - 0.5) * 90, y = 128 + (Math.random() - 0.5) * 90, r = 30 + Math.random() * 60; g.fillStyle = red(0.9); g.beginPath(); g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = red(0.8); g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 5, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.ellipse(110, 100, 40, 12, -0.4, 0, 7); g.fill();
  } else if (kind === 'smear') {
    for (let k = 0; k < 4; k++) { g.strokeStyle = red(0.7); g.lineWidth = 14 + Math.random() * 20; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 60 + k * 40 + Math.random() * 20); g.bezierCurveTo(90, 40 + Math.random() * 160, 170, 40 + Math.random() * 160, 236, 70 + k * 35); g.stroke(); }
  } else if (kind === 'hand') {
    g.fillStyle = red(0.85); g.beginPath(); g.ellipse(128, 160, 42, 50, 0, 0, 7); g.fill();
    for (let f = 0; f < 4; f++) { g.save(); g.translate(92 + f * 24, 120); g.rotate(-0.15 + f * 0.1); g.fillRect(-8, -90, 16, 90); g.restore(); }
    g.save(); g.translate(170, 170); g.rotate(0.9); g.fillRect(-8, -60, 16, 60); g.restore();
    for (let i = 0; i < 6; i++) { g.fillRect(90 + Math.random() * 80, 200, 4 + Math.random() * 4, 30 + Math.random() * 50); }
  } else if (kind === 'print') {
    g.fillStyle = red(0.75); g.beginPath(); g.ellipse(128, 150, 34, 70, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 50, 30, 34, 0, 0, 7); g.fill();
  } else if (kind === 'drip') {
    for (let i = 0; i < 14; i++) { g.fillStyle = red(0.8); const x = 20 + Math.random() * 216; g.fillRect(x, 0, 3 + Math.random() * 7, 60 + Math.random() * 190); g.beginPath(); g.arc(x + 3, 0, 8, 0, 7); g.fill(); }
  } else if (kind === 'words') {
    g.fillStyle = red(0.85); g.font = 'bold 44px serif'; g.textAlign = 'center';
    g.fillText('THEY', 128, 70); g.fillText('KEEP', 128, 130); g.fillText('COMING', 128, 190); g.fillText('BACK', 128, 245);
  }
  const t = canvasTex(c); decalTex[kind] = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  return decalTex[kind];
}
// plastic-wrapped body: a human silhouette under cloudy plastic
let haloT = null;
function haloTex() { if (haloT) return haloT; const { c, g } = textCanvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,220,170,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); haloT = canvasTex(c); return haloT; }
// a real human shape, posed limp, baked once into a static mesh and wrapped in plastic; blood pools toward the head
let baked = null;
function bakedBody() {
  if (baked) return baked;
  const ch = character('XbotLow'); const a = ch.actions.sad_pose || ch.actions.idle; a.play(); ch.mixer.update(0.5); ch.root.updateMatrixWorld(true);
  const parts = [], v = new THREE.Vector3();
  ch.root.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const src = o.geometry, pos = src.attributes.position, out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); out.set([v.x, v.y, v.z], i * 3); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(out, 3)); if (src.index) gg.setIndex(src.index.clone()); parts.push(gg);
  });
  let geo = parts.length > 1 ? mergeGeo(parts) : parts[0];
  geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  // a little bulk for the plastic, then normals
  geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * 0.025, p.getY(i) + n.getY(i) * 0.02, p.getZ(i) + n.getZ(i) * 0.025);
  geo.computeVertexNormals();
  const cols = new Float32Array(p.count * 3), H = geo.boundingBox.max.y - geo.boundingBox.min.y || 1.8;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / H, noise = Math.sin(p.getX(i) * 13 + p.getZ(i) * 7) * Math.sin(p.getY(i) * 9) * 0.5 + 0.5; const blood = Math.min(1, Math.max(0, (0.92 - y) * 0 + (y > 0.8 ? (y - 0.8) * 4 : 0) + (noise > 0.82 ? 0.6 : 0))); cols.set([0.78 - blood * 0.5, 0.75 - blood * 0.72, 0.7 - blood * 0.68], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0, transparent: true, opacity: 0.94, envMapIntensity: 1.5 });
  baked = [geo, m]; return baked;
}
function mergeGeo(list) { const pos = [], idx = []; let off = 0; for (const g of list) { const p = g.attributes.position.array; pos.push(...p); const ix = g.index ? g.index.array : [...Array(p.length / 3).keys()]; for (const i of ix) idx.push(i + off); off += p.length / 3; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g; }
let bodyGeo = null, bodyMat = null;
function wrappedBody() {
  if (!bodyGeo) {
    const pts = [[0, 0], [0.09, 0.02], [0.11, 0.25], [0.1, 0.5], [0.13, 0.8], [0.17, 0.95], [0.19, 1.15], [0.2, 1.3], [0.17, 1.42], [0.08, 1.48], [0.075, 1.53], [0.1, 1.6], [0.1, 1.72], [0.06, 1.78], [0, 1.8]].map(([r, y]) => new THREE.Vector2(r, y));
    bodyGeo = new THREE.LatheGeometry(pts, 12); bodyGeo.scale(1, 1, 0.7);
    const { c, g } = textCanvas(256, 512);
    g.fillStyle = '#b9b2a8'; g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.25})`; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); const y = Math.random() * 512; g.moveTo(0, y); g.bezierCurveTo(80, y + 30, 170, y - 30, 256, y + (Math.random() - 0.5) * 40); g.stroke(); }
    for (let i = 0; i < 26; i++) { const x = Math.random() * 256, y = Math.random() * 512, r = 6 + Math.random() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(90,6,3,0.9)'); gr.addColorStop(1, 'rgba(90,6,3,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const gr = g.createLinearGradient(0, 512, 0, 380); gr.addColorStop(0, 'rgba(80,4,2,0.95)'); gr.addColorStop(1, 'rgba(80,4,2,0)'); g.fillStyle = gr; g.fillRect(0, 380, 256, 132);
    for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(60,50,40,0.6)'; g.lineWidth = 3; const y = Math.random() * 512; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + 8); g.stroke(); } // tape
    const t = canvasTex(c); t.flipY = true;
    bodyMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0, transparent: true, opacity: 0.93 });
  }
  return [bodyGeo, bodyMat];
}

export class Ctx {
  constructor(game, night) {
    this.g = game; this.e = game.engine; this.world = game.engine.world; this.night = night; this.def = night;
    this.b = new Builder(game.engine); this.flags = {}; this.waiters = []; this.updaters = []; this.inter = []; this.timeT = 0; this.alive = true; this.stage = 0;
    this.doorList = []; this.hides = []; this.bodies = []; this.dt = 1 / 72;
  }
  // ---------- geometry ----------
  box(x, y, z, w, h, d, m, o) { return this.b.box(x, y, z, w, h, d, m, o); }
  wallX(x0, x1, z, { h = 3, m, gaps = [], t = 0.2 } = {}) {
    const { segs, gaps: gs } = wallSegments(Math.min(x0, x1), Math.max(x0, x1), gaps);
    for (const [a, b] of segs) this.b.box((a + b) / 2, 0, z, b - a, h, t, m, { collide: true });
    for (const g of gs) if (h > (g.h || 2.2)) this.b.box(g.at, g.h || 2.2, z, g.w, h - (g.h || 2.2), t, m);
    if (this.trim && h >= 2.5) { const tm = this.trim; for (const [a, b] of segs) for (const sd of [-1, 1]) { this.b.box((a + b) / 2, 0, z + sd * (t / 2 + 0.015), b - a, 0.14, 0.03, tm); this.b.box((a + b) / 2, h - 0.1, z + sd * (t / 2 + 0.015), b - a, 0.1, 0.03, tm); }
      for (const g of gs) { const gh = g.h || 2.2; for (const sx of [-1, 1]) this.b.box(g.at + sx * (g.w / 2 + 0.04), 0, z, 0.09, gh + 0.08, t + 0.07, tm); this.b.box(g.at, gh, z, g.w + 0.17, 0.1, t + 0.07, tm); } }
  }
  wallZ(z0, z1, x, { h = 3, m, gaps = [], t = 0.2 } = {}) {
    const { segs, gaps: gs } = wallSegments(Math.min(z0, z1), Math.max(z0, z1), gaps);
    for (const [a, b] of segs) this.b.box(x, 0, (a + b) / 2, t, h, b - a, m, { collide: true });
    for (const g of gs) if (h > (g.h || 2.2)) this.b.box(x, g.h || 2.2, g.at, t, h - (g.h || 2.2), g.w, m);
    if (this.trim && h >= 2.5) { const tm = this.trim; for (const [a, b] of segs) for (const sd of [-1, 1]) { this.b.box(x + sd * (t / 2 + 0.015), 0, (a + b) / 2, 0.03, 0.14, b - a, tm); this.b.box(x + sd * (t / 2 + 0.015), h - 0.1, (a + b) / 2, 0.03, 0.1, b - a, tm); }
      for (const g of gs) { const gh = g.h || 2.2; for (const sz of [-1, 1]) this.b.box(x, 0, g.at + sz * (g.w / 2 + 0.04), t + 0.07, gh + 0.08, 0.09, tm); this.b.box(x, gh, g.at, t + 0.07, 0.1, g.w + 0.17, tm); } }
  }
  floor(x0, z0, x1, z1, m, y = 0) { this.b.box((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2, x1 - x0, 0.05, z1 - z0, m); }
  ceil(x0, z0, x1, z1, m, h) { this.b.box((x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0, 0.08, z1 - z0, m); }
  add(o) { this.world.add(o); return o; }
  mesh(geo, m, x = 0, y = 0, z = 0, ry = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; this.world.add(me); return me; }
  // place a scanned prop so its real base sits on surface height y (models have arbitrary pivots).
  // lie: lay a long tool flat. wall: y is the centre (hung on a wall). col: 'auto' footprint, [w,d], or false.
  prop(name, x, y, z, ry = 0, s = 1, col = 'auto', { lie = false, wall = false } = {}) {
    const o = prop(name, s); o.rotation.set(lie ? -Math.PI / 2 : 0, ry, 0, 'YXZ'); o.position.set(x, 0, z); this.world.add(o);
    const bb = this.ground(o, y, wall);
    const h = bb.max.y - bb.min.y;
    if (Array.isArray(col)) { const [w, d] = col; const c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry)), hw = (w * c + d * sn) / 2, hd = (w * sn + d * c) / 2; this.e.colliders.add(x - hw, z - hd, x + hw, z + hd, 'low'); }
    else if (col === 'auto' && !wall && !lie && y < 0.05 && h > 0.3) { const m = 0.04; this.e.colliders.add(bb.min.x + m, bb.min.z + m, bb.max.x - m, bb.max.z - m, h > 1.6 ? undefined : 'low'); }
    return o;
  }
  // set an object's lowest point to height y (or its centre, for wall-hung things); returns its world box
  ground(o, y, centre = false) {
    o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o);
    o.position.y += centre ? y - (bb.min.y + bb.max.y) / 2 : y - bb.min.y; o.updateMatrixWorld(true);
    return bb.setFromObject(o);
  }
  decal(kind, x, y, z, size = 1, { rot = Math.random() * 6.28, wall = null } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decal(kind));
    m.position.set(x, y, z);
    if (wall === null) { m.rotation.set(-Math.PI / 2, 0, rot); m.position.y = y + 0.012; }
    else m.rotation.set(0, wall, 0);
    m.renderOrder = 2; this.world.add(m); return m;
  }
  bulb(i, x, y, z, color = 0xffb46a, intensity = 4, dist = 9) {
    const p = this.e.points[i]; p.position.set(x, y, z); p.color.set(color); p.intensity = intensity; p.distance = dist;
    const b = this.mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color }), x, y, z);
    const cord = this.mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.8), new THREE.MeshBasicMaterial({ color: 0x111111 }), x, y + 0.45, z);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 })); halo.scale.setScalar(0.9); b.add(halo);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 20, 1, true).translate(0, -1.2, 0), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { c: { value: new THREE.Color(color) }, u: { value: 1 } },
      vertexShader: 'varying float vy; varying vec3 vn; varying vec3 vv; void main(){ vy = -position.y/2.4; vec4 mv = modelViewMatrix*vec4(position,1.0); vv = normalize(-mv.xyz); vn = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 c; uniform float u; varying float vy; varying vec3 vn; varying vec3 vv; void main(){ float a = u*0.045*(1.0-vy)*pow(abs(dot(vn,vv)),1.5); gl_FragColor = vec4(c*a, a); }' }));
    cone.position.set(x, y - 0.02, z); cone.renderOrder = 9; this.world.add(cone);
    p.userData.bulb = b; p.userData.base = intensity; p.userData.cone = cone; p.userData.halo = halo; return p;
  }
  // a body wrapped in plastic hanging from a hook (or lying)
  body(x, z, { hang = true, tag = null, ry = Math.random() * 6.28, y = 0.45 } = {}) {
    const [geo, m] = bakedBody();
    const grp = new THREE.Group(); const me = new THREE.Mesh(geo, m); me.castShadow = true; me.userData.shared = true; grp.add(me);
    if (hang) { me.rotation.z = Math.PI; me.position.y = -0.05; grp.position.set(x, 2.95, z); this.e.colliders.add(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 'low'); const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5), surf('rusty_metal_02', { size: 0.5, rough: 0.6, metal: 0.6 })); chain.position.y = -0.05; grp.add(chain); }
    else { grp.position.set(x, 0.18, z); me.rotation.z = Math.PI / 2; me.position.x = 0.9; grp.rotation.y = ry; }
    if (tag) {
      const { c, g } = textCanvas(128, 64); g.fillStyle = '#c8b890'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#300'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText(tag, 64, 42);
      const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), new THREE.MeshStandardMaterial({ map: canvasTex(c), side: THREE.DoubleSide }));
      tg.position.set(0, hang ? -0.35 : 0.15, hang ? 0.14 : 0); if (!hang) { tg.position.set(-1.7, 0.1, 0.12); } grp.add(tg);
    }
    grp.userData.sway = Math.random() * 6; grp.userData.hang = hang;
    this.world.add(grp); this.bodies.push(grp); return grp;
  }
  flush() { return this.b.flush(this.world); }
  // ---------- interaction ----------
  interact(mesh, label, fn, { range = 2.2 } = {}) {
    const it = { mesh, label, fn, range, enabled: true, uses: 0 };
    mesh.traverse ? mesh.traverse(o => { if (o.isMesh) o.userData.inter = it; }) : (mesh.userData.inter = it);
    this.inter.push(it); return it;
  }
  removeInteract(it) { it.enabled = false; const i = this.inter.indexOf(it); if (i >= 0) this.inter.splice(i, 1); }
  note(x, y, z, ry, title, text, { wall = false } = {}) {
    const me = this.mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 0.9 }), x, y + 0.01, z);
    if (wall) me.rotation.set(0, ry, 0); else me.rotation.set(-Math.PI / 2, 0, ry);
    const it = this.interact(me, 'read', () => this.g.reader.show(title, text, 'paper'));
    return it;
  }
  pickup(obj, x, y, z, id, label, onTake) {
    obj.position.set(x, 0, z); this.world.add(obj); this.ground(obj, y);
    const it = this.interact(obj, 'take ' + label, () => {
      obj.removeFromParent(); this.removeInteract(it); this.g.player.inventory.add(id);
      this.g.hud.msg(label.toUpperCase(), 2.5); this.g.audio.play('door3', null, { vol: 0.4, rate: 1.6 });
      onTake && onTake();
    }, { range: 2.4 });
    it.obj = obj; return it;
  }
  door(x, z, { axis = 'x', w = 1.0, h = 2.15, m = surf('wood_peeling_paint_weathered', { size: 1.2 }), locked = null, label = 'door', hinge = -1, swing = 1 } = {}) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, z);
    const off = hinge * w / 2; if (axis === 'x') pivot.position.x += off; else pivot.position.z += off;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w : 0.06, h, axis === 'x' ? 0.06 : w), m);
    if (axis === 'x') panel.position.set(-off, h / 2, 0); else panel.position.set(0, h / 2, -off);
    pivot.add(panel); this.world.add(pivot);
    const col = axis === 'x' ? this.e.colliders.add(x - w / 2, z - 0.08, x + w / 2, z + 0.08) : this.e.colliders.add(x - 0.08, z - w / 2, x + 0.08, z + w / 2);
    const d = { pivot, panel, col, locked, isOpen: false, angle: 0, target: 0 };
    d.open = (silent) => { if (d.isOpen) return; d.isOpen = true; d.target = swing * hinge * -1.6; col.on = false; if (!silent) this.g.audio.play(['door1', 'door2', 'door6'], pivot.position.clone().setY(1), { vol: 0.8 }); this.g.player.noise = Math.max(this.g.player.noise, 0.35); };
    d.close = (slam) => { if (!d.isOpen) return; d.isOpen = false; d.target = 0; col.on = true; this.g.audio.play(slam ? 'thud2' : ['door4', 'door5', 'door8'], pivot.position.clone().setY(1), { vol: slam ? 1.2 : 0.7 }); };
    d.it = this.interact(panel, label, () => {
      if (d.isOpen) { d.close(); return; }
      if (d.locked) {
        if (typeof d.locked === 'string' && this.g.player.inventory.has(d.locked)) { d.locked = null; this.g.hud.msg('UNLOCKED', 2); }
        else { this.g.hud.msg(typeof d.locked === 'string' ? 'LOCKED' : d.locked.msg || 'LOCKED', 2.5); this.g.audio.play('door7', pivot.position.clone().setY(1), { vol: 0.6 }); this.g.player.noise = Math.max(this.g.player.noise, 0.45); return; }
      }
      d.open();
    });
    this.onUpdate(dt => { if (d.angle !== d.target) { d.angle += (d.target - d.angle) * Math.min(1, dt * 5); if (Math.abs(d.angle - d.target) < 0.002) d.angle = d.target; pivot.rotation.y = d.angle; } });
    this.doorList.push(d); return d;
  }
  // a wardrobe you can climb into. yaw = direction its door faces.
  hide(id, x, z, yaw) {
    const m = surf('wood_peeling_paint_weathered', { size: 1.2 }), grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = yaw; this.world.add(grp);
    const W = 1.0, D = 0.65, H = 2.05;
    const parts = [[0, H / 2, D / 2 - 0.02, W, H, 0.04], [-W / 2, H / 2, 0, 0.04, H, D], [W / 2, H / 2, 0, 0.04, H, D], [0, H, 0, W, 0.04, D], [0, 0.02, 0, W, 0.04, D]];
    for (const [px, py, pz, w, h, d] of parts) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); grp.add(b); }
    // slatted door (front at local -z)
    const pivot = new THREE.Group(); pivot.position.set(-W / 2, 0, -D / 2); grp.add(pivot);
    for (let k = 0; k < 14; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.09, 0.025), m); sl.position.set(W / 2, 0.15 + k * 0.135, 0); sl.rotation.x = 0.5; pivot.add(sl); }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, 0.04), m); frame.position.set(W - 0.03, H / 2, 0); pivot.add(frame);
    const fr2 = frame.clone(); fr2.position.x = 0.03; pivot.add(fr2);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw)), hw = (W * c + D * s) / 2, hd = (W * s + D * c) / 2;
    const col = this.e.colliders.add(x - hw, z - hd, x + hw, z + hd);
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const spot = { id, pos: new THREE.Vector3(x, 0, z), front: new THREE.Vector3(x, 0, z).addScaledVector(fwd, 0.95), yaw, col, pivot, open: false, enabled: true };
    spot.setOpen = (o) => { spot.open = o; spot.tgt = o ? -1.7 : 0; };
    this.onUpdate(dt => { const t = spot.tgt || 0; pivot.rotation.y += (t - pivot.rotation.y) * Math.min(1, dt * 6); });
    spot.it = this.interact(grp, 'hide', () => this.g.enterHide(spot), { range: 1.8 });
    this.hides.push(spot); return spot;
  }
  // a photograph: sepia, a family posed in front of the house, one figure with no face (number below)
  photo(x, y, z, ry, { n = 4, tag = '4,095', w = 0.42, h = 0.32 } = {}) {
    const { c, g } = textCanvas(256, 196);
    const gr = g.createLinearGradient(0, 0, 0, 196); gr.addColorStop(0, '#b9a27c'); gr.addColorStop(1, '#6f5a40'); g.fillStyle = gr; g.fillRect(0, 0, 256, 196);
    g.fillStyle = '#5a4630'; g.fillRect(20, 30, 216, 80); g.fillStyle = '#3a2c1c'; g.fillRect(110, 60, 30, 50);
    for (let i = 0; i < n; i++) {
      const fx = 40 + i * (176 / Math.max(1, n - 1)), faceless = i === n - 1, tall = i === 0 ? 1.15 : i === 1 ? 1 : 0.85;
      g.fillStyle = faceless ? '#d8d0c0' : '#2a2018'; g.beginPath(); g.ellipse(fx, 120 - 30 * tall, 9, 11, 0, 0, 7); g.fill();
      g.fillRect(fx - 12, 130 - 30 * tall, 24, 60 * tall);
      if (!faceless) { g.fillStyle = '#c8b090'; g.fillRect(fx - 4, 116 - 30 * tall, 2, 2); g.fillRect(fx + 2, 116 - 30 * tall, 2, 2); g.fillRect(fx - 3, 123 - 30 * tall, 6, 1); }
    }
    g.fillStyle = 'rgba(40,20,10,0.8)'; g.font = '14px serif'; g.fillText('our family  (' + tag + ')', 20, 186);
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`; g.fillRect(Math.random() * 256, Math.random() * 196, 2, 2); }
    const fr = this.mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6 }), x, y, z, ry);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.5 })); pic.position.z = 0.012; fr.add(pic);
    return fr;
  }
  // a window full of daylight (or night)
  windowPane(x, y, z, ry, w = 1.2, h = 1.0) {
    const m = new THREE.MeshBasicMaterial({ color: 0x0a0c10 }); const me = this.mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, ry);
    const fr = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.8 });
    const bars = [new THREE.BoxGeometry(w, 0.05, 0.05), new THREE.BoxGeometry(0.05, h, 0.05)]; for (const b of bars) { const bm = new THREE.Mesh(b, fr); bm.position.z = 0.02; me.add(bm); }
    this.windows = this.windows || []; this.windows.push(me); return me;
  }
  daylight(on) {
    const e = this.e;
    if (on) { e.setAtmosphere({ fog: 0xcfc8b8, density: 0.02, hemi: 1.15, hemiSky: 0xf6ecd8, hemiGround: 0x6a5a44, sun: 1.6 }); e.points[0].intensity = 0; e.points[1].intensity = 0; e.scene.environmentIntensity = 0.9; (this.windows || []).forEach(w => w.material.color.set(0xfff8e8)); }
    else (this.windows || []).forEach(w => w.material.color.set(0x0a0c10));
  }
  choice(title, body, options) {
    return new Promise(resolve => {
      const show = () => this.g.panel.show({ title, body, items: options.map((o, i) => ({ label: o, fn: () => { this.g.panel.hide(); this.g.modal = null; resolve(i); } })), top: 420 }, false);
      this.g.panel.show({ title: '', items: [] }, true); show(); this.g.modal = show;
    });
  }
  // scripted walk for a character (Hunter/Watcher-like with .pos or .root)
  walk(ch, pts, speed = 1.0) {
    const root = ch.root, path = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const play = n => { if (ch.play) ch.play(n, 0.3, speed); else if (ch.ch?.actions?.[n] && ch._cur !== n) { ch.ch.actions[n].reset().fadeIn(0.3).play(); if (ch._curA) ch._curA.fadeOut(0.3); ch._curA = ch.ch.actions[n]; ch._cur = n; } };
    return this.until(() => {
      const t = path[0]; if (!t) { play('idle'); return true; }
      const p = root.position, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) { path.shift(); return false; }
      const mv = Math.min(d, speed * this.dt); p.x += dx / d * mv; p.z += dz / d * mv;
      const yaw = Math.atan2(-dx, -dz); if (ch.face) ch.face(yaw, this.dt * 6); else root.rotation.y = yaw + Math.PI;
      play('walk'); return false;
    });
  }
  lookAt(ch, x, z) { const p = ch.root.position, yaw = Math.atan2(-(x - p.x), -(z - p.z)); if (ch.face) ch.face(yaw, 1); else { ch.yaw = yaw; ch.root.rotation.y = yaw + Math.PI; } }
  // run fn once pos has been out of the player's view for a moment
  whenUnseen(pos, fn, after = 0.6) {
    let t = 0; const u = this.onUpdate(dt => { const h = this.head(), f = this.e.headDir(new THREE.Vector3()), d = new THREE.Vector3().subVectors(pos, h); const l = d.length(); if (l > 1.2 && f.dot(d) / l < 0.35) { t += dt; if (t > after) { u.dead = true; fn(); } } else t = 0; });
    return u;
  }
  // ---------- script helpers ----------
  onUpdate(fn) { const u = { fn, dead: false }; this.updaters.push(u); return u; }
  until(cond) { return new Promise(res => this.waiters.push({ cond, res })); }
  sleep(s) { const t = this.timeT + s; return this.until(() => this.timeT >= t); }
  near(x, z, r) { const h = this.e.headPos(_v); return Math.hypot(h.x - x, h.z - z) < r; }
  reach(x, z, r = 1.2) { return this.until(() => this.near(x, z, r)); }
  used(it) { const n = it.uses; return this.until(() => it.uses > n); }
  has(id) { return this.g.player.inventory.has(id); }
  objective(t) { this.g.setObjective(t); }
  say(t, d = 5) { this.g.hud.sub(t, d); }
  head() { return this.e.headPos(new THREE.Vector3()); }
  sfx(name, x, y, z, o) { return this.g.audio.play(name, x === undefined ? null : new THREE.Vector3(x, y, z), o); }
  update(dt) {
    this.timeT += dt; this.dt = dt;
    for (const u of this.updaters) if (!u.dead) u.fn(dt);
    if (this.updaters.length > 300) this.updaters = this.updaters.filter(u => !u.dead);
    for (let i = this.waiters.length - 1; i >= 0; i--) { const w = this.waiters[i]; if (w.cond()) { this.waiters.splice(i, 1); w.res(); } }
    // hanging bodies sway
    for (const b of this.bodies) if (b.userData.hang) { b.userData.sway += dt; b.rotation.z = Math.sin(b.userData.sway * 0.7) * 0.025; b.rotation.y += Math.sin(b.userData.sway * 0.3) * 0.0008; }
  }
  dispose() { this.alive = false; this.waiters.length = 0; this.updaters.length = 0; this.inter.length = 0; }
  async runStages(start) {
    const st = this.def.stages;
    for (let i = 0; i < start; i++) st[i].skip && st[i].skip(this);
    for (let i = start; i < st.length; i++) {
      if (!this.alive) return;
      this.stage = i; const s = st[i];
      if (i === start && s.spawn) this.g.player.teleportTo(s.spawn[0], s.spawn[1], s.spawn[2] || 0);
      if (i > 0) this.g.checkpoint(this.g.nightIndex, i);
      if (s.obj) this.objective(s.obj);
      await s.run(this);
      if (!this.alive) return;
    }
    this.g.nightComplete();
  }
}

// ---------- the compound (shared by every night) ----------
export function buildCompound(c, opt = {}) {
  const H = 2.9;
  const wallpaper = surf('decrepit_wallpaper', { size: 2.2 }), plaster = surf('worn_cracked_plaster', { size: 2.5 }), wood = surf('wood_planks_dirt', { size: 2.2 });
  const carpet = surf('dirty_carpet', { size: 2 }), tiles = surf('dirty_tiles', { size: 1.6, rough: 0.5 }), concrete = surf('dirty_concrete', { size: 3 });
  const corr = surf('rusty_corrugated_iron', { size: 2.5, rough: 0.7, metal: 0.3 }), planks = surf('weathered_planks', { size: 2.5 }), mud = surf('muddy_tracks', { size: 4 });
  const ceilM = surf('peeling_painted_wall', { size: 2.5 }), dirt = surf('dirt_floor', { size: 3 }), metal = surf('rusty_metal_02', { size: 1.5, rough: 0.6, metal: 0.5 }), grate = surf('metal_grate_rusty', { size: 1, rough: 0.6, metal: 0.5 });
  c.trim = surf('wood_peeling_paint_weathered', { size: 1 });
  c.mats = { wallpaper, plaster, wood, carpet, tiles, concrete, corr, planks, mud, metal };
  // ===== HOUSE =====  x -12..12, z -10..10
  c.floor(-12, -10, -2, 0, tiles); c.floor(-2, -10, 12, 0, wood); c.floor(-12, 0, 12, 3, wood); c.floor(-12, 3, 0, 10, carpet); c.floor(0, 3, 12, 10, carpet);
  c.ceil(-12, -10, 12, 10, ceilM, H);
  c.wallX(-12, 12, -10, { h: H, m: wallpaper }); c.wallX(-12, 12, 10, { h: H, m: wallpaper });
  c.wallZ(-10, 10, -12, { h: H, m: wallpaper, gaps: [{ at: 1.5, w: 1.0 }] });
  c.wallZ(-10, 10, 12, { h: H, m: planks, gaps: [{ at: 1.5, w: 1.1 }] });
  c.wallX(-12, 12, 0, { h: H, m: wallpaper, gaps: [{ at: -7, w: 1.0 }, { at: 5, w: 1.0 }] });
  c.wallX(-12, 12, 3, { h: H, m: wallpaper, gaps: [{ at: -6, w: 1.0 }, { at: 6, w: 1.0 }] });
  c.wallZ(-10, 0, -2, { h: H, m: plaster, gaps: [{ at: -5, w: 1.2 }] });
  c.wallZ(3, 10, 0, { h: H, m: wallpaper });
  c.doors = {
    kitchen: c.door(-7, 0, { axis: 'x' }), dining: c.door(5, 0, { axis: 'x' }), bedroom: c.door(-6, 3, { axis: 'x' }), living: c.door(6, 3, { axis: 'x' }),
    front: c.door(12, 1.5, { axis: 'z', w: 1.1, locked: { msg: 'CHAINED FROM OUTSIDE' } }),
    basement: c.door(-12, 1.5, { axis: 'z', w: 1.0, locked: { msg: 'PADLOCKED. SOMEONE IS COUGHING BEHIND IT.' } }),
  };
  // kitchen: the chair, the table, the sink
  c.prop('BarberShopChair_01', -7, 0, -6.2, 0, 1, false);
  c.decal('pool', -7, 0, -6.2, 2.2); c.decal('smear', -9, 0, -3, 1.6); c.decal('drip', -11.88, 1.2, -6, 1.6, { wall: Math.PI / 2 });
  c.prop('WoodenTable_01', -4.2, 0, -8.5, 0); c.prop('rusted_hacksaw', -4.4, 0.555, -8.4, 0.4); c.prop('handsaw_wood', -3.8, 0.555, -8.7, 2);
  c.decal('pool', -4.2, 0.553, -8.5, 0.9);
  c.box(-11.4, 0, -4, 1.2, 0.9, 3, metal, { collide: true }); c.prop('wooden_bucket_01', -10.8, 0, -1.2, 0); c.decal('pool', -10.8, 0, -1.6, 0.8);
  // dining: the long table
  { const dt = c.prop('dining_table', 5, 0, -5, Math.PI / 2, 1.15); c.diningTop = new THREE.Box3().setFromObject(dt).max.y; }
  [[3.9, -6], [3.9, -4], [6.1, -6], [6.1, -4], [5, -7.6], [5, -2.4]].forEach(([x, z], i) => c.prop('painted_wooden_chair_01', x, 0, z, [Math.PI / 2, Math.PI / 2, -Math.PI / 2, -Math.PI / 2, 0, Math.PI][i], 1, i >= 4 ? false : 'auto'));
  c.prop('Television_01', 11, 0, -9, -0.6, 1); c.prop('bull_head', 2, 1.9, -9.78, 0, 1, false, { wall: true });
  c.decal('smear', 5, c.diningTop, -5, 1.2, { rot: 0.3 });
  // bedroom: grandmother
  c.prop('Rockingchair_01', -10, 0, 8.5, 2.6, 1, [0.8, 1]); c.box(-3, 0, 8.6, 2, 0.5, 2.6, surf('dirty_carpet', { size: 1 }), { collide: true, low: true });
  c.decal('words', -11.88, 1.6, 6, 1.4, { wall: Math.PI / 2 });
  // living: television, boxes
  c.prop('cardboard_box_01', 9, 0, 8.5, 0.3); c.prop('wooden_crate_01', 2, 0, 9, 0.2, 1, [0.8, 0.8]);
  // hall details
  c.decal('print', -9, 0, 1.5, 0.35, { rot: Math.PI / 2 }); c.decal('print', -10, 0, 1.4, 0.35, { rot: Math.PI / 2 }); c.decal('hand', -11.88, 1.1, 2.2, 0.5, { wall: Math.PI / 2 });
  c.decal('drip', 11.88, 1.3, 2.4, 1.2, { wall: -Math.PI / 2 });
  // clutter: a lived-in house
  c.prop('vintage_oil_lamp', -3.7, 0.555, -8.3, 0.3, 1, false); c.prop('wooden_stool_01', -5.6, 0, -9.2, 0.7, 1, [0.4, 0.4]); c.prop('metal_toolbox', -11.3, 0.9, -5.2, 1.5, 1, false);
  c.prop('old_gas_mask', -2.25, 1.55, -8.2, -Math.PI / 2, 1, false, { wall: true }); c.prop('cardboard_box_01', -10.9, 0, -9.3, 0.2, 1, [0.6, 0.5]); c.prop('cardboard_box_01', -10.9, 0.34, -9.3, 0.9, 1, false);
  c.prop('wooden_lantern_01', 11.3, 0, 2.6, 0); c.prop('propane_tank', -11.4, 0, 2.7, 0, 0.8);
  c.prop('Television_01', 1.2, 0, 9.3, Math.PI, 1, [0.8, 0.6]); c.prop('cardboard_box_01', 4, 0, 9.4, 1.2, 1, [0.6, 0.5]); c.prop('wooden_crate_01', 10.6, 0, 3.8, 0.6, 1, [0.8, 0.8]);
  c.prop('wooden_bucket_01', -1.2, 0, 9.4, 0); c.prop('vintage_oil_lamp', -3, 0.5, 8.0, 1, 1, false);
  // rugs, shelves, curtains
  const rug = surf('dirty_carpet', { size: 1.2, color: 0x8a6a5a });
  c.box(-6, 0.005, 6.5, 3, 0.01, 2, rug); c.box(6, 0.005, 6.5, 3.2, 0.01, 2.2, rug); c.box(5, 0.005, -5, 3.4, 0.01, 4.6, surf('dirty_carpet', { size: 1.4, color: 0x6a5048 }));
  const shelf = surf('wood_planks_dirt', { size: 1 });
  for (const [x, z, ry] of [[-11.8, -7, Math.PI / 2], [11.8, 8, -Math.PI / 2], [-6, -9.85, 0]]) for (const y of [1.3, 1.7]) c.box(x, y, z, Math.abs(Math.sin(ry)) > 0.5 ? 0.3 : 1.4, 0.04, Math.abs(Math.sin(ry)) > 0.5 ? 1.4 : 0.3, shelf);
  for (const [x, y, z] of [[-11.75, 1.34, -7.4], [-11.75, 1.34, -6.8], [-11.72, 1.74, -7.2], [11.75, 1.34, 8.3], [11.72, 1.74, 7.7], [-6.4, 1.34, -9.8], [-5.7, 1.34, -9.8]]) c.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), new THREE.MeshStandardMaterial({ color: [0x3a2a10, 0x2a3a20, 0x5a4a30][Math.floor(Math.random() * 3)], roughness: 0.2, transparent: true, opacity: 0.85 }), x, y + 0.11, z);
  c.windowPane(-6, 1.6, -9.88, 0, 1.2, 1.0); c.windowPane(8, 1.6, -9.88, 0, 1.2, 1.0); c.windowPane(-11.88, 1.6, 7, Math.PI / 2, 1.2, 1.0); c.windowPane(11.88, 1.6, 6.5, -Math.PI / 2, 1.2, 1.0);
  const curtain = new THREE.MeshStandardMaterial({ color: 0x5a3a30, roughness: 0.95, side: THREE.DoubleSide });
  for (const w of c.windows) for (const sx of [-1, 1]) { const g2 = new THREE.PlaneGeometry(0.45, 1.6, 8, 1); const pp = g2.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 28) * 0.03); g2.computeVertexNormals(); const cm = new THREE.Mesh(g2, curtain); cm.position.set(sx * 0.62, -0.15, 0.04); w.add(cm); }
  // hiding places
  c.hide('pantry', -11.45, -8.8, -Math.PI / 2); c.hide('wardrobe', -11.45, 5.5, -Math.PI / 2); c.hide('living', 11.45, 6, Math.PI / 2); c.hide('diningCab', 11.45, -3, Math.PI / 2);

  c.trim = null;
  // ===== YARD ===== x 12..46, z -24..24
  c.floor(12, -24, 46, 24, mud);
  const fence = planks;
  c.wallX(12, 46, -24, { h: 2.2, m: fence, t: 0.1 }); c.wallX(12, 46, 24, { h: 2.2, m: fence, t: 0.1 });
  c.wallZ(-24, 24, 46, { h: 2.2, m: fence, t: 0.1, gaps: [{ at: 0, w: 2.4, h: 2.2 }] });
  c.wallZ(-24, -10, 12, { h: 2.2, m: fence, t: 0.1 }); c.wallZ(10, 24, 12, { h: 2.2, m: fence, t: 0.1 });
  c.gate = { col: c.e.colliders.add(45.9, -1.2, 46.1, 1.2) };
  c.gate.mesh = c.mesh(new THREE.BoxGeometry(0.1, 2, 2.4), metal, 46, 1, 0);
  c.gate.chain = c.mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), metal, 45.85, 1.1, 0, Math.PI / 2);
  c.prop('Barrel_01', 20, 0, -2, 0, 1, [0.6, 0.6]); c.prop('propane_tank', 22, 0, 4, 0, 1, [0.5, 0.5]); c.prop('wooden_crate_01', 18, 0, 14, 0.4, 1, [0.8, 0.8]);
  for (let i = 0; i < 4; i++) c.decal('print', 16 + i * 1.2, 0, -1 - i * 0.6, 0.35, { rot: -1 });
  // a truck-shaped mass (no truck model; a tarp over something)
  c.box(40, 0, 16, 2.4, 1.6, 4.6, surf('rusty_metal_02', { size: 2 }), { collide: true });
  // ===== BARN / KILL FLOOR ===== x 24..42, z -22..-4
  c.floor(24, -22, 42, -4, tiles); c.ceil(24, -22, 42, -4, corr, 3.6);
  c.wallX(24, 42, -22, { h: 3.6, m: planks }); c.wallX(24, 42, -4, { h: 3.6, m: planks, gaps: [{ at: 33, w: 2.4, h: 2.6 }] });
  c.wallZ(-22, -4, 24, { h: 3.6, m: planks }); c.wallZ(-22, -4, 42, { h: 3.6, m: planks });
  for (let x = 25; x < 42; x += 2.2) c.box(x, 3.0, -13, 0.16, 0.22, 18, wood); // roof beams
  c.box(33, 3.3, -13, 17, 0.08, 0.08, metal); // rail
  for (let k = 0; k < 13; k++) c.body(25.5 + k * 1.25, -13 + (k % 2 ? 0.15 : -0.15), { tag: String(4095 - k) });
  for (let k = 0; k < 8; k++) c.body(26 + k * 1.9, -19.5, { tag: String(4080 - k) });
  c.prop('WoodenTable_01', 37, 0, -8, 0, 1.2); c.decal('pool', 37, 0.663, -8, 1.2); c.decal('pool', 37, 0, -8, 2.6);
  c.prop('wooden_axe', 36.6, 0.665, -7.9, 1.2, 1, false, { lie: true }); c.prop('sledgehammer_01', 38.5, 0, -6.5, 0.3, 1, false, { lie: true }); c.prop('metal_toolbox', 40.8, 0, -20.5, 0.5);
  c.prop('Barrel_01', 41, 0, -5.5, 0, 1, [0.6, 0.6]); c.prop('wooden_bucket_01', 35.2, 0, -9.5, 0);
  for (let k = 0; k < 5; k++) c.decal('pool', 26 + k * 3, 0, -13, 1.4 + Math.random());
  c.box(33, -0.04, -16.5, 0.8, 0.05, 0.8, grate); c.decal('smear', 33, 0, -15.5, 2, { rot: 1.5 });
  c.hide('locker', 24.45, -10, -Math.PI / 2); // locker on the west wall, facing in
  // tool locker (hollow, with a shelf; the door is added by the night that opens it)
  c.box(41.85, 0, -14, 0.1, 1.9, 2.2, metal); c.box(41.5, 0, -15.05, 0.8, 1.9, 0.1, metal); c.box(41.5, 0, -12.95, 0.8, 1.9, 0.1, metal);
  c.box(41.5, 1.88, -14, 0.8, 0.05, 2.2, metal); c.box(41.5, 0, -14, 0.8, 0.05, 2.2, metal); c.box(41.5, 0.72, -14, 0.75, 0.03, 2.0, metal);
  c.e.colliders.add(41.1, -15.1, 41.9, -12.9);
  // ===== SMOKEHOUSE ===== x 24..32, z 10..18
  c.floor(24, 10, 32, 18, dirt); c.ceil(24, 10, 32, 18, planks, 2.6);
  c.wallX(24, 32, 10, { h: 2.6, m: planks, gaps: [{ at: 28, w: 1.0 }] }); c.wallX(24, 32, 18, { h: 2.6, m: planks }); c.wallZ(10, 18, 24, { h: 2.6, m: planks }); c.wallZ(10, 18, 32, { h: 2.6, m: planks });
  for (let k = 0; k < 4; k++) c.body(25.5 + k * 2, 15.5, { tag: String(4060 - k) });
  c.hide('smoke', 31.45, 12.5, Math.PI / 2);
  // ===== BASEMENT ===== x -52..-30, z -10..10 (reached by the stairs behind the hall door)
  c.floor(-52, -10, -30, 10, concrete); c.ceil(-52, -10, -30, 10, concrete, 2.4);
  c.wallX(-52, -30, -10, { h: 2.4, m: plaster }); c.wallX(-52, -30, 10, { h: 2.4, m: plaster }); c.wallZ(-10, 10, -52, { h: 2.4, m: plaster }); c.wallZ(-10, 10, -30, { h: 2.4, m: plaster });
  // cages: bars
  const bar = new THREE.CylinderGeometry(0.015, 0.015, 2.4, 5), barM = metal;
  c.cages = [];
  for (const [cx, cz] of [[-48, 6], [-42, 6], [-36, 6], [-48, -6], [-42, -6]]) {
    const front = cz > 0 ? cz - 1.6 : cz + 1.6, back = cz > 0 ? 10 : -10;
    for (let k = 0; k < 9; k++) c.b.geo(bar, barM, cx - 1.5 + k * 0.375, 1.2, front);
    c.e.colliders.add(cx - 1.6, front - 0.05, cx + 1.6, front + 0.05);
    c.wallZ(front, back, cx - 1.65, { h: 2.4, m: plaster, t: 0.1 }); c.wallZ(front, back, cx + 1.65, { h: 2.4, m: plaster, t: 0.1 });
    c.decal('pool', cx, 0, (front + back) / 2, 1.5); c.cages.push([cx, cz]);
  }
  c.box(-31, 0, 0, 1.6, 0.05, 2, concrete); // landing at the bottom of the stairs
  c.prop('medical_box', -40, 0, -1, 0.5); c.prop('wooden_stool_01', -38, 0, 1, 0.2); c.prop('vintage_oil_lamp', -40.6, 0, 1.4, 0);
  c.decal('smear', -44, 0, 0, 3, { rot: 0.2 }); c.decal('words', -51.88, 1.3, 0, 1.3, { wall: Math.PI / 2 });
  c.hide('base1', -33, -8.5, Math.PI);
  // the stairs: the hall door at x=-12 leads down; the landing at x=-30.6 leads up
  c.onUpdate(() => {
    const h = c.head(), g = c.g;
    if (g.hidden || g.dying || c.portalCd > c.timeT) return;
    if (h.x < -12.25 && h.x > -14 && Math.abs(h.z - 1.5) < 0.8) { c.portalCd = c.timeT + 1.5; g.stairs(-31.6, 0, Math.PI / 2, 'down'); }
    else if (h.x > -30.45 && h.x < -29 && Math.abs(h.z) < 1.2) { c.portalCd = c.timeT + 1.5; g.stairs(-11.2, 1.5, -Math.PI / 2, 'up'); }
  });
  c.wallZ(-1.2, 1.2, -30, { h: 2.4, m: plaster }); // (keeps the basement closed; the portal sits just in front of it)
  // ===== LIGHTS ===== (the nights reposition the two bulbs)
  c.e.hemi.intensity = 0.06;
  // ===== NAVIGATION ===== (doorways have their own nodes so no edge crosses a wall)
  const N = [
    [-7, -6], [-4, -4], [-9, -3], [-7, -1], [-7, 1.5], [-3, 1.5], [1, 1.5], [5, 1.5], [10, 1.5], [-10, 1.5],   // 0-9
    [5, -1], [8.5, -5], [1, -5], [-1, -5], [-3, -5], [-6, 4.5], [-8, 7.5], [-3, 6.5], [6, 4.5], [9, 7.5],      // 10-19
    [3, 7], [-6, 1.5], [6, 1.5],                                                                                 // 20-22
    [13.5, 1.5], [20, 0], [28, 0], [33, -2.5], [33, -6], [28, -9], [37, -10], [30, -16], [37, -17], [26, -17.5], // 23-32
    [28, 8], [28, 13], [38, 6], [43, 0], [20, 12], [20, -14],                                                  // 33-38
    [-31, 0], [-36, 0], [-42, 0], [-48, 0], [-40, -3], [-34, 3],                                                // 39-44
  ];
  const E = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [1, 14], [0, 14], [14, 13], [13, 12], [12, 10], [10, 11], [4, 9], [4, 21], [21, 5], [5, 6], [6, 7], [7, 22], [22, 8], [7, 10],
    [21, 15], [15, 16], [15, 17], [22, 18], [18, 19], [18, 20],
    [8, 23], [23, 24], [24, 25], [25, 26], [26, 27], [27, 28], [27, 29], [28, 30], [29, 31], [30, 31], [30, 32], [28, 32], [25, 33], [33, 34], [24, 37], [37, 33], [25, 35], [35, 36], [25, 36], [24, 38],
    [39, 40], [40, 41], [41, 42], [41, 43], [40, 44], [43, 40]];
  c.nav = new Nav(N, E);

}
export { FONT };
