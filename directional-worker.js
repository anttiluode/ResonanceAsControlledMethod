/* Full truth is retained only inside the worker, never transmitted to readers.
 * No post-hoc FFT or readout filtering: observations are source-to-one-cell traces.
 */
importScripts('./core.js','./geometry-core.js','./directional-core.js');
const D=self.DirectionalMemoryCore,G=self.GeometryLabCore;
let truth=null,latest=null;
self.onmessage=function(e){
  const msg=e.data;
  try{
    if(msg.kind==='init'){
      self.postMessage({kind:'phase',message:'Simulating equal-energy directional cavity echoes…'});
      truth=D.makeOracle((arm,done,total)=>{
        self.postMessage({kind:'progress',arm,done,total});
      });
      self.postMessage({kind:'ready',pings:256*D.PROBES.length*D.arms.length});
    }else if(msg.kind==='compare'){
      if(!truth)throw Error('Oracle simulation still running');
      const options=msg.options||{};
      const result=D.compare(truth,options);
      const order=options.order===3?3:2;
      const heldout=Array.from({length:256},(_,i)=>i).filter(i=>G.popcounts[i]>order);
      const requested=Number(options.word);
      const word=heldout.includes(requested)?requested:heldout[heldout.length-1];
      const pid=Number.isInteger(options.inspectProbe)&&result.probeIds.includes(options.inspectProbe)?
        options.inspectProbe:result.probeIds[Math.floor(result.probeIds.length/2)];
      const bits=word.toString(2).padStart(8,'0');
      const inspection={word,bits,probe:pid,arms:{}};
      for(const arm of D.arms){
        const model=D.train(truth,arm,Array.from({length:256},(_,i)=>i).filter(i=>G.popcounts[i]<=order),
          result.window,result.probeIds);
        const obs=D.feature(truth,arm,word,result.window,result.probeIds);
        const guess=G.predict(model,obs,result.probeIds.length*100);
        const j=result.probeIds.indexOf(pid),offset=j*100,dim=result.probeIds.length*100;
        inspection.arms[arm]={
          guess,actual:Array.from(D.feature(truth,arm,word,result.window,[pid])),
          fitted:Array.from(model.subarray(word*dim+offset,word*dim+offset+100))
        };
      }
      latest=result;
      self.postMessage({kind:'result',result,inspection});
    }else if(msg.kind==='field'){
      const probe=Number(msg.probe);
      const pid=Number.isInteger(probe)&&probe>=0&&probe<6?probe:4;
      const frames={};
      for(const arm of D.arms){
        const out=D.simulate(0,arm,pid,60,45);
        frames[arm]=Array.from(out.field);
      }
      self.postMessage({kind:'field',probe:pid,frames});
    }
  }catch(err){self.postMessage({kind:'error',message:String(err.stack||err)});}
};
