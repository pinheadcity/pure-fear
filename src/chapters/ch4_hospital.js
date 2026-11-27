// CHAPTER 4 — REFLECTION TEST: a hospital where every mirror shows the Completion wearing your movements.
import { THREE, mat } from './context.js';
import { Builder } from '../engine.js';
import { Figure, reflectPose } from '../entity.js';
import { mirrorCopy, glass } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[3];
const ROOMS = [ // side, zCenter, mirror plane x, behaviour
  { side: -1, z: -4, lag: 0 }, { side: 1, z: -4, lag: 0.14 }, { side: -1, z: -12, lag: 0.8 },
  { side: 1, z: -12, lag: -0.4 }, { side: -1, z: -20, lag: 'still' }, { side: 1, z: -20, lag: 'none' },
];

export default {
  title: 'REFLECTION TEST', sub: 'Confirm that the reflection is you.',
  atmosphere: { fog: 0x090c0b, density: 0.08, hemi: 0.16, hemiSky: 0x9ab0a8 },
  drone: { base: 49, noise: 0.03, hum: 0.014, gain: 0.17 }, surface: 'tile', level: 0.55, battery: 75,
  fragmentLines: FRAGMENT_LINES[3],
  lies: ['REFLECTION LATENCY 0 MS', 'THE GLASS IS SECURE', 'YOU HAVE CONFIRMED 0 TIMES', 'PATIENT IS ALONE'],
  build(c) {
    const wall = mat('hospital', { uv: 3 }), floor = mat('tiles', { t: { base: '#8a948e', n: 4, grout: '#3a403c' }, uv: 1.2 }), ceil = mat('ceiling', { t: { base: '#7a807a' } }), H = 3;
    // reception
    c.room(-4, 4, 4, 12, { h: H, wall, floor, ceil, n: [{ at: 0, w: 3 }] });
    c.box(0, -0.05, -10, 3, 0.05, 28, floor); c.box(0, H, -10, 3, 0.05, 28, ceil);
    for (let z = 2; z > -24; z -= 4) c.lightPanel(0, H, z, 0.4, 1.2, 0xd0e8d8);
    // observation rooms: interiors go into their own builder so they can be mirrored
    const rb = new Builder(c.e), rw = mat('hospital', { t: 'r' , uv: 3 });
    // corridor walls go in the mirrored set too, so reflected rooms are closed
    const mainB = c.b; c.b = rb;
    c.wallZ(-24, 4, -1.5, { h: H, m: wall, gaps: ROOMS.filter(r => r.side < 0).map(r => ({ at: r.z, w: 1.3 })) });
    c.wallZ(-24, 4, 1.5, { h: H, m: wall, gaps: ROOMS.filter(r => r.side > 0).map(r => ({ at: r.z, w: 1.3 })) });
    c.b = mainB;
    for (const r of ROOMS) {
      const x0 = r.side < 0 ? -6.5 : 1.5, x1 = r.side < 0 ? -1.5 : 6.5, z0 = r.z - 2.25, z1 = r.z + 2.25;
      rb.box((x0 + x1) / 2, -0.05, r.z, 5, 0.05, 4.5, floor); rb.box((x0 + x1) / 2, H, r.z, 5, 0.05, 4.5, ceil);
      rb.box((x0 + x1) / 2, 0, z0, 5, H, 0.15, rw, { collide: true }); rb.box((x0 + x1) / 2, 0, z1, 5, H, 0.15, rw, { collide: true });
      const bx = r.side < 0 ? -4.5 : 4.5;
      rb.box(bx, 0, r.z + 1.3, 1.0, 0.55, 1.9, mat('lambert', { color: 0xb8bcb4 }), { collide: true }); // bed
      rb.box(bx, 0.55, r.z + 2.0, 0.9, 0.12, 0.45, mat('lambert', { color: 0xe0e0d8 }));
      rb.box(bx + r.side * 0.6, 0, r.z - 1.6, 0.6, 0.9, 0.5, mat('metal'), { collide: true }); // cabinet
      rb.box((x0 + x1) / 2, H - 0.03, r.z, 0.5, 0.02, 0.9, mat('emissive', { color: 0xc8dcd0 }));
      const mx = r.side < 0 ? -6.5 : 6.5;
      glass(c.world, mx, 1.5, r.z, 4.5, H, Math.PI / 2, 0.14);
      c.e.colliders.add(mx - 0.08, z0, mx + 0.08, z1);
      // the frame
      rb.box(mx, 0, r.z, 0.1, 0.25, 4.5, mat('metal'));
      // room number
      c.sign(r.side * 1.41, 2.4, r.z + 1.0, -r.side * Math.PI / 2, 'OBS ' + (ROOMS.indexOf(r) + 1), { w: 0.5, h: 0.18, size: 60, bg: '#223', color: '#aac' });
    }
    const rmesh = rb.flush(c.world);
    mirrorCopy(c.world, rmesh, 'x', -6.5); mirrorCopy(c.world, rmesh, 'x', 6.5);
    c.flags.confirm = ROOMS.map((r, i) => {
      const s = c.sign(r.side * 6.42, 1.2, r.z - 1.6, -r.side * Math.PI / 2, 'CONFIRM', { w: 0.35, h: 0.15, size: 60, bg: '#131', color: '#6f6', emissive: true });
      return c.interact(s, 'confirm: the reflection is you', () => { });
    });
    // charts
    const charts = [N.chart1, N.chart2, N.chart3, N.chart4, N.chart5, N.chart6];
    ROOMS.forEach((r, i) => c.note(r.side * 4.5 + r.side * 0.6, 0.91, r.z - 1.6, 0.3, ...charts[i]));
    // reception furniture
    c.box(-2, 0, 8, 2.5, 1.1, 0.8, mat('wood', { t: { base: '#5a5a50' } }), { collide: true });
    c.flags.recTerm = c.terminal(2.6, 9.5, Math.PI / 2, 'REFLECTION TEST', N.reception[1]);
    c.note(-2.4, 1.11, 8, 0.2, ...N.nurse);
    c.note(-2.0, 1.11, 8.2, -0.4, ...N.reception);
    // records office
    c.room(-4, -32, 4, -24, { h: H, wall, floor, ceil, s: [{ at: 0, w: 1.3 }], n: [{ at: 0, w: 1.3 }] });
    c.flags.recDoor = c.door(0, -24, { axis: 'x', w: 1.3, m: mat('metal', { t: { base: '#5a6a66' } }), locked: { msg: 'KEYPAD LOCKED' } });
    c.flags.recPad = c.sign(1.0, 1.4, -23.9, 0, 'RECORDS\n[ _ _ _ _ ]', { w: 0.4, h: 0.3, size: 44, bg: '#111', color: '#9c9', emissive: true });
    c.flags.recPadIt = c.interact(c.flags.recPad, 'enter code', () => { });
    c.box(-2.5, 0, -30, 1.6, 0.8, 0.8, mat('wood', { t: { base: '#4a3a2a' } }), { collide: true });
    c.note(-2.5, 0.81, -30, 0.1, ...N.doctor);
    for (const x of [-3.5, -2.5, -1.5, 1.5, 2.5, 3.5]) c.box(x, 0, -31.6, 0.8, 2, 0.6, mat('metal', { t: { base: '#556' } }), { collide: true });
    c.flags.exitDoor = c.door(0, -32, { axis: 'x', w: 1.3, m: mat('metal'), locked: { msg: 'NOT YET' } });
    // mirror corridor: floor + ceiling + lights mirrored both sides
    const cb = new Builder(c.e);
    cb.box(0, -0.05, -47, 3, 0.05, 30, floor); cb.box(0, H, -47, 3, 0.05, 30, ceil);
    for (let z = -34; z > -62; z -= 3) cb.box(0, H - 0.03, z, 0.4, 0.02, 1.0, mat('emissive', { color: 0xd8e8e0 }));
    cb.box(-1.075, 0, -62, 0.85, H, 0.15, wall, { collide: true }); cb.box(1.075, 0, -62, 0.85, H, 0.15, wall, { collide: true }); cb.box(0, 2.2, -62, 1.3, H - 2.2, 0.15, wall);
    const cm = cb.flush(c.world);
    c.flags.mirL = mirrorCopy(c.world, cm, 'x', -1.5); c.flags.mirR = mirrorCopy(c.world, cm, 'x', 1.5);
    c.flags.glassL = glass(c.world, -1.5, 1.5, -47, 30, H, Math.PI / 2, 0.16); c.flags.glassR = glass(c.world, 1.5, 1.5, -47, 30, H, Math.PI / 2, 0.16);
    c.flags.colL = c.e.colliders.add(-1.58, -62, -1.42, -32); c.flags.colR = c.e.colliders.add(1.42, -62, 1.58, -32);
    c.flags.discharge = c.door(0, -61.9, { axis: 'x', w: 1.3, m: mat('metal', { t: { base: '#ddd' } }), locked: { msg: 'DISCHARGE PENDING' } });
    c.sign(0, 2.5, -61.8, 0, 'DISCHARGE', { w: 1.0, h: 0.25, size: 70, bg: '#200', color: '#d44', emissive: true });
    c.note(0.9, 0.01, -60, 0.3, ...N.discharge);
    // fragments & batteries
    [[-5.5, 0.6, -2], [5.5, 0.6, -6], [-3, 2.6, -12], [3, 0.3, -14], [-5.8, 1.8, -21], [5.8, 0.3, -18], [3.5, 1.4, 11.5], [-3.6, 0.3, 4.5],
      [0, 2.7, -16], [-3.5, 2.3, -31.5], [3.5, 0.3, -25], [0, 0.4, -40], [-1, 2.5, -50], [1, 0.4, -56], [0, 1.2, -61.3]].forEach(p => c.fragment(...p));
    [[-2.8, 1.12, 7.8], [-5.1, 0.92, -13.6], [5.1, 0.92, -21.6], [2.5, 0.81, -30]].forEach(p => c.battery(...p));
    c.flags.fig2 = new Figure(c.world);
  },
  stages: [
    { // 0 reception
      spawn: [0, 10.5, 0], obj: 'Read the instructions at reception.',
      async run(c) { await c.until(() => c.flags.recTerm.it.uses > 0 || c.near(0, -2, 2)); },
    },
    { // 1 the six rooms
      spawn: [0, 3, 0], obj: 'Visit observation rooms 1–6. Confirm the reflection is you.',
      async run(c) {
        const F = c.flags, ent = c.entity; let done = 0;
        const confirmed = new Set();
        c.director.allow.delete('behind');
        const ru = c.onUpdate(() => {
          // which room are we in?
          const h = c.head(); let room = -1;
          ROOMS.forEach((r, i) => { if (Math.abs(h.z - r.z) < 2.2 && (r.side < 0 ? h.x < -1.5 : h.x > 1.5)) room = i; });
          if (room === F.curRoom) return; F.curRoom = room;
          if (room < 0) { if (ent.mode === 'reflect' || ent.mode === 'glimpse') ent.off(); return; }
          const r = ROOMS[room], mx = r.side < 0 ? -6.5 : 6.5;
          if (r.lag === 'still') { const p = 2 * mx - (r.side < 0 ? -4 : 4); ent.glimpse(p, r.z, r.side < 0 ? -Math.PI / 2 : Math.PI / 2, { vanish: 0 }); }
          else if (r.lag === 'none') { ent.off(); }
          else ent.reflect('x', mx, { lag: r.lag });
        });
        F.confirm.forEach((it, i) => c.used(it).then(() => {
          if (confirmed.has(i)) return; confirmed.add(i); done++;
          c.g.audio.beep(1000, 0.08, 0.05); c.g.hud.msg(`CONFIRMED (${done}/6)`, 2);
          if (i === 4) c.g.audio.whisper(new THREE.Vector3(-8, 1.6, -20), 2, 0.5);
          if (i === 5) c.director.behindYou();
          if (i === 3) c.lie('REFLECTION LATENCY 0 MS');
        }));
        await c.until(() => done >= 6);
        c.objective('Enter the code on the records office door.');
        while (true) {
          await c.used(F.recPadIt);
          const ok = await c.keypad('RECORDS OFFICE', code => code === '3805' ? true : 'INCORRECT. THE CHARTS REMEMBER.', { hint: 'Four digits from the charts in rooms 1–4.' });
          if (ok) break;
        }
        F.recDoor.locked = null; F.recDoor.open(); F.recPad.userData.set('RECORDS\nOPEN');
        ent.off(); ru.dead = true;
      },
      skip(c) { c.flags.recDoor.locked = null; c.flags.recDoor.open(true); },
    },
    { // 2 the mirror corridor
      spawn: [0, -27, 0], obj: 'Read the records. Go through to the discharge door.',
      async run(c) {
        const F = c.flags, ent = c.entity, fig2 = F.fig2, a = c.g.audio, rec = c.g.recorder;
        await c.until(() => c.g.notesRead > 0 && c.near(-2.5, -30, 2.5) || c.near(0, -31.5, 1));
        F.exitDoor.locked = null; F.exitDoor.open(); a.creak(new THREE.Vector3(0, 1, -32), 1);
        c.director.enabled = false;
        // two reflections, one in each wall
        ent.reflect('x', -1.5, { lag: 0 });
        const P = new Array(13); let rightFree = false, rightPos = null;
        const u = c.onUpdate(dt => {
          if (rightFree) return;
          if (!rec.sample(0, P)) return; reflectPose(P, 'x', 1.5); fig2.visible = c.head().z < -32.3; fig2.pose(P, dt);
        });
        await c.until(() => c.head().z < -44);
        // the right one stops copying you
        rightFree = true; a.silence(2.5);
        const h0 = c.head(); rightPos = new THREE.Vector3(fig2.headPos.x, 0, fig2.headPos.z);
        let t = 0;
        c.lie('REFLECTION LATENCY: UNDEFINED');
        await c.until(() => {
          t += 1 / 60; const h = c.head();
          const yaw = Math.atan2(-(h.x - rightPos.x), -(h.z - rightPos.z));
          if (t > 1.5) rightPos.x = Math.max(1.75, rightPos.x - 1 / 60 * 0.5);
          if (t > 1.5) rightPos.z += (h.z - rightPos.z) * 0.01;
          const Q = fig2.poseStanding(rightPos.x, rightPos.z, yaw);
          if (t > 3.5) { Q[7] = 1.6; Q[8] = 1.5; Q[9] = rightPos.z - 0.25; Q[10] = 1.6; Q[11] = 1.5; Q[12] = rightPos.z + 0.25; fig2.pose(Q, 0.016); }
          return t > 6;
        });
        // the glass is gone. It steps through.
        a.stinger('hit'); a.glitch(0.8, new THREE.Vector3(1.5, 1.5, rightPos.z));
        F.glassR.visible = false; F.colR.on = false; F.mirR.visible = false;
        fig2.visible = false; u.dead = true;
        ent.stalk({ speed: 1.15, predict: 0.7, freezeWhenSeen: true, x: 1.2, z: rightPos.z });
        F.discharge.locked = null;
        c.objective('DISCHARGE. NOW.');
        c.director.enabled = true; c.director.allow = new Set(['whisper', 'lie']);
        await c.reach(0, -61.2, 1.1);
        ent.off(); F.discharge.open();
        c.say('The left reflection is still copying you. It waves goodbye a moment after you do. You did not wave.', 6);
        await c.sleep(4);
      },
    },
  ],
};
