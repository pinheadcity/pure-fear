// Shared procedural furniture + instancing helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../textures.js';

const cache = {};
function bx(w, h, d, x, y, z) { return new THREE.BoxGeometry(w, h, d).translate(x, y, z); }
function once(k, f) { return cache[k] || (cache[k] = f()); }

export const G = {
  chair: () => once('chair', () => mergeGeometries([bx(0.45, 0.06, 0.45, 0, 0.46, 0), bx(0.45, 0.5, 0.05, 0, 0.75, 0.21), bx(0.05, 0.45, 0.05, 0, 0.22, 0), bx(0.5, 0.03, 0.08, 0, 0.02, 0), bx(0.08, 0.03, 0.5, 0, 0.02, 0)])),
  monitor: () => once('monitor', () => mergeGeometries([bx(0.5, 0.34, 0.05, 0, 0.32, 0), bx(0.06, 0.14, 0.06, 0, 0.08, 0.02), bx(0.22, 0.02, 0.16, 0, 0.01, 0.02)])),
  screen: () => once('screen', () => new THREE.PlaneGeometry(0.44, 0.28).translate(0, 0.32, 0.027)),
  rack: () => once('rack', () => bx(0.8, 2.2, 1.0, 0, 1.1, 0)),
  bed: () => once('bed', () => mergeGeometries([bx(1.0, 0.45, 2.0, 0, 0.225, 0), bx(1.0, 0.9, 0.08, 0, 0.45, -0.98), bx(0.9, 0.12, 0.5, 0, 0.5, -0.65)])),
  table: (w = 1.6, d = 0.9, h = 0.76) => once('table' + w + d + h, () => mergeGeometries([bx(w, 0.05, d, 0, h, 0), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => bx(0.06, h, 0.06, a * (w / 2 - 0.06), h / 2, b * (d / 2 - 0.06)))])),
  cabinet: () => once('cab', () => mergeGeometries([bx(0.5, 1.3, 0.6, 0, 0.65, 0), bx(0.5, 0.01, 0.01, 0, 0.4, -0.305), bx(0.5, 0.01, 0.01, 0, 0.85, -0.305)])),
  bear: () => once('bear', () => mergeGeometries([new THREE.SphereGeometry(0.09, 8, 6).scale(1, 1.15, 0.9).translate(0, 0.1, 0), new THREE.SphereGeometry(0.065, 8, 6).translate(0, 0.25, 0), new THREE.SphereGeometry(0.025, 5, 4).translate(-0.05, 0.31, 0), new THREE.SphereGeometry(0.025, 5, 4).translate(0.05, 0.31, 0)])),
  blocks: () => once('blocks', () => mergeGeometries([bx(0.08, 0.08, 0.08, 0, 0.04, 0), bx(0.08, 0.08, 0.08, 0.09, 0.04, 0.02), bx(0.08, 0.08, 0.08, 0.04, 0.12, 0.01)])),
  musicbox: () => once('mbox', () => mergeGeometries([bx(0.16, 0.1, 0.11, 0, 0.05, 0), bx(0.16, 0.02, 0.11, 0, 0.11, -0.04)])),
  valve: () => once('valve', () => new THREE.TorusGeometry(0.16, 0.025, 6, 16)),
  obelisk: () => once('obelisk', () => bx(0.9, 4, 0.9, 0, 2, 0)),
  fuse: () => once('fuse', () => new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8).rotateZ(Math.PI / 2)),
  key: () => once('key', () => mergeGeometries([new THREE.TorusGeometry(0.025, 0.007, 4, 10), bx(0.07, 0.01, 0.006, 0.055, 0, 0)])),
};

// instanced mesh from list of {x,y,z,ry,s}
export function instanced(c, geo, m, list, colors) {
  const im = new THREE.InstancedMesh(geo, m, list.length);
  const o = new THREE.Object3D();
  list.forEach((p, i) => { o.position.set(p.x, p.y || 0, p.z); o.rotation.set(0, p.ry || 0, 0); o.scale.setScalar(p.s || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (colors) im.setColorAt(i, new THREE.Color(colors[i] ?? 0xffffff)); });
  im.userData.list = list; im.userData.shared = true;
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere(); im.frustumCulled = false;
  c.add(im); return im;
}
export function setInstance(im, i, p) {
  const o = setInstance._o || (setInstance._o = new THREE.Object3D());
  Object.assign(im.userData.list[i], p); const q = im.userData.list[i];
  o.position.set(q.x, q.y || 0, q.z); o.rotation.set(q.rx || 0, q.ry || 0, 0); o.scale.setScalar(q.s ?? 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.instanceMatrix.needsUpdate = true;
}
export function setInstanceColor(im, i, col) { im.setColorAt(i, col.isColor ? col : new THREE.Color(col)); im.instanceColor.needsUpdate = true; }

// a mirrored copy of a list of meshes across a plane (axis 'x' or 'z' at coordinate k)
export function mirrorCopy(c, meshes, axis, k) {
  const g = new THREE.Group();
  for (const m of meshes) { const cl = new THREE.Mesh(m.geometry, m.material); cl.matrixAutoUpdate = false; cl.matrix.copy(m.matrix); cl.userData.shared = true; g.add(cl); }
  if (axis === 'x') { g.position.x = 2 * k; g.scale.x = -1; } else { g.position.z = 2 * k; g.scale.z = -1; }
  c.add(g); return g;
}
// glass pane that reads as a mirror (dim, slightly grey, see-through into the mirrored room)
export function glass(c, x, y, z, w, h, ry = 0, opacity = 0.18) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x9aa8b0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; c.add(m); return m;
}
export { mat };
