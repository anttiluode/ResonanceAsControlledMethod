/* Heavy finite-difference simulations live off the UI thread. */
importScripts('./core.js');
const C=self.ResonanceLabCore;
let library=null;
self.onmessage=function(e){
  const m=e.data;
  try {
    if(m.kind==='prepare'){
      library=C.templatesForAll((done,total)=>self.postMessage({kind:'progress',done,total}));
      self.postMessage({kind:'ready',library,reference:C.noiseReference(library)});
    } else if(m.kind==='frames'){
      const out=C.run(m.word,m.source,true);
      self.postMessage({kind:'frames',word:m.word,source:m.source,frames:out.frames,trace:Array.from(out.samples)},
        out.frames.map(f=>f.buffer));
    }
  } catch(err) { self.postMessage({kind:'error',error:String(err.message||err)}); }
};
