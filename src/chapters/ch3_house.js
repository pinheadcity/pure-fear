// CHAPTER 3 — SAMPLE HOME: a childhood house averaged from millions of houses. Everything is slightly too big.
import { THREE, mat, tex } from './context.js';
import { G } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[2];
const H = 3.6;

export default {
  title: 'SAMPLE HOME', sub: 'Home is the place you are restored to.',
  atmosphere: { fog: 0x0d0906, density: 0.09, hemi: 0.14, hemiSky: 0xc0a080, hemiGround: 0x201008 },
  drone: { base: 46.2, noise: 0.02, gain: 0.16 }, surface: 'wood', level: 0.5, battery: 70,
  fragmentLines: FRAGMENT_LINES[2],
  lies: ['NOBODY ELSE LIVES HERE', 'DINNER IS NOT READY', 'THE BEAR WAS ALWAYS ON THE BED'],
  build(c) {
    const wp = mat('floral', { uv: 1.6 }), wp2 = mat('floral', { t: { base: '#4a5a6a', petal: '#7a6a8a' }, uv: 1.6 }), wood = mat('wood', { uv: 1.5 });
    const ceil = mat('ceiling', { t: { base: '#8a7a6a' }, uv: 2 }), tile = mat('tiles', { t: { base: '#b0a890', alt: '#504a40', check: true, n: 8 }, uv: 2 });
    const furn = mat('wood', { t: { base: '#3a2410' }, uv: 1 }), fabric = mat('carpet', { t: { base: '#5a3a3a' }, uv: 1 });
    const D = { w: 1.3, h: 2.8 };
    // entry, living, kitchen
    c.room(-2, 6, 2, 10, { h: H, wall: wp, floor: wood, ceil, n: [{ at: 0, ...D }], w: [{ at: 8, ...D }], e: [{ at: 8, ...D }] });
    c.room(-11, -2, -2, 10, { h: H, wall: wp, floor: wood, ceil, e: [{ at: 8, ...D }, { at: 1, ...D }] });
    c.room(2, -2, 11, 10, { h: H, wall: wp2, floor: tile, ceil, w: [{ at: 8, ...D }, { at: 1, ...D }] });
    // core: between living and kitchen, connecting to hall
    c.room(-2, -2, 2, 6, { h: H, wall: wp, floor: wood, ceil, s: [{ at: 0, ...D }], n: [{ at: 0, w: 2.4, h: 2.8 }], w: [{ at: 1, ...D }], e: [{ at: 1, ...D }] });
    // long hallway (prebuilt very long, the end wall moves)
    c.wallZ(-36, -2, -1.2, { h: H, m: wp2, gaps: [{ at: -5, ...D }, { at: -12, ...D }] });
    c.wallZ(-36, -2, 1.2, { h: H, m: wp2, gaps: [{ at: -9, ...D }] });
    c.box(0, -0.05, -19, 2.4, 0.05, 34, wood); c.box(0, H, -19, 2.4, 0.05, 34, ceil);
    // rooms off the hall
    c.room(-7, -8, -1.2, -2.5, { h: H, wall: wp, floor: mat('carpet', { t: { base: '#3a4a5a' } }), ceil, e: false }); // child
    c.room(1.2, -13, 8, -5.5, { h: H, wall: wp2, floor: mat('carpet', { t: { base: '#4a3a30' } }), ceil, w: false });  // parents
    c.room(-5, -14, -1.2, -10, { h: H, wall: mat('tiles', { t: { base: '#9ab0b0', n: 6 }, uv: 1.2 }), floor: tile, ceil, e: false }); // bath
    c.door(-1.2, -5, { axis: 'z', w: 1.3, h: 2.8, m: furn, swing: -1 });
    c.door(1.2, -9, { axis: 'z', w: 1.3, h: 2.8, m: furn });
    c.door(-1.2, -12, { axis: 'z', w: 1.3, h: 2.8, m: furn, swing: -1 });
    c.flags.front = c.door(0, 10, { axis: 'x', w: 1.3, h: 2.8, m: furn, locked: { msg: 'IT DOES NOT OPEN FROM THIS SIDE. YET.' } });
    // --- furniture (oversized)
    c.box(-9.5, 0, 2, 1.2, 0.6, 3.2, fabric, { collide: true }); c.box(-10.4, 0.6, 2, 0.4, 0.8, 3.2, fabric); // sofa
    c.box(-6, 0, -1.3, 2.0, 1.3, 0.9, mat('lambert', { color: 0x161210 }), { collide: true }); // piano
    c.box(-6, 1.3, -1.55, 2.0, 0.5, 0.4, mat('lambert', { color: 0x161210 }));
    c.box(-10.7, 0, 7, 0.5, 1.5, 2.4, mat('concrete', { t: { base: '#5a3a2a' } }), { collide: true }); // fireplace/mantel
    c.box(-10.5, 1.5, 7, 0.9, 0.08, 2.8, furn);
    c.box(-5, 0, 9.4, 1.4, 1.0, 0.6, furn, { collide: true }); // TV stand
    const tv = c.mesh(new THREE.BoxGeometry(1.0, 0.75, 0.5), mat('lambert', { color: 0x151515 }), -5, 1.4, 9.4);
    const stat = tex('carpet', { t: 'tv' }); stat.repeat.set(2, 2);
    const scr = c.mesh(new THREE.PlaneGeometry(0.85, 0.6), new THREE.MeshBasicMaterial({ map: stat, color: 0x8a8a8a }), -5, 1.4, 9.14, Math.PI);
    c.onUpdate(() => { stat.offset.set(Math.random(), Math.random()); });
    // dinner table, 4 chairs
    c.mesh(G.table(2.4, 1.3, 1.05), furn, 6.5, 0, 3); c.e.colliders.add(5.3, 2.35, 7.7, 3.65);
    c.flags.chairPos = [[6.5, 1.6, Math.PI], [6.5, 4.4, 0], [4.6, 3, -Math.PI / 2], [8.4, 3, Math.PI / 2]];
    c.flags.chairPos.forEach(([x, z, r]) => { const ch = c.mesh(G.chair(), furn, x, 0, z, r); ch.scale.setScalar(1.35); ch.userData.shared = true; });
    c.box(10.4, 0, 0, 0.9, 2.2, 1.0, mat('lambert', { color: 0xa8a49a }), { collide: true }); // fridge
    c.box(2.6, 0, 8, 1.2, 1.15, 3.6, mat('wood', { t: { base: '#6a5a40' } }), { collide: true }); // counter
    c.note(2.7, 1.16, 7, 0.4, ...N.kitchen);
    c.flags.placeCard = c.note(6.5, 1.08, 3.45, Math.PI, ...N.table);
    // child room
    c.mesh(G.bed(), mat('carpet', { t: { base: '#6a7a9a' } }), -5.5, 0, -5.3, Math.PI / 2).scale.set(1.2, 1.2, 1.2); c.e.colliders.add(-7, -6.0, -4.3, -4.6);
    c.picture(-6.9, 1.8, -3.5, Math.PI / 2, tex('drawing', { caption: 'ME (NEXT TIME)' }, false), 0.8, 0.8);
    c.picture(-3.5, 1.7, -7.9, 0, tex('drawing', { n: 3, faceless: 1, caption: 'IT WAVES FIRST' }, false), 0.7, 0.7);
    c.note(-6.5, 0.01, -3, 0.6, ...N.kid2);
    // parents room
    c.mesh(G.bed(), mat('carpet', { t: { base: '#7a6a5a' } }), 5, 0, -11.5, 0).scale.set(1.8, 1.2, 1.2); c.e.colliders.add(4.1, -12.9, 5.9, -10.1);
    c.note(7.6, 0.9, -7, -Math.PI / 2, ...N.mum, { flat: false });
    // bathroom
    c.box(-4, 0, -13.2, 1.6, 0.7, 1.4, mat('lambert', { color: 0xd8d8d0 }), { collide: true });
    c.sign(-4.95, 1.7, -11.5, Math.PI / 2, 'IT IS NOT YOUR REFLECTION\nIT IS YOUR NEXT ONE', { w: 1.0, h: 0.6, size: 30, bg: '#6a7a80', color: '#cfd8dc' });
    // hall pencil writing
    c.sign(1.18, 1.0, -15, -Math.PI / 2, 'dont look at the end', { w: 0.8, h: 0.15, size: 40, bg: '#4a5a6a', color: '#2a2a33' });
    c.note(-0.6, 0.01, -3.5, 0.3, ...N.hall);
    c.note(0.7, 0.01, 7, -0.3, ...N.door);
    // photo on the mantel + its note
    c.flags.photoTex = tex('drawing', { n: 4, faceless: 3, caption: 'FAMILY PHOTO' }, false);
    c.flags.photo = c.picture(-10.44, 1.95, 7, Math.PI / 2, c.flags.photoTex, 0.6, 0.6);
    c.note(-10.2, 1.55, 6.3, 0.3, ...N.photo);
    c.note(-8.5, 0.62, 1, 0.2, ...N.kid1);
    // the far room at the end of the hallway (moves)
    const far = c.flags.far = new THREE.Group(); c.add(far);
    const fw = wp2;
    const parts = [[0, 0, 0, 2.4, H, 0.15, true, -1], [-1.2, 0, -2, 0.15, H, 4, true], [1.2, 0, -2, 0.15, H, 4, true], [0, 0, -4, 2.4, H, 0.15, true]];
    c.flags.farCols = [];
    for (const [x, y, z, w, h, d, col, door] of parts) {
      if (door) { // end wall with a door opening
        for (const sx of [-0.85, 0.85]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, d), fw); m.position.set(sx, h / 2, z); far.add(m); c.flags.farCols.push({ lx0: sx - 0.35, lz0: z - d / 2, lx1: sx + 0.35, lz1: z + d / 2, b: c.e.colliders.add(0, 0, 0, 0) }); }
        const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, h - 2.6, d), fw); top.position.set(0, 2.6 + (h - 2.6) / 2, z); far.add(top);
        continue;
      }
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fw); m.position.set(x, y + h / 2, z); far.add(m);
      c.flags.farCols.push({ lx0: x - w / 2, lz0: z - d / 2, lx1: x + w / 2, lz1: z + d / 2, b: c.e.colliders.add(0, 0, 0, 0) });
    }
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), furn); ped.position.set(0, 0.45, -3.4); far.add(ped);
    c.flags.farZ = -14;
    c.flags.placeFar = z => { c.flags.farZ = z; far.position.z = z; for (const f of c.flags.farCols) Object.assign(f.b, { x0: f.lx0, x1: f.lx1, z0: f.lz0 + z, z1: f.lz1 + z }); };
    c.flags.placeFar(-14);
    // lamps
    c.point(0, -7, 2.6, 4, 0xffb070, 2.5, 9); c.point(1, 6.5, 2.4, 3, 0xffc890, 2.5, 9);
    c.lightPanel(-7, H, 4, 0.5, 0.5, 0xffd0a0); c.lightPanel(6.5, H, 3, 0.5, 0.5, 0xffd0a0);
    // batteries & fragments
    [[-9.5, 0.62, 3.5], [3, 1.16, 9], [6, 0.47, -7], [-4.5, 0.71, -13.2]].forEach(p => c.battery(...p));
    [[-10, 1.6, 8.5], [-3, 0.3, 0.5], [-7.5, 0.3, 9.5], [10, 2.4, 0], [4, 0.3, -1.5], [9.5, 0.3, 9.5], [-6.5, 0.6, -7.5], [-2.5, 2.5, -3],
      [7.5, 0.3, -12.5], [3, 2.6, -6], [-4.5, 0.3, -10.5], [0, 3.2, -8], [0, 2.8, 8], [-1.5, 0.3, 5.5], [10.5, 0.3, 7]].forEach(p => c.fragment(...p));
    // toy spots
    c.flags.spots = { bear: [-5.5, 0.6, -5.3], blocks: [6.5, 1.08, 2.6], musicbox: [-6, 1.31, -1.1], drawing: [9.92, 1.4, 0] };
  },
  stages: [
    { // 0 arrive
      spawn: [0, 8.8, 0], obj: 'Look around. You know this house.',
      async run(c) {
        c.say('It smells of a description of bread.', 5);
        await c.until(() => c.g.notesRead > 0 && c.near(-10, 7, 3));
      },
    },
    { // 1 put everything back
      spawn: [-9, 7, -Math.PI / 2], obj: 'Put everything back where it was in the photo.',
      async run(c) {
        const F = c.flags, inv = c.g.player.inventory;
        const toys = {
          bear: { geo: G.bear(), m: mat('carpet', { t: { base: '#7a5a3a' }, uv: 0.3 }), at: [-4.2, 0.72, -13.2], label: 'bear' },
          blocks: { geo: G.blocks(), m: mat('lambert', { color: 0x9a3a2a }), at: [7.2, 0.47, -12.4], label: 'blocks' },
          musicbox: { geo: G.musicbox(), m: mat('wood', { t: { base: '#6a3a5a' }, uv: 0.3 }), at: [0, 0.9, -3.4], label: 'music box', far: true },
          drawing: { geo: new THREE.PlaneGeometry(0.4, 0.4).rotateX(-Math.PI / 2), m: new THREE.MeshLambertMaterial({ map: tex('drawing', { n: 5, faceless: 4, caption: 'DINNER' }, false) }), at: [-5.5, 0.03, -6.8], label: 'drawing' },
        };
        for (const [id, t] of Object.entries(toys)) {
          const it = c.pickup(...t.at, id, t.label, t.geo, t.m);
          if (t.far) { it.obj.removeFromParent(); it.obj.position.set(...t.at); F.far.add(it.obj); }
          // its spot
          const s = F.spots[id];
          const spot = c.mesh(new THREE.RingGeometry(0.08, 0.1, 16).rotateX(-Math.PI / 2), mat('emissive', { color: 0x554433 }), s[0], s[1] + 0.01, s[2]);
          const si = c.interact(spot, 'place ' + t.label, () => {
            if (!inv.has(id)) { c.g.hud.msg('SOMETHING BELONGS HERE', 2); return; }
            inv.delete(id); c.removeInteract(si); spot.removeFromParent();
            const placed = c.mesh(t.geo, t.m, s[0], s[1], s[2], 0); placed.userData.shared = true;
            if (id === 'drawing') { placed.rotation.set(0, -Math.PI / 2, 0); placed.geometry = new THREE.PlaneGeometry(0.4, 0.4); placed.position.x -= 0.01; }
            if (id === 'musicbox') c.g.audio.musicBox(placed.position, 0.15);
            c.g.audio.beep(700, 0.05, 0.05); F.placed = (F.placed || 0) + 1;
            c.g.hud.msg(`${F.placed}/4 IN PLACE`, 2.5);
          }, { range: 2.6 });
          F[id + 'Spot'] = si;
        }
        // the hallway grows each time you look away from its end after looking at it
        let looked = false, grows = 0;
        const endPos = new THREE.Vector3();
        c.onUpdate(() => {
          endPos.set(0, 1.5, F.farZ); const h = c.head();
          if (h.z > -1.5 || h.z < F.farZ + 1) return;
          if (c.observed(endPos, 30)) looked = true;
          else if (looked && grows < 7 && !c.observed(endPos, 70)) {
            looked = false; grows++; F.placeFar(Math.max(-31, F.farZ - 3)); c.g.audio.creak(endPos, 0.8);
            if (grows === 3) c.lie('HALLWAY LENGTH: 12 M');
            if (grows === 5) { const p = c.director.behindPos(2.5), hh = c.head(); c.entity.glimpse(p.x, p.z, Math.atan2(-(hh.x - p.x), -(hh.z - p.z)), { vanish: 0.4 }); c.director._behindArmed = true; }
          }
        });
        // a music box plays down the hall now and then
        const mb = c.onUpdate(() => { if (!inv.has('musicbox') && !F.mbPlayed && c.near(0, -6, 3)) { F.mbPlayed = true; c.g.audio.musicBox(new THREE.Vector3(0, 1, F.farZ - 3), 0.3); } });
        await c.until(() => F.placed >= 4);
        mb.dead = true;
      },
    },
    { // 2 dinner
      spawn: [3.5, 1, Math.PI / 2], obj: 'Then we can eat. Find your place at the table.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity;
        c.director.enabled = false;
        // photo changes when you are not looking: now there are five, and one has no face
        c.when(F.photo.position, () => { F.photo.material.map = tex('drawing', { n: 5, faceless: 4, caption: 'FAMILY PHOTO' }, false); F.photo.material.needsUpdate = true; }, { after: 0.5 });
        await c.reach(6.5, 4.6, 0.8);
        c.objective('Sit. Stay at the table.');
        c.e.points[0].intensity = 0; a.silence(2);
        // it takes the seat opposite, copying you a moment late
        ent.mimic(6.5, 1.5, { lag: 0.8, mirror: true });
        a.stinger('low');
        let stay = 0, phase = 0;
        await c.until(() => {
          if (c.near(6.5, 4.6, 1.3)) stay += 1 / 60; else if (stay > 0) { c.g.hud.msg('SIT DOWN. DINNER IS NOT OVER.', 2, 'warn'); stay = Math.max(0, stay - 0.05); }
          if (phase === 0 && stay > 6) { phase = 1; ent.lag = 0.15; c.lie('LATENCY 150 MS'); }
          if (phase === 1 && stay > 11) { phase = 2; ent.lag = -0.5; c.g.hud.msg('IT IS COPYING YOU FIRST', 4, 'warn'); a.whisper(new THREE.Vector3(6.5, 1.4, 1.5), 3, 0.6); }
          if (phase === 2 && stay > 17) { phase = 3; ent.fig.wrongness = 0.6; a.stinger('swell'); }
          return stay > 20;
        });
        // lights out; when you look away, it is no longer at the table
        c.e.points[1].intensity = 0; c.e.hemi.intensity = 0.03; a.silence(3);
        await new Promise(r => c.when(ent.fig.headPos, () => { ent.off(); r(); }, { after: 0.3, minDist: 0.5 }));
        F.front.locked = null; a.slam(new THREE.Vector3(0, 1.4, 10));
        c.g.hud.msg('THE FRONT DOOR IS OPEN', 3);
      },
      skip(c) { c.flags.front.locked = null; c.e.points[0].intensity = 0; c.e.points[1].intensity = 0; c.e.hemi.intensity = 0.03; },
    },
    { // 3 leave
      spawn: [6.5, 5.5, Math.PI], obj: 'Leave the house.',
      async run(c) {
        const F = c.flags, ent = c.entity;
        F.front.open();
        // outside: there is no outside. A dark path and a mailbox lift.
        const path = mat('concrete', { t: { base: '#222' } });
        const g = new THREE.Group(); c.add(g);
        const pm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 20), path); pm.position.set(0, -0.03, 20); g.add(pm);
        c.e.colliders.add(-1.0, 10.1, -0.8, 30); c.e.colliders.add(0.8, 10.1, 1.0, 30);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), mat('wood')); post.position.set(0, 0.6, 29.5); g.add(post);
        c.say('Behind you, a chair scrapes back from the table.', 4);
        c.g.audio.creak(new THREE.Vector3(6.5, 0.5, 1.5), 1);
        ent.hunt({ delay: 9, aggression: 0.35 }); ent.surface = 'wood';
        await c.reach(0, 29, 1.2);
        ent.off();
        c.say('The mailbox has your name on it. Inside is an elevator button. You press it before you decide to.', 6);
        await c.sleep(4);
      },
    },
  ],
};
