/* Optional heavy numerical receipt: 256 truth words × 6 probes × 2 source arms.
 * The complete table exists only to score a model trained on 37/93 low-weight
 * wall configurations.  Run: node directional-receipt.cjs
 */
'use strict';
require('./core.js');
require('./geometry-core.js');
const D=require('./directional-core.js');
const started=Date.now(),truth=D.makeOracle((arm,done,total)=>{
  if(done===1||done%64===0)console.log('Oracle simulation progress',arm,done+'/'+total);
});
console.log('Truth oracle finished: '+((Date.now()-started)/1000).toFixed(1)+'s');
const cases=[];
for(const window of [0,1])for(const order of [2,3]){
  const options={window,order,trials:1,noise:.04,seed:20261027};
  const r=D.compare(truth,options);cases.push(r);
  console.log('CASE',JSON.stringify({window,order,budget:r.calibrationStates,heldout:r.heldout,
    parabolic:r.methods.parabolic,fixed:r.methods.fixed,paired:r.paired}));
}
for(const frequency of [0,1]){
  const probes=frequency===0?[0,1,2]:[3,4,5];
  const r=D.compare(truth,{window:1,order:3,probes,trials:1,noise:.04,seed:20261027});
  console.log('FREQUENCY CONTROL',D.frequencies[frequency],JSON.stringify({budget:r.calibrationStates,
    heldout:r.heldout,parabolic:r.methods.parabolic,fixed:r.methods.fixed,paired:r.paired}));
}

// Stress tests are exploratory controls added after the 4% ceiling became clear.
// We retain all records, physical packet shapes and calibration restrictions.
for(const noise of [.5,2,5,10]){
  const r=D.compare(truth,{window:1,order:2,trials:3,noise,seed:20261027});
  console.log('NOISE STRESS',noise,JSON.stringify({budget:r.calibrationStates,
    heldout:r.heldout,parabolic:r.methods.parabolic,fixed:r.methods.fixed,paired:r.paired}));
}
for(const [label,probes] of [['one-low',[1]],['one-high',[4]],['two-direct',[1,4]]]){
  const r=D.compare(truth,{window:1,order:2,probes,trials:3,noise:2,seed:20261027});
  console.log('SHOT STRESS',label,JSON.stringify({budget:r.calibrationStates,
    heldout:r.heldout,parabolic:r.methods.parabolic,fixed:r.methods.fixed,paired:r.paired}));
}
console.log('COMPLETE RECEIPT',JSON.stringify({frozen:{
  rho:D.RHO,k0:D.K0,angular_samples:D.ANGLES,packet_width:D.WIDTH,
  two_k:D.frequencies,three_bearings:D.bearings,launch_energy:1,source:'first focus',
  receiver:'second focus',pings_per_record:6,window_steps:[[145,244],[245,344]],
  no_gain_proof:true
},cases}));
