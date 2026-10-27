/* node directional-tests.cjs: source physics, controlled cost, heldouts. */
'use strict';
const assert=require('node:assert/strict');
const R=require('./core.js'),G=require('./geometry-core.js'),D=require('./directional-core.js');
function near(a,b,eps=1e-10){assert.ok(Math.abs(a-b)<=eps,String(a)+' != '+String(b));}
function allFinite(a){return Array.from(a).every(Number.isFinite);}
assert.equal(D.PROBES.length,6);
assert.deepEqual(D.frequencies,[.65,1.3]);
assert.equal(D.initial.parabolic.length,6);
assert.equal(D.initial.fixed.length,6);
let meaningfulGap=0;
for(const p of D.PROBES){
  const x=D.angularWeights('parabolic',p.k,p.bearing);
  const y=D.angularWeights('fixed',p.k,p.bearing);
  near(x.reduce((a,b)=>a+b,0),1);
  near(y.reduce((a,b)=>a+b,0),1);
  for(let i=0;i<x.length;i++)meaningfulGap=Math.max(meaningfulGap,Math.abs(x[i]-y[i]));
  for(const arm of D.arms){
    const shape=D.initial[arm][p.id];
    near(shape.energy,1,1e-9);
    near(D.physicalEnergy(shape.u,shape.v),1,1e-9);
    assert.ok(allFinite(shape.u)&&allFinite(shape.v));
    for(let i=0;i<R.inside.length;i++)if(!R.inside[i]){
      near(shape.u[i],0);near(shape.v[i],0);
    }
  }
}
assert.ok(meaningfulGap>1e-3);
const atRefPara=D.angularWeights('parabolic',D.K0,0);
const atRefFixed=D.angularWeights('fixed',D.K0,0);
for(let i=0;i<atRefPara.length;i++)near(atRefPara[i],atRefFixed[i],1e-14);
const refPacketPara=D.packet('parabolic',D.K0,0),refPacketFixed=D.packet('fixed',D.K0,0);
for(let i=0;i<refPacketPara.u.length;i++){
  near(refPacketPara.u[i],refPacketFixed.u[i],1e-12);
  near(refPacketPara.v[i],refPacketFixed.v[i],1e-12);
}
console.log('EXACT complex-ray angular weights, fixed-angle match at k0, equal discrete launch energy PASS');

let maxWallEnergy=0;
for(const arm of D.arms)for(const launch of D.initial[arm]){
  let spring=0;
  for(let i=0;i<R.inside.length;i++)
    if(R.inside[i]&&R.counts[i])spring+=R.counts[i]*launch.u[i]*launch.u[i];
  const extra=.5*R.C*R.C*.28*spring;
  maxWallEnergy=Math.max(maxWallEnergy,extra);
}
console.log('Maximum wall-bit-dependent potential at injection (all sectors written):',maxWallEnergy.toExponential(5),'relative to E=1');
assert.ok(maxWallEnergy<.02,'initial wave packet deposits too much energy directly into unknown Robin springs');

for(const arm of D.arms)for(const word of [0,1,3,137]){
  const wave=D.simulate(word,arm,0);
  assert.equal(wave.length,200);
  assert.ok(allFinite(wave));
}
const forOne=D.simulate(0,'parabolic',0,35,20);
assert.equal(forOne.field.length,R.N*R.N);
assert.ok(allFinite(forOne.field));
console.log('Real signed receiver waveforms for blank, single, multi-bit walls PASS');
const masks=D.trainingMasks(),DIM=200;
const table=new Float64Array(256*DIM);
for(let m=0;m<256;m++)for(let sub=m;;sub=(sub-1)&m){
  if(G.popcounts[sub]<=2)for(let j=0;j<DIM;j++)
    table[m*DIM+j]+=(sub%9-3)*Math.sin((j+3)/19+sub);
  if(sub===0)break;
}
const training=new Map(masks.map(m=>[m,table.slice(m*DIM,(m+1)*DIM)]));
const model=G.fittedTable(training,DIM);
for(let i=0;i<table.length;i++)near(model[i],table[i],1e-8);
console.log('Restricted calibrated Map reconstructs exact degree-2 forward model without held-out responses PASS');
let diff=0;
for(const p of D.PROBES){
  const x=D.simulate(0,'parabolic',p.id),y=D.simulate(0,'fixed',p.id);
  for(let i=0;i<x.length;i++)diff=Math.max(diff,Math.abs(x[i]-y[i]));
}
assert.ok(diff>1e-5);
console.log('Parabolic and fixed-angle equal-energy launches produce non-identical physical echoes PASS',diff);
