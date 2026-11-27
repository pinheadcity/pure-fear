// DEEP — endless mode. Rooms from every chapter, recombined forever. The director adapts to you.
import { THREE, mat } from './context.js';
import { G } from './props.js';
import { chunk } from './ch7_edge.js';

const RL = 10, RW = 4; // room length (z), half width (x)
const THEMES = {
  office: { wall: () => mat('wallpaper'), floor: () => mat('carpet', { uv: 1.5 }), surf: 'carpet', props(c, z, r) { for (let i = 0; i < 3; i++) c.box(-2.5 + r() * 5, 0, z - 2 - r() * 6, 1.6, 0.75, 0.75, mat('wood', { uv: 1 }), { collide: true }); } },
  servers: { wall: () => mat('rack', { uv: 1 }), floor: () => mat('concrete'), surf: 'hard', props(c, z, r) { for (const x of [-2.5, 2.5]) for (let k = 0; k < 3; k++) c.box(x, 0, z - 2 - k * 2.6, 0.8, 2.2, 1.0, mat('rack', { uv: 1 }), { collide: true }); } },
  house: { wall: () => mat('floral', { uv: 1.6 }), floor: () => mat('wood'), surf: 'wood', props(c, z, r) { c.box(0.5 - r(), 0, z - 5, 1.6, 1.05, 1.0, mat('wood', { t: { base: '#3a2410' }, uv: 1 }), { collide: true }); } },
  hospital: { wall: () => mat('hospital', { uv: 3 }), floor: () => mat('tiles', { t: { base: '#8a948e', n: 4 }, uv: 1.2 }), surf: 'tile', props(c, z, r) { c.box(-2.8, 0, z - 4, 1.0, 0.55, 1.9, mat('lambert', { color: 0xb8bcb4 }), { collide: true }); c.box(2.8, 0, z - 7, 1.0, 0.55, 1.9, mat('lambert', { color: 0xb8bcb4 }), { collide: true }); } },
  corridor: { wall: () => mat('wallpaper', { t: { base: '#6a5440', stripe: '#5a4636' } }), floor: () => mat('carpet', { t: { base: '#4a2420' } }), surf: 'carpet', props(c, z, r) { c.box(-3.2, 0, z - 5, 1.6, 3, RL, mat('wallpaper', { t: { base: '#6a5440', stripe: '#5a4636' } }), { collide: true }); c.box(3.2, 0, z - 5, 1.6, 3, RL, mat('wallpaper', { t: { base: '#6a5440', stripe: '#5a4636' } }), { collide: true }); } },
  void: { wall: null, floor: () => mat('white', { uv: 2 }), surf: 'void', props() { } },
};
const KEYS = Object.keys(THEMES);

export default {
  title: 'DEEP', sub: 'There is no last room.',
  atmosphere: { fog: 0x020303, density: 0.1, hemi: 0.15 }, drone: { base: 34.6, noise: 0.05, gain: 0.22 }, level: 0.7,
  build(c) {
    c.flags.rooms = 0; c.flags.list = []; c.flags.doorX = 0;
    c.flags.regions = [];
    c.floorRegions(c.flags.regions);
  },
  stages: [{
    spawn: [0, -2, 0], obj: 'Go deeper.',
    async run(c) {
      const F = c.flags, d = c.director, ent = c.entity, a = c.g.audio;
      const r = c.rng;
      const make = (k) => {
        const z0 = -k * RL, z1 = z0 - RL;
        const theme = THEMES[k === 0 ? 'office' : KEYS[(r() * KEYS.length) | 0]];
        const hw = RW, isCorr = theme === THEMES.corridor;
        const inX = F.doorX, outX = isCorr ? 0 : Math.round((r() - 0.5) * (hw * 2 - 2.4) * 2) / 2;
        // room kind chosen by the director's model of the player
        const behindLow = d.behindRate < 1.5, freezer = d.freezeRatio > 0.25;
        const kinds = ['pass', 'lock', 'lock', 'dark', freezer ? 'still' : 'lock', 'still'];
        const kind = (k < 2 || !theme.wall) ? 'pass' : kinds[(r() * kinds.length) | 0];
        const room = chunk(c, 'r' + k, z0, z1, -hw, hw, () => {
          const W = theme.wall && theme.wall();
          c.box(0, -0.05, (z0 + z1) / 2, hw * 2, 0.05, RL, theme.floor());
          if (W) {
            c.wallZ(z1, z0, -hw, { h: 3, m: W }); c.wallZ(z1, z0, hw, { h: 3, m: W });
            c.wallX(-hw, hw, z1, { h: 3, m: W, gaps: [{ at: outX, w: 1.4 }] });
            if (k === 0) c.wallX(-hw, hw, z0, { h: 3, m: W });
            c.box(0, 3, (z0 + z1) / 2, hw * 2, 0.05, RL, mat('ceiling'));
            if (kind !== 'dark') c.lightPanel(0, 3, (z0 + z1) / 2, 0.5, 1.2);
          }
          theme.props(c, z0, r);
        });
        room.k = k; room.kind = kind; room.theme = theme; room.outX = outX; room.z0 = z0; room.z1 = z1;
        // the connecting gap of a themed room into a void room needs floor
        F.regions.push(room.region);
        if (kind === 'lock') {
          room.door = c.door(outX, z1, { axis: 'x', w: 1.4, m: mat('metal'), locked: { msg: 'FIND THE TOKEN' } });
          const tx = (r() - 0.5) * (hw * 2 - 1.5), tz = z0 - 2 - r() * (RL - 4);
          const tok = c.pickup(tx, 1.0, tz, 'tok' + k, 'token', new THREE.OctahedronGeometry(0.09, 0), mat('emissive', { color: 0xffd090 }), () => { room.door.locked = null; room.door.open(); });
        }
        if (kind === 'still') {
          room.ring = c.mesh(new THREE.RingGeometry(0.6, 0.75, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x334455 }), 0, 0.02, z0 - RL / 2);
          room.door = c.door(outX, z1, { axis: 'x', w: 1.4, m: mat('metal'), locked: { msg: 'STAND IN THE RING' } });
          room.hold = 0;
        }
        if (room.door) { const od = room.dissolve; room.dissolve = () => { od(); room.door.pivot.visible = false; room.door.col.on = false; }; }
        if (r() < 0.45) c.battery((r() - 0.5) * 2, 0.02, z0 - 3 - r() * 4);
        if (theme.wall === null) { room.noWalls = true; }
        F.doorX = outX;
        F.list.push(room);
        return room;
      };
      for (let k = 0; k < 3; k++) make(k);
      let cur = 0, hunting = false;
      c.objective('Go deeper.');
      await c.until(() => {
        const h = c.head(), k = Math.floor(-h.z / RL);
        if (k > cur && k >= 0) {
          cur = k; F.rooms = k;
          c.g.hud.extra = 'ROOM ' + k;
          while (F.list.length && F.list[F.list.length - 1].k < k + 2) make(F.list[F.list.length - 1].k + 1);
          const room = F.list.find(x => x.k === k);
          c.g.player.surface = room.theme.surf; ent.surface = room.theme.surf;
          // adapt
          d.level = Math.min(1.4, 0.6 + k * 0.04);
          if (k === 3) { hunting = true; ent.hunt({ delay: 14, aggression: 0.12 }); c.g.hud.msg('IT HAS FOUND THE TRAIL', 3, 'warn'); }
          if (hunting && k % 5 === 0) { ent.off(); hunting = false; c.g.hud.msg('BREATHE', 2); c.g.after(20, () => { if (c.alive) { hunting = true; ent.hunt({ delay: Math.max(5, 14 - k * 0.3), aggression: 0.12 + k * 0.01 }); } }); }
          if (!hunting && d.behindRate > 3) ent.mimic(room.outX, room.z1 - 0.5, { lag: d.behindRate > 5 ? -0.4 : 1 }); // looks back a lot: it waits ahead
          if (room.kind === 'dark') { d.fire(d.behindRate < 1.5 ? 'behind' : 'glimpse'); }
          if (k % 7 === 0 && k > 0) c.lie(['YOU HAVE BEEN HERE BEFORE', 'NO ROOM IS NEW', 'MODEL OF YOU: ' + Math.round(70 + Math.min(29, k)) + '% COMPLETE'][k % 3]);
          // forget rooms far behind (only when not looked at)
          for (const old of F.list) if (!old.gone && old.k < k - 1) {
            const mid = new THREE.Vector3(0, 1.2, (old.z0 + old.z1) / 2);
            c.when(mid, () => old.dissolve(), { after: 0.2, minDist: 3 });
          }
        }
        for (const room of F.list) if (room.kind === 'still' && room.door?.locked) {
          if (c.near(0, room.z0 - RL / 2, 0.7)) {
            room.hold += 1 / 60; room.ring.material.color.setScalar(Math.min(1, 0.2 + room.hold / 5));
            if (room.hold > 2 && !room.whisp) { room.whisp = true; a.whisper(d.behindPos(0.6), 2.5, 0.5); }
            if (room.hold > 5) { room.door.locked = null; room.door.open(); a.stinger('chime'); }
          } else room.hold = Math.max(0, room.hold - 1 / 60);
        }
        return false;
      });
    },
  }],
};
