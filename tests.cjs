/* node tests.cjs — source-level regression and scientific guard rails. */
'use strict';
const assert=require('node:assert/strict');
const C=require('./core.js');
function near(a,b,tol=1e-9){assert.ok(Math.abs(a-b)<tol,'expected '+a+' ≈ '+b);}
function finite(xs){return xs.every(Number.isFinite);}

assert.equal(C.N,96);
assert.equal(C.K,8);
assert.deepEqual(C.ACTUAL_SECTORS,[0,2,4,6]);
assert.deepEqual(C.sources,[[48,24],[56,24],[40,24]]);
assert.deepEqual(C.receiver,[48,71]);
assert.equal(C.inside[0],0);
assert.equal(C.inside[48*96+48],1);

// Identical wave state and source must give exactly reproducible traces.
const empty=C.run(0,0,false),again=C.run(0,0,false);
assert.equal(empty.samples.length,350);
assert.deepEqual(empty.samples,again.samples);
assert.ok(finite(Array.from(empty.samples)));
assert.equal(empty.frames.length,0);
assert.equal(C.signature(empty.samples,0).length,100);
assert.equal(C.signature(empty.samples,1).length,100);
assert.equal(C.signature(empty.samples,0)[0],empty.samples[145]);
assert.equal(C.signature(empty.samples,1)[99],empty.samples[344]);

// Frame sequence is a visualization, NOT a decoder input.
const displayed=C.run(1,1,true);
assert.equal(displayed.frames.length,70);
assert.equal(displayed.frames[0].length,96*96);
assert.ok(displayed.frames[0][0]===0);
console.log('Physical geometry, deterministic wave and 100-sample windows: PASS.');

// Exact full-candidate dictionary: 16 words × 3 REAL source positions × 2 equal windows.
const library=C.templatesForAll();
assert.equal(library.length,16);
for(let w=0;w<16;w++){
  assert.equal(library[w].length,6);
  for(const sig of library[w]){assert.equal(sig.length,100);assert.ok(finite(sig));}
}
const ref=C.noiseReference(library);
assert.ok(ref>0 && Number.isFinite(ref),'nonzero single-wall RMS required');
console.log('Full 16-word physical response dictionary: PASS. Reference RMS',ref.toFixed(6));

// Demonstrate non-additivity in the WALL BITS, not ordinary intensity cross-terms.
let pair2=0;
for(let src=0;src<3;src++){
  for(let time=0;time<2;time++){
    let d2=0;for(let i=0;i<100;i++){
      const a=library[0][src*2+time][i];
      const b=library[1][src*2+time][i];
      const c=library[2][src*2+time][i];
      const d=library[3][src*2+time][i];
      d2+=(d-b-c+a)**2;
    }
    pair2=Math.max(pair2,Math.sqrt(d2/100));
  }
}
assert.ok(pair2>1e-7,'two-wall interaction should exceed roundoff');
console.log('Measured two-wall material cross-response:',pair2.toFixed(6));

// All candidates should be separable by the complete 6-action instrument;
// this is NOT a claim about a single action or inexpensive calibration.
for(let w=0;w<16;w++){
  let p=C.uniform();
  for(let a=0;a<6;a++)p=C.updated(p,library,a,library[w][a],Math.max(ref*0.0001,1e-9));
  assert.equal(C.best(p),w,'complete dictionary distinguishability for '+w);
}
console.log('Known exact records resolved with all six noiseless pings: PASS.');

// Adaptive interrogation: normalized posterior and physically grounded ranking.
const p=C.uniform();
const scores=C.actionScores(p,library,ref*.4);
assert.equal(scores.length,6);
assert.ok(scores.every(x=>x>=0&&Number.isFinite(x)));
const choice=C.pick(p,library,ref*.4);
assert.equal(scores[choice],Math.max(...scores));
const rng=C.seeded(99);
const o=C.observe(7,choice,library,ref*.4,rng);
const post=C.updated(p,library,choice,o,ref*.4);
near(post.reduce((a,b)=>a+b,0),1);
assert.ok(C.entropy(post)<=4+1e-6);
console.log('Posterior updates and adaptive-source selection: PASS.');

// Same hidden test set / detector noise per method and reproducible receipts.
const one=C.benchmark(library,ref*.4,32,2,20261027);
const two=C.benchmark(library,ref*.4,32,2,20261027);
assert.deepEqual(one,two);
for(const k of ['adaptive','fixed','cycle','random']){
  assert.ok(one.methods[k].accuracy>=0&&one.methods[k].accuracy<=1);
  assert.ok(one.methods[k].bitAccuracy>=0&&one.methods[k].bitAccuracy<=1);
}
console.log('Paired seeded benchmark: PASS.');
console.log(JSON.stringify({noise_sigma:ref*.4,shots:2,trials:32,methods:one.methods},null,2));

const stress=C.benchmark(library,ref*1.6,128,2,20261027);
console.log('CHALLENGING NOISE CONTROL: 160% of single-wall RMS, 128 paired trials, two pings');
console.log(JSON.stringify(stress.methods,null,2));

