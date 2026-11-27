// Dialogue: spoken lines (browser speech voice, if available) + captions + a spatial vocal texture.
// Your own voice: recorded from the microphone (only after you are asked, only kept in memory), played back later.
import * as THREE from 'three';

export const SPEAKERS = {
  MOTHER: { color: '#e7c3b0', pitch: 1.15, rate: 0.82, vol: 0.95, texture: ['c_breath'], female: true },
  FATHER: { color: '#b8a48c', pitch: 0.2, rate: 0.68, vol: 1, texture: ['c_troll1', 'c_troll2', 'c_troll3'], female: false },
  GRANDMA: { color: '#c9c9b8', pitch: 1.7, rate: 0.7, vol: 0.8, texture: ['c_snore', 'breath1'], female: true },
  TWELVE: { color: '#a9c4d6', pitch: 1.05, rate: 0.95, vol: 0.9, texture: ['c_cough2'], female: true },
  RADIO: { color: '#9a9a9a', pitch: 0.9, rate: 0.95, vol: 0.7, texture: [], female: false },
  YOU: { color: '#ffffff', pitch: 1, rate: 1, vol: 1, texture: [], female: false },
};

export class Dialogue {
  constructor(game) {
    this.g = game; this.synth = window.speechSynthesis || null; this.voices = [];
    if (this.synth) { const load = () => { this.voices = this.synth.getVoices().filter(v => /^en/i.test(v.lang)); }; load(); this.synth.onvoiceschanged = load; }
    this.clips = {}; // recorded voice clips (AudioBuffers), memory only
  }
  get voiced() { return this.g.settings.voices !== false && !!this.synth; }
  pickVoice(sp) {
    if (!this.voices.length) return null;
    const fem = this.voices.filter(v => /female|woman|samantha|victoria|karen|zira|susan|fiona|moira|tessa|google uk english female/i.test(v.name));
    const male = this.voices.filter(v => /male|man|daniel|alex|fred|david|mark|google uk english male/i.test(v.name) && !/female/i.test(v.name));
    return (sp.female ? fem[0] : male[0]) || this.voices[0];
  }
  // say a line. pos: Vector3 | object with .head | null. Resolves when the line is done.
  say(who, text, { pos = null, hold = 0.6, whisper = false } = {}) {
    const sp = SPEAKERS[who] || SPEAKERS.RADIO, g = this.g;
    const p = pos && pos.isVector3 ? pos : pos && pos.head ? pos.head.clone() : null;
    const dur = Math.max(1.8, text.length * 0.068 / sp.rate) + hold;
    g.hud.sub(`${who === 'YOU' ? '' : who + ':  '}${text}`, dur + 0.4, sp.color);
    if (sp.texture.length && p) g.audio.play(sp.texture, p, { vol: whisper ? 0.35 : 0.55, rate: 0.9 + Math.random() * 0.2, ref: 1 });
    let ended = false;
    if (this.voiced && who !== 'YOU') {
      try {
        this.synth.cancel();
        const u = new SpeechSynthesisUtterance(text); const v = this.pickVoice(sp); if (v) u.voice = v;
        u.pitch = sp.pitch; u.rate = sp.rate; u.volume = (whisper ? 0.5 : 1) * sp.vol * (g.settings.volume ?? 1);
        u.onend = () => { ended = true; };
        this.synth.speak(u);
      } catch (e) { }
    }
    return new Promise(res => { const t0 = performance.now(); const tick = () => { if (!g.ctx || g.dying) return res(); if (performance.now() - t0 > dur * 1000 || (ended && performance.now() - t0 > 1200)) return res(); requestAnimationFrame(tick); }; tick(); });
  }
  bark(who, lines, pos) { if (this.g.hud.subT > 0.5) return; return this.say(who, lines[(Math.random() * lines.length) | 0], { pos, hold: 0.2 }); }
  stop() { try { this.synth && this.synth.cancel(); } catch (e) { } }
  // ---- your voice ----
  async record(name, seconds = 3.5) {
    const a = this.g.audio; if (!a.micOn || !a.micStream || !window.MediaRecorder) return false;
    return new Promise(res => {
      try {
        const rec = new MediaRecorder(a.micStream), chunks = [];
        rec.ondataavailable = e => chunks.push(e.data);
        rec.onstop = async () => { try { const buf = await new Blob(chunks).arrayBuffer(); this.clips[name] = await a.ctx.decodeAudioData(buf); res(true); } catch (e) { res(false); } };
        rec.start(); setTimeout(() => rec.state !== 'inactive' && rec.stop(), seconds * 1000);
      } catch (e) { res(false); }
    });
  }
  playClip(name, pos, { rate = 1, vol = 1.4, lowpass = 2200 } = {}) {
    const a = this.g.audio, buf = this.clips[name]; if (!buf || !a.ctx) return false;
    const s = a.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass;
    const gn = a.ctx.createGain(); gn.gain.value = vol; s.connect(f); f.connect(gn); gn.connect(a._dest(pos, 0.8)); s.start(); return true;
  }
}
