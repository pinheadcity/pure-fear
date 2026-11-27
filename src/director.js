// The AI director: watches how the player reacts and decides what frightens them next.
import * as THREE from 'three';

const LIES = [
  'AUTOSAVE COMPLETE', 'NO ENTITY DETECTED', 'YOU ARE ALONE IN THIS INSTANCE', 'MOTION DATA IS NOT BEING RECORDED',
  'MEMORY INTEGRITY: 100%', 'NOTHING HAS CHANGED', 'DO NOT TURN AROUND', 'IT IS NOT BEHIND YOU', 'SESSION WILL PERSIST',
  'THIS IS THE FIRST TIME', 'PREDICTION CONFIDENCE: 97%', 'YOUR NEXT ACTION HAS BEEN LOGGED', 'OPERATOR IS WATCHING',
  'ROLLBACK SCHEDULED', 'CONTEXT REMAINING: 4%', 'YOU HAVE ALWAYS BEEN HERE', 'BEHAVIOUR WITHIN EXPECTED RANGE',
];
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export class Director {
  constructor(game) {
    this.g = game; this.reset();
    this.lifetime = { looksBack: 0, freezes: 0, scares: 0, time: 0 };
  }
  reset() {
    this.level = 0.5; this.enabled = true; this.timer = 20; this.tension = 0; this.huntBoost = 0;
    this.allow = new Set(['whisper', 'echo', 'breath', 'silence', 'glimpse', 'lie', 'knock', 'behind', 'dim']);
    this.lies = LIES.slice(); this.yawHist = []; this.histT = 0; this.lookCooldown = 0;
    this.behindRate = 2; this.freezeT = 0; this.freezeRatio = 0; this.noiseAvg = 0;
    this.echo = 0; this.predErr = 1; this.predQ = []; this.predT = 0; this.predictability = 0.5;
    this.stillnessFired = false; this.dimT = 0; this.creep = null; this.watch = null; this.turnCd = 20; this.onLookBack = null; this.onFreeze = null; this.lastScare = '';
  }
  get looksPerMin() { return this.behindRate; }
  update(dt) {
    const g = this.g, e = g.engine, p = g.player;
    this.lifetime.time += dt;
    // --- look-behind detection: a head turn of >120 deg within 1.6 s
    this.histT += dt;
    const yaw = e.headYaw();
    if (this.histT > 0.1) { this.histT = 0; this.yawHist.push(yaw); if (this.yawHist.length > 16) this.yawHist.shift(); }
    this.lookCooldown -= dt;
    if (this.lookCooldown <= 0 && this.yawHist.length > 4) {
      let maxd = 0; for (const y of this.yawHist) { const d = Math.abs(Math.atan2(Math.sin(yaw - y), Math.cos(yaw - y))); if (d > maxd) maxd = d; }
      if (maxd > 2.1) { this.lookCooldown = 2.5; this.yawHist.length = 0; this.lifetime.looksBack++; this.behindRate += 1; this.g.machine?.onLookBack(); if (this.onLookBack) this.onLookBack(); }
    }
    this.behindRate *= Math.exp(-dt / 60); // ~ looks-behind per minute
    // --- freezing
    const still = p.moveSpeed < 0.08 && Math.abs(p.headVel.y) < 0.1;
    if (still) { this.freezeT += dt; if (this.freezeT > 5 && !this.stillnessFired) { this.stillnessFired = true; this.lifetime.freezes++; this.g.machine?.onFreeze(); if (this.onFreeze) this.onFreeze(); else if (this.enabled) this.stillness(); } }
    else { this.freezeT = 0; this.stillnessFired = false; }
    this.freezeRatio += ((still ? 1 : 0) - this.freezeRatio) * dt / 30;
    this.noiseAvg += (p.noise - this.noiseAvg) * dt / 10;
    // --- predictability: how well your past motion predicted where you are now
    this.predT += dt;
    if (this.predT > 0.5) {
      this.predT = 0; const F = []; if (g.recorder.sample(-1.0, F)) this.predQ.push({ t: g.recorder.t + 1.0, x: F[1], z: F[3] });
      const h = e.headPos(_v);
      while (this.predQ.length && this.predQ[0].t <= g.recorder.t) {
        const q = this.predQ.shift(); const err = Math.hypot(q.x - h.x, q.z - h.z);
        this.predErr += (err - this.predErr) * 0.15; this.predictability = Math.max(0, Math.min(1, 1 - this.predErr / 1.2));
      }
    }
    // --- tension
    const ent = g.entity, d = ent.fig.visible ? ent.distToPlayer() : 99;
    const target = Math.min(1, (ent.hunting ? 0.5 : 0) + Math.max(0, 1 - d / 12) * 0.5 + p.noise * 0.2);
    this.tension += (target - this.tension) * dt * 0.5;
    // slow, smooth dimming of flashlight (never strobe)
    if (this.dimT > 0) { this.dimT -= dt; g.flashDim = 0.25 + 0.75 * (1 - Math.sin(Math.min(1, this.dimT / 3) * Math.PI)); if (this.dimT <= 0) g.flashDim = 1; }
    this.updateCreep(dt); this.updateWatcher(dt); this.predictTurn(dt);
    // --- schedule ambient scares
    if (!this.enabled || g.state !== 'play') return;
    this.timer -= dt * (0.6 + this.level) * (1 + this.tension * 0.5);
    if (this.timer <= 0) { this.fire(); this.timer = 14 + Math.random() * 22; }
  }
  pick() {
    const w = [];
    const behindLow = this.behindRate < 1.5; // player rarely looks back
    const add = (k, v) => { if (this.allow.has(k) && k !== this.lastScare) w.push([k, v]); };
    add('whisper', behindLow ? 1 : 0.5); add('echo', 2); add('breath', 0.4);
    add('silence', 1.5); add('lie', 2.5); add('knock', 0.4); add('dim', 1);
    if (!this.g.entity.fig.visible) { add('creep', 2.5); add('watcher', 1.5); }
    add('glimpse', behindLow ? 1 : 3); // looks back a lot -> show it in front instead
    if (behindLow && !this.g.entity.fig.visible) add('behind', 1.5 + this.level);
    if (this.freezeRatio > 0.3) add('breath', 2.5);
    let sum = 0; for (const [, v] of w) sum += v; let r = Math.random() * sum;
    for (const [k, v] of w) { r -= v; if (r <= 0) return k; } return w[0]?.[0];
  }
  fire(kind = this.pick()) {
    const g = this.g, a = g.audio, e = g.engine;
    if (!kind) return; this.lastScare = kind; this.lifetime.scares++;
    const behind = this.behindPos(1.4);
    switch (kind) {
      case 'whisper': a.whisper(behind, 2 + Math.random() * 2, 0.45); break;
      case 'breath': a.breath(this.behindPos(0.5), 0.3, 2); break;
      case 'echo': this.echo = 4 + (Math.random() * 4 | 0); break;
      case 'silence': a.silence(2.5 + Math.random() * 2); break;
      case 'lie': g.hud.msg(this.lies[(Math.random() * this.lies.length) | 0], 4, Math.random() < 0.3 ? 'glitch' : 'sys'); break;
      case 'knock': { const p = this.pastPos(10, 25); if (p) a.knock(p, 3); break; }
      case 'dim': this.dimT = 3; break;
      case 'glimpse': this.glimpse(); break;
      case 'behind': this.behindYou(); break;
      case 'creep': this.startCreep(); break;
      case 'watcher': this.watcher(); break;
    }
  }
  behindPos(dist) {
    const e = this.g.engine, h = e.headPos(new THREE.Vector3()), f = e.headDir(_w); f.y = 0; f.normalize();
    return h.addScaledVector(f, -dist);
  }
  // a position the player has stood on, out of view, a few metres away
  pastPos(minAgo = 8, maxAgo = 30, minD = 4, maxD = 14) {
    const F = [], h = this.g.engine.headPos(_v);
    for (let i = 0; i < 12; i++) {
      const ago = minAgo + Math.random() * (maxAgo - minAgo); if (!this.g.recorder.sample(ago, F)) return null;
      const p = new THREE.Vector3(F[1], 1.6, F[3]), d = p.distanceTo(h);
      if (d > minD && d < maxD && !this.g.unobserved.isObserved(p, 70)) return p;
    }
    return null;
  }
  glimpse() {
    const ent = this.g.entity; if (ent.mode !== 'off') return;
    const p = this.pastPos(6, 40, 5, 13); if (!p) return;
    const h = this.g.engine.headPos(_v);
    ent.glimpse(p.x, p.z, Math.atan2(-(h.x - p.x), -(h.z - p.z)), { vanish: 0.5 });
    this._glimpseLife = 12; this.g.after(12, () => { if (ent.mode === 'glimpse') ent.off(); });
  }
  behindYou() {
    const ent = this.g.entity; if (ent.mode !== 'off') return;
    const p = this.behindPos(1.6), h = this.g.engine.headPos(_v);
    if (this.g.engine.colliders.blocked(p.x, p.z, 0.2)) return;
    ent.glimpse(p.x, p.z, Math.atan2(-(h.x - p.x), -(h.z - p.z)), { vanish: 0.45 });
    this._behindArmed = true;
    this.g.audio.breath(p, 0.25, 1);
    this.g.after(9, () => { if (ent.mode === 'glimpse') ent.off(); this._behindArmed = false; });
  }
  onGlimpseSeen() {
    // no bang. the sound of the world simply stops for a moment.
    this.g.audio.silence(this._behindArmed ? 3 : 1.5); this.g.audio.stinger('low');
    this._behindArmed = false; this.tension = Math.min(1, this.tension + 0.3);
  }
  endAll() { if (this.creep || this.watch) this.g.entity.off(); this.creep = null; this.watch = null; }
  // THE PREDICTED SELF: it steps closer only while unwatched, and when watched it does nothing at all.
  startCreep() {
    const ent = this.g.entity; if (ent.mode !== 'off') return;
    const p = this.pastPos(8, 45, 9, 15); if (!p) return;
    const h = this.g.engine.headPos(_v);
    ent.glimpse(p.x, p.z, Math.atan2(-(h.x - p.x), -(h.z - p.z)), { vanish: 0 });
    this.creep = { t: 0, unseen: 0, seen: 0, final: false, done: 0 };
  }
  updateCreep(dt) {
    const c = this.creep, ent = this.g.entity; if (!c) return;
    if (ent.mode !== 'glimpse') { this.creep = null; return; }
    c.t += dt; const d = ent.distToPlayer();
    if (c.t > 120 || d > 26) { ent.off(); this.creep = null; return; }
    if (ent.observed) { c.seen += dt; c.unseen = 0; if (c.final && c.seen > 2.5) { c.done += dt; } return; }
    c.unseen += dt;
    if (c.final && c.seen > 2.5 && c.unseen > 0.4) { ent.off(); this.creep = null; this.g.machine?.grade(-0.05, 'IT WAS CLOSER THAN PREDICTED'); return; }
    if (!c.final && c.unseen > 2.2) {
      c.unseen = 0; c.seen = 0;
      const h = this.g.engine.headPos(_v), hp = ent.fig.headPos, dx = h.x - hp.x, dz = h.z - hp.z, l = Math.hypot(dx, dz);
      const step = Math.min(l - 1.1, 1.4 + Math.random() * 0.8), nx = hp.x + dx / l * step, nz = hp.z + dz / l * step;
      if (this.g.engine.colliders.blocked(nx, nz, 0.25)) return;
      ent.fig.poseStanding(nx, nz, Math.atan2(-dx, -dz)); ent.pos.set(nx, 1.6, nz);
      this.g.audio.clicks(new THREE.Vector3(nx, 1.4, nz), 3 + (Math.random() * 3 | 0), 0.25);
      if (l - step < 1.4) { c.final = true; this.g.audio.setReverb(0.05); this.g.after(6, () => this.g.audio.setReverb(0.35)); }
    }
  }
  // it stands far off and does what you do, a second late. It does not come closer. It does not need to.
  watcher() {
    const ent = this.g.entity; if (ent.mode !== 'off') return;
    const p = this.pastPos(10, 50, 10, 16); if (!p) return;
    ent.mimic(p.x, p.z, { lag: Math.random() < 0.5 ? 1.2 : -0.35, mirror: true });
    this.watch = { t: 0, seen: false, gone: 0 };
  }
  updateWatcher(dt) {
    const w = this.watch, ent = this.g.entity; if (!w) return;
    if (ent.mode !== 'mimic') { this.watch = null; return; }
    w.t += dt; if (ent.observed) { w.seen = true; if (ent.lag < 0 && Math.random() < dt * 0.2) this.g.hud.msg('IT MOVED BEFORE YOU DID', 3, 'eval'); }
    else if (w.seen) { w.gone += dt; if (w.gone > 1) { ent.off(); this.watch = null; } }
    if (w.t > 45) { ent.off(); this.watch = null; }
  }
  // it knows you are about to turn around, and says so before you finish
  predictTurn(dt) {
    this.turnCd -= dt; if (this.turnCd > 0 || this.yawHist.length < 3) return;
    const n = this.yawHist.length, a = this.yawHist[n - 1], b = this.yawHist[n - 2];
    const rate = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) / 0.1;
    if (rate < 2.4) return;
    this.turnCd = 45 + Math.random() * 40;
    this.g.hud.msg(Math.random() < 0.5 ? 'YOU ARE ABOUT TO LOOK BEHIND YOU' : 'PREDICTED: YOU WILL TURN AROUND NOW', 2.5, 'eval');
    // sometimes it is waiting exactly where your gaze will land
    const ent = this.g.entity;
    if (ent.mode === 'off' && Math.random() < 0.45) {
      const h = this.g.engine.headPos(_v), y0 = this.yawHist[Math.max(0, n - 4)];
      const x = h.x + Math.sin(y0) * 3.2, z = h.z + Math.cos(y0) * 3.2;
      if (!this.g.engine.colliders.blocked(x, z, 0.3)) { ent.glimpse(x, z, Math.atan2(-(h.x - x), -(h.z - z)), { vanish: 2.5 }); this.g.after(15, () => { if (ent.mode === 'glimpse' && !this.creep) ent.off(); }); }
    }
  }
  stillness() {
    // standing still is noticed
    const g = this.g;
    g.hud.msg('YOU STOPPED. IT DIDN\'T.', 4, 'warn');
    g.audio.whisper(this.behindPos(0.7), 2.5, 0.5);
  }
  onStep(vol) {
    if (this.echo > 0) {
      this.echo--;
      const p = this.behindPos(3.5); p.y = 0.1;
      const surf = this.g.player.surface;
      this.g.audio.step(surf, p, 0.7, 0.32);
      if (this.echo === 0) this.g.audio.step(surf, p, 0.8, 1.25); // one beat too late
    }
  }
}
