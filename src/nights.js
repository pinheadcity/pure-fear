// PURE FEAR: THE PROCESSING — six chapters. Dialogue, cutscenes, a choice you live with.
import * as THREE from 'three';
import { buildCompound } from './world.js';
import { Hunter, Watcher, dress, syncExtras } from './hunter.js';
import { character, prop, surf } from './assets.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const pick = a => a[(Math.random() * a.length) | 0];
const S = c => c.g.save.d.story || (c.g.save.d.story = {});
const say = (c, who, text, o = {}) => c.g.dialogue.say(who, text, o);

// ---------------------------------------------------------------- shared pieces
function family(c, { father, mother, grandma } = {}) {
  const g = c.g; g.hunters = g.hunters || []; g.watchers = g.watchers || [];
  if (father && !c.father) {
    const h = new Hunter(g, { nav: c.nav, ...(father.opts || {}) });
    h.place(father.x, father.z, father.yaw || 0); h.doors = c.doorList; h.hideSpots = c.hides;
    if (father.work) h.work = father.work; h.set(father.state || 'idle');
    g.hunters.push(h); c.father = h; fatherBarks(c, h);
  }
  if (mother && !c.mother) {
    const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: mother.ts ?? 0.3, sight: mother.sight ?? 7, hearing: mother.hearing ?? 5 });
    m.baseTs = mother.ts ?? 0.3; m.place(mother.x, mother.z, mother.yaw || 0); g.watchers.push(m); c.mother = m;
    m.onNotice = () => g.dialogue.say('MOTHER', pick(['THERE you are!', 'He\'s HERE! Baby\'s in the HALL!', 'Found you! Found you found you found you!']), { pos: m.root.position.clone().setY(1.6) });
  }
  if (grandma && !c.grandma) {
    const w = new Watcher(g, { anim: 'sad_pose', sight: 0, hearing: grandma.hearing ?? 7, blind: true, scale: 0.92 });
    w.place(grandma.x, grandma.z, grandma.yaw || 0); g.watchers.push(w); c.grandma = w;
    w.onNotice = () => g.dialogue.say('GRANDMA', pick(['I hear you, baby. I hear your little heart.', 'He\'s up! He\'s up and walking!', 'Breathing like that. Like a rabbit.']), { pos: w.root.position.clone().setY(1.5) });
  }
}
// things he says while he hunts you. Some of them are about you.
function fatherBarks(c, h) {
  let last = h.state, t = 0;
  c.onUpdate(dt => {
    t -= dt; if (!h.enabled || c.g.dying) { last = h.state; return; }
    const mem = c.g.save.d.hideMemory || {}, fav = Object.entries(mem).sort((a, b) => b[1] - a[1])[0];
    if (h.state !== last) {
      if (h.state === 'chase') c.g.dialogue.bark('FATHER', ['COME HERE.', 'Don\'t you run from me.', 'There you are.', 'Every time. Every single time.'], h.head.clone());
      else if (h.state === 'searchSpot') c.g.dialogue.bark('FATHER', fav && fav[1] > 1 ? ['I know your cupboards.', `You always pick the ${fav[0]}. All of you pick the ${fav[0]}.`] : ['Not in there.', 'Come out and I\'ll make it quick.'], h.head.clone());
      else if (h.state === 'investigate') c.g.dialogue.bark('FATHER', ['I heard that.', 'Was that you, boy?', 'Mm.'], h.head.clone());
      last = h.state; t = 8;
    } else if (t <= 0 && (h.state === 'patrol' || h.state === 'work')) {
      t = 22 + Math.random() * 25;
      if (Math.hypot(h.pos.x - c.head().x, h.pos.z - c.head().z) < 16) c.g.dialogue.bark('FATHER', ['Supper\'s getting cold.', 'You only make it worse.', 'Your mother set your place.', 'Four thousand and ninety-six. Same as the others.', 'I can hear you thinking.'], h.head.clone());
    }
  });
}
function chopWork(x, z, yaw, tx, tz) {
  let t = 0; return { x, z, yaw, anim: 'idle', tick(dt, h) { t -= dt; if (t <= 0) { t = 0.9 + Math.random() * 1.4; h.g.audio.play(Math.random() < 0.6 ? ['thud1', 'thud3', 'thud5', 'thud7'] : ['wet1', 'wet2', 'wet4', 'meat3', 'meat6', 'squish3'], V(tx, 1, tz), { vol: 1.1, ref: 2.5 }); } } };
}
function bulbs(c, a, b) { if (a) c.bulb(0, ...a); if (b) c.bulb(1, ...b); }
function sickLight(c, i) { const p = c.e.points[i]; let t = Math.random() * 10; c.onUpdate(dt => { t += dt; p.intensity = p.userData.base * (0.55 + 0.45 * Math.abs(Math.sin(t * 0.37) * Math.sin(t * 0.11 + 1))); }); }
async function struggle(c, need = 1, { noisy = true, hint = true, quiet = false } = {}) {
  const g = c.g, inp = g.input; let prog = 0, last = 0; const lp = V(0, 0, 0), rp = V(0, 0, 0), plp = V(0, 0, 0), prp = V(0, 0, 0); let init = false;
  if (hint) g.hud.sub(quiet ? (g.engine.xr ? 'Pull against the straps. Slowly. Hard yanks are loud.' : 'Pull with E / click. Slowly. Fast pulling is loud.') : g.engine.xr ? 'Your wrists are strapped down. Yank your hands, hard.' : 'Your wrists are strapped down. Hammer E / click to pull.', 6);
  await c.until(() => {
    let effort = 0;
    if (g.engine.xr) { inp.handPos('left', lp); inp.handPos('right', rp); if (init) effort = (lp.distanceTo(plp) + rp.distanceTo(prp)) * 6; plp.copy(lp); prp.copy(rp); init = true; }
    else if (inp.pressed('use') || inp.pressed('useL')) { effort = c.timeT - (c._lastPull || 0) < 0.3 ? 1.5 : 0.9; c._lastPull = c.timeT; }
    if (effort > 0.25) { prog += Math.min(effort, 1.2) * 0.035; g.player.noise = Math.max(g.player.noise, quiet ? Math.min(1, effort * 0.6) : noisy ? Math.min(1, effort) : 0.2); if (c.timeT - last > 0.35) { last = c.timeT; g.audio.play(['door7', 'door3'], g.engine.headPos(V(0, 0, 0)).setY(0.8), { vol: 0.5, rate: 0.7 + Math.random() * 0.3 }); } }
    return prog >= need;
  });
  g.audio.play('door2', null, { vol: 0.8, rate: 0.6 });
}
// make you look at something. Looking away is noticed.
async function watch(c, target, seconds, { who = 'FATHER', lines = ['Look at me.', 'Eyes up.', 'Watch.'], strikes = 99, onStrike } = {}) {
  let away = 0, n = 0; const t0 = c.timeT;
  await c.until(() => {
    const hp = c.head(), f = c.e.headDir(V(0, 0, 0)), tp = target(), to = V(tp.x - hp.x, tp.y - hp.y, tp.z - hp.z).normalize();
    if (f.dot(to) < 0.8) { away += c.dt; if (away > 1.6) { away = 0; n++; c.sfx('thud1', hp.x, 0.9, hp.z - 1, { vol: 1.2 }); say(c, who, lines[Math.min(lines.length - 1, n - 1)], { pos: tp }); onStrike && onStrike(n); } }
    else away = Math.max(0, away - c.dt);
    return n >= strikes || c.timeT - t0 > seconds;
  });
  return n;
}
function lastDeath(c) {
  const d = c.g.save.d.lastDeath?.[c.g.nightIndex]; if (!d) return;
  for (let i = 0; i < d.trail.length; i += 2) { const [x, z, r] = d.trail[i]; c.decal('print', x, 0, z, 0.32, { rot: r }); }
  c.body(d.x, d.z, { hang: false, tag: String(4095 + c.g.save.d.restores) }); c.decal('pool', d.x, 0, d.z, 2);
}
// photographs of the copies that came before. The newest frame is waiting for you.
function photos(c, n) {
  const base = 4096 - n;
  for (let i = 0; i < n; i++) c.photo(-5.2 + i * 0.55, 1.55 + (i % 2) * 0.4, 0.13, 0, { n: 4, tag: (base + i).toLocaleString() });
  const empty = c.photo(-5.2 + n * 0.55 + 0.1, 1.75, 0.13, 0, { n: 3, tag: '4,096' });
  return empty;
}
// the captive / escort
class Twelve {
  constructor(c, x, z, yaw) {
    this.c = c; this.g = c.g; this.ch = dress(character('Xbot'), { mask: true, scale: 0.92 }); this.root = this.ch.root; c.add(this.root);
    this.root.position.set(x, 0, z); this.yaw = yaw; this.root.rotation.y = yaw + Math.PI;
    this.acts = this.ch.actions; this.play('sad_pose'); this.follow = false; this.trail = []; this.coughT = 8; this.alive = true; this.talkT = 25;
  }
  play(n, ts = 1) { const a = this.acts[n]; if (!a || this.cur === a) return; a.timeScale = ts; a.reset().fadeIn(0.4).play(); if (this.cur) this.cur.fadeOut(0.4); this.cur = a; }
  get head() { return V(this.root.position.x, 1.55, this.root.position.z); }
  face(y, k) { let d = y - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, k); this.root.rotation.y = this.yaw + Math.PI; }
  update(dt) {
    this.ch.mixer.update(dt); syncExtras(this.ch, this.g.engine.world);
    const pos = this.root.position;
    if (!this.follow || !this.alive) return;
    const h = this.g.engine.headPos(V(0, 0, 0)), last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - h.x, last.z - h.z) > 0.5) this.trail.push(V(h.x, 0, h.z));
    const d = Math.hypot(h.x - pos.x, h.z - pos.z);
    if (d > 3 && this.trail.length) {
      const t = this.trail[0], dx = t.x - pos.x, dz = t.z - pos.z, l = Math.hypot(dx, dz);
      if (l < 0.3) this.trail.shift(); else { const sp = Math.min(l, (d > 7 ? 2.2 : 1.25) * dt * (S(this.c).cut === 'did' ? 0.8 : 1)); pos.x += dx / l * sp; pos.z += dz / l * sp; this.face(Math.atan2(-dx, -dz), dt * 5); }
      this.play(d > 7 ? 'run' : 'walk', 0.9);
    } else this.play('sad_pose');
    if (d > 25) { pos.set(h.x - 1, 0, h.z); this.trail.length = 0; }
    this.coughT -= dt;
    if (this.coughT <= 0) {
      this.coughT = 14 + Math.random() * 16; this.g.audio.play(['c_cough1', 'c_cough2', 'c_cough3'], this.head, { vol: 1, ref: 2 });
      if (Math.random() < 0.4) this.g.dialogue.say('TWELVE', pick(['I\'m sorry. I\'m sorry, I can\'t stop—', 'Don\'t leave me. Please. Not again.']), { pos: this.head, whisper: true });
      for (const hn of this.g.hunters) if (Math.hypot(hn.pos.x - pos.x, hn.pos.z - pos.z) < 11 && hn.state !== 'chase') { hn.lastHeard.set(pos.x, 0, pos.z); hn.set('investigate'); hn.goTo(pos.x, pos.z); }
    }
    this.talkT -= dt;
    if (this.talkT <= 0 && this.g.hud.subT <= 0) { this.talkT = 35 + Math.random() * 30; this.g.dialogue.say('TWELVE', pick(['Don\'t look at the photos. They put us in the photos.', 'Is it dark out? I forget what dark looks like from outside.', 'She sings to them. When they\'re wrapped. She sings.', 'You walk like I used to.']), { pos: this.head, whisper: true }); }
    for (const hn of this.g.hunters) if (hn.state !== 'grab' && hn.enabled && Math.hypot(hn.pos.x - pos.x, hn.pos.z - pos.z) < 0.9) this.taken(hn);
  }
  taken(hn) {
    if (!this.alive) return; this.alive = false; this.follow = false;
    this.g.audio.play('c_scream1', this.head, { vol: 1.4, ref: 3 });
    this.g.audio.play('rip1', this.head, { vol: 1.1, offset: 3, dur: 4 });
    this.g.dialogue.say('FATHER', 'Back downstairs, sweetheart. You know better.', { pos: hn.head.clone() });
    this.g.after(3.5, () => this.g.caught(hn));
  }
}

// ================================================================ 1. HOME
const home = {
  title: 'HOME', sub: '',
  atmosphere: { fog: 0x040302, density: 0.11, hemi: 0.05 },
  build(c) {
    buildCompound(c); bulbs(c, [-7, 2.5, -5, 0xffa860, 5, 8], [5, 2.5, -5, 0xff9a50, 4, 9]); sickLight(c, 0);
    c.key = c.pickup(new THREE.Group().add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), surf('rusty_metal_02', { size: 0.3, metal: 0.7, rough: 0.4 }))), 5.3, 0.9, -5.6, 'chainkey', 'a key on a bloody string');
    c.decal('pool', 5.3, 0.885, -5.6, 0.5);
    c.note(-11.2, 0.92, -4.4, 0.4, 'SCRATCHED INTO THE METAL', 'If he breathes on you, don\'t move.\nHe checks the cupboard you used last time. He always knows which one.\nShe dances. She only sees what\'s in front of her.\nDon\'t eat breakfast.\n\n- 4,095');
    c.note(9, 0.01, 8.5, 2, 'ON THE BACK OF A RECEIPT', 'They tag us by number. I am 4,091.\nThere is a girl in the basement. Twelve. She was one of us.\nThey are kind to you in the morning. That is the worst part.');
    for (let i = 0; i < 3; i++) c.decal('hand', -2.1, 1 + i * 0.2, -5.8 - i * 0.3, 0.4, { wall: -Math.PI / 2 });
    photos(c, 3); lastDeath(c);
  },
  stages: [
    { spawn: [-7, -6.2, Math.PI], obj: '', async run(c) {
      const g = c.g; g.player.enabled = false; g.flashAllowed = false; g.audio.ambience('amb1', 0.3);
      // ---- cutscene: waking ----
      await c.sleep(2.5);
      await say(c, 'MOTHER', 'Shhh. Shhh. There you are.', { pos: c.head().add(V(0.4, 0, 0.3)), whisper: true });
      family(c, { mother: { x: -5.6, z: -5.2, yaw: Math.PI / 2 + 0.6, ts: 0.0001, sight: 0, hearing: 0 } });
      await say(c, 'MOTHER', 'You were gone such a long time, sweetheart. Look at you. You came back the same as always.', { pos: V(-5.6, 1.6, -5.2) });
      family(c, { father: { x: -7, z: 1.6, opts: { sight: 0.01 } } }); const h = c.father; h.enabled = false;
      c.doors.kitchen.open();
      await c.walk(h, [[-7, -1], [-7, -5.3]], 0.8); c.lookAt(h, -7, -6.2);
      await say(c, 'FATHER', 'Four thousand and ninety-six.', { pos: h.head.clone() });
      await say(c, 'MOTHER', 'Don\'t say the number in front of him. He doesn\'t like the number.', { pos: V(-5.6, 1.6, -5.2) });
      await say(c, 'MOTHER', 'We have rules in this house, baby. We don\'t run. We don\'t hide. And we never, ever go in the basement.', { pos: V(-5.6, 1.6, -5.2) });
      c.sfx('c_snore', -3, 1, 8, { vol: 0.7 });
      await say(c, 'GRANDMA', 'He\'s breathing fast. They always breathe fast the first night.', { pos: V(-6, 1.4, 6) });
      // he leans in. don't move.
      const br = c.sfx('c_breath', -7, 1.75, -5.6, { loop: true, vol: 0.9, ref: 0.5 });
      await say(c, 'FATHER', 'Hold still.', { pos: h.head.clone() });
      let moved = 0; const t0 = c.timeT;
      await c.until(() => { if (g.player.headVel.length() > 0.6 || g.input.pressed('use')) { moved++; } return c.timeT - t0 > 7; });
      br && br.stop(1);
      if (moved > 2) { c.sfx('thud4', -7, 1.2, -6); g.engine.setFade(0.75, 0x300000); g.after(0.4, () => g.engine.setFade(0)); await say(c, 'FATHER', 'I said hold still.', { pos: h.head.clone() }); S(c).flinched = true; }
      await say(c, 'MOTHER', 'Your father\'s going to finish getting supper ready. You sit here and think about how lucky you are.', { pos: V(-5.6, 1.6, -5.2) });
      c.sfx('thud2', -4.2, 0.8, -8.5, { vol: 1.2 });
      await c.walk(h, [[-7, -1], [-7, 1.5], [5, 1.5], [5, -2.6]], 1.0);
      h.enabled = true; h.sight = 12; h.work = chopWork(5, -2.8, Math.PI, 5, -4.5); h.set('work');
      // she dances away into the dining room
      await c.walk(c.mother, [[-5.6, -5], [-1, -5], [7.5, -7.5]], 0.6);
      c.mother.act.timeScale = 0.3; c.mother.sight = 6.5; c.mother.hearing = 4;
      await c.sleep(2);
      await struggle(c, 1);
      g.player.enabled = true; g.flashAllowed = true; g.player.flashOn = false;
      g.hud.sub('Your flashlight is still in your pocket. They never search you. They want you to try.', 5);
    } },
    { spawn: [-7, -5.2, Math.PI], obj: 'Get out of the house. The front door is chained.', async run(c) {
      const g = c.g;
      family(c, { father: { x: 5, z: -2.8, work: chopWork(5, -2.8, Math.PI, 5, -4.5), state: 'work' }, mother: { x: 7.5, z: -7.5, yaw: 0.6, sight: 6.5, hearing: 4 } });
      g.audio.ambience('amb1', 0.3);
      c.onUpdate(dt => { const m = c.mother; m.yaw += dt * 0.12; m.root.rotation.y = m.yaw + Math.PI; });
      let sing = 20; c.onUpdate(dt => { sing -= dt; if (sing <= 0 && c.near(5, -5, 12)) { sing = 30 + Math.random() * 20; say(c, 'MOTHER', pick(['Come dance with me, baby. You used to love this song.', 'Supper soon. Supper soon. Everyone at the table.', 'Four thousand and ninety-six little toes...']), { pos: c.mother.root.position.clone().setY(1.6), whisper: true }); } });
      c.doors.front.locked = 'chainkey';
      await c.until(() => c.doors.front.isOpen);
      await c.reach(14.5, 1.5, 1.5);
    } },
    { spawn: [14.5, 1.5, -Math.PI / 2], obj: '', async run(c) {
      c.g.player.enabled = false;
      c.say('The yard is mud, and the mud is not all mud. The barn light is on.', 5);
      await c.sleep(4);
      await say(c, 'MOTHER', 'Baby? ...Baby, the door\'s open. Baby\'s let the cold in.', { pos: V(10, 1.6, 1.5) });
      c.sfx(['step2', 'step4'], 13, 0.2, 1.5, { vol: 1.2 }); c.g.engine.setFade(1, 0);
      await say(c, 'FATHER', 'Got you.', { pos: c.head().add(V(0, 0, 0.4)) });
      c.sfx('thud4', undefined, 0, 0, { vol: 1.3 });
      await c.sleep(2);
    } },
  ],
};

// ================================================================ 2. MORNING
const morning = {
  title: 'MORNING', sub: '',
  atmosphere: { fog: 0xcfc8b8, density: 0.02, hemi: 1.15, hemiSky: 0xf6ecd8, hemiGround: 0x6a5a44, sun: 1.6 },
  build(c) {
    buildCompound(c);
    c.windowPane(11.88, 1.6, -6, -Math.PI / 2, 1.4, 1.1);
    c.daylight(true); c.flags.day = true;
    // breakfast. it looks like breakfast.
    c.plate = c.mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.3 }), 5, 0.89, -3.3);
    c.eggs = c.mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(1.4, 0.35, 1), new THREE.MeshStandardMaterial({ color: 0xffe9a0, roughness: 0.4 }), 5, 0.91, -3.3);
    c.meat = c.mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1.3, 0.5, 1), new THREE.MeshStandardMaterial({ color: 0x5a1008, roughness: 0.25 }), 5, 0.93, -3.3); c.meat.visible = false;
    c.empty = photos(c, 3);
    c.daylight(true);
  },
  stages: [
    { spawn: [5, -2.4, 0], obj: '', async run(c) {
      const g = c.g, st = S(c); g.player.enabled = false; g.flashAllowed = false; g.audio.ambience(null); g.audio.birds(true); c.g.hunters = []; c.g.watchers = [];
      family(c, { father: { x: 5, z: -7.9, opts: {} }, mother: { x: 3.4, z: -3.0, yaw: -1.2, ts: 0.0001, sight: 0, hearing: 0 }, grandma: { x: 6.6, z: -5.2, yaw: Math.PI / 2, hearing: 0 } });
      const h = c.father; h.enabled = false; c.lookAt(h, 5, -2.4);
      const M = () => V(3.4, 1.6, -3.0);
      await c.sleep(2);
      await say(c, 'MOTHER', 'Good morning, sleepyhead! You slept right through.', { pos: M() });
      await say(c, 'MOTHER', 'You got all the way to the yard last night. The yard! Your father had to carry you in. You don\'t remember. You never remember.', { pos: M() });
      // the plate changes when you are not looking at it
      c.whenUnseen(V(5, 0.9, -3.3), () => { c.eggs.visible = false; c.meat.visible = true; c.sfx('squish5', 5, 0.95, -3.3, { vol: 0.5 }); c.whenUnseen(V(5, 0.9, -3.3), () => { c.eggs.visible = true; c.meat.visible = false; }, 3); }, 1);
      await say(c, 'GRANDMA', 'The last one wouldn\'t eat. Do you remember what happened to the last one?', { pos: V(6.6, 1.4, -5.2) });
      await say(c, 'MOTHER', 'Mama. Not at the table.', { pos: M() });
      await c.sleep(1);
      await say(c, 'MOTHER', 'Look, sweetheart. I put up the new pictures. The hall. There\'s a frame for you, too. It\'s empty, for now.', { pos: M() });
      // grace. out loud.
      await say(c, 'MOTHER', 'Now. Grace. Out loud, so God can hear you. Say: thank you for my family.', { pos: M() });
      let spoke = false;
      if (g.audio.micOn) {
        g.hud.sub('(Say it. Out loud.)', 5, '#ffffff');
        const peak = { v: 0 }; const pu = c.onUpdate(() => { peak.v = Math.max(peak.v, g.audio.micLevel); });
        await g.dialogue.record('grace', 5); pu.dead = true; spoke = peak.v > 0.12;
      } else {
        const i = await c.choice('GRACE', 'Everyone is waiting. Your mother is holding your hand very tightly.', ['"Thank you for my family."', 'Say nothing.']);
        spoke = i === 0;
      }
      st.grace = spoke ? 'said' : 'silent'; g.save.write();
      if (spoke) { await say(c, 'MOTHER', 'Oh. Oh, that was beautiful. The last one said it just like that. Exactly like that.', { pos: M() }); }
      else { await say(c, 'MOTHER', '...That\'s alright. The quiet ones are my favourite. The quiet ones last longest.', { pos: M() }); c.sfx('thud3', 5, 0.9, -7, { vol: 1 }); }
      await say(c, 'MOTHER', 'Eat up. You need your strength. You\'re helping today.', { pos: M() });
      await c.sleep(4);
      await say(c, 'FATHER', 'Barn. Now.', { pos: h.head.clone() });
    } },
    { spawn: [5, -1.2, 0], obj: 'Follow him to the barn.', async run(c) {
      const g = c.g; g.player.enabled = true; g.audio.birds(true);
      if (!c.father) family(c, { father: { x: 5, z: -2.5, opts: {} } });
      const h = c.father; h.enabled = false; c.doors.front.locked = null; c.doors.front.open(true);
      // he walks; you follow. If you fall behind he waits and turns around and looks at you.
      const route = [[5, -1], [5, 1.5], [10, 1.5], [14, 1.5], [20, 0], [28, 0], [33, -2.5], [33, -7], [36.5, -9.6]];
      let i = 0;
      await c.until(() => {
        const t = route[i]; if (!t) return true;
        const d = Math.hypot(h.pos.x - c.head().x, h.pos.z - c.head().z);
        if (d > 5) { h.play('idle'); c.lookAt(h, c.head().x, c.head().z); if (!c.flags.toldOff || c.timeT - c.flags.toldOff > 9) { c.flags.toldOff = c.timeT; say(c, 'FATHER', pick(['Keep up.', 'Don\'t make me come back for you.', 'In daylight. In front of the neighbours.']), { pos: h.head.clone() }); } return false; }
        h.path = [V(t[0], 0, t[1])]; if (h.step(c.dt, 1.1)) i++; h.play('walk'); return false;
      });
      c.lookAt(h, 37, -8); h.play('idle');
      const fl = g.audio.flies(V(37, 1, -8), 0.18); c.onUpdate(() => { }); c.flags.flies = fl;
      await c.reach(36, -7, 2.5);
      g.player.enabled = false;
      await say(c, 'FATHER', 'Stand there. Watch how it\'s done.', { pos: h.head.clone() });
      h.work = chopWork(36.6, -9.4, Math.PI, 37, -8); h.enabled = false;
      let ch = 0; const chop = c.onUpdate(dt => { ch -= dt; if (ch <= 0) { ch = 1.1 + Math.random(); c.sfx(['thud1', 'thud3', 'wet2', 'meat5', 'squish2'], 37, 1, -8, { vol: 1.1 }); } });
      const n = await watch(c, () => V(37, 1, -8), 20, { lines: ['Watch.', 'I said watch.', 'You\'ll be doing this tonight. Watch.'] });
      chop.dead = true;
      await say(c, 'FATHER', 'Tonight you\'ll do it yourself.', { pos: h.head.clone() });
      // through the boards, from somewhere below
      await say(c, 'TWELVE', 'Psst. ...Are you the new one?', { pos: V(30, -1, -12), whisper: true });
      await say(c, 'TWELVE', 'Don\'t let him put anything in your hand. Whatever happens. Don\'t take it.', { pos: V(30, -1, -12), whisper: true });
      fl && fl.stop(); g.audio.birds(false);
      g.engine.setFade(1, 0); await c.sleep(2);
    } },
  ],
};

// ================================================================ 3. THE KILL FLOOR
const killFloor = {
  title: 'THE KILL FLOOR', sub: 'The gate is chained. The bolt cutters are in the barn. So is he.',
  atmosphere: { fog: 0x020204, density: 0.07, hemi: 0.05, hemiSky: 0x404860 },
  build(c) {
    buildCompound(c); bulbs(c, [33, 3.2, -12, 0xff8040, 7, 12], [28, 2.3, 14, 0xff6020, 3, 6]); sickLight(c, 0);
    c.doors.front.locked = null;
    c.monitor = c.mesh(new THREE.BoxGeometry(0.12, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.4 }), 26, 1.2, 17.6);
    c.newest = c.body(39.5, -13, { tag: '4096' }); c.decal('pool', 39.5, 0, -13, 1.6);
    c.locker = c.mesh(new THREE.BoxGeometry(0.1, 1.6, 1.8), surf('rusty_metal_02', { size: 1.5, metal: 0.5, rough: 0.6 }), 41.06, 0.95, -14);
    c.cutters = prop('bolt_cutters_01'); c.cutters.position.set(41.3, 0.9, -14); c.add(c.cutters); c.cutters.visible = false;
    lastDeath(c);
  },
  stages: [
    { spawn: [28, 12.5, Math.PI], obj: 'Get into the barn.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.3);
      family(c, { father: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      // a baby monitor on the smokehouse shelf. It picks up the basement.
      await c.sleep(3); c.sfx('c_weird1', 26, 1.2, 17.6, { vol: 0.5, rate: 2 });
      const mp = V(26, 1.2, 17.6);
      await say(c, 'TWELVE', '(through the baby monitor) Hello? Hello, is someone there? ...You\'re the new one. I can hear you breathing.', { pos: mp });
      await say(c, 'TWELVE', 'The key to his locker is on the newest one. You know which one is the newest. I\'m so sorry.', { pos: mp });
      c.onUpdate(() => { if (Math.random() < 0.002) c.sfx(['c_barking1', 'c_barking2', 'c_howl'], 60, 1, (Math.random() - 0.5) * 60, { vol: 0.8, ref: 8 }); });
      await c.reach(33, -6, 2);
    } },
    { spawn: [33, -2.5, 0], obj: 'The locker key is on the newest body.', async run(c) {
      const g = c.g;
      family(c, { father: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      const it = c.interact(c.newest, 'reach inside (hold)', () => { });
      let hold = 0, sq = 0, spoke = false;
      await c.until(() => {
        if (g.hudPrompt === it && g.input.state.use) { hold += c.dt; sq -= c.dt; g.player.noise = Math.max(g.player.noise, 0.4); if (sq <= 0) { sq = 0.45; c.sfx(['squish1', 'squish2', 'squish4', 'wet3', 'wet5', 'meat2'], 39.5, 1.2, -13, { vol: 1 }); } if (hold > 1.8 && !spoke) { spoke = true; c.sfx('c_hurt3', 39.5, 1.4, -13, { vol: 0.8, rate: 0.75 }); g.hud.sub('It moved. It is still warm. Its tag has your number on it.', 4); } }
        else hold = Math.max(0, hold - c.dt * 0.5);
        return hold >= 3.5;
      });
      c.removeInteract(it); g.player.inventory.add('lockerkey'); g.hud.msg('A SMALL KEY', 3);
    } },
    { spawn: [36, -13, Math.PI / 2], obj: 'Open the grey locker. Take the bolt cutters.', async run(c) {
      const g = c.g; g.player.inventory.add('lockerkey');
      family(c, { father: { x: 30, z: -16, opts: { sight: 12, hearing: 14 } } });
      const it = c.interact(c.locker, 'open locker', () => { });
      await c.used(it); c.removeInteract(it); c.sfx('door3', 41, 1, -14); c.locker.rotation.y = 1.2; c.locker.position.x = 40.4; c.locker.position.z = -13.4;
      c.cutters.visible = true; await c.used(c.interact(c.cutters, 'take bolt cutters', () => { c.cutters.visible = false; g.player.inventory.add('cutters'); g.hud.msg('BOLT CUTTERS', 2); }));
    } },
    { spawn: [33, -2, Math.PI / 2], obj: 'Cut the chain on the gate (east).', async run(c) {
      const g = c.g; g.player.inventory.add('cutters');
      family(c, { father: { x: 37, z: -9.5, work: chopWork(37, -9.4, Math.PI, 37, -8), state: 'work', opts: { sight: 12, hearing: 14 } } });
      const it = c.interact(c.gate.chain, 'cut the chain (hold)', () => { }, { range: 2.6 });
      let hold = 0, sq = 0;
      await c.until(() => {
        if (g.hudPrompt === it && g.input.state.use) { hold += c.dt; sq -= c.dt; g.player.noise = 1; if (sq <= 0) { sq = 0.6; c.sfx(['thud6', 'thud8', 'door7'], 45.8, 1.1, 0, { vol: 1.2, rate: 1.4 }); } } else hold = Math.max(0, hold - c.dt / 2);
        return hold > 4;
      });
      c.removeInteract(it); c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
      c.sfx('door1', 46, 1, 0, { vol: 1.3, rate: 0.7 });
      await c.reach(48, 0, 2);
      c.bulb(1, 55, 1, 0, 0xfff4e0, 60, 30); c.sfx('sting2', 52, 1, 0, { vol: 1.2 });
      const m = new Watcher(g, { model: 'Michelle', anim: 'SambaDance', ts: 0.0001, sight: 0, hearing: 0 }); m.place(50.5, 0.4, -Math.PI / 2); g.watchers.push(m);
      c.e.colliders.add(46.2, -24, 60, -1.3); c.e.colliders.add(46.2, 1.3, 60, 24); c.floor(46, -3, 60, 3, c.mats.mud);
      g.player.enabled = false;
      await say(c, 'MOTHER', 'Where would you even go, baby?', { pos: V(50.5, 1.6, 0.4) });
      await say(c, 'MOTHER', 'Out there? Nobody out there remembers you. Nobody out there has a picture of you. We\'re the only ones who remember you.', { pos: V(50.5, 1.6, 0.4) });
      await say(c, 'MOTHER', 'Come home. Supper\'s on.', { pos: V(50.5, 1.6, 0.4) });
      g.engine.setFade(1, 0x000000); await c.sleep(2.5);
    } },
  ],
};

// ================================================================ 4. SUPPER (the choice)
const supper = {
  title: 'SUPPER', sub: '',
  atmosphere: { fog: 0x050302, density: 0.1, hemi: 0.05 },
  build(c) {
    buildCompound(c); bulbs(c, [5, 2.2, -5, 0xffb070, 5, 7], [-7, 2.5, -5, 0xff9050, 2.5, 7]); sickLight(c, 0);
    c.cleaver = c.add(prop('wooden_axe', 0.7)); c.cleaver.position.set(5.35, 0.9, -3.4); c.cleaver.rotation.set(0, 0.4, Math.PI / 2);
    c.handPad = c.mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 }), 4.65, 0.88, -3.25);
    c.twelveHand = c.mesh(new THREE.BoxGeometry(0.12, 0.03, 0.2), new THREE.MeshStandardMaterial({ color: 0xc0aa98, roughness: 0.6 }), 5, 0.9, -6.3);
    c.bkey = c.pickup(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), surf('rusty_metal_02', { size: 0.3, metal: 0.7 })), -10, 0.55, 8.4, 'basementkey', 'a padlock key in her lap');
    c.note(-3, 0.51, 8, 0.3, 'IN A CHILD\'S HANDWRITING', 'GRANMA CANT SEE\nGRANMA HEARS EVRYTHING\nGRANMA LIKES IT WHEN YOU CRY BECAUSE THEN SHE KNOWS WHERE YOU ARE');
    photos(c, 4); lastDeath(c);
  },
  stages: [
    { spawn: [5, -2.4, 0], obj: '', async run(c) {
      const g = c.g, st = S(c); g.player.enabled = false; g.flashAllowed = false; g.audio.ambience('amb1', 0.22);
      family(c, { father: { x: 6.5, z: -4.5, opts: {} }, mother: { x: 3.6, z: -1.8, yaw: -2.4, ts: 0.0001, sight: 0, hearing: 0 }, grandma: { x: 8.5, z: -2, yaw: -Math.PI / 2, hearing: 0 } });
      const h = c.father; h.enabled = false; c.lookAt(h, 5, -3);
      const tw = c.twelve = new Twelve(c, 5, -7.3, 0); c.onUpdate(dt => tw.update(dt));
      const M = () => V(3.6, 1.6, -1.8);
      await c.sleep(2);
      await say(c, 'MOTHER', 'We have a guest tonight. Say hello to your sister.', { pos: M() });
      c.sfx('c_hurt4', 5, 1.4, -7.3, { vol: 0.8 });
      await say(c, 'TWELVE', 'Please. Please, not again. Not this one too.', { pos: tw.head, whisper: true });
      await say(c, 'FATHER', 'Every one of you does this. Every one. It\'s how you become family.', { pos: h.head.clone() });
      await say(c, 'MOTHER', 'Just a little one, sweetheart. Just one finger. So she remembers who she belongs to.', { pos: M() });
      c.sfx('door7', 5, 0.8, -3, { vol: 0.7 }); g.hud.sub('Your right wrist is unstrapped. The cleaver is next to your plate.', 5);
      await say(c, 'FATHER', 'Pick it up.', { pos: h.head.clone() });
      // the choice. no menu. your hands.
      let outcome = null; const t0 = c.timeT;
      const itC = c.interact(c.cleaver, 'take the cleaver', () => { if (!c.flags.holding) { c.flags.holding = true; c.cleaver.visible = false; c.removeInteract(itC); g.hud.sub('It is heavier than it looks. Her hand is on the table. She is shaking.', 4); } }, { range: 1.6 });
      const itMe = c.interact(c.handPad, 'put your own hand on the board instead', () => { outcome = 'sacrificed'; }, { range: 1.6 });
      const itH = c.interact(c.twelveHand, 'bring it down (hold)', () => { }, { range: 4.5 });
      let hold = 0, warned = 0;
      await c.until(() => {
        if (outcome) return true;
        if (c.flags.holding && g.hudPrompt === itH && g.input.state.use) { hold += c.dt; if (hold > 2) { outcome = 'did'; return true; } } else hold = Math.max(0, hold - c.dt);
        const el = c.timeT - t0;
        if (el > 12 && warned === 0) { warned = 1; say(c, 'FATHER', 'Pick. It. Up.', { pos: h.head.clone() }); }
        if (el > 24 && warned === 1) { warned = 2; say(c, 'MOTHER', 'Baby, if you don\'t, he will. And then you\'ll have watched. Watching is worse. Ask anyone.', { pos: M() }); }
        if (el > 38) { outcome = 'watched'; return true; }
        return false;
      });
      [itC, itMe, itH].forEach(i => c.removeInteract(i));
      st.cut = outcome; g.save.write();
      if (outcome === 'did') {
        c.sfx('thud1', 5, 0.9, -6.3, { vol: 1.5 }); c.sfx('c_scream2', 5, 1.4, -7.3, { vol: 1.3 }); c.sfx(['wet1', 'squish7'], 5, 0.9, -6.3, { vol: 1.2 }); c.twelveHand.scale.z = 0.7;
        g.engine.setFade(0.8, 0x250000); g.after(1.5, () => g.engine.setFade(0)); c.decal('pool', 5, 0.885, -6.3, 0.6);
        await c.sleep(2.5);
        await say(c, 'MOTHER', 'There. There. That wasn\'t so hard. Now you\'re ours.', { pos: M() });
        await say(c, 'FATHER', 'Good.', { pos: h.head.clone() });
        await say(c, 'TWELVE', '...I know. I know they made you. They made me too.', { pos: tw.head, whisper: true });
      } else if (outcome === 'sacrificed') {
        c.sfx('thud1', 4.65, 0.9, -3.25, { vol: 1.6 }); c.sfx(['wet6', 'squish7'], 4.65, 0.9, -3.25, { vol: 1.3 }); g.audio.setDread(1);
        g.engine.setFade(0.95, 0x300000); g.after(3, () => g.engine.setFade(0)); c.decal('pool', 4.65, 0.885, -3.25, 0.7);
        g.hud.sub('There is no pain for a moment. Then there is nothing else.', 5);
        await c.sleep(4);
        await say(c, 'MOTHER', 'Oh, baby. Oh, you sweet, stupid thing. The last one did that too.', { pos: M() });
        await say(c, 'FATHER', 'Then you\'ll be slower.', { pos: h.head.clone() });
        await say(c, 'TWELVE', 'Why would you— nobody does that. Nobody ever did that for me.', { pos: tw.head, whisper: true });
        g.player.speed = 1.35; st.slower = true;
      } else {
        await say(c, 'FATHER', 'Then I will.', { pos: h.head.clone() });
        c.sfx('thud1', 5, 0.9, -6.3, { vol: 1.5 }); c.sfx('c_scream2', 5, 1.4, -7.3, { vol: 1.3 }); c.sfx('wet1', 5, 0.9, -6.3, { vol: 1.2 }); c.twelveHand.scale.z = 0.7;
        await c.sleep(2);
        await say(c, 'MOTHER', 'You didn\'t help. That\'s alright. Watching is helping too. You\'ll see that one every time you close your eyes, now. That\'s how we stay with you.', { pos: M() });
      }
      // they take her back down
      tw.root.visible = false; for (const e of tw.ch.extras) e.mesh.visible = false; c.sfx(['step2', 'step4'], -10, 0.2, 1.5, { vol: 0.8 }); c.sfx('door1', -12, 1, 1.5, { vol: 1 });
      c.mother.root.visible = false; for (const e of c.mother.ch.extras) e.mesh.visible = false; g.watchers = g.watchers.filter(w => w !== c.mother); c.mother = null;
      h.enabled = true; h.work = chopWork(-4.2, -7.6, Math.PI, -4.2, -8.5); h.set('work');
    } },
    { spawn: [5, -2.4, 0], obj: 'Get free. Slowly. Grandmother is listening.', async run(c) {
      const g = c.g; g.player.enabled = false; g.flashAllowed = false;
      family(c, { father: { x: -4.2, z: -7.6, work: chopWork(-4.2, -7.6, Math.PI, -4.2, -8.5), state: 'work' }, grandma: { x: 8.5, z: -2, yaw: -Math.PI / 2, hearing: 5 } });
      c.grandma.place(8.5, -2, -Math.PI / 2); c.grandma.hearing = 5;
      if (S(c).slower) g.player.speed = 1.35;
      await say(c, 'GRANDMA', 'Quiet now. Quiet. Grandma\'s listening.', { pos: V(8.5, 1.4, -2), whisper: true });
      await struggle(c, 1, { quiet: true });
      g.player.enabled = true; g.flashAllowed = true; g.player.flashOn = false;
    } },
    { spawn: [5, -1.6, 0], obj: 'The basement key is in Grandmother\'s room. She hears everything.', async run(c) {
      const g = c.g;
      if (S(c).slower) g.player.speed = 1.35;
      family(c, { father: { x: -4.2, z: -7.6, work: chopWork(-4.2, -7.6, Math.PI, -4.2, -8.5), state: 'work' }, grandma: { x: -10, z: 8.4, yaw: 2.6 + Math.PI, hearing: 7 } });
      c.grandma.place(-10, 8.4, 2.6 + Math.PI);
      c.doors.basement.locked = 'basementkey';
      let spoke = false; c.onUpdate(() => { if (!spoke && c.near(-8, 7, 3)) { spoke = true; say(c, 'GRANDMA', 'I know you\'re there. I can smell her on your hands. Take the key, baby. Go see your sister. Grandma won\'t tell.', { pos: V(-10, 1.4, 8.4), whisper: true }); } });
      await c.until(() => c.has('basementkey'));
      say(c, 'GRANDMA', '...Grandma lied.', { pos: V(-10, 1.4, 8.4) }); c.grandma.hearing = 14;
      c.objective('Go down to the basement (hall, west end).');
      await c.until(() => c.head().x < -29);
    } },
  ],
};

// ================================================================ 5. THE BASEMENT
const basement = {
  title: 'THE BASEMENT', sub: '',
  atmosphere: { fog: 0x030201, density: 0.12, hemi: 0.03 },
  build(c) {
    buildCompound(c); bulbs(c, [-40, 2.2, 0, 0xffa050, 2.5, 7], [-48, 2.2, 6, 0xff7030, 1.5, 4]); sickLight(c, 0); sickLight(c, 1);
    c.twelve = new Twelve(c, -48, 7.5, 0); c.onUpdate(dt => c.twelve.update(dt));
    c.crow = c.pickup(prop('crowbar_01'), -39.6, 0.05, -1.4, 'crowbar', 'crowbar');
    c.tape = c.mesh(new THREE.BoxGeometry(0.22, 0.07, 0.14), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }), -38, 0.47, 1);
    c.cageDoor = c.mesh(new THREE.BoxGeometry(1.2, 2.2, 0.05), surf('rusty_metal_02', { size: 1, metal: 0.6, rough: 0.5 }), -48, 1.1, 4.4);
    c.cageCol = c.e.colliders.add(-48.6, 4.35, -47.4, 4.45);
    lastDeath(c);
  },
  stages: [
    { spawn: [-31.6, 0, Math.PI / 2], obj: 'Find her.', async run(c) {
      const g = c.g, st = S(c); g.audio.ambience('amb1', 0.22); g.hunters = []; g.watchers = [];
      if (st.slower) g.player.speed = 1.35;
      // a tape recorder labelled with your number
      const tapeIt = c.interact(c.tape, 'play the tape marked "4,096 — GRACE"', () => {
        c.removeInteract(tapeIt);
        if (!g.dialogue.playClip('grace', V(-38, 0.5, 1), { rate: 0.82 })) { say(c, 'MOTHER', '(on the tape) Say it, sweetheart. Thank you for my family. ...Louder. ...There. Now we have you forever.', { pos: V(-38, 0.5, 1) }); }
        else g.after(4.5, () => g.hud.sub('It is your voice. It has been slowed down. Underneath it, she is saying it with you.', 6));
      }, { range: 2 });
      c.sfx('c_cough2', -48, 1.4, 7.5, { vol: 1 });
      await c.reach(-46, 3, 3.2);
      const tw = c.twelve, line = { did: ['You did it.', 'It\'s okay. I did it too, when I was you. To the one before me. That\'s how it works. That\'s how they make us family.'], sacrificed: ['Your hand. You let them do your hand.', 'Nobody does that. I didn\'t. I took the cleaver. I took it so fast.'], watched: ['You just watched.', 'Like I did, the first time. We\'re good at watching. That\'s what they like about us.'] }[st.cut || 'watched'];
      await say(c, 'TWELVE', line[0], { pos: tw.head, whisper: true });
      await say(c, 'TWELVE', line[1], { pos: tw.head, whisper: true });
      await say(c, 'TWELVE', 'There\'s a crowbar. Get me out. He comes down when it gets quiet. It\'s been quiet a long time.', { pos: tw.head, whisper: true });
      c.g.after(40, () => { if (!c.alive || c.father) return; family(c, { father: { x: -31.5, z: 0, opts: { sight: 10, hearing: 16, walk: 1.0 } } }); c.father.alert = 0.3; c.sfx('door1', -31, 1.5, 0, { vol: 1.2 }); say(c, 'FATHER', 'It got quiet.', { pos: V(-31.5, 1.8, 0) }); });
      c.objective('Find a way to open her cage.');
      await c.until(() => c.has('crowbar'));
      c.objective('Pry the cage open (hold). It will be loud.');
      const it = c.interact(c.cageDoor, 'pry the cage (hold)', () => { }, { range: 2 });
      let hold = 0, sq = 0;
      await c.until(() => {
        if (g.hudPrompt === it && g.input.state.use) { hold += c.dt; sq -= c.dt; g.player.noise = 0.9; if (sq <= 0) { sq = 0.5; c.sfx(['thud6', 'door7', 'thud8'], -48, 1, 4.4, { vol: 1.1, rate: 0.8 }); } } else hold = Math.max(0, hold - c.dt / 2);
        return hold > 4.5;
      });
      c.removeInteract(it); c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false;
      c.twelve.follow = true;
      say(c, 'TWELVE', 'Don\'t let go of me. Please. Everyone lets go.', { pos: c.twelve.head, whisper: true });
    } },
    { spawn: [-46, 3, Math.PI], obj: 'Take her up the stairs.', async run(c) {
      const g = c.g; if (S(c).slower) g.player.speed = 1.35;
      if (!c.twelve.follow) { c.twelve.root.position.set(-47, 0, 2.5); c.twelve.follow = true; c.cageDoor.rotation.y = 1.3; c.cageDoor.position.x = -48.6; c.cageCol.on = false; }
      family(c, { father: { x: -36, z: 0, opts: { sight: 10, hearing: 16, walk: 1.0 } } });
      await c.until(() => c.head().x > -12 && c.twelve.alive);
    } },
  ],
};

// ================================================================ 6. THE ROAD
const road = {
  title: 'THE ROAD', sub: 'Get her through the gate. Everyone is awake now.',
  atmosphere: { fog: 0x020203, density: 0.075, hemi: 0.05, hemiSky: 0x404860 },
  build(c) {
    buildCompound(c); bulbs(c, [33, 3.2, -12, 0xff6030, 5, 12], [0, 2.4, 1.5, 0xffa060, 3, 8]); sickLight(c, 0);
    c.doors.front.locked = null; c.doors.basement.locked = null;
    c.gate.chain.visible = false; c.gate.col.on = false; c.gate.mesh.rotation.y = 1.4; c.gate.mesh.position.set(46.6, 1, 1.1);
    c.twelve = new Twelve(c, -10.5, 2.2, -Math.PI / 2); c.onUpdate(dt => c.twelve.update(dt));
    c.floor(46, -3, 80, 3, c.mats.mud); c.e.colliders.add(46.2, -24, 80, -3); c.e.colliders.add(46.2, 3, 80, 24);
    photos(c, 5); lastDeath(c);
  },
  stages: [
    { spawn: [-11, 1.5, -Math.PI / 2], obj: 'Out the front door. Across the yard. Through the gate. Keep her with you.', async run(c) {
      const g = c.g; g.audio.ambience('amb1', 0.3); c.twelve.follow = true; if (S(c).slower) g.player.speed = 1.35;
      family(c, { father: { x: 5, z: -5, state: 'patrol', opts: { sight: 14, hearing: 17, run: 2.65 } }, mother: { x: 22, z: 2, yaw: Math.PI / 2, ts: 0.3, sight: 8 } });
      c.father.aggro = 1;
      say(c, 'MOTHER', 'Everybody up! Everybody up! The babies are leaving!', { pos: V(22, 1.6, 2) });
      c.onUpdate(() => { if (Math.random() < 0.003) c.sfx(['c_barking1', 'c_barking2'], 46 + Math.random() * 10, 1, (Math.random() - 0.5) * 40, { vol: 0.9, ref: 6 }); });
      await c.until(() => c.head().x > 47 && c.twelve.alive && c.twelve.root.position.x > 44);
    } },
    { spawn: [48, 0, -Math.PI / 2], obj: '', async run(c) {
      const g = c.g, st = S(c); g.hunters.forEach(h => h.enabled = false); g.player.enabled = false;
      const tw = c.twelve; tw.follow = false; tw.root.position.set(50, 0, 0.3); tw.face(Math.PI / 2, 1); tw.play('sad_pose');
      await c.sleep(2.5);
      await say(c, 'TWELVE', 'This is as far as I got. When I was you. I stood right here.', { pos: tw.head });
      c.sfx('sting1', 50, 1.6, 0.3, { vol: 0.9 });
      for (const e of tw.ch.extras) e.mesh.visible = false;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 14).scale(0.92, 1.28, 1.02), new THREE.MeshStandardMaterial({ color: 0xd6d2c8, roughness: 0.6 }));
      const hb = tw.ch.bone('Head'); c.onUpdate(() => { hb.getWorldPosition(head.position); head.position.y += 0.1; }); c.add(head);
      g.hud.sub('She lifts the sack. There is no face under it. There is only your shape.', 5);
      await c.sleep(5);
      await say(c, 'TWELVE', 'I was four thousand and eighty-four. Everyone turns around here. Do you know why?', { pos: tw.head });
      await say(c, 'TWELVE', 'Because out there, nobody remembers you. In there, they remember everything. Even the number. Even what you did at supper.', { pos: tw.head });
      await say(c, 'TWELVE', 'Go. Leave me. They only ever chase one of us.', { pos: tw.head });
      await say(c, 'MOTHER', '(from the yard, softly) Babies? ...Come in now. I won\'t be cross.', { pos: V(40, 1.6, 0) });
      const i = await c.choice('THE ROAD', 'The dark road. Or her hand.', ['Leave her. Walk into the dark.', 'Take her hand. Go back.']);
      st.ending = i === 0 ? 'left' : 'home'; c.flags.ending = st.ending; g.save.write();
      if (i === 0) {
        g.player.enabled = true; c.objective('Walk.');
        await c.reach(62, 0, 2);
        c.sfx('c_scream1', 50, 1.5, 0.3, { vol: 0.9, ref: 6 }); c.sfx('rip1', 50, 1, 0.3, { vol: 0.8, ref: 6, offset: 5, dur: 8 });
        await say(c, 'FATHER', '(far behind you) That\'s alright. We\'ve got this one.', { pos: V(50, 1.8, 0) });
        await c.reach(72, 0, 2);
      } else {
        await say(c, 'TWELVE', '...Thank you. They\'ll be so happy.', { pos: tw.head });
        c.sfx(['step2', 'step4', 'step6'], 44, 0.2, 0, { vol: 1 });
        await say(c, 'MOTHER', 'There they are. There are my babies.', { pos: V(45, 1.6, 0) });
      }
      g.engine.setFade(1, 0); await c.sleep(3);
    } },
  ],
};

export const NIGHTS = [home, morning, killFloor, supper, basement, road];
export const ENDINGS = {
  left: (st, n) => ({ title: 'THE ONE WHO LEFT', text: `You walk until the road becomes a driveway. The driveway becomes a yard. There is a light on in the kitchen, and a chair, and someone humming.\n\nShe opens the door before you knock.\n\n"There you are. You were gone such a long time."\n\n${st.cut === 'did' ? 'Your hands remember the cleaver. They always will.' : st.cut === 'sacrificed' ? 'You hold the door with your other hand.' : 'You see Twelve every time you close your eyes. That is how they stay with you.'}\n\nCopies before you: ${n}.` }),
  home: (st, n) => ({ title: 'FAMILY', text: `You walk her back up the drive. They are all waiting on the porch, and your mother is crying, and it looks so much like love.\n\nTomorrow, copy ${(4097 + n - 4095).toLocaleString()} wakes up in the chair.\n\nYou will be the one standing behind it, whispering shh, shh, there you are.\n\nYou will be so gentle with it.\n\n${st.grace === 'said' ? 'They play it your voice saying grace, so it knows what to say.' : 'You will teach it to be quiet. The quiet ones last longest.'}` }),
};
