// Live animation retargeting between different skeletons (Mixamo, Renderpeople, Sketchfab exports).
// Method: world-space deltas. For every mapped bone, the target's world rotation becomes
//   srcWorld(t) * srcBind^-1 * align * tgtBind
// where `align` turns the target's resting bone direction onto the source's resting direction
// (fixes A-pose vs T-pose rigs). Robust to differing bone axes, units and export conversions.
import * as THREE from 'three';

const RP = { hip: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', neck: 'Neck', head: 'Head', shoulder_l: 'LeftShoulder', upperarm_l: 'LeftArm', lowerarm_l: 'LeftForeArm', hand_l: 'LeftHand', shoulder_r: 'RightShoulder', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand', thigh_l: 'LeftUpLeg', calf_l: 'LeftLeg', foot_l: 'LeftFoot', ball_l: 'LeftToeBase', thigh_r: 'RightUpLeg', calf_r: 'RightLeg', foot_r: 'RightFoot', ball_r: 'RightToeBase' };
const KEEP = new Set(Object.values(RP));
// canonical (Mixamo) name for any bone name we know
export function canon(n) {
  const r = n.replace(/^rp_.*?_(idling|walking|standing|sitting)_/, '').replace(/_\d+$/, '');
  if (RP[r]) return RP[r];
  const m = n.replace(/^.*?(mixamorig|KillerClown)[:]?/, '').replace(/_\d+$/, '');
  return KEEP.has(m) ? m : null;
}
const CHILD = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };

function bones(root) { const out = {}; root.traverse(o => { if (o.isBone) { const c = canon(o.name); if (c && !out[c]) out[c] = o; } }); return out; }
const depth = o => { let d = 0; while (o.parent) { d++; o = o.parent; } return d; };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

export class Retargeter {
  // target: the visible character root (bind pose). source: a hidden Mixamo rig root (bind pose) with its own mixer.
  constructor(target, source) {
    target.updateMatrixWorld(true); source.updateMatrixWorld(true);
    const tb = bones(target), sb = bones(source);
    this.pairs = [];
    for (const k in tb) {
      if (!sb[k]) continue;
      const t = tb[k], s = sb[k];
      const s0 = s.getWorldQuaternion(new THREE.Quaternion()), t0 = t.getWorldQuaternion(new THREE.Quaternion());
      let align = new THREE.Quaternion();
      const ck = CHILD[k];
      if (ck && tb[ck] && sb[ck] && k !== 'Hips') {
        const td = tb[ck].getWorldPosition(_a).sub(t.getWorldPosition(_b)).normalize();
        const sd = sb[ck].getWorldPosition(_c).sub(s.getWorldPosition(_d)).normalize();
        if (td.lengthSq() > 0.5 && sd.lengthSq() > 0.5) align.setFromUnitVectors(td, sd);
      }
      this.pairs.push({ k, t, s, base: new THREE.Quaternion().copy(s0).invert().multiply(align).multiply(t0) });
    }
    this.pairs.sort((a, b) => depth(a.t) - depth(b.t));
    this._w = new THREE.Quaternion(); this._p = new THREE.Quaternion();
  }
  apply() {
    const w = this._w, p = this._p;
    for (const pr of this.pairs) {
      pr.s.getWorldQuaternion(w); w.multiply(pr.base);
      pr.t.parent.getWorldQuaternion(p); pr.t.quaternion.copy(p.invert().multiply(w));
      pr.t.updateMatrixWorld(true);
    }
  }
}
