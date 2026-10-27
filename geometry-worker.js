/* Geometry research worker. The 256-state truth oracle stays inside this worker.
   It is NEVER supplied to either restricted calibration constructor. */
importScripts('./core.js','./geometry-core.js');
const G=self.GeometryLabCore;
let oracle=null,geo=null;
self.onmessage=function(e){
  const message=e.data;
  try{
    if(message.type==='init'){
      self.postMessage({type:'phase',message:'Computing shortest source–wall–receiver tours…'});
      geo=G.geometry(6);
      const minByOrder=[];
      for(let k=0;k<=8;k++){
        let m=Infinity;for(let mask=0;mask<256;mask++)
          if(G.popcounts[mask]===k)m=Math.min(m,geo.earliest[mask]);
        minByOrder.push(m);
      }
      self.postMessage({type:'geometry',minByOrder,earliest:Array.from(geo.earliest),
        points:geo.points,calibrationPrinciple:'Causal path estimate uses wall coordinates ONLY.'});
      self.postMessage({type:'phase',message:'Simulating 256 words × 3 source positions as an independent test oracle…'});
      oracle=G.makeOracle((done,total)=>self.postMessage({type:'progress',done,total}));
      self.postMessage({type:'ready',totalWords:256,simulations:768});
    }else if(message.type==='compare'){
      if(!oracle||!geo)throw Error('Simulations have not completed');
      const config=message.config||{};
      const receipt=G.compare(oracle,geo,config);
      const samples=receipt.commonHoldout?
        Array.from({length:256},(_,i)=>i).filter(i=>!receipt.geometryMaskIds.includes(i)&&!receipt.degreeMaskIds.includes(i)):[];
      const request=Number(config.inspectWord);
      const word=samples.includes(request)?request:(samples.includes(255)?255:samples[0]);
      let inspection=null;
      if(word!==undefined){
        const src=receipt.sourceIds;
        const gr=G.modelFromCalibratedOracle(oracle,receipt.geometryMaskIds,receipt.win,src);
        const deg=G.modelFromCalibratedOracle(oracle,receipt.degreeMaskIds,receipt.win,src);
        const dim=src.length*100;
        inspection={word,bits:word.toString(2).padStart(8,'0'),
          actual:Array.from(G.feature(oracle,word,receipt.win,[src[0]])),
          geometric:Array.from(gr.subarray(word*dim,word*dim+100)),
          degree:Array.from(deg.subarray(word*dim,word*dim+100)),
          geometryGuess:G.predict(gr,G.feature(oracle,word,receipt.win,src),dim),
          degreeGuess:G.predict(deg,G.feature(oracle,word,receipt.win,src),dim)};
      }
      self.postMessage({type:'result',receipt,inspection});
    }
  }catch(error){self.postMessage({type:'error',error:String(error&&error.stack||error)});}
};
