// All textures are generated on canvas. No external assets.
import * as THREE from 'three';

let seed = 1337;
export function srand(s) { seed = s >>> 0 || 1; }
export function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
export function mkRng(s) {
  let x = (s >>> 0) || 1;
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
}

const cache = new Map();

function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
function toTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function speckle(g, s, n, cols, a, sz) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a * rnd();
    g.fillStyle = cols[(rnd() * cols.length) | 0];
    const r = sz * (0.3 + rnd());
    g.fillRect(rnd() * s, rnd() * s, r, r);
  }
  g.globalAlpha = 1;
}
function stains(g, s, n, col, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * s, y = rnd() * s, r = s * (0.05 + rnd() * 0.25);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a * rnd(); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalAlpha = 1;
}
function drips(g, s, n, col, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * s, len = s * (0.1 + rnd() * 0.6);
    g.globalAlpha = a * rnd(); g.fillStyle = col;
    g.fillRect(x, 0, 1 + rnd() * 2, len);
  }
  g.globalAlpha = 1;
}

const GEN = {
  wallpaper(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#7d7860'; g.fillRect(0, 0, s, s);
    g.fillStyle = o.stripe || '#6f6a52';
    for (let x = 0; x < s; x += 32) g.fillRect(x, 0, 12, s);
    speckle(g, s, 3000, ['#000', '#fff'], 0.08, 2);
    stains(g, s, 6, 'rgba(60,40,10,0.6)', 0.6);
    drips(g, s, 10, '#3a2e18', 0.25);
    return c;
  },
  floral(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#6a5a4a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
      g.fillStyle = o.petal || '#8a4a40';
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2;
        g.beginPath(); g.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 7, 4, a, 0, 7); g.fill();
      }
      g.fillStyle = '#c9b070'; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
      g.strokeStyle = '#4a5a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + 12); g.quadraticCurveTo(cx + 12, cy + 24, cx + 4, cy + 32); g.stroke();
    }
    speckle(g, s, 2500, ['#000', '#fff'], 0.08, 2);
    stains(g, s, 5, 'rgba(30,20,10,0.8)', 0.5);
    return c;
  },
  carpet(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#3a3d44'; g.fillRect(0, 0, s, s);
    speckle(g, s, 12000, ['#222', '#555', '#334', '#443'], 0.5, 2);
    stains(g, s, 5, 'rgba(20,10,0,0.8)', 0.5);
    return c;
  },
  ceiling(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#9a9890'; g.fillRect(0, 0, s, s);
    speckle(g, s, 4000, ['#666', '#bbb'], 0.4, 1.5);
    g.strokeStyle = '#55534c'; g.lineWidth = 4; g.strokeRect(0, 0, s, s);
    stains(g, s, 3, 'rgba(90,70,20,0.7)', 0.6);
    return c;
  },
  tiles(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    const n = o.n || 4, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = (o.check && (x + y) % 2) ? (o.alt || '#777') : (o.base || '#aaa');
      g.fillStyle = v; g.fillRect(x * t, y * t, t, t);
    }
    speckle(g, s, 3000, ['#000', '#fff'], 0.1, 2);
    g.strokeStyle = o.grout || '#444'; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke(); }
    stains(g, s, 4, 'rgba(40,30,20,0.8)', 0.4);
    return c;
  },
  concrete(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#555'; g.fillRect(0, 0, s, s);
    speckle(g, s, 9000, ['#333', '#777', '#444'], 0.35, 2);
    stains(g, s, 8, 'rgba(0,0,0,0.9)', 0.4);
    drips(g, s, 14, '#222', 0.3);
    return c;
  },
  metal(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = o.base || '#3c4046'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { g.globalAlpha = 0.05; g.fillStyle = rnd() > 0.5 ? '#fff' : '#000'; g.fillRect(0, y, s, 1); }
    g.globalAlpha = 1; g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
    g.fillStyle = '#777'; [[10, 10], [s - 14, 10], [10, s - 14], [s - 14, s - 14]].forEach(([x, y]) => g.fillRect(x, y, 4, 4));
    stains(g, s, 5, 'rgba(80,40,10,0.8)', 0.4);
    return c;
  },
  wood(o) {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    const pl = 32;
    for (let y = 0; y < s; y += pl) {
      g.fillStyle = o.base || '#4a3220'; g.fillRect(0, y, s, pl);
      for (let k = 0; k < 40; k++) { g.globalAlpha = 0.15; g.fillStyle = rnd() > 0.5 ? '#2a1a10' : '#6a4a30'; g.fillRect(0, y + rnd() * pl, s, 1); }
      g.globalAlpha = 1; g.fillStyle = '#1a100a'; g.fillRect(0, y, s, 2); g.fillRect((rnd() * s) | 0, y, 2, pl);
    }
    stains(g, s, 4, 'rgba(0,0,0,0.8)', 0.4);
    return c;
  },
  rack() {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#16181c'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) {
      g.fillStyle = '#23262c'; g.fillRect(8, y + 2, s - 16, 12);
      for (let x = 16; x < s - 16; x += 10) { g.fillStyle = '#0c0d10'; g.fillRect(x, y + 5, 6, 6); }
    }
    return c;
  },
  leds() {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) for (let k = 0; k < 3; k++) {
      if (rnd() < 0.7) { g.fillStyle = rnd() < 0.8 ? '#2f8' : (rnd() < 0.5 ? '#f42' : '#fa2'); g.fillRect(16 + rnd() * (s - 40), y + 6, 3, 3); }
    }
    return c;
  },
  water() {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#0a1418'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      g.strokeStyle = `rgba(120,160,170,${0.05 + rnd() * 0.12})`; g.lineWidth = 1;
      const x = rnd() * s, y = rnd() * s; g.beginPath(); g.ellipse(x, y, 4 + rnd() * 20, 1 + rnd() * 3, 0, 0, 7); g.stroke();
    }
    return c;
  },
  white() {
    const s = 128, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#eeeeea'; g.fillRect(0, 0, s, s);
    speckle(g, s, 600, ['#ccc', '#fff'], 0.3, 2);
    g.strokeStyle = 'rgba(0,0,0,0.06)'; g.strokeRect(0, 0, s, s);
    return c;
  },
  hospital() {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#8f9a92'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#5f6e66'; g.fillRect(0, s * 0.62, s, s * 0.38);
    g.fillStyle = '#3a443f'; g.fillRect(0, s * 0.6, s, 6);
    speckle(g, s, 3000, ['#000', '#fff'], 0.08, 2);
    stains(g, s, 6, 'rgba(50,40,20,0.8)', 0.5); drips(g, s, 18, '#3a2a18', 0.3);
    return c;
  },
  glow(o) {
    const s = 64, c = canvas(s), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, o.col || 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s); return c;
  },
  paper() {
    const s = 128, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#d8d2bc'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(40,40,80,0.35)';
    for (let y = 20; y < s; y += 10) { g.beginPath(); g.moveTo(10, y); g.lineTo(s - 10, y + rnd() * 2); g.stroke(); }
    stains(g, s, 3, 'rgba(100,70,20,0.6)', 0.5); return c;
  },
  vignette() {
    const s = 256, c = canvas(s), g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 50, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s); return c;
  },
  drawing(o) {
    // a child's drawing: a family, one faceless figure
    const s = 256, c = canvas(s), g = c.getContext('2d');
    g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, s, s);
    g.lineWidth = 3; g.lineCap = 'round';
    const n = o.n || 4;
    for (let i = 0; i < n; i++) {
      const x = 40 + i * (180 / Math.max(1, n - 1)), y = 120, faceless = i === (o.faceless ?? n - 1);
      g.strokeStyle = faceless ? '#999' : ['#a22', '#22a', '#2a2', '#a82'][i % 4];
      g.beginPath(); g.arc(x, y - 40, 16, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x, y + 30); g.moveTo(x - 22, y); g.lineTo(x + 22, y);
      g.moveTo(x, y + 30); g.lineTo(x - 14, y + 64); g.moveTo(x, y + 30); g.lineTo(x + 14, y + 64); g.stroke();
      if (!faceless) { g.fillStyle = '#222'; g.fillRect(x - 7, y - 46, 3, 3); g.fillRect(x + 4, y - 46, 3, 3); g.beginPath(); g.arc(x, y - 36, 6, 0.2, 2.9); g.stroke(); }
    }
    g.fillStyle = '#333'; g.font = '20px Comic Sans MS, cursive';
    g.fillText(o.caption || 'ME (NEXT TIME)', 30, 230);
    return c;
  },
};

export function tex(name, opts = {}, rep = true) {
  const key = name + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  srand(hash(key));
  const t = toTex(GEN[name](opts), rep);
  cache.set(key, t);
  return t;
}
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Text texture helper used for signs, screens, panels
export function textCanvas(w, h) { const c = canvas(w, h); return { c, g: c.getContext('2d') }; }
export function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function wrapText(g, text, x, y, maxW, lh) {
  const paras = String(text).split('\n');
  for (const p of paras) {
    const words = p.split(' '); let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; }
      else line = test;
    }
    g.fillText(line, x, y); y += lh;
  }
  return y;
}

// Materials cache
const mats = new Map();
export function mat(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (mats.has(key)) return mats.get(key);
  let m;
  const rep = opts.repeat;
  if (name === 'basic') m = new THREE.MeshBasicMaterial({ color: opts.color ?? 0xffffff, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, fog: opts.fog ?? true, side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true });
  else if (name === 'emissive') m = new THREE.MeshBasicMaterial({ color: opts.color ?? 0xffffff, fog: opts.fog ?? true });
  else if (name === 'lambert') m = new THREE.MeshLambertMaterial({ color: opts.color ?? 0xffffff, emissive: opts.emissive ?? 0 });
  else {
    const t = tex(name, opts.t || {});
    m = new THREE.MeshLambertMaterial({ map: t, color: opts.color ?? 0xffffff, emissive: opts.emissive ?? 0, emissiveMap: opts.emissive ? t : null, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
    if (rep) m.userData.uvScale = rep;
  }
  m.userData.uvScale = m.userData.uvScale || opts.uv || 2;
  mats.set(key, m);
  return m;
}
