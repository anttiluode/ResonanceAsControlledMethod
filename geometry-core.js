/* Eight-wall causal calibration laboratory.
   Physical finite-difference solver uses exactly the ellipse, Neumann/Robin boundary
   stencil, time step, speed and damping of Kavitaatio experiment.py.
   The complete 256-state simulation is only an independent scoring oracle.
   Calibration is passed to fitModel() as a restricted Map (no oracle reference).
   No third-party libraries.
*/
(function(root){
'use strict';
const R=root.ResonanceLabCore;
if(!R)throw Error('Load core.js before geometry-core.js');
const K=8, WORDS=256, NSRC=3, N=R.N, LEN=N*N, STEPS=445;
const DT=R.DT,C=R.C,DAMP=.006,STIFF=.28;
const starts=[145,245,345], WINDOWS=3, WINDOWLEN=100;
const sectors=R.sector, inside=R.inside, faceCount=R.counts;
const active=[],nbr=[],degree=[];
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x;if(!inside[i])continue;
  const neighbors=[];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const X=x+dx,Y=y+dy,j=Y*N+X;
    if(X>=0&&Y>=0&&X<N&&Y<N&&inside[j])neighbors.push(j);
  }
  active.push(i);nbr.push(neighbors);degree.push(neighbors.length);
}
const countBits=x=>{let c=0;while(x){x&=x-1;c++;}return c;};
const popcounts=Array.from({length:WORDS},(_,mask)=>countBits(mask));
function simulate(word,source){
  if(word<0||word>=WORDS||source<0||source>=NSRC)throw Error('bad word or source');
  let prev=new Float64Array(LEN),u=new Float64Array(LEN),next=new Float64Array(LEN);
  const [sy,sx]=R.sources[source];
  for(let k=0;k<active.length;k++){
    const i=active[k],y=Math.floor(i/N),x=i%N;
    u[i]=Math.exp(-((x-sx)**2+(y-sy)**2)/(2*1.55**2));
  }
  const out=new Float32Array(WINDOWS*WINDOWLEN);
  const receive=R.receiver[0]*N+R.receiver[1];
  const wave2=(C*DT)**2,aa=1+DAMP*DT/2,bb=1-DAMP*DT/2;
  for(let t=0;t<STEPS;t++){
    for(let k=0;k<active.length;k++){
      const i=active[k];let lap=-(degree[k]+(((word>>>sectors[i])&1)?STIFF*faceCount[i]:0))*u[i];
      const neighbors=nbr[k];for(let j=0;j<neighbors.length;j++)lap+=u[neighbors[j]];
      next[i]=(2*u[i]-bb*prev[i]+wave2*lap)/aa;
    }
    const swap=prev;prev=u;u=next;next=swap;
    for(let w=0;w<WINDOWS;w++)
      if(t>=starts[w] && t<starts[w]+WINDOWLEN)out[w*WINDOWLEN+t-starts[w]]=u[receive];
  }
  return out;
}
function makeOracle(progress){
  // Flat output [word][source][window][sample] for scoring.
  const oracle=new Float32Array(WORDS*NSRC*WINDOWS*WINDOWLEN);
  for(let word=0;word<WORDS;word++){
    for(let s=0;s<NSRC;s++){
      oracle.set(simulate(word,s),((word*NSRC+s)*WINDOWS)*WINDOWLEN);
    }
    if(progress&&(word%8===7||word===0))progress(word+1,WORDS);
  }
  return oracle;
}
const index=(word,source,win,t)=>(((word*NSRC+source)*WINDOWS+win)*WINDOWLEN+t);
function feature(oracle,word,win,sourceIds){
  const v=new Float64Array(sourceIds.length*WINDOWLEN);
  for(let j=0;j<sourceIds.length;j++){
    const off=index(word,sourceIds[j],win,0);
    for(let t=0;t<WINDOWLEN;t++)v[j*WINDOWLEN+t]=oracle[off+t];
  }
  return v;
}
function distancesBetween(points){
  const P=points.length,dist=new Float64Array(P*P);
  for(let i=0;i<P;i++)for(let j=i+1;j<P;j++){
    const v=Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y);
    dist[i*P+j]=dist[j*P+i]=v;
  }
  return dist;
}
function wallSamples(perPatch=6){
  const points=[];
  for(let sector=0;sector<K;sector++){
    const edge=[];
    for(let i=0;i<active.length;i++){
      const cell=active[i];
      if(sectors[cell]===sector && faceCount[cell])edge.push({x:cell%N,y:Math.floor(cell/N),sector});
    }
    edge.sort((a,b)=>{
      const aa=Math.atan2((a.y-R.MID)/R.B,(a.x-R.MID)/R.A);
      const bb=Math.atan2((b.y-R.MID)/R.B,(b.x-R.MID)/R.A);
      return aa-bb;
    });
    for(let j=0;j<Math.min(perPatch,edge.length);j++){
      const id=Math.round(j*(edge.length-1)/(Math.min(perPatch,edge.length)-1));
      points.push(edge[id]);
    }
  }
  return points;
}
function tourForSource(points,source){
  const P=points.length,full=(1<<K),dist=distancesBetween(points);
  const dp=new Float64Array(full*P).fill(Infinity);
  const S=R.sources[source],T=R.receiver;
  for(let i=0;i<P;i++)dp[(1<<points[i].sector)*P+i]=Math.hypot(S[1]-points[i].x,S[0]-points[i].y);
  const receiverDist=points.map(p=>Math.hypot(T[1]-p.x,T[0]-p.y));
  const arrival=new Float64Array(full);
  arrival[0]=Math.hypot(S[1]-T[1],S[0]-T[0])/(C*DT);
  for(let mask=1;mask<full;mask++){
    let best=Infinity;
    for(let i=0;i<P;i++){
      const here=dp[mask*P+i];
      if(!Number.isFinite(here))continue;
      best=Math.min(best,here+receiverDist[i]);
      for(let j=0;j<P;j++){
        const bit=1<<points[j].sector;
        if(mask&bit)continue;
        const address=(mask|bit)*P+j,candidate=here+dist[i*P+j];
        if(candidate<dp[address])dp[address]=candidate;
      }
    }
    arrival[mask]=best/(C*DT);
  }
  return arrival;
}
function geometry(perPatch=6){
  const points=wallSamples(perPatch);
  const bySource=Array.from({length:NSRC},(_,source)=>tourForSource(points,source));
  const earliest=new Float64Array(WORDS);
  for(let mask=0;mask<WORDS;mask++)earliest[mask]=Math.min(...bySource.map(a=>a[mask]));
  return {points,bySource,earliest};
}
function downsetCheck(chosen){
  const set=new Set(chosen);
  for(const mask of chosen){
    let sub=(mask-1)&mask;
    while(sub){if(!set.has(sub))return false;sub=(sub-1)&mask;}
    if(mask&&!set.has(0))return false;
  }
  return true;
}
function calibrationMasks(geo,budget,deadline,policy='geometry',margin=40){
  budget=Math.max(9,Math.min(WORDS,Math.floor(budget)));
  const selected=new Set([0,...Array.from({length:K},(_,i)=>1<<i)]);
  // All single bits are mandatory even when their earliest echo arrives
  // too late: otherwise a degenerate model simply cannot address those bits.
  // Unreachable higher interactions are not eligible at the deadline.
  while(selected.size<budget){
    let next=-1,rank0=Infinity,rank1=Infinity;
    for(let mask=1;mask<WORDS;mask++){
      if(selected.has(mask)||popcounts[mask]<2)continue;
      if(geo.earliest[mask]>deadline+margin)continue;
      let ready=true;
      for(let b=0;b<K;b++)if((mask&(1<<b))&&!selected.has(mask^(1<<b))){ready=false;break;}
      if(!ready)continue;
      const p=policy==='degree'?popcounts[mask]:geo.earliest[mask];
      const q=policy==='degree'?geo.earliest[mask]:popcounts[mask];
      if(p<rank0-1e-10||(Math.abs(p-rank0)<1e-10&&q<rank1)){
        next=mask;rank0=p;rank1=q;
      }
    }
    if(next<0)break;
    selected.add(next);
  }
  const ordered=Array.from(selected).sort((a,b)=>popcounts[a]-popcounts[b]||a-b);
  if(!downsetCheck(ordered))throw Error('calibration is not downward-closed');
  return ordered;
}
function fittedTable(calibration,featLen){
  // Exact binary Möbius inversion restricted to calibrated masks only.
  // Important: calibration must be a Map<mask, Float64Array> without
  // any uncalibrated response references.
  const keys=Array.from(calibration.keys());
  if(!downsetCheck(keys)||!calibration.has(0))throw Error('invalid calibration set');
  const coeff=new Float64Array(WORDS*featLen);
  keys.sort((a,b)=>popcounts[a]-popcounts[b]||a-b);
  for(const mask of keys){
    const actual=calibration.get(mask);
    if(actual.length!==featLen)throw Error('wrong feature length');
    const dest=mask*featLen;
    for(let t=0;t<featLen;t++)coeff[dest+t]=actual[t];
    let sub=(mask-1)&mask;
    while(sub){
      for(let t=0;t<featLen;t++)coeff[dest+t]-=coeff[sub*featLen+t];
      sub=(sub-1)&mask;
    }
    if(mask)for(let t=0;t<featLen;t++)coeff[dest+t]-=coeff[t];
  }
  // zeta expansion predicts all 256 words without looking at their echoes.
  const predicted=coeff.slice();
  for(let b=0;b<K;b++)for(let mask=0;mask<WORDS;mask++){
    if(!(mask&(1<<b)))continue;
    const off=mask*featLen,prev=(mask^(1<<b))*featLen;
    for(let t=0;t<featLen;t++)predicted[off+t]+=predicted[prev+t];
  }
  return predicted;
}
function modelFromCalibratedOracle(oracle,maskList,win,sources){
  // Gather *only* calibration rows. Nothing else passed into fittedTable.
  const calibration=new Map(),len=sources.length*WINDOWLEN;
  for(const mask of maskList)calibration.set(mask,feature(oracle,mask,win,sources));
  return fittedTable(calibration,len);
}
function predict(model,obs,len){
  let winner=0,best=Infinity;
  for(let mask=0;mask<WORDS;mask++){
    let sum=0,off=mask*len;
    for(let t=0;t<len;t++){const delta=model[off+t]-obs[t];sum+=delta*delta;}
    if(sum<best){best=sum;winner=mask;}
  }
  return winner;
}
function noiseReference(oracle){
  const amplitudes=[];
  for(let b=0;b<K;b++){
    const a=feature(oracle,1<<b,1,[0]),z=feature(oracle,0,1,[0]);
    let sum=0;for(let t=0;t<a.length;t++)sum+=(a[t]-z[t])**2;
    amplitudes.push(Math.sqrt(sum/a.length));
  }
  amplitudes.sort((a,b)=>a-b);
  return (amplitudes[3]+amplitudes[4])/2;
}
function compare(oracle,geo,opts){
  const budget=opts.budget||65,win=opts.win===undefined?1:opts.win;
  const sources=opts.sources===1?[0]:[0,1,2];
  const deadline=starts[win]+WINDOWLEN-1,noise=opts.noise===undefined?.04:opts.noise;
  const reps=opts.repeats||3,seed=opts.seed||20261027;
  const geom=calibrationMasks(geo,budget,deadline,'geometry');
  const degree=calibrationMasks(geo,geom.length,deadline,'degree');
  // Matched actual budget, in case the eligible downset is smaller
  // than requested. The common holdout is never used during fitting.
  const common=[];
  const ca=new Set(geom),cb=new Set(degree);
  for(let m=0;m<WORDS;m++)if(!ca.has(m)&&!cb.has(m))common.push(m);
  const DIM=sources.length*WINDOWLEN;
  const models={
    geometry:modelFromCalibratedOracle(oracle,geom,win,sources),
    degree:modelFromCalibratedOracle(oracle,degree,win,sources)
  };
  let rngSeed=seed>>>0;
  const rand=()=>{rngSeed^=rngSeed<<13;rngSeed^=rngSeed>>>17;rngSeed^=rngSeed<<5;return (rngSeed>>>0)/4294967296;};
  const gauss=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,rand())))*Math.cos(2*Math.PI*rand());
  const sigma=noise*noiseReference(oracle);
  let results={};
  for(const policy of ['geometry','degree']){
    let correct=0,total=0,bitGood=0,clean=0;
    const errors=[];
    const model=models[policy];
    for(const word of common){
      const actual=feature(oracle,word,win,sources);
      if(predict(model,actual,DIM)===word)clean++;
      let err=0,norm=0;
      for(let i=0;i<DIM;i++){
        err+=(actual[i]-model[word*DIM+i])**2;
        norm+=(actual[i])**2;
      }
      errors.push(Math.sqrt(err/(norm+1e-20)));
      for(let r=0;r<reps;r++){
        const noisy=actual.slice();
        for(let i=0;i<DIM;i++)noisy[i]+=sigma*gauss();
        const guess=predict(model,noisy,DIM);
        if(guess===word)correct++;
        bitGood+=K-popcounts[(guess^word)];
        total++;
      }
    }
    errors.sort((a,b)=>a-b);
    results[policy]={calibrationStates:(policy==='geometry'?geom:degree).length,
      noiselessCorrect:clean,heldout:common.length, noisyCorrect:correct,
      noisyTotal:total,accuracy:total?correct/total:null,
      bitAccuracy:total?bitGood/(K*total):null,
      medianRelativeWaveformError:errors.length?errors[Math.floor(errors.length/2)]:null};
  }
  // For fairness use the same test records but independent detector draws;
  // no statistical superiority is claimed from one short run.
  return {deadline,win,requestedBudget:budget,selected:geom.length,
    geometryMaskIds:geom,degreeMaskIds:degree,commonHoldout:common.length,
    sigma,noiseFraction:noise,sourceIds:sources,methods:results,
    orderHistogram:['geometry','degree'].reduce((a,k)=>{
      const masks=k==='geometry'?geom:degree;
      a[k]=Array.from({length:K+1},(_,d)=>masks.filter(m=>popcounts[m]===d).length);return a;
    },{})};
}
const API={K,WORDS,NSRC,N,STEPS,starts,WINDOWLEN,WINDOWS};
Object.assign(API,{simulate,makeOracle,feature,geometry,wallSamples,tourForSource,
  calibrationMasks,downsetCheck,fittedTable,modelFromCalibratedOracle,predict,
  noiseReference,compare,popcounts});
root.GeometryLabCore=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:self);
