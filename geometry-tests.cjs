/* node geometry-tests.cjs — physical consistency, causal downset, no holdout leaks */
'use strict';
const assert=require('node:assert/strict');
const C=require('./core.js'),G=require('./geometry-core.js');
assert.equal(G.K,8);
assert.equal(G.WORDS,256);
const t=G.simulate((1<<0)|(1<<4),0);
const old=C.run(5,0,false).samples;
for(let i=0;i<100;i++){
  assert.ok(Math.abs(t[i]-old[145+i])<1e-6,'original core early trace mismatch at '+i);
  assert.ok(Math.abs(t[100+i]-old[245+i])<1e-6,'original core late trace mismatch at '+i);
}
console.log('8-bit physics matches Kavitaatio-derived 4-bit solver on matching wall words: PASS');
const geo=G.geometry(6);
assert.equal(geo.earliest.length,256);
assert.equal(geo.bySource.length,3);
for(let m=1;m<256;m++){
  for(let b=0;b<8;b++)if(m&(1<<b))
    assert.ok(geo.earliest[m]>=geo.earliest[m^(1<<b)]-1e-6,'tour monotonic '+m);
}
console.log('Geometry calculator: source-to-patch-to-receiver tours and monotonic subsets PASS');
for(const deadline of [244,344,444]){
  for(const budget of [17,37,65,93,163]){
    for(const policy of ['geometry','degree']){
      const masks=G.calibrationMasks(geo,budget,deadline,policy);
      assert.ok(G.downsetCheck(masks), 'invalid downset for '+deadline+' '+budget+' '+policy);
      assert.ok(masks.length<=budget);
      assert.equal(masks[0],0);
      for(let b=0;b<8;b++)assert.ok(masks.includes(1<<b));
      for(const m of masks)if(G.popcounts[m]>=2)
        assert.ok(geo.earliest[m]<=deadline+40+1e-9,'not geometrically eligible');
    }
  }
}
console.log('Strict sparse geometry selection, causal gate and equal-degree control PASS');
const rng=()=>Math.random();
{
  const K=8,len=6;
  const all=new Float64Array(256*len),coeff=new Float64Array(256*len);
  for(let m=0;m<256;m++)if(G.popcounts[m]<=2){
    for(let j=0;j<len;j++)coeff[m*len+j]=Math.sin(m*2+j);
  }
  for(let m=0;m<256;m++)for(let s=m;;s=(s-1)&m){
    for(let j=0;j<len;j++)all[m*len+j]+=coeff[s*len+j];
    if(s===0)break;
  }
  const calibration=new Map();
  for(let m=0;m<256;m++)if(G.popcounts[m]<=2)
    calibration.set(m,all.slice(m*len,m*len+len));
  const model=G.fittedTable(calibration,len);
  for(let m=0;m<256;m++)for(let j=0;j<len;j++)
    assert.ok(Math.abs(all[m*len+j]-model[m*len+j])<1e-9);
  console.log('Restricted Möbius fit and zeta reconstruction exact on synthetic degree-two memory PASS');
}
const time=Date.now(),oracle=G.makeOracle();
console.log('Complete independent 256 × 3 oracle simulations for SCORING ONLY:', ((Date.now()-time)/1000).toFixed(2),'seconds');
for(const w of [0,1,2,16,85,255]){
  for(let s=0;s<3;s++){
    const direct=G.simulate(w,s),offset=(w*3+s)*3*100;
    for(let j=0;j<direct.length;j++)assert.equal(direct[j],oracle[offset+j]);
  }
}
const cost=G.calibrationMasks(geo,65,344,'geometry');
const model=G.modelFromCalibratedOracle(oracle,cost,1,[0,1,2]);
const calibrationOnly=new Map(cost.map(m=>[m,G.feature(oracle,m,1,[0,1,2])]));
const clean=G.fittedTable(calibrationOnly,300);
assert.deepEqual(model,clean);
for(const mask of cost){
  const f=G.feature(oracle,mask,1,[0,1,2]);
  const p=model.subarray(mask*300,(mask+1)*300);
  for(let j=0;j<p.length;j++)assert.ok(Math.abs(p[j]-f[j])<1e-9);
}
console.log('Model reproduces every calibration configuration exactly, with no heldout reads PASS');
for(const deadline of [244,344,444]){
  const r=G.compare(oracle,geo,{budget:65,win:(deadline-244)/100,noise:.04,repeats:1,seed:27});
  assert.ok(r.commonHoldout>0);
  for(const key of ['geometry','degree']){
    const s=r.methods[key];
    assert.equal(s.heldout,r.commonHoldout);
    assert.ok(s.noiselessCorrect<=s.heldout);
    assert.ok(s.noisyCorrect<=s.noisyTotal);
    assert.ok(s.medianRelativeWaveformError>=0);
  }
  console.log('Holdout read, deadline',deadline, 'budget',r.selected,'common holdout',r.commonHoldout,
    'exact (geometry/degree)',r.methods.geometry.noiselessCorrect+'/'+r.commonHoldout,
    r.methods.degree.noiselessCorrect+'/'+r.commonHoldout,
    'noise',(100*r.methods.geometry.accuracy).toFixed(1)+'% / '+(100*r.methods.degree.accuracy).toFixed(1)+'%');
}
console.log('ALL 8-BIT CAUSAL CALIBRATION GATES PASSED');
