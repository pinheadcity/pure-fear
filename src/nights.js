// THE PROCESSING — five nights in the compound.
import * as THREE from 'three';
import { buildCompound } from './world.js';
import { Hunter, Watcher, dress, los, syncExtras } from './hunter.js';
import { character, prop, surf } from './assets.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- shared pieces ----------
function family(c, { butcher, mother, grandma } = {}) {
  const g = c.g; g.hunters = []; g.watchers = [];
  if (butcher) {
    const h = new Hunter(g, { nav: c.nav, ...butcher.opts });
    h.place(butcher.x, butcher.z, butcher.yaw || 0); h.doors = c.doorList; h.hideSpots = c.hides;
    if (butcher.work) h.work = butcher.work; h.set(butcher.state || 'idle');
    g.hunters.push(h); c.butcher = h;
  }
  if (mother) { const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: mother.ts ?? 0.32, sight: mother.sight ?? 7, hearing: 5 }); m.baseTs = mother.ts ?? 0.32; m.place(mother.x, mother.z, mother.yaw || 0); g.watchers.push(m); c.mother = m; }
  if (grandma) { const w = new Watcher(g, { anim: 'sad_pose', sight: 0, hearing: grandma.hearing ?? 7, blind: true, scale: 0.92 }); w.place(grandma.x, grandma.z, grandma.yaw || 0); g.watchers.push(w); c.grandma = w; }
}
// work loop at the kill table: chopping, wet sounds
function chopWork(x, z, yaw, tx, tz) {
  let t = 0; return { x, z, yaw, anim: 'idle', tick(dt, h) { t -= dt; if (t <= 0) { t = 0.9 + Math.random() * 1.4; h.g.audio.play(Math.random() < 0.6 ? ['thud1', 'thud3', 'thud5', 'thud7'] : ['wet1', 'wet2', 'wet4', 'meat3', 'meat6', 'squish3'], V(tx, 1, tz), { vol: 1.1, ref: 2.5 }); } } };
}
function bulbs(c, a, b) { if (a) c.bulb(0, ...a); if (b) c.bulb(1, ...b); }
// slow, uneven dimming of a bulb (no strobe)
function sickLight(c, i) { const p = c.e.points[i]; let t = Math.random() * 10; c.onUpdate(dt => { t += dt; p.intensity = p.userData.base * (0.55 + 0.45 * Math.abs(Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1))); }); }
// the struggle against the straps. VR: yank the controllers. Desktop: hammer E / click.
async function struggle(c, need = 1, { noisy = true, onProgress } = {}) {
  const g = c.g, inp = g.input; let prog = 0, last = 0; const lp = V(0, 0, 0), rp = V(0, 0, 0), plp = V(0, 0, 0), prp = V(0, 0, 0); let init = false;
  g.hud.sub(g.engine.xr ? 'Your wrists are strapped down. Yank your hands, hard.' : 'Your wrists are strapped down. Hammer E / click to pull.', 6);
  await c.until(() => {
    let effort = 0;
    if (g.engine.xr) { inp.handPos('left', lp); inp.handPos('right', rp); if (init) effort = (lp.distanceTo(plp) + rp.distanceTo(prp)) * 6; plp.copy(lp); prp.copy(rp); init = true; }
    else if (inp.pressed('use') || inp.pressed('useL')) effort = 0.9;
    if (effort > 0.25) { prog += effort * 0.035; g.player.noise = Math.max(g.player.noise, noisy ? Math.min(1, effort) : 0.2); if (c.timeT - last > 0.35) { last = c.timeT; g.audio.play(['door7', 'door3'], g.engine.headPos(V(0, 0, 0)).setY(0.8), { vol: 0.5, rate: 0.7 + Math.random() * 0.3 }); } }
    onProgress && onProgress(prog);
    return prog >= need;
  });
  g.audio.play('door2', null, { vol: 0.8, rate: 0.6 });
}
// footprints of the copy that died here last time, and its body
function lastDeath(c) {
  const d = c.g.save.d.lastDeath?.[c.g.nightIndex]; if (!d) return;
  for (let i = 0; i < d.trail.length; i += 2) { const [x, z, r] = d.trail[i]; c.decal('print', x, 0, z, 0.32, { rot: r }); }
  c.body(d.x, d.z, { hang: false, tag: String(4096 + (c.g.save.d.restores - 1)) });
  c.decal('pool', d.x, 0, d.z, 2);
}
// the cage captive / escort
class Twelve {
  constructor(c, x, z, yaw) {
    this.c = c; this.g = c.g; this.ch = dress(character('Xbot'), { mask: true, scale: 0.95 }); this.root = this.ch.root; c.add(this.root);
    this.ch.root.position.set(x, 0, z); this.yaw = yaw; this.root.rotation.y = yaw + Math.PI;
    this.acts = this.ch.actions; this.play('sad_pose'); this.follow = false; this.trail = []; this.coughT = 6; this.alive = true;
  }
  play(n, ts = 1) { const a = this.acts[n]; if (!a || this.cur === a) return; a.timeScale = ts; a.reset().fadeIn(0.4).play(); if (this.cur) this.cur.fadeOut(0.4); this.cur = a; }
  update(dt) {
    this.ch.mixer.update(dt); syncExtras(this.ch, this.g.engine.world);
    const pos = this.root.position;
    // follow the player's footsteps, a few metres behind
    if (this.follow && this.alive) {
      const h = this.g.engine.headPos(V(0, 0, 0));
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last.x - h.x, last.z - h.z) > 0.5) this.trail.push(V(h.x, 0, h.z));
      const d = Math.hypot(h.x - pos.x, h.z - pos.z);
      if (d > 3.2 && this.trail.length) {
        const t = this.trail[0], dx = t.x - pos.x, dz = t.z - pos.z, l = Math.hypot(dx, dz);
        if (l < 0.3) this.trail.shift(); else { const sp = Math.min(l, (d > 7 ? 2.2 : 1.3) * dt); pos.x += dx / l * sp; pos.z += dz / l * sp; this.face(Math.atan2(-dx, -dz), dt * 5); }
        this.play(d > 7 ? 'run' : 'walk', 0.9);
      } else this.play('sad_pose');
      // teleport along with the player on the stairs
      if (d > 25) { pos.set(h.x - 1, 0, h.z); this.trail.length = 0; }
      // the cough that gives you both away
      this.coughT -= dt;
      if (this.coughT <= 0) { this.coughT = 14 + Math.random() * 16; this.g.audio.play(['c_cough1', 'c_cough2', 'c_cough3'], V(pos.x, 1.5, pos.z), { vol: 1, ref: 2 }); for (const hn of this.g.hunters) if (Math.hypot(hn.pos.x - pos.x, hn.pos.z - pos.z) < 11 && hn.state !== 'chase') { hn.lastHeard.set(pos.x, 0, pos.z); hn.set('investigate'); hn.goTo(pos.x, pos.z); } }
      for (const hn of this.g.hunters) if (hn.state !== 'grab' && Math.hypot(hn.pos.x - pos.x, hn.pos.z - pos.z) < 0.9) this.taken(hn);
    }
  }
  face(y, k) { let d = y - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, k); this.root.rotation.y = this.yaw + Math.PI; }
  taken(hn) {
    if (!this.alive) return; this.alive = false; this.follow = false;
    this.g.audio.play('c_scream1', V(this.root.position.x, 1.5, this.root.position.z), { vol: 1.4, ref: 3 });
    this.g.audio.play('rip1', V(this.root.position.x, 1, this.root.position.z), { vol: 1.1, offset: 3, dur: 4 });
    this.g.hud.msg('THEY TOOK TWELVE', 4, 'warn');
    this.g.after(3, () => this.g.caught(hn, 'twelve'));
  }
}

// ---------- NIGHT 1: THE CHAIR ----------
const night1 = {
  title: 'THE CHAIR', sub: 'You are number 4,096. The others are hanging in the barn.',
  atmosphere: { fog: 0x040302, density: 0.11, hemi: 0.05 },
  build(c) {
    buildCompound(c); bulbs(c, [-7, 2.5, -5, 0xffa860, 5, 8], [5, 2.5, -5, 0xff9a50, 4, 9]); sickLight(c, 0);
    c.key = c.pickup(new THREE.Group().add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), surf('rusty_metal_02', { size: 0.3, metal: 0.7, rough: 0.4 }))), 5.3, 0.9, -5.6, 'chainkey', 'a key on a bloody string');
    c.decal('pool', 5.3, 0.885, -5.6, 0.5);
    c.note(-11.2, 0.92, -4.4, 0.4, 'SCRATCHED INTO THE METAL', 'If you hear him breathing, do not move.\nHe checks the cupboard he found you in last time.\nThe woman dances. She only sees what is in front of her.\n\n- 4,095');
    c.note(9, 0.01, 8.5, 2, 'ON THE BACK OF A RECEIPT', 'They tag us by number. I am 4,091.\nThe one in the basement is still alive. Twelve. She coughs.\nIf you get out, don\'t leave her.');
    for (let i = 0; i < 3; i++) c.decal('hand', -2.1, 1 + i * 0.2, -5.8 - i * 0.3, 0.4, { wall: -Math.PI / 2 });
    lastDeath(c);
  },
  stages: [
    { spawn: [-7, -6.2, Math.PI], obj: 'Free yourself.', async run(c) {
      const g = c.g; g.player.enabled = false; g.audio.ambience('amb1', 0.35); g.flashAllowed = false;
      c.say('You are strapped into a barber chair. The floor around it is sticky.', 6);
      await c.sleep(6);
      // he comes in before you are free
      family(c, { butcher: { x: 5, z: 1.5, opts: { sight: 0.01 } } });
      const h = c.butcher; h.enabled = false; let got = false;
      c.doors.kitchen.open(true);
      await struggle(c, 0.35);
      c.sfx('door1', -7, 1, 0); h.place(-7, 1.6, 0); h.enabled = false;
      // he walks up to you and stands too close
      h.path = [V(-7, 0, -1), V(-7, 0, -5.4)];
      await c.until(() => { h.play('walk', 0.3, 0.75); return h.step(c.dt, 0.75); });
      h.faceTo(-7, -6.2, 1); h.play('idle');
      const br = c.sfx('c_breath', -7, 1.75, -5.5, { loop: true, vol: 0.9, ref: 0.6 });
      g.hud.sub('Don\'t move.', 3);
      let moved = 0; const t0 = c.timeT;
      await c.until(() => { if (g.player.headVel.length() > 0.6 || g.input.pressed('use')) moved++; return c.timeT - t0 > 9; });
      br && br.stop(1);
      if (moved > 2) { c.sfx('thud4', -7, 1.2, -6); g.engine.setFade(0.7, 0x300000); g.after(0.4, () => g.engine.setFade(0)); c.sfx('c_grunt4', -7, 1.7, -5.5); }
      c.sfx('thud2', -4.2, 0.8, -8.5, { vol: 1.2 }); // he drops the saw on the table, for later
      c.sfx('c_troll2', -7, 1.7, -5.5);
      h.path = [V(-7, 0, -1), V(-7, 0, 1.5), V(5, 0, 1.5), V(5, 0, -2)];
      await c.until(() => { h.play('walk'); return h.step(c.dt, 1.0); });
      h.enabled = true; h.sight = 12; h.work = chopWork(5, -2.8, Math.PI, 5, -4.5); h.set('work');
      await struggle(c, 1);
      g.player.enabled = true; g.flashAllowed = true; g.player.flashOn = false;
      g.hud.sub('Your flashlight is still in your pocket. They did not search you. They never do.', 5);
    } },
    { spawn: [-7, -5.2, Math.PI], obj: 'Get out of the house. The front door is chained.', async run(c) {
      const g = c.g;
      if (!c.butcher) family(c, { butcher: { x: 5, z: -2.8, work: chopWork(5, -2.8, Math.PI, 5, -4.5), state: 'work' } });
      g.watchers = g.watchers || []; const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: 0.32, sight: 6.5, hearing: 4 }); m.baseTs = 0.32; m.place(7.5, -7.5, 0.6); g.watchers.push(m);
      c.onUpdate(dt => { m.yaw += dt * 0.12; m.root.rotation.y = m.yaw + Math.PI; }); // she turns as she dances
      g.audio.ambience('amb1', 0.3);
      c.doors.front.locked = 'chainkey';
      await c.until(() => c.doors.front.isOpen);
      await c.reach(14.5, 1.5, 1.5);
    } },
    { spawn: [14.5, 1.5, -Math.PI / 2], obj: 'Outside.', async run(c) {
      c.say('The yard is mud and the mud is not all mud. The barn light is on. Something in the house starts screaming your number.', 7);
      c.sfx('c_scream1', 0, 1.6, -5, { vol: 1.2, ref: 4 });
      await c.sleep(6);
    } },
  ],
};

// ---------- NIGHT 2: THE KILL FLOOR ----------
const night2 = {
  title: 'THE KILL FLOOR', sub: 'The gate is chained. The bolt cutters are in the barn. So is he.',
  atmosphere: { fog: 0x020204, density: 0.07, hemi: 0.05, hemiSky: 0x404860 },
  build(c) {
    buildCompound(c); bulbs(c, [33, 3.2, -12, 0xff8040, 7, 12], [28, 2.3, 14, 0xff6020, 3, 6]); sickLight(c, 0);
    c.doors.front.locked = null;
    c.note(27, 0.01, 12, 0.3, 'NAILED TO THE SMOKEHOUSE WALL', 'Bolt cutters: barn, the grey locker.\nLocker key: they keep it ON one of us.\nIt is always on the newest one.\n\nThe newest one is you.');
    c.newest = c.body(39.5, -13, { tag: '4096' }); c.decal('pool', 39.5, 0, -13, 1.6);
    c.locker = c.mesh(new THREE.BoxGeometry(0.1, 1.6, 1.8), surf('rusty_metal_02', { size: 1.5, metal: 0.5, rough: 0.6 }), 41.06, 0.95, -14);
    c.cutters = prop('bolt_cutters_01'); c.cutters.position.set(41.3, 0.9, -14); c.add(c.cutters); c.cutters.visible = false;
    lastDeath(c);
  },
  stages: [
    { spawn: [28, 12.5, Math.PI], obj: 'Get into the barn.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.3);
      family(c, { butcher: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      // a dog somewhere beyond the fence
      c.onUpdate(() => { if (Math.random() < 0.002) c.sfx(['c_barking1', 'c_barking2', 'c_howl'], 60, 1, (Math.random() - 0.5) * 60, { vol: 0.8, ref: 8 }); });
      await c.reach(33, -6, 2);
    } },
    { spawn: [33, -2.5, 0], obj: 'Find the locker key. It is on the newest body.', async run(c) {
      const g = c.g;
      if (!g.hunters.length) family(c, { butcher: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      // reach into the plastic. hold the trigger. it takes a while.
      const it = c.interact(c.newest, 'reach inside (hold)', () => { });
      let hold = 0, sq = 0;
      await c.until(() => {
        const aiming = g.hudPrompt === it; const down = g.input.state.use;
        if (aiming && down) { hold += c.dt; sq -= c.dt; g.player.noise = Math.max(g.player.noise, 0.4); if (sq <= 0) { sq = 0.45; c.sfx(['squish1', 'squish2', 'squish4', 'wet3', 'wet5', 'meat2'], 39.5, 1.2, -13, { vol: 1 }); } g.hud.setPrompt(`reaching... ${Math.round(hold / 3.5 * 100)}%`); }
        else hold = Math.max(0, hold - c.dt * 0.5);
        return hold >= 3.5;
      });
      c.removeInteract(it); g.player.inventory.add('lockerkey'); g.hud.msg('A SMALL KEY. IT WAS WARM.', 3);
      c.sfx('c_hurt3', 39.5, 1.4, -13, { vol: 0.7, rate: 0.8 }); // it was not quite dead
    } },
    { spawn: [36, -13, Math.PI / 2], obj: 'Open the grey locker. Take the bolt cutters.', async run(c) {
      const g = c.g; g.player.inventory.add('lockerkey');
      if (!g.hunters.length) family(c, { butcher: { x: 30, z: -16, opts: { sight: 12, hearing: 14 } } });
      const it = c.interact(c.locker, 'open locker', () => { });
      await c.used(it); c.removeInteract(it); c.sfx('door3', 41, 1, -14); c.locker.rotation.y = 1.2; c.locker.position.x = 40.4; c.locker.position.z = -13.4;
      c.cutters.visible = true; await c.used(c.interact(c.cutters, 'take bolt cutters', () => { c.cutters.visible = false; g.player.inventory.add('cutters'); g.hud.msg('BOLT CUTTERS', 2); }));
    } },
    { spawn: [33, -2, Math.PI / 2], obj: 'Cut the chain on the gate (east).', async run(c) {
      const g = c.g; g.player.inventory.add('cutters');
      if (!g.hunters.length) family(c, { butcher: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      const it = c.interact(c.gate.chain, 'cut the chain (hold)', () => { }, { range: 2.6 });
      let hold = 0, sq = 0;
      await c.until(() => {
        if (g.hudPrompt === it && g.input.state.use) { hold += c.dt; sq -= c.dt; g.player.noise = 1; if (sq <= 0) { sq = 0.6; c.sfx(['thud6', 'thud8', 'door7'], 45.8, 1.1, 0, { vol: 1.2, rate: 1.4 }); } } else hold = Math.max(0, hold - (c.dt / 2));
        return hold > 4;
      });
      c.removeInteract(it); c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
      c.sfx('door1', 46, 1, 0, { vol: 1.3, rate: 0.7 });
      await c.reach(48, 0, 2);
      // they were waiting on the road
      c.bulb(1, 55, 1, 0, 0xfff4e0, 60, 30); c.sfx('sting2', 52, 1, 0, { vol: 1.2 });
      const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: 0.0, sight: 0, hearing: 0 }); m.place(50.5, 0.4, -Math.PI / 2); g.watchers.push(m);
      c.e.colliders.add(46.2, -24, 60, -1.3); c.e.colliders.add(46.2, 1.3, 60, 24); c.floor(46, -3, 60, 3, c.mats.mud);
      g.hud.sub('Headlights. She is standing in the road. She has been standing there the whole time.', 6);
      g.player.enabled = false; await c.sleep(2.5);
      c.sfx('c_scream2', 50.5, 1.6, 0.4, { vol: 1.5 }); g.engine.setFade(1, 0x000000);
      await c.sleep(3);
    } },
  ],
};

// ---------- NIGHT 3: DINNER ----------
const night3 = {
  title: 'DINNER', sub: 'They brought you back in. They set a place for you.',
  atmosphere: { fog: 0x050302, density: 0.1, hemi: 0.05 },
  build(c) {
    buildCompound(c); bulbs(c, [5, 2.2, -5, 0xffb070, 5, 7], [-7, 2.5, -5, 0xff9050, 2.5, 7]); sickLight(c, 0);
    // the meal
    c.plate = c.mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.3 }), 5, 0.89, -3.3);
    c.meal = c.mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1.3, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x5a1008, roughness: 0.25 }), 5, 0.93, -3.3); c.meal.visible = false;
    c.bkey = c.pickup(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), surf('rusty_metal_02', { size: 0.3, metal: 0.7 })), -10, 0.55, 8.4, 'basementkey', 'a padlock key in her lap');
    c.note(-3, 0.51, 8, 0.3, 'IN A CHILD\'S HANDWRITING', 'GRANMA CANT SEE\nGRANMA HEARS EVRYTHING\nDONT BREATHE NEAR GRANMA');
    lastDeath(c);
  },
  stages: [
    { spawn: [5, -2.4, 0], obj: 'Keep your eyes on him.', async run(c) {
      const g = c.g; g.player.enabled = false; g.flashAllowed = false; g.audio.ambience('amb1', 0.25);
      family(c, { butcher: { x: 5, z: -8.2, opts: {} }, grandma: { x: 8, z: -2, yaw: -Math.PI / 2, hearing: 0 } });
      const h = c.butcher; h.enabled = false; h.faceTo(5, -2.4, 1);
      const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: 0, sight: 0, hearing: 0 }); m.place(3.6, -1.8, -2.4); g.watchers.push(m);
      c.say('A plate in front of you. The woman stands at your shoulder. The man at the head of the table watches you, and waits.', 7);
      await c.sleep(5);
      c.sfx('c_breath', 3.8, 1.6, -2, { vol: 0.8, ref: 0.5 }); c.meal.visible = true; c.sfx('squish5', 5, 0.95, -3.3, { vol: 0.9 });
      // from the basement, through the floor: someone being worked on
      c.sfx('rip1', -40, -2, 0, { vol: 1.2, ref: 6, offset: 1, dur: 14 }); c.sfx('c_hurt5', -9, 0.2, 1.5, { vol: 1, ref: 4 });
      let strikes = 0, away = 0; const t0 = c.timeT;
      await c.until(() => {
        const hp = c.head(), f = c.e.headDir(V(0, 0, 0)); const to = V(h.pos.x - hp.x, 1.7 - hp.y, h.pos.z - hp.z).normalize();
        if (f.dot(to) < 0.82) { away += c.dt; if (away > 1.6) { away = 0; strikes++; c.sfx('thud1', 5, 0.9, -6, { vol: 1.4 }); c.sfx('c_grunt5', h.pos.x, 1.8, h.pos.z, { vol: 1.2 }); g.hud.msg(['LOOK AT HIM.', 'HE SAID LOOK AT HIM.', 'LAST TIME.'][Math.min(2, strikes - 1)], 2.5, 'warn'); } }
        else away = Math.max(0, away - c.dt);
        if (c.timeT - t0 > 14 && c.timeT - t0 < 14.1) c.sfx('c_eat2', 3.8, 1.5, -2, { vol: 0.9, ref: 0.6 });
        if (c.timeT - t0 > 24 && c.timeT - t0 < 24.1) { c.sfx('c_hurt2', -40, -2, 0, { vol: 1.3, ref: 6 }); }
        return strikes >= 3 || c.timeT - t0 > 36;
      });
      if (strikes >= 3) { h.enabled = true; h.place(5, -3.2, 0); g.caught(h); return new Promise(() => { }); }
      c.sfx('c_troll3', h.pos.x, 1.8, h.pos.z); c.say('He nods, as if you passed something. They leave you alone with her.', 5);
      m.root.visible = false; for (const e of m.ch.extras) e.mesh.visible = false; g.watchers = g.watchers.filter(w => w !== m);
      h.enabled = true; h.work = chopWork(-4.2, -7.6, Math.PI, -4.2, -8.5); h.set('work');
      c.grandma.hearing = 7;
      await c.sleep(4);
      await struggle(c, 1, { noisy: true });
      g.player.enabled = true; g.flashAllowed = true; g.player.flashOn = false;
    } },
    { spawn: [5, -1.6, 0], obj: 'The basement key. Grandmother\'s room. Make no sound near her.', async run(c) {
      const g = c.g;
      if (!c.butcher) family(c, { butcher: { x: -4.2, z: -7.6, work: chopWork(-4.2, -7.6, Math.PI, -4.2, -8.5), state: 'work' }, grandma: { x: -10, z: 8.4, yaw: 2.6 + Math.PI, hearing: 7 } });
      else { c.grandma.place(-10, 8.4, 2.6 + Math.PI); }
      c.doors.basement.locked = 'basementkey';
      await c.until(() => c.has('basementkey'));
      c.objective('Go down to the basement (hall, west end).');
      await c.until(() => c.head().x < -29);
    } },
  ],
};

// ---------- NIGHT 4: THE BASEMENT ----------
const night4 = {
  title: 'THE BASEMENT', sub: 'Someone is in the cage. She is still alive. He is coming down the stairs.',
  atmosphere: { fog: 0x030201, density: 0.12, hemi: 0.03 },
  build(c) {
    buildCompound(c); bulbs(c, [-40, 2.2, 0, 0xffa050, 2.5, 7], [-48, 2.2, 6, 0xff7030, 1.5, 4]); sickLight(c, 0); sickLight(c, 1);
    c.twelve = new Twelve(c, -48, 7.5, 0); c.onUpdate(dt => c.twelve.update(dt));
    c.crow = c.pickup(prop('crowbar_01'), -39.6, 0.05, -1.4, 'crowbar', 'crowbar');
    c.note(-40, 0.45, 1.4, 0.2, 'TAPED UNDER THE STOOL', 'Twelve has been here since 4,060.\nEvery one of us comes down here. Every one of us tries.\nShe follows you if you open it. She coughs. You will hate her for it.\nTake her anyway.');
    c.cageDoor = c.mesh(new THREE.BoxGeometry(1.2, 2.2, 0.05), surf('rusty_metal_02', { size: 1, metal: 0.6, rough: 0.5 }), -48, 1.1, 4.4);
    c.cageCol = c.e.colliders.add(-48.6, 4.35, -47.4, 4.45);
    lastDeath(c);
  },
  stages: [
    { spawn: [-31.6, 0, Math.PI / 2], obj: 'Find a way to open her cage.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.25);
      g.hunters = []; g.watchers = [];
      c.sfx('c_cough2', -48, 1.4, 7.5, { vol: 1 });
      c.say('A woman in a sack, in the last cage. She hears you and goes very still.', 5);
      // he comes down the stairs after a while
      c.g.after(45, () => { if (!c.alive || c.butcher) return; family(c, { butcher: { x: -31.5, z: 0, opts: { sight: 10, hearing: 16, walk: 1.0 } } }); c.butcher.alert = 0.3; c.sfx('door1', -31, 1.5, 0, { vol: 1.2 }); c.sfx(['step2', 'step4'], -31, 1, 0, { vol: 1.2 }); g.hud.sub('The door at the top of the stairs. Footsteps coming down. Slowly.', 5); });
      await c.until(() => c.has('crowbar'));
      c.objective('Pry the cage open (hold). It will be loud.');
      const it = c.interact(c.cageDoor, 'pry the cage (hold)', () => { }, { range: 2 });
      let hold = 0, sq = 0;
      await c.until(() => {
        if (g.hudPrompt === it && g.input.state.use) { hold += c.dt; sq -= c.dt; g.player.noise = 0.9; if (sq <= 0) { sq = 0.5; c.sfx(['thud6', 'door7', 'thud8'], -48, 1, 4.4, { vol: 1.1, rate: 0.8 }); } } else hold = Math.max(0, hold - (c.dt / 2));
        return hold > 4.5;
      });
      c.removeInteract(it); c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false;
      c.twelve.follow = true; c.sfx('c_cough1', -48, 1.4, 6, { vol: 1 });
    } },
    { spawn: [-46, 3, Math.PI], obj: 'Take Twelve up the stairs.', async run(c) {
      const g = c.g;
      if (!c.twelve.follow) { c.twelve.root.position.set(-47, 0, 2.5); c.twelve.follow = true; c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false; }
      if (!c.butcher) family(c, { butcher: { x: -36, z: 0, opts: { sight: 10, hearing: 16, walk: 1.0 } } });
      await c.until(() => c.head().x > -12 && c.twelve.alive);
    } },
  ],
};

// ---------- NIGHT 5: THE ROAD ----------
const night5 = {
  title: 'THE ROAD', sub: 'Get her through the gate. Everyone is awake now.',
  atmosphere: { fog: 0x020203, density: 0.075, hemi: 0.05, hemiSky: 0x404860 },
  build(c) {
    buildCompound(c); bulbs(c, [33, 3.2, -12, 0xff6030, 5, 12], [0, 2.4, 1.5, 0xffa060, 3, 8]); sickLight(c, 0);
    c.doors.front.locked = null; c.doors.basement.locked = null;
    c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
    c.twelve = new Twelve(c, -10.5, 2.2, -Math.PI / 2); c.onUpdate(dt => c.twelve.update(dt));
    c.floor(46, -3, 70, 3, c.mats.mud); c.e.colliders.add(46.2, -24, 70, -3); c.e.colliders.add(46.2, 3, 70, 24);
    lastDeath(c);
  },
  stages: [
    { spawn: [-11, 1.5, -Math.PI / 2], obj: 'Out the front door. Across the yard. Through the gate. Keep her alive.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.3); c.twelve.follow = true;
      family(c, { butcher: { x: 5, z: -5, state: 'patrol', opts: { sight: 14, hearing: 17, run: 2.65 } }, mother: { x: 22, z: 2, yaw: Math.PI / 2, ts: 0.3, sight: 8 } });
      c.butcher.aggro = 1;
      c.onUpdate(() => { if (Math.random() < 0.003) c.sfx(['c_barking1', 'c_barking2'], 46 + Math.random() * 10, 1, (Math.random() - 0.5) * 40, { vol: 0.9, ref: 6 }); });
      await c.until(() => c.head().x > 47 && c.twelve.alive && c.twelve.root.position.x > 44);
    } },
    { spawn: [48, 0, -Math.PI / 2], obj: '', async run(c) {
      const g = c.g; g.hunters.forEach(h => h.enabled = false); g.player.enabled = false;
      const tw = c.twelve; tw.follow = false; tw.root.position.set(50, 0, 0.3); tw.face(Math.PI / 2, 1); tw.play('sad_pose');
      await c.sleep(3);
      c.say('She stops in the road. She turns to you. She lifts the sack off her head.', 6);
      await c.sleep(4);
      // under the sack: a smooth, pale, faceless head. Your shape.
      for (const e of tw.ch.extras) e.mesh.visible = false;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14).scale(0.92, 1.28, 1.02), new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 0.6 }));
      const hb = tw.ch.bone('Head'); c.onUpdate(() => { hb.getWorldPosition(head.position); head.position.y += 0.1; });
      c.add(head); c.sfx('sting1', 50, 1.6, 0.3, { vol: 1.1 });
      g.hud.sub('There is no face under it. There never was. She is you, from before. They all are.', 8);
      await c.sleep(8);
      c.sfx('c_troll1', 40, 1.8, 0, { vol: 1 }); g.hud.sub('Behind you, he takes his mask off too.', 4);
      await c.sleep(5);
      c.flags.done = true;
    } },
  ],
};

export const NIGHTS = [night1, night2, night3, night4, night5];
