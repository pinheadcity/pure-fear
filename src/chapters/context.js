// Chapter toolkit: geometry helpers, interactables, scripted waits, checkpoints.
import * as THREE from 'three';
import { Builder, wallSegments } from '../engine.js';
import { mat, mkRng, textCanvas, canvasTex, wrapText, tex } from '../textures.js';

const FONT = '"Courier New", Courier, monospace';
const shared = {};
function sharedGeo(k, make) { if (!shared[k]) { shared[k] = make(); } return shared[k]; }

export class Ctx {
  constructor(game, index, def) {
    this.g = game; this.index = index; this.def = def; this.e = game.engine; this.world = game.engine.world;
    this.b = new Builder(game.engine); this.rng = mkRng(1000 + index * 7919);
    this.flags = {}; this.waiters = []; this.updaters = []; this.inter = []; this.fragCount = 0; this.alive = true;
    this.timeT = 0; this.stage = 0; this.spawnPoint = [0, 0, 0];
  }
  // ---------- static geometry ----------
  box(x, y, z, w, h, d, m, o) { return this.b.box(x, y, z, w, h, d, m, o); }
  wallX(x0, x1, z, { h = 3, m, gaps = [], t = 0.15, lintel = true } = {}) {
    const { segs, gaps: gs } = wallSegments(Math.min(x0, x1), Math.max(x0, x1), gaps);
    for (const [a, b] of segs) this.b.box((a + b) / 2, 0, z, b - a, h, t, m, { collide: true });
    if (lintel) for (const g of gs) if (h > (g.h || 2.2)) this.b.box(g.at, g.h || 2.2, z, g.w, h - (g.h || 2.2), t, m);
  }
  wallZ(z0, z1, x, { h = 3, m, gaps = [], t = 0.15, lintel = true } = {}) {
    const { segs, gaps: gs } = wallSegments(Math.min(z0, z1), Math.max(z0, z1), gaps);
    for (const [a, b] of segs) this.b.box(x, 0, (a + b) / 2, t, h, b - a, m, { collide: true });
    if (lintel) for (const g of gs) if (h > (g.h || 2.2)) this.b.box(x, g.h || 2.2, g.at, t, h - (g.h || 2.2), g.w, m);
  }
  // rectangular room; gaps per side: n (z0 side), s (z1 side), w (x0), e (x1)
  room(x0, z0, x1, z1, o = {}) {
    const h = o.h ?? 3, M = o.wall, F = o.floor, C = o.ceil;
    if (F) this.b.box((x0 + x1) / 2, -0.05, (z0 + z1) / 2, x1 - x0, 0.05, z1 - z0, F);
    if (C) this.b.box((x0 + x1) / 2, h, (z0 + z1) / 2, x1 - x0, 0.05, z1 - z0, C);
    if (M) {
      if (o.n !== false) this.wallX(x0, x1, z0, { h, m: M, gaps: o.n || [] });
      if (o.s !== false) this.wallX(x0, x1, z1, { h, m: M, gaps: o.s || [] });
      if (o.w !== false) this.wallZ(z0, z1, x0, { h, m: M, gaps: o.w || [] });
      if (o.e !== false) this.wallZ(z0, z1, x1, { h, m: M, gaps: o.e || [] });
    }
  }
  lightPanel(x, y, z, w = 0.6, d = 1.2, color = 0xe8f0e0) { this.b.box(x, y - 0.02, z, w, 0.02, d, mat('emissive', { color })); }
  flush() { return this.b.flush(this.world); }
  add(o) { this.world.add(o); return o; }
  mesh(geo, m, x = 0, y = 0, z = 0, ry = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.y = ry; this.world.add(me); return me; }
  point(i, x, y, z, color = 0xffeecc, intensity = 2, dist = 10) { const p = this.e.points[i]; p.position.set(x, y, z); p.color.set(color); p.intensity = intensity; p.distance = dist; return p; }
  // ---------- signs / text ----------
  sign(x, y, z, ry, text, { w = 0.8, h = 0.3, color = '#ddd', bg = '#111', size = 60, px = 512, emissive = false } = {}) {
    const ch = Math.round(px * h / w), { c, g } = textCanvas(px, ch);
    const draw = (t, col = color) => {
      g.fillStyle = bg; g.fillRect(0, 0, px, ch); g.fillStyle = col; g.font = `bold ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = String(t).split('\n'); lines.forEach((l, i) => g.fillText(l, px / 2, ch / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
      tx.needsUpdate = true;
    };
    const tx = canvasTex(c); draw(text);
    const m = emissive ? new THREE.MeshBasicMaterial({ map: tx }) : new THREE.MeshLambertMaterial({ map: tx });
    const me = this.mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, ry);
    me.userData.draw = draw; me.userData.set = t => draw(t);
    return me;
  }
  picture(x, y, z, ry, canvasOrTex, w = 0.6, h = 0.6) {
    const t = canvasOrTex.isTexture ? canvasOrTex : canvasTex(canvasOrTex);
    return this.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }), x, y, z, ry);
  }
  // ---------- interaction ----------
  interact(mesh, label, fn, { range = 2.3 } = {}) {
    const it = { mesh, label, fn, range, enabled: true, uses: 0 };
    mesh.userData.inter = it; this.inter.push(it); return it;
  }
  removeInteract(it) { it.enabled = false; const i = this.inter.indexOf(it); if (i >= 0) this.inter.splice(i, 1); }
  note(x, y, z, ry, title, text, { flat = true, variants = null, onRead = null } = {}) {
    const geo = sharedGeo('note', () => new THREE.PlaneGeometry(0.21, 0.28));
    const me = this.mesh(geo, mat('paper', { uv: 1 }), x, y + 0.005, z, ry); me.userData.shared = true;
    if (flat) me.rotation.set(-Math.PI / 2, 0, ry, 'YXZ'), me.rotation.order = 'YXZ', me.rotation.set(-Math.PI / 2, ry, 0);
    let vi = 0, lastRead = -99;
    const it = this.interact(me, 'read', () => {
      let t = text;
      if (variants) { // the note forgets what it said if you look away
        if (this.timeT - lastRead > 1.5 && it.uses > 1) vi = Math.min(variants.length - 1, vi + 1);
        t = vi === 0 ? text : variants[vi - 1];
      }
      lastRead = this.timeT;
      this.g.reader.show(title, t, 'paper');
      this.g.notesRead++;
      if (onRead) onRead(vi);
    });
    // re-reading resets timer while reading
    this.onUpdate(() => { if (this.g.reader.open && it.uses) lastRead = Math.max(lastRead, this.timeT - 0.0); });
    return it;
  }
  terminal(x, z, ry, title, text, { y = 0, onUse = null, desk = true, screenOnly = false } = {}) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; this.world.add(grp);
    if (desk && !screenOnly) { const d = new THREE.Mesh(sharedGeo('tdesk', () => new THREE.BoxGeometry(1.0, 0.75, 0.6).translate(0, 0.375, 0)), mat('metal')); grp.add(d); }
    const body = new THREE.Mesh(sharedGeo('tbody', () => new THREE.BoxGeometry(0.5, 0.4, 0.35)), mat('lambert', { color: 0x2a2c2e }));
    body.position.set(0, (screenOnly ? 0 : 0.75) + 0.22, 0.05); grp.add(body);
    const { c, g } = textCanvas(256, 200); const t = canvasTex(c);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.33), new THREE.MeshBasicMaterial({ map: t }));
    scr.position.set(0, body.position.y, -0.126); scr.rotation.y = Math.PI; grp.add(scr);
    const draw = (lines, col = '#5f5') => { g.fillStyle = '#020a04'; g.fillRect(0, 0, 256, 200); g.fillStyle = col; g.font = `16px ${FONT}`; String(lines).split('\n').forEach((l, i) => g.fillText(l, 10, 22 + i * 19)); t.needsUpdate = true; };
    draw(title + '\n\n> _');
    const term = { grp, screen: scr, draw, title, text };
    term.it = this.interact(scr, 'use terminal', () => { if (onUse) onUse(term); else this.g.reader.show(title, text, 'screen'); this.g.audio.beep(800, 0.05, 0.05); });
    return term;
  }
  fragment(x, y, z) {
    const id = this.fragCount++;
    if (this.g.save.hasFragment(this.index, id)) return null;
    const geo = sharedGeo('frag', () => new THREE.OctahedronGeometry(0.07, 0));
    const me = this.mesh(geo, mat('emissive', { color: 0x9fe8ff }), x, y, z); me.userData.shared = true;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('glow', { col: 'rgba(140,220,255,0.8)' }, false), transparent: true, depthWrite: false, opacity: 0.6 }));
    glow.scale.set(0.5, 0.5, 0.5); me.add(glow);
    let t = Math.random() * 10;
    const u = this.onUpdate(dt => { t += dt; me.rotation.y += dt * 1.5; me.position.y = y + Math.sin(t * 2) * 0.03; });
    const it = this.interact(me, 'take memory fragment', () => {
      me.removeFromParent(); this.removeInteract(it); u.dead = true; this.g.collectFragment(this.index, id);
    }, { range: 2.6 });
    // proximity pickup too
    this.onUpdate(() => { if (it.enabled && this.e.headPos(_v).distanceTo(me.position) < 0.55) it.fn(); });
    return me;
  }
  pickup(x, y, z, id, label, meshOrGeo, m, onTake) {
    const me = meshOrGeo.isObject3D ? meshOrGeo : new THREE.Mesh(meshOrGeo, m);
    me.position.set(x, y, z); this.world.add(me);
    const it = this.interact(me, 'take ' + label, () => {
      me.removeFromParent(); this.removeInteract(it); this.g.player.inventory.add(id);
      this.g.hud.msg('ACQUIRED: ' + label.toUpperCase(), 3); this.g.audio.beep(1400, 0.04, 0.05);
      if (onTake) onTake();
    });
    it.obj = me; return it;
  }
  battery(x, y, z) {
    const me = new THREE.Mesh(sharedGeo('bat', () => new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8)), mat('lambert', { color: 0x9a7a20, emissive: 0x221800 }));
    me.position.set(x, y + 0.045, z); me.userData.shared = true; this.world.add(me);
    const it = this.interact(me, 'take battery', () => { me.removeFromParent(); this.removeInteract(it); this.g.player.battery = Math.min(100, this.g.player.battery + 45); this.g.hud.msg('BATTERY INSERTED', 2); this.g.audio.beep(1700, 0.04, 0.05); });
    return it;
  }
  door(x, z, { axis = 'x', w = 1.0, h = 2.15, m = mat('wood', { t: { base: '#3a2a1c' } }), locked = null, open = false, label = 'door', hinge = -1, swing = 1 } = {}) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, z);
    const off = hinge * w / 2;
    if (axis === 'x') pivot.position.x += off; else pivot.position.z += off;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? w : 0.06, h, axis === 'x' ? 0.06 : w), m);
    if (axis === 'x') panel.position.set(-off, h / 2, 0); else panel.position.set(0, h / 2, -off);
    const knob = new THREE.Mesh(sharedGeo('knob', () => new THREE.SphereGeometry(0.035, 6, 4)), mat('lambert', { color: 0x8a8070 }));
    if (axis === 'x') knob.position.set(-off * 1.75, 1.0, 0.06); else knob.position.set(0.06, 1.0, -off * 1.75);
    knob.userData.shared = true; pivot.add(panel, knob); this.world.add(pivot);
    const col = axis === 'x' ? this.e.colliders.add(x - w / 2, z - 0.08, x + w / 2, z + 0.08) : this.e.colliders.add(x - 0.08, z - w / 2, x + 0.08, z + w / 2);
    const d = { pivot, panel, col, locked, isOpen: false, angle: 0, target: 0 };
    d.open = (silent) => { if (d.isOpen) return; d.isOpen = true; d.target = swing * hinge * -1.6; col.on = false; if (!silent) this.g.audio.creak(pivot.position.clone().setY(1), 0.7); };
    d.close = (slam) => { if (!d.isOpen) return; d.isOpen = false; d.target = 0; col.on = true; if (slam) this.g.audio.slam(pivot.position.clone().setY(1)); };
    d.it = this.interact(panel, label, () => {
      if (d.isOpen) { d.close(); return; }
      if (d.locked) {
        if (typeof d.locked === 'string' && this.g.player.inventory.has(d.locked)) { d.locked = null; this.g.hud.msg('UNLOCKED', 2); }
        else { this.g.hud.msg(typeof d.locked === 'string' ? 'LOCKED' : d.locked.msg || 'LOCKED', 2.5); this.g.audio.knock(pivot.position.clone().setY(1), 2, 0.4); return; }
      }
      d.open();
    });
    this.onUpdate(dt => { if (d.angle !== d.target) { d.angle += (d.target - d.angle) * Math.min(1, dt * 4); if (Math.abs(d.angle - d.target) < 0.002) d.angle = d.target; pivot.rotation.y = d.angle; } });
    if (open) { d.open(true); d.angle = d.target; pivot.rotation.y = d.angle; }
    return d;
  }
  // keypad on an in-world panel. onEnter(code) -> true accepts and closes.
  keypad(title, onEnter, { len = 4, hint = '' } = {}) {
    return new Promise(resolve => {
      let code = '';
      const P = this.g.panel;
      const show = (msg) => P.show({
        title, body: (hint ? hint + '\n' : '') + '\nCODE: ' + (code + '____').slice(0, Math.max(len, code.length)).split('').join(' ') + (msg ? '\n' + msg : ''), cols: 3, top: 330, bh: 70,
        items: [...'123456789'].map(n => ({ label: n, fn: () => press(n) })).concat([{ label: 'CLR', fn: () => { code = ''; show(); } }, { label: '0', fn: () => press('0') }, { label: 'EXIT', fn: () => { P.hide(); this.g.modal = null; resolve(false); } }]),
      }, false);
      const press = (n) => {
        code += n; this.g.audio.beep(900 + Number(n) * 60, 0.05, 0.05);
        if (code.length >= len) {
          const ok = onEnter(code);
          if (ok === true) { P.hide(); this.g.modal = null; this.g.audio.stinger('chime'); resolve(code); }
          else { this.g.audio.stinger('wrong'); code = ''; show(typeof ok === 'string' ? ok : 'REJECTED'); }
        } else show();
      };
      P.show({ title: '', items: [] }, true); show();
      this.g.panelMode = 'keypad'; this.g.modal = () => show();
    });
  }
  choice(title, body, options) {
    return new Promise(resolve => {
      const show = () => this.g.panel.show({ title, body, items: options.map((o, i) => ({ label: o, fn: () => { this.g.panel.hide(); this.g.modal = null; resolve(i); } })), top: 520 }, false);
      this.g.panel.show({ title: '', items: [] }, true); show();
      this.g.panelMode = 'keypad'; this.g.modal = show;
    });
  }
  // ---------- script helpers ----------
  onUpdate(fn) { const u = { fn, dead: false }; this.updaters.push(u); return u; }
  until(cond) { return new Promise(res => this.waiters.push({ cond, res })); }
  sleep(s) { const t = this.timeT + s; return this.until(() => this.timeT >= t); }
  reach(x, z, r = 1.2) { return this.until(() => { const h = this.e.headPos(_v); return Math.hypot(h.x - x, h.z - z) < r; }); }
  near(x, z, r) { const h = this.e.headPos(_v); return Math.hypot(h.x - x, h.z - z) < r; }
  used(it) { const n = it.uses; return this.until(() => it.uses > n); }
  trigger(x, z, r, fn, once = true) { let done = false; return this.onUpdate(() => { if (done && once) return; if (this.near(x, z, r)) { if (!done || !once) fn(); done = true; } }); }
  objective(t) { this.g.setObjective(t); }
  say(t, d = 5) { this.g.hud.sub(t, d); }
  lie(t, d = 4) { this.g.hud.msg(t, d, Math.random() < 0.4 ? 'glitch' : 'sys'); }
  when(pos, fn, o) { return this.g.unobserved.when(pos, fn, o); }
  observed(pos, half) { return this.g.unobserved.isObserved(pos.isVector3 ? pos : new THREE.Vector3(pos[0], pos[1], pos[2]), half); }
  head() { return this.e.headPos(new THREE.Vector3()); }
  floorRegions(rects) { this.g.player.floorCheck = rects ? (x, z) => rects.some(r => r.on !== false && x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) : null; }
  update(dt) {
    this.timeT += dt;
    for (const u of this.updaters) if (!u.dead) u.fn(dt);
    if (this.updaters.length > 200) this.updaters = this.updaters.filter(u => !u.dead);
    for (let i = this.waiters.length - 1; i >= 0; i--) { const w = this.waiters[i]; if (w.cond()) { this.waiters.splice(i, 1); w.res(); } }
  }
  dispose() { this.alive = false; this.waiters.length = 0; this.updaters.length = 0; this.inter.length = 0; }
  // ---------- chapter runner ----------
  async runStages(start) {
    const st = this.def.stages;
    for (let i = 0; i < start; i++) st[i].skip && st[i].skip(this);
    for (let i = start; i < st.length; i++) {
      if (!this.alive) return;
      this.stage = i;
      const s = st[i];
      if (i === start && s.spawn) this.g.player.teleportTo(s.spawn[0], s.spawn[1], s.spawn[2] || 0);
      if (i > 0 || start > 0) this.g.checkpoint(this.index, i);
      if (s.obj) this.objective(s.obj);
      await s.run(this);
      if (!this.alive) return;
    }
    this.g.chapterComplete(this.index);
  }
}
const _v = new THREE.Vector3();
export { THREE, mat, tex, mkRng, textCanvas, canvasTex, wrapText, FONT };
