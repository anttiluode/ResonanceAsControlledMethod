'use strict';
const assert=require('node:assert/strict');
const R=require('./core.js');
require('./geometry-core.js');
const D=require('./directional-core.js');
const B=require('./cross-geometry-benchmark.cjs');
assert.deepEqual(B.Q,[.45,.65,.9,1.3,1.8]);
assert.deepEqual(B.Ks,[.65,1.3]);
for(const name of ['original','stadium','rotated']){
  const g=B.makeGeometry(name);
  assert(g.active.length>2000&&g.active.length<4000,name+' bad area');
  assert(g.sectors.every(v=>v>0),name+' must retain 8 wall bits');
  for(const k of B.Ks){
    assert.equal(B.identityAtSingleK(g,k).identical,true);
    for(const q of [.65,.9,1.3]){
      const p=B.launch(g,k,q);
      assert.ok(Math.abs(p.E-1)<1e-10);
      assert.ok(B.maxWrittenPotential(g,p)<.005);
    }
  }
  const p=B.launch(g,.65,.9);
  const a=B.propagate(g,0,p),b=B.propagate(g,1,p);
  assert.equal(a.length,100);
  assert.ok(Array.from(a).every(Number.isFinite));
  assert.ok(Array.from(b).every(Number.isFinite));
  let change=0;for(let i=0;i<a.length;i++)change=Math.max(change,Math.abs(a[i]-b[i]));
  assert.ok(change>1e-9,name+' no wall memory effect');
  console.log(name,'domain=',g.active.length,'face counts=',g.sectors,'probe wall change=',change);
}
// Numerical identity to the original physical source solver on unchanged ellipse.
const original=B.makeGeometry('original');
for(const [frequency,id] of [[.65,1],[1.3,4]]){
  for(const q of [frequency,.9]){
    const arm=q===frequency?'parabolic':'fixed';
    const p=B.launch(original,frequency,q);
    const d=D.packet(arm,frequency,0);
    for(let i=0;i<p.u.length;i++){
      assert.ok(Math.abs(p.u[i]-d.u[i])<1e-12,'displacement match');
      assert.ok(Math.abs(p.v[i]-d.v[i])<1e-12,'velocity match');
    }
    const ours=B.propagate(original,5,p);
    const known=D.simulate(5,arm,id);
    for(let j=0;j<100;j++)
      assert.ok(Math.abs(ours[j]-known[100+j])<1e-6,
        'reference solver mismatch at '+frequency+' '+q+' '+j);
  }
}
console.log('Original-cavity exact source matching and original solver receiver validation PASS');
// A model must fit only 37 specified calibration states, no hidden calls.
const g=B.makeGeometry('original'),p=B.launch(g,.65,.65);
const t=B.propagate(g,17,p);
assert.equal(t.length,100);
console.log('All frozen cross-geometry invariants PASS');
