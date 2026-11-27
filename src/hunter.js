// The family. A hunter that sees, hears, chases, searches hiding places and remembers you.
import * as THREE from 'three';
import { character } from './assets.js';
import { textCanvas, canvasTex } from './textures.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);

// ---------- navigation graph ----------
export class Nav {
  constructor(nodes, edges) {
    this.nodes = nodes.map(([x, z], i) => ({ i, x, z, n: [] }));
    for (const [a, b] of edges) { this.nodes[a].n.push(b); this.nodes[b].n.push(a); }
  }
  nearest(x, z, cols) {
    let best = null, bd = 1e9;
    for (const nd of this.nodes) { const d = (nd.x - x) ** 2 + (nd.z - z) ** 2; if (d < bd && (!cols || los(cols, x, z, nd.x, nd.z))) { bd = d; best = nd; } }
    return best || this.nearest(x, z, null);
  }
  path(a, b) {
    if (a === b) return [a];
    const open = new Set([a.i]), came = {}, g = { [a.i]: 0 }, f = { [a.i]: 0 };
    while (open.size) {
      let cur = null, cf = 1e9; for (const i of open) if (f[i] < cf) { cf = f[i]; cur = i; }
      if (cur === b.i) { const p = [this.nodes[cur]]; while (came[cur] !== undefined) { cur = came[cur]; p.unshift(this.nodes[cur]); } return p; }
      open.delete(cur);
      for (const nb of this.nodes[cur].n) {
        const A = this.nodes[cur], B = this.nodes[nb], t = g[cur] + Math.hypot(A.x - B.x, A.z - B.z);
        if (g[nb] === undefined || t < g[nb]) { came[nb] = cur; g[nb] = t; f[nb] = t + Math.hypot(B.x - b.x, B.z - b.z); open.add(nb); }
      }
    }
    return [a];
  }
  random(except) { let n; do n = this.nodes[(Math.random() * this.nodes.length) | 0]; while (n === except && this.nodes.length > 1); return n; }
}
// 2D line of sight against wall colliders (ignores low furniture)
export function los(cols, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0;
  for (const b of cols.list) {
    if (!b.on || b.tag === 'low') continue;
    let t0 = 0, t1 = 1;
    for (const [p, d, lo, hi] of [[x0, dx, b.x0, b.x1], [z0, dz, b.z0, b.z1]]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { t0 = 2; break; } continue; }
      let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) break;
    }
    if (t0 <= t1 && t0 < 1 && t1 > 0) return false;
  }
  return true;
}

// ---------- costume: burlap sack mask, stained clothes ----------
let maskTex = null, clothMat = null, skinMat = null;
function burlap() {
  if (maskTex) return maskTex;
  const { c, g } = textCanvas(512, 512);
  g.fillStyle = '#7a6448'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 3) { g.fillStyle = `rgba(40,28,15,${0.15 + Math.random() * 0.2})`; g.fillRect(0, y, 512, 1); }
  for (let x = 0; x < 512; x += 3) { g.fillStyle = `rgba(160,130,90,${0.08 + Math.random() * 0.12})`; g.fillRect(x, 0, 1, 512); }
  for (let i = 0; i < 18; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 10 + Math.random() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,8,4,0.85)'); gr.addColorStop(1, 'rgba(70,8,4,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // the face is drawn twice (front and back of the sphere) so it reads from any mapping: ragged eye holes, stitched mouth
  for (const cx of [128, 384]) {
    g.fillStyle = '#030201';
    for (const ox of [-38, 38]) { g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = 20 + Math.random() * 9; g.lineTo(cx + ox + Math.cos(a) * r, 205 + Math.sin(a) * r * 0.8); } g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(60,8,4,0.9)'; g.lineWidth = 3;
    for (const ox of [-38, 38]) for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(cx + ox - 10 + k * 5, 228); g.lineTo(cx + ox - 12 + k * 6, 260 + Math.random() * 60); g.stroke(); }
    g.strokeStyle = '#120603'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 50, 300); g.quadraticCurveTo(cx, 318, cx + 50, 296); g.stroke();
    g.lineWidth = 3; for (let k = -44; k <= 44; k += 11) { g.beginPath(); g.moveTo(cx + k, 288); g.lineTo(cx + k + 2, 322); g.stroke(); }
    g.fillStyle = 'rgba(70,6,3,0.85)'; for (let k = 0; k < 4; k++) g.fillRect(cx - 35 + k * 22 + Math.random() * 8, 312, 4 + Math.random() * 4, 30 + Math.random() * 90);
  }
  maskTex = canvasTex(c); return maskTex;
}
function cloth() {
  if (clothMat) return clothMat;
  const { c, g } = textCanvas(256, 256);
  g.fillStyle = '#3a3428'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '90,80,60'},0.15)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  for (let i = 0; i < 14; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 8 + Math.random() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(60,4,2,0.9)'); gr.addColorStop(1, 'rgba(60,4,2,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  clothMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  skinMat = new THREE.MeshStandardMaterial({ color: 0xb8a898, roughness: 0.7 });
  return clothMat;
}
export function dress(ch, { mask = true, apron = false, skin = false, scale = 1, recolor = true } = {}) {
  ch.root.scale.setScalar(scale);
  if (recolor) {
    ch.root.traverse(o => { if (o.isSkinnedMesh) o.material = skin ? (cloth(), skinMat) : cloth(); });
  }
  const extras = [];
  if (mask) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.135, 16, 12), new THREE.MeshStandardMaterial({ map: burlap(), roughness: 1 }));
    m.scale.set(1.12, 1.32, 1.15); extras.push({ mesh: m, bone: ch.bone('Head'), off: new THREE.Vector3(0, 0.1, 0.02), rotY: Math.PI });
    // the rope tied around the neck
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 1 }));
    rope.rotation.x = Math.PI / 2; const rg = new THREE.Group(); rg.add(rope);
    extras.push({ mesh: rg, bone: ch.bone('Neck'), off: new THREE.Vector3(0, 0.03, 0), rotY: 0 });
  }
  if (apron) {
    const { c, g } = textCanvas(128, 256); g.fillStyle = '#4a4034'; g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,15,10' : '90,80,64'},0.25)`; g.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
    for (let i = 0; i < 9; i++) { const x = Math.random() * 128, y = 40 + Math.random() * 180, r = 14 + Math.random() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(48,3,1,0.95)'); gr.addColorStop(1, 'rgba(48,3,1,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(${45 + Math.random() * 25},2,1,${0.5 + Math.random() * 0.4})`; g.lineWidth = 2 + Math.random() * 5; const x = Math.random() * 128; g.beginPath(); g.moveTo(x, 80 + Math.random() * 80); g.lineTo(x + (Math.random() - 0.5) * 10, 256); g.stroke(); }
    for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(40,2,1,0.8)'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); const y = 60 + Math.random() * 120; g.moveTo(10, y); g.lineTo(118, y + (Math.random() - 0.5) * 30); g.stroke(); } // wiped hands
    const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.95), new THREE.MeshStandardMaterial({ map: canvasTex(c), roughness: 0.35, side: THREE.DoubleSide }));
    extras.push({ mesh: ap, bone: ch.bone('Spine1') || ch.bone('Spine'), off: new THREE.Vector3(0, -0.25, 0.16), rotY: 0 });
  }
  ch.extras = extras;
  return ch;
}
export function syncExtras(ch, scene) {
  for (const e of ch.extras || []) {
    if (!e.mesh.parent) scene.add(e.mesh);
    if (!e.bone) continue;
    e.bone.getWorldPosition(_a); e.bone.getWorldQuaternion(_q);
    e.mesh.quaternion.copy(_q); if (e.rotY) e.mesh.quaternion.multiply(_qy.setFromAxisAngle(_Y, e.rotY));
    e.mesh.position.copy(e.off).multiplyScalar(ch.root.scale.x).applyQuaternion(_q).add(_a);
    e.mesh.visible = ch.root.visible;
  }
}

// ---------- the hunter ----------
export class Hunter {
  constructor(game, { model = 'Xbot', nav, walk = 1.15, run = 2.55, sight = 13, fov = 115, hearing = 15, scale = 1.1, apron = true, name = 'HIM', voice = ['c_troll1', 'c_troll2', 'c_troll3'] } = {}) {
    this.g = game; this.nav = nav; this.name = name;
    this.ch = dress(character(model), { apron, scale, recolor: model === 'Xbot' });
    this.root = this.ch.root; game.engine.world.add(this.root);
    this.mixer = this.ch.mixer; this.acts = this.ch.actions; this.cur = null; this.play('idle');
    this.pos = this.root.position; this.yaw = 0;
    this.walkSpeed = walk; this.runSpeed = run; this.sight = sight; this.fov = fov; this.hearing = hearing; this.voice = voice;
    this.state = 'idle'; this.path = []; this.target = null; this.lastSeen = new THREE.Vector3(); this.lastHeard = new THREE.Vector3();
    this.t = 0; this.alert = 0; this.memory = game.save.d.hideMemory || (game.save.d.hideMemory = {}); this.searchList = [];
    this.stepT = 0; this.voiceT = 5 + Math.random() * 10; this.enabled = true; this.doors = []; this.hideSpots = [];
    this.work = null; this.seenEnter = null; this.lostT = 0; this.aggro = 0;
  }
  play(name, fade = 0.35, ts = 1) {
    const a = this.acts[name] || this.acts.idle; if (!a) return;
    a.timeScale = ts; if (this.cur === a) return;
    a.reset().fadeIn(fade).play(); if (this.cur) this.cur.fadeOut(fade); this.cur = a;
  }
  place(x, z, yaw = 0) { this.pos.set(x, 0, z); this.yaw = yaw; this.root.rotation.y = yaw + Math.PI; this.path = []; }
  get head() { return _b.set(this.pos.x, 1.75 * this.root.scale.x, this.pos.z); }
  say(name, vol = 0.9) { this.g.audio.play(name || this.voice, this.head.clone(), { vol, ref: 2 }); }
  // ----- senses -----
  canSee() {
    const g = this.g, p = g.engine.headPos(_a);
    if (g.hidden) return false;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    const lit = g.player.flashOn && g.flashAllowed && g.player.battery > 0;
    const range = this.sight * (lit ? 1.5 : 1) * (g.player.crouched ? 0.6 : 1);
    if (d > range) return false;
    if (d > 1.6) { const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); if ((fx * dx + fz * dz) / d < Math.cos(THREE.MathUtils.degToRad(this.fov / 2))) return false; }
    return los(g.engine.colliders, this.pos.x, this.pos.z, p.x, p.z);
  }
  beamOnMe() {
    const g = this.g; if (!(g.player.flashOn && g.flashAllowed && g.player.battery > 0)) return false;
    const fl = g.engine.flash, dir = _a.subVectors(g.engine.flashTarget.position, fl.position).normalize();
    const to = _b.set(this.pos.x - fl.position.x, 1.2 - fl.position.y, this.pos.z - fl.position.z); const d = to.length(); if (d > 22) return false;
    return to.normalize().dot(dir) > 0.94 && los(g.engine.colliders, fl.position.x, fl.position.z, this.pos.x, this.pos.z);
  }
  hear() {
    const g = this.g, p = g.engine.headPos(_a), d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    const n = g.player.noise * (g.hidden ? (g.audio.micOn ? 1 : 0.1) : 1);
    const thru = los(g.engine.colliders, this.pos.x, this.pos.z, p.x, p.z) ? 1 : 0.55;
    return n * this.hearing * thru > d;
  }
  // ----- movement -----
  goTo(x, z, run = false) {
    const nav = this.nav, a = nav.nearest(this.pos.x, this.pos.z, this.g.engine.colliders), b = nav.nearest(x, z, this.g.engine.colliders);
    this.path = nav.path(a, b).map(n => new THREE.Vector3(n.x, 0, n.z)); this.path.push(new THREE.Vector3(x, 0, z)); this.running = run;
  }
  step(dt, speed) {
    const tgt = this.path[0]; if (!tgt) return true;
    const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { this.path.shift(); return this.path.length === 0; }
    const mv = Math.min(d, speed * dt);
    let nx = this.pos.x + dx / d * mv, nz = this.pos.z + dz / d * mv;
    const r = this.g.engine.colliders.resolve(nx, nz, 0.28); nx = r.x; nz = r.z;
    // stuck against geometry: skip to next node
    if (Math.hypot(nx - this.pos.x, nz - this.pos.z) < mv * 0.2) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.2) { this.path.shift(); this.stuck = 0; } } else this.stuck = 0;
    this.pos.x = nx; this.pos.z = nz;
    this.face(Math.atan2(-dx, -dz), dt * 6);
    // open doors as it passes
    for (const dr of this.doors) if (!dr.isOpen && Math.hypot(dr.pivot.position.x - this.pos.x, dr.pivot.position.z - this.pos.z) < 1.4) { if (dr.locked && !dr.hunterKey) continue; dr.open(true); this.g.audio.play('door' + (1 + (Math.random() * 3 | 0)), dr.pivot.position.clone().setY(1), { vol: 0.9 }); }
    this.stepT -= dt * speed;
    if (this.stepT <= 0) { this.stepT = 0.75; this.g.audio.play(['step1', 'step2', 'step3', 'step4', 'step5', 'step6'], _a.set(this.pos.x, 0.1, this.pos.z).clone(), { vol: this.running ? 1.2 : 0.8, rate: 0.85, ref: 2.5 }); }
    return false;
  }
  face(yaw, k) { let d = yaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, k); this.root.rotation.y = this.yaw + Math.PI; }
  faceTo(x, z, k) { this.face(Math.atan2(-(x - this.pos.x), -(z - this.pos.z)), k); }
  // ----- brain -----
  set(state) { this.state = state; this.t = 0; }
  update(dt) {
    this.mixer.update(dt); syncExtras(this.ch, this.g.engine.world);
    if (!this.enabled || this.g.dying) return;
    const g = this.g, p = g.engine.headPos(new THREE.Vector3()), dist = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.t += dt;
    const sees = this.canSee();
    if (sees) { this.lastSeen.set(p.x, 0, p.z); this.alert = Math.min(1, this.alert + dt * (dist < 6 ? 3 : 1.2)); }
    else this.alert = Math.max(0, this.alert - dt * 0.15);
    // voice
    this.voiceT -= dt; if (this.voiceT <= 0) { this.voiceT = 8 + Math.random() * 14; this.say(this.state === 'chase' ? ['c_grunt1', 'c_grunt3', 'c_grunt4', 'c_grunt5'] : this.voice, this.state === 'chase' ? 1 : 0.55); }
    if (this.state !== 'chase' && this.state !== 'grab') {
      if (sees && this.alert > 0.55) { this.set('chase'); this.say('c_scream2', 1); g.onSpotted && g.onSpotted(this); }
      else if ((this.hear() || this.beamOnMe()) && this.state !== 'investigate' && this.state !== 'searchSpot') { this.lastHeard.set(p.x + (Math.random() - 0.5) * 3, 0, p.z + (Math.random() - 0.5) * 3); this.set('investigate'); this.goTo(this.lastHeard.x, this.lastHeard.z); this.say(['c_nose', 'c_grunt1'], 0.6); }
    }
    switch (this.state) {
      case 'idle': this.play('idle'); if (this.t > 2) this.patrol(); break;
      case 'work': {
        const w = this.work; if (!w) { this.set('idle'); break; }
        if (Math.hypot(this.pos.x - w.x, this.pos.z - w.z) > 0.4) { if (!this.path.length) this.goTo(w.x, w.z); this.play('walk'); this.step(dt, this.walkSpeed); }
        else { this.face(w.yaw, dt * 3); this.play(w.anim || 'idle'); w.tick && w.tick(dt, this); }
        break;
      }
      case 'patrol': this.play('walk', 0.4, 0.9); if (this.step(dt, this.walkSpeed)) { this.set('look'); } break;
      case 'look': this.play('idle'); this.face(this.yaw + Math.sin(this.t * 1.3) * 0.02, 1); if (this.t > 2.5 + Math.random()) { this.work ? this.set('work') : this.patrol(); } break;
      case 'investigate': this.play('walk', 0.3, 1.15); if (this.step(dt, this.walkSpeed * 1.25)) { this.set('searchHere'); } break;
      case 'searchHere': {
        this.play('idle'); this.face(this.yaw + dt * 1.2, 1);
        if (this.t > 3) { this.planSearch(this.lastHeard.lengthSq() ? this.lastHeard : this.pos); }
        break;
      }
      case 'chase': {
        this.running = true; this.play('run', 0.2, 1.05);
        if (sees) {
          this.lostT = 0; this.path = [new THREE.Vector3(p.x, 0, p.z)];
          if (dist < 0.9) { this.grab(); break; }
        } else {
          this.lostT += dt;
          if (g.hidden && this.seenEnter === g.hidden) { this.path = [g.hidden.front.clone()]; if (Math.hypot(g.hidden.front.x - this.pos.x, g.hidden.front.z - this.pos.z) < 0.6) { this.openSpot(g.hidden, true); break; } }
          else if (!this.path.length || this.lostT > 0.5 && this.path.length === 1 && this.path[0].distanceTo(this.lastSeen) > 0.1) this.goTo(this.lastSeen.x, this.lastSeen.z, true);
          if (this.lostT > 7) { this.planSearch(this.lastSeen); break; }
        }
        this.step(dt, this.runSpeed * (1 + this.aggro * 0.15));
        if (!sees && this.path.length === 0) this.planSearch(this.lastSeen);
        break;
      }
      case 'searchSpot': {
        const s = this.searchList[0]; if (!s) { this.patrol(); break; }
        this.play('walk', 0.3, 1.1);
        if (this.step(dt, this.walkSpeed * 1.1)) { this.openSpot(s, false); }
        break;
      }
      case 'opening': {
        this.play('idle'); const s = this.opening; this.faceTo(s.pos.x, s.pos.z, dt * 8);
        if (this.t > 0.9 && !this.openedNow) { this.openedNow = true; s.setOpen(true); this.g.audio.play('door' + (4 + (Math.random() * 3 | 0)), s.pos.clone().setY(1.2), { vol: 1 }); if (this.g.hidden === s) { this.grab(); break; } }
        if (this.t > 2.6) { s.setOpen(false); this.searchList.shift(); this.searchList.length ? (this.set('searchSpot'), this.path = [this.searchList[0].front.clone()]) : this.patrol(); }
        break;
      }
      case 'grab': break;
    }
  }
  patrol() {
    if (this.work && Math.random() < 0.55) { this.set('work'); this.path = []; return; }
    const n = this.nav.random(); this.goTo(n.x, n.z); this.set('patrol'); this.running = false;
  }
  planSearch(center) {
    // check the hiding places near where it lost you, the ones you used before first
    const spots = this.hideSpots.filter(s => s.enabled !== false && s.pos.distanceTo(_a.set(center.x, 0, center.z)) < 9)
      .map(s => ({ s, w: Math.random() + (this.memory[s.id] || 0) * 0.8 + (this.seenEnter === s ? 5 : 0) }))
      .filter(o => o.w > 0.75).sort((a, b) => b.w - a.w).slice(0, 3).map(o => o.s);
    this.searchList = spots;
    if (spots.length) { this.set('searchSpot'); this.goTo(spots[0].front.x, spots[0].front.z); }
    else this.patrol();
  }
  openSpot(s, knew) { this.opening = s; this.openedNow = false; this.set('opening'); this.path = []; if (knew) this.t = 0.5; }
  grab() {
    if (this.state === 'grab') return; this.set('grab'); this.play('idle', 0.1);
    this.g.caught(this);
  }
  // when the player hides in front of it
  noticeHide(spot) { if (this.canSeeIgnoringHide(spot)) this.seenEnter = spot; }
  canSeeIgnoringHide() { const h = this.g.hidden; this.g.hidden = null; const r = this.canSee(); this.g.hidden = h; return r; }
}

// ---------- a passive family member (watches, listens, screams for him) ----------
export class Watcher {
  constructor(game, { model = 'Xbot', anim = 'idle', ts = 1, scale = 1, mask = true, sight = 8, hearing = 6, blind = false } = {}) {
    this.g = game; this.ch = dress(character(model), { mask, scale, recolor: model === 'Xbot' }); this.root = this.ch.root; game.engine.world.add(this.root);
    const a = this.ch.actions[anim] || Object.values(this.ch.actions)[0]; a.timeScale = ts; a.play(); this.act = a;
    this.sight = sight; this.hearing = hearing; this.blind = blind; this.cool = 0; this.yaw = 0; this.enabled = true;
  }
  place(x, z, yaw) { this.root.position.set(x, 0, z); this.root.rotation.y = yaw + Math.PI; this.yaw = yaw; }
  update(dt) {
    this.ch.mixer.update(dt); syncExtras(this.ch, this.g.engine.world);
    if (!this.enabled || this.g.dying) return;
    this.cool -= dt; if (this.cool > 0) return;
    const g = this.g, p = g.engine.headPos(_a), x = this.root.position.x, z = this.root.position.z, d = Math.hypot(p.x - x, p.z - z);
    let noticed = false;
    if (!this.blind && !g.hidden && d < this.sight * (g.player.flashOn && g.flashAllowed ? 1.4 : 1)) {
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      if ((fx * (p.x - x) + fz * (p.z - z)) / d > 0.3 && los(g.engine.colliders, x, z, p.x, p.z)) noticed = true;
    }
    if (g.player.noise * this.hearing * (g.hidden ? 0.3 : 1) > d) noticed = true;
    if (noticed) {
      this.cool = 12; this.act.timeScale = 0;
      g.audio.play(['c_scream1', 'scream1'], new THREE.Vector3(x, 1.6, z), { vol: 1.2, ref: 3 });
      this.yaw = Math.atan2(-(p.x - x), -(p.z - z)); this.root.rotation.y = this.yaw + Math.PI;
      for (const h of g.hunters) { h.lastHeard.set(p.x, 0, p.z); h.lastSeen.set(p.x, 0, p.z); h.alert = 0.5; h.set('investigate'); h.goTo(p.x, p.z, true); h.running = true; }
      g.after(6, () => { this.act.timeScale = this.baseTs ?? 1; });
    }
  }
}
