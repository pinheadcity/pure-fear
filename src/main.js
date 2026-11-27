// PURE FEAR: THE PROCESSING — game loop, menus, hiding, capture, nights.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { HUD, Panel, Reader, Vignette } from './ui.js';
import { Save } from './save.js';
import { Ctx } from './world.js';
import { NIGHTS, ENDINGS } from './nights.js';
import { Dialogue } from './dialogue.js';
import { loadModels, loadSounds, sound, prop, surf } from './assets.js';
import { textCanvas, canvasTex } from './textures.js';

const _v = new THREE.Vector3();

class Game {
  constructor() {
    this.save = new Save();
    this.engine = new Engine();
    this.audio = new Audio(); this.audio.volume = this.settings.volume; this.audio.sampleFn = sound;
    this.input = new Input(this.engine); this.dialogue = new Dialogue(this);
    this.player = new Player(this);
    this.hud = new HUD(this); this.panel = new Panel(this); this.reader = new Reader(this); this.vignette = new Vignette(this);
    this.state = 'title'; this.ctx = null; this.timers = []; this.hunters = []; this.watchers = []; this.flashAllowed = true; this.flashDim = 1;
    this.raycaster = new THREE.Raycaster(); this.dying = false; this.hidden = null; this.dread = 0; this.trail = []; this.trailT = 0;
    this.clock = new THREE.Clock(); this.nightIndex = 0; this.hudPrompt = null; this._rayDist = 2;
    // the slats you see through when hiding
    const { c, g } = textCanvas(256, 256); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) g.clearRect(0, y + 20, 256, 7);
    this.slats = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(c), transparent: true, depthTest: false, fog: false }));
    this.slats.position.z = -0.32; this.slats.renderOrder = 3500; this.slats.visible = false; this.engine.camera.add(this.slats);
    this.input.onUnlock = () => { if (this.state === 'play' && !this.engine.xr && !this.panel.open) this.pause(); };
    this.engine.renderer.domElement.addEventListener('click', () => { if (this.state === 'play' && !this.engine.xr && !this.panel.open) this.input.lock(); });
    this.engine.renderer.xr.addEventListener('sessionstart', () => this.input.unlock());
    this.engine.renderer.xr.addEventListener('sessionend', () => { document.getElementById('overlay').style.display = 'flex'; this.toMenu(); });
    this.engine.renderer.setAnimationLoop(() => this.frame());
  }
  get settings() { return this.save.settings; }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }

  async start(vr) {
    this.audio.init();
    const st = document.getElementById('status');
    if (!this.soundsLoaded) { st.textContent = 'LOADING SOUNDS...'; await loadSounds(this.audio.ctx, p => st.textContent = `LOADING SOUNDS ${Math.round(p * 100)}%`); this.soundsLoaded = true; st.textContent = ''; }
    if (this.settings.mic) this.audio.enableMic();
    document.getElementById('overlay').style.display = 'none';
    if (vr) {
      try { const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }); await this.engine.renderer.xr.setSession(s); }
      catch (e) { alert('Could not start VR: ' + e.message); document.getElementById('overlay').style.display = 'flex'; return; }
    }
    this.toMenu();
  }
  clear() {
    if (this.ctx) this.ctx.dispose(); this.ctx = null;
    for (const h of [...this.hunters, ...this.watchers]) for (const e of h.ch?.extras || []) e.mesh.removeFromParent();
    this.engine.clearWorld(); this.hunters = []; this.watchers = []; this.timers.length = 0;
    this.player.floorCheck = null; this.player.enabled = true; this.flashAllowed = true; this.flashDim = 1; this.player.inventory.clear();
    this.dialogue.stop(); this.audio.birds(false); this.player.speed = 1.6; this.hud.subtitle = ''; this.hud.subT = 0;
    this.panel.hide(); this.modal = null; this.reader.hide(); this.exitHide(true); this.dread = 0; this.audio.setDread(0); this.audio.heartRate = 0; this.audio.ambience(null);
    this.engine.fadeMesh.material.color.set(0); this.hudPrompt = null;
  }
  // ---------- menus ----------
  toMenu() {
    this.clear(); this.state = 'menu'; this.input.unlock();
    const e = this.engine; e.setAtmosphere({ fog: 0x030202, density: 0.12, hemi: 0.04 });
    const ctx = this.ctx = new Ctx(this, { stages: [] });
    ctx.mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), surf('dirty_tiles', { size: 1.6, rough: 0.5 }));
    ctx.prop('BarberShopChair_01', 0, 0, -3.2, 0); ctx.decal('pool', 0, 0, -3.2, 2.4);
    ctx.body(-1.6, -5, { tag: String(4096 + this.save.d.restores) }); ctx.body(1.7, -5.6, { tag: String(4095 + this.save.d.restores) });
    ctx.bulb(0, 0, 2.3, -3.2, 0xffa060, 3.5, 7);
    this.player.teleportTo(0, 0, 0); e.setFade(0);
    this.audio.ambience('amb1', 0.3);
    this.mainMenu();
  }
  mainMenu() {
    const s = this.save.d, xr = this.engine.xr, unlockAll = /[?&]unlock=/.test(location.search);
    const items = [];
    if (s.inProgress && NIGHTS[s.chapter]) items.push({ label: `CONTINUE  (${NIGHTS[s.chapter].title})`, fn: () => this.loadNight(s.chapter, s.stage) });
    items.push({ label: 'BEGIN', fn: () => { this.save.d.story = {}; this.save.write(); this.loadNight(0, 0); } });
    items.push({ label: 'CHAPTERS', fn: () => this.panel.show({ title: 'CHAPTERS', items: [...NIGHTS.map((n, i) => ({ label: `${i + 1}. ${n.title}`, disabled: !(unlockAll || i < s.unlocked), fn: () => this.loadNight(i, 0) })), { label: 'BACK', fn: () => this.mainMenu() }], top: 140 }, false) });
    items.push({ label: 'OPTIONS', fn: () => this.optionsMenu(() => this.mainMenu()) });
    if (xr) items.push({ label: 'EXIT VR', fn: () => this.engine.renderer.xr.getSession()?.end() });
    this.panel.show({ title: 'PURE FEAR', body: `THE PROCESSING\nCopies processed: ${4096 + s.restores}\nPoint and pull the trigger. Hold both grips 2s to pause.`, items, top: 260, footer: 'adults only. headphones. turn the lights off.' });
  }
  optionsMenu(back) {
    const S = this.settings, w = () => this.save.write();
    this.panel.show({ title: 'OPTIONS', top: 110, bh: 60, items: [
      { label: () => 'TURN: ' + S.turn.toUpperCase(), fn: () => { S.turn = S.turn === 'snap' ? 'smooth' : 'snap'; w(); } },
      { label: () => 'SNAP ANGLE: ' + S.snapAngle, fn: () => { S.snapAngle = S.snapAngle === 45 ? 30 : S.snapAngle === 30 ? 90 : 45; w(); } },
      { label: () => 'MOVE: ' + S.loco.toUpperCase(), fn: () => { S.loco = S.loco === 'smooth' ? 'teleport' : 'smooth'; w(); } },
      { label: () => 'SEATED MODE: ' + (S.seated ? 'ON' : 'OFF'), fn: () => { S.seated = !S.seated; w(); } },
      { label: () => 'COMFORT VIGNETTE: ' + (S.vignette ? 'ON' : 'OFF'), fn: () => { S.vignette = !S.vignette; w(); } },
      { label: () => 'THEY HEAR YOU (MIC): ' + (S.mic ? 'ON' : 'OFF'), fn: async () => { if (!S.mic) { S.mic = await this.audio.enableMic(); } else { this.audio.disableMic(); S.mic = false; } w(); this.panel.render(); } },
      { label: () => 'SPOKEN DIALOGUE: ' + (S.voices === false ? 'OFF' : 'ON'), fn: () => { S.voices = S.voices === false; w(); } },
      { label: () => 'VOLUME: ' + Math.round(S.volume * 100) + '%', fn: () => { S.volume = S.volume >= 1 ? 0.5 : S.volume + 0.25; this.audio.setVolume(S.volume); w(); } },
      { label: 'ERASE PROGRESS', fn: () => { this.save.reset(); this.toMenu(); } },
      { label: 'BACK', fn: back },
    ] }, false);
  }
  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause'; this.input.unlock(); this.reader.hide(); this.audio.ctx?.suspend();
    this.pauseMenu();
  }
  pauseMenu() {
    const items = [{ label: 'RESUME', fn: () => this.resume() }, { label: 'RESTART CHECKPOINT', fn: () => { this.resume(); this.loadNight(this.nightIndex, this.ctx?.stage || 0); } }, { label: 'OPTIONS', fn: () => this.optionsMenu(() => this.pauseMenu()) }, { label: 'QUIT TO MENU', fn: () => { this.audio.ctx?.resume(); this.toMenu(); } }];
    if (this.engine.xr) items.push({ label: 'EXIT VR', fn: () => this.engine.renderer.xr.getSession()?.end() });
    this.panel.show({ title: 'PAUSED', body: `${NIGHTS[this.nightIndex].title}\n${this.objectiveText || ''}`, items, top: 260 });
  }
  resume() { this.panel.hide(); this.state = 'play'; this.audio.ctx?.resume(); if (!this.engine.xr) this.input.lock(); }
  // ---------- nights ----------
  loadNight(i, stage = 0) {
    const def = NIGHTS[i]; this.clear(); this.state = 'play'; this.nightIndex = i;
    this.engine.setFade(1); this.engine.fade = 1;
    this.engine.setAtmosphere(def.atmosphere || {});
    const ctx = this.ctx = new Ctx(this, def);
    this.player.battery = 100; this.player.flashOn = false; this.trail = [];
    def.build(ctx); ctx.flush();
    if (!this.engine.xr) this.input.lock();
    this.hud.msg(stage === 0 ? `${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}.  ${def.title}` : `${def.title}. AGAIN.`, 4);
    if (stage === 0 && def.sub) this.after(2, () => this.hud.sub(def.sub, 6));
    this.after(0.6, () => this.engine.setFade(0));
    ctx.runStages(stage).catch(err => console.error(err));
  }
  setObjective(t) { this.objectiveText = t; if (t) this.hud.setObjective(t); }
  checkpoint(i, stage) { this.save.checkpoint(i, stage); }
  nightComplete() {
    const i = this.nightIndex; this.save.complete(i);
    this.engine.setFade(1, 0); this.player.enabled = false;
    this.after(2.5, () => {
      this.state = 'menu';
      if (i >= NIGHTS.length - 1) {
        this.save.d.inProgress = false; this.save.write();
        const st = this.save.d.story || {}, E = (ENDINGS[st.ending] || ENDINGS.home)(st, 4095 + this.save.d.restores);
        return this.panel.show({ title: E.title, body: E.text, items: [{ label: 'MENU', fn: () => { this.engine.setFade(0); this.toMenu(); } }], top: 760 }, true);
      }
      this.panel.show({ title: NIGHTS[i].title, body: `Copies processed so far: ${4096 + this.save.d.restores}\n\nNext: ${NIGHTS[i + 1].title}`, items: [{ label: 'CONTINUE', fn: () => this.loadNight(i + 1, 0) }, { label: 'MENU', fn: () => { this.engine.setFade(0); this.toMenu(); } }], top: 400 }, true);
    });
  }
  stairs(x, z, yaw) {
    this.engine.setFade(1); this.engine.fade = 1;
    for (let k = 0; k < 4; k++) this.after(k * 0.28, () => this.audio.play(['step1', 'step3', 'step5'], null, { vol: 0.6, rate: 0.9 }));
    this.player.teleportTo(x, z, yaw);
    this.after(0.9, () => this.engine.setFade(0));
  }
  // ---------- hiding ----------
  enterHide(spot) {
    if (this.hidden) return this.exitHide();
    this.hidden = spot; const mem = this.save.d.hideMemory || (this.save.d.hideMemory = {}); mem[spot.id] = (mem[spot.id] || 0) + 1;
    for (const h of this.hunters) { h.memory = mem; h.noticeHide(spot); }
    spot.col.on = false; this.player.teleportTo(spot.pos.x, spot.pos.z, spot.yaw); spot.col.on = true;
    this.player.enabled = false; this.slats.visible = true; this.audio.play('door5', spot.pos.clone().setY(1), { vol: 0.6 });
    this.hud.sub(this.engine.xr ? 'Hidden. Pull the trigger to get out.' : 'Hidden. Press E to get out.', 3);
  }
  exitHide(silent) {
    const s = this.hidden; if (!s) return; this.hidden = null; this.slats.visible = false; this.player.enabled = true;
    if (silent) return;
    this.player.teleportTo(s.front.x, s.front.z, s.yaw); this.audio.play('door4', s.pos.clone().setY(1), { vol: 0.6 });
    this.player.noise = Math.max(this.player.noise, 0.4);
  }
  // ---------- capture ----------
  caught(h) {
    if (this.dying || this.state !== 'play') return; this.dying = true;
    const e = this.engine, hp = e.headPos(new THREE.Vector3());
    // remember how this one died, for the next one
    const ld = this.save.d.lastDeath || (this.save.d.lastDeath = {}); ld[this.nightIndex] = { trail: this.trail.slice(-60), x: +hp.x.toFixed(2), z: +hp.z.toFixed(2) }; this.save.d.restores++; this.save.write();
    this.exitHide(true); this.player.enabled = false; this.reader.hide(); this.panel.hide();
    // it is right in front of your face
    const f = e.headDir(new THREE.Vector3()); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize();
    if (h && h.place) { h.place(hp.x + f.x * 0.55, hp.z + f.z * 0.55, Math.atan2(f.x, f.z)); h.enabled = false; h.play('idle', 0.05); }
    this.audio.play(['c_grunt4', 'c_grunt5'], hp.clone().addScaledVector(f, 0.5), { vol: 1.4, ref: 0.6 });
    this.audio.play('sting2', null, { vol: 1 });
    this.after(0.7, () => { this.audio.play(['thud1', 'thud4'], null, { vol: 1.4 }); this.engine.setFade(0.85, 0x2a0000); this.engine.fade = 0.85; });
    this.after(1.2, () => { this.audio.play('rip1', null, { vol: 1.1, offset: 2 + Math.random() * 10, dur: 3.5 }); this.audio.play(['wet1', 'wet6', 'meat4'], null, { vol: 1.2 }); });
    this.after(2.2, () => { this.engine.setFade(1, 0x000000); this.hud.msg(`PROCESSED. COPY ${4095 + this.save.d.restores}.`, 3.5, 'warn'); });
    this.after(5, () => { this.dying = false; this.loadNight(this.nightIndex, this.ctx?.stage || 0); });
  }
  // ---------- frame ----------
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta()), inp = this.input, e = this.engine;
    inp.update(dt);
    if (inp.pressed('pause')) { if (this.state === 'play') this.pause(); else if (this.state === 'pause') this.resume(); }
    if (this.state !== 'pause') for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    if (this.state === 'play' || this.state === 'menu') {
      this.player.update(dt, inp);
      if (this.ctx) this.ctx.update(dt);
      for (const h of this.hunters) h.update(dt);
      for (const w of this.watchers) w.update(dt);
      if (this.state === 'play') {
        if (!this.panel.open && !this.reader.open) this.interactions(inp); else { this.hud.setPrompt(''); this.hudPrompt = null; }
        // dread: how close he is, and whether he is hunting you
        let near = 99, hunting = false; const hp = e.headPos(_v);
        for (const h of this.hunters) { const d = Math.hypot(h.pos.x - hp.x, h.pos.z - hp.z); near = Math.min(near, d); if (h.state === 'chase') hunting = true; }
        const target = Math.max(0, Math.min(1, 1 - (near - 1.5) / 10)) * (hunting ? 1 : 0.7);
        this.dread += (target - this.dread) * Math.min(1, dt * 1.2); this.audio.setDread(this.dread * 0.85);
        this.audio.heartRate = hunting ? 1 : this.dread > 0.4 ? this.dread : 0;
        // footprints for the next copy
        this.trailT -= dt; if (this.trailT <= 0 && !this.hidden) { this.trailT = 0.7; this.trail.push([+hp.x.toFixed(2), +hp.z.toFixed(2), +(-e.headYaw()).toFixed(2)]); if (this.trail.length > 80) this.trail.shift(); }
      }
      if (this.panel.open) this.panel.update(inp);
      this.reader.update(dt, inp);
      this.vignette.update(dt, this.player.moveSpeed > 0.2 ? 0.55 : 0);
    } else if (this.state === 'pause') this.panel.update(inp);
    const showRay = this.panel.open || this.state !== 'play';
    for (const s of ['left', 'right']) { const h = inp.hands[s]; if (h) { h.line.visible = showRay || (!!this.hudPrompt && s === 'right'); if (!this.panel.open) h.line.scale.z = this.hudPrompt ? this._rayDist : 2; } }
    this.hud.update(dt);
    this.audio.updateListener(e.camera); this.audio.tick(dt);
    e.updateFade(dt);
    e.renderer.render(e.scene, e.camera);
  }
  interactions(inp) {
    const ctx = this.ctx; if (!ctx || this.dying) return;
    if (this.hidden && (inp.pressed('use') || inp.pressed('useL'))) { this.exitHide(); return; }
    const meshes = []; for (const i of ctx.inter) if (i.enabled) i.mesh.traverse(o => { if (o.isMesh) meshes.push(o); });
    const side = this.engine.xr && inp.pressed('useL') ? 'left' : 'right';
    const rc = inp.ray(side, false, this.raycaster); rc.far = 3;
    let it = null;
    for (const h of rc.intersectObjects(meshes, false)) { const c = h.object.userData.inter; if (c && c.enabled && h.distance <= c.range) { it = c; this._rayDist = h.distance; break; } }
    this.hudPrompt = it;
    const key = this.engine.xr ? 'TRIGGER' : this.input.padActive ? 'A' : 'E';
    this.hud.setPrompt(it ? `[${key}] ${it.label}` : ''); this.hud.reticle = true;
    if (it && (inp.pressed('use') || inp.pressed('useL'))) { it.uses++; it.fn(); }
  }
}

// --- boot ---
const game = window.PF = new Game();
const vrBtn = document.getElementById('vr'), dBtn = document.getElementById('desk'), st = document.getElementById('status');
let ready = false;
dBtn.disabled = true;
loadModels(p => st.textContent = `LOADING ${Math.round(p * 100)}%`).then(() => { ready = true; st.textContent = ''; dBtn.disabled = false; if (vrBtn.dataset.ok) vrBtn.disabled = false; });
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) { vrBtn.dataset.ok = 1; vrBtn.textContent = 'ENTER VR'; if (ready) vrBtn.disabled = false; } }).catch(() => { });
vrBtn.addEventListener('click', () => ready && game.start(true));
dBtn.addEventListener('click', () => ready && game.start(false));
