/* GUI for the causal calibration experiment. No full oracle ever enters this UI. */
(function(){
'use strict';
const C=globalThis.ResonanceLabCore,G=globalThis.GeometryLabCore;
const el=id=>document.getElementById(id);
const geometryCanvas=el('ellipse'),GCTX=geometryCanvas.getContext('2d');
const horizonCanvas=el('horizon'),HCTX=horizonCanvas.getContext('2d');
const traceCanvas=el('trace'),TCTX=traceCanvas.getContext('2d');
const worker=new Worker('./geometry-worker.js');
let earliest=null,minByOrder=null,points=null,ready=false,latest=null,busy=false;
function setStatus(msg,pct){
  el('phase').firstChild.textContent=msg;
  if(pct!==undefined)el('progress').style.width=Math.max(0,Math.min(100,pct))+'%';
}
const number=(value)=>value===undefined||value===null?'—':String(value);
const bits=w=>w.toString(2).padStart(8,'0');
const pct=v=>v===null?'—':(v*100).toFixed(1)+'%';
function config(){
  return {budget:Number(el('budget').value),win:Number(el('window').value),
    sources:Number(el('sources').value),noise:Number(el('noise').value),
    repeats:3,seed:20261027,inspectWord:Number(el('testWord').value)};
}
function updateControls(){
  el('budgetText').textContent=el('budget').value;
  el('noiseText').textContent=(Number(el('noise').value)*100).toFixed(0)+'%';
  if(minByOrder)drawHorizon();
}
function sectorCoords(k,t,r,scaleX=1,scaleY=1){
  const phi=-Math.PI+(k+t)*Math.PI/4;
  return [r.x+r.rx*scaleX*Math.cos(phi),r.y+r.ry*scaleY*Math.sin(phi)];
}
function drawGeometry(maskList=[],inspectionWord){
  const ctx=GCTX,w=geometryCanvas.width,h=geometryCanvas.height;
  ctx.fillStyle='#071929';ctx.fillRect(0,0,w,h);
  const ell={x:w*.51,y:h*.49,rx:h*.39*1.25,ry:h*.39*.94};
  const filled=new Set(maskList);
  let selected=new Array(8).fill(0);
  for(const m of maskList)for(let b=0;b<8;b++)if(m&(1<<b))selected[b]++;
  const max=Math.max(...selected,1);
  ctx.lineWidth=2;ctx.strokeStyle='#3f6579';
  ctx.beginPath();ctx.ellipse(ell.x,ell.y,ell.rx,ell.ry,0,0,Math.PI*2);ctx.stroke();
  for(let k=0;k<8;k++){
    const start=-Math.PI+k*Math.PI/4,end=start+Math.PI/4;
    const intensity=selected[k]/max;
    const on=inspectionWord===undefined?false:Boolean(inspectionWord&(1<<k));
    ctx.beginPath();ctx.ellipse(ell.x,ell.y,ell.rx,ell.ry,0,start,end);
    ctx.lineWidth=11;
    ctx.strokeStyle=on?'#f0be80':selected[k]?'rgba(107,213,229,'+(0.36+0.55*intensity)+')':'#395164';
    ctx.stroke();
    const [cx,cy]=sectorCoords(k,.5,ell,1.2,1.2);
    ctx.fillStyle=on?'#ffe0b5':'#a6c9d6';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 13px system-ui';ctx.fillText(String(k),cx,cy);
  }
  const transform=(point)=>{
    const x=((point[1]-C.MID)/C.A)*ell.rx+ell.x;
    const y=((point[0]-C.MID)/C.B)*ell.ry+ell.y;
    return [x,y];
  };
  C.sources.forEach((pt,i)=>{
    const [x,y]=transform(pt);
    ctx.fillStyle=i===0?'#7fdef0':'#6b9fba';
    ctx.beginPath();ctx.arc(x,y,i===0?5:4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a9cedc';ctx.font='12px system-ui';ctx.textAlign='left';
    ctx.fillText('S'+i,x+9,y-6);
  });
  const [rx,ry]=transform(C.receiver);
  ctx.strokeStyle='#d3edf4';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(rx,ry,7,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#d3edf4';ctx.fillText('RECEIVER',rx+12,ry-8);
  ctx.fillStyle='#8faebf';ctx.font='12px system-ui';
  ctx.fillText('8 Robin/Neumann wall sectors · three sources · one receiver',17,h-13);
}
function drawHorizon(){
  const ctx=HCTX,w=horizonCanvas.width,h=horizonCanvas.height;
  ctx.fillStyle='#071929';ctx.fillRect(0,0,w,h);
  if(!minByOrder){ctx.fillStyle='#8aa9b9';ctx.font='14px system-ui';ctx.fillText('Preparing causal horizon…',18,32);return;}
  const xmin=155,xmax=565,ymin=0,ymax=8;
  const X=t=>50+(Math.max(xmin,Math.min(xmax,t))-xmin)/(xmax-xmin)*(w-75);
  const Y=o=>h-23-o*(h-43)/8;
  for(const step of [200,300,400,500]){
    const x=X(step);ctx.strokeStyle='#294759';ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,h-21);ctx.stroke();
    ctx.font='11px system-ui';ctx.fillStyle='#8aafbf';ctx.textAlign='center';ctx.fillText(String(step),x,h-6);
  }
  const deadline=G.starts[Number(el('window').value)]+99;
  ctx.strokeStyle='#e9ba83';ctx.setLineDash([5,5]);ctx.lineWidth=2;ctx.beginPath();
  ctx.moveTo(X(deadline),7);ctx.lineTo(X(deadline),h-21);ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='#e9ba83';ctx.fillText('deadline '+deadline,X(deadline)+42,13);
  const values=minByOrder.slice(1);
  ctx.strokeStyle='#80cbdd';ctx.lineWidth=3;ctx.beginPath();
  values.forEach((v,i)=>{
    const x=X(v),y=Y(i+1);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  values.forEach((v,i)=>{
    const x=X(v),y=Y(i+1);
    ctx.fillStyle=v<=deadline+40?'#a2dfbd':'#6e98ac';
    ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c9dce4';ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillText('order '+(i+1),10,y+4);
  });
}
function drawTrace(inspection){
  const ctx=TCTX,w=traceCanvas.width,h=traceCanvas.height;
  ctx.fillStyle='#071726';ctx.fillRect(0,0,w,h);
  const left=58,right=w-15,top=17,bottom=h-37;
  for(let i=0;i<=4;i++){
    const y=top+(bottom-top)*i/4;
    ctx.strokeStyle='#2a4758';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  }
  ctx.fillStyle='#96b4c3';ctx.font='12px system-ui';ctx.fillText('receiver pressure',7,12);
  ctx.fillText('100 time samples',w-127,h-10);
  if(!inspection){ctx.fillText('Select Run to score held-out responses.',left+15,(top+bottom)/2);return;}
  const arrays=[inspection.actual,inspection.geometric,inspection.degree];
  let max=0;for(const arr of arrays)for(const v of arr)max=Math.max(max,Math.abs(v));
  max=Math.max(1e-5,max*1.15);
  const colors=['#7cd6e9','#f0be80','#96d9b8'];
  arrays.forEach((arr,c)=>{
    ctx.strokeStyle=colors[c];ctx.lineWidth=c===0?3:1.9;ctx.beginPath();
    for(let t=0;t<arr.length;t++){
      const x=left+(right-left)*t/(arr.length-1);
      const y=(top+bottom)/2-arr[t]*(bottom-top)/(2*max);
      if(t===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  });
  ctx.fillStyle='#adbfca';ctx.fillText('+'+max.toFixed(2),6,top+12);
  ctx.fillText('−'+max.toFixed(2),6,bottom);
}
function printResult(receipt,inspection){
  const a=receipt.methods.geometry,b=receipt.methods.degree;
  el('calCount').textContent=receipt.selected+'/256';
  el('heldCount').textContent=receipt.commonHoldout+'/256';
  el('physicalCost').textContent=receipt.selected*receipt.sourceIds.length;
  el('geoAccuracy').textContent=pct(a.accuracy);
  el('degAccuracy').textContent=pct(b.accuracy);
  el('geoDetails').textContent='Noiseless '+a.noiselessCorrect+'/'+a.heldout+
    ' · median waveform relative error '+a.medianRelativeWaveformError.toFixed(3);
  el('degDetails').textContent='Noiseless '+b.noiselessCorrect+'/'+b.heldout+
    ' · median waveform relative error '+b.medianRelativeWaveformError.toFixed(3);
  const winner=a.accuracy>b.accuracy?'Geometry leads on this test':
    a.accuracy<b.accuracy?'Degree-first leads on this test':'No advantage detected';
  el('outcome').textContent=winner;
  const body=el('orders');body.innerHTML='';
  for(let i=0;i<=8;i++){
    const tr=document.createElement('tr');
    [i,receipt.orderHistogram.geometry[i],receipt.orderHistogram.degree[i]].forEach(num=>{
      const td=document.createElement('td');td.textContent=number(num);tr.append(td);
    });body.append(tr);
  }
  if(inspection){
    const selectedWord=inspection.word;
    el('testWord').value=selectedWord;
    el('inspection').textContent='Unseen '+bits(selectedWord)+' ('+selectedWord+') · geometry predicts '+bits(inspection.geometryGuess)+
      ' · degree-first predicts '+bits(inspection.degreeGuess)+'. Neither model fitted this wall word.';
  }else el('inspection').textContent='No common unseen word remained under the selected calibration.';
  drawGeometry(receipt.geometryMaskIds,inspection&&inspection.word);
  drawTrace(inspection);
  let note='Comparison complete. Physical calibration pings per strategy = selected states × '+receipt.sourceIds.length+
    '. Causal gate: deadline '+receipt.deadline+' + 40-step margin. Common unseen records: '+receipt.commonHoldout+'.';
  if(receipt.methods.degree.calibrationStates!==receipt.methods.geometry.calibrationStates)
    note+=' WARNING: actual calibration counts are not matched; do not compare accuracies.';
  setStatus(note,100);
}
function run(){
  if(!ready||busy)return;
  busy=true;el('compare').disabled=true;el('inspect').disabled=true;
  setStatus('Fitting restricted calibration dictionaries and scoring COMMON held-out records…',100);
  worker.postMessage({type:'compare',config:config()});
}
worker.onmessage=e=>{
  const v=e.data;
  if(v.type==='phase')setStatus(v.message,0);
  else if(v.type==='progress')setStatus('Independent scoring oracle: simulated '+v.done+'/'+v.total+
    ' words (3 physical pings each). This is NOT training the model.',100*v.done/v.total);
  else if(v.type==='geometry'){
    earliest=v.earliest;minByOrder=v.minByOrder;points=v.points;
    drawHorizon();drawGeometry();
  }else if(v.type==='ready'){
    ready=true;el('compare').disabled=false;el('inspect').disabled=false;
    setStatus('Ready. The full 256-state oracle is isolated for scoring. Choose an experiment.',100);
    run();
  }else if(v.type==='result'){
    latest=v.receipt;busy=false;el('compare').disabled=false;el('inspect').disabled=false;
    printResult(v.receipt,v.inspection);
  }else if(v.type==='error'){
    busy=false;el('compare').disabled=false;el('inspect').disabled=false;
    setStatus('Error: '+v.error,100);
  }
};
worker.onerror=e=>{busy=false;setStatus('Worker error: '+e.message,100);};
['budget','noise'].forEach(id=>el(id).addEventListener('input',updateControls));
el('window').addEventListener('change',updateControls);
el('compare').addEventListener('click',run);
el('inspect').addEventListener('click',run);
updateControls();drawGeometry();drawHorizon();drawTrace();
worker.postMessage({type:'init'});
})();
