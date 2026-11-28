// Jolly Johnny's: gas station, Museum of Morbid Marvels, the Dead Man's Drive tunnel, the cornfield.
// Plus the grindhouse look: sky dome, heat haze colour, film grain.
import * as THREE from 'three';
import { surf, gltf } from './assets.js';
import { textCanvas, canvasTex } from './textures.js';

const FONT = '"Courier New", Courier, monospace';
const _bb = new THREE.Box3();
function heightOf(name) { const g = gltf(name); if (!g) return 1; g.scene.updateMatrixWorld(true); _bb.setFromObject(g.scene); return Math.max(0.001, _bb.max.y - _bb.min.y); }
// place a model scaled to a real height
export function place(c, name, x, z, ry, h, { y = 0, col = 'auto', lie = false } = {}) { return c.prop(name, x, y, z, ry, h / heightOf(name), col, { lie }); }

// hand-painted sign
export function sign(c, x, y, z, ry, lines, { w = 3, h = 1, bg = '#1a0f08', fg = '#f0c040', font = 'bold 90px Georgia, serif', glow = false, border = '#c03020' } = {}) {
  const px = 1024, ph = Math.round(px * h / w), { c: cv, g } = textCanvas(px, ph);
  g.fillStyle = bg; g.fillRect(0, 0, px, ph); g.strokeStyle = border; g.lineWidth = 18; g.strokeRect(14, 14, px - 28, ph - 28);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const L = Array.isArray(lines) ? lines : [lines];
  L.forEach((l, i) => { g.font = typeof font === 'function' ? font(i) : font; g.fillText(l, px / 2, ph * (i + 0.5) / L.length); });
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`; g.fillRect(Math.random() * px, Math.random() * ph, 3, 3); } // weathering
  const m = glow ? new THREE.MeshBasicMaterial({ map: canvasTex(cv), toneMapped: false }) : new THREE.MeshStandardMaterial({ map: canvasTex(cv), roughness: 0.8 });
  return c.mesh(new THREE.PlaneGeometry(w, h), m, x, y, z, ry);
}

// sky dome with a painted gradient (dusk / night / dawn)
export function sky(c, top, mid, bottom, sunCol = null) {
  const { c: cv, g } = textCanvas(16, 512); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, top); gr.addColorStop(0.42, mid); gr.addColorStop(0.5, bottom); gr.addColorStop(1, '#050302');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const m = new THREE.MeshBasicMaterial({ map: canvasTex(cv), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false });
  const s = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), m); s.renderOrder = -10; c.add(s);
  c.onUpdate(() => s.position.copy(c.head()));
  if (sunCol) { const sun = new THREE.Mesh(new THREE.CircleGeometry(18, 24), new THREE.MeshBasicMaterial({ color: sunCol, fog: false, toneMapped: false })); sun.position.set(-260, 25, -250); sun.lookAt(0, 0, 0); s.add(sun); }
  return s;
}

// 16mm grain + dust in front of the eyes (one quad)
export function grain(c, amount = 0.07) {
  const { c: cv, g } = textCanvas(128, 128); const t = canvasTex(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 3);
  const im = g.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = v; im.data[i + 1] = v * 0.95; im.data[i + 2] = v * 0.85; im.data[i + 3] = 255; } g.putImageData(im, 0, 0);
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: amount, blending: THREE.MultiplyBlending, premultipliedAlpha: true, depthTest: false, fog: false, toneMapped: false }));
  q.position.z = -0.5; q.renderOrder = 2999; c.e.camera.add(q); c.grainQuad = q;
  let k = 0; c.onUpdate(() => { if (++k % 2) { t.offset.set(Math.random(), Math.random()); } });
  const orig = c.dispose.bind(c); c.dispose = () => { q.removeFromParent(); orig(); };
  return q;
}

// --------------------------------------------------------------- the lot
export function buildLot(c) {
  const asphalt = surf('dirty_concrete', { size: 5, color: 0x8a7a68 }), dirt = surf('dirt_floor', { size: 6, color: 0xb09070 }), planks = surf('weathered_planks', { size: 2.5 }), wood = surf('wood_planks_dirt', { size: 2 });
  const red = surf('wood_peeling_paint_weathered', { size: 1.5, color: 0xc04030 }), corr = surf('rusty_corrugated_iron', { size: 2.5, rough: 0.7, metal: 0.3 });
  // ground, road, scrub
  c.floor(-70, 55, 70, 145, dirt); c.floor(-70, 118, 70, 130, asphalt);
  for (let x = -66; x < 70; x += 8) c.box(x, 0.005, 124, 3, 0.01, 0.18, new THREE.MeshBasicMaterial({ color: 0xd8c070 }));
  c.e.colliders.add(-70, 54, 70, 55); c.e.colliders.add(-70, 145, 70, 146); c.e.colliders.add(-71, 55, -70, 145); c.e.colliders.add(70, 55, 71, 145);
  // the station (scanned building) and its pumps
  place(c, 'station', -18, 96, 0, 6.5, { col: false });
  c.e.colliders.add(-30, 84, -6, 92);
  place(c, 'pump', -2, 107, Math.PI / 2, 1.83); place(c, 'pump', 2, 107, Math.PI / 2, 1.83);
  sign(c, -2, 6.2, 104, 0, ['JOLLY JOHNNY\'S', 'GAS · FRIED CHICKEN · CURIOS'], { w: 7, h: 2.2, font: i => i ? 'bold 64px Georgia' : 'bold 150px Georgia' });
  // your car, steaming; Johnny's pickup
  c.car = place(c, 'car', -9, 115, -Math.PI / 2, 1.35, { col: [4.8, 2] });
  c.truck = place(c, 'truck', 14, 112, Math.PI, 1.9, { col: [2.2, 5.5] });
  // the museum: a red barn with a painted front
  const MX0 = 8, MX1 = 24, MZ0 = 80, MZ1 = 100, H = 5;
  c.floor(MX0, MZ0, MX1, MZ1, wood); c.ceil(MX0, MZ0, MX1, MZ1, planks, H);
  c.wallX(MX0, MX1, MZ1, { h: H, m: red, gaps: [{ at: 16, w: 2, h: 2.6 }] }); c.wallX(MX0, MX1, MZ0, { h: H, m: red, gaps: [{ at: 16, w: 2, h: 2.6 }] });
  c.wallZ(MZ0, MZ1, MX0, { h: H, m: red }); c.wallZ(MZ0, MZ1, MX1, { h: H, m: red });
  sign(c, 16, 3.8, 100.15, 0, ['MUSEUM OF', 'MORBID MARVELS', '★ REAL! ★ SHOCKING! ★ 50¢ ★'], { w: 9, h: 2.4, bg: '#f0e0b0', fg: '#8a1010', border: '#1a1a1a', font: i => i === 2 ? 'bold 70px Georgia' : 'bold 120px Georgia' });
  sign(c, 16, 3.2, 80.12, Math.PI, ['THE DEAD MAN\'S DRIVE', '→ RIDE AT YOUR OWN RISK →'], { w: 6, h: 1.4, bg: '#100808', fg: '#e03020', glow: true, font: i => i ? 'bold 60px Georgia' : 'bold 110px Georgia' });
  c.museum = { x0: MX0, x1: MX1, z0: MZ0, z1: MZ1 };
  // exhibits
  const ex = [];
  c.bulb(0, 16, 4.6, 90, 0xffb070, 6, 14);
  sign(c, 9.2, 2.6, 96, Math.PI / 2, ['THE PRUITT FAMILY', 'WANTED FOR QUESTIONING', '13 MISSING ON ROUTE 9'], { w: 2.6, h: 2, bg: '#e8dcc0', fg: '#1a1a1a', border: '#8a1010', font: i => i ? 'bold 64px Georgia' : 'bold 90px Georgia' });
  sign(c, 9.2, 2.4, 87, Math.PI / 2, ['DON\'T FEED THE FAMILY'], { w: 2.6, h: 0.6, bg: '#201010', fg: '#f0e0b0' });
  // glass case: the hitchhiker
  c.box(20.5, 0, 95, 2.4, 0.3, 1.6, wood, { collide: true });
  const glass = c.mesh(new THREE.BoxGeometry(2.3, 2.3, 1.5), new THREE.MeshStandardMaterial({ color: 0xb0c8c0, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), 20.5, 1.45, 95);
  sign(c, 20.5, 0.15, 95.82, 0, ['THE HITCHHIKER (1974)'], { w: 1.6, h: 0.25, bg: '#e8dcc0', fg: '#1a1a1a', border: '#1a1a1a', font: 'bold 70px Georgia' });
  ex.push({ kind: 'victim', x: 20.5, y: 0.3, z: 95, yaw: Math.PI / 2 });
  // pickled things
  c.box(9.4, 0, 82.5, 0.6, 1.6, 3, wood, { collide: true });
  for (let i = 0; i < 6; i++) { const j = c.mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 14), new THREE.MeshStandardMaterial({ color: [0x7a8a40, 0x8a6030, 0x6a7a50][i % 3], transparent: true, opacity: 0.78, roughness: 0.05 }), 9.5, 1.76, 81.3 + i * 0.48); }
  sign(c, 9.75, 2.3, 82.5, Math.PI / 2, ['PICKLED PARTS · DO NOT TAP GLASS'], { w: 2.4, h: 0.3, bg: '#e8dcc0', fg: '#8a1010', border: '#1a1a1a', font: 'bold 56px Georgia' });
  // a side of something
  for (let i = 0; i < 3; i++) { place(c, 'carcass', 22.6, 84 + i * 1.3, Math.PI / 2, 1.6, { y: 1.9, col: false }); }
  sign(c, 23.75, 3.4, 85.3, -Math.PI / 2, ['FRESH MEAT ★ ASK JOHNNY'], { w: 2.4, h: 0.4, bg: '#e8dcc0', fg: '#8a1010', border: '#1a1a1a', font: 'bold 64px Georgia' });
  // the electric chair replica
  place(c, 'echair', 13, 88, Math.PI / 2 + 0.4, 1.7);
  sign(c, 13, 0.3, 89.2, 0.4, ['OLD SPARKY (REPLICA)'], { w: 1.2, h: 0.2, bg: '#e8dcc0', fg: '#1a1a1a', border: '#1a1a1a', font: 'bold 60px Georgia' });
  for (let k = 0; k < 4; k++) c.decal('pool', 12 + Math.random() * 8, 0, 84 + Math.random() * 12, 0.8 + Math.random());
  // rest room shack round the back of the station
  c.box(-30, 0, 76, 2.6, 2.6, 0.12, planks, { collide: true }); c.box(-31.3, 0, 77.5, 0.12, 2.6, 3, planks, { collide: true }); c.box(-28.7, 0, 77.5, 0.12, 2.6, 3, planks, { collide: true }); c.box(-30, 2.6, 77.5, 2.8, 0.1, 3.2, corr);
  sign(c, -30, 2.2, 79.1, 0, ['RESTROOM'], { w: 1.2, h: 0.3, bg: '#e8dcc0', fg: '#1a1a1a', border: '#1a1a1a', font: 'bold 80px Georgia' });
  c.restroomDoor = c.door(-30, 79, { axis: 'x', w: 1.0, h: 2.1 });
  c.decal('smear', -30, 0, 78, 1.4); c.decal('hand', -28.78, 1.2, 77.6, 0.5, { wall: -Math.PI / 2 });
  return ex;
}

// --------------------------------------------------------------- the ride tunnel (x = 70, cart travels +z)
export const RIDE = { x: 70, z0: 58, z1: 136, scenes: { sparky: 70, bride: 86, legend: 102, real: 116, end: 130 } };
export function buildRide(c) {
  const dark = surf('peeling_painted_wall', { size: 2, color: 0x3a1410 }), floor = surf('dirty_concrete', { size: 3, color: 0x504040 }), metal = surf('rusty_metal_02', { size: 1, metal: 0.6, rough: 0.5 });
  const X = RIDE.x;
  c.floor(X - 3, RIDE.z0, X + 3, RIDE.z1, floor); c.ceil(X - 3, RIDE.z0, X + 3, RIDE.z1, dark, 3.4);
  c.wallZ(RIDE.z0, RIDE.z1, X - 3, { h: 3.4, m: dark }); c.wallZ(RIDE.z0, RIDE.z1, X + 3.6, { h: 3.4, m: dark }); c.wallX(X - 3, X + 3.6, RIDE.z0, { h: 3.4, m: dark }); c.wallX(X - 3, X + 3.6, RIDE.z1, { h: 3.4, m: dark });
  for (const dx of [-0.45, 0.45]) c.box(X + dx, 0, (RIDE.z0 + RIDE.z1) / 2, 0.08, 0.06, RIDE.z1 - RIDE.z0, metal);
  // the cart
  const cart = new THREE.Group();
  const cm = new THREE.MeshStandardMaterial({ color: 0x8a1010, roughness: 0.4, metalness: 0.3 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.6), cm); base.position.y = 0.35; cart.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.15), cm); back.position.set(0, 0.85, 0.75); cart.add(back);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1), new THREE.MeshStandardMaterial({ color: 0xc8c0b0, metalness: 0.9, roughness: 0.3 })); bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.95, -0.35); cart.add(bar);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 })); skull.position.set(0, 0.85, -0.82); cart.add(skull);
  cart.position.set(X, 0, RIDE.z0 + 2); cart.rotation.y = Math.PI; c.add(cart); c.cart = cart;
  // scene dressing on the left wall (+x)
  const S = RIDE.scenes;
  sign(c, X + 3.55, 2.6, S.sparky, -Math.PI / 2, ['OLD SPARKY'], { w: 2, h: 0.5, bg: '#100808', fg: '#e0e0e0', glow: true, font: 'bold 110px Georgia' });
  place(c, 'echair', X + 2.6, S.sparky, -Math.PI / 2, 1.7, { col: false });
  sign(c, X + 3.55, 2.6, S.bride, -Math.PI / 2, ['THE BUTCHER\'S BRIDE'], { w: 2.6, h: 0.5, bg: '#100808', fg: '#f0f0f0', glow: true, font: 'bold 90px Georgia' });
  for (let i = 0; i < 6; i++) c.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3 + Math.random() * 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xf0e8d8, emissive: 0x302010 }), X + 2.2 + Math.random() * 1.2, 0.2, S.bride - 1.2 + i * 0.5);
  c.box(X + 2.9, 0, S.legend, 1.2, 0.85, 2.4, surf('wood_planks_dirt', { size: 1 }));
  for (let i = 0; i < 3; i++) place(c, 'carcass', X + 3.2, S.legend - 2 + i * 2, -Math.PI / 2, 1.6, { y: 1.8, col: false });
  c.decal('pool', X + 2.4, 0, S.legend, 2.4); c.decal('drip', X + 3.55, 1.6, S.legend + 1.4, 1.6, { wall: -Math.PI / 2 });
  sign(c, X + 3.55, 2.7, S.legend - 2.8, -Math.PI / 2, ['THE LEGEND'], { w: 1.8, h: 0.45, bg: '#100808', fg: '#e03020', glow: true, font: 'bold 110px Georgia' });
  sign(c, X, 2.4, RIDE.z1 - 0.12, Math.PI, ['THANK YOU FOR RIDING'], { w: 3.4, h: 0.6, bg: '#100808', fg: '#f0c040', glow: true, font: 'bold 90px Georgia' });
  for (let k = 0; k < 8; k++) c.decal('smear', X - 2.5 + Math.random() * 5, 0, RIDE.z0 + 6 + k * 9, 1.4);
  return cart;
}

// --------------------------------------------------------------- the cornfield (east of the farm gate)
export function buildCorn(c, x0 = 48, x1 = 108, z0 = -34, z1 = 34) {
  const { c: cv, g } = textCanvas(128, 512);
  g.clearRect(0, 0, 128, 512);
  g.strokeStyle = '#6a7a30'; g.lineWidth = 7; g.beginPath(); g.moveTo(64, 512); g.lineTo(62, 40); g.stroke();
  for (let i = 0; i < 9; i++) { const y = 470 - i * 48, s = i % 2 ? 1 : -1; g.strokeStyle = ['#7a8a38', '#8a8a40', '#a09048'][i % 3]; g.lineWidth = 9; g.beginPath(); g.moveTo(63, y); g.quadraticCurveTo(63 + s * 50, y - 40, 63 + s * 60, y + 30); g.stroke(); }
  g.fillStyle = '#c8a850'; g.beginPath(); g.ellipse(70, 220, 9, 34, 0.2, 0, 7); g.fill(); g.fillStyle = '#a89050'; g.fillRect(60, 30, 6, 30);
  const tx = canvasTex(cv);
  const m = new THREE.MeshStandardMaterial({ map: tx, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
  const one = new THREE.PlaneGeometry(0.9, 2.6); one.translate(0, 1.3, 0);
  const two = one.clone().rotateY(Math.PI / 2);
  const geo = new THREE.BufferGeometry().copy(one); const merged = [one, two];
  const pos = [], uv = [], idx = []; let off = 0;
  for (const gg of merged) { pos.push(...gg.attributes.position.array); uv.push(...gg.attributes.uv.array); for (const i of gg.index.array) idx.push(i + off); off += gg.attributes.position.count; }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const list = [];
  for (let x = x0; x < x1; x += 0.95) for (let z = z0; z < z1; z += 0.95) {
    if (Math.abs(z - Math.sin(x * 0.15) * 6) < 1.2) continue; // a trampled path you can find
    if (Math.random() < 0.12) continue;
    list.push([x + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 0.4, Math.random() * 6.28, 0.8 + Math.random() * 0.45]);
  }
  const im = new THREE.InstancedMesh(geo, m, list.length); const o = new THREE.Object3D();
  list.forEach(([x, z, r, s], i) => { o.position.set(x, 0, z); o.rotation.set((Math.random() - 0.5) * 0.12, r, (Math.random() - 0.5) * 0.12); o.scale.set(1, s, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = false; im.receiveShadow = true; im.userData.shared = true; c.add(im);
  c.floor(x0 - 2, z0 - 4, x1 + 14, z1 + 4, surf('dirt_floor', { size: 4, color: 0x9a8060 }));
  // the road on the far side
  c.floor(x1 + 2, -60, x1 + 10, 60, surf('dirty_concrete', { size: 5, color: 0x6a6058 }));
  c.e.colliders.add(x0 - 3, z0 - 5, x1 + 14, z0 - 4); c.e.colliders.add(x0 - 3, z1 + 4, x1 + 14, z1 + 5); c.e.colliders.add(x1 + 13, z0 - 5, x1 + 14, z1 + 5);
  return im;
}
