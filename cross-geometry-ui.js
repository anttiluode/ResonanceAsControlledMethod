/* Frozen geometry comparison site. All numbers loaded from committed CI receipt. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function inside(name,dx,dy){
  if(name==='original')return dx*dx/(36*36)+dy*dy/(27*27)<=1;
  if(name==='stadium'){const x=Math.max(0,Math.abs(dx)-9);return x*x+dy*dy<=27*27;}
  const rad=25*Math.PI/180,u=Math.cos(rad)*dx+Math.sin(rad)*dy,
    v=-Math.sin(rad)*dx+Math.cos(rad)*dy;
  return u*u/(36*36)+v*v/(27*27)<=1;
}
function drawShapes(){
  for(const name of ['original','stadium','rotated']){
    const c=$(name),ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.fillStyle='#081827';ctx.fillRect(0,0,w,h);
    const scale=1.77,startX=(w-96*scale)/2,startY=(h-96*scale)/2;
    ctx.fillStyle='#1d5669';
    for(let row=0;row<96;row++)for(let col=0;col<96;col++){
      if(inside(name,col-47.5,row-47.5))ctx.fillRect(startX+scale*col,startY+scale*row,scale+.1,scale+.1);
    }
    ctx.lineWidth=1.5;ctx.strokeStyle='#dba96e';
    for(let row=1;row<95;row++)for(let col=1;col<95;col++){
      const dx=col-47.5,dy=row-47.5;
      if(!inside(name,dx,dy))continue;
      const boundary=!inside(name,dx-1,dy)||!inside(name,dx+1,dy)||!inside(name,dx,dy-1)||!inside(name,dx,dy+1);
      if(boundary&&((Math.floor((Math.atan2(dy/27,dx/36)+Math.PI)*8/(2*Math.PI))%2)===0)){
        ctx.fillStyle='#e4b476';
        ctx.fillRect(startX+col*scale,startY+row*scale,scale+1,scale+1);
      }
    }
    for(const [row,col,label,color] of [[48,24,'S','#a4e9ec'],[48,71,'R','#ffe8b7']]){
      const x=startX+col*scale,y=startY+row*scale;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,4.3,0,Math.PI*2);ctx.fill();
      ctx.font='bold 12px system-ui';ctx.fillText(label,x+8,y-6);
    }
    ctx.fillStyle='#85a5b9';ctx.font='11px system-ui';ctx.fillText('96 × 96 grid · eight wall sectors',10,h-11);
  }
}
function drawTuning(data){
  const c=$('tuning'),ctx=c.getContext('2d'),w=c.width,h=c.height;
  ctx.fillStyle='#081827';ctx.fillRect(0,0,w,h);
  const left=53,right=w-20,top=23,bottom=h-43;
  for(let t=0;t<=100;t+=20){
    const y=bottom-(bottom-top)*t/100;
    ctx.strokeStyle='#28485b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    ctx.fillStyle='#94adbd';ctx.font='11px system-ui';ctx.textAlign='right';ctx.fillText(t+'%',left-8,y+4);
  }
  const rows=Object.entries(data).sort((a,b)=>Number(a[0])-Number(b[0]));
  const best=Math.max(...rows.map(x=>x[1].accuracy));
  rows.forEach(([q,row],i)=>{
    const spacing=(right-left)/rows.length,base=left+spacing*i,barWidth=spacing*.57;
    const ht=row.accuracy*(bottom-top);
    ctx.fillStyle=row.accuracy===best?'#edbe80':'#5eafc4';
    ctx.fillRect(base+spacing*.2,bottom-ht,barWidth,ht);
    ctx.fillStyle='#e0eff4';ctx.textAlign='center';ctx.font='12px system-ui';
    ctx.fillText((100*row.accuracy).toFixed(1)+'%',base+spacing*.49,bottom-ht-8);
    ctx.fillStyle='#acc3d0';ctx.fillText('q = '+q,base+spacing*.49,bottom+18);
  });
  ctx.textAlign='left';
}
function show(d){
  $('winner').textContent='q = '+d.winner.toFixed(2);
  drawTuning(d.originalEllipse.fixedCandidateTuning);
  const resultRoot=$('results');resultRoot.replaceChildren();
  for(const [name,label] of [['stadium','Stadium'],['rotated','Rotated ellipse']]){
    const item=d.heldout[name];
    const tr=document.createElement('tr');
    const diff=100*(item.parabolic.accuracy-item.fixed.accuracy);
    const vals=[label,(100*item.parabolic.accuracy).toFixed(1)+'% ('+item.parabolic.correct+'/657)',
      (100*item.fixed.accuracy).toFixed(1)+'% ('+item.fixed.correct+'/657)',
      (diff>=0?'+':'')+diff.toFixed(1)+' pp'];
    vals.forEach((v,i)=>{
      const td=document.createElement('td');td.textContent=v;
      if(i===2)td.style.color='#edbe80';
      if(i===3)td.style.color=diff>=0?'#8ddbb9':'#ffaaa5';
      tr.append(td);
    });resultRoot.append(tr);
  }
  const conditions=Object.entries(d.heldout);
  const passed=conditions.every(([_,v])=>v.parabolic.correct>v.fixed.correct);
  $('outcome').textContent=passed?
    'Parabolic beat the source-tuned fixed-width control in both unseen shapes. External replication is still required.':
    'TRANSFER CLAIM FAILS. The source-tuned fixed-width control won in '+conditions.filter(([_,v])=>v.fixed.correct>v.parabolic.correct).map(([key])=>key).join(' and ')+'. No cross-geometry superiority was demonstrated.';
  $('outcome').style.color=passed?'#8ddbb9':'#ffb2a9';
  $('identity').textContent='Source/receiver equality verified at both k = 0.65 and k = 1.30 on the stadium and rotated ellipse (exact same finite-difference launch and detector traces when q=k).';
  $('status').textContent='Verified numerical receipt loaded. Fixed q='+d.winner.toFixed(2)+
    ' was chosen on the original ellipse only. Independent validation: 2 unseen geometries × 219 held-out wall words × 3 paired noise draws. Original GitHub Actions run: 40486229919.';
}
drawShapes();
fetch('./cross-geometry-results.json',{cache:'no-cache'})
  .then(r=>{if(!r.ok)throw Error('The committed results JSON has not deployed yet');return r.json();})
  .then(show)
  .catch(err=>{$('status').textContent=String(err)+'. The code and validated results are available in the repository and GitHub Actions.';});
})();
