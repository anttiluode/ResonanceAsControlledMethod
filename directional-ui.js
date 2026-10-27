/* Directional interrogation Pages UI. The truth oracle never crosses this boundary. */
(function(){
'use strict';
const D=globalThis.DirectionalMemoryCore,R=globalThis.ResonanceLabCore;
const $=id=>document.getElementById(id);
const worker=new Worker('./directional-worker.js');
let ready=false,busy=false,latest=null,lastInspect=null,blankFields=null;
function probes(){
  const p=$('pings').value;
  if(p==='low')return [0,1,2];
  if(p==='high')return [3,4,5];
  if(p==='direct')return [1,4];
  return [0,1,2,3,4,5];
}
function settings(){
  return {window:Number($('window').value),order:Number($('order').value),
    probes:probes(),trials:3,noise:Number($('noise').value),
    seed:20261027,word:Number($('inspectWord').value),
    inspectProbe:Number($('traceProbe').value)};
}
function setProgress(text,value){
  const parent=$('status'),node=parent.firstChild;
  if(node)node.textContent=text;
  $('progress').style.width=Math.min(100,Math.max(0,value||0))+'%';
}
function pct(value){return (100*value).toFixed(1)+'%';}
function code(word){return (word>>>0).toString(2).padStart(8,'0');}
function updateControls(){
  $('noiseDisplay').textContent=Math.round(Number($('noise').value)*100)+'%';
  const ids=probes();
  const active=Number($('traceProbe').value);
  $('traceProbe').innerHTML='';
  for(const id of ids){
    const p=D.PROBES[id],option=document.createElement('option');
    option.value=String(id);option.textContent=p.label;
    $('traceProbe').appendChild(option);
  }
  $('traceProbe').value=ids.includes(active)?String(active):String(ids[Math.floor(ids.length/2)]);
  drawAngular();
}
function resetControls(){
  $('window').value='1';$('order').value='2';$('pings').value='all';
  $('noise').value='.04';$('inspectWord').value='255';
  $('frequency').value='0';$('bearing').value='1';
  updateControls();drawPacket();
}
function renderAngular(ctx,arm,k,bearing,color,xleft,xright,top,bottom,scale){
  const weights=D.angularWeights(arm,k,bearing);
  ctx.strokeStyle=color;ctx.lineWidth=2.8;ctx.beginPath();
  for(let j=0;j<D.ANGLES;j++){
    const x=xleft+(xright-xleft)*j/(D.ANGLES-1);
    const y=bottom-weights[j]/scale*(bottom-top);
    if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();
}
function drawAngular(){
  const canvas=$('angular'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#081a29';ctx.fillRect(0,0,w,h);
  const k=D.frequencies[Number($('frequency').value)];
  const bearing=D.bearings[Number($('bearing').value)];
  const par=D.angularWeights('parabolic',k,bearing),fixed=D.angularWeights('fixed',k,bearing);
  const max=Math.max(...par,...fixed)*1.12,l=48,r=w-12,t=18,b=h-31;
  for(let i=0;i<=4;i++){
    const y=t+(b-t)*i/4;
    ctx.strokeStyle='#274254';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(r,y);ctx.stroke();
  }
  for(const tick of [-180,-90,0,90,180]){
    const x=l+(tick+180)/360*(r-l);
    ctx.strokeStyle='#294a5c';ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,b);ctx.stroke();
    ctx.fillStyle='#9ab6c5';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(tick+'°',x,h-10);
  }
  renderAngular(ctx,'parabolic',k,bearing,'#80d8e9',l,r,t,b,max);
  renderAngular(ctx,'fixed',k,bearing,'#eebc80',l,r,t,b,max);
  ctx.textAlign='left';ctx.font='12px system-ui';ctx.fillStyle='#acc3d0';
  ctx.fillText('weight',7,12);
  ctx.fillText('same spectral samples · normalized angular weights',l+14,18);
}
function drawPacket(){
  const canvas=$('packet'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#061726';ctx.fillRect(0,0,w,h);
  const f=Number($('frequency').value),b=Number($('bearing').value),pid=f*3+b;
  const frames=blankFields&&blankFields.probe===pid?blankFields.frames:null;
  const off=document.createElement('canvas');off.width=96;off.height=96;
  const cx=off.getContext('2d');const img=cx.createImageData(96,96);
  let max=.002;
  if(frames)for(const name of ['parabolic','fixed'])for(const v of frames[name])max=Math.max(max,Math.abs(v));
  const half=h/2;const side=Math.min(w*.61,half-17);
  for(let armIndex=0;armIndex<2;armIndex++){
    const name=armIndex===0?'parabolic':'fixed',frame=frames&&frames[name];
    for(let i=0;i<96*96;i++){
      const z=frame?Math.max(-1,Math.min(1,frame[i]/max)):0;
      const ptr=i*4;
      if(!R.inside[i]){img.data[ptr]=7;img.data[ptr+1]=16;img.data[ptr+2]=25;}
      else if(z>=0){img.data[ptr]=12+Math.round(41*z);img.data[ptr+1]=29+Math.round(116*z);img.data[ptr+2]=45+Math.round(158*z);}
      else{img.data[ptr]=12+Math.round(210*(-z));img.data[ptr+1]=29+Math.round(105*(-z));img.data[ptr+2]=45+Math.round(42*(-z));}
      img.data[ptr+3]=255;
    }
    cx.putImageData(img,0,0);
    const x=(w-side)/2, y=armIndex*half+(half-side)/2;
    ctx.imageSmoothingEnabled=false;ctx.drawImage(off,x,y,side,side);
    ctx.lineWidth=1.5;ctx.strokeStyle='#7898a9';
    const unit=side/96;
    ctx.beginPath();ctx.ellipse(x+R.MID*unit,y+R.MID*unit,R.A*unit,R.B*unit,0,0,Math.PI*2);ctx.stroke();
    const source=R.sources[0],recv=R.receiver;
    ctx.fillStyle='#87dceb';ctx.beginPath();ctx.arc(x+source[1]*unit,y+source[0]*unit,3.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e2f6fb';ctx.beginPath();ctx.arc(x+recv[1]*unit,y+recv[0]*unit,4.5,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=name==='parabolic'?'#80d8e9':'#eebc80';
    ctx.font='bold 14px system-ui';ctx.fillText(name==='parabolic'?'PARABOLIC':'FIXED ANGLE',13,armIndex*half+23);
  }
  $('launchInfo').textContent='Each packet has identical injected discrete wave energy E = 1. '+
    (frames?'These are actual blank-cavity fields at step 45; not reader features.':'Blank-cavity field snapshots are loading.');
}
function renderCounts(){
  const canvas=$('counts'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#081a29';ctx.fillRect(0,0,w,h);
  if(!latest){ctx.font='15px system-ui';ctx.fillStyle='#8faebc';ctx.fillText('Waiting for independent wave simulations.',25,h/2);return;}
  const methods=latest.methods;
  const a=methods.parabolic.fullOracleMedianNearestGapOverNoise;
  const b=methods.fixed.fullOracleMedianNearestGapOverNoise;
  const max=Math.max(a,b,.00001)*1.16;
  for(let i=0;i<2;i++){
    const val=i===0?a:b,y=66+i*92,width=(w-215)*val/max;
    ctx.fillStyle='#2c4b5d';ctx.fillRect(155,y,Math.max(0,w-215),42);
    ctx.fillStyle=i===0?'#80d8e9':'#eebc80';ctx.fillRect(155,y,width,42);
    ctx.fillStyle='#c3dbe5';ctx.font='15px system-ui';
    ctx.fillText(i===0?'Parabolic':'Fixed angle',15,y+25);
    ctx.font='bold 14px system-ui';
    ctx.fillText(latest.noiseSigma>0?val.toFixed(3)+'× σ':'No detector noise',Math.min(w-100,160+width),y+25);
  }
  ctx.fillStyle='#96b6c6';ctx.font='11px system-ui';ctx.fillText('Full 256-word oracle for diagnostic separation only',15,h-18);
}
function drawTrace(){
  const canvas=$('trace'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.fillStyle='#081a29';ctx.fillRect(0,0,w,h);
  const l=49,r=w-14,t=18,b=h-34;
  for(let y=0;y<=4;y++){
    ctx.strokeStyle='#24465b';ctx.beginPath();ctx.moveTo(l,t+(b-t)*y/4);ctx.lineTo(r,t+(b-t)*y/4);ctx.stroke();
  }
  if(!lastInspect){ctx.fillStyle='#9bb3c3';ctx.font='15px system-ui';ctx.fillText('Choose an unseen wall word to see how each sparse predictor fails.',l+10,h/2);return;}
  const inspected=lastInspect;
  const p=inspected.arms.parabolic,f=inspected.arms.fixed;
  const arrays=[p.actual,p.fitted,f.actual,f.fitted];
  let max=.00001;for(const a of arrays)for(const v of a)max=Math.max(max,Math.abs(v));
  max*=1.14;
  const draw=(arr,col,dashed=false)=>{
    ctx.strokeStyle=col;ctx.lineWidth=dashed?1.7:2.4;ctx.setLineDash(dashed?[5,5]:[]);ctx.beginPath();
    for(let i=0;i<arr.length;i++){
      const x=l+(r-l)*i/99,yy=(t+b)/2-arr[i]*(b-t)/(2*max);
      if(i===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);
    }ctx.stroke();ctx.setLineDash([]);
  };
  draw(p.actual,'#80d8e9');draw(p.fitted,'#80d8e9',true);
  draw(f.actual,'#eebc80');draw(f.fitted,'#eebc80',true);
  ctx.fillStyle='#a1bbc8';ctx.font='12px system-ui';
  ctx.fillText('Actual lines solid, sparse predictions dashed; source '+D.PROBES[inspected.probe].label,10,13);
  ctx.fillText('100 samples',w-110,h-10);
  $('inspection').textContent='UNSEEN '+code(inspected.word)+' ('+inspected.word+') · parabolic predicts '+code(p.guess)+
    ' · fixed-angle predicts '+code(f.guess)+'. Both waveform predictions were fitted ONLY on the permitted low-order states.';
}
function drawResult(result,inspection){
  latest=result;lastInspect=inspection;
  $('calibration').textContent=result.calibrationStates+'/256';
  $('shots').textContent=String(result.calibrationPingsPerArm);
  $('heldout').textContent=String(result.heldout);
  const par=result.methods.parabolic,fix=result.methods.fixed;
  $('parAcc').textContent=pct(par.accuracy);
  $('fixAcc').textContent=pct(fix.accuracy);
  $('parDetails').textContent=par.correct+'/'+par.total+' noisy exact · '+par.exactNoiseless+'/'+result.heldout+' noiseless · median relative model error '+par.medianRelativeWaveError.toFixed(3);
  $('fixDetails').textContent=fix.correct+'/'+fix.total+' noisy exact · '+fix.exactNoiseless+'/'+result.heldout+' noiseless · median relative model error '+fix.medianRelativeWaveError.toFixed(3);
  $('conclusion').textContent=par.correct===fix.correct?'Tie under this test':par.correct>fix.correct?'Parabolic leads, not yet a general claim':'Fixed-angle leads, paper-inspired arm loses';
  $('paired').textContent='Paired comparison: '+result.paired.parabolicOnly+' held-out trials correct ONLY with parabolic; '+
    result.paired.fixedOnly+' correct ONLY with fixed. Both arms use identical Gaussian noise streams (matched by memory, repetition and sample), same absolute σ='+result.noiseSigma.toFixed(5)+
    ', and the same '+result.probeIds.length+' source pings per record. This single configuration is exploratory, not a proof of superiority.';
  $('inspectWord').value=String(inspection.word);
  drawCounts();drawTrace();
  setProgress('Complete: '+result.calibrationStates+' calibrated states per arm, '+result.heldout+' unseen words, '+result.probeIds.length+
    ' physical pings per test record; compared with equal injected wave energy.',100);
}
function run(){
  if(!ready||busy)return;
  busy=true;$('run').disabled=true;$('inspect').disabled=true;
  setProgress('Fitting ONLY low-order records; scoring unseen combinations with the independent oracle…',100);
  worker.postMessage({kind:'compare',options:settings()});
}
function requestField(){
  worker.postMessage({kind:'field',probe:Number($('frequency').value)*3+Number($('bearing').value)});
}
worker.onmessage=e=>{
  const m=e.data;
  if(m.kind==='phase')setProgress(m.message,0);
  else if(m.kind==='progress'){
    const done=m.arm==='parabolic'?m.done:256+m.done;
    setProgress('Simulating '+m.arm+' physical launches · '+done+'/512 wall × arm combinations (6 pings each).',done/512*100);
  }else if(m.kind==='ready'){
    ready=true;$('run').disabled=false;$('inspect').disabled=false;$('resetView').disabled=false;
    setProgress('Ready: '+m.pings+' real source-to-receiver propagation simulations for scoring only.',100);
    requestField();run();
  }else if(m.kind==='field'){
    blankFields={probe:m.probe,frames:m.frames};drawPacket();
  }else if(m.kind==='result'){
    busy=false;$('run').disabled=false;$('inspect').disabled=false;
    drawResult(m.result,m.inspection);
  }else if(m.kind==='error'){
    busy=false;$('run').disabled=false;$('inspect').disabled=false;
    setProgress('Simulation error: '+m.message,100);
  }
};
worker.onerror=e=>{busy=false;setProgress('Worker error: '+e.message,100);};
['window','order','pings'].forEach(id=>$(id).addEventListener('change',updateControls));
$('noise').addEventListener('input',updateControls);
$('frequency').addEventListener('change',()=>{drawAngular();requestField();});
$('bearing').addEventListener('change',()=>{drawAngular();requestField();});
$('run').addEventListener('click',run);
$('inspect').addEventListener('click',run);
$('resetView').addEventListener('click',resetControls);
$('pings').addEventListener('change',()=>{lastInspect=null;drawTrace();});
updateControls();drawPacket();drawTrace();renderCounts();
worker.postMessage({kind:'init'});
})();
