// PURE FEAR — four chapters on Route 9, October 1977.
import * as THREE from 'three';
import { buildCompound } from './world.js';
import { Hunter } from './hunter.js';
import { Actor, voice } from './cast.js';
import { surf } from './assets.js';
import { buildLot, buildRide, buildCorn, sky, grain, sign, place, RIDE } from './roadside.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = a => a[(Math.random() * a.length) | 0];

// ------------------------------------------------------------------ shared
function look(c, mode) {
  const e = c.e;
  if (mode === 'dusk') { e.setAtmosphere({ fog: 0x8a5a3a, density: 0.011, hemi: 1.0, hemiSky: 0xffb070, hemiGround: 0x4a2a18, sun: 1.6 }); e.sun.color.set(0xff9a50); e.sun.position.set(-60, 18, -40); sky(c, '#2a1840', '#c05830', '#f0a050', 0xffd090); }
  if (mode === 'night') { e.setAtmosphere({ fog: 0x0a0810, density: 0.06, hemi: 0.08, hemiSky: 0x5060a0, hemiGround: 0x100808, sun: 0.25 }); e.sun.color.set(0x8090ff); e.sun.position.set(30, 40, 20); sky(c, '#02020a', '#0a0a1a', '#141020'); }
  if (mode === 'dawn') { e.setAtmosphere({ fog: 0x8a8090, density: 0.03, hemi: 0.7, hemiSky: 0xc0a8c0, hemiGround: 0x3a3028, sun: 0.9 }); e.sun.color.set(0xffc0a0); e.sun.position.set(80, 10, 0); sky(c, '#3a4060', '#c08090', '#f0c0a0', 0xffe0c0); }
  if (mode === 'tunnel') { e.setAtmosphere({ fog: 0x050203, density: 0.08, hemi: 0.03, sun: 0 }); }
  grain(c, mode === 'tunnel' || mode === 'night' ? 0.09 : 0.06);
}
function crickets(c) { let t = 0; c.onUpdate(dt => { t -= dt; if (t <= 0) { t = 0.4 + Math.random() * 1.5; const h = c.head(); const a = c.g.audio; if (!a.ctx) return; const at = a.t, o = a.ctx.createOscillator(), g = a.ctx.createGain(); o.frequency.value = 4200 + Math.random() * 600; o.connect(g); g.connect(a._dest(V(h.x + (Math.random() - 0.5) * 30, 0.3, h.z + (Math.random() - 0.5) * 30), 3)); for (let k = 0; k < 3; k++) { g.gain.setValueAtTime(0.0001, at + k * 0.07); g.gain.linearRampToValueAtTime(0.025, at + k * 0.07 + 0.01); g.gain.linearRampToValueAtTime(0.0001, at + k * 0.07 + 0.05); } o.start(at); o.stop(at + 0.3); } }); }
function chopWork(x, z, yaw, tx, tz) {
  let t = 0; return { x, z, yaw, anim: 'slice', tick(dt, h) { t -= dt; if (t <= 0) { t = 1.1 + Math.random() * 1.2; h.g.audio.play(Math.random() < 0.6 ? ['thud1', 'thud3', 'thud5'] : ['wet1', 'wet4', 'meat3', 'meat6'], V(tx, 1, tz), { vol: 0.7, ref: 2.5 }); } } };
}
function actors(c) { c.cast = c.cast || {}; return c.cast; }
function actor(c, id, x, z, yaw, anim = 'idle', y = 0) { const a = new Actor(c.g, id); a.place(x, z, yaw, y); a.play(anim); actors(c)[id] = a; c.onUpdate(dt => a.update(dt)); return a; }
// a scripted walk for an actor
function walk(c, a, pts, speed = 1.1, anim = 'walk') {
  const path = pts.map(([x, z]) => V(x, 0, z)); a.play(anim);
  return c.until(() => {
    const t = path[0]; if (!t) { a.play('idle'); return true; }
    const p = a.pos, dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.1) { path.shift(); return false; }
    const mv = Math.min(d, speed * c.dt); p.x += dx / d * mv; p.z += dz / d * mv; a.face(Math.atan2(-dx, -dz)); return false;
  });
}
// the family's footsteps are quieter than they were; nothing here is meant to be ear-splitting
function brother(c, x, z, opts = {}) {
  const g = c.g; const a = new Actor(g, 'brother');
  const h = new Hunter(g, { actor: a, nav: c.nav, walk: 1.0, run: 2.25, sight: 10, hearing: 10, fov: 100, voice: ['c_grunt3', 'c_troll2'], ...opts });
  h.place(x, z, 0); h.doors = c.doorList; h.hideSpots = c.hides; g.hunters.push(h); c.brother = h;
  // he screams when he spots you
  const sp = g.onSpotted; g.onSpotted = hn => { if (hn === h) { a.play('scream', 0.1, 1, true); g.after(1.4, () => h.state === 'chase' && a.play('run')); } sp && sp(hn); };
  return h;
}
function doll(c, x, z) {
  const g = c.g; const a = new Actor(g, 'doll');
  const h = new Hunter(g, { actor: a, nav: c.nav, harmless: true, walk: 0.9, run: 1.9, sight: 8, hearing: 6, fov: 110, voice: [] });
  h.place(x, z, 0); h.doors = c.doorList; h.hideSpots = []; g.hunters.push(h); c.dollH = h;
  h.voiceT = 1e9;
  let said = 0;
  const base = h.update.bind(h);
  h.update = dt => {
    const prev = h.state; base(dt);
    if (prev !== 'chase' && h.state === 'chase' && c.timeT - said > 8) { said = c.timeT; a.say('d_see'); g.after(2, () => a.say('d_brother')); if (c.brother) { const p = c.head(); c.brother.lastSeen.set(p.x, 0, p.z); c.brother.lastHeard.set(p.x, 0, p.z); c.brother.set('investigate'); c.brother.goTo(p.x, p.z, true); } }
  };
  h.onTag = () => { a.say('d_tag'); if (c.brother) { const p = c.head(); c.brother.lastSeen.set(p.x, 0, p.z); c.brother.alert = 0.6; c.brother.set('chase'); } };
  return h;
}
// Dale follows your footsteps
function follower(c, a) {
  const trail = []; let on = false;
  c.onUpdate(dt => {
    if (!on) return; const h = c.head(), p = a.pos;
    const last = trail[trail.length - 1]; if (!last || Math.hypot(last.x - h.x, last.z - h.z) > 0.5) trail.push(V(h.x, 0, h.z));
    const d = Math.hypot(h.x - p.x, h.z - p.z);
    if (d > 2.6 && trail.length) { const t = trail[0], dx = t.x - p.x, dz = t.z - p.z, l = Math.hypot(dx, dz); if (l < 0.3) trail.shift(); else { const sp = Math.min(l, (d > 6 ? 2.6 : 1.4) * dt); p.x += dx / l * sp; p.z += dz / l * sp; a.face(Math.atan2(-dx, -dz)); } a.play(d > 6 ? 'run' : 'walk'); }
    else a.play('sad_pose');
    if (d > 25) { p.set(h.x - 1, 0, h.z); trail.length = 0; }
    for (const hn of c.g.hunters) if (!hn.harmless && hn.enabled && Math.hypot(hn.pos.x - p.x, hn.pos.z - p.z) < 1.0 && !c.g.dying) { c.g.audio.play('c_scream1', a.head, { vol: 0.9 }); c.g.caught(hn); }
  });
  return { start() { on = true; }, stop() { on = false; } };
}

// ================================================================== 1. JOLLY JOHNNY'S
const lot = {
  title: 'JOLLY JOHNNY\'S', sub: 'Route 9, Texas. October 30th, 1977. Your radiator has just died.',
  atmosphere: {},
  build(c) {
    look(c, 'dusk'); c.flags.exhibits = buildLot(c);
    c.g.flashAllowed = true;
    const wallet = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.09), new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.6 }));
    c.wallet = c.pickup(wallet, 16.8, 0, 81.2, 'wallet', 'Dale\'s wallet', () => c.g.hud.sub('Dale\'s wallet. There\'s blood on the seam. The ride door is open.', 5));
    c.cartStub = c.mesh(new THREE.BoxGeometry(1.2, 0.9, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a1010, roughness: 0.4, metalness: 0.3 }), 16, 0.45, 78.4);
    c.e.colliders.add(15.3, 77.5, 16.7, 79.3);
  },
  stages: [
    { spawn: [-6.5, 112.5, 0], obj: '', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.12); crickets(c);
      const ex = c.flags.exhibits[0]; actor(c, 'victim', ex.x, ex.z, ex.yaw, 'sad_pose', ex.y);
      const dale = actor(c, 'dale', -7.6, 111.6, -0.6);
      const johnny = actor(c, 'johnny', 0.5, 104.5, Math.PI);
      c.sfx('door7', -9, 0.8, 115, { vol: 0.5, rate: 0.6 }); // the radiator ticking as it cools
      await c.sleep(2);
      await dale.say('dl_start');
      walk(c, dale, [[-12, 106], [-24, 94], [-32, 86], [-30, 80.2]], 1.3).then(() => { dale.visible = false; });
      await c.sleep(1.5);
      await walk(c, johnny, [[-2, 109]], 1.0); johnny.faceTo(c.head().x, c.head().z); johnny.play('agree');
      await johnny.say('j_welcome'); johnny.play('idle');
      await johnny.say('j_car');
      c.objective('Wait for Dale. Look around if you want.');
      await c.until(() => c.timeT > 40 || c.near(-30, 81, 6));
      c.objective('Dale\'s been gone too long. Check the restroom round back.');
    } },
    { spawn: [-6.5, 112.5, 0], obj: 'Check the restroom round back of the station.', async run(c) {
      const g = c.g; const johnny = c.cast?.johnny || actor(c, 'johnny', -2, 109, Math.PI);
      if (!c.cast?.victim) { const ex = c.flags.exhibits[0]; actor(c, 'victim', ex.x, ex.z, ex.yaw, 'sad_pose', ex.y); }
      c.restroomDoor.locked = null;
      await c.reach(-30, 80.5, 1.8);
      await c.until(() => c.restroomDoor.isOpen || c.near(-30, 78, 1.2));
      c.g.hud.sub('Empty. Blood on the tile. A smear runs to the back wall, where there is no door.', 5);
      // he is right behind you when you turn around
      await c.sleep(3); const t0 = c.timeT;
      const h = c.head(), f = c.e.headDir(V(0, 0, 0)); johnny.place(h.x - f.x * 2.2, h.z - f.z * 2.2, 0); johnny.faceTo(h.x, h.z); johnny.play('idle');
      c.sfx('step2', h.x - f.x * 2.2, 0.1, h.z - f.z * 2.2, { vol: 0.6 });
      await c.until(() => { const hh = c.head(), d = V(johnny.pos.x - hh.x, 0, johnny.pos.z - hh.z).normalize(), ff = c.e.headDir(V(0, 0, 0)); ff.y = 0; ff.normalize(); return ff.dot(d) > 0.6 || c.timeT - t0 > 12; });
      c.sfx('sting1', johnny.head.x, 1.6, johnny.head.z, { vol: 0.35 });
      await johnny.say('j_dale');
      await johnny.say('j_museum');
      walk(c, johnny, [[-20, 104], [16, 104], [16, 102]], 1.2).then(() => { johnny.visible = false; });
    } },
    { spawn: [16, 106, 0], obj: 'Look for Dale in the Museum of Morbid Marvels.', async run(c) {
      const g = c.g; const johnny = c.cast?.johnny || actor(c, 'johnny', 16, 102, 0); johnny.visible = false;
      if (!c.cast?.victim) { const ex = c.flags.exhibits[0]; actor(c, 'victim', ex.x, ex.z, ex.yaw, 'sad_pose', ex.y); }
      // the hitchhiker in the case turns her head to follow you
      const vic = c.cast.victim; let turned = false;
      c.onUpdate(() => { if (!turned && c.near(20.5, 95, 3.5)) { turned = true; vic.faceTo(c.head().x, c.head().z); c.sfx('creak1', 20.5, 1.5, 95, { vol: 0.4 }); } });
      await c.until(() => c.has('wallet'));
      // Johnny is waiting by the ride, as if he was always there
      johnny.place(17.4, 80.9, 0); johnny.faceTo(c.head().x, c.head().z); johnny.visible = true;
      await c.sleep(1.2);
      await johnny.say('j_ride');
      c.objective('Take a seat on the Dead Man\'s Drive.');
      const it = c.interact(c.cartStub, 'sit down', () => { }, { range: 2.2 });
      await c.used(it);
    } },
  ],
};

// ================================================================== 2. THE DEAD MAN'S DRIVE
const ride = {
  title: 'THE DEAD MAN\'S DRIVE', sub: 'Keep your hands inside the car.',
  atmosphere: {},
  build(c) { look(c, 'tunnel'); buildRide(c); },
  stages: [
    { spawn: [RIDE.x, RIDE.z0 + 2, Math.PI], obj: '', async run(c) {
      const g = c.g, S = RIDE.scenes, X = RIDE.x, cart = c.cart; g.player.enabled = false; g.flashAllowed = false;
      g.audio.ambience('amb1', 0.15);
      const vic = actor(c, 'victim', X + 2.6, S.sparky, -Math.PI / 2, 'sad_pose', 0.35);
      const mama = actor(c, 'mama', X + 2.5, S.bride, -Math.PI / 2, 'idle');
      const veil = c.mesh(new THREE.ConeGeometry(0.32, 1.3, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.9 }), X + 2.5, 1.18, S.bride);
      const bro = new Actor(g, 'brother'); bro.place(X + 2.2, S.legend, -Math.PI / 2); bro.play('slice'); c.onUpdate(dt => bro.update(dt));
      // the cart carries you; your head stays in the seat
      const seat = () => { const h = c.head(); c.e.rig.position.x += cart.position.x - h.x; c.e.rig.position.z += cart.position.z + 0.15 - h.z; };
      c.onUpdate(seat);
      const light = (i, z, col, I) => c.bulb(i, X + 1.8, 2.8, z, col, I, 6);
      let zT = cart.position.z; const go = (z, sp = 0.9) => { zT = z; return c.until(() => Math.abs(cart.position.z - zT) < 0.02); };
      c.onUpdate(dt => { const d = zT - cart.position.z; if (Math.abs(d) > 0.001) { cart.position.z += Math.sign(d) * Math.min(Math.abs(d), 0.9 * dt); if (Math.random() < 0.02) c.sfx('door7', X, 0.2, cart.position.z, { vol: 0.25, rate: 0.5 }); } });
      c.sfx('door1', X, 0.5, cart.position.z, { vol: 0.6, rate: 0.5 });
      // 1. Old Sparky
      light(0, S.sparky, 0x8ab0ff, 0);
      await go(S.sparky - 1.5);
      let buzz = true; c.onUpdate(() => { if (!buzz) return; const p = c.e.points[0]; p.intensity = 2.5 + Math.abs(Math.sin(c.timeT * 0.9)) * 2.5; if (Math.random() < 0.05) c.g.audio.glitch(0.15, V(X + 2.6, 1.2, S.sparky)); });
      await voice(g, 'j_ride1', V(X, 2.8, cart.position.z));
      vic.play('agree', 0.2, 2.2); c.sfx('c_hurt4', X + 2.6, 1.5, S.sparky, { vol: 0.5 });
      await c.sleep(2.5); buzz = false; c.e.points[0].intensity = 0;
      // 2. The Butcher's Bride
      light(1, S.bride, 0xffc890, 3.5);
      await go(S.bride - 1.5);
      await voice(g, 'j_ride2', V(X, 2.8, cart.position.z));
      mama.faceTo(c.head().x, c.head().z); c.sfx('breath1', X + 2.5, 1.6, S.bride, { vol: 0.4 });
      await c.sleep(2.5);
      // 3. The Legend
      light(0, S.legend, 0xff5030, 4);
      await go(S.legend - 1.5);
      let chop = 0; const cu = c.onUpdate(dt => { chop -= dt; if (chop <= 0) { chop = 1.2; c.sfx(['thud1', 'wet2', 'meat3'], X + 2.6, 1, S.legend, { vol: 0.7 }); } });
      await voice(g, 'j_ride3', V(X, 2.8, cart.position.z));
      await c.sleep(1.5); cu.dead = true;
      // 4. "is the legend true?" — the lights die. He is not on his table any more.
      c.e.points[0].intensity = 0; c.e.points[1].intensity = 0;
      await go(S.real - 1.5);
      bro.place(X + 1.25, S.real + 0.3, -Math.PI / 2 - 0.5); bro.play('idle');
      await voice(g, 'j_ride4', V(X, 2.8, cart.position.z));
      light(0, S.real + 0.4, 0xffffff, 6); bro.play('swing', 0.05, 1, true);
      c.sfx('sting2', X + 1.2, 1.6, S.real, { vol: 0.8 }); c.sfx('c_scream2', X + 1.2, 1.8, S.real, { vol: 0.7 });
      await c.sleep(0.8); c.e.points[0].intensity = 0; c.sfx('thud4', X, 0.5, S.real, { vol: 0.9 });
      await c.sleep(1.5);
      // 5. end of the line
      await go(S.end - 1.5);
      await voice(g, 'j_end', V(X, 2.8, cart.position.z));
      c.sfx('door2', X, 0.2, cart.position.z, { vol: 0.9, rate: 0.5 }); c.e.setFade(1, 0);
      await c.sleep(0.6); c.sfx('thud2', undefined, 0, 0, { vol: 0.9 }); c.sfx('scream1', undefined, 0, 0, { vol: 0.3 });
      await c.sleep(3);
    } },
  ],
};

// ================================================================== 3. SUPPER  /  THE GAME
const supper = {
  title: 'SUPPER', sub: 'You wake up at a dinner table. Everyone is smiling.',
  atmosphere: {},
  build(c) {
    look(c, 'night'); buildCompound(c); c.trim = null;
    c.bulb(0, 5, 2.3, -5, 0xffa060, 3, 8); c.bulb(1, 33, 3.2, -12, 0xff6030, 5, 10);
    c.plate = c.mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.3 }), 5, c.diningTop + 0.012, -3.3);
    c.mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1.3, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x5a1008, roughness: 0.2 }), 5, c.diningTop + 0.05, -3.3);
    // the meat locker key, on a hook among the carcasses in the barn
    for (let i = 0; i < 4; i++) place(c, 'carcass', 39.5, -18 + i * 1.6, Math.PI / 2, 1.6, { y: 1.85, col: false });
    c.key = c.pickup(new THREE.Group().add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 12), surf('rusty_metal_02', { size: 0.3, metal: 0.7 }))), 40.6, 1.4, -16.6, 'keys', 'a ring of keys on a meat hook', () => c.g.hud.sub('A ring of keys. One says CELLAR. One is a car key with a smiley face fob.', 5));
    c.doors.front.locked = null; c.doors.basement.locked = 'keys';
    c.cageDoor = c.mesh(new THREE.BoxGeometry(1.2, 2.2, 0.05), surf('rusty_metal_02', { size: 1, metal: 0.6, rough: 0.5 }), -48, 1.1, 4.4);
    c.cageCol = c.e.colliders.add(-48.6, 4.35, -47.4, 4.45);
    c.g.hunters = [];
  },
  stages: [
    { spawn: [5, -2.4, 0], obj: '', async run(c) {
      const g = c.g; g.player.enabled = false; g.flashAllowed = false; g.audio.ambience('amb1', 0.1); crickets(c);
      const rev = actor(c, 'reverend', 5, -7.9, 0); rev.faceTo(5, -2.4);
      const mama = actor(c, 'mama', 3.3, -4.6, 0); mama.faceTo(5, -3);
      const dl = actor(c, 'doll', 6.7, -5.0, 0, 'idle'); dl.faceTo(5, -2.4);
      const gp = actor(c, 'grandpa', 9.6, -6.6, 0, 'idle'); gp.faceTo(5, -4);
      const bro = new Actor(g, 'brother'); bro.place(6.2, -8.9, 0); bro.faceTo(5, -2.4); c.onUpdate(dt => bro.update(dt));
      await c.sleep(2);
      await mama.say('m_wake');
      await gp.say('g_city');
      await rev.say('r_sit');
      await mama.say('m_guests');
      await dl.say('d_keep');
      await rev.say('r_grace');
      await mama.say('m_eat');
      c.g.hud.sub('There is a finger in the meat. It is wearing Dale\'s class ring.', 5);
      await c.sleep(4.5);
      await dl.say('d_shake');
      await gp.say('g_slow');
      await dl.say('d_dale');
      c.sfx('c_scream1', -12, -1, 1.5, { vol: 0.8, ref: 4 }); c.sfx('c_hurt5', -12, -1, 1.5, { vol: 0.6, ref: 4 });
      await c.sleep(2.5);
      await rev.say('r_lord');
      await mama.say('m_game');
      g.audio.play('door2', null, { vol: 0.8, rate: 0.6 }); g.hud.sub('The straps fall away.', 3);
      await rev.say('r_run');
      g.player.enabled = true; g.flashAllowed = true; g.player.flashOn = false;
      // they count. You run.
      c.objective('RUN. Find Dale. (They are counting to fifty.)');
      for (let n = 1; n <= 50; n++) { g.hud.extra = 'THEY ARE COUNTING: ' + n; g.hud.dirty = true; await c.sleep(0.55); }
      g.hud.extra = ''; g.hud.dirty = true;
      c.flags.counted = true;
    } },
    { spawn: [-11, 1.5, -Math.PI / 2], obj: 'Find a key. Grandpa bet on the barn.', async run(c) {
      const g = c.g; g.player.enabled = true; g.flashAllowed = true; g.audio.ambience('amb1', 0.1); crickets(c);
      for (const id of ['reverend', 'mama', 'doll', 'grandpa']) if (c.cast?.[id]) c.cast[id].visible = false;
      const gp = actor(c, 'grandpa', 9.6, 7.6, 0, 'idle'); gp.faceTo(1.2, 9.3);
      const mama = actor(c, 'mama', 13.2, 3, -Math.PI / 2, 'idle');
      brother(c, 37, -9.4); doll(c, 20, 0);
      c.brother.work = chopWork(37, -9.4, Math.PI, 37, -8); c.brother.set('work'); c.dollH.set('patrol');
      // barks from the porch and the living room
      let t = 15; c.onUpdate(dt => { t -= dt; if (t > 0 || g.dying) return; t = 25 + Math.random() * 20; const h = c.head(); if (Math.hypot(h.x - 13, h.z - 3) < 30) mama.say(pick(['m_comeout', 'm_find'])); else if (Math.hypot(h.x - 9, h.z - 7) < 14) gp.say('g_bet'); });
      await c.until(() => c.has('keys'));
      c.objective('The cellar door is in the house, west end of the hall. Dale is down there.');
      await c.until(() => c.head().x < -29);
    } },
    { spawn: [-31.6, 0, Math.PI / 2], obj: 'Find Dale.', async run(c) {
      const g = c.g; g.player.inventory.add('keys'); g.audio.ambience('amb1', 0.1);
      const dale = actor(c, 'dale', -48, 7.6, 0, 'sad_pose');
      if (!c.brother) { brother(c, -36, 0, { sight: 8 }); c.brother.set('idle'); c.brother.enabled = false; g.after(40, () => { if (c.alive && c.brother) { c.brother.enabled = true; c.brother.set('patrol'); c.sfx('door1', -31, 1.5, 0, { vol: 0.9 }); } }); }
      await c.reach(-47, 3.5, 2.6);
      dale.faceTo(c.head().x, c.head().z);
      await dale.say('dl_cage');
      const it = c.interact(c.cageDoor, 'unlock the cage', () => { }, { range: 2.2 });
      await c.used(it); c.removeInteract(it); c.sfx('door3', -48, 1, 4.4); c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false;
      c.flags.daleFree = true;
    } },
    { spawn: [-46, 3, Math.PI], obj: 'Get Dale out. Through the yard, to the gate (east).', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.1);
      const dale = c.cast?.dale || actor(c, 'dale', -47, 2.5, 0, 'sad_pose');
      c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false;
      c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
      if (!c.brother) brother(c, 20, -8);
      if (!c.dollH) doll(c, 30, 8);
      c.brother.set('patrol'); c.dollH.set('patrol');
      const f = follower(c, dale); f.start();
      dale.say('dl_go');
      await c.until(() => c.head().x > 47);
    } },
  ],
};

// ================================================================== 4. THE CORN
const corn = {
  title: 'THE CORN', sub: 'Dawn. The road is on the other side of the field.',
  atmosphere: {},
  build(c) {
    look(c, 'dawn'); buildCompound(c); c.trim = null; buildCorn(c);
    c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
    c.g.hunters = [];
    // the field has no nav graph; he comes straight through the corn
    const N = []; for (let x = 44; x <= 112; x += 6) for (let z = -30; z <= 30; z += 6) N.push([x, z]);
    const E = []; const w = Math.round((112 - 44) / 6) + 1, hh = Math.round(60 / 6) + 1;
    for (let i = 0; i < w; i++) for (let j = 0; j < hh; j++) { const k = i * hh + j; if (j < hh - 1) E.push([k, k + 1]); if (i < w - 1) E.push([k, k + hh]); }
    c.cornNav = new (c.nav.constructor)(N, E);
  },
  stages: [
    { spawn: [49, 0, -Math.PI / 2], obj: 'Through the corn. East, to the road.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.08);
      const dale = actor(c, 'dale', 47.5, 0.8, -Math.PI / 2, 'sad_pose');
      const f = follower(c, dale); f.start();
      const bro = brother(c, 44, 2, { nav: c.cornNav, sight: 9, run: 2.15 }); bro.nav = c.cornNav; bro.set('idle'); bro.t = -6;
      g.after(7, () => { if (!c.alive) return; bro.lastHeard.copy(c.head()).setY(0); bro.set('investigate'); bro.goTo(c.head().x, c.head().z, true); });
      let yell = 10; c.onUpdate(dt => { yell -= dt; if (yell <= 0) { yell = 1e9; voice(g, 'j_corn', V(c.head().x + 25, 1.6, c.head().z + 15)); } });
      g.after(25, () => c.alive && dale.say('dl_run'));
      // the rustle of corn moving near you
      let r = 0; c.onUpdate(dt => { r -= dt; if (r <= 0 && g.player.moveSpeed > 0.4) { r = 0.4; c.sfx('squish3', c.head().x, 1, c.head().z, { vol: 0.12, rate: 2.5 }); } });
      await c.until(() => c.head().x > 110);
    } },
    { spawn: [111, 0, -Math.PI / 2], obj: '', async run(c) {
      const g = c.g; g.player.enabled = false; g.hunters.forEach(h => h.enabled = false);
      const truck = place(c, 'truck', 114, -40, 0, 1.9, { col: false });
      c.bulb(0, 114, 1.2, -38, 0xfff0d0, 12, 25);
      c.sfx('door7', 114, 1, -30, { vol: 0.6, rate: 0.4 });
      await c.until(() => { truck.position.z = Math.min(-2.5, truck.position.z + 7 * c.dt); c.e.points[0].position.set(114, 1.2, truck.position.z + 2.5); return truck.position.z >= -2.5; });
      const johnny = actor(c, 'johnny', 112.4, -1.5, 0); johnny.faceTo(c.head().x, c.head().z);
      c.sfx('door2', 113, 1, -1.5, { vol: 0.7 });
      await c.sleep(1);
      await johnny.say('j_final');
      g.engine.setFade(1, 0); await c.sleep(3);
      c.flags.ending = 'lift';
    } },
  ],
};

export const NIGHTS = [lot, ride, supper, corn];
export const ENDINGS = {
  lift: () => ({ title: 'THE END', text: 'Dale got in the truck first. He was so grateful.\n\nJohnny drove with the radio up, singing along, all the way back down Route 9, past the museum, past the ride, up the long dirt road to a house where the porch light was on and someone had set two more places at the table.\n\nPURE FEAR\n\nVoices: ElevenLabs. Characters: Sketchfab artists (see CREDITS.md).' }),
};
