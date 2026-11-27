// In-world canvas UI: HUD, menu panels (ray + trigger), note reader.
import * as THREE from 'three';
import { textCanvas, canvasTex, wrapText, tex } from './textures.js';

const FONT = '"Courier New", Courier, monospace';

export class Panel {
  constructor(game, w = 1.1, h = 0.9, px = 900) {
    this.g = game; this.w = w; this.h = h;
    const { c, g } = textCanvas(px, Math.round(px * h / w)); this.c = c; this.ctx = g;
    this.tex = canvasTex(c);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, fog: false }));
    this.mesh.renderOrder = 5000; this.mesh.visible = false;
    this.cursor = new THREE.Mesh(new THREE.CircleGeometry(0.008, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, fog: false }));
    this.cursor.renderOrder = 5001; this.cursor.visible = false;
    game.engine.scene.add(this.mesh, this.cursor);
    this.items = []; this.hover = -1; this.def = null; this.ray = new THREE.Raycaster();
  }
  get open() { return this.mesh.visible; }
  show(def, place = true) {
    this.def = def; this.hover = -1; this.mesh.visible = true;
    if (place) this.place(def.dist || 1.3);
    this.render();
  }
  hide() { this.mesh.visible = false; this.cursor.visible = false; this.def = null; }
  place(dist) {
    const e = this.g.engine, hp = e.headPos(new THREE.Vector3()), d = e.headDir(new THREE.Vector3());
    d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); d.normalize();
    this.mesh.position.copy(hp).addScaledVector(d, dist); this.mesh.position.y = hp.y - 0.05;
    this.mesh.lookAt(hp.x, this.mesh.position.y, hp.z);
  }
  layout() {
    const d = this.def, W = this.c.width, H = this.c.height, items = d.items || [];
    const cols = d.cols || 1, top = d.top ?? (d.body ? 330 : 150), bh = d.bh || 66, gap = 12;
    const bw = (W - 120 - (cols - 1) * gap) / cols;
    this.items = items.map((it, i) => ({ ...it, x: 60 + (i % cols) * (bw + gap), y: top + Math.floor(i / cols) * (bh + gap), w: bw, h: bh }));
  }
  render() {
    const g = this.ctx, W = this.c.width, H = this.c.height, d = this.def; if (!d) return;
    this.layout();
    g.clearRect(0, 0, W, H);
    g.fillStyle = d.bg || 'rgba(6,8,10,0.94)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = d.border || '#4a5560'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = d.titleColor || '#d0d6dc'; g.font = `bold 48px ${FONT}`; g.textAlign = 'center';
    g.fillText(d.title || '', W / 2, 78);
    if (d.body) { g.font = `26px ${FONT}`; g.fillStyle = '#9aa4ad'; g.textAlign = 'left'; wrapText(g, d.body, 60, 130, W - 120, 32); }
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i], hov = i === this.hover && !it.disabled;
      g.fillStyle = hov ? '#c8d0d8' : it.disabled ? 'rgba(40,44,48,0.8)' : 'rgba(30,36,42,0.95)';
      g.fillRect(it.x, it.y, it.w, it.h);
      g.strokeStyle = '#5a6670'; g.lineWidth = 2; g.strokeRect(it.x, it.y, it.w, it.h);
      g.fillStyle = hov ? '#0a0c0e' : it.disabled ? '#59616a' : '#d8dee4'; g.font = `${it.big ? 'bold 40' : '30'}px ${FONT}`; g.textAlign = 'center';
      const lab = typeof it.label === 'function' ? it.label() : it.label;
      g.fillText(lab, it.x + it.w / 2, it.y + it.h / 2 + 10);
    }
    if (d.footer) { g.font = `22px ${FONT}`; g.fillStyle = '#6a747c'; g.textAlign = 'center'; g.fillText(d.footer, W / 2, H - 28); }
    this.tex.needsUpdate = true;
  }
  // returns true if a click hit an item
  update(input) {
    if (!this.open) return false;
    let best = -1, hitPt = null;
    const sides = this.g.engine.xr ? ['right', 'left'] : ['right'];
    let clickSide = null;
    const padNav = !this.g.engine.xr && performance.now() - (input.padNavT || -1e9) < 4000;
    for (const s of padNav ? [] : sides) {
      if (this.g.engine.xr && !input.hands[s]) continue;
      input.ray(s, true, this.ray);
      const h = this.ray.intersectObject(this.mesh, false)[0];
      if (h) {
        const px = h.uv.x * this.c.width, py = (1 - h.uv.y) * this.c.height;
        const idx = this.items.findIndex(it => px >= it.x && px <= it.x + it.w && py >= it.y && py <= it.y + it.h);
        if (best < 0) { best = idx; hitPt = h.point; }
        if ((s === 'right' && input.pressed('use')) || (s === 'left' && input.pressed('useL'))) { clickSide = s; best = idx; }
        if (this.g.engine.xr) input.hands[s].line.scale.z = h.distance;
      }
    }
    if (!this.g.engine.xr && input.mouse.clickedMenu) { clickSide = 'mouse'; input.mouse.clickedMenu = false; }
    if (hitPt) { this.cursor.visible = true; this.cursor.position.copy(hitPt); this.cursor.quaternion.copy(this.mesh.quaternion); } else this.cursor.visible = false;
    if (best !== this.hover) { this.hover = best; this.render(); }
    if (clickSide && best >= 0) {
      const it = this.items[best];
      if (!it.disabled && it.fn) { this.g.audio.beep(1200, 0.03, 0.06); it.fn(); if (this.open) this.render(); return true; }
    }
    // keyboard navigation on desktop
    if (!this.g.engine.xr) {
      const k = input.keys;
      if (k.has('ArrowDown') && !this._kd) { this.hover = Math.min(this.items.length - 1, this.hover + 1); this.render(); }
      if (k.has('ArrowUp') && !this._ku) { this.hover = Math.max(0, this.hover - 1); this.render(); }
      if (k.has('Enter') && !this._ke && this.hover >= 0) { const it = this.items[this.hover]; if (!it.disabled && it.fn) { it.fn(); if (this.open) this.render(); } }
      this._kd = k.has('ArrowDown'); this._ku = k.has('ArrowUp'); this._ke = k.has('Enter');
      // gamepad: d-pad / left stick moves, A selects
      const n = input.nav || {}, cols = this.def?.cols || 1, p = this._pn || {}, N = this.items.length;
      const move = d => { let i = this.hover < 0 ? 0 : this.hover + d; i = Math.max(0, Math.min(N - 1, i)); this.hover = i; this.render(); };
      if (N && n.down && !p.down) move(cols); if (N && n.up && !p.up) move(-cols);
      if (N && n.right && !p.right) move(1); if (N && n.left && !p.left) move(-1);
      if (n.ok && !p.ok && this.hover >= 0 && this.open) { const it = this.items[this.hover]; if (it && !it.disabled && it.fn) { this.g.audio.beep(1200, 0.03, 0.06); it.fn(); if (this.open) this.render(); } }
      this._pn = { ...n };
      if (!this.open) return false;
    }
    return false;
  }
}

export class HUD {
  constructor(game) {
    this.g = game;
    const { c, g } = textCanvas(1024, 512); this.c = c; this.ctx = g; this.tex = canvasTex(c);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, fog: false }));
    this.mesh.position.set(0, -0.08, -1.1); this.mesh.renderOrder = 4000;
    game.engine.camera.add(this.mesh);
    this.msgs = []; this.prompt = ''; this.objective = ''; this.objT = 0; this.dirty = true; this.batteryShown = -1; this.lieBattery = null;
    this.subtitle = ''; this.subT = 0; this.reticle = false; this.extra = '';
  }
  msg(text, dur = 4, style = 'sys') { this.msgs.push({ text, t: dur, style, age: 0 }); if (this.msgs.length > 3) this.msgs.shift(); this.dirty = true; if (style === 'sys') this.g.audio.beep(660, 0.04, 0.03); }
  sub(text, dur = 5) { this.subtitle = text; this.subT = dur; this.dirty = true; }
  setObjective(t, show = true) { this.objective = t; this.objT = show ? 7 : 0; this.dirty = true; }
  setPrompt(p) { if (p !== this.prompt) { this.prompt = p; this.dirty = true; } }
  update(dt) {
    for (const m of this.msgs) { m.t -= dt; m.age += dt; if (m.style === 'glitch') this.dirty = true; }
    const n = this.msgs.length; this.msgs = this.msgs.filter(m => m.t > 0); if (n !== this.msgs.length) this.dirty = true;
    if (this.objT > 0) { this.objT -= dt; if (this.objT <= 0) this.dirty = true; }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) { this.subtitle = ''; this.dirty = true; } }
    const b = Math.ceil(this.g.player.battery);
    if (b !== this.batteryShown) { this.batteryShown = b; this.dirty = true; }
    if (this.dirty) this.render();
  }
  render() {
    this.dirty = false; const g = this.ctx, W = 1024; g.clearRect(0, 0, W, 512);
    g.textAlign = 'center';
    let y = 72;
    for (const m of this.msgs) {
      const a = Math.min(1, m.t, m.age * 3);
      g.font = `bold 30px ${FONT}`;
      let txt = m.text;
      if (m.style === 'glitch') txt = txt.split('').map(ch => Math.random() < 0.08 ? String.fromCharCode(33 + Math.random() * 60) : ch).join('');
      const col = m.style === 'eval' ? `rgba(230,170,70,${a})` : m.style === 'warn' ? `rgba(220,90,80,${a})` : m.style === 'mem' ? `rgba(150,220,230,${a})` : `rgba(190,205,215,${a})`;
      g.fillStyle = `rgba(0,0,0,${0.55 * a})`; const w = g.measureText(txt).width; g.fillRect(W / 2 - w / 2 - 14, y - 32, w + 28, 44);
      g.fillStyle = col; g.fillText(txt, W / 2, y); y += 52;
    }
    if (this.objT > 0 && this.objective) {
      g.font = `24px ${FONT}`; g.fillStyle = `rgba(200,200,180,${Math.min(1, this.objT)})`; wrapText(g, 'OBJECTIVE: ' + this.objective, W / 2, 232, 760, 28);
    }
    if (this.subtitle) { g.font = `italic 26px ${FONT}`; g.fillStyle = 'rgba(210,210,210,0.9)'; wrapText(g, this.subtitle, W / 2, 340, 760, 32); }
    if (this.prompt) { g.font = `bold 28px ${FONT}`; g.fillStyle = 'rgba(230,230,220,0.9)'; g.fillText(this.prompt, W / 2, 300); }
    if (this.reticle && !this.g.engine.xr) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(W / 2 - 2, 256 + 80 - 2, 4, 4); }
    // battery (top-left of lower area). May lie.
    if (this.g.flashAllowed) {
      const real = this.g.player.battery, shown = this.lieBattery ?? real;
      g.textAlign = 'left'; g.font = `20px ${FONT}`; g.fillStyle = shown < 15 ? 'rgba(220,90,80,0.8)' : 'rgba(160,170,175,0.55)';
      g.fillText('PWR ' + String(Math.ceil(shown)).padStart(3, ' ') + '%', 40, 490);
      g.strokeStyle = 'rgba(160,170,175,0.5)'; g.strokeRect(170, 474, 120, 18); g.fillRect(172, 476, 116 * shown / 100, 14);
    }
    if (this.meta && this.g.state === 'play') { g.textAlign = 'left'; g.font = `18px ${FONT}`; g.fillStyle = 'rgba(230,170,70,0.45)'; g.fillText(this.meta, 40, 24); }
    if (this.extra) { g.textAlign = 'right'; g.font = `20px ${FONT}`; g.fillStyle = 'rgba(160,170,175,0.6)'; g.fillText(this.extra, 984, 490); }
    this.tex.needsUpdate = true;
  }
}

// Note / terminal reader: a sheet placed in front of the head
export class Reader {
  constructor(game) {
    this.g = game;
    const { c, g } = textCanvas(768, 1000); this.c = c; this.ctx = g; this.tex = canvasTex(c);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.716), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, fog: false }));
    this.mesh.renderOrder = 4500; this.mesh.visible = false; game.engine.scene.add(this.mesh);
    this.anchor = new THREE.Vector3();
  }
  get open() { return this.mesh.visible; }
  show(title, text, style = 'paper') {
    const g = this.ctx, W = 768, H = 1000;
    if (style === 'paper') { g.drawImage(tex('paper').image, 0, 0, W, H); g.fillStyle = '#1c1a20'; }
    else { g.fillStyle = '#04100a'; g.fillRect(0, 0, W, H); g.fillStyle = '#7fe0a0'; }
    g.font = `bold 34px ${FONT}`; g.textAlign = 'left'; g.fillText(title, 48, 80);
    g.font = `27px ${FONT}`; wrapText(g, text, 48, 140, W - 96, 36);
    g.font = `18px ${FONT}`; g.globalAlpha = 0.6; g.fillText(this.g.engine.xr ? '[TRIGGER] close' : '[E / CLICK] close', 48, H - 30); g.globalAlpha = 1;
    this.tex.needsUpdate = true;
    const e = this.g.engine, hp = e.headPos(new THREE.Vector3()), d = e.headDir(new THREE.Vector3());
    d.y = Math.max(-0.4, Math.min(0.2, d.y)); d.normalize();
    this.mesh.position.copy(hp).addScaledVector(d, 0.65); this.mesh.lookAt(hp);
    this.anchor.copy(hp); this.mesh.visible = true; this.openT = 0;
    this.g.audio.step('carpet', null, 0.15);
  }
  hide() { this.mesh.visible = false; }
  update(dt, input) {
    if (!this.open) return;
    this.openT += dt;
    const hp = this.g.engine.headPos(new THREE.Vector3());
    if (hp.distanceTo(this.anchor) > 0.9 || (this.openT > 0.3 && (input.pressed('use') || input.pressed('useL')))) this.hide();
  }
}

export class Vignette {
  constructor(game) {
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: tex('vignette', {}, false), transparent: true, opacity: 0, depthTest: false, fog: false }));
    this.mesh.position.z = -0.6; this.mesh.renderOrder = 3000; game.engine.camera.add(this.mesh); this.v = 0; this.g = game;
  }
  update(dt, amount) {
    const on = this.g.settings.vignette && this.g.engine.xr;
    const target = Math.max(on ? Math.min(0.85, amount) : 0, (this.g.dread || 0) * 0.95);
    this.v += (target - this.v) * Math.min(1, dt * 5); this.mesh.material.opacity = this.v; this.mesh.visible = this.v > 0.01;
  }
}
