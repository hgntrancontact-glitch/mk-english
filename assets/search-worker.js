let index=[];
self.onmessage=event=>{
  const {type,rows,query,id}=event.data;
  if(type==='init') {
    index=rows.map(row=>row.map(value=>String(value??'')).join('\u0000').toLowerCase());
    self.postMessage({type:'ready'});
  } else if(type==='search') {
    const needle=query.toLowerCase(),matches=[];
    for(let i=0;i<index.length;i++)if(index[i].includes(needle))matches.push(i);
    const result=Uint32Array.from(matches);
    self.postMessage({type:'result',id,matches:result},[result.buffer]);
  }
};
