// THE COMPLETION: a pale faceless figure built from the player's own recorded motion.
// Also: THE UNOBSERVED — things that only change outside the player's gaze.
import * as THREE from 'three';

const RATE = 30, CAP = RATE * 100;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _up = new THREE.Vector3(0, 1, 0);

export class Recorder {
  constructor(game) {
    this.g = game; this.n = 0; this.acc = 0; this.t = 0;
    this.buf = new Float32Array(CAP * 13); // t, hx,hy,hz, yaw,pitch,roll, lx,ly,lz, rx,ry,rz
  }
  reset() { this.n = 0; }
  update(dt) {
    this.t += dt; this.acc += dt; if (this.acc < 1 / RATE) return; this.acc = 0;
    const e = this.g.engine, inp = this.g.input, i = (this.n % CAP) * 13, B = this.buf;
    e.headPos(_a); _q.setFromRotationMatrix(e.camera.matrixWorld); _e.setFromQuaternion(_q, 'YXZ');
    B[i] = this.t; B[i + 1] = _a.x; B[i + 2] = _a.y; B[i + 3] = _a.z; B[i + 4] = _e.y; B[i + 5] = _e.x; B[i + 6] = _e.z;
    inp.handPos('left', _b); B[i + 7] = _b.x; B[i + 8] = _b.y; B[i + 9] = _b.z;
    inp.handPos('right', _b); B[i + 10] = _b.x; B[i + 11] = _b.y; B[i + 12] = _b.z;
    this.n++;
  }
  get span() { return Math.min(this.n, CAP) / RATE; }
  // sample the pose from `ago` seconds in the past. Negative = extrapolated future.
  sample(ago, out) {
    if (this.n < 2) return null;
    const B = this.buf;
    if (ago < 0) {
      const l = this._idx(0), p = this._idx(Math.min(0.35, this.span - 0.05));
      const dtp = Math.max(0.05, B[l] - B[p]), k = -ago / dtp;
      for (let j = 1; j < 13; j++) {
        let d = B[l + j] - B[p + j];
        if (j === 4 || j === 6) d = Math.atan2(Math.sin(d), Math.cos(d));
        out[j] = B[l + j] + d * k * (j === 2 ? 0.5 : 1);
      }
      return out;
    }
    const i = this._idx(Math.min(ago, this.span - 0.05));
    for (let j = 1; j < 13; j++) out[j] = B[i + j];
    return out;
  }
  _idx(ago) { const k = Math.max(0, Math.min(Math.min(this.n, CAP) - 1, Math.round(ago * RATE))); return ((this.n - 1 - k) % CAP + CAP) % CAP * 13; }
}

function limb(r0, r1, len, m) { const g = new THREE.CylinderGeometry(r1, r0, len, 6, 1); g.translate(0, len / 2, 0); return new THREE.Mesh(g, m); }

export class Figure {
  constructor(scene, color = 0xd6d2c8) {
    const m = this.mat = new THREE.MeshLambertMaterial({ color, emissive: 0x1a1a18 });
    const g = this.root = new THREE.Group();
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), m); this.head.scale.set(0.92, 1.28, 1.02);
    this.torso = limb(0.13, 0.17, 0.58, m); this.pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), m); this.pelvis.scale.y = 0.7;
    this.neck = limb(0.04, 0.035, 0.16, m);
    this.arms = [limb(0.04, 0.03, 1, m), limb(0.04, 0.03, 1, m)];
    this.hands = [0, 1].map(() => { const h = new THREE.Group(); const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.1), m); h.add(p);
      for (let f = 0; f < 4; f++) { const fi = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.11), m); fi.position.set(-0.027 + f * 0.018, 0, -0.1); h.add(fi); } return h; });
    this.legs = [limb(0.06, 0.05, 1, m), limb(0.06, 0.05, 1, m)];
    g.add(this.head, this.torso, this.pelvis, this.neck, ...this.arms, ...this.hands, ...this.legs);
    g.traverse(o => { o.frustumCulled = false; });
    g.visible = false; scene.add(g);
    this.walk = 0; this.lastPos = new THREE.Vector3(); this.yaw = 0;
    this.headPos = new THREE.Vector3(); this.scale = 1; this.wrongness = 0;
  }
  set visible(v) { this.root.visible = v; } get visible() { return this.root.visible; }
  // pose: array [ , hx,hy,hz, yaw,pitch,roll, lx,ly,lz, rx,ry,rz ] in world space
  pose(P, dt = 0.016) {
    const s = this.scale, W = this.wrongness;
    this.headPos.set(P[1], P[2], P[3]);
    this.head.position.copy(this.headPos);
    this.head.rotation.set(P[5] * (1 + W * 0.6), P[4], P[6] + W * 0.35, 'YXZ');
    let dy = P[4] - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * Math.min(1, dt * 4);
    const fwdX = -Math.sin(this.yaw), fwdZ = -Math.cos(this.yaw), rX = Math.cos(this.yaw), rZ = -Math.sin(this.yaw);
    const hy = P[2];
    const neckBase = _a.set(P[1] - fwdX * 0.05, hy - 0.2 * s, P[3] - fwdZ * 0.05);
    this.neck.position.copy(neckBase); this.neck.scale.setScalar(s);
    const pel = _b.set(neckBase.x, Math.max(0.5, hy - 0.8 * s), neckBase.z);
    this.pelvis.position.copy(pel); this.pelvis.scale.set(s, 0.7 * s, s);
    this._stretch(this.torso, pel, neckBase, 1);
    // arms: shoulder -> hand (slightly too long when wrong)
    for (let i = 0; i < 2; i++) {
      const sx = (i ? 1 : -1) * 0.2 * s;
      const sh = _c.set(neckBase.x + rX * sx, neckBase.y - 0.03, neckBase.z + rZ * sx);
      const hp = new THREE.Vector3(P[7 + i * 3], P[8 + i * 3], P[9 + i * 3]);
      if (W > 0) hp.sub(sh).multiplyScalar(1 + W * 0.35).add(sh);
      this._stretch(this.arms[i], sh, hp, 1);
      this.hands[i].position.copy(hp); this.hands[i].rotation.set(-0.4, this.yaw + (i ? -0.2 : 0.2), 0, 'YXZ');
    }
    // legs with a stride driven by ground speed
    const sp = Math.hypot(pel.x - this.lastPos.x, pel.z - this.lastPos.z) / Math.max(dt, 1e-3); this.lastPos.copy(pel);
    this.walk += Math.min(sp, 4) * dt * 5;
    for (let i = 0; i < 2; i++) {
      const sx = (i ? 1 : -1) * 0.1 * s, ph = Math.sin(this.walk + i * Math.PI) * Math.min(1, sp) * 0.25;
      const hip = _c.set(pel.x + rX * sx, pel.y, pel.z + rZ * sx);
      const foot = new THREE.Vector3(hip.x + fwdX * ph, 0, hip.z + fwdZ * ph);
      this._stretch(this.legs[i], foot, hip, 1);
    }
  }
  _stretch(mesh, a, b) {
    const d = _q, dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    mesh.position.copy(a); mesh.scale.set(this.scale, Math.max(0.01, len), this.scale);
    if (len > 1e-4) mesh.quaternion.setFromUnitVectors(_up, dir.multiplyScalar(1 / len));
  }
  poseStanding(x, z, yaw, h = 1.65) {
    const P = [0, x, h, z, yaw, 0, 0, 0, 0, 0, 0, 0, 0];
    const rX = Math.cos(yaw), rZ = -Math.sin(yaw);
    P[7] = x - rX * 0.25; P[8] = h - 0.85; P[9] = z - rZ * 0.25; P[10] = x + rX * 0.25; P[11] = h - 0.85; P[12] = z + rZ * 0.25;
    this.lastPos.set(x, 0.85, z); this.pose(P, 1); return P;
  }
}

// mirror a sampled pose across a plane x=c or z=c (in place)
export function reflectPose(P, axis, c) {
  if (axis === 'x') { P[1] = 2 * c - P[1]; P[7] = 2 * c - P[7]; P[10] = 2 * c - P[10]; P[4] = -P[4]; P[6] = -P[6]; }
  else { P[3] = 2 * c - P[3]; P[9] = 2 * c - P[9]; P[12] = 2 * c - P[12]; P[4] = Math.PI - P[4]; P[6] = -P[6]; }
  for (let j = 0; j < 3; j++) { const t = P[7 + j]; P[7 + j] = P[10 + j]; P[10 + j] = t; }
  return P;
}

// The entity controller
export class Completion {
  constructor(game) {
    this.g = game; this.fig = new Figure(game.engine.scene); this.rec = game.recorder;
    this.mode = 'off'; this.P = new Array(13).fill(0); this.delay = 12; this.minDelay = 1.0; this.aggression = 0.15;
    this.freezeWhenSeen = true; this.anchor = new THREE.Vector3(); this.anchorYaw = 0; this.mirror = null;
    this.lag = 1.5; this.seenT = 0; this.hunting = false; this.predict = 0; this.catchDist = 0.65;
    this.pos = new THREE.Vector3(); this.speed = 1.4; this.onCaught = null; this.stepT = 0; this.surface = 'hard';
    this.vanishOnLook = 0; this.footsteps = true; this.observed = false;
  }
  off() { this.mode = 'off'; this.fig.visible = false; this.hunting = false; this.g.audio.heartRate = 0; this.fig.wrongness = 0; this.fig.scale = 1; }
  // stands somewhere, frozen in a pose (optionally vanishing once looked at)
  glimpse(x, z, yaw, { vanish = 0.6, h = 1.62 } = {}) { this.watchT = 0; this.mode = 'glimpse'; this.fig.visible = true; this.fig.poseStanding(x, z, yaw, h); this.pos.set(x, h, z); this.vanishOnLook = vanish; this.seenT = 0; this.hunting = false; }
  // copies player's body language at an anchor point, facing them, with a lag (negative lag = predicts)
  mimic(x, z, { lag = 1.5, mirror = true, faceYaw = null } = {}) { this.mode = 'mimic'; this.anchor.set(x, 0, z); this.lag = lag; this.mirrored = mirror; this.faceYaw = faceYaw; this.fig.visible = true; this.hunting = false; this.vanishOnLook = 0; }
  // real mirror: reflect player across a plane (normal along axis 'x' or 'z' at coordinate c)
  reflect(axis, c, { lag = 0 } = {}) { this.mode = 'reflect'; this.mirror = { axis, c }; this.lag = lag; this.fig.visible = true; this.hunting = false; }
  // walks the player's own path, `delay` seconds behind them
  hunt({ delay = 12, aggression = 0.15, freezeWhenSeen = true, predict = 0, minDelay = 1.0 } = {}) {
    this.mode = 'hunt'; this.startDelay = delay; this.delay = delay; this.aggression = aggression; this.freezeWhenSeen = freezeWhenSeen;
    this.predict = predict; this.minDelay = minDelay; this.fig.visible = true; this.hunting = true; this.vanishOnLook = 0; this.huntT = 0;
  }
  // free movement toward player's predicted position
  stalk({ speed = 1.3, predict = 1.5, freezeWhenSeen = false, x, z } = {}) {
    this.mode = 'stalk'; this.speed = speed; this.predict = predict; this.freezeWhenSeen = freezeWhenSeen; this.hunting = true; this.fig.visible = true;
    if (x !== undefined) this.pos.set(x, 1.62, z);
  }
  distToPlayer() { const h = this.g.engine.headPos(_a); return Math.hypot(h.x - this.fig.headPos.x, h.z - this.fig.headPos.z); }
  update(dt) {
    const g = this.g, P = this.P, rec = this.rec, uo = g.unobserved;
    if (this.mode === 'off') return;
    this.observed = this.fig.visible && uo.isObserved(this.fig.headPos, 50, 0.4);
    if (this.mode === 'glimpse') {
      if (this.observed) {
        // it notices you: the head turns toward you, slowly, and tilts
        this.watchT = (this.watchT || 0) + dt;
        const h = g.engine.headPos(_a), hp = this.fig.headPos;
        const want = Math.atan2(-(h.x - hp.x), -(h.z - hp.z)); let dy = want - this.fig.head.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        this.fig.head.rotation.y += dy * Math.min(1, dt * 0.35);
        this.fig.head.rotation.z += (Math.min(0.45, this.watchT * 0.08) - this.fig.head.rotation.z) * dt * 0.5;
      }
      if (this.observed) { this.seenT += dt; if (this.vanishOnLook && this.seenT > this.vanishOnLook) { this.off(); g.director.onGlimpseSeen(); } }
      return;
    }
    if (this.mode === 'mimic' || this.mode === 'reflect') {
      if (!rec.sample(this.lag, P)) return;
      const h = g.engine.headPos(_a);
      if (this.mode === 'reflect') {
        reflectPose(P, this.mirror.axis, this.mirror.c);
      } else {
        // express pose in player's yaw frame, then rebuild around anchor facing the player
        const yaw = P[4], cy = Math.cos(-yaw), sy = Math.sin(-yaw), hx = P[1], hz = P[3];
        const face = this.faceYaw ?? Math.atan2(-(h.x - this.anchor.x), -(h.z - this.anchor.z));
        const cf = Math.cos(face), sf = Math.sin(face);
        const loc = (x, z) => { const dx = x - hx, dz = z - hz; let lx = dx * cy + dz * sy, lz = -dx * sy + dz * cy; if (this.mirrored) lx = -lx; return [this.anchor.x + lx * cf + lz * sf, this.anchor.z - lx * sf + lz * cf]; };
        const [lx, lz] = loc(P[7], P[9]), [rx, rz] = loc(P[10], P[12]);
        if (this.mirrored) { P[7] = rx; P[9] = rz; P[10] = lx; P[12] = lz; const t = P[8]; P[8] = P[11]; P[11] = t; P[6] = -P[6]; }
        else { P[7] = lx; P[9] = lz; P[10] = rx; P[12] = rz; }
        P[1] = this.anchor.x; P[3] = this.anchor.z; P[4] = face;
      }
      this.fig.pose(P, dt); return;
    }
    if (this.mode === 'hunt') {
      if (rec.span < this.startDelay + 0.5) { this.fig.visible = false; return; }
      this.fig.visible = true;
      // its clock stops while you watch it (if allowed); noise and aggression close the gap
      const noise = g.player.noise, seen = this.freezeWhenSeen && this.observed;
      const rate = seen ? 0 : 1 + this.aggression + noise * 0.9 + g.director.huntBoost;
      this.delay += dt * (1 - rate);
      this.delay = Math.max(this.minDelay, Math.min(this.delay, rec.span - 0.2));
      if (!rec.sample(this.delay, P)) return;
      if (this.predict > 0 && this.delay < 4) {
        // near the end of the trail it stops following and goes where you are about to be
        const F = this._fut || (this._fut = new Array(13)); rec.sample(-this.predict, F);
        const k = (4 - this.delay) / 4 * Math.min(1, this.predict);
        for (let j = 1; j < 13; j++) P[j] += (F[j] - P[j]) * k * (j === 4 || j === 5 || j === 6 ? 0 : 1);
      }
      this.fig.pose(P, seen ? 0 : dt);
      this._steps(dt, seen);
      this.huntT = (this.huntT || 0) + dt;
      if (this.huntT > 2.5 && this.distToPlayer() < this.catchDist) this._caught();
      return;
    }
    if (this.mode === 'stalk') {
      const F = this._fut || (this._fut = new Array(13)); if (!rec.sample(-this.predict, F)) return;
      const seen = this.freezeWhenSeen && this.observed;
      if (!seen) {
        _b.set(F[1] - this.pos.x, 0, F[3] - this.pos.z); const d = _b.length();
        const sp = this.speed * (1 + g.player.noise * 0.6 + g.director.huntBoost);
        if (d > 0.01) this.pos.addScaledVector(_b, Math.min(d, sp * dt) / d);
      }
      const h = g.engine.headPos(_a), yaw = Math.atan2(-(h.x - this.pos.x), -(h.z - this.pos.z));
      // its hands copy yours, its head copies your head tilt
      rec.sample(-this.predict * 0.5, F);
      const P2 = P; P2[1] = this.pos.x; P2[2] = F[2]; P2[3] = this.pos.z; P2[4] = yaw; P2[5] = F[5]; P2[6] = -F[6];
      const rX = Math.cos(yaw), rZ = -Math.sin(yaw), fX = -Math.sin(yaw), fZ = -Math.cos(yaw);
      P2[7] = this.pos.x - rX * 0.25 + fX * 0.15; P2[8] = F[8]; P2[9] = this.pos.z - rZ * 0.25 + fZ * 0.15;
      P2[10] = this.pos.x + rX * 0.25 + fX * 0.15; P2[11] = F[11]; P2[12] = this.pos.z + rZ * 0.25 + fZ * 0.15;
      this.fig.pose(P2, seen ? 0 : dt); this._steps(dt, seen);
      if (this.distToPlayer() < this.catchDist) this._caught();
    }
  }
  _steps(dt, seen) {
    if (!this.footsteps || seen) return;
    this.stepT -= dt; const d = this.distToPlayer();
    this.g.audio.heartRate = Math.max(0, Math.min(1, 1 - (d - 1) / 10));
    if (this.stepT <= 0) { this.stepT = 0.62; if (this.fig.lastPos && d < 25) this.g.audio.step(this.surface, this.fig.headPos.clone().setY(0.1), 0.9); }
  }
  _caught() { this.off(); this.onCaught ? this.onCaught() : this.g.caught('entity'); }
}

// Things that change only when you are not looking
export class Unobserved {
  constructor(game) { this.g = game; this.items = []; this._d = new THREE.Vector3(); this._h = new THREE.Vector3(); this._f = new THREE.Vector3(); }
  clear() { this.items.length = 0; }
  // half angle in degrees, near distance always observed
  isObserved(pos, half = 62, near = 0.9) {
    const e = this.g.engine, h = e.headPos(this._h), f = e.headDir(this._f);
    const d = this._d.subVectors(pos, h), l = d.length();
    if (l < near) return true;
    return f.dot(d) / l > Math.cos(THREE.MathUtils.degToRad(half));
  }
  // fn is called once pos has been out of view for `after` seconds. Return false to retry.
  when(pos, fn, { after = 0.15, repeat = false, minDist = 1.5, maxDist = 999, half = 65, cond = null } = {}) {
    const it = { pos: pos.clone ? pos.clone() : new THREE.Vector3(pos[0], pos[1] ?? 1, pos[2]), fn, after, repeat, minDist, maxDist, half, t: 0, cond, dead: false };
    this.items.push(it); return it;
  }
  update(dt) {
    const h = this.g.engine.headPos(this._h);
    for (const it of this.items) {
      if (it.dead) continue;
      if (it.cond && !it.cond()) { it.t = 0; continue; }
      const d = h.distanceTo(it.pos);
      if (d < it.minDist || d > it.maxDist || this.isObserved(it.pos, it.half, 0)) { it.t = 0; continue; }
      it.t += dt;
      if (it.t >= it.after) { const r = it.fn(); it.t = 0; if (!it.repeat && r !== false) it.dead = true; }
    }
    if (this.items.length > 64) this.items = this.items.filter(i => !i.dead);
  }
}
