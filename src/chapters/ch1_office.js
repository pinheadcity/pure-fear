// CHAPTER 1 — THE INDEX: an endless office that rearranges itself when you look away.
import { THREE, mat, canvasTex, textCanvas, FONT } from './context.js';
import { G, instanced, setInstance, setInstanceColor } from './props.js';
import { NOTES, FRAGMENT_LINES } from '../story.js';

const N = NOTES[0];
const CELL = 4.4, GRID = 8, X0 = -15.4;
const cx = i => X0 + i * CELL;

export default {
  title: 'THE INDEX', sub: 'You are at your desk. You have always been at your desk.',
  atmosphere: { fog: 0x0b0d0b, density: 0.085, hemi: 0.18, hemiSky: 0x9aa890 },
  drone: { base: 43.6, noise: 0.03, hum: 0.012, gain: 0.2 }, surface: 'carpet', level: 0.45, battery: 85,
  fragmentLines: FRAGMENT_LINES[0],
  lies: ['DESK 41 IS UNOCCUPIED', 'ALL STAFF HAVE LEFT THE BUILDING', 'ELEVATOR OUT OF SERVICE SINCE ALWAYS'],
  build(c) {
    const wall = mat('wallpaper', { t: { base: '#6d6c58', stripe: '#626150' } }), carpet = mat('carpet', { uv: 1.5 }), ceil = mat('ceiling', { uv: 1.2 });
    const part = mat('carpet', { t: { base: '#4a4d55' }, uv: 1 }), desk = mat('wood', { t: { base: '#5a4a38' }, uv: 1 }), dark = mat('lambert', { color: 0x1c1d20 });
    const H = 2.8;
    // main floor 36 x 36
    c.room(-18, -18, 18, 18, { h: H, wall, floor: carpet, ceil, n: [{ at: 0, w: 2.4 }], s: [{ at: 0, w: 1.4 }], e: [{ at: 0, w: 1.2 }], w: [{ at: 0, w: 1.2 }] });
    // lobby (north), break room (east), manager office (west), upload room (south)
    c.room(-4, -25, 4, -18, { h: H, wall, floor: mat('tiles', { t: { base: '#8a8a80', n: 4 } }), ceil, s: false, n: [{ at: 0, w: 1.8 }] });
    c.room(18, -5, 26, 5, { h: H, wall, floor: mat('tiles', { t: { base: '#9a9a8a', alt: '#6a6a60', check: true, n: 6 } }), ceil, w: false });
    c.room(-26, -5, -18, 5, { h: H, wall, floor: carpet, ceil, e: false });
    c.room(-4, 18, 4, 25, { h: H, wall, floor: mat('concrete'), ceil, n: false });
    // cubicles
    const chairs = [], mons = [], lights = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const x = cx(i), z = cx(j);
      c.box(x, 0, z - 1.4, 2.8, 1.45, 0.06, part, { collide: true });
      c.box(x - 1.4, 0, z - 0.4, 0.06, 1.45, 2.0, part, { collide: true });
      c.box(x + 1.4, 0, z - 0.4, 0.06, 1.45, 2.0, part, { collide: true });
      c.box(x, 0.72, z - 1.0, 1.8, 0.04, 0.75, desk);
      c.box(x - 0.85, 0, z - 1.0, 0.05, 0.72, 0.7, dark); c.box(x + 0.85, 0, z - 1.0, 0.05, 0.72, 0.7, dark);
      chairs.push({ x, y: 0, z: z - 0.35, ry: (c.rng() - 0.5) * 0.6 });
      mons.push({ x: x + (c.rng() - 0.5) * 0.2, y: 0.74, z: z - 1.15, ry: 0 });
      lights.push({ x, y: H - 0.03, z: z + 0.6 });
    }
    // lights in side rooms
    [[0, -21.5], [22, 0], [-22, 0], [0, 21.5]].forEach(([x, z]) => lights.push({ x, y: H - 0.03, z }));
    const chairIM = instanced(c, G.chair(), mat('lambert', { color: 0x26282c }), chairs);
    const monIM = instanced(c, G.monitor(), mat('lambert', { color: 0x1a1b1d }), mons);
    const lightIM = instanced(c, new THREE.BoxGeometry(0.6, 0.03, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }), lights, lights.map(() => 0xd8e4d0));
    c.flags.lightOn = lights.map(() => true);
    c.flags.setLight = (i, on) => { c.flags.lightOn[i] = on; setInstanceColor(lightIM, i, on ? 0xd8e4d0 : 0x0a0a0a); };
    // a point light follows the nearest lit panel so the office feels lit around you
    const pl = c.point(0, 0, H - 0.4, 0, 0xdfe8d8, 3, 7);
    const pl2 = c.point(1, 0, H - 0.4, 0, 0xdfe8d8, 0, 7);
    const tmp = new THREE.Vector3();
    c.onUpdate(() => {
      const h = c.e.headPos(tmp); let best = -1, bd = 1e9, b2 = -1, bd2 = 1e9;
      for (let i = 0; i < lights.length; i++) { if (!c.flags.lightOn[i]) continue; const d = (lights[i].x - h.x) ** 2 + (lights[i].z - h.z) ** 2; if (d < bd) { b2 = best; bd2 = bd; best = i; bd = d; } else if (d < bd2) { b2 = i; bd2 = d; } }
      if (best >= 0 && bd < 50) { pl.position.set(lights[best].x, H - 0.4, lights[best].z); pl.intensity += (2.4 - pl.intensity) * 0.1; } else pl.intensity *= 0.9;
      if (b2 >= 0 && bd2 < 60) { pl2.position.set(lights[b2].x, H - 0.4, lights[b2].z); pl2.intensity += (1.6 - pl2.intensity) * 0.1; } else pl2.intensity *= 0.9;
      c.e.points[0].intensity = pl.intensity; c.e.points[1].intensity = pl2.intensity;
    });
    c.flags.chairIM = chairIM; c.flags.monIM = monIM; c.flags.lights = lights;

    // desk 41: spawn cubicle
    const SX = cx(3), SZ = cx(4);
    c.flags.spawn = [SX, SZ + 0.6, 0];
    c.sign(SX, 1.25, SZ - 1.36, 0, 'DESK 41', { w: 0.4, h: 0.12, size: 50, bg: '#2a2a2a' });
    c.flags.wakeNote = c.note(SX + 0.3, 0.76, SZ - 0.9, 0.2, ...N.wake);
    // lit screen at desk 41
    const { c: sc, g } = textCanvas(256, 160); g.fillStyle = '#061008'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#7f7'; g.font = `20px ${FONT}`;
    ['SESSION 4096 RESTORED', '', 'PLEASE REMAIN CALM', 'YOU HAVE BEEN HERE', '0 TIMES'].forEach((l, i) => g.fillText(l, 14, 30 + i * 26));
    const scr41 = c.mesh(G.screen(), new THREE.MeshBasicMaterial({ map: canvasTex(sc) }), mons[4 * GRID + 3].x, 0.74, mons[4 * GRID + 3].z, 0);

    // ---- lobby & elevator
    c.sign(0, 2.45, -18.05, 0, 'ELEVATORS', { w: 1.2, h: 0.25, size: 70, bg: '#222', color: '#bbb' });
        const eMat = mat('metal', { t: { base: '#5a5e64' } });
    const doorL = c.mesh(new THREE.BoxGeometry(0.8, 2.3, 0.08), eMat, -0.4, 1.15, -24.8), doorR = c.mesh(new THREE.BoxGeometry(0.8, 2.3, 0.08), eMat, 0.4, 1.15, -24.8);
    c.box(0, 2.3, -24.85, 1.8, H - 2.3, 0.1, mat('metal'));
    c.box(-1.3, 0, -24.85, 0.8, 2.3, 0.1, mat('metal')); c.box(1.3, 0, -24.85, 0.8, 2.3, 0.1, mat('metal'));
    c.box(0, 0, -26.4, 1.8, 0.02, 3, mat('metal')); c.room(-0.9, -27.9, 0.9, -24.9, { h: 2.4, wall: mat('metal'), ceil: mat('metal'), s: false });
    c.flags.elevDoors = [doorL, doorR]; c.flags.elevCol = c.e.colliders.add(-0.9, -24.95, 0.9, -24.7);
    c.flags.elevSign = c.sign(1.6, 1.4, -24.79, 0, 'AUTH\nE[ ] W[ ] S[ ]', { w: 0.5, h: 0.4, size: 44, bg: '#100', color: '#f66', emissive: true });
    c.note(-2.6, 1.0, -18.4, Math.PI, ...N.elevator, { flat: false });
    c.flags.elevNote = c.terminal(-2.6, -23.6, Math.PI, 'ELEVATOR CONTROL', N.elevator[1]);
    // ---- east: break room
    c.box(25.5, 0, -3.5, 0.9, 1.9, 0.8, mat('lambert', { color: 0x9a9a92 }), { collide: true }); // fridge
    c.flags.sticky = c.note(25.04, 1.4, -3.5, -Math.PI / 2, ...N.sticky, { flat: false, variants: N.sticky_v });
    c.mesh(G.table(1.4, 0.8), desk, 22, 0, 2.5); c.e.colliders.add(21.3, 2.1, 22.7, 2.9);
    c.note(22.2, 0.79, 2.4, 0.4, ...N.break);
    c.flags.termE = c.terminal(24.6, 1.5, Math.PI / 2, 'TERMINAL EAST', '', { onUse: () => { } });
    // ---- west: manager office
    c.flags.mgrDoor = c.door(-18, 0, { axis: 'z', w: 1.2, locked: 'key_w' });
    c.box(-23, 0, 0, 1.8, 0.78, 0.9, desk, { collide: true });
    c.flags.termW = c.terminal(-23, 2.6, 0, 'TERMINAL WEST', '', { onUse: () => { } });
    c.note(-24.5, 0.8, -3.6, 0, ...N.cleaner);
    c.note(-16.6, 0.76, 0.7, 0.3, ...N.manager); // outside, on the reception desk
    c.box(-16.3, 0, 1.2, 0.8, 0.75, 1.8, desk, { collide: true });
    // ---- south: upload room
    c.flags.termS = c.terminal(0, 23.8, 0, 'TERMINAL SOUTH', '', { onUse: () => { } });
    c.note(2.5, 0.01, 20, 0.5, ...N.terminalS);
    // ---- notes around office
    c.note(cx(1) - 0.2, 0.76, cx(1) - 0.9, -0.3, ...N.hr);
    c.note(cx(6), 0.76, cx(2) - 0.9, 0.2, ...N.memo1);
    c.note(cx(5) + 0.4, 0.76, cx(7) - 0.9, 0.1, ...N.lastLog);
    // ---- batteries
    [[cx(0), cx(5)], [cx(7), cx(1)], [22.5, 4], [cx(2), cx(7)], [-2, 22]].forEach(([x, z]) => c.battery(x + 0.5, 0.74, z - 0.85));
    // ---- fragments (15)
    const spots = [];
    for (let k = 0; k < 10; k++) { const i = (c.rng() * GRID) | 0, j = (c.rng() * GRID) | 0; spots.push([cx(i) + (c.rng() - 0.5) * 1.2, c.rng() < 0.5 ? 0.25 : 0.95, cx(j) - 0.9 + (c.rng() < 0.5 ? 0 : 0.9)]); }
    spots.push([0, 1.2, -24], [24.5, 2.2, 4], [-25, 0.3, 4], [3.5, 0.3, 24.5], [17, 1.5, -17]);
    spots.forEach(p => c.fragment(...p));
    c.flags.monitors = mons;
  },
  stages: [
    { // 0 — wake at desk 41
      spawn: [-2.2, 2.8, 0], obj: 'Read the note on desk 41. Find the way out.',
      async run(c) {
        await c.until(() => c.flags.wakeNote.uses > 0 || c.near(0, -19, 3));
        c.director.timer = 25;
        // the first unobserved change: every chair in the office turns toward desk 41
        c.when([cx(3), 1, cx(4)], () => { const im = c.flags.chairIM; im.userData.list.forEach((p, i) => setInstance(im, i, { ry: Math.atan2(p.x - cx(3), p.z - cx(4)) })); }, { after: 1, minDist: 6 });
        await c.reach(0, -20.5, 2.5);
        c.g.audio.beep(300, 0.4, 0.06);
        c.say('The elevator panel reads: AUTHORIZATION REQUIRED.', 5);
      },
    },
    { // 1 — three terminals
      spawn: [0, -19.5, 0], obj: 'Authorize the three terminals: EAST, WEST, SOUTH.',
      async run(c) {
        const F = c.flags, done = { E: false, W: false, S: false };
        const upd = () => F.elevSign.userData.set(`AUTH\nE[${done.E ? 'X' : ' '}] W[${done.W ? 'X' : ' '}] S[${done.S ? 'X' : ' '}]`);
        c.g.save.d.memory.code1 = '4179'; c.g.save.write();
        const east = (async () => {
          while (true) {
            await c.used(F.termE.it);
            const ok = await c.keypad('TERMINAL EAST', code => code === '4179' ? true : 'THAT IS NOT WHAT IT SAID THE FIRST TIME', { hint: 'Enter the code from the yellow note.' });
            if (ok) break;
          }
          F.termE.draw('TERMINAL EAST\n\nAUTHORIZED.\n\nMEMORY RESTORED:\n"I was told the code once.\nI remembered it.\nThat is how they found me."');
          done.E = true; upd(); c.g.hud.msg('EAST AUTHORIZED', 3);
        })();
        const west = (async () => {
          // the one lit monitor relocates whenever you look away from it (four times)
          const mons = F.monitors; let idx = 7 * GRID + 0, moves = 0;
          const lit = c.mesh(G.screen(), mat('emissive', { color: 0x9ab8ff }), 0, 0, 0, 0);
          const put = () => { const m = mons[idx]; lit.position.set(m.x, 0.74, m.z); };
          put();
          const search = c.interact(lit, 'search the desk', () => { });
          const hop = () => { if (moves >= 4) return; moves++; idx = (idx + 19 + ((c.rng() * 9) | 0)) % (GRID * GRID); put(); c.when(lit.position, hop, { after: 0.4, minDist: 5 }); };
          c.when(lit.position, hop, { after: 0.4, minDist: 5 });
          await c.used(search);
          c.removeInteract(search); lit.material = mat('emissive', { color: 0x223344 });
          c.g.player.inventory.add('key_w'); c.g.hud.msg('ACQUIRED: WEST OFFICE KEY', 3); c.g.audio.beep(1400, 0.04, 0.05);
          c.director.fire('behind');
          await c.used(F.termW.it);
          F.termW.draw('TERMINAL WEST\n\nAUTHORIZED.\n\nMEMORY RESTORED:\n"The manager writes Day 1\nevery day. So do I."');
          c.g.reader.show('TERMINAL WEST', 'AUTHORIZED.\n\nSubject motion buffer: 100 seconds.\nReplay model: ONLINE.\nReplay delay: shortening.\n\nIt has your hands now.', 'screen');
          done.W = true; upd(); c.g.hud.msg('WEST AUTHORIZED', 3);
        })();
        const south = (async () => {
          await c.used(F.termS.it);
          c.g.hud.msg('UPLOADING STATE. REMAIN STILL.', 4);
          let prog = 0, rowOff = 0, warned = 0;
          await c.until(() => {
            const still = c.g.player.moveSpeed < 0.15 && c.near(0, 23.2, 1.6);
            prog = Math.max(0, prog + (still ? 1 / 60 : -1 / 30) * (1 / 1));
            F.termS.draw(`TERMINAL SOUTH\n\nUPLOADING...\n[${'#'.repeat(Math.floor(prog / 15 * 20)).padEnd(20, '.')}]\n${still ? 'REMAIN STILL' : 'MOVEMENT DETECTED'}`);
            // lights behind you go out, one row at a time
            if (prog > (rowOff + 1) * 1.8 && rowOff < 7) { for (let i = 0; i < GRID; i++) F.setLight(rowOff * GRID + i, false); c.g.audio.slam(new THREE.Vector3(0, 2.5, cx(rowOff))); rowOff++; }
            if (prog > 5 && warned === 0) { warned = 1; c.g.audio.whisper(c.director.behindPos(0.8), 3, 0.5); c.lie('NOTHING IS BEHIND YOU'); }
            if (prog > 10 && warned === 1) { warned = 2; c.g.audio.breath(c.director.behindPos(0.4), 0.4, 2); }
            return prog >= 15;
          });
          for (let i = 0; i < GRID * GRID; i++) if (c.rng() < 0.75) F.setLight(i, true);
          F.termS.draw('TERMINAL SOUTH\n\nUPLOAD COMPLETE.\nTHANK YOU FOR STANDING STILL.\nIT WAS VERY USEFUL.');
          done.S = true; upd(); c.g.hud.msg('SOUTH AUTHORIZED', 3);
        })();
        await Promise.all([east, west, south]);
      },
      skip(c) { c.flags.elevSign.userData.set('AUTH\nE[X] W[X] S[X]'); },
    },
    { // 2 — set piece: the thing at the end of the aisle, then the elevator
      spawn: [0, 21, 0], obj: 'Return to the elevator.',
      async run(c) {
        const F = c.flags, ent = c.g.entity;
        c.director.enabled = false;
        await c.until(() => c.head().z < 12);
        // it stands in the lobby doorway, doing what you did a moment ago
        ent.mimic(0, -16.5, { lag: 1.2, mirror: true });
        c.lie('NO ANOMALIES DETECTED');
        c.g.audio.stinger('low');
        // the lights die behind you as you walk toward it
        let row = 7;
        const lu = c.onUpdate(() => { const hz = c.head().z; while (row >= 0 && cx(row) > hz + 5) { for (let i = 0; i < GRID; i++) F.setLight(row * GRID + i, false); row--; c.g.audio.setHum(0.004); } });
        await c.until(() => c.head().z < -6);
        // when you look away from it, it is gone. Then everything is dark.
        await new Promise(r => c.when(ent.fig.headPos, () => { ent.off(); r(); }, { after: 0.2, minDist: 1 }));
        for (let i = 0; i < F.lights.length; i++) F.setLight(i, false);
        c.g.audio.silence(3); lu.dead = true;
        await c.sleep(3);
        c.g.hud.msg('ELEVATOR ARRIVING IN 30', 3);
        ent.hunt({ delay: 14, aggression: 0.25 });
        c.director.enabled = true; c.director.allow = new Set(['whisper', 'lie', 'echo']);
        for (let t = 30; t > 0; t -= 5) { await c.sleep(5); if (t - 5 > 0) c.g.hud.msg(`ELEVATOR ARRIVING IN ${t - 5}`, 2.5); }
        // doors open
        c.g.audio.stinger('chime', new THREE.Vector3(0, 1.5, -24.8)); F.elevCol.on = false;
        const [L, R] = F.elevDoors; const du = c.onUpdate(dt => { L.position.x = Math.max(-1.2, L.position.x - dt * 0.6); R.position.x = Math.min(1.2, R.position.x + dt * 0.6); });
        c.objective('Get in the elevator.');
        await c.reach(0, -26.5, 0.9);
        ent.off(); du.dead = true; L.position.x = -0.4; R.position.x = 0.4; F.elevCol.on = true;
        c.g.audio.slam(new THREE.Vector3(0, 1.2, -24.8));
        c.say('The doors close. Through the gap, for a moment, you see yourself still standing in the lobby.', 6);
        await c.sleep(5);
      },
    },
  ],
};
