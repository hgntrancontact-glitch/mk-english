import {$,el} from './dom.js?v=0.5.0';
import {recordTiming} from './timing.js?v=0.5.0';
import {CRM,displayValue,visibleColumns,groupFields,compareCells} from './crm-model.js?v=0.5.0';
import {openPanel,closePanel,editing} from './panel.js?v=0.5.0';

const PAGE_SIZE=50;
export function createView(data,{name='',source=''}={}) {
  const values=data.values||[],headers=values[0]||[],config=CRM[name]||{unit:'bản ghi',identity:[]};
  const rows=values.slice(1).filter(row=>row.some(value=>value!==''&&value!==false&&value!=='FALSE'));
  const root=el('div',undefined,'crm-list'),controls=el('div',undefined,'table-controls'),tools=el('div',undefined,'list-toolbar');
  const input=el('input');input.type='search';input.placeholder=`Tìm trong ${name.toLowerCase()||'danh sách'}…`;input.setAttribute('aria-label','Tìm kiếm');input.className='record-search';
  const filterButton=el('button','Bộ lọc','toolbar-button'),clearButton=el('button','Xoá bộ lọc','text-button'),filterArea=el('div',undefined,'filter-area');filterArea.hidden=true;clearButton.hidden=true;filterButton.setAttribute('aria-expanded','false');
  const modes=el('div',undefined,'column-modes'),compact=el('button','Gọn'),all=el('button','Tất cả cột');modes.setAttribute('aria-label','Cột hiển thị');compact.className='selected';compact.setAttribute('aria-pressed','true');all.setAttribute('aria-pressed','false');modes.append(compact,all);tools.append(input,filterButton,clearButton,modes);controls.append(tools,filterArea);
  const tabs=el('div',undefined,'status-tabs');tabs.setAttribute('aria-label','Nhóm trạng thái');
  const wrap=el('div',undefined,'record-table'),table=el('table'),thead=el('thead'),header=el('tr'),tbody=el('tbody');table.setAttribute('aria-label',name||'Danh sách');thead.append(header);table.append(thead,tbody);wrap.append(table);
  const footer=el('div',undefined,'table-footer'),count=el('span'),hint=el('span','Chọn một hồ sơ để xem chi tiết','table-hint'),prev=el('button','Trước'),next=el('button','Sau');footer.append(count,hint,prev,next);root.append(tabs,wrap,footer);
  let selected=null,currentPage=0,timer,version=0,destroyed=false,worker,index,workerReady,visible=[],allColumns=false,sortColumn=-1,sortDirection=1,selectedRow=-1;
  let scroll={left:0,top:0};let headerSignature='';const allRows=rows.map((_,i)=>i);const requests=new Map(),filters=new Map(),filterInputs=new Map();
  const statusIndex=headers.indexOf(config.status),statusCounts=new Map();
  if(statusIndex>=0)for(const row of rows){const value=String(row[statusIndex]??'');if(value!=='')statusCounts.set(value,(statusCounts.get(value)||0)+1);}
  const tabButtons=new Map();
  function addTab(value,label,n){const button=el('button',undefined,'status-tab');button.append(el('span',label),el('span',String(n),'tab-count'));button.onclick=()=>{if(value==='')filters.delete(statusIndex);else filters.set(statusIndex,value);if(filterInputs.has(statusIndex))filterInputs.get(statusIndex).value=value;currentPage=0;apply();};button.setAttribute('aria-pressed',String(value===''));tabButtons.set(value,button);tabs.append(button);}
  addTab('','Tất cả',rows.length);for(const [value,n] of [...statusCounts].sort((a,b)=>b[1]-a[1]).slice(0,6))addTab(value,displayValue(value),n);
  for(const field of config.filters||[]){const column=headers.indexOf(field);if(column<0)continue;const group=el('div',undefined,'filter-field'),label=el('label',field),select=el('select');select.setAttribute('aria-label',`Lọc theo ${field}`);const first=el('option',`Tất cả ${field.toLowerCase()}`);first.value='';select.append(first);const distinct=[...new Set(rows.map(r=>String(r[column]??'')).filter(Boolean))].sort((a,b)=>compareCells(a,b));for(const value of distinct){const opt=el('option',displayValue(value));opt.value=value;select.append(opt);}select.onchange=()=>{if(select.value)filters.set(column,select.value);else filters.delete(column);currentPage=0;apply();};label.append(select);group.append(label);filterArea.append(group);filterInputs.set(column,select);}
  filterButton.hidden=filterInputs.size===0;filterButton.onclick=()=>{filterArea.hidden=!filterArea.hidden;filterButton.setAttribute('aria-expanded',String(!filterArea.hidden));};
  clearButton.onclick=()=>{input.value='';filters.clear();filterInputs.forEach(s=>s.value='');queueSearch();};
  function columns(){const cols=visibleColumns(headers,name,allColumns),[primary,secondary]=config.identity||[];return !allColumns&&headers.includes(primary)?cols.filter(i=>headers[i]!==secondary):cols;}
  function renderHeader(){const signature=JSON.stringify([columns(),sortColumn,sortDirection]);if(signature===headerSignature)return;headerSignature=signature;header.replaceChildren();for(const c of columns()){const th=el('th'),button=el('button',headers[c]);button.className='sort-button';button.setAttribute('aria-label',`Sắp xếp theo ${headers[c]}`);if(sortColumn===c){th.setAttribute('aria-sort',sortDirection===1?'ascending':'descending');button.append(el('small',sortDirection===1?' tăng':' giảm'));}button.onclick=()=>{sortDirection=sortColumn===c?-sortDirection:1;sortColumn=c;apply();};th.append(button);header.append(th);}}
  function detail(rowIndex){
    if(editing())return;
    const row=rows[rowIndex],[primary,secondary]=config.identity||[],primaryIndex=headers.indexOf(primary),secondaryIndex=headers.indexOf(secondary);
    const title=displayValue(row[primaryIndex])==='—'?name:displayValue(row[primaryIndex]);
    const frame=openPanel(title,{kind:'record',subtitle:displayValue(row[secondaryIndex])==='—'?'Chi tiết bản ghi':displayValue(row[secondaryIndex])});
    selectedRow=rowIndex;frame.panel.dataset.owner=name;
    const status=statusIndex>=0?displayValue(row[statusIndex]):'';if(status&&status!=='—')frame.body.append(el('span',status,'record-status'));
    for(const [title,names] of groupFields(headers.filter(Boolean))){const section=el('section',undefined,'profile-section'),list=el('dl');section.append(el('h3',title),list);for(const field of names){const pair=el('div'),dt=el('dt',field),dd=el('dd',displayValue(row[headers.indexOf(field)]));pair.append(dt,dd);list.append(pair);}frame.body.append(section);}
    const link=el('a','Mở tệp Google Sheets','button-link');link.href=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(source)}/edit`;link.target='_blank';link.rel='noopener noreferrer';frame.actions.append(link);
    frame.panel.addEventListener('panel-close',()=>{selectedRow=-1;if(!destroyed)markSelection();});markSelection();
  }
  function markSelection(){for(const tr of tbody.children){const yes=Number(tr.dataset.row)===selectedRow;tr.classList.toggle('row-selected',yes);tr.setAttribute('aria-selected',String(yes));}}
  function render() {
    const start=performance.now(),total=visible.length,lastPage=Math.max(0,Math.ceil(total/PAGE_SIZE)-1);currentPage=Math.min(currentPage,lastPage);const fragment=document.createDocumentFragment();
    const cols=columns();renderHeader();
    for(let n=currentPage*PAGE_SIZE;n<Math.min(total,(currentPage+1)*PAGE_SIZE);n++){
      const rowIndex=visible[n],row=rows[rowIndex],tr=el('tr');tr.dataset.row=String(rowIndex);tr.onclick=()=>detail(rowIndex);
      for(const [position,c] of cols.entries()){
        const td=el('td');
        if(position===0){const button=el('button',displayValue(row[c]),'record-link');button.onclick=event=>{event.stopPropagation();detail(rowIndex);};td.append(button);const secondary=headers.indexOf(config.identity?.[1]);if(!allColumns&&secondary>=0&&secondary!==c&&row[secondary])td.append(el('small',displayValue(row[secondary]),'record-id'));}
        else if(c===statusIndex)td.append(el('span',displayValue(row[c]),'record-status'));
        else td.textContent=displayValue(row[c]);
        tr.append(td);
      }
      fragment.append(tr);
    }
    if(total===0){const tr=el('tr'),td=el('td',rows.length?'Không có hồ sơ khớp bộ lọc.':'Chưa có dữ liệu. Bạn có thể thêm bản ghi đầu tiên.','no-records');td.colSpan=Math.max(1,cols.length);tr.append(td);fragment.append(tr);}
    tbody.replaceChildren(fragment);markSelection();count.textContent=total?`${currentPage*PAGE_SIZE+1}–${Math.min(total,(currentPage+1)*PAGE_SIZE)} trong ${total} ${config.unit}`:`0 ${config.unit}`;
    prev.disabled=currentPage===0;next.disabled=currentPage===lastPage;
    clearButton.hidden=!input.value&&!filters.size;filterButton.textContent=filters.size?`Bộ lọc (${filters.size})`:'Bộ lọc';
    for(const [value,button] of tabButtons){const yes=value===(filters.get(statusIndex)||'');button.classList.toggle('active',yes);button.setAttribute('aria-pressed',String(yes));}
    if(root.isConnected){$('record-count').textContent=String(total);$('record-count').hidden=false;}
    recordTiming('table-render',performance.now()-start,{rows:Math.min(PAGE_SIZE,total),columns:cols.length});
  }
  function apply(){visible=[];const conditions=[...filters],candidates=selected===null?allRows:selected;for(const i of candidates){if(conditions.every(([c,value])=>String(rows[i][c]??'')===value))visible.push(i);}if(sortColumn>=0)visible.sort((a,b)=>sortDirection*compareCells(rows[a][sortColumn],rows[b][sortColumn]));render();}
  compact.onclick=()=>{allColumns=false;compact.classList.add('selected');all.classList.remove('selected');compact.setAttribute('aria-pressed','true');all.setAttribute('aria-pressed','false');render();};
  all.onclick=()=>{allColumns=true;all.classList.add('selected');compact.classList.remove('selected');all.setAttribute('aria-pressed','true');compact.setAttribute('aria-pressed','false');render();};
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
        worker=new Worker(new URL('./search-worker.js?v=0.5.0',import.meta.url));
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
    selected=matches;currentPage=0;apply();root.removeAttribute('aria-busy');
    recordTiming('table-search',performance.now()-start,{rows:rows.length});
  }
  function queueSearch() {
    clearTimeout(timer);const id=++version;root.setAttribute('aria-busy','true');
    timer=setTimeout(()=>search(input.value,id),80);
  }
  input.addEventListener('input',event=>{if(!event.isComposing)queueSearch();});
  input.addEventListener('compositionend',queueSearch);
  prev.onclick=()=>{currentPage--;render();wrap.scrollTop=0;};next.onclick=()=>{currentPage++;render();wrap.scrollTop=0;};
  apply();
  return {root,controls,get count(){return visible.length;},subtitle:config.description||'',
    activate(){wrap.scrollLeft=scroll.left;wrap.scrollTop=scroll.top;},
    deactivate(){scroll={left:wrap.scrollLeft,top:wrap.scrollTop};},
    destroy(){destroyed=true;version++;clearTimeout(timer);worker?.terminate();for(const finish of requests.values())finish(null);requests.clear();root.replaceChildren();controls.replaceChildren();}
  };
}
