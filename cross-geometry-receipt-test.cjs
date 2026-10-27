'use strict';
/* Check the published numerical receipt against the locked selection rule.
 * This does NOT substitute for re-running cross-geometry-benchmark.cjs.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=JSON.parse(fs.readFileSync('cross-geometry-results.json','utf8'));
const c=r.originalEllipse.fixedCandidateTuning;
const names=['0.45','0.65','0.90','1.30','1.80'];
assert.deepEqual(Object.keys(c).sort(),names.slice().sort());
const expected=names.slice().sort((a,b)=>c[b].correct-c[a].correct||Number(a)-Number(b))[0];
assert.equal(r.winner,Number(expected));
assert.equal(r.params.calibrationWords,37);
assert.equal(r.params.unseenWords,219);
assert.deepEqual(r.params.k,[.65,1.3]);
assert.equal(r.params.noiseMultiplier,2);
assert.equal(r.params.replicates,3);
assert.ok(r.sigma>0&&Number.isFinite(r.sigma));
assert.equal(r.successCriterion,false);
for(const k of ['stadium','rotated']){
  const v=r.heldout[k];
  assert.equal(v.parabolic.total,219*3);
  assert.equal(v.fixed.total,219*3);
  assert.equal(v.parabolic.heldout,219);
  assert.equal(v.fixed.heldout,219);
  assert.equal(v.paired.parabolicOnly-v.paired.fixedOnly,
    v.parabolic.correct-v.fixed.correct);
  assert.ok(v.sourceInside&&v.receiverInside);
  assert.equal(v.wallSectorFaceCounts.length,8);
  assert.ok(v.wallSectorFaceCounts.every(x=>x>0));
  for(const kind of ['parabolic','fixed']){
    assert.ok(v.launchEnergy[kind].every(E=>Math.abs(E-1)<1e-10));
    assert.ok(v.maxRobinInjectionEnergy[kind]<.005);
  }
  for(const [side,stats] of Object.entries(v.frequencyControls)){
    assert.ok(['low','high'].includes(side));
    assert.equal(stats.parabolic.total,657);
    assert.equal(stats.fixed.total,657);
  }
}
console.log('Committed frozen independent-geometry receipt: schema, tuning rule, paired trial counts, energies and losses PASS');
