// XR controllers + desktop fallback. Exposes a unified per-frame state.
import * as THREE from 'three';

const BTN = { trigger: 0, squeeze: 1, stick: 3, a: 4, b: 5 };

export class Input {
  constructor(engine) {
    this.e = engine;
    this.hands = { left: null, right: null };
    this.keys = new Set();
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, down: false, clicked: false };
    this.yaw = 0; this.pitch = 0;
    this.state = this._blank();
    this.prev = this._blank();
    this.gripHold = 0;
    this.locked = false;
    this.onPauseRequest = null;
    const r = engine.renderer;
    for (let i = 0; i < 2; i++) {
      const ray = r.xr.getController(i), grip = r.xr.getControllerGrip(i);
      engine.rig.add(ray, grip);
      const c = { ray, grip, gp: null, side: null, model: this._model(), line: this._line() };
      grip.add(c.model); ray.add(c.line);
      ray.addEventListener('connected', ev => { c.gp = ev.data.gamepad; c.side = ev.data.handedness; this.hands[c.side] = c; c.line.visible = true; c.model.visible = true; });
      ray.addEventListener('disconnected', () => { if (c.side) this.hands[c.side] = null; c.gp = null; c.line.visible = false; c.model.visible = false; });
      c.line.visible = false; c.model.visible = false;
    }
    // desktop virtual hands
    this.vhand = { left: new THREE.Object3D(), right: new THREE.Object3D() };
    this.vhand.left.position.set(-0.22, -0.35, -0.35); this.vhand.right.position.set(0.22, -0.33, -0.38);
    engine.camera.add(this.vhand.left, this.vhand.right);

    addEventListener('keydown', e => { this.keys.add(e.code); if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    const cv = r.domElement;
    addEventListener('mousemove', e => { if (this.locked) { this.mouse.dx += e.movementX; this.mouse.dy += e.movementY; } this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = -(e.clientY / innerHeight) * 2 + 1; });
    cv.addEventListener('mousedown', e => { if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; if (!this.locked) this.mouse.clickedMenu = true; } });
    addEventListener('mouseup', () => this.mouse.down = false);
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked; this.locked = document.pointerLockElement === cv;
      if (was && !this.locked && this.onUnlock) this.onUnlock();
    });
  }
  lock() { if (!this.e.xr) { try { const p = this.e.renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { } } }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }
  _blank() { return { mx: 0, my: 0, tx: 0, ty: 0, use: false, useL: false, flash: false, pause: false, run: false, aux: false, crouch: false }; }
  _model() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.14), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    m.position.z = 0.03; g.add(m);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0x334455 }));
    tip.position.z = -0.045; g.add(tip); return g;
  }
  _line() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.5, fog: false }));
    l.scale.z = 2; return l;
  }
  setRayLength(len) { for (const s of ['left', 'right']) { const h = this.hands[s]; if (h) h.line.scale.z = len; } }
  pressed(k) { return this.state[k] && !this.prev[k]; }
  released(k) { return !this.state[k] && this.prev[k]; }
  handObj(side) { const h = this.hands[side]; return (this.e.xr && h) ? h.grip : this.vhand[side]; }
  handPos(side, out) { return this.handObj(side).getWorldPosition(out); }
  // pointer ray for interaction / menus
  ray(side = 'right', menuMode = false, out = new THREE.Raycaster()) {
    if (this.e.xr) {
      const h = this.hands[side] || this.hands[side === 'right' ? 'left' : 'right'];
      if (h) { const m = h.ray.matrixWorld; out.ray.origin.setFromMatrixPosition(m); out.ray.direction.set(0, 0, -1).transformDirection(m); return out; }
    }
    if (menuMode && !this.locked) out.setFromCamera({ x: this.mouse.x, y: this.mouse.y }, this.e.camera);
    else out.setFromCamera({ x: 0, y: 0 }, this.e.camera);
    return out;
  }
  update(dt) {
    const p = this.prev; Object.assign(p, this.state);
    const s = this.state; const blank = this._blank(); Object.assign(s, blank);
    if (this.e.xr) {
      const L = this.hands.left?.gp, R = this.hands.right?.gp;
      const ax = (gp, i) => gp && gp.axes.length > i ? (Math.abs(gp.axes[i]) > 0.15 ? gp.axes[i] : 0) : 0;
      const bt = (gp, i) => !!(gp && gp.buttons[i] && gp.buttons[i].pressed);
      s.mx = ax(L, 2); s.my = -ax(L, 3); s.tx = ax(R, 2); s.ty = -ax(R, 3);
      s.use = bt(R, BTN.trigger); s.useL = bt(L, BTN.trigger);
      s.flash = bt(R, BTN.a); s.aux = bt(R, BTN.b) || bt(L, BTN.a);
      s.run = bt(L, BTN.stick); s.crouch = false;
      const both = bt(L, BTN.squeeze) && bt(R, BTN.squeeze);
      this.gripHold = both ? this.gripHold + dt : 0;
      if (this.gripHold >= 2) { s.pause = true; this.gripHold = -999; }
      this.squeezeL = bt(L, BTN.squeeze); this.squeezeR = bt(R, BTN.squeeze);
    } else {
      const k = this.keys;
      s.mx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      s.my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      s.tx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
      s.use = k.has('KeyE') || (this.mouse.down && this.locked);
      s.useL = this.mouse.clicked && !this.locked;
      s.flash = k.has('KeyF'); s.aux = k.has('KeyR');
      s.run = k.has('ShiftLeft') || k.has('ShiftRight'); s.crouch = k.has('KeyC') || k.has('ControlLeft');
      s.pause = k.has('Escape') || k.has('KeyP') || k.has('Tab');
      this.mouse.clicked = false;
      // mouse look
      if (this.locked) {
        this.yaw -= this.mouse.dx * 0.0022; this.pitch -= this.mouse.dy * 0.0022;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
      }
      this.yaw -= s.tx * dt * 2.2;
      this.mouse.dx = this.mouse.dy = 0;
      const cam = this.e.camera; cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      // virtual hands sway
      const t = performance.now() * 0.001;
      this.vhand.right.position.y = -0.33 + Math.sin(t * 1.3) * 0.01;
      this.vhand.left.position.y = -0.35 + Math.sin(t * 1.1 + 1) * 0.01;
    }
  }
}
