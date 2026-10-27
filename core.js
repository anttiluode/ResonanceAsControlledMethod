/* Resonance as Controlled Method — deterministic finite-difference cavity model.
   A teaching instrument derived from (not identical to) Kavitaatio's wave solver.
   No wave-learned plasticity: wall bits are imposed persistent Robin springs.
*/
(function (root) {
  'use strict';
  const N=96, K=8, A=36, B=27, C=0.65, DT=0.5, DAMP=0.006, STIFF=0.28;
  const T0=145, T_SPLIT=245, T1=345, STEP_COUNT=350;
  const ACTUAL_SECTORS=[0,2,4,6]; // 4 bits; sixteen exact full-calibration candidates
  const F=Math.sqrt(A*A-B*B), MID=(N-1)/2;
  const sources=[[Math.round(MID),Math.round(MID-F)],[Math.round(MID+8),Math.round(MID-F)],[Math.round(MID-8),Math.round(MID-F)]];
  const receiver=[Math.round(MID),Math.round(MID+F)];
  const inside=new Uint8Array(N*N), sector=new Uint8Array(N*N), counts=new Uint8Array(N*N);
  const active=[], neighbors=[], neighborCount=[];
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const i=y*N+x, xx=x-MID, yy=y-MID;
    inside[i]=((xx*xx)/(A*A)+(yy*yy)/(B*B)<=1)?1:0;
    const angle=Math.atan2(yy/B,xx/A);
    sector[i]=Math.floor((angle+Math.PI)*K/(2*Math.PI))%K;
  }
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const i=y*N+x;
    if(!inside[i])continue;
    let n=0; const nb=[];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const X=x+dx,Y=y+dy,j=Y*N+X;
      if(X>=0&&Y>=0&&X<N&&Y<N&&inside[j]){n++; nb.push(j);}
    }
    counts[i]=4-n; active.push(i); neighbors.push(nb); neighborCount.push(n);
  }
  function run(word,sourceIndex,recordFrames){
    if(word<0||word>15||word!==Math.floor(word)||sourceIndex<0||sourceIndex>2)throw Error('Invalid wall word or source');
    const robin=new Float64Array(N*N), u=new Float64Array(N*N), prev=new Float64Array(N*N), next=new Float64Array(N*N);
    const cellSectorMask=new Uint8Array(8);
    for(let b=0;b<4;b++)cellSectorMask[ACTUAL_SECTORS[b]]=(word>>b)&1;
    const [sy,sx]=sources[sourceIndex];
    for(let k=0;k<active.length;k++){
      const i=active[k],y=(i/N)|0,x=i%N;
      robin[i]=counts[i]*STIFF*cellSectorMask[sector[i]];
      u[i]=Math.exp(-((x-sx)*(x-sx)+(y-sy)*(y-sy))/(2*1.55*1.55));
    }
    const samples=new Float32Array(STEP_COUNT), frames=[];
    const c2=C*C*DT*DT,aa=1+DAMP*DT/2,bb=1-DAMP*DT/2,receive=receiver[0]*N+receiver[1];
    let last=prev,current=u,target=next;
    for(let t=0;t<STEP_COUNT;t++){
      for(let k=0;k<active.length;k++){
        const i=active[k], nb=neighbors[k];
        let lap=-(neighborCount[k]+robin[i])*current[i];
        for(let j=0;j<nb.length;j++)lap+=current[nb[j]];
        target[i]=(2*current[i]-bb*last[i]+c2*lap)/aa;
      }
      const tmp=last;last=current;current=target;target=tmp;
      samples[t]=current[receive];
      if(recordFrames && t%5===0)frames.push(new Float32Array(current));
    }
    return {samples,frames};
  }
  function signature(samples,windowIndex){
    const start=windowIndex===0?T0:T_SPLIT;
    return Array.from(samples.slice(start,start+100));
  }
  function seeded(seed){
    let x=seed>>>0;
    return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
  }
  function normal(rng){
    return Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng());
  }
  function templatesForAll(progress){
    const out=Array.from({length:16},()=>Array(6));
    for(let word=0;word<16;word++){
      for(let source=0;source<3;source++){
        const waveform=run(word,source,false).samples;
        out[word][source*2]=signature(waveform,0);
        out[word][source*2+1]=signature(waveform,1);
      }
      if(progress) progress(word+1,16);
    }
    return out;
  }
  function noiseReference(templates){
    const a=[];
    for(let b=0;b<4;b++){
      const clean=templates[0][1],coded=templates[1<<b][1];
      let sum=0;for(let t=0;t<100;t++)sum+=(coded[t]-clean[t])**2;
      a.push(Math.sqrt(sum/100));
    }
    a.sort((x,y)=>x-y);
    return (a[1]+a[2])/2;
  }
  function uniform(){return Array(16).fill(1/16);}
  function normalized(logp){
    const m=Math.max(...logp);
    const un=logp.map(x=>Math.exp(x-m)),sum=un.reduce((a,b)=>a+b,0);
    return un.map(x=>x/sum);
  }
  function updated(prior,templates,action,observation,sigma){
    const s2=Math.max(1e-18,sigma*sigma),ll=[];
    for(let w=0;w<16;w++){
      let dist=0;const target=templates[w][action];
      for(let k=0;k<100;k++){let d=observation[k]-target[k];dist+=d*d;}
      ll.push(Math.log(Math.max(prior[w],1e-300))-dist/(2*s2));
    }
    return normalized(ll);
  }
  function actionScores(prior,templates,sigma){
    const res=[];
    const denom=2*Math.max(1e-18,sigma*sigma)*100;
    for(let a=0;a<6;a++){
      let spread=0;
      for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){
        if(prior[i]*prior[j]<1e-20)continue;
        let d2=0;for(let t=0;t<100;t++){const d=templates[i][a][t]-templates[j][a][t];d2+=d*d;}
        spread+=prior[i]*prior[j]*d2;
      }
      res.push(spread/denom);
    }
    return res;
  }
  function pick(prior,templates,sigma){
    const a=actionScores(prior,templates,sigma);
    return a.indexOf(Math.max(...a));
  }
  function observe(word,action,templates,sigma,rng){
    const signal=templates[word][action];
    return signal.map(v=>v+sigma*normal(rng));
  }
  function best(prior){return prior.indexOf(Math.max(...prior));}
  function entropy(prior){let e=0;for(const p of prior)if(p>0)e-=p*Math.log2(p);return e;}
  function benchmark(templates,sigma,trials,shots,seed){
    const result={trials,shots,methods:{},paired:{},randomChance:1/16};
    // Every policy sees the same test words and the same Gaussian noise
    // draws (matched by trial / shot / sample) under its chosen action.
    const truthRng=seeded(seed);
    const truthWords=Array.from({length:trials},()=>Math.floor(truthRng()*16));
    const policies=['adaptive','cycle','fixed','random'],success={};
    for(const policy of policies){
      let correct=0,bitHits=0;
      success[policy]=[];
      for(let runIndex=0;runIndex<trials;runIndex++){
        const word=truthWords[runIndex];
        const noiseRng=seeded((seed ^ Math.imul(runIndex+1,0x9e3779b9))>>>0);
        const selectRng=seeded((seed ^ Math.imul(runIndex+1,0x85ebca6b) ^ 0xdeadbeef)>>>0);
        let prior=uniform();
        for(let step=0;step<shots;step++){
          const a=policy==='adaptive'?pick(prior,templates,sigma):
            policy==='fixed'?1:policy==='cycle'?2*(step%3)+1:Math.floor(selectRng()*6);
          const observation=observe(word,a,templates,sigma,noiseRng);
          prior=updated(prior,templates,a,observation,sigma);
        }
        const estimate=best(prior),hit=estimate===word;
        success[policy].push(hit);
        if(hit)correct++;
        for(let b=0;b<4;b++)if(((estimate>>b)&1)===((word>>b)&1))bitHits++;
      }
      result.methods[policy]={correct,accuracy:correct/trials,bitAccuracy:bitHits/(4*trials)};
    }
    for(const other of ['cycle','fixed','random']){
      let better=0,worse=0;
      for(let i=0;i<trials;i++){
        if(success.adaptive[i]&&!success[other][i])better++;
        if(!success.adaptive[i]&&success[other][i])worse++;
      }
      // Two-sided exact paired sign / McNemar test on discordant trials.
      const n=better+worse,limit=Math.min(better,worse);
      let term=Math.pow(.5,n),tail=term;
      for(let k=1;k<=limit;k++){term*=((n-k+1)/k);tail+=term;}
      const p=Math.min(1,2*tail);
      result.paired[other]={adaptiveOnly:better,otherOnly:worse,discordant:n,pTwoSided:p};
    }
    return result;
  }
  const API={N,K,A,B,MID,F,C,DT,STIFF,T0,T_SPLIT,T1,STEP_COUNT,inside,sector,counts,
    ACTUAL_SECTORS,sources,receiver,run,signature,seeded,normal,templatesForAll,
    noiseReference,uniform,normalized,updated,actionScores,pick,observe,best,entropy,benchmark};
  root.ResonanceLabCore=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:self);
