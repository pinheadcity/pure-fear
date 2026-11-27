// Fully synthesized, spatialized WebAudio. No samples.
export class Audio {
  constructor() { this.ctx = null; this.micLevel = 0; this.micOn = false; this.volume = 1; this._hb = 0; this.heartRate = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.out = ctx.createGain(); this.out.gain.value = this.volume;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 6;
    this.master = ctx.createGain(); // used for "sudden silence"
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.5;
    this.master.connect(this.lp); this.lp.connect(this.comp); this.comp.connect(this.out); this.out.connect(ctx.destination);
    // tinnitus: rises as it gets close
    this.tin = ctx.createOscillator(); this.tin.frequency.value = 6100; this.tinG = ctx.createGain(); this.tinG.gain.value = 0;
    this.tin.connect(this.tinG); this.tinG.connect(this.out); this.tin.start();
    // sub-audible pressure: a slow 19 Hz throb that swells with dread
    this.sub = ctx.createOscillator(); this.sub.frequency.value = 19; this.subG = ctx.createGain(); this.subG.gain.value = 0;
    this.sub.connect(this.subG); this.subG.connect(this.comp); this.sub.start();
    // reverb send
    this.verb = ctx.createConvolver(); this.verb.buffer = this._impulse(2.8, 2.2);
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.35;
    this.verbIn.connect(this.verb); this.verb.connect(this.master);
    this.dry = ctx.createGain(); this.dry.connect(this.master); this.dry.connect(this.verbIn);
    // noise
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    this.droneNodes = null;
  }
  _impulse(sec, decay) {
    const ctx = this.ctx, n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }
  setVolume(v) { this.volume = v; if (this.out) this.out.gain.value = v; }
  setReverb(v) { if (this.verbIn) this.verbIn.gain.setTargetAtTime(v, this.t, 0.5); }

  updateListener(cam) {
    if (!this.ctx) return;
    const L = this.ctx.listener, e = cam.matrixWorld.elements;
    const px = e[12], py = e[13], pz = e[14];
    const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
    if (L.positionX) {
      const t = this.t;
      L.positionX.setValueAtTime(px, t); L.positionY.setValueAtTime(py, t); L.positionZ.setValueAtTime(pz, t);
      L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(fy, t); L.forwardZ.setValueAtTime(fz, t);
      L.upX.setValueAtTime(ux, t); L.upY.setValueAtTime(uy, t); L.upZ.setValueAtTime(uz, t);
    } else { L.setPosition(px, py, pz); L.setOrientation(fx, fy, fz, ux, uy, uz); }
    this.listenerPos = [px, py, pz]; this.listenerFwd = [fx, fy, fz];
  }
  // destination: spatial panner at pos, or dry bus
  _dest(pos, ref = 1.2) {
    if (!pos) return this.dry;
    const p = new PannerNode(this.ctx, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: ref, maxDistance: 60, rolloffFactor: 1.2 });
    p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
    p.connect(this.dry); return p;
  }
  _noise(dur, at) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    s.start(at, Math.random() * 1.5); s.stop(at + dur + 0.1); return s;
  }
  _env(g, at, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a);
    g.gain.setValueAtTime(peak, at + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, at + a + hold + rel);
  }
  // ---------- sounds -----------
  step(surface = 'hard', pos, vol = 1, delay = 0) {
    if (!this.ctx) return; const c = this.ctx, at = this.t + delay, dest = this._dest(pos, 1);
    const n = this._noise(0.4, at), f = c.createBiquadFilter(), g = c.createGain();
    const cfg = { hard: [900, 1.2, 0.08], carpet: [380, 0.8, 0.06], water: [600, 0.6, 0.25], wood: [500, 2, 0.1], void: [2500, 4, 0.03], tile: [1400, 1.4, 0.07] }[surface] || [800, 1, 0.08];
    f.type = 'bandpass'; f.frequency.value = cfg[0] * (0.8 + Math.random() * 0.4); f.Q.value = cfg[1];
    if (surface === 'water') { f.type = 'lowpass'; f.frequency.setValueAtTime(1800, at); f.frequency.exponentialRampToValueAtTime(300, at + 0.3); }
    n.connect(f); f.connect(g); g.connect(dest); this._env(g, at, 0.005, 0.5 * vol, 0.01, cfg[2]);
    const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(90, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    o.connect(og); og.connect(dest); this._env(og, at, 0.003, 0.35 * vol, 0.01, 0.1); o.start(at); o.stop(at + 0.2);
    if (surface === 'wood' && Math.random() < 0.25) this.creak(pos, 0.4, delay + 0.05);
  }
  creak(pos, vol = 0.5, delay = 0) {
    if (!this.ctx) return; const c = this.ctx, at = this.t + delay, dest = this._dest(pos);
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth';
    const base = 70 + Math.random() * 60; o.frequency.setValueAtTime(base, at);
    for (let i = 1; i < 8; i++) o.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.5), at + i * 0.08);
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3; o.connect(f); f.connect(g); g.connect(dest);
    this._env(g, at, 0.05, 0.25 * vol, 0.4, 0.3); o.start(at); o.stop(at + 1);
  }
  whisper(pos, dur = 2.5, vol = 0.5) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, dest = this._dest(pos, 0.6);
    const n = this._noise(dur + 0.5, at), hp = c.createBiquadFilter(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 900; f1.type = 'bandpass'; f1.Q.value = 6; f2.type = 'peaking'; f2.gain.value = 12; f2.Q.value = 4;
    n.connect(hp); hp.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, at);
    let t = at;
    while (t < at + dur) {
      const syl = 0.07 + Math.random() * 0.16;
      f1.frequency.setValueAtTime(1500 + Math.random() * 2500, t); f2.frequency.setValueAtTime(2500 + Math.random() * 3000, t);
      g.gain.linearRampToValueAtTime(vol * (0.4 + Math.random() * 0.8), t + syl * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + syl);
      t += syl + (Math.random() < 0.2 ? 0.2 + Math.random() * 0.3 : 0.02);
    }
  }
  breath(pos, vol = 0.4, n = 3) {
    if (!this.ctx) return; const c = this.ctx; let at = this.t; const dest = this._dest(pos, 0.5);
    for (let i = 0; i < n; i++) {
      const s = this._noise(2.2, at), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.frequency.value = i % 2 ? 700 : 1100; f.Q.value = 1.5;
      s.connect(f); f.connect(g); g.connect(dest);
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.6); g.gain.linearRampToValueAtTime(0.0001, at + 1.4);
      at += 1.6 + Math.random() * 0.4;
    }
  }
  heartbeat(vol = 0.6) {
    if (!this.ctx) return; const c = this.ctx;
    [0, 0.28].forEach((d, i) => {
      const at = this.t + d, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(55, at); o.frequency.exponentialRampToValueAtTime(30, at + 0.15);
      o.connect(g); g.connect(this.master); this._env(g, at, 0.01, vol * (i ? 0.6 : 1), 0.02, 0.15); o.start(at); o.stop(at + 0.3);
    });
  }
  stinger(kind = 'swell', pos) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, dest = this._dest(pos);
    if (kind === 'swell') {
      const base = 55 + Math.random() * 20;
      [1, 1.059, 1.414, 2.12, 2.996].forEach(m => {
        const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = base * m;
        o.detune.setValueAtTime(0, at); o.detune.linearRampToValueAtTime(-60 + Math.random() * 120, at + 3);
        f.type = 'lowpass'; f.frequency.setValueAtTime(200, at); f.frequency.exponentialRampToValueAtTime(3000, at + 2.8);
        o.connect(f); f.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.09, at + 2.8); g.gain.setValueAtTime(0.0001, at + 2.85);
        o.start(at); o.stop(at + 3);
      });
    } else if (kind === 'hit') {
      const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(28, at + 0.8);
      o.connect(g); g.connect(dest); this._env(g, at, 0.005, 0.9, 0.05, 1.2); o.start(at); o.stop(at + 1.5);
      const n = this._noise(1, at), f = c.createBiquadFilter(), ng = c.createGain(); f.type = 'lowpass'; f.frequency.value = 2500;
      n.connect(f); f.connect(ng); ng.connect(dest); this._env(ng, at, 0.003, 0.5, 0.02, 0.6);
      [233, 247, 311, 349].forEach(fr => { const s = c.createOscillator(), sg = c.createGain(); s.type = 'square'; s.frequency.value = fr; s.connect(sg); sg.connect(dest); this._env(sg, at, 0.01, 0.04, 0.3, 0.8); s.start(at); s.stop(at + 1.3); });
    } else if (kind === 'low') {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = 31;
      o.connect(g); g.connect(dest); this._env(g, at, 1.5, 0.7, 2, 2); o.start(at); o.stop(at + 6);
    } else if (kind === 'chime') {
      [880, 1318, 1760].forEach((fr, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = fr * (1 + (Math.random() - 0.5) * 0.01); o.connect(g); g.connect(dest); this._env(g, at + i * 0.07, 0.005, 0.12, 0.01, 1.5); o.start(at); o.stop(at + 2.5); });
    } else if (kind === 'wrong') {
      [440, 466].forEach(fr => { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = fr; o.connect(g); g.connect(dest); this._env(g, at, 0.005, 0.06, 0.3, 0.05); o.start(at); o.stop(at + 0.5); });
    }
  }
  glitch(dur = 0.6, pos) {
    if (!this.ctx) return; const c = this.ctx, dest = this._dest(pos); let at = this.t;
    while (at < this.t + dur) {
      const o = c.createOscillator(), g = c.createGain(); o.type = Math.random() < 0.5 ? 'square' : 'sawtooth';
      o.frequency.value = 80 + Math.random() * 3000; o.connect(g); g.connect(dest);
      const l = 0.01 + Math.random() * 0.05; g.gain.setValueAtTime(0.05, at); g.gain.setValueAtTime(0, at + l); o.start(at); o.stop(at + l + 0.01); at += l + Math.random() * 0.03;
    }
  }
  beep(f = 1000, d = 0.08, v = 0.08) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = f;
    o.connect(g); g.connect(this.dry); this._env(g, at, 0.003, v, d, 0.02); o.start(at); o.stop(at + d + 0.1);
  }
  knock(pos, n = 3, vol = 0.8) {
    if (!this.ctx) return; for (let i = 0; i < n; i++) this.step('wood', pos, vol, i * (0.25 + Math.random() * 0.1));
  }
  slam(pos) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, dest = this._dest(pos);
    const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, at); o.frequency.exponentialRampToValueAtTime(30, at + 0.3);
    o.connect(g); g.connect(dest); this._env(g, at, 0.002, 1, 0.02, 0.5); o.start(at); o.stop(at + 0.8);
    const n = this._noise(0.5, at), f = c.createBiquadFilter(), ng = c.createGain(); f.type = 'lowpass'; f.frequency.value = 1200;
    n.connect(f); f.connect(ng); ng.connect(dest); this._env(ng, at, 0.002, 0.7, 0.02, 0.35);
  }
  drip(pos) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, dest = this._dest(pos), o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(900 + Math.random() * 600, at); o.frequency.exponentialRampToValueAtTime(2400, at + 0.05);
    o.connect(g); g.connect(dest); this._env(g, at, 0.002, 0.15, 0.005, 0.06); o.start(at); o.stop(at + 0.12);
  }
  musicBox(pos, wrong = 0) {
    if (!this.ctx) return; const c = this.ctx, dest = this._dest(pos);
    const notes = [0, 4, 7, 12, 7, 4, 0, -5, 0, 4, 7, 4];
    notes.forEach((n, i) => {
      const at = this.t + i * 0.42, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 523 * Math.pow(2, (n + (Math.random() < wrong ? (Math.random() < 0.5 ? 1 : -1) : 0)) / 12) * (1 - wrong * 0.03 * i / 12);
      o.connect(g); g.connect(dest); this._env(g, at, 0.003, 0.12, 0.01, 0.9); o.start(at); o.stop(at + 1.2);
    });
  }
  // persistent ambience
  drone({ base = 41, noise = 0.05, nf = 400, hum = 0, gain = 0.25 } = {}) {
    if (!this.ctx) return; this.stopDrone(); const c = this.ctx, at = this.t;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 4); g.connect(this.master);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.connect(g);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    const nodes = [lfo];
    [1, 1.498, 2.003, 0.5].forEach((m, i) => { const o = c.createOscillator(); o.type = i === 3 ? 'sine' : 'sawtooth'; o.frequency.value = base * m; o.detune.value = (Math.random() - 0.5) * 14; o.detune.linearRampToValueAtTime(-380 + (Math.random() - 0.5) * 40, c.currentTime + 1500); const og = c.createGain(); og.gain.value = i === 3 ? 0.6 : 0.2; o.connect(og); og.connect(f); o.start(); nodes.push(o); });
    const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const nfl = c.createBiquadFilter(); nfl.type = 'bandpass'; nfl.frequency.value = nf; nfl.Q.value = 0.7;
    const ng = c.createGain(); ng.gain.value = noise * 4; n.connect(nfl); nfl.connect(ng); ng.connect(g); n.start(); nodes.push(n);
    if (hum) { const h = c.createOscillator(); h.type = 'sawtooth'; h.frequency.value = 120; const hf = c.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 240; hf.Q.value = 8; const hg = c.createGain(); hg.gain.value = hum; h.connect(hf); hf.connect(hg); hg.connect(this.master); h.start(); nodes.push(h); this.humGain = hg; }
    this.droneNodes = { g, nodes };
  }
  stopDrone() {
    if (!this.droneNodes) return; const { g, nodes } = this.droneNodes, at = this.t;
    g.gain.setTargetAtTime(0.0001, at, 0.5); nodes.forEach(n => { try { n.stop(at + 2); } catch (e) { } });
    if (this.humGain) { this.humGain.gain.setTargetAtTime(0, at, 0.3); this.humGain = null; }
    this.droneNodes = null;
  }
  setHum(v) { if (this.humGain) this.humGain.gain.setTargetAtTime(v, this.t, 0.1); }
  // dread 0..1: the world muffles, the ears ring, the air thickens
  setDread(v) {
    if (!this.ctx) return; const t = this.t;
    this.lp.frequency.setTargetAtTime(18000 * Math.pow(0.03, v), t, 0.4);
    this.tinG.gain.setTargetAtTime(v > 0.25 ? (v - 0.25) * 0.02 : 0, t, 0.8);
    this.subG.gain.setTargetAtTime(v * 0.35, t, 1.0);
  }
  // dry little clicks, like joints settling somewhere close
  clicks(pos, n = 4, vol = 0.35) {
    if (!this.ctx) return; const c = this.ctx, dest = this._dest(pos, 0.6); let at = this.t;
    for (let i = 0; i < n; i++) {
      const s = this._noise(0.05, at), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2500; f.Q.value = 9;
      s.connect(f); f.connect(g); g.connect(dest); this._env(g, at, 0.001, vol * (0.5 + Math.random() * 0.5), 0.004, 0.02);
      at += 0.04 + Math.random() * (Math.random() < 0.3 ? 0.4 : 0.09);
    }
  }
  // a long, distant, wordless voice from somewhere in the building
  distantVoice(pos, vol = 0.12) {
    if (!this.ctx) return; const c = this.ctx, at = this.t, dest = this._dest(pos, 4);
    const o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth';
    const base = 140 + Math.random() * 60; o.frequency.setValueAtTime(base, at); o.frequency.linearRampToValueAtTime(base * 0.93, at + 4); o.frequency.linearRampToValueAtTime(base * 0.8, at + 6);
    f1.type = 'bandpass'; f1.frequency.setValueAtTime(700, at); f1.frequency.linearRampToValueAtTime(400, at + 6); f1.Q.value = 6;
    f2.type = 'lowpass'; f2.frequency.value = 1200;
    o.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 2); g.gain.linearRampToValueAtTime(vol * 0.7, at + 4.5); g.gain.linearRampToValueAtTime(0.0001, at + 6.5);
    o.start(at); o.stop(at + 7);
  }
  // your own microphone, delayed and dulled, played back from behind you
  micEcho(pos, delay = 2.2, dur = 7) {
    if (!this.ctx || !this.micSrc) return; const c = this.ctx, at = this.t;
    const d = c.createDelay(5); d.delayTime.value = delay; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1600;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 200;
    const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1.6, at + delay + 0.5); g.gain.setValueAtTime(1.6, at + delay + dur - 1); g.gain.linearRampToValueAtTime(0, at + delay + dur);
    const dest = this._dest(pos, 0.5);
    this.micSrc.connect(d); d.connect(hp); hp.connect(f); f.connect(g); g.connect(dest);
    setTimeout(() => { try { this.micSrc.disconnect(d); } catch (e) { } }, (delay + dur + 1) * 1000);
  }
  // recorded CC0 sample, optionally spatialized. name may be an array (random pick).
  play(name, pos, { vol = 1, rate = 1, loop = false, offset = 0, dur, ref = 1.2, jitter = 0.08, dry = false } = {}) {
    if (!this.ctx || !this.sampleFn) return null;
    if (Array.isArray(name)) name = name[(Math.random() * name.length) | 0];
    const buf = this.sampleFn(name); if (!buf) return null;
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.loop = loop; s.playbackRate.value = rate * (1 + (Math.random() - 0.5) * jitter);
    g.gain.value = vol; s.connect(g); g.connect(pos ? this._dest(pos, ref) : (dry ? this.master : this.dry));
    s.start(this.t, offset, dur); const h = { src: s, gain: g, stop: (f = 0.3) => { g.gain.setTargetAtTime(0, this.t, f / 3); try { s.stop(this.t + f); } catch (e) { } } };
    return h;
  }
  ambience(name, vol = 0.5) { if (this.ambH) this.ambH.stop(2); this.ambH = name ? this.play(name, null, { vol, loop: true, jitter: 0, dry: true }) : null; }
  silence(sec = 3) {
    if (!this.ctx) return; const g = this.master.gain, at = this.t;
    g.cancelScheduledValues(at); g.setValueAtTime(g.value, at); g.linearRampToValueAtTime(0.0001, at + 0.04);
    g.setValueAtTime(0.0001, at + sec); g.linearRampToValueAtTime(1, at + sec + 1.5);
  }
  tick(dt) {
    if (!this.ctx) return;
    if (this.heartRate > 0) { this._hb -= dt; if (this._hb <= 0) { this.heartbeat(0.25 + this.heartRate * 0.5); this._hb = 60 / (60 + this.heartRate * 80); } }
    if (this.micOn && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.micData); let s = 0;
      for (let i = 0; i < this.micData.length; i++) s += this.micData[i] * this.micData[i];
      const rms = Math.sqrt(s / this.micData.length);
      const lvl = Math.min(1, Math.max(0, (rms - 0.008) * 12));
      this.micLevel += (lvl - this.micLevel) * Math.min(1, dt * (lvl > this.micLevel ? 8 : 1.5));
    }
  }
  async enableMic() {
    this.init();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024; this.micData = new Float32Array(1024);
      src.connect(this.analyser); this.micSrc = src; this.micStream = stream; this.micOn = true; return true;
    } catch (e) { this.micOn = false; return false; }
  }
  disableMic() { if (this.micStream) this.micStream.getTracks().forEach(t => t.stop()); this.micOn = false; this.micLevel = 0; }
}
