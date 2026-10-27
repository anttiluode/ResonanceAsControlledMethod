/* Physically launched, energy-matched, directionally composed wave packets.
 * OpenAI (2026) exact free-half-wave angular factor:
 *   H(k,theta;omega)=exp[-rho*k*(1-cos(theta-omega))]
 * is used AS A SOURCE SPECTRAL WEIGHT, not as a post-hoc receiver filter.
 * Control: identical angular Gaussian form, fixed reference k0 in exponent.
 * They coincide at k=k0. Finite, real traveling Gaussian packets approximate
 * the filtered superposition: this is NOT complex-time wave continuation
 * in the bounded Robin/Neumann cavity.
 */
(function(root){
'use strict';
const R=root.ResonanceLabCore,G=root.GeometryLabCore;
if(!R||!G)throw Error('Load core.js, geometry-core.js before directional-core.js');
const N=R.N,LEN=N*N,DT=R.DT,C=R.C,K=8,WORDS=256;
const K0=0.9,RHO=5,WIDTH=4.5,ANGLES=48,STEPS=345;
const frequencies=[0.65,1.30],bearings=[-Math.PI/3,0,Math.PI/3],WINDOW_STARTS=[145,245],WINDOW_LEN=100;
const arms=['parabolic','fixed'];
const active=[],neighbors=[],faces=[],edgePairs=[];
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x;if(!R.inside[i])continue;
  const nb=[];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,yy=y+dy,j=yy*N+xx;
    if(xx>=0&&xx<N&&yy>=0&&yy<N&&R.inside[j])nb.push(j);
    if((dx===1||dy===1)&&xx>=0&&xx<N&&yy>=0&&yy<N&&R.inside[j])edgePairs.push(i,j);
  }
  active.push(i);neighbors.push(nb);faces.push(4-nb.length);
}
function angularWeights(arm,k,bearing){
  if(!arms.includes(arm))throw Error('invalid angular arm');
  if(!(k>0))throw Error('positive k required');
  const raw=new Float64Array(ANGLES);let sum=0;
  for(let j=0;j<ANGLES;j++){
    const phi=-Math.PI+2*Math.PI*j/ANGLES;
    const exponentK=arm==='parabolic'?k:K0;
    raw[j]=Math.exp(-RHO*exponentK*(1-Math.cos(phi-bearing)));
    sum+=raw[j];
  }
  for(let j=0;j<ANGLES;j++)raw[j]/=sum;
  return raw;
}
function physicalEnergy(u,velocity){
  let E=0;
  for(const i of active)E+=velocity[i]*velocity[i];
  let differences=0;
  for(let j=0;j<edgePairs.length;j+=2){
    const d=u[edgePairs[j]]-u[edgePairs[j+1]];
    differences+=d*d;
  }
  return 0.5*(E+C*C*differences);
}
function packet(arm,k,bearing){
  const weights=angularWeights(arm,k,bearing),u=new Float64Array(LEN),v=new Float64Array(LEN);
  const [sy,sx]=R.sources[0];
  for(let h=0;h<ANGLES;h++){
    const phi=-Math.PI+2*Math.PI*h/ANGLES,dx0=Math.cos(phi),dy0=Math.sin(phi),a=weights[h];
    if(a<1e-12)continue;
    for(const i of active){
      const x=i%N-sx,y=Math.floor(i/N)-sy;
      const envelope=Math.exp(-(x*x+y*y)/(2*WIDTH*WIDTH));
      if(envelope<1e-13)continue;
      const projection=x*dx0+y*dy0,phase=k*projection;
      // v = time derivative of g(x-c t n)*cos(k*n*(x-c t n)) at t=0.
      const cs=Math.cos(phase),sn=Math.sin(phase),weighted=a*envelope;
      u[i]+=weighted*cs;
      v[i]+=C*weighted*(k*sn+(projection/(WIDTH*WIDTH))*cs);
    }
  }
  const raw=physicalEnergy(u,v);
  if(!(raw>0))throw Error('zero launch energy');
  const factor=1/Math.sqrt(raw);
  for(const i of active){u[i]*=factor;v[i]*=factor;}
  return {u,v,energy:physicalEnergy(u,v),rawEnergy:raw,weights};
}
function probes(){
  const all=[];
  for(const k of frequencies)for(const bearing of bearings){
    all.push({id:all.length,k,bearing,label:k.toFixed(2)+' rad/cell · '+Math.round(bearing*180/Math.PI)+'°'});
  }
  return all;
}
const PROBES=probes();
const initial={};
for(const arm of arms)initial[arm]=PROBES.map(p=>packet(arm,p.k,p.bearing));
function simulate(word,arm,probeIndex,steps=STEPS,inspectAt=-1){
  if(!Number.isInteger(word)||word<0||word>=WORDS)throw Error('invalid wall word');
  if(!arms.includes(arm)||!Number.isInteger(probeIndex)||probeIndex<0||probeIndex>=PROBES.length)throw Error('invalid probe');
  const launch=initial[arm][probeIndex];
  let current=launch.u.slice(),prev=launch.u.slice(),next=new Float64Array(LEN);
  for(const i of active)prev[i]-=DT*launch.v[i];
  const out=new Float32Array(WINDOW_STARTS.length*WINDOW_LEN);
  const receiver=R.receiver[0]*N+R.receiver[1];
  const wave2=(C*DT)**2,aa=1+.006*DT/2,bb=1-.006*DT/2;
  let field=null;
  for(let t=0;t<steps;t++){
    for(let j=0;j<active.length;j++){
      const i=active[j],nb=neighbors[j];
      let lap=-(nb.length+(((word>>>R.sector[i])&1)?faces[j]*.28:0))*current[i];
      for(let a=0;a<nb.length;a++)lap+=current[nb[a]];
      next[i]=(2*current[i]-bb*prev[i]+wave2*lap)/aa;
    }
    const swap=prev;prev=current;current=next;next=swap;
    if(t===inspectAt)field=current.slice();
    for(let w=0;w<WINDOW_STARTS.length;w++){
      const off=t-WINDOW_STARTS[w];
      if(off>=0&&off<WINDOW_LEN)out[w*WINDOW_LEN+off]=current[receiver];
    }
  }
  return inspectAt>=0?{trace:out,field}:out;
}
function feature(oracle,arm,word,window,selectedProbes=null){
  const indices=selectedProbes||PROBES.map(p=>p.id),L=indices.length*WINDOW_LEN;
  const actual=oracle[arm];
  if(!actual)throw Error('missing directional arm');
  const result=new Float64Array(L);
  for(let j=0;j<indices.length;j++){
    const off=((word*PROBES.length+indices[j])*2+window)*WINDOW_LEN;
    for(let t=0;t<WINDOW_LEN;t++)result[j*WINDOW_LEN+t]=actual[off+t];
  }
  return result;
}
function makeOracle(progress){
  const out={};
  for(const arm of arms){
    const wave=new Float32Array(WORDS*PROBES.length*WINDOW_STARTS.length*WINDOW_LEN);
    for(let word=0;word<WORDS;word++){
      for(const p of PROBES){
        const trace=simulate(word,arm,p.id);
        wave.set(trace,word*PROBES.length*2*WINDOW_LEN+p.id*2*WINDOW_LEN);
      }
      if(progress&&(word===0||word%8===7))progress(arm,word+1,WORDS);
    }
    out[arm]=wave;
  }
  return out;
}
function trainingMasks(){
  return Array.from({length:WORDS},(_,i)=>i).filter(m=>G.popcounts[m]<=2);
}
function train(oracle,arm,maskList,window,selectedProbes=null){
  const ids=selectedProbes||PROBES.map(p=>p.id);
  const calibrated=new Map();
  for(const m of maskList)calibrated.set(m,feature(oracle,arm,m,window,ids));
  // Reuse restricted training from geometry-core; it is incapable of querying
  // any wall response not in its input Map.
  return G.fittedTable(calibrated,ids.length*WINDOW_LEN);
}
function noiseReference(oracle){
  // Locked, common sigma from only legitimate low-order calibration states.
  // Do not infer sigma from the unseen multi-wall response table.
  const rms=[];
  for(const arm of arms)for(const p of PROBES){
    const base=feature(oracle,arm,0,1,[p.id]);
    for(let bit=0;bit<K;bit++){
      const written=feature(oracle,arm,1<<bit,1,[p.id]);
      let ss=0;for(let t=0;t<WINDOW_LEN;t++){const d=written[t]-base[t];ss+=d*d;}
      rms.push(Math.sqrt(ss/WINDOW_LEN));
    }
  }
  rms.sort((a,b)=>a-b);
  return .5*(rms[(rms.length>>1)-1]+rms[rms.length>>1]);
}
function seeded(seed){
  let state=(seed>>>0)||123456789;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}
function normal(random){return Math.sqrt(-2*Math.log(Math.max(1e-14,random())))*Math.cos(2*Math.PI*random());}
function compare(oracle,opts={}){
  const window=opts.window===0?0:1,noise=opts.noise===undefined?.04:opts.noise;
  const trials=Math.max(1,Math.round(opts.trials||3)),seed=opts.seed||20261027;
  const ids=Array.isArray(opts.probes)&&opts.probes.length?opts.probes:PROBES.map(p=>p.id);
  const bits=opts.order===3?3:2;
  const masks=Array.from({length:WORDS},(_,i)=>i).filter(m=>G.popcounts[m]<=bits);
  const unseen=Array.from({length:WORDS},(_,i)=>i).filter(m=>G.popcounts[m]>bits);
  const DIM=ids.length*WINDOW_LEN;
  const sigma=noise*noiseReference(oracle);
  const result={window,noise,noiseSigma:sigma,trials,order:bits,calibrationStates:masks.length,
    calibrationPingsPerArm:masks.length*ids.length,heldout:unseen.length,
    probeIds:ids,launchEnergy:1,methods:{},paired:{}};
  const allPred={},allHits={};
  for(const arm of arms){
    const model=train(oracle,arm,masks,window,ids);
    allPred[arm]=model;
    const stochastic=[],realErrors=[];
    let exact=0,correct=0,bitGood=0;
    const rng=seeded(seed); // shared hidden words, noise draws across arms
    for(const word of unseen){
      const actual=feature(oracle,arm,word,window,ids);
      const trueGuess=G.predict(model,actual,DIM);
      if(trueGuess===word)exact++;
      let den=0,err=0;
      for(let t=0;t<DIM;t++){
        const d=actual[t]-model[word*DIM+t];err+=d*d;den+=(actual[t])**2;
      }
      realErrors.push(Math.sqrt(err/(den+1e-20)));
      for(let rep=0;rep<trials;rep++){
        const obs=actual.slice();
        for(let t=0;t<DIM;t++)obs[t]+=sigma*normal(rng);
        const guess=G.predict(model,obs,DIM),hit=(guess===word);
        stochastic.push(hit);
        if(hit)correct++;
        bitGood+=K-G.popcounts[word^guess];
      }
    }
    realErrors.sort((a,b)=>a-b);
    result.methods[arm]={exactNoiseless:exact,correct,total:unseen.length*trials,
      accuracy:correct/(unseen.length*trials),
      bitAccuracy:bitGood/(K*unseen.length*trials),
      medianRelativeWaveError:realErrors[Math.floor(realErrors.length/2)]};
    allHits[arm]=stochastic;
  }
  let parOnly=0,fixedOnly=0;
  for(let i=0;i<allHits.parabolic.length;i++){
    if(allHits.parabolic[i]&&!allHits.fixed[i])parOnly++;
    if(!allHits.parabolic[i]&&allHits.fixed[i])fixedOnly++;
  }
  result.paired={parabolicOnly:parOnly,fixedOnly,discordant:parOnly+fixedOnly,
    caveat:'Same standard-normal noise draws per word/rep/sample, multiplied by equal sigma; different channels give different true waveforms.'};
  return result;
}
const API={K,WORDS,STEPS,WINDOW_STARTS,WINDOW_LEN,RHO,K0,WIDTH,ANGLES,
 frequencies,bearings,arms,PROBES,angularWeights,physicalEnergy,packet,
 initial,simulate,feature,makeOracle,train,trainingMasks,noiseReference,seeded,compare};
root.DirectionalMemoryCore=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:self);
