// CHAPTER 2 — COLD STORAGE: a flooded server hall where every rack holds a version of you.
import { THREE, mat, tex } from './context.js';
import { G, instanced, setInstance, setInstanceColor } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[1];
const ROWS = [-8, -4, 0, 4, 8], Z0 = -34, Z1 = 2, GAPS = [-22, -10];

export default {
  title: 'COLD STORAGE', sub: 'Thousands of you, humming in the dark. The water is very cold.',
  atmosphere: { fog: 0x05090b, density: 0.075, hemi: 0.08, hemiSky: 0x6a8a99 },
  drone: { base: 38.9, noise: 0.08, nf: 300, hum: 0.008, gain: 0.22 }, surface: 'water', level: 0.5, battery: 75,
  fragmentLines: FRAGMENT_LINES[1],
  lies: ['WATER LEVEL STABLE', 'COOLANT NOMINAL', 'NO MOTION IN HALL C', 'ALL SNAPSHOTS ACCOUNTED FOR'],
  build(c) {
    const conc = mat('concrete', { uv: 3 }), metal = mat('metal'), H = 5;
    c.room(-12, -40, 12, 10, { h: H, wall: conc, floor: conc, ceil: mat('concrete', { t: { base: '#333' }, uv: 4 }), w: [{ at: -2, w: 1.4 }], e: [{ at: -16, w: 1.4 }], n: [{ at: 0, w: 1.6 }], s: [{ at: 0, w: 1.8 }] });
    // arrival elevator (south)
    c.room(-1.5, 10, 1.5, 13, { h: 2.6, wall: metal, floor: metal, ceil: metal, n: false });
    // breaker room (west), cooling control (east), archive (north)
    c.room(-19, -7, -12, 3, { h: 3, wall: conc, floor: conc, ceil: conc, e: false });
    c.room(12, -21, 19, -11, { h: 3, wall: conc, floor: conc, ceil: conc, w: false });
    c.room(-7, -50, 7, -40, { h: 3.5, wall: mat('metal', { t: { base: '#2a2d30' } }), floor: conc, ceil: conc, s: false });
    // racks: instanced bodies + instanced LED faces
    const racks = [], leds = [], fill = [];
    for (const x of ROWS) for (let z = Z0; z <= Z1; z += 1.05) {
      if (GAPS.some(g => Math.abs(z - g) < 1.1)) { fill.push({ x, y: 0, z, s: 0 }); continue; }
      racks.push({ x, y: 0, z }); leds.push({ x: x - 0.41, y: 0, z, ry: -Math.PI / 2 }, { x: x + 0.41, y: 0, z, ry: Math.PI / 2 });
    }
    for (const x of ROWS) { c.e.colliders.add(x - 0.4, Z0 - 0.5, x + 0.4, GAPS[0] - 1.15); c.e.colliders.add(x - 0.4, GAPS[0] + 1.15, x + 0.4, GAPS[1] - 1.15); c.e.colliders.add(x - 0.4, GAPS[1] + 1.15, x + 0.4, Z1 + 0.5); }
    instanced(c, G.rack(), mat('rack', { uv: 1 }), racks);
    const ledGeo = new THREE.PlaneGeometry(0.98, 2.1).translate(0, 1.1, 0);
    const ledIM = instanced(c, ledGeo, new THREE.MeshBasicMaterial({ map: tex('leds', {}, false), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), leds, leds.map(() => 0xffffff));
    c.flags.leds = leds; c.flags.ledIM = ledIM;
    // gap fillers: racks that slide into cross-aisles when you aren't looking
    const fillIM = instanced(c, G.rack(), mat('rack', { uv: 1 }), fill);
    c.flags.fills = fill.map((f, i) => ({ i, f, col: Object.assign(c.e.colliders.add(f.x - 0.4, f.z - 0.55, f.x + 0.4, f.z + 0.55), { on: false }), on: false }));
    c.flags.setFill = (k, on) => { const F = c.flags.fills[k]; F.on = on; F.col.on = on; setInstance(fillIM, F.i, { s: on ? 1 : 0.0001 }); };
    // water
    const wt = tex('water'); wt.repeat.set(12, 25);
    const water = c.mesh(new THREE.PlaneGeometry(24, 50).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: wt, transparent: true, opacity: 0.88, color: 0x557788 }), 0, 0.3, -15);
    c.flags.water = water;
    c.onUpdate(dt => { wt.offset.x += dt * 0.004; wt.offset.y += dt * 0.007; });
    // ceiling strips (instanced, lit after power)
    const strips = []; for (const x of [-10, -6, -2, 2, 6, 10]) for (let z = -36; z <= 6; z += 6) strips.push({ x, y: H - 0.05, z });
    c.flags.stripIM = instanced(c, new THREE.BoxGeometry(0.2, 0.05, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), strips, strips.map(() => 0x111111));
    c.flags.strips = strips;
    // LED blink animation
    let bt = 0;
    c.onUpdate(dt => { bt += dt; if (bt > 0.6 && !c.flags.ledsDead) { bt = 0; for (let k = 0; k < 6; k++) { const i = (c.rng() * leds.length) | 0; if (!c.flags.ledOff?.[i]) setInstanceColor(ledIM, i, c.rng() < 0.3 ? 0x333333 : 0xffffff); } } });
    // occasional drips
    let dt2 = 0; c.onUpdate(dt => { dt2 += dt; if (dt2 > 2.5) { dt2 = 0; const h = c.head(); c.g.audio.drip(new THREE.Vector3(h.x + (c.rng() - 0.5) * 12, 3, h.z + (c.rng() - 0.5) * 12)); } });
    // breaker panel
    c.box(-18.9, 0.8, -2, 0.1, 1.4, 1.2, metal);
    c.flags.breaker = c.sign(-18.82, 1.5, -2, Math.PI / 2, 'BREAKER\nFUSES 0/4', { w: 1.0, h: 0.5, size: 56, bg: '#1a1a14', color: '#cc9' });
    c.flags.breakerIt = c.interact(c.flags.breaker, 'insert fuses', () => { });
    c.note(-16, 0.9, -6.5, 0, ...N.fuses, { flat: false });
    // cooling valves (east room wall x=19)
    const dates = ['2019-03', '2011-07', '2023-11', '2016-01'];
    c.flags.valves = dates.map((d, i) => {
      const z = -19 + i * 2.2;
      const v = c.mesh(G.valve(), mat('lambert', { color: 0x8a2a20 }), 18.8, 1.3, z, Math.PI / 2); v.userData.shared = true;
      c.box(18.95, 0, z, 0.1, 3, 0.15, metal);
      c.sign(18.85, 1.75, z, -Math.PI / 2, d, { w: 0.45, h: 0.14, size: 50, bg: '#222', color: '#ddd' });
      return { v, date: d, it: c.interact(v, 'turn valve ' + d, () => { }) };
    });
    c.note(13, 0.9, -11.3, Math.PI, ...N.valves, { flat: false });
    // archive: drawers & terminal & lift
    for (let x = -6; x <= 6; x += 1.5) if (Math.abs(x) > 1) for (const z of [-48, -45]) c.box(x, 0, z, 1.2, 2.4, 0.8, mat('metal', { t: { base: '#4a4840' } }), { collide: true });
    c.flags.archDoor = c.door(0, -40, { axis: 'x', w: 1.6, m: mat('metal'), locked: { msg: 'NO POWER' } });
    c.flags.archTerm = c.terminal(-3.5, -42, Math.PI, 'ARCHIVE', N.final[1]);
    c.note(3, 0.01, -42, 0.3, ...N.archive);
    c.box(0, 0, -49.95, 1.8, 2.6, 0.1, mat('metal', { t: { base: '#6a6a60' } }));
    c.sign(0, 2.8, -49.85, 0, 'FREIGHT', { w: 0.8, h: 0.2, size: 60, bg: '#111', color: '#888' });
    // notes in the hall
    c.note(-1.2, 0.31, 8, 0.2, ...N.arrive, {});
    c.note(-6, 1.2, -15.4, 0, ...N.tech, { flat: false });
    c.note(2, 1.3, -28.5, 0, ...N.racks, { flat: false });
    c.note(-10, 1.3, 4.5, Math.PI / 2, ...N.shift, { flat: false });
    c.note(10.5, 1.3, -33, -Math.PI / 2, ...N.cold, { flat: false });
    // fuses in the aisles
    c.flags.fusePos = [[-6, 0.95, -30], [6, 0.95, -4], [-2, 0.95, -18], [10, 0.95, -26]];
    // batteries
    [[-14, -6], [16, -12], [-10, -36], [2, -14], [-4, -1]].forEach(([x, z]) => c.battery(x, 1.0, z));
    // platforms for battery/fuse placement (small crates)
    [[-14, -6], [16, -12], [-10, -36], [2, -14], [-4, -1], ...c.flags.fusePos.map(p => [p[0], p[2]])].forEach(([x, z]) => c.box(x, 0, z, 0.5, 0.92, 0.5, mat('wood', { uv: 1 }), { collide: true }));
    // fragments
    [[-10, 1.6, -20], [-6, 0.6, 1], [-2, 2.4, -33], [2, 0.6, -6], [6, 1.6, -24], [10, 0.6, -14], [-11, 0.6, 9], [11, 2, 8],
      [-17, 1, 2], [17, 0.8, -20], [-5, 1.2, -47], [5, 1.2, -47], [0, 3.8, -20], [-2, 0.6, -38], [8, 1.2, -38]].forEach(p => c.fragment(...p));
    c.e.points[0].intensity = 0; c.e.points[1].intensity = 0;
  },
  stages: [
    { // 0 arrive
      spawn: [0, 11.5, 0], obj: 'Find the breaker room.',
      async run(c) {
        c.say('The elevator opens onto water. Thousands of tiny lights blink in rows, like breathing.', 6);
        await c.reach(-15, -2, 3);
      },
    },
    { // 1 fuses
      spawn: [-15, -2, -Math.PI / 2], obj: 'Find four fuses in the server aisles.',
      async run(c) {
        const F = c.flags;
        F.fusePos.forEach((p, i) => c.pickup(p[0], p[1], p[2], 'fuse' + i, 'fuse', G.fuse(), mat('emissive', { color: 0xc8a040 })));
        // aisles rearrange when not watched
        const shuffler = c.when([0, 1, -16], () => {
          const k = (c.rng() * F.fills.length) | 0, F2 = F.fills[k];
          const h = c.head(); if (Math.hypot(F2.f.x - h.x, F2.f.z - h.z) < 4 || c.observed([F2.f.x, 1, F2.f.z], 70)) return false;
          c.flags.setFill(k, !F2.on); if (c.rng() < 0.4) c.g.audio.slam(new THREE.Vector3(F2.f.x, 1, F2.f.z));
          return false;
        }, { repeat: true, after: 6, minDist: 0, half: 1 });
        c.director.allow.add('echo');
        await c.until(() => [0, 1, 2, 3].every(i => c.g.player.inventory.has('fuse' + i)));
        c.objective('Insert the fuses in the breaker.');
        await c.used(F.breakerIt);
        shuffler.dead = true;
        F.fills.forEach((f, k) => F.setFill(k, false));
      },
    },
    { // 2 power + valves
      spawn: [-15, -2, Math.PI / 2], obj: 'Open the cooling valves in the right order.',
      async run(c) {
        const F = c.flags;
        F.breaker.userData.set('BREAKER\nFUSES 4/4');
        c.g.audio.slam(new THREE.Vector3(-18, 1.5, -2)); c.g.audio.beep(120, 0.6, 0.1);
        F.strips.forEach((s, i) => setInstanceColor(F.stripIM, i, 0xc8d8e0));
        c.e.hemi.intensity = 0.32;
        c.g.audio.setHum(0.02);
        const order = ['2011-07', '2016-01', '2019-03', '2023-11'];
        let k = 0;
        while (k < 4) {
          const turned = await Promise.race(F.valves.map(v => c.used(v.it).then(() => v)));
          turned.v.rotation.z += 1.5; c.g.audio.creak(turned.v.position, 0.8);
          if (turned.date === order[k]) { k++; c.g.audio.beep(600 + k * 200, 0.1, 0.06); }
          else {
            k = 0; c.g.audio.stinger('wrong'); c.g.audio.slam(new THREE.Vector3(0, 1, -15));
            c.g.hud.msg('SEQUENCE REJECTED. THE HALL REMEMBERS.', 3, 'warn');
            F.water.position.y = 0.6; c.g.director.fire('whisper');
            await c.sleep(2.5); F.water.position.y = 0.3;
            F.valves.forEach(v => v.v.rotation.z = 0);
          }
        }
        c.g.hud.msg('COOLING RESTORED', 3);
      },
      skip(c) { c.flags.strips.forEach((s, i) => setInstanceColor(c.flags.stripIM, i, 0xc8d8e0)); c.e.hemi.intensity = 0.32; c.flags.breaker.userData.set('BREAKER\nFUSES 4/4'); },
    },
    { // 3 cold boot set piece + hunt to archive
      spawn: [14, -16, Math.PI / 2], obj: 'Get to the archive at the north end.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.g.entity;
        c.director.enabled = false;
        await c.sleep(2);
        c.g.hud.msg('COLD BOOT INITIATED', 4, 'warn');
        F.strips.forEach((s, i) => setInstanceColor(F.stripIM, i, 0x111111)); c.e.hemi.intensity = 0.05; a.setHum(0);
        // LEDs die in a wave from the far end toward you
        F.ledOff = {}; const h0 = c.head();
        const order = F.leds.map((l, i) => [i, -Math.hypot(l.x - h0.x, l.z - h0.z)]).sort((p, q) => p[1] - q[1]);
        let n = 0; const total = order.length;
        await c.until(() => {
          for (let s = 0; s < 6 && n < total; s++, n++) { F.ledOff[order[n][0]] = 1; setInstanceColor(F.ledIM, order[n][0], 0x000000); }
          if (n % 60 === 0) a.creak(new THREE.Vector3(h0.x, 3, h0.z - 10), 0.3);
          return n >= total;
        });
        F.ledsDead = true;
        a.silence(4);
        await c.sleep(4);
        // it is standing behind you
        const p = c.director.behindPos(1.3), h = c.head();
        ent.glimpse(p.x, p.z, Math.atan2(-(h.x - p.x), -(h.z - p.z)), { vanish: 0.6 });
        c.director._behindArmed = true;
        const t0 = c.timeT; await c.until(() => ent.mode === 'off' || c.timeT - t0 > 12); ent.off();
        await c.sleep(1.5);
        F.archDoor.locked = null; F.archDoor.open(); a.slam(new THREE.Vector3(0, 1, -40));
        c.g.hud.msg('ARCHIVE UNLOCKED', 3);
        // the hall lights come back, red
        F.strips.forEach((s, i) => setInstanceColor(F.stripIM, i, 0x803028));
        ent.hunt({ delay: 12, aggression: 0.3 }); ent.surface = 'water';
        c.director.enabled = true; c.director.allow = new Set(['whisper', 'lie', 'echo']);
        await c.reach(0, -42, 1.6);
        ent.off(); F.archDoor.close(true);
      },
      skip(c) { c.flags.archDoor.locked = null; c.flags.strips.forEach((s, i) => setInstanceColor(c.flags.stripIM, i, 0x803028)); },
    },
    { // 4 archive
      spawn: [0, -42, 0], obj: 'Search the archive. Take the freight lift.',
      async run(c) {
        c.flags.archDoor.close(true); c.flags.archDoor.locked = { msg: 'SEALED' };
        c.g.player.surface = 'hard';
        c.point(0, 0, 3, -45, 0xaabbcc, 2.5, 9);
        await c.used(c.flags.archTerm.it);
        await c.sleep(2);
        c.g.audio.knock(new THREE.Vector3(0, 1.5, -40), 4, 1);
        c.say('Something knocks on the archive door from the water side. Four times. Then it tries the handle, the way you would.', 6);
        const lift = c.mesh(new THREE.BoxGeometry(1.6, 2.4, 0.05), mat('emissive', { color: 0x223322 }), 0, 1.3, -49.85);
        await c.reach(0, -49, 1.2);
        c.g.audio.slam(new THREE.Vector3(0, 1, -49));
        await c.sleep(3);
      },
    },
  ],
};
