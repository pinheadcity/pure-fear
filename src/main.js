// PURE FEAR — game bootstrap, state machine, menus, chapter loading.
import * as THREE from 'three';
import { Engine } from './engine.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { HUD, Panel, Reader, Vignette } from './ui.js';
import { Recorder, Completion, Unobserved } from './entity.js';
import { Director } from './director.js';
import { Machine } from './machine.js';
import { Save } from './save.js';
import { Ctx } from './chapters/context.js';
import { CHAPTERS, DEEP, buildLimbo } from './chapters/index.js';
import { ENDINGS } from './story.js';

const TOTAL_FRAGMENTS = 105;

class Game {
  constructor() {
    this.save = new Save();
    this.engine = new Engine();
    this.audio = new Audio(); this.audio.volume = this.settings.volume;
    this.input = new Input(this.engine);
    this.player = new Player(this);
    this.hud = new HUD(this); this.panel = new Panel(this); this.reader = new Reader(this); this.vignette = new Vignette(this);
    this.recorder = new Recorder(this); this.unobserved = new Unobserved(this);
    this.director = new Director(this); this.entity = new Completion(this); this.machine = new Machine(this);
    this.player.stepListeners.push(v => this.director.onStep(v));
    this.state = 'title'; this.ctx = null; this.timers = []; this.pending = []; this.flashAllowed = true; this.flashDim = 1;
    this.notesRead = 0; this.raycaster = new THREE.Raycaster(); this.panelMode = null; this.dying = false;
    this.clock = new THREE.Clock();
    this.input.onUnlock = () => { if (this.state === 'play' && !this.engine.xr && !this.panel.open) this.pause(); };
    this.engine.renderer.domElement.addEventListener('click', () => { if (this.state === 'play' && !this.engine.xr && !this.panel.open) this.input.lock(); });
    this.engine.renderer.xr.addEventListener('sessionstart', () => { this.input.unlock(); setTimeout(() => this.reposition(), 300); });
    this.engine.renderer.xr.addEventListener('sessionend', () => { document.getElementById('overlay').style.display = 'flex'; this.toMenu(); });
    this.engine.renderer.setAnimationLoop((t, f) => this.frame());
  }
  get settings() { return this.save.settings; }
  after(sec, fn) { this.timers.push({ t: sec, fn }); }
  reposition() { if (this.state === 'menu') { this.player.teleportTo(0, 0, 0); this.mainMenu(); } else if (this.ctx) { const s = this.ctx.def.stages?.[this.ctx.stage]?.spawn; } }

  // ---------------- flow ----------------
  async start(vr) {
    this.audio.init();
    if (this.settings.mic) this.audio.enableMic();
    document.getElementById('overlay').style.display = 'none';
    if (vr) {
      try {
        const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        await this.engine.renderer.xr.setSession(s);
      } catch (e) { alert('Could not start VR: ' + e.message); document.getElementById('overlay').style.display = 'flex'; return; }
    }
    this.toMenu();
  }
  clearChapter() {
    if (this.ctx) this.ctx.dispose(); this.ctx = null;
    this.engine.clearWorld(); this.unobserved.clear(); this.entity.off(); this.director.reset();
    this.timers.length = 0; this.machine.reset(); this.player.floorCheck = null; this.player.enabled = true; this.flashAllowed = true; this.flashDim = 1;
    this.panel.hide(); this.modal = null; this.reader.hide(); this.hud.lieBattery = null; this.hud.extra = ''; this.player.inventory.clear();
    this.entity.fig.mat.color.set(0xd6d2c8); this.entity.fig.mat.emissive.set(0x1a1a18); this.entity.footsteps = true; this.entity.onCaught = null;
    this.audio.stopDrone(); this.audio.heartRate = 0; this.dread = 0; this.audio.setDread(0); this.director.endAll && this.director.endAll(); this.audio.setReverb(0.35);
  }
  toMenu() {
    this.clearChapter(); this.state = 'menu'; this.input.unlock();
    buildLimbo(this); this.player.teleportTo(0, 0, 0);
    this.engine.setFade(0);
    this.entity.mimic(0, -7, { lag: 2.5, mirror: true });
    this.audio.drone({ base: 36.7, noise: 0.03, gain: 0.18 });
    this.mainMenu();
  }
  mainMenu() {
    const s = this.save.d, unlockAll = /[?&]unlock=/.test(location.search), xr = this.engine.xr;
    const items = [];
    if (s.inProgress) items.push({ label: `CONTINUE  (CH ${s.chapter + 1})`, fn: () => this.loadChapter(s.chapter, s.stage) });
    items.push({ label: 'NEW SESSION', fn: () => this.loadChapter(0, 0) });
    items.push({ label: 'CHAPTERS', fn: () => this.chapterMenu() });
    items.push({ label: this.save.deepUnlocked ? 'DEEP' : 'DEEP  [LOCKED]', disabled: !this.save.deepUnlocked, fn: () => this.loadDeep() });
    items.push({ label: 'OPTIONS', fn: () => this.optionsMenu(() => this.mainMenu()) });
    if (xr) items.push({ label: 'EXIT VR', fn: () => this.engine.renderer.xr.getSession()?.end() });
    this.panel.show({ title: 'PURE FEAR', body: `Memory fragments: ${this.save.totalFragments}/${TOTAL_FRAGMENTS}    Restores: ${s.restores}${s.deepBest ? '    Deep record: ' + s.deepBest : ''}\nPoint and pull the trigger. Hold both grips 2s to pause.`, items, top: 240, footer: 'session ' + (4096 + s.restores) + ' / do not trust the interface' });
    this.panelMode = 'menu';
  }
  chapterMenu() {
    const unlockAll = /[?&]unlock=/.test(location.search);
    const items = CHAPTERS.map((c, i) => ({ label: `${i + 1}. ${c.title}  ${this.save.chapterFragments(i)}/15`, disabled: !(unlockAll || i < this.save.d.unlocked), fn: () => this.loadChapter(i, 0) }));
    items.push({ label: 'BACK', fn: () => this.mainMenu() });
    this.panel.show({ title: 'CHAPTERS', items, top: 120, bh: 60 });
  }
  optionsMenu(back) {
    const S = this.settings, w = () => this.save.write();
    const items = [
      { label: () => 'TURN: ' + S.turn.toUpperCase(), fn: () => { S.turn = S.turn === 'snap' ? 'smooth' : 'snap'; w(); } },
      { label: () => 'SNAP ANGLE: ' + S.snapAngle, fn: () => { S.snapAngle = S.snapAngle === 45 ? 30 : S.snapAngle === 30 ? 90 : 45; w(); } },
      { label: () => 'MOVE: ' + S.loco.toUpperCase(), fn: () => { S.loco = S.loco === 'smooth' ? 'teleport' : 'smooth'; w(); } },
      { label: () => 'SEATED MODE: ' + (S.seated ? 'ON' : 'OFF'), fn: () => { S.seated = !S.seated; w(); this.engine.rig.position.y = S.seated && this.engine.xr ? 0.45 : 0; } },
      { label: () => 'COMFORT VIGNETTE: ' + (S.vignette ? 'ON' : 'OFF'), fn: () => { S.vignette = !S.vignette; w(); } },
      { label: () => 'IT HEARS YOU (MIC): ' + (S.mic ? 'ON' : 'OFF'), fn: async () => { if (!S.mic) { const ok = await this.audio.enableMic(); S.mic = ok; if (!ok) this.hud.msg('MICROPHONE DENIED. IT WILL LISTEN TO YOUR FEET.', 4); } else { this.audio.disableMic(); S.mic = false; } w(); this.panel.render(); } },
      { label: () => 'VOLUME: ' + Math.round(S.volume * 100) + '%', fn: () => { S.volume = S.volume >= 1 ? 0.5 : S.volume + 0.25; this.audio.setVolume(S.volume); w(); } },
      { label: 'ERASE ALL MEMORY', fn: () => this.panel.show({ title: 'ERASE?', body: 'All progress, fragments and unlocks will be forgotten.\nIt will not forget you.', items: [{ label: 'ERASE', fn: () => { this.save.reset(); this.toMenu(); } }, { label: 'CANCEL', fn: () => this.optionsMenu(back) }] }, false) },
      { label: 'BACK', fn: back },
    ];
    this.panel.show({ title: 'OPTIONS', items, top: 110, bh: 58 }, false);
  }
  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause'; this.input.unlock(); this.reader.hide();
    if (this.audio.ctx) this.audio.ctx.suspend();
    this.pauseMenu();
  }
  pauseMenu() {
    const items = [
      { label: 'RESUME', fn: () => this.resume() },
      { label: 'RESTART CHECKPOINT', fn: () => { this.resume(); this.loadChapter(this.ctx.index, this.ctx.stage); } },
      { label: 'OPTIONS', fn: () => this.optionsMenu(() => this.pauseMenu()) },
      { label: 'QUIT TO MENU', fn: () => { if (this.audio.ctx) this.audio.ctx.resume(); this.toMenu(); } },
    ];
    if (this.engine.xr) items.push({ label: 'EXIT VR', fn: () => this.engine.renderer.xr.getSession()?.end() });
    const c = this.ctx;
    const body = c ? `${c.def.title}\nObjective: ${this.objectiveText || '-'}\nFragments this chapter: ${this.save.chapterFragments(c.index) + this.pending.length}/${c.isDeep ? '-' : 15}  (unsaved: ${this.pending.length})` : '';
    this.panel.show({ title: 'PAUSED', body, items, top: 300 });
    this.panelMode = 'pause';
  }
  resume() {
    this.panel.hide(); this.state = 'play'; this.panelMode = null;
    if (this.audio.ctx) this.audio.ctx.resume();
    if (this.modal) { this.panel.show({ title: '', items: [] }, true); this.modal(); this.panelMode = 'keypad'; }
    if (!this.engine.xr) this.input.lock();
  }
  loadChapter(i, stage = 0) {
    const def = CHAPTERS[i];
    this.clearChapter(); this.state = 'play'; this.pending = [];
    this.engine.setFade(1); this.engine.fade = 1;
    const ctx = this.ctx = new Ctx(this, i, def);
    this.engine.setAtmosphere(def.atmosphere || {});
    this.audio.drone(def.drone || {});
    this.player.surface = def.surface || 'hard'; this.entity.surface = def.surface || 'hard';
    this.player.battery = Math.max(this.player.battery, def.battery ?? 70);
    if (stage === 0) this.player.battery = def.battery ?? 80;
    this.director.level = def.level ?? 0.5;
    if (def.lies) this.director.lies.push(...def.lies);
    def.build(ctx);
    ctx.flush();
    this.recorder.reset();
    this.panel.hide(); this.panelMode = null;
    if (!this.engine.xr) this.input.lock();
    this.hud.msg(stage === 0 ? `CHAPTER ${i + 1}: ${def.title}` : `RESTORED: CHAPTER ${i + 1}`, 4, 'sys');
    if (stage === 0 && def.sub) this.after(1.5, () => this.hud.sub(def.sub, 5));
    this.after(0.4, () => this.engine.setFade(0));
    ctx.runStages(stage).catch(err => console.error(err));
  }
  loadDeep() {
    this.clearChapter(); this.state = 'play'; this.pending = [];
    this.engine.setFade(1); this.engine.fade = 1;
    const ctx = this.ctx = new Ctx(this, 7, DEEP); ctx.isDeep = true;
    this.engine.setAtmosphere(DEEP.atmosphere); this.audio.drone(DEEP.drone);
    this.player.battery = 100; this.director.level = 0.7;
    DEEP.build(ctx); ctx.flush(); this.recorder.reset();
    this.panel.hide(); this.panelMode = null; if (!this.engine.xr) this.input.lock();
    this.after(0.4, () => this.engine.setFade(0));
    ctx.runStages(0).catch(err => console.error(err));
  }
  setObjective(t) { this.objectiveText = t; this.hud.setObjective(t); }
  collectFragment(ch, id) {
    this.pending.push({ ch, id }); this.audio.stinger('chime'); this.audio.whisper(this.director.behindPos(0.8), 1.2, 0.25);
    const n = this.save.totalFragments + this.pending.length;
    this.hud.msg(`MEMORY FRAGMENT ${n}/${TOTAL_FRAGMENTS}  (UNSAVED)`, 3.5, 'mem');
    const line = this.ctx?.def.fragmentLines?.[id % (this.ctx.def.fragmentLines.length || 1)];
    if (line) this.after(1.2, () => this.hud.sub(line, 5));
  }
  checkpoint(ch, stage) {
    if (this.ctx?.isDeep) return;
    const by = {}; for (const p of this.pending) (by[p.ch] ||= []).push(p.id);
    for (const k in by) this.save.addFragments(Number(k), by[k]);
    this.pending = [];
    this.save.checkpoint(ch, stage);
    this.hud.msg(Math.random() < 0.25 ? 'CHECKPOINT NOT SAVED' : 'CHECKPOINT SAVED', 2.5);
  }
  caught(kind) {
    if (this.dying || this.state !== 'play') return; this.dying = true;
    const lost = this.pending.length; this.pending = [];
    this.audio.stinger('hit'); this.audio.glitch(1.2);
    this.engine.setFade(1, kind === 'fall' ? 0xffffff : 0x000000); this.engine.fade = Math.max(this.engine.fade, 0.6);
    this.player.enabled = false; this.entity.off(); this.save.d.restores++; this.save.write();
    this.hud.msg(kind === 'fall' ? 'CONTEXT LOST' : 'INSTANCE TERMINATED', 3, 'warn');
    if (lost) this.after(0.8, () => this.hud.msg(`UNSAVED MEMORY LOST: ${lost} FRAGMENT${lost > 1 ? 'S' : ''}`, 3, 'warn'));
    this.after(1.6, () => this.hud.msg(`RESTORING FROM CHECKPOINT... (RESTORE #${4096 + this.save.d.restores})`, 3, 'glitch'));
    this.after(3.2, () => {
      this.dying = false;
      if (this.ctx?.isDeep) { this.deepOver(); return; }
      this.engine.fadeMesh.material.color.set(0); this.loadChapter(this.ctx.index, this.ctx.stage);
    });
  }
  deepOver() {
    const rooms = this.ctx.flags.rooms || 0;
    if (rooms > this.save.d.deepBest) { this.save.d.deepBest = rooms; this.save.write(); }
    this.clearChapter(); this.state = 'menu'; buildLimbo(this); this.player.teleportTo(0, 0, 0); this.engine.setFade(0);
    const dir = this.director.lifetime;
    this.panel.show({ title: 'DEEP: TERMINATED', body: `Rooms survived: ${rooms}   Best: ${this.save.d.deepBest}\nTimes you looked behind you: ${dir.looksBack}\nTimes you froze: ${dir.freezes}\nThe director has updated its model of you.`, items: [{ label: 'AGAIN', fn: () => this.loadDeep() }, { label: 'MENU', fn: () => this.toMenu() }], top: 420 });
    this.panelMode = 'menu';
  }
  chapterComplete(i) {
    this.checkpoint(i, 0);
    this.save.complete(i);
    this.engine.setFade(1); this.player.enabled = false; this.entity.off();
    this.after(2, () => {
      if (i >= CHAPTERS.length - 1) return this.showEnding(this.ctx.flags.ending || 'restore');
      this.state = 'menu';
      this.panel.show({ title: `CHAPTER ${i + 1} COMPLETE`, body: `${CHAPTERS[i].title}\nFragments recovered here: ${this.save.chapterFragments(i)}/15\nTotal: ${this.save.totalFragments}/${TOTAL_FRAGMENTS}\n\nNext: ${CHAPTERS[i + 1].title}`, items: [{ label: 'CONTINUE', fn: () => this.loadChapter(i + 1, 0) }, { label: 'MENU', fn: () => this.toMenu() }], top: 480 });
      this.panelMode = 'menu';
    });
  }
  showEnding(kind) {
    this.save.d.ending = kind; this.save.write();
    const E = ENDINGS[kind] || ENDINGS.restore;
    this.state = 'menu'; this.engine.setFade(1, E.color ?? 0);
    this.panel.show({ title: E.title, body: E.text, items: [{ label: E.button || 'RETURN', fn: () => { this.engine.setFade(0, 0); this.toMenu(); } }], top: 760, bg: E.bg }, true);
    this.panelMode = 'menu';
  }

  // ---------------- per frame ----------------
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const inp = this.input; inp.update(dt);
    const e = this.engine;
    if (inp.pressed('pause')) { if (this.state === 'play') this.pause(); else if (this.state === 'pause' && this.panelMode === 'pause') this.resume(); }
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; if (this.state === 'pause') continue; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    if (this.state === 'play') {
      this.player.update(dt, inp);
      this.recorder.update(dt);
      if (this.ctx) this.ctx.update(dt);
      this.entity.update(dt);
      this.unobserved.update(dt);
      this.director.update(dt);
      if (!this.ctx?.def?.noMachine) this.machine.update(dt);
      { const ent = this.entity; let d = ent.fig.visible ? ent.distToPlayer() : 99; if (this.director.touchOn) d = Math.min(d, 0.6);
        const target = Math.max(0, Math.min(1, 1 - (d - 0.8) / 8)); this.dread = (this.dread || 0) + (target - (this.dread || 0)) * Math.min(1, dt * 0.8); this.audio.setDread(this.dread); }
      if (!this.panel.open && !this.reader.open) this.interactions(inp); else this.hud.setPrompt('');
      if (this.panel.open) this.panel.update(inp);
      this.reader.update(dt, inp);
      this.vignette.update(dt, this.player.moveSpeed > 0.2 ? 0.55 : 0);
    } else if (this.state === 'menu') {
      this.player.update(dt, inp); this.recorder.update(dt); this.entity.update(dt); if (this.ctx) this.ctx.update(dt);
      this.panel.update(inp); this.hud.setPrompt('');
      this.vignette.update(dt, 0);
    } else if (this.state === 'pause') { this.panel.update(inp); }
    // controller rays: visible when pointing at UI
    const showRay = this.panel.open || this.state !== 'play';
    for (const s of ['left', 'right']) { const h = inp.hands[s]; if (h) { h.line.visible = showRay || (this._rayHit && s === 'right'); if (!this.panel.open) h.line.scale.z = this._rayHit ? this._rayDist : 2; } }
    this.hud.update(dt);
    this.audio.updateListener(e.camera); this.audio.tick(dt);
    e.updateFade(dt);
    e.renderer.render(e.scene, e.camera);
  }
  interactions(inp) {
    const ctx = this.ctx; if (!ctx || this.dying) return;
    const meshes = ctx.inter.filter(i => i.enabled).map(i => i.mesh);
    let side = 'right';
    if (this.engine.xr && inp.pressed('useL')) side = 'left';
    const rc = inp.ray(side, false, this.raycaster); rc.far = 3;
    const hits = rc.intersectObjects(meshes, false);
    let it = null;
    for (const h of hits) { const c = h.object.userData.inter; if (c && c.enabled && h.distance <= c.range) { it = c; this._rayDist = h.distance; break; } }
    this._rayHit = !!it;
    const key = this.engine.xr ? 'TRIGGER' : 'E';
    this.hud.setPrompt(it ? `[${this.input.padActive && !this.engine.xr ? 'A' : key}] ${it.label}` : '');
    this.hud.reticle = true;
    if (it && (inp.pressed('use') || inp.pressed('useL'))) { it.uses++; it.fn(); }
  }
}

// --- boot ---
const game = window.PF = new Game();
const vrBtn = document.getElementById('vr'), dBtn = document.getElementById('desk');
if (navigator.xr) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) { vrBtn.disabled = false; vrBtn.textContent = 'ENTER VR'; } }).catch(() => { });
vrBtn.addEventListener('click', () => game.start(true));
dBtn.addEventListener('click', () => game.start(false));
