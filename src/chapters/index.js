// Chapter registry + the menu "limbo" space.
import * as THREE from 'three';
import { mat } from '../textures.js';
import ch1 from './ch1_office.js';
import ch2 from './ch2_servers.js';
import ch3 from './ch3_house.js';
import ch4 from './ch4_hospital.js';

export const CHAPTERS = [ch1, ch2, ch3, ch4];
export const DEEP = null;

export function buildLimbo(game) {
  const e = game.engine;
  e.setAtmosphere({ fog: 0x050607, density: 0.07, hemi: 0.15 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), mat('concrete', { uv: 3 }));
  e.world.add(floor);
  const fm = mat('emissive', { color: 0x9fe8ff }), g = new THREE.OctahedronGeometry(0.05, 0);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(g, fm); const a = Math.random() * 6.28, r = 3 + Math.random() * 12; m.position.set(Math.cos(a) * r, 0.5 + Math.random() * 3, Math.sin(a) * r); e.world.add(m); }
  e.points[0].position.set(0, 3, -7); e.points[0].intensity = 3; e.points[0].distance = 8; e.points[0].color.set(0xaabbcc);
  game.flashAllowed = false;
}
