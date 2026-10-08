import {el} from './dom.js?v=0.4.0';
import {recordTiming} from './timing.js?v=0.4.0';

const PAGE_SIZE=50;
export function createView(data) {
  const values=data.values||[],headers=values[0]||[];
  const rows=values.slice(1).filter(row=>row.some(value=>value!==''&&value!==false&&value!=='FALSE'));
  const root=el('div'),controls=el('div',undefined,'table-controls');
  const input=el('input');input.type='search';input.placeholder='Tìm trong bảng…';input.setAttribute('aria-label','Tìm kiếm');controls.append(input);
  const wrap=el('div',undefined,'record-table'),table=el('table'),thead=el('thead'),header=el('tr'),tbody=el('tbody');
  for(const name of headers)header.append(el('th',name));thead.append(header);table.append(thead,tbody);wrap.append(table);
  const footer=el('div',undefined,'table-footer'),count=el('span'),prev=el('button','Trước'),next=el('button','Sau');footer.append(count,prev,next);
  root.append(wrap,footer);
  let selected=null,currentPage=0,timer,version=0,destroyed=false,worker,index,workerReady;
  let scroll={left:0,top:0};const requests=new Map();
  const countRows=()=>selected===null?rows.length:selected.length;
  function render() {
    const start=performance.now(),total=countRows(),lastPage=Math.max(0,Math.ceil(total/PAGE_SIZE)-1);
    currentPage=Math.min(currentPage,lastPage);const fragment=document.createDocumentFragment();
    for(let n=currentPage*PAGE_SIZE;n<Math.min(total,(currentPage+1)*PAGE_SIZE);n++) {
      const row=rows[selected===null?n:selected[n]],tr=el('tr');
      for(let c=0;c<headers.length;c++)tr.append(el('td',String(row[c]??'')));
      fragment.append(tr);
    }
    tbody.replaceChildren(fragment);count.textContent=`${total} dòng · Trang ${currentPage+1}/${lastPage+1}`;
    prev.disabled=currentPage===0;next.disabled=currentPage===lastPage;
    recordTiming('table-render',performance.now()-start,{rows:Math.min(PAGE_SIZE,total),columns:headers.length});
  }
  async function fallbackIndex() {
    if(index)return index;
    const built=[];
    for(let i=0;i<rows.length;i++) {
      if(destroyed)return [];
      built.push(rows[i].map(value=>String(value??'')).join('\u0000').toLowerCase());
      if(i%500===499)await new Promise(resolve=>setTimeout(resolve,0));
    }
    index=built;return built;
  }
  function startWorker() {
    if(workerReady)return workerReady;
    workerReady=new Promise(resolve=>{
      try {
        worker=new Worker(new URL('./search-worker.js?v=0.4.0',import.meta.url));
        worker.onmessage=event=>{
          if(event.data.type==='ready')resolve(true);
          else if(event.data.type==='result'){requests.get(event.data.id)?.(event.data.matches);requests.delete(event.data.id);}
        };
        worker.onerror=()=>{worker.terminate();worker=null;for(const finish of requests.values())finish(null);requests.clear();resolve(false);};
        worker.postMessage({type:'init',rows});
      } catch {worker=null;resolve(false);}
    });
    return workerReady;
  }
  async function search(query,id) {
    const start=performance.now();let matches;
    if(!query)matches=null;
    else if(rows.length>1000&&await startWorker()&&worker) {
      if(id!==version||destroyed)return;
      matches=await new Promise(resolve=>{requests.set(id,resolve);worker.postMessage({type:'search',query,id});});
      if(matches===null&&!worker){const strings=await fallbackIndex(),needle=query.toLowerCase();matches=strings.reduce((out,text,i)=>{if(text.includes(needle))out.push(i);return out;},[]);}
    } else {
      const strings=await fallbackIndex(),needle=query.toLowerCase();
      matches=[];for(let i=0;i<strings.length;i++)if(strings[i].includes(needle))matches.push(i);
    }
    if(id!==version||destroyed)return;
    selected=matches;currentPage=0;render();root.removeAttribute('aria-busy');
    recordTiming('table-search',performance.now()-start,{rows:rows.length});
  }
  function queueSearch() {
    clearTimeout(timer);const id=++version;root.setAttribute('aria-busy','true');
    timer=setTimeout(()=>search(input.value,id),80);
  }
  input.addEventListener('input',event=>{if(!event.isComposing)queueSearch();});
  input.addEventListener('compositionend',queueSearch);
  prev.onclick=()=>{currentPage--;render();wrap.scrollTop=0;};next.onclick=()=>{currentPage++;render();wrap.scrollTop=0;};
  render();
  return {root,controls,subtitle:`${rows.length} dòng · Tải lại để nhận thay đổi từ Google Sheets.`,
    activate(){wrap.scrollLeft=scroll.left;wrap.scrollTop=scroll.top;},
    deactivate(){scroll={left:wrap.scrollLeft,top:wrap.scrollTop};},
    destroy(){destroyed=true;version++;clearTimeout(timer);worker?.terminate();for(const finish of requests.values())finish(null);requests.clear();root.replaceChildren();controls.replaceChildren();}
  };
}
