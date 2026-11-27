// CHAPTER 5 — RECURSION: one corridor, walked again and again. The corridor does not remember you.
import { THREE, mat, tex } from './context.js';
import { instanced, setInstance, setInstanceColor } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[4];
const L = -24, W = 1.2, H = 2.7;
const FRAG = [[0.8, 0.3, -5], [-0.9, 2.2, -14], [0.6, 1.2, -22], [3, 0.3, -23.5], [-0.8, 0.3, 1.5], [0.9, 2.3, -9], [6, 1.6, -22.5],
  [-0.7, 1.2, -19], [0.2, 2.5, -2], [4.5, 0.3, -21.8], [0, 0.4, -12], [-0.9, 1.7, -6.5], [0.9, 0.3, -17], [7, 2.2, -23.5], [0, 1.5, -23]];

export default {
  title: 'RECURSION', sub: 'Count the doors you go through. Not the number on the wall.',
  atmosphere: { fog: 0x0a0806, density: 0.1, hemi: 0.14, hemiSky: 0xb0a080 },
  drone: { base: 41.2, noise: 0.03, hum: 0.01, gain: 0.18 }, surface: 'carpet', level: 0.55, battery: 70,
  fragmentLines: FRAGMENT_LINES[4],
  lies: ['LOOP 1', 'YOU HAVE NOT BEEN HERE', 'COUNTER IS ACCURATE', 'THIS IS THE LAST LOOP'],
  build(c) {
    const wall = mat('wallpaper', { t: { base: '#6a5440', stripe: '#5a4636' } }), carpet = mat('carpet', { t: { base: '#4a2420' }, uv: 1.2 }), ceil = mat('ceiling', { t: { base: '#7a7060' } });
    // landing + corridor + east segment
    c.room(-W, 0, W, 3, { h: H, wall, floor: carpet, ceil, n: false });
    c.wallZ(L - 1.2, 0, -W, { h: H, m: wall, gaps: [-6, -12, -18].map(at => ({ at, w: 1.0, h: 2.1 })) });
    c.wallZ(L + 1.2, 0, W, { h: H, m: wall, gaps: [-6, -12, -18].map(at => ({ at, w: 1.0, h: 2.1 })) });
    c.box(0, -0.05, L / 2 - 0.6, 2 * W, 0.05, -L + 1.2, carpet); c.box(0, H, L / 2 - 0.6, 2 * W, 0.05, -L + 1.2, ceil);
    c.wallX(-W, 8.5, L - 1.2, { h: H, m: wall }); c.wallX(W, 8.5, L + 1.2, { h: H, m: wall });
    c.box(4.85, -0.05, L, 7.3, 0.05, 2.4, carpet); c.box(4.85, H, L, 7.3, 0.05, 2.4, ceil);
    c.wallZ(L - 1.2, L + 1.2, 8.5, { h: H, m: wall });
    // closets behind the side doors (used for dodging in the last loop)
    c.flags.sideDoors = [];
    for (const z of [-6, -12, -18]) for (const s of [-1, 1]) {
      c.room(s < 0 ? -3.2 : W, z - 1, s < 0 ? -W : 3.2, z + 1, { h: H, wall, floor: carpet, ceil, [s < 0 ? 'e' : 'w']: false });
      const d = c.door(s * W, z, { axis: 'z', w: 1.0, h: 2.1, m: mat('wood', { t: { base: '#2a1a10' } }), locked: { msg: 'LOCKED FROM THE OTHER SIDE' }, swing: s });
      c.flags.sideDoors.push(d);
    }
    c.flags.endDoor = c.door(8.45, L, { axis: 'z', w: 1.1, h: 2.1, m: mat('wood', { t: { base: '#3a2414' } }), label: 'go through' });
    c.flags.startDoor = c.door(0, 2.86, { axis: 'x', w: 1.1, h: 2.1, m: mat('wood', { t: { base: '#3a2414' } }), locked: { msg: 'YOU CAME FROM HERE. THERE IS NOTHING HERE.' } });
    c.flags.exitSign = c.sign(8.38, 2.35, L, -Math.PI / 2, 'EXIT', { w: 0.5, h: 0.18, size: 70, bg: '#120', color: '#3c3', emissive: true });
    c.flags.counter = c.sign(-1.12, 1.9, 1.5, Math.PI / 2, 'LOOP 1', { w: 0.8, h: 0.3, size: 70, bg: '#111', color: '#c84', emissive: true });
    // ceiling lamps (instanced, per-lamp control)
    const lamps = []; for (let z = 1.5; z > L; z -= 3) lamps.push({ x: 0, y: H - 0.02, z }); for (let x = 2.5; x < 8; x += 3) lamps.push({ x, y: H - 0.02, z: L });
    c.flags.lamps = lamps; c.flags.lampIM = instanced(c, new THREE.BoxGeometry(0.35, 0.03, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff }), lamps, lamps.map(() => 0xffd8a0));
    c.flags.setLamp = (i, on) => setInstanceColor(c.flags.lampIM, i, on ? 0xffd8a0 : 0x0a0806);
    const pl = c.point(0, 0, H - 0.3, 0, 0xffc890, 2, 6);
    c.onUpdate(() => { const h = c.head(); let best = 1e9, bi = -1; lamps.forEach((l, i) => { if (c.flags.lampOff?.[i]) return; const d = (l.x - h.x) ** 2 + (l.z - h.z) ** 2; if (d < best) { best = d; bi = i; } }); if (bi >= 0 && best < 30) { pl.position.set(lamps[bi].x, H - 0.3, lamps[bi].z); pl.intensity = 2; } else pl.intensity = 0; });
    // paintings: faceless portraits that turn to the wall when unobserved
    c.flags.paintings = [-3, -9, -15, -21].map((z, i) => c.picture(i % 2 ? W - 0.02 : -W + 0.02, 1.6, z, i % 2 ? -Math.PI / 2 : Math.PI / 2, tex('drawing', { n: 1, faceless: 0, caption: 'RESIDENT' }, false), 0.6, 0.7));
    c.flags.note = c.note(0.3, 0.01, -1, 0.4, ...N.loop, { variants: N.loop_v });
    c.note(-1.15, 1.0, -10, Math.PI / 2, ...N.mark, { flat: false });
    c.note(7.5, 0.01, L + 0.6, 0.2, ...N.service);
    c.flags.term = c.terminal(0.6, 2.2, Math.PI / 2, 'LOOP CONTROLLER', '', { onUse: () => { }, desk: false, screenOnly: true, y: 0.9 });
    c.box(0.85, 0, 2.2, 0.5, 0.9, 0.6, mat('metal'), { collide: true });
    // the marks you leave
    c.flags.marks = 0;
    c.flags.markIt = c.interact(c.sign(-1.12, 1.0, 0.6, Math.PI / 2, '', { w: 0.5, h: 0.3, bg: '#5a4636', color: '#ddd', size: 40 }), 'scratch a mark', () => { });
    [[0.5, 0.01, -15], [8, 0.01, -23]].forEach(([x, y, z]) => c.battery(x, y, z));
  },
  stages: [
    { // 0 loops
      spawn: [0, 1.8, 0], obj: 'Walk the corridor. Go through the door at the end.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity;
        let loop = 1, passes = 0, sinceReset = 0, terminalOpen = false, solved = false, fragI = 0;
        const markSign = F.markIt.mesh;
        const spawnFrags = n => { for (let k = 0; k < n && fragI < 14; k++, fragI++) c.fragment(...FRAG[fragI]); };
        spawnFrags(2);
        const resetAnoms = () => {
          F.lampOff = {}; F.lamps.forEach((l, i) => F.setLamp(i, true));
          c.e.scene.fog.density = 0.1; ent.off();
          F.paintings.forEach(p => { p.rotation.y = p.position.x > 0 ? -Math.PI / 2 : Math.PI / 2; });
          F.sideDoors.forEach(d => d.close());
        };
        const anomalies = [
          () => { },
          () => { F.lamps.forEach((l, i) => { if (i % 2) { F.lampOff[i] = 1; F.setLamp(i, false); } }); },
          () => { F.sideDoors[2].open(true); a.whisper(new THREE.Vector3(2.5, 1.5, -12), 3, 0.5); },
          () => { c.e.scene.fog.density = 0.16; },
          () => { ent.mimic(4, L, { lag: 2, mirror: true }); c.when(new THREE.Vector3(4, 1.6, L), () => ent.off(), { after: 0.2, minDist: 2 }); },
          () => { F.paintings.forEach(p => c.when(p.position, () => { p.rotation.y += Math.PI; }, { after: 0.3 })); },
          () => { c.director.fire('echo'); a.knock(new THREE.Vector3(-2.5, 1.2, -18), 4, 0.9); },
          () => { F.lamps.forEach((l, i) => { if (i > 2) { F.lampOff[i] = 1; F.setLamp(i, false); } }); c.lie('LIGHTS NOMINAL'); },
          () => { const h = c.head(); c.when(new THREE.Vector3(0, 1.6, -3), () => { ent.glimpse(0, -3, Math.PI, { vanish: 0.5 }); }, { after: 0.5, cond: () => c.head().z < -10 }); },
          () => { a.silence(5); },
        ];
        F.markIt.fn = () => { F.marks++; markSign.userData.set('|'.repeat(Math.min(30, F.marks + (loop > 4 ? loop : 0)))); a.creak(markSign.position, 0.3); c.g.hud.msg(loop > 4 ? 'THE MARK WAS ALREADY THERE' : 'MARKED', 2); };
        F.term.it.fn = async () => {
          if (!terminalOpen) { F.term.draw('LOOP CONTROLLER\n\nINSUFFICIENT ITERATIONS.\nKEEP WALKING.'); return; }
          const ok = await c.keypad('LOOP CONTROLLER', code => {
            if (Number(code) === sinceReset) return true;
            return 'WRONG. COUNTER RESET.';
          }, { len: 2, hint: 'How many times have you gone through the door at the end?\n(two digits, e.g. 07)' });
          if (ok) { solved = true; F.term.draw('LOOP CONTROLLER\n\nCOUNT ACCEPTED.\n\nTHANK YOU FOR COUNTING.\nWE USED IT.'); }
          else { /* closed without answering */ }
        };
        // keypad rejection resets the count
        const origKeypad = c.keypad.bind(c);
        c.keypad = (title, onEnter, o) => origKeypad(title, code => { const r = onEnter(code); if (r !== true) { sinceReset = 0; terminalOpen = false; F.term.draw('LOOP CONTROLLER\n\nCOUNTER RESET.\nSTART AGAIN.'); } return r === true ? true : r; }, o);
        // going through the end door
        F.endDoor.it.fn = async () => {
          if (F.busy) return; F.busy = true;
          F.endDoor.open(); c.e.setFade(1); await c.sleep(0.6);
          passes++; sinceReset++; loop++;
          resetAnoms();
          if (!solved) anomalies[(loop - 1) % anomalies.length]();
          if (loop > 2 && !solved) c.director.fire(['whisper', 'lie', 'echo', 'breath'][loop % 4]);
          c.g.player.teleportTo(0, 1.6, 0); F.endDoor.close();
          // the counter tells the truth for a while
          const shown = loop <= 3 ? loop : [loop + 1, loop - 2, 1, loop, 7, loop + 3][loop % 6];
          F.counter.userData.set('LOOP ' + shown);
          if (sinceReset >= 6 && !terminalOpen) { terminalOpen = true; F.term.draw('LOOP CONTROLLER\n\nREADY.\n\nHOW MANY TIMES?'); c.g.hud.msg('THE TERMINAL IS AWAKE', 3); c.objective('Tell the terminal how many times you went through the end door.'); }
          if (loop % 2 === 0 || fragI < 14) spawnFrags(loop < 8 ? 2 : 1);
          c.e.setFade(0); a.step('carpet', null, 0.6); F.busy = false;
        };
        await c.until(() => solved);
      },
    },
    { // 1 it stands where you are about to stand
      spawn: [0, 1.8, 0], obj: 'Leave. It knows where you are going.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity;
        F.counter.userData.set('LOOP ∞');
        F.sideDoors.forEach(d => { d.locked = null; d.open(true); });
        F.exitSign.userData.set('EXIT');
        c.fragment(...FRAG[14]);
        c.lie('PREDICTION CONFIDENCE: 97%');
        await c.until(() => c.head().z < -2);
        // it appears ahead and moves to where you will be
        ent.stalk({ speed: 0.85, predict: 1.6, freezeWhenSeen: false, x: 0, z: -20 });
        // hiding in a side room is the one thing it does not predict: it overshoots and ends up behind you
        let hideT = 0;
        c.onUpdate(dt => {
          const h = c.head();
          if (Math.abs(h.x) > 1.35 && h.z > L + 1.5 && !F.dodged) { hideT += dt; if (hideT > 2.5 && !ent.observed) { F.dodged = true; ent.pos.set(0, 1.6, Math.min(1.5, h.z + 7)); a.whisper(new THREE.Vector3(0, 1.6, h.z + 5), 2, 0.4); c.lie('PREDICTION ERROR'); } }
          else hideT = 0;
        });
        a.stinger('swell');
        c.say('Only something it would never predict will get you past. Use the side rooms.', 6);
        F.endDoor.it.fn = () => { F.done = true; };
        await c.until(() => F.done || c.near(8, L, 0.9));
        ent.off();
        c.e.setFade(1, 0xffffff); a.stinger('chime');
        await c.sleep(2.5);
        c.e.setFade(0, 0);
      },
    },
  ],
};
