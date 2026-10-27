/* Frozen, reproducible cross-geometry directional-wave memory test.
 * DO NOT revise protocols after inspecting held-out stadium/rotation performance.
 * See CROSS_GEOMETRY_PROTOCOL.md (committed before this implementation).
 */
'use strict';
require('./core.js');require('./geometry-core.js');
const R=require('./core.js'),G=require('./geometry-core.js');
const fs=require('node:fs');
const OUT=process.env.RECEIPT_PATH||'cross-geometry-results.json';
const N=96,LEN=N*N,MID=47.5,C=.65,DT=.5,DAMP=.006,KAPPA=.28;
const A=36,B=27,K=8,WORDS=256,ANGLES=48,WIDTH=4.5,RHO=5;
const Ks=[.65,1.3],BEARING=0,Q=[.45,.65,.9,1.3,1.8];
const WIN_START=245,WIN_LEN=100,STEPS=345;
const NOISE_MULT=2,REPS=3,SEED=20261027;
const masks=Array.from({length:256},(_,i)=>i).filter(i=>G.popcounts[i]<=2);
const holdouts=Array.from({length:256},(_,i)=>i).filter(i=>G.popcounts[i]>2);
function assert(b,message){if(!b)throw Error(message);}
function makeGeometry(name){
  assert(['original','stadium','rotated'].includes(name),'unknown shape');
  const inside=new Uint8Array(LEN),center=MID,rad=25*Math.PI/180;
  const cr=Math.cos(rad),sr=Math.sin(rad);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const dx=x-center,dy=y-center;let yes;
    if(name==='original')yes=dx*dx/(A*A)+dy*dy/(B*B)<=1;
    else if(name==='stadium'){
      const qx=Math.max(0,Math.abs(dx)-9);
      yes=qx*qx+dy*dy<=27*27;
    }else{
      const u=cr*dx+sr*dy,v=-sr*dx+cr*dy;
      yes=u*u/(A*A)+v*v/(B*B)<=1;
    }
    inside[y*N+x]=yes?1:0;
  }
  const active=[],neighbors=[],faceCount=[],edgePairs=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const i=y*N+x;if(!inside[i])continue;
    const nbr=[];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const xx=x+dx,yy=y+dy,j=yy*N+xx;
      if(xx>=0&&xx<N&&yy>=0&&yy<N&&inside[j]){
        nbr.push(j);
        if(dx===1||dy===1)edgePairs.push(i,j);
      }
    }
    active.push(i);neighbors.push(nbr);faceCount.push(4-nbr.length);
  }
  const sy=R.sources[0][0],sx=R.sources[0][1],ry=R.receiver[0],rx=R.receiver[1];
  assert(inside[sy*N+sx]&&inside[ry*N+rx],name+': emitter/receiver outside domain');
  const sectors=Array.from({length:8},()=>0);
  for(let j=0;j<active.length;j++)if(faceCount[j])sectors[R.sector[active[j]]]+=faceCount[j];
  assert(sectors.every(n=>n>0),name+' some missing wall sectors');
  return {name,inside,active,neighbors,faceCount,edgePairs,sectors,
    receiver:ry*N+rx,source:{x:sx,y:sy}};
}
function weights(k,q){
  const v=new Float64Array(ANGLES);let sum=0;
  for(let j=0;j<ANGLES;j++){
    const phi=-Math.PI+2*Math.PI*j/ANGLES;
    v[j]=Math.exp(-RHO*q*(1-Math.cos(phi-BEARING)));sum+=v[j];
  }
  for(let j=0;j<ANGLES;j++)v[j]/=sum;
  return v;
}
function energy(ctx,u,v){
  let kinetic=0,potential=0;
  for(const i of ctx.active)kinetic+=v[i]*v[i];
  const ep=ctx.edgePairs;
  for(let j=0;j<ep.length;j+=2){
    const d=u[ep[j]]-u[ep[j+1]];
    potential+=d*d;
  }
  return (kinetic+C*C*potential)/2;
}
function launch(ctx,k,q){
  const w=weights(k,q),u=new Float64Array(LEN),v=new Float64Array(LEN);
  const sy=ctx.source.y,sx=ctx.source.x;
  for(let h=0;h<ANGLES;h++){
    const phi=-Math.PI+2*Math.PI*h/ANGLES,dirX=Math.cos(phi),dirY=Math.sin(phi);
    const a=w[h];if(a<1e-12)continue;
    for(const i of ctx.active){
      const x=i%N-sx,y=Math.floor(i/N)-sy,dd=x*x+y*y;
      const env=Math.exp(-dd/(2*WIDTH*WIDTH));if(env<1e-13)continue;
      const projected=x*dirX+y*dirY,phase=k*projected;
      const co=Math.cos(phase),si=Math.sin(phase),e=a*env;
      u[i]+=e*co;
      v[i]+=C*e*(k*si+(projected/(WIDTH*WIDTH))*co);
    }
  }
  const raw=energy(ctx,u,v),scale=1/Math.sqrt(raw);
  assert(Number.isFinite(scale)&&scale>0,'invalid source energy');
  for(const i of ctx.active){u[i]*=scale;v[i]*=scale;}
  const E=energy(ctx,u,v);
  assert(Math.abs(E-1)<1e-10,'not normalized');
  return {u,v,E};
}
function maxWrittenPotential(ctx,packet){
  let sum=0;
  for(let j=0;j<ctx.active.length;j++){
    const i=ctx.active[j];
    sum+=ctx.faceCount[j]*packet.u[i]*packet.u[i];
  }
  return .5*C*C*KAPPA*sum;
}
function propagate(ctx,word,init){
  let u=init.u.slice(),prev=init.u.slice(),next=new Float64Array(LEN);
  const active=ctx.active,nb=ctx.neighbors,face=ctx.faceCount;
  const a=1+DAMP*DT/2,b=1-DAMP*DT/2,c2=(C*DT)**2;
  for(const i of active)prev[i]-=DT*init.v[i];
  const out=new Float32Array(WIN_LEN);
  for(let t=0;t<STEPS;t++){
    for(let j=0;j<active.length;j++){
      const i=active[j],list=nb[j];
      let lap=-(list.length+(((word>>>R.sector[i])&1)?KAPPA*face[j]:0))*u[i];
      for(let h=0;h<list.length;h++)lap+=u[list[h]];
      next[i]=(2*u[i]-b*prev[i]+c2*lap)/a;
    }
    const tmp=prev;prev=u;u=next;next=tmp;
    if(t>=WIN_START)out[t-WIN_START]=u[ctx.receiver];
  }
  return out;
}
function simulateBank(ctx,q,progress){
  // Every arm, width and geometry uses exactly TWO physical probes.
  // q=null -> q=k (parabolic); q=number -> single fixed width across k.
  const launches=Ks.map(k=>launch(ctx,k,q===null?k:q));
  const table=new Float32Array(WORDS*Ks.length*WIN_LEN);
  for(let word=0;word<WORDS;word++){
    for(let i=0;i<Ks.length;i++)
      table.set(propagate(ctx,word,launches[i]),(word*Ks.length+i)*WIN_LEN);
    if(progress&&(word===0||word===255||(word+1)%64===0))progress(word+1);
  }
  return {table,initialEnergy:launches.map(x=>x.E),
    maxRobinInjectionEnergy:Math.max(...launches.map(x=>maxWrittenPotential(ctx,x)))};
}
function wordVector(table,word,ids=[0,1]){
  const dim=ids.length*WIN_LEN,result=new Float64Array(dim);
  for(let a=0;a<ids.length;a++){
    const start=(word*Ks.length+ids[a])*WIN_LEN;
    for(let t=0;t<WIN_LEN;t++)result[a*WIN_LEN+t]=table[start+t];
  }
  return result;
}
function fit(table,ids=[0,1]){
  const calibration=new Map(masks.map(m=>[m,wordVector(table,m,ids)]));
  return G.fittedTable(calibration,ids.length*WIN_LEN);
}
function referenceSigma(a,b){
  // Compute exclusively on empty and single-bit SOURCE geometry examples.
  const rms=[];
  for(const bank of [a,b])for(let ki=0;ki<2;ki++){
    const clean=wordVector(bank,0,[ki]);
    for(let bit=0;bit<8;bit++){
      const written=wordVector(bank,1<<bit,[ki]);
      let sum=0;
      for(let t=0;t<WIN_LEN;t++)sum+=(written[t]-clean[t])**2;
      rms.push(Math.sqrt(sum/WIN_LEN));
    }
  }
  rms.sort((x,y)=>x-y);return .5*(rms[15]+rms[16])*NOISE_MULT;
}
function noiseMatrix(){
  const rng=G===undefined?null:null;
  let x=SEED>>>0;const next=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
  const values=new Float64Array(holdouts.length*REPS*2*WIN_LEN);
  for(let i=0;i<values.length;i++)
    values[i]=Math.sqrt(-2*Math.log(Math.max(1e-14,next())))*Math.cos(2*Math.PI*next());
  return values;
}
const pairedNoise=noiseMatrix();
function evaluate(bank,sigma,probeIds=[0,1]){
  const table=bank.table||bank,model=fit(table,probeIds),dim=probeIds.length*WIN_LEN;
  let correct=0,noiseless=0,bitGood=0,relError=0;
  const hit=new Uint8Array(holdouts.length*REPS);
  const normed=[];
  for(let wordIndex=0;wordIndex<holdouts.length;wordIndex++){
    const word=holdouts[wordIndex],actual=wordVector(table,word,probeIds);
    if(G.predict(model,actual,dim)===word)noiseless++;
    let error=0,norm=0;
    for(let t=0;t<dim;t++){
      const delta=model[word*dim+t]-actual[t];
      error+=delta*delta;norm+=actual[t]*actual[t];
    }
    normed.push(Math.sqrt(error/(norm+1e-20)));
    for(let rep=0;rep<REPS;rep++){
      const obs=actual.slice();
      const base=(wordIndex*REPS+rep)*2*WIN_LEN;
      for(let i=0;i<probeIds.length;i++)for(let t=0;t<WIN_LEN;t++)
        obs[i*WIN_LEN+t]+=sigma*pairedNoise[base+probeIds[i]*WIN_LEN+t];
      const guess=G.predict(model,obs,dim),good=guess===word;
      hit[wordIndex*REPS+rep]=good?1:0;
      if(good)correct++;
      bitGood+=K-G.popcounts[guess^word];
    }
  }
  normed.sort((a,b)=>a-b);
  return {correct,total:hit.length,accuracy:correct/hit.length,
    bitAccuracy:bitGood/(K*hit.length),noiseless,heldout:holdouts.length,
    medianRelativeWaveError:normed[Math.floor(normed.length/2)],
    _hit:hit};
}
function cleanResult(r){
  const c={...r};delete c._hit;return c;
}
function paired(a,b){
  let aOnly=0,bOnly=0;
  for(let i=0;i<a._hit.length;i++){
    if(a._hit[i]&&!b._hit[i])aOnly++;
    if(!a._hit[i]&&b._hit[i])bOnly++;
  }
  return {parabolicOnly:aOnly,fixedOnly:bOnly,discordant:aOnly+bOnly};
}
function identityAtSingleK(ctx,k){
  const a=launch(ctx,k,k),b=launch(ctx,k,k);
  let worst=0;
  for(const i of ctx.active){
    worst=Math.max(worst,Math.abs(a.u[i]-b.u[i]),Math.abs(a.v[i]-b.v[i]));
  }
  assert(worst===0,'single-frequency source equality failed');
  const x=propagate(ctx,1<<3,a),y=propagate(ctx,1<<3,b);
  for(let i=0;i<WIN_LEN;i++)assert(x[i]===y[i],'single-frequency receiver equality failed');
  return {k,identical:true};
}
function main(){
  const began=Date.now(),source=makeGeometry('original');
  const qBank={},qTune={},parBank=simulateBank(source,null);
  const referenceBank=simulateBank(source,.9);
  const sigma=referenceSigma(parBank.table,referenceBank.table);
  assert(sigma>0,'invalid locked detector noise');
  qBank['0.90']=referenceBank;
  console.log('SOURCE ELLIPSE: parabolic + q=0.90 simulated, common sigma '+sigma);
  for(const q of Q){
    const key=q.toFixed(2);
    const bank=qBank[key]||(qBank[key]=simulateBank(source,q));
    qTune[key]=cleanResult(evaluate(bank,sigma));
    console.log('SOURCE TUNING FIXED q='+key+' correct '+qTune[key].correct+'/'+qTune[key].total);
  }
  const winner=Q.slice().sort((x,y)=>
    qTune[y.toFixed(2)].correct-qTune[x.toFixed(2)].correct||x-y)[0];
  const winning=winner.toFixed(2);
  const parSource=cleanResult(evaluate(parBank,sigma));
  console.log('FROZEN fixed q='+winning+' (source-ellipse score only, before unknown-geometry test)');
  const receipt={
    protocol:'CROSS_GEOMETRY_PROTOCOL.md',
    test:'two-frequency, 2 physical pings; 37 training wall states; 219 disjoint test words',
    params:{k:Ks,q_candidates:Q,winner, rho:RHO,width:WIDTH,angles:ANGLES,
      bearing:BEARING,geometryValidation:['stadium','rotated'],
      listeningSteps:[WIN_START,WIN_START+WIN_LEN-1],
      noiseSigma:sigma,noiseMultiplier:NOISE_MULT,replicates:REPS,seed:SEED},
    originalEllipse:{parabolic:parSource,fixedCandidates:qTune},
    heldout:{},identity:[]
  };
  for(const name of ['stadium','rotated']){
    const ctx=makeGeometry(name);
    receipt.identity.push(...Ks.map(k=>({geometry:name,...identityAtSingleK(ctx,k)})));
    // No tuning, no branches on the resulting accuracies.
    const par=simulateBank(ctx,null),fixed=simulateBank(ctx,winner);
    const pa=evaluate(par,sigma),fb=evaluate(fixed,sigma);
    receipt.heldout[name]={
      insideCells:ctx.active.length,wallSectorFaceCounts:ctx.sectors,
      sourceInside:!!ctx.inside[ctx.source.y*N+ctx.source.x],
      receiverInside:!!ctx.inside[ctx.receiver],
      launchEnergy:{parabolic:par.initialEnergy,fixed:fixed.initialEnergy},
      maxRobinInjectionEnergy:{parabolic:par.maxRobinInjectionEnergy,fixed:fixed.maxRobinInjectionEnergy},
      parabolic:cleanResult(pa),fixed:cleanResult(fb),paired:paired(pa,fb),
      frequencyControls:{
        low:{parabolic:cleanResult(evaluate(par,sigma,[0])),fixed:cleanResult(evaluate(fixed,sigma,[0]))},
        high:{parabolic:cleanResult(evaluate(par,sigma,[1])),fixed:cleanResult(evaluate(fixed,sigma,[1]))}
      }
    };
    console.log('HELD-OUT '+name+' parabolic '+pa.correct+'/'+pa.total+
      ' fixed '+fb.correct+'/'+fb.total+' paired '+JSON.stringify(paired(pa,fb)));
  }
  receipt.elapsedSeconds=(Date.now()-began)/1000;
  receipt.successCriterion=Object.values(receipt.heldout).every(x=>x.parabolic.correct>x.fixed.correct);
  fs.writeFileSync(OUT,JSON.stringify(receipt,null,2)+'\n');
  console.log('RESULT',JSON.stringify({winner,sigma,heldout:receipt.heldout,
    successCriterion:receipt.successCriterion,elapsedSeconds:receipt.elapsedSeconds}));
  console.log('Saved full machine-readable receipt '+OUT);
}
if(require.main===module)main();
module.exports={makeGeometry,weights,energy,launch,maxWrittenPotential,propagate,
  simulateBank,wordVector,fit,referenceSigma,noiseMatrix,evaluate,paired,
  identityAtSingleK,main,Q,Ks};
