// CHAPTER 6 — TRAINING DATA: a white void made of everything you have seen. It predicts you.
import { THREE, mat } from './context.js';
import { G, instanced, setInstance } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[5];
const OB = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2 + 0.3; return [Math.sin(a) * 24, -Math.cos(a) * 24]; });

export default {
  title: 'TRAINING DATA', sub: 'Everything here was made from things you have seen.',
  atmosphere: { fog: 0xe8e8e4, density: 0.035, hemi: 1.2, hemiSky: 0xffffff, hemiGround: 0xb0b0b0 },
  drone: { base: 55, noise: 0.015, nf: 3000, gain: 0.1 }, surface: 'void', level: 0.6, battery: 100,
  fragmentLines: FRAGMENT_LINES[5],
  lies: ['THIS IS NOT A TEST', 'YOU ARE UNPREDICTABLE', 'NOTHING IS FOLLOWING YOU'],
  build(c) {
    c.g.flashAllowed = false;
    const floor = c.mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), mat('white', { uv: 3 }), 0, 0, 0);
    floor.material.map.repeat.set(80, 80); c.flags.floor = floor;
    // black silhouettes of everything from before, floating
    const dark = mat('lambert', { color: 0x141414 }), items = [];
    const geos = [G.chair(), G.rack(), G.bed(), G.table(), G.monitor(), G.cabinet(), G.bear()];
    geos.forEach((g, gi) => {
      const list = []; for (let k = 0; k < 14; k++) { const a = c.rng() * 6.28, r = 8 + c.rng() * 60; list.push({ x: Math.sin(a) * r, y: 0.5 + c.rng() * 6, z: Math.cos(a) * r, ry: c.rng() * 6.28, s: gi === 6 ? 5 : 1 + c.rng() }); }
      items.push(instanced(c, g, dark, list));
    });
    c.flags.items = items;
    let t = 0; c.onUpdate(dt => { t += dt; items.forEach((im, k) => { im.position.y = Math.sin(t * 0.3 + k) * 0.3; im.rotation.y += dt * 0.004 * (k % 2 ? 1 : -1); }); });
    // obelisks
    c.flags.obelisks = OB.map(([x, z], i) => {
      const m = c.mesh(G.obelisk(), new THREE.MeshLambertMaterial({ color: 0x0a0a0a }), x, 0, z); m.userData.shared = true;
      c.e.colliders.add(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
      const ring = c.mesh(new THREE.RingGeometry(1.3, 1.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x222222 }), x, 0.01, z);
      return { x, z, m, ring, done: false };
    });
    const notes = [N.void1, N.void2, N.void3, N.void4, N.void5];
    OB.forEach(([x, z], i) => c.note(x * 0.8 + 1, 1.2, z * 0.8, Math.atan2(x, z) + Math.PI, ...notes[i], { flat: false }));
    // fragments
    for (let k = 0; k < 13; k++) { const a = c.rng() * 6.28, r = 5 + c.rng() * 30; c.fragment(Math.sin(a) * r, 0.4 + c.rng() * 1.6, Math.cos(a) * r); }
    c.flags.path = [];
    let px = 0, pz = -4;
    for (let i = 0; i < 28; i++) { c.flags.path.push([px, pz]); pz -= 1.6; if (i > 2 && c.rng() < 0.45) px += (c.rng() < 0.5 ? -1.6 : 1.6); }
  },
  stages: [
    { // 0 calibration
      spawn: [0, 4, 0], obj: 'Follow the instructions.',
      async run(c) {
        const a = c.g.audio, d = c.director;
        const panel = c.sign(0, 2.2, -5, 0, '', { w: 3, h: 0.8, size: 60, px: 1024, bg: '#f4f4f0', color: '#111', emissive: true });
        const say = t => { panel.userData.set(t); a.beep(1200, 0.05, 0.04); };
        const y0 = c.e.headYaw();
        say('THIS IS A TEST.\nYOU ARE NOT BEING TESTED.'); await c.sleep(5);
        say('LOOK LEFT.'); c.g.hud.msg('PREDICTION: YOU WILL LOOK LEFT', 3);
        await c.until(() => { const dy = Math.atan2(Math.sin(c.e.headYaw() - y0), Math.cos(c.e.headYaw() - y0)); return dy > 0.9; });
        say('PREDICTED.'); await c.sleep(2.5);
        say('NOW LOOK BEHIND YOU.'); c.g.hud.msg('PREDICTION: YOU WILL HESITATE', 3);
        const t0 = c.timeT; await c.until(() => { const dy = Math.atan2(Math.sin(c.e.headYaw() - y0), Math.cos(c.e.headYaw() - y0)); return Math.abs(dy) > 2.6; });
        // there is something there for a moment
        say(c.timeT - t0 > 3 ? 'YOU HESITATED. PREDICTED.' : 'PREDICTED.');
        const h = c.head(); c.entity.glimpse(h.x, h.z + 9, Math.PI, { vanish: 0.4 }); c.director._behindArmed = true;
        await c.sleep(3);
        panel.position.set(0, 2.2, -5); panel.rotation.y = 0;
        say('WALK. DO SOMETHING WE CANNOT PREDICT.');
        c.objective('Move unpredictably until predictability drops below 40%.');
        let low = 0;
        await c.until(() => {
          c.g.hud.extra = 'PREDICTABILITY ' + Math.round(d.predictability * 100) + '%';
          if (d.predictability < 0.4 && c.g.player.moveSpeed > 0.3) low += 1 / 60; else low = Math.max(0, low - 1 / 120);
          return low > 3;
        });
        say('UNEXPECTED.\nRECALIBRATING THE COPY.');
        a.stinger('low'); await c.sleep(4);
        panel.removeFromParent();
      },
    },
    { // 1 obelisks under pursuit
      spawn: [0, 0, 0], obj: 'Stand inside the rings of the five black pillars. It will try to be there first.',
      async run(c) {
        const F = c.flags, ent = c.entity, a = c.g.audio, d = c.director, mem = c.g.save.d.memory;
        const doneIdx = new Set(mem.ch6ob || []);
        F.obelisks.forEach((o, i) => { if (doneIdx.has(i)) { o.done = true; o.ring.material.color.set(0x9fe8ff); } });
        c.fragment(0, 1.0, 10); c.fragment(0, 1.0, -10);
        ent.fig.mat.color.set(0x111111); ent.fig.mat.emissive.set(0);
        await c.sleep(2);
        const relocate = () => { const h = c.head(), ang = Math.random() * 6.28; ent.pos.set(h.x + Math.sin(ang) * 22, 1.6, h.z + Math.cos(ang) * 22); };
        ent.stalk({ speed: 1.05, predict: 1.4, freezeWhenSeen: false }); relocate();
        c.director.allow = new Set(['whisper', 'lie', 'silence', 'breath']);
        let cur = -1, hold = 0;
        await c.until(() => {
          c.g.hud.extra = 'PREDICTABILITY ' + Math.round(d.predictability * 100) + '%   PILLARS ' + F.obelisks.filter(o => o.done).length + '/5';
          // the less predictable you are, the worse its aim
          ent.predict = 0.4 + d.predictability * 1.6;
          const h = c.head(); let inRing = -1;
          F.obelisks.forEach((o, i) => { if (!o.done && Math.hypot(h.x - o.x, h.z - o.z) < 1.6) inRing = i; });
          if (inRing !== cur) { cur = inRing; hold = 0; }
          if (cur >= 0) {
            hold += 1 / 60; const o = F.obelisks[cur]; o.ring.material.color.setScalar(Math.min(1, 0.15 + hold / 4));
            if (hold > 4) {
              o.done = true; o.ring.material.color.set(0x9fe8ff); a.stinger('chime', new THREE.Vector3(o.x, 2, o.z)); a.stinger('low');
              mem.ch6ob = F.obelisks.map((q, k) => q.done ? k : -1).filter(k => k >= 0); c.g.save.write();
              c.g.hud.msg(`PILLAR ${F.obelisks.filter(q => q.done).length}/5`, 3);
              if (!ent.observed) relocate();
              cur = -1;
            }
          }
          return F.obelisks.every(o => o.done);
        });
        ent.off(); ent.fig.mat.color.set(0xd6d2c8); ent.fig.mat.emissive.set(0x1a1a18);
        mem.ch6ob = []; c.g.save.write(); c.g.hud.extra = '';
      },
      skip(c) { },
    },
    { // 2 the floor goes away
      spawn: [0, 0, 0], obj: 'Things here only become real when nobody checks. Cross.',
      async run(c) {
        const F = c.flags, a = c.g.audio, ent = c.entity, e = c.e;
        await c.sleep(1.5);
        // the white drains away (slowly, no flash)
        const from = new THREE.Color(0xe8e8e4), to = new THREE.Color(0x020202);
        let k = 0;
        a.stinger('swell');
        await c.until(() => { k = Math.min(1, k + 1 / 60 / 6); const col = from.clone().lerp(to, k); e.scene.fog.color.copy(col); e.scene.background.copy(col); e.hemi.intensity = 1.2 - k * 1.05; F.floor.material.color.setScalar(1 - k * 0.97); return k >= 1; });
        c.g.flashAllowed = true; c.g.player.flashOn = true; c.g.player.battery = Math.max(c.g.player.battery, 60);
        F.floor.visible = false;
        // the path: white tiles. The next one appears only while you are not looking at where it will be.
        const P = F.path, tiles = instanced(c, new THREE.BoxGeometry(1.5, 0.1, 1.5).translate(0, -0.05, 0), new THREE.MeshBasicMaterial({ color: 0xdedede, fog: true }), P.map(([x, z]) => ({ x, y: 0, z, s: 0.0001 })));
        const regions = P.map(([x, z]) => Object.assign([x - 0.8, z - 0.8, x + 0.8, z + 0.8], { on: false }));
        regions.unshift(Object.assign([-2.5, -3.5, 2.5, 2.5], { on: true })); // the island you are standing on
        const island = c.mesh(new THREE.BoxGeometry(5, 0.1, 6).translate(0, -0.05, 0), new THREE.MeshBasicMaterial({ color: 0xdedede }), 0, 0, -0.5);
        c.floorRegions(regions);
        const show = (i, on) => { regions[i + 1].on = on; setInstance(tiles, i, { s: on ? 1 : 0.0001 }); };
        let next = 0;
        const end = P[P.length - 1];
        // a colossal copy on the horizon, moving a moment before you do
        // a copy of you stands past the end of the path, on nothing, moving a moment before you do
        ent.mimic(end[0], end[1] - 5, { lag: -0.6, mirror: true });
        c.say('Look away and the path is built. Look at it and it is only a hope.', 7);
        await c.until(() => {
          if (next < P.length) {
            const [x, z] = P[next];
            const pos = new THREE.Vector3(x, 0, z);
            const prevOn = next === 0 || regions[next].on;
            if (prevOn && !c.observed(pos, 55) && c.head().distanceTo(pos) < 6) { show(next, true); next++; a.beep(300 + next * 20, 0.03, 0.02); }
          }
          // tiles far behind you dissolve when unobserved
          const h = c.head();
          P.forEach(([x, z], i) => { if (regions[i + 1].on && z - h.z > 5 && !c.observed(new THREE.Vector3(x, 0, z), 60)) show(i, false); });
          if (island.visible && h.z < -6 && !c.observed(new THREE.Vector3(0, 0, 0), 60)) { island.visible = false; regions[0].on = false; }
          return Math.hypot(h.x - end[0], h.z - end[1]) < 0.9 && next >= P.length;
        });
        ent.off();
        a.stinger('chime');
        c.say('At the end of the path there is a door standing on nothing. It is your desk-41 door. You open it.', 6);
        c.floorRegions(null);
        await c.sleep(3);
      },
      skip(c) { },
    },
  ],
};
