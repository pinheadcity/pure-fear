// Locomotion, collision, flashlight, footsteps and the player's "noise" output.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _h = new THREE.Vector3();
export class Player {
  constructor(game) {
    this.g = game; const e = this.e = game.engine;
    this.speed = 1.6; this.battery = 100; this.flashOn = true; this.flashFlicker = 0;
    this.noise = 0; this.moveSpeed = 0; this.stepAcc = 0; this.surface = 'hard';
    this.snapCooldown = 0; this.lastHead = new THREE.Vector3(); this.headVel = new THREE.Vector3();
    this.inventory = new Set(); this.held = null;
    this.enabled = true; this.batteryDrain = 1 / 12; this.fallY = 0; this.falling = 0;
    this.floorCheck = null; // fn(x,z) -> bool, if set, leaving floor = fall
    // teleport arc
    this.tpMarker = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x88aacc, fog: false }));
    this.tpMarker.visible = false; e.scene.add(this.tpMarker); this.tpAim = false;
    this.stepListeners = [];
  }
  get head() { return this.e.headPos(_h); }
  teleportTo(x, z, yaw = 0) {
    const e = this.e, cam = e.camera;
    if (e.xr) {
      e.rig.rotation.y = 0; e.rig.position.set(0, 0, 0); e.rig.updateMatrixWorld(true);
      // align camera yaw with desired yaw
      const camYaw = e.headYaw(); e.rig.rotation.y = yaw - camYaw; e.rig.updateMatrixWorld(true);
      const hp = e.headPos(_v); e.rig.position.x += x - hp.x; e.rig.position.z += z - hp.z;
    } else {
      e.rig.rotation.y = 0; e.rig.position.set(x, 0, z); this.g.input.yaw = yaw; this.g.input.pitch = 0;
      cam.position.set(0, 1.65, 0); cam.rotation.set(0, yaw, 0, 'YXZ');
    }
    e.rig.position.y = this.g.settings.seated && e.xr ? 0.45 : 0;
    e.rig.updateMatrixWorld(true);
    this.lastHead.copy(e.headPos(_v)); this.falling = 0;
  }
  rotateAroundHead(a) {
    const e = this.e, hp = e.headPos(_v);
    e.rig.rotation.y += a;
    e.rig.updateMatrixWorld(true);
    const np = e.headPos(_f); e.rig.position.x += hp.x - np.x; e.rig.position.z += hp.z - np.z;
  }
  update(dt, inp) {
    const e = this.e, s = this.g.settings, st = inp.state;
    if (e.xr) { const base = this.g.settings.seated ? 0.45 : 0, ty = base - (st.crouch ? 0.55 : 0); if (!this.falling) e.rig.position.y += (ty - e.rig.position.y) * Math.min(1, dt * 8); }
    if (!e.xr) { const target = st.crouch ? 1.05 : 1.65; e.camera.position.y += (target - e.camera.position.y) * Math.min(1, dt * 8); }
    let moved = 0;
    if (this.enabled) {
      // turning (VR only, desktop handled by mouse)
      if (e.xr) {
        if (s.turn === 'snap') {
          this.snapCooldown -= dt;
          if (Math.abs(st.tx) > 0.7 && this.snapCooldown <= 0) { this.rotateAroundHead(-Math.sign(st.tx) * THREE.MathUtils.degToRad(s.snapAngle)); this.snapCooldown = 0.35; }
          if (Math.abs(st.tx) < 0.3) this.snapCooldown = 0;
        } else if (Math.abs(st.tx) > 0.1) this.rotateAroundHead(-st.tx * dt * 2.0);
      }
      // forward basis: head yaw
      e.camera.getWorldDirection(_f); _f.y = 0; _f.normalize(); _r.set(-_f.z, 0, _f.x);
      if (s.loco === 'teleport' && e.xr) this._teleport(dt, inp);
      else {
        let sp = this.speed * (st.run ? 1.7 : 1) * (st.crouch ? 0.5 : 1);
        _v.set(0, 0, 0).addScaledVector(_f, st.my).addScaledVector(_r, st.mx);
        const l = _v.length(); if (l > 1) _v.multiplyScalar(1 / l);
        _v.multiplyScalar(sp * dt);
        e.rig.position.add(_v); moved = _v.length();
      }
      // ARM SWING: swing your arms like walking; faster swings, faster walk (toward where you look)
      if (s.armSwing && e.xr && inp.hands.left && inp.hands.right) {
        const yl = inp.hands.left.grip.position.y, yr = inp.hands.right.grip.position.y;
        if (this._swY) {
          const sw = (Math.abs(yl - this._swY[0]) + Math.abs(yr - this._swY[1])) / 2 / Math.max(dt, 1e-3);
          const target = Math.max(0, Math.min(2.6, (sw - 0.35) * 1.6)) * (st.crouch ? 0.5 : 1);
          this._swV = (this._swV || 0) + (target - (this._swV || 0)) * Math.min(1, dt * 4);
          if (this._swV > 0.02) { e.rig.position.addScaledVector(_f, this._swV * dt); moved += this._swV * dt; }
        }
        this._swY = [yl, yr];
      } else { this._swY = null; this._swV = 0; }
    }
    // collision on the head position (also blocks room-scale walking into walls)
    e.rig.updateMatrixWorld(true);
    const hp = e.headPos(_h);
    const res = this.g.hidden ? { x: hp.x, z: hp.z } : e.colliders.resolve(hp.x, hp.z, 0.22);
    e.rig.position.x += res.x - hp.x; e.rig.position.z += res.z - hp.z;
    e.rig.updateMatrixWorld(true);
    // falling when off the floor (void chapters)
    if (this.floorCheck && !this.floorCheck(res.x, res.z)) {
      this.falling += dt; e.rig.position.y -= this.falling * 9 * dt;
      if (this.falling > 1.2) { this.falling = 0; this.g.caught('fall'); }
    } else if (this.falling > 0) this.falling = 0;
    // head velocity / speed
    e.headPos(_v);
    this.headVel.subVectors(_v, this.lastHead).divideScalar(Math.max(dt, 1e-3));
    this.lastHead.copy(_v);
    const hs = Math.hypot(this.headVel.x, this.headVel.z);
    this.moveSpeed += (Math.min(hs, 4) - this.moveSpeed) * Math.min(1, dt * 6);
    // footsteps
    this.stepAcc += Math.min(hs, 4) * dt;
    const stride = st.run ? 0.95 : 0.7;
    if (this.stepAcc > stride) {
      this.stepAcc = 0;
      const vol = st.crouch ? 0.35 : st.run ? 1.1 : 0.7;
      this.g.audio.step(this.surface, null, vol * 0.6);
      for (const fn of this.stepListeners) fn(vol);
    }
    // noise: movement + mic
    const physH = e.xr ? e.headPos(_h).y - e.rig.position.y : (st.crouch ? 1.05 : 1.65);
    this.crouched = st.crouch || physH < (this.g.settings.seated ? 0.75 : 1.15);
    const movNoise = Math.min(1, this.moveSpeed / 3.5) * (this.crouched ? 0.35 : 1) * (st.run ? 1.6 : 1);
    const mic = this.g.audio.micOn ? this.g.audio.micLevel : 0;
    const n = Math.min(1, Math.max(movNoise * (this.g.audio.micOn ? 0.6 : 1), mic * 1.2));
    this.noise += (n - this.noise) * Math.min(1, dt * 3);
    this._flashlight(dt, inp);
  }
  _teleport(dt, inp) {
    const st = inp.state, e = this.e;
    const aiming = st.my > 0.6;
    const src = inp.handObj('left');
    if (aiming) {
      // simple parabolic arc from left controller
      const m = (inp.hands.left || inp.hands.right)?.ray.matrixWorld || src.matrixWorld;
      const o = _v.setFromMatrixPosition(m), d = _f.set(0, 0, -1).transformDirection(m);
      let x = o.x, y = o.y, z = o.z, vx = d.x * 7, vy = d.y * 7, vz = d.z * 7, hit = null;
      for (let i = 0; i < 40; i++) {
        const t = 0.04; x += vx * t; y += vy * t; z += vz * t; vy -= 9.8 * t;
        if (e.colliders.blocked(x, z, 0.05)) break;
        if (y <= 0) { hit = [x, z]; break; }
      }
      if (hit && Math.hypot(hit[0] - o.x, hit[1] - o.z) < 8) { this.tpMarker.position.set(hit[0], 0.02, hit[1]); this.tpMarker.visible = true; this.tpHit = hit; }
      else { this.tpMarker.visible = false; this.tpHit = null; }
      this.tpAim = true;
    } else if (this.tpAim) {
      this.tpAim = false; this.tpMarker.visible = false;
      if (this.tpHit && (!this.floorCheck || this.floorCheck(this.tpHit[0], this.tpHit[1]))) {
        const hp = e.headPos(_h); e.rig.position.x += this.tpHit[0] - hp.x; e.rig.position.z += this.tpHit[1] - hp.z;
        this.g.audio.step(this.surface, null, 0.9); this.noise = Math.min(1, this.noise + 0.5);
        for (const fn of this.stepListeners) fn(1);
      }
    }
  }
  _flashlight(dt, inp) {
    const e = this.e, fl = e.flash;
    if (inp.pressed('flash') && this.g.flashAllowed) { this.flashOn = !this.flashOn; this.g.audio.beep(this.flashOn ? 1500 : 900, 0.02, 0.05); }
    if (this.flashOn && this.g.flashAllowed && this.battery > 0) this.battery = Math.max(0, this.battery - dt * this.batteryDrain);
    const src = e.xr && inp.hands.right ? inp.hands.right.ray : e.camera;
    src.getWorldPosition(_v); _f.set(0, 0, -1).transformDirection(src.matrixWorld);
    fl.position.copy(_v); e.flashTarget.position.copy(_v).addScaledVector(_f, 5);
    let I = this.flashOn && this.g.flashAllowed && this.battery > 0 ? 1 : 0;
    // low battery: slow, irregular dimming (never a rapid strobe)
    if (I && this.battery < 15) { this.flashFlicker += dt; I *= 0.55 + 0.45 * Math.abs(Math.sin(this.flashFlicker * 0.9 + Math.sin(this.flashFlicker * 0.37) * 3)); }
    if (this.g.flashDim) I *= this.g.flashDim;
    I *= 1 - (this.g.dread || 0) * 0.6;
    fl.intensity += (I * 40 - fl.intensity) * Math.min(1, dt * 6);
    // beam haze and dust follow the light
    const bm = e.beam, k = fl.intensity / 40; bm.visible = k > 0.02; bm.position.copy(fl.position); bm.lookAt(e.flashTarget.position); bm.material.uniforms.u.value = k;
    const du = e.dust.material.uniforms; du.u.value = k; du.fp.value.copy(fl.position); du.fd.value.copy(_f); du.t.value += dt;
    e.dust.position.set(Math.round(fl.position.x / 4) * 4, Math.round(fl.position.y / 4) * 4, Math.round(fl.position.z / 4) * 4);
  }
}
