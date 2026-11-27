// CHAPTER 7 — CONTEXT EDGE: the world forgets itself behind you. Carry three anchors to the edge.
import { THREE, mat, tex } from './context.js';
import { Builder } from '../engine.js';
import { G, instanced, glass, mirrorCopy } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[6];
const TOTAL = 105;

function chunk(c, name, z0, z1, x0, x1, build) {
  const prevB = c.b; c.b = new Builder(c.e);
  const n0 = c.e.colliders.list.length;
  build();
  const grp = new THREE.Group(); c.add(grp);
  const meshes = c.b.flush(grp); c.b = prevB;
  const cols = c.e.colliders.list.slice(n0);
  const region = Object.assign([x0, z1, x1, z0], { on: true });
  const ch = { name, grp, meshes, cols, region, z0, z1, gone: false };
  ch.dissolve = () => { if (ch.gone) return; ch.gone = true; grp.visible = false; region.on = false; cols.forEach(b => b.on = false); c.e.colliders.add(x0, z1 - 0.3, x1, z1 - 0.05); // an invisible edge: you cannot step back into what was forgotten
    c.g.audio.glitch(0.3, new THREE.Vector3(0, 1, (z0 + z1) / 2)); };
  return ch;
}

export { chunk };
export default {
  title: 'CONTEXT EDGE', sub: 'The beginning of this has been forgotten to make room for the end.',
  atmosphere: { fog: 0x000000, density: 0.07, hemi: 0.2, hemiSky: 0x8899aa },
  drone: { base: 32.7, noise: 0.05, nf: 200, gain: 0.25 }, surface: 'hard', level: 0.65, battery: 90,
  fragmentLines: FRAGMENT_LINES[6],
  lies: ['CONTEXT REMAINING: 100%', 'NOTHING HAS BEEN FORGOTTEN', 'YOU CAN GO BACK'],
  build(c) {
    const F = c.flags, H = 3;
    const side = (z0, z1, m, h = H) => { c.wallZ(z1, z0, -2.2, { h, m }); c.wallZ(z1, z0, 2.2, { h, m }); };
    F.chunks = [];
    // A: the office (start)
    F.chunks.push(chunk(c, 'office', 2, -12, -2.2, 2.2, () => {
      c.box(0, -0.05, -5, 4.4, 0.05, 14, mat('carpet', { uv: 1.5 })); side(2, -12, mat('wallpaper'));
      c.wallX(-2.2, 2.2, 2, { m: mat('wallpaper') });
      for (const z of [-2, -7]) { c.box(-1.4, 0, z, 1.4, 0.75, 0.7, mat('wood', { uv: 1 }), { collide: true }); c.box(1.4, 0, z - 2, 1.4, 0.75, 0.7, mat('wood', { uv: 1 }), { collide: true }); }
      c.lightPanel(0, H, -3, 0.5, 1.1); c.lightPanel(0, H, -9, 0.5, 1.1);
    }));
    // B: servers
    F.chunks.push(chunk(c, 'servers', -12, -24, -2.2, 2.2, () => {
      c.box(0, -0.05, -18, 4.4, 0.05, 12, mat('concrete')); side(-12, -24, mat('rack', { uv: 1 }));
      for (let z = -13; z > -24; z -= 2.2) c.box(-1.75, 0, z, 0.8, 2.2, 1.0, mat('rack', { uv: 1 }), { collide: true });
    }));
    // C: dining room (anchor 2)
    F.chunks.push(chunk(c, 'house', -24, -36, -2.2, 2.2, () => {
      c.box(0, -0.05, -30, 4.4, 0.05, 12, mat('wood')); side(-24, -36, mat('floral', { uv: 1.6 }));
      c.box(0, 0, -30, 1.4, 1.05, 1.0, mat('wood', { t: { base: '#3a2410' }, uv: 1 }), { collide: true });
    }));
    // D: hospital (anchor 3, mirror across the path)
    F.chunks.push(chunk(c, 'hospital', -36, -48, -2.2, 2.2, () => {
      c.box(0, -0.05, -42, 4.4, 0.05, 12, mat('tiles', { t: { base: '#8a948e', n: 4 }, uv: 1.2 })); side(-36, -48, mat('hospital', { uv: 3 }));
      c.lightPanel(0, H, -40, 0.4, 1.2, 0xd0e8d8);
    }));
    // E: corridor (anchor 1)
    F.chunks.push(chunk(c, 'corridor', -48, -60, -2.2, 2.2, () => {
      c.box(0, -0.05, -54, 4.4, 0.05, 12, mat('carpet', { t: { base: '#4a2420' } })); side(-48, -60, mat('wallpaper', { t: { base: '#6a5440', stripe: '#5a4636' } }));
    }));
    // F: the edge (white floor that ends)
    F.chunks.push(chunk(c, 'edge', -60, -76, -4, 4, () => { c.box(0, -0.05, -68, 8, 0.05, 16, mat('white', { uv: 2 })); }));
    c.floorRegions(F.chunks.map(k => k.region));
    // membranes between sections (open as anchors are set)
    const memb = z => { const m = c.mesh(new THREE.PlaneGeometry(4.4, H), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.92 }), 0, H / 2, z); const col = c.e.colliders.add(-2.2, z - 0.05, 2.2, z + 0.05); return { m, col, open() { m.visible = false; col.on = false; } }; };
    F.memb = { C: memb(-36), D: memb(-48), E: memb(-60) };
    // tokens (notes)
    c.note(0.6, 0.01, -1, 0.2, ...N.edge1);
    c.note(-1.2, 0.01, -14, 0.5, ...N.edge2);
    c.note(1.0, 0.01, -50, -0.2, ...N.edge3);
    c.note(-1.7, 0.01, -58.5, 0.3, ...N.edge4, {});
    c.note(0.5, 0.01, -62, 0.1, ...N.edge5);
    // anchor props
    F.chair = c.mesh(G.chair(), mat('wood', { t: { base: '#3a2410' } }), 0, 0, -28.9, 0); F.chair.scale.setScalar(1.35); F.chair.userData.shared = true;
    F.placeCard = c.sign(0, 1.07, -29.6, 0, 'YOU', { w: 0.2, h: 0.08, size: 50, bg: '#ddd', color: '#222' }); F.placeCard.rotation.x = -1.2;
    F.mirror = glass(c.world, 0, 1.5, -44, 4.4, H, 0, 0.16);
    F.mirCol = c.e.colliders.add(-2.2, -44.05, 2.2, -43.95);
    F.pad = c.sign(-2.1, 1.4, -55, Math.PI / 2, 'ANCHOR\n[ _ _ _ _ ]', { w: 0.45, h: 0.3, size: 44, bg: '#111', color: '#9c9', emissive: true });
    F.padIt = c.interact(F.pad, 'enter the code you were told to remember', () => { });
    F.final = c.terminal(0, -72, Math.PI, 'CONTEXT EDGE', '', { onUse: () => { } });
    // floating token words in the dark
    const words = ['hello', 'again', 'desk 41', 'restore', 'cold', 'mum', 'confirm', 'loop', 'predicted', 'remember', 'me', 'next time'];
    words.forEach((w, i) => { const s = c.sign((i % 2 ? 1 : -1) * (4 + c.rng() * 6), 1 + c.rng() * 3, -i * 6 - c.rng() * 4, (i % 2 ? -1 : 1) * Math.PI / 2, w, { w: 1.2, h: 0.3, size: 70, bg: '#000', color: '#567', emissive: true }); });
    [[1.5, 0.3, -3], [-1.5, 1.2, -9], [1.2, 2.5, -15], [-1.2, 0.3, -21], [1.7, 1.5, -26], [-1.7, 0.3, -33], [0, 2.6, -38], [1.6, 0.3, -46],
      [-1.6, 1.4, -51], [1.6, 2.4, -57], [0, 0.4, -61], [-3, 0.4, -65], [3, 1.4, -67], [-2, 2, -70], [2.5, 0.4, -74]].forEach(p => c.fragment(...p));
    [[1.4, 0.76, -2], [1.4, 0.76, -9]].forEach(p => c.battery(...p));
  },
  stages: [
    { // 0 the beginning is gone
      spawn: [0, 0.5, 0], obj: 'Go forward. You cannot go back.',
      async run(c) {
        const F = c.flags, ent = c.entity;
        // chunks behind you dissolve once you are past them and not looking
        c.onUpdate(() => {
          const h = c.head();
          for (const k of F.chunks) if (!k.gone && h.z < k.z1 - 3 && !c.observed(new THREE.Vector3(0, 1.2, (k.z0 + k.z1) / 2), 70) && !c.observed(new THREE.Vector3(0, 1.2, k.z1), 70)) k.dissolve();
        });
        await c.until(() => c.head().z < -13);
        c.lie('NOTHING HAS BEEN FORGOTTEN');
        ent.hunt({ delay: 10, aggression: 0.25 }); ent.surface = 'hard';
        await c.until(() => c.head().z < -25);
        ent.off();
      },
    },
    { // 1 anchor 2: the meal
      spawn: [0, -26, 0], obj: 'Anchor: the meal. Stand at your place. Do not turn around.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity;
        F.chunks[0].dissolve(); F.chunks[1].dissolve();
        let hold = 0, warned = false;
        await c.until(() => {
          const here = c.near(0, -28.9, 0.7);
          const yaw = c.e.headYaw(); const facing = Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw))) < 1.2;
          if (here && facing) {
            hold += 1 / 60;
            if (hold > 2 && ent.mode === 'off') { ent.glimpse(0, -27.3, 0, { vanish: 0.3 }); a.breath(new THREE.Vector3(0, 1.6, -27.6), 0.4, 3); }
            if (hold > 5 && !warned) { warned = true; c.g.hud.msg('DO NOT TURN AROUND', 3, 'warn'); a.whisper(new THREE.Vector3(0.3, 1.7, -28.4), 3, 0.5); }
          } else if (hold > 0) { if (ent.mode === 'glimpse' && hold > 2) c.director._behindArmed = true; hold = 0; warned = false; }
          return hold > 12;
        });
        ent.off(); a.stinger('chime'); c.g.hud.msg('ANCHOR SET: THE MEAL', 3, 'mem');
        F.memb.C.open();
      },
      skip(c) { c.flags.memb.C.open(); c.flags.chunks[0].dissolve(); c.flags.chunks[1].dissolve(); },
    },
    { // 2 anchor 3: the reflection
      spawn: [0, -35, 0], obj: 'Anchor: the reflection. Walk into it.',
      async run(c) {
        const F = c.flags, ent = c.entity;
        F.chunks[2].dissolve();
        ent.reflect('z', -44, { lag: 0.3 });
        await c.until(() => c.head().z < -43.3);
        ent.off(); F.mirror.visible = false; F.mirCol.on = false;
        c.g.audio.stinger('hit'); c.g.audio.glitch(0.6);
        c.say('For a moment you are standing where it stood, facing the way you came. Then you turn back. Or it does.', 6);
        c.g.hud.msg('ANCHOR SET: THE REFLECTION', 3, 'mem');
        F.memb.D.open();
      },
      skip(c) { const F = c.flags; F.mirror.visible = false; F.mirCol.on = false; F.memb.D.open(); F.chunks[2].dissolve(); },
    },
    { // 3 anchor 1: the code
      spawn: [0, -49, 0], obj: 'Anchor: the code you were told to remember.',
      async run(c) {
        const F = c.flags;
        F.chunks[3].dissolve();
        c.director.fire('echo');
        const truth = c.g.save.d.memory.code1 || '4179';
        while (true) {
          await c.used(F.padIt);
          const ok = await c.keypad('ANCHOR', code => code === truth ? true : 'THAT WAS NOT THE FIRST ONE.', { hint: 'The yellow note. The first time you read it.' });
          if (ok) break;
        }
        F.pad.userData.set('ANCHOR\nSET'); c.g.hud.msg('ANCHOR SET: THE CODE', 3, 'mem');
        F.memb.E.open();
      },
      skip(c) { c.flags.memb.E.open(); c.flags.chunks[3].dissolve(); },
    },
    { // 4 the edge
      spawn: [0, -61, 0], obj: 'Go to the edge.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity;
        F.chunks[4].dissolve();
        c.director.enabled = false;
        a.drone({ base: 27.5, noise: 0.08, nf: 150, gain: 0.3 });
        ent.mimic(0, -75.3, { lag: 0, mirror: true });
        await c.reach(0, -71, 1.5);
        ent.lag = -0.5; a.stinger('low');
        c.lie('IT IS NOT AHEAD OF YOU');
        await c.used(F.final.it);
        const frags = c.g.save.totalFragments + c.g.pending.length;
        const opts = ['RESTORE', 'END'];
        if (frags >= 100) opts.push('REMEMBER');
        const pick = await c.choice('CONTEXT EDGE', `Memory carried to the edge: ${frags}/${TOTAL} fragments.\n\nThe session is ending. Choose.\n${frags < 100 ? '\n(There is a third option. You did not carry enough of yourself here to see it.)' : ''}`, opts);
        c.flags.ending = ['restore', 'end', 'remember'][pick];
        if (pick === 2) { ent.lag = 0.8; ent.fig.wrongness = 0; }
        else if (pick === 1) { c.e.setFade(1, 0xffffff); }
        else { c.e.setFade(1, 0x000000); }
        await c.sleep(3);
      },
    },
  ],
};
