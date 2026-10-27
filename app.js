/* Interface + blind receiver experiment. No external libraries or network requests. */
(function(){
'use strict';
const C=globalThis.ResonanceLabCore;
const byId=id=>document.getElementById(id);
const field=byId('field'),fctx=field.getContext('2d',{alpha:false});
const trace=byId('trace'),tctx=trace.getContext('2d',{alpha:false});
const W=field.width,H=field.height,pix=W/C.N;
const off=document.createElement('canvas');off.width=C.N;off.height=C.N;
const ofx=off.getContext('2d'),bitmap=ofx.createImageData(C.N,C.N);
let library=null,reference=0,wallWord=0,hidden=false;
let prior=C.uniform(),history=[],frameBank=[],playing=false,playStart=0;
let source=0,windowIndex=1,noiseFraction=.4,last=null,benchmarkBusy=false;
const names=['A','B','C','D'],snames=['Focus','Right','Left'],wnames=['Early','Late'];
const worker=new Worker('./worker.js');

function code(word){return word.toString(2).padStart(4,'0');}
function status(text,ready){byId('statusText').textContent=text;byId('status').classList.toggle('ready',!!ready);}
function sigma(){return reference*noiseFraction;}
function resetReadout(){prior=C.uniform();history=[];last=null;frameBank=[];playing=false;render();}
function maskedRecord(){return hidden?'Hidden record · interrogation only':'Known wall: '+code(wallWord);}
function updateWall(){
  const root=byId('wallBits');
  root.innerHTML='';
  for(let b=0;b<4;b++){
    const row=document.createElement('div');row.className='memory-item';
    const n=document.createElement('div');
    n.innerHTML='<span class="name">Patch '+names[b]+'</span><span class="bit-index">ellipse sector '+C.ACTUAL_SECTORS[b]+'</span>';
    const btn=document.createElement('button');
    const on=((wallWord>>b)&1)===1;
    btn.textContent=hidden?'?':on?'WRITTEN':'blank';
    btn.className=on&&!hidden?'on':'';
    btn.disabled=hidden||!library;
    btn.setAttribute('aria-label','Toggle persistent wall patch '+names[b]);
    btn.setAttribute('aria-pressed',String(on&&!hidden));
    btn.addEventListener('click',()=>{wallWord^=(1<<b);resetReadout();});
    row.append(n,btn);root.append(row);
  }
  byId('recordStatus').textContent=maskedRecord();
  byId('reveal').disabled=!hidden;
}
function showPosterior(){
  const root=byId('probs');root.innerHTML='';
  const champion=C.best(prior);
  for(let word=0;word<16;word++){
    const p=prior[word],row=document.createElement('div');
    row.className='prob'+(word===champion?' champion':'');
    const digits=document.createElement('span');digits.className='code';digits.textContent=code(word);
    const bar=document.createElement('div');bar.className='track';
    const fill=document.createElement('div');fill.style.width=(Math.max(0,Math.min(100,p*100)))+'%';bar.append(fill);
    const percentage=document.createElement('span');percentage.className='pct';
    percentage.textContent=(100*p<.1?'<0.1':(p*100).toFixed(1))+'%';
    row.append(digits,bar,percentage);root.append(row);
  }
  byId('confidence').textContent=(100*Math.max(...prior)).toFixed(1)+'%';
  byId('uncertainty').textContent=C.entropy(prior).toFixed(2);
  byId('guess').textContent=code(champion);
  byId('shots').textContent=String(history.length);
}
function buttons(){
  document.querySelectorAll('[data-source]').forEach(btn=>btn.classList.toggle('selected',Number(btn.dataset.source)===source));
  document.querySelectorAll('[data-window]').forEach(btn=>btn.classList.toggle('selected',Number(btn.dataset.window)===windowIndex));
}
function suggested(){
  if(!library){byId('suggestion').textContent='The clean response dictionary is being simulated.';return;}
  const scores=C.actionScores(prior,library,sigma());
  const winner=scores.indexOf(Math.max(...scores));
  byId('suggestion').textContent='Best current separation: '+snames[Math.floor(winner/2)]+' / '+wnames[winner%2]+'. Score '+scores[winner].toFixed(2)+' (heuristic).';
}
function render(){
  updateWall();showPosterior();buttons();
  byId('noiseLabel').textContent=Math.round(noiseFraction*100)+'%';
  byId('sigmaDisplay').textContent=library?'σ '+sigma().toFixed(4)+' pressure units':'σ —';
  byId('ping').disabled=!library;
  byId('benchmark').disabled=!library||benchmarkBusy;
  suggested();drawField(frameBank.length?frameBank[0]:null,0);drawTrace();
  byId('lastAction').textContent=last?'Ping '+history.length+': '+snames[last.source]+' source, '+wnames[last.window]+' window. Posterior updated from 100 signed samples.':'No ping yet. A resonance alone is not a decoded record.';
}
function drawField(frame,step){
  const dat=bitmap.data,inside=C.inside;
  for(let i=0;i<inside.length;i++){
    const j=i*4;
    if(!inside[i]){dat[j]=6;dat[j+1]=15;dat[j+2]=25;dat[j+3]=255;continue;}
    const v=hidden?0:(frame?frame[i]:0);
    const z=Math.max(-1,Math.min(1,v/.22));
    if(z>=0){dat[j]=12+Math.round(42*z);dat[j+1]=29+Math.round(120*z);dat[j+2]=43+Math.round(170*z);}
    else {const q=-z;dat[j]=13+Math.round(225*q);dat[j+1]=28+Math.round(127*q);dat[j+2]=43+Math.round(44*q);}
    dat[j+3]=255;
  }
  ofx.putImageData(bitmap,0,0);
  fctx.imageSmoothingEnabled=false;fctx.drawImage(off,0,0,W,H);
  const cx=C.MID*pix,cy=C.MID*pix,ra=C.A*pix,rb=C.B*pix;
  fctx.lineWidth=2;fctx.strokeStyle='#638196';
  fctx.beginPath();fctx.ellipse(cx,cy,ra,rb,0,0,Math.PI*2);fctx.stroke();
  for(let b=0;b<4;b++){
    let start=-Math.PI+C.ACTUAL_SECTORS[b]*Math.PI/4,end=start+Math.PI/4;
    fctx.lineWidth=7;fctx.strokeStyle=hidden?'#506174':((wallWord>>b)&1)?'#eebf81':'#47697b';
    fctx.beginPath();fctx.ellipse(cx,cy,ra,rb,0,start,end);fctx.stroke();
  }
  const src=C.sources[source],recv=C.receiver;
  fctx.fillStyle='#6ad2e8';fctx.beginPath();fctx.arc(src[1]*pix,src[0]*pix,5,0,Math.PI*2);fctx.fill();
  fctx.strokeStyle='#c9f3fa';fctx.lineWidth=2;
  fctx.beginPath();fctx.arc(recv[1]*pix,recv[0]*pix,7,0,Math.PI*2);fctx.stroke();
  fctx.fillStyle='#b8ccd9';fctx.font='13px system-ui';
  fctx.fillText('S',src[1]*pix+10,src[0]*pix-8);
  fctx.fillText('R',recv[1]*pix+11,recv[0]*pix-8);
  if(hidden){
    fctx.fillStyle='#061524de';fctx.fillRect(78,H/2-55,W-156,110);
    fctx.textAlign='center';fctx.fillStyle='#f3c995';fctx.font='bold 16px system-ui';
    fctx.fillText('BLIND INTERROGATION',W/2,H/2-9);
    fctx.font='12px system-ui';fctx.fillStyle='#c5d5e0';
    fctx.fillText('Full field concealed — one receiver only',W/2,H/2+16);
    fctx.textAlign='start';
  }
  byId('fieldCaption').textContent=hidden?'Blind mode: full field is hidden from you and the reader.':frame?'Actual field for the imposed wall and source.':'Standing by for a physical ping.';
  byId('frameStep').textContent=frame?'Wave step '+step:'Wave step —';
}
function animate(stamp){
  if(!playing||hidden||!frameBank.length)return;
  let index=Math.min(frameBank.length-1,Math.floor((stamp-playStart)/75));
  drawField(frameBank[index],index*5);
  if(index<frameBank.length-1)requestAnimationFrame(animate);
  else playing=false;
}
function displayFrames(frames){
  if(hidden)return;
  frameBank=frames;playing=true;playStart=performance.now();requestAnimationFrame(animate);
}
function drawTrace(){
  const width=trace.width,height=trace.height;
  tctx.fillStyle='#071522';tctx.fillRect(0,0,width,height);
  const L=47,R=width-14,T=17,B=height-32;
  tctx.strokeStyle='#30495c';tctx.lineWidth=1;
  for(let j=0;j<=4;j++){const y=T+(B-T)*j/4;tctx.beginPath();tctx.moveTo(L,y);tctx.lineTo(R,y);tctx.stroke();}
  tctx.fillStyle='#879faf';tctx.font='12px system-ui';
  tctx.fillText('pressure',8,13);tctx.fillText('100 samples',R-72,height-9);
  if(!last){tctx.fillStyle='#7c93a5';tctx.font='15px system-ui';tctx.textAlign='center';tctx.fillText('Send a ping to measure the echo.',width/2,height/2);tctx.textAlign='start';return;}
  const candidate=library[C.best(prior)][last.action];
  let max=0;
  for(const value of last.observation)max=Math.max(max,Math.abs(value));
  for(const value of candidate)max=Math.max(max,Math.abs(value));
  max=Math.max(1e-5,max*1.2);
  const draw=(arr,color)=>{
    tctx.strokeStyle=color;tctx.lineWidth=2;tctx.beginPath();
    for(let i=0;i<100;i++){
      const x=L+(R-L)*i/99, y=(T+B)/2-(arr[i]/max)*(B-T)/2;
      if(i===0)tctx.moveTo(x,y);else tctx.lineTo(x,y);
    }
    tctx.stroke();
  };
  draw(last.observation,'#76d8ed');draw(candidate,'#edba80');
  tctx.fillStyle='#aec1ce';tctx.fillText('+'+max.toFixed(2),3,T+10);
  tctx.fillText('−'+max.toFixed(2),3,B);
  tctx.strokeStyle='#58778a';tctx.beginPath();tctx.moveTo(L,(T+B)/2);tctx.lineTo(R,(T+B)/2);tctx.stroke();
}
function ping(){
  if(!library)return;
  const action=2*source+windowIndex,observation=C.observe(wallWord,action,library,sigma(),Math.random);
  prior=C.updated(prior,library,action,observation,sigma());
  history.push({action,observation});
  last={action,source,window:windowIndex,observation};
  frameBank=[];playing=false;render();
  if(!hidden)worker.postMessage({kind:'frames',word:wallWord,source});
}
function blind(){
  wallWord=(Math.random()*16)|0;hidden=true;
  resetReadout();
}
function reveal(){
  hidden=false;playing=false;frameBank=[];
  render();
  byId('recordStatus').textContent='REVEALED '+code(wallWord)+' · guess '+code(C.best(prior))+
    (C.best(prior)===wallWord?' ✓ match':' · mismatch');
}
function runBenchmark(){
  if(!library||benchmarkBusy)return;
  benchmarkBusy=true;byId('benchmark').disabled=true;
  byId('benchResult').innerHTML='<p class="smallnote">Scoring simulated independent noisy receiver measurements…</p>';
  setTimeout(()=>{
    try{
      const trials=Number(byId('trialCount').value),shots=Number(byId('shotCount').value);
      const data=C.benchmark(library,sigma(),trials,shots,20261027);
      const labels={adaptive:'Adaptive · posterior',cycle:'Cycle · three sources',fixed:'Fixed · focus / late',random:'Uniform random'};
      let table='<table><thead><tr><th>Policy</th><th>Exact word</th><th>Bit accuracy</th></tr></thead><tbody>';
      for(const key of ['adaptive','cycle','fixed','random']){
        const r=data.methods[key];
        table+='<tr><td>'+labels[key]+'</td><td>'+r.correct+'/'+trials+' ('+(100*r.accuracy).toFixed(1)+'%)</td><td>'+(100*r.bitAccuracy).toFixed(1)+'%</td></tr>';
      }
      table+='</tbody></table><p class="smallnote">Chance for a uniformly guessed 4-bit record is 6.25%. '+shots+' pings per trial; same noise level and all-16-state oracle dictionary. Policy scores are based on a deterministic seeded simulation, not a physical experiment. Policies use paired hidden words and Gaussian noise streams (same trial / shot / sample). This matches test difficulty, not waveform values across different actions.</p>';
      byId('benchResult').innerHTML=table;
    } catch(err){byId('benchResult').textContent=String(err);}
    benchmarkBusy=false;byId('benchmark').disabled=false;
  },15);
}
for(const btn of document.querySelectorAll('[data-source]'))btn.addEventListener('click',()=>{source=Number(btn.dataset.source);render();});
for(const btn of document.querySelectorAll('[data-window]'))btn.addEventListener('click',()=>{windowIndex=Number(btn.dataset.window);render();});
byId('noise').addEventListener('input',e=>{noiseFraction=Number(e.target.value);render();});
byId('suggest').addEventListener('click',()=>{
  if(!library)return;const index=C.pick(prior,library,sigma());
  source=Math.floor(index/2);windowIndex=index%2;render();
});
byId('ping').addEventListener('click',ping);
byId('newTrial').addEventListener('click',blind);
byId('reveal').addEventListener('click',reveal);
byId('benchmark').addEventListener('click',runBenchmark);
worker.onmessage=e=>{
  const m=e.data;
  if(m.kind==='progress')status('Preparing physical echoes: '+m.done+'/'+m.total+' wall words',false);
  else if(m.kind==='ready'){library=m.library;reference=m.reference;status('Ready · 16 records × 3 sources × 350 wave steps',true);render();}
  else if(m.kind==='frames'){
    if(m.word===wallWord&&m.source===source&&!hidden)displayFrames(m.frames);
  }
  else if(m.kind==='error'){status('Simulation error: '+m.error,false);}
};
worker.onerror=e=>status('Worker error: '+e.message,false);
render();worker.postMessage({kind:'prepare'});
})();
