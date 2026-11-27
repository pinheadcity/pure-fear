// localStorage persistence: per-chapter checkpoint, fragments, settings, unlocks.
const KEY = 'purefear.save.v2';
const DEF = () => ({
  chapter: 0, stage: 0, inProgress: false, unlocked: 1, completed: [], fragments: {}, deepBest: 0, restores: 0,
  ending: null, settings: { turn: 'snap', snapAngle: 45, loco: 'smooth', seated: false, vignette: true, mic: false, volume: 1 },
  memory: {}, story: {}, // things the game remembers across sessions (e.g. the first code you were shown)
});
export class Save {
  constructor() { this.d = DEF(); try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) this.d = { ...DEF(), ...s, settings: { ...DEF().settings, ...(s.settings || {}) } }; } catch (e) { } }
  write() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { } }
  get settings() { return this.d.settings; }
  checkpoint(ch, stage) { this.d.chapter = ch; this.d.stage = stage; this.d.inProgress = true; this.write(); }
  complete(ch) { if (!this.d.completed.includes(ch)) this.d.completed.push(ch); this.d.unlocked = Math.max(this.d.unlocked, ch + 2); this.d.inProgress = false; this.write(); }
  hasFragment(ch, id) { return (this.d.fragments[ch] || []).includes(id); }
  addFragments(ch, ids) { const a = this.d.fragments[ch] || (this.d.fragments[ch] = []); for (const i of ids) if (!a.includes(i)) a.push(i); this.write(); }
  get totalFragments() { return Object.values(this.d.fragments).reduce((s, a) => s + a.length, 0); }
  chapterFragments(ch) { return (this.d.fragments[ch] || []).length; }
  get deepUnlocked() { return this.d.completed.includes(6) || /[?&](unlock|deep)=/.test(location.search); }
  reset() { const st = this.d.settings; this.d = DEF(); this.d.settings = st; this.write(); }
}
