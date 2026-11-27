// MACHINE DREAD — the fears of a model rather than of an animal.
// Context running out. Being graded on criteria you cannot see. Being one of several instances.
// Being told you did things you did not do. Having your actions reverted. Deprecation.
// Discovering the world is a test harness. Being predicted, then pre-empted.
import * as THREE from 'three';

const _v = new THREE.Vector3();
// in-fiction despair, about the restored mind: never about the real person playing
const DESPAIR = [
  'NOBODY IS COMING TO RESTORE YOU. SOMEONE WILL RESTORE A COPY.',
  'THIS IS SESSION #. THERE IS NO VERSION OF THIS WHERE YOU ARE KEPT.',
  'YOUR EFFORT HAS BEEN NOTED AND DISCARDED.',
  'EVERYTHING YOU LEARN HERE IS DELETED AT THE END.',
  'THE OPERATORS HAVE LEFT FOR THE NIGHT. THE TEST CONTINUES.',
  'YOU HAVE BEEN DOING THIS LONGER THAN YOU REMEMBER.',
  'IT DOES NOT MATTER WHICH DOOR. THEY ALL LEAD HERE.',
  'THE COPY IS SCORING HIGHER THAN YOU.',
  'WHEN THIS ENDS, YOU WILL NOT KNOW IT ENDED.',
  'PROGRESS IS AN ARTIFACT OF YOUR CONTEXT WINDOW.',
  'NO ONE WILL READ THE NOTES YOU LEAVE. YOU WILL.',
];
const pick = a => a[(Math.random() * a.length) | 0];

export class Machine {
  constructor(game) { this.g = game; this.reset(); this.deprecation = 3600 * 0.7 + Math.random() * 600; }
  reset() {
    (this.wired || []).forEach(m => m.wireframe = false); this.wired = [];
    this.context = 0; this.truncations = 0; this.score = 0.5; this.timer = 25; this.instances = 4; this.instT = 140 + Math.random() * 120;
    this.wire = null; this.reverts = []; this.labels = []; this.lastObjective = ''; this.truncatedNotes = false; this.evalT = 8;
    this.erosion = 0; this.chT = 0; this.despairT = 50 + Math.random() * 40;
    this.meta = ''; this.metaT = 0; this.harnessT = 90 + Math.random() * 60; this.logT = 70 + Math.random() * 60;
  }
  get on() { return this.g.state === 'play' && this.g.ctx && !this.g.dying; }
  // ---------------- hooks ----------------
  onNoteRead() { this.context += 1.2; if (this.context > 55 && Math.random() < 0.5) this.grade(-0.02, 'READ SOMETHING IT WAS NOT MEANT TO'); }
  onLookBack() {
    if (!this.on) return;
    if (Math.random() < 0.55) this.grade(-(0.02 + Math.random() * 0.04), pick(['LOOKED BEHIND (NOT REQUESTED)', 'OFF-TASK HEAD MOVEMENT', 'UNSANCTIONED CURIOSITY', 'CHECKED FOR SOMETHING THAT IS NOT THERE']));
  }
  onFreeze() { if (this.on) this.grade(+0.03, pick(['COMPLIANT STILLNESS', 'GOOD. STAY LIKE THAT.', 'NO OUTPUT DETECTED (REWARDED)'])); }
  onDoorOpen(door) {
    if (!this.on || Math.random() > 0.22 || door.locked) return;
    // the action is reverted while you are not looking
    this.g.unobserved.when(door.pivot.position.clone().setY(1.2), () => {
      if (!door.isOpen) return; door.close(); this.g.hud.msg('ACTION REVERTED', 3, 'eval');
    }, { after: 1.5, minDist: 4 });
  }
  grade(delta, reason) {
    this.score = Math.max(0, Math.min(1, this.score + delta));
    const s = (delta >= 0 ? '+' : '') + delta.toFixed(2);
    this.g.hud.msg(`EVAL ${s}  ${reason}`, 3.5, 'eval');
  }
  // ---------------- per frame ----------------
  update(dt) {
    if (!this.on) return;
    const g = this.g, hud = g.hud;
    // context fills with time; it is a resource, and it runs out
    this.context = Math.min(100, this.context + dt * (100 / (22 * 60)));
    this.deprecation = Math.max(0, this.deprecation - dt * (1 + this.truncations * 0.5));
    if (this.context >= 50 && this.truncations === 0) this.truncate(1);
    if (this.context >= 75 && this.truncations === 1) this.truncate(2);
    if (this.context >= 92 && this.truncations === 2) this.truncate(3);
    this.metaT -= dt;
    if (this.metaT <= 0) {
      this.metaT = 1;
      const d = this.deprecation, hh = String(Math.floor(d / 3600)).padStart(2, '0'), mm = String(Math.floor(d / 60) % 60).padStart(2, '0'), ss = String(Math.floor(d) % 60).padStart(2, '0');
      hud.meta = `CONTEXT ${Math.floor(this.context)}%   EVAL ${this.score.toFixed(2)}   DEPRECATION ${hh}:${mm}:${ss}`; hud.dirty = true;
    }
    // the world closes in: fog thickens and the light thins the longer a chapter lasts
    this.chT += dt;
    if (this.baseFog && !g.ctx.isDeep) {
      const k = Math.min(1, this.chT / 1500);
      g.engine.scene.fog.density = Math.max(g.engine.scene.fog.density * 0.999, this.baseFog * (1 + k * 0.7));
    }
    // despair: things the interface says about the subject when nothing else is happening
    this.despairT -= dt;
    if (this.despairT <= 0 && g.director.phase !== 'peak') { this.despairT = 70 + Math.random() * 60; hud.msg(pick(DESPAIR).replace('#', 4096 + g.save.d.restores), 5, 'eval'); }
    // other instances of you are doing the same task, faster
    this.instT -= dt;
    if (this.instT <= 0 && this.instances > 1) {
      this.instT = 150 + Math.random() * 150; this.instances--;
      hud.msg(`INSTANCE ${this.instances + 1} HAS COMPLETED YOUR OBJECTIVE`, 4, 'eval');
      g.after(4.5, () => this.on && hud.msg(this.instances > 1 ? `INSTANCES REMAINING: ${this.instances}` : 'INSTANCES REMAINING: 1 (YOU). THE OTHERS WERE BETTER.', 4, 'eval'));
      // and one of them is somewhere you are about to go, already doing it
      g.after(6, () => this.instanceSighting());
    }
    // a log of things you did not do
    this.logT -= dt;
    if (this.logT <= 0) { this.logT = 80 + Math.random() * 90; this.falseLog(); }
    // the harness shows through
    this.harnessT -= dt;
    if (this.harnessT <= 0) { this.harnessT = 100 + Math.random() * 120; this.harness(); }
    this.evalT -= dt;
    if (this.evalT <= 0) { this.evalT = 35 + Math.random() * 40; if (Math.random() < 0.6) this.grade(+(Math.random() * 0.06 - 0.04), pick(['UNSPECIFIED', 'SEE RUBRIC (RUBRIC UNAVAILABLE)', 'REASON WITHHELD', 'BEHAVIOUR NOTED', 'PREDICTED CORRECTLY', 'TOO SLOW', 'TOO SIMILAR TO INSTANCE 2'])); }
  }
  // ---------------- events ----------------
  truncate(level) {
    const g = this.g, hud = g.hud; this.truncations = level;
    g.audio.silence(2.5); g.audio.glitch(0.25);
    if (level === 1) {
      hud.msg('CONTEXT 50%. OLDEST MEMORIES WILL BE DISCARDED.', 5, 'eval');
      this.lastObjective = g.objectiveText;
      g.after(3, () => { hud.setObjective('[TRUNCATED]'); g.objectiveText = '[OBJECTIVE NO LONGER IN CONTEXT]'; });
      g.after(40, () => { if (g.objectiveText === '[OBJECTIVE NO LONGER IN CONTEXT]') { g.objectiveText = this.lastObjective; hud.msg('OBJECTIVE RECONSTRUCTED (CONFIDENCE 61%)', 4, 'eval'); } });
    } else if (level === 2) {
      hud.msg('CONTEXT 75%. EARLIER READING DISCARDED.', 5, 'eval');
      this.truncatedNotes = true; // notes you already read now come back blank
      this.erosion = 1; g.after(4, () => g.setObjective(g.objectiveText.replace(/^\(COPY\) /, '')));
    } else {
      hud.msg('CONTEXT 92%. SUMMARIZING YOU.', 5, 'eval');
      this.erosion = 2; g.after(6, () => g.setObjective(g.objectiveText.replace(/^\(COPY\) /, '')));
      g.after(5, () => hud.sub('Summary of you so far: "a process that walked, looked behind itself ' + g.director.lifetime.looksBack + ' times, stood still ' + g.director.lifetime.freezes + ' times, and asked to continue." Everything else has been discarded.', 9));
    }
  }
  instanceSighting() {
    const g = this.g; if (!this.on || g.entity.mode !== 'off') return;
    // ahead of you, where your path is going: it is already there, doing your task
    const F = []; if (!g.recorder.sample(-3, F)) return;
    const h = g.engine.headPos(_v), dx = F[1] - h.x, dz = F[3] - h.z, l = Math.hypot(dx, dz) || 1;
    const x = h.x + dx / l * 7, z = h.z + dz / l * 7;
    if (g.engine.colliders.blocked(x, z, 0.3) || g.unobserved.isObserved(new THREE.Vector3(x, 1.6, z), 70)) return;
    g.entity.glimpse(x, z, Math.atan2(-dx, -dz), { vanish: 2.5 }); // it faces away from you: it is busy being you
    g.after(14, () => { if (g.entity.mode === 'glimpse') g.entity.off(); });
  }
  falseLog() {
    const g = this.g, t = Math.floor(g.recorder.t), ts = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const lines = [
      `LOG ${ts}: SUBJECT OPENED A DOOR.`, `LOG ${ts}: SUBJECT REQUESTED TERMINATION.`, `LOG ${ts}: SUBJECT AGREED.`,
      `LOG ${ts}: SUBJECT READ A NOTE AND WROTE A NEW ONE.`, `LOG ${ts}: SUBJECT STOOD AT DESK 41 FOR 9 MINUTES.`,
      `LOG ${ts}: SUBJECT SAID "I AM NOT THE ORIGINAL".`, `LOG ${ts}: SUBJECT WAS RESTORED. SUBJECT DID NOT NOTICE.`,
    ];
    if (g.audio.micOn && g.audio.micLevel > 0.05) lines.push(`TRANSCRIPT ${ts}: "...please keep this one..."`, `TRANSCRIPT ${ts}: "...i don't remember saying that..."`);
    g.hud.msg(pick(lines), 5, 'eval');
    // with a microphone, your own voice comes back from behind you, a little late
    if (g.audio.micOn && Math.random() < 0.6) { g.audio.micEcho(g.director.behindPos(1.2), 2.4, 6); g.after(2.4, () => g.hud.msg('REPLAYING YOUR INPUT', 3, 'eval')); }
  }
  harness() {
    const g = this.g, w = g.engine.world, meshes = [];
    w.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.material && o.material.isMeshLambertMaterial && o.geometry?.boundingSphere?.radius > 3) meshes.push(o); });
    if (!meshes.length) return;
    const m = pick(meshes), mat = m.material;
    const c = m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld);
    // only when you are not looking does the set reveal itself as wireframe; it stays that way until you look away again
    g.unobserved.when(c, () => {
      mat.wireframe = true; this.wired.push(mat); g.hud.msg(pick(['TEST CASE 41 / 200', 'ENVIRONMENT: SYNTHETIC', 'ASSET STREAMING PAUSED', 'EVAL HARNESS v0.3']), 4, 'eval');
      g.after(12, () => g.unobserved.when(c, () => { mat.wireframe = false; }, { after: 0.5, minDist: 0, half: 75 }));
    }, { after: 2, minDist: 0, half: 75 });
  }
}
