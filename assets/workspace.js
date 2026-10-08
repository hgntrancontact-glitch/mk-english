import {EXPECTED_TABS} from './config.js';
import {calendarWindow} from './core.js';

const $ = id => document.getElementById(id);
function node(tag,text,className) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(className)e.className=className; return e; }
export function createWorkspace({getGoogle,getSettings,onSettings,onError}) {
  const cache=new Map(),pending=new Map();
  let page='Lớp học',source='',revision=0,epoch=0,filter='';
  const nav=$('main-nav');
  for (const name of ['Lớp học','Học sinh','Thời khoá biểu',...EXPECTED_TABS.slice(2)]) {
    const button=node('button',name,'nav-link');button.dataset.route=name;
    button.onclick=()=>open(name);nav.append(button);
  }
  $('refresh-data').onclick=()=>open(page,true);
  async function load(key,url,refresh) {
    if(pending.has(key))return pending.get(key);
    if(!refresh&&cache.has(key))return cache.get(key);
    const session=epoch;
    const task=getGoogle(url).then(value=>{if(session===epoch)cache.set(key,value);return value;}).finally(()=>{if(pending.get(key)===task)pending.delete(key);});
    pending.set(key,task);return task;
  }
  function clear() {epoch++;revision++;cache.clear();pending.clear();$('data-content').replaceChildren();$('view-controls').replaceChildren();source='';}
  function sourceList() {const s=getSettings();return page==='Thời khoá biểu'?s.calendars:s.sheets;}
  async function open(name=page,refresh=false) {
    if(page!==name){filter='';source='';}page=name;
    const current=++revision;
    $('welcome').hidden=true;$('app-shell').hidden=false;$('connections').hidden=true;$('data-screen').hidden=false;
    $('settings-nav').classList.remove('active');
    for(const button of nav.children){button.classList.toggle('active',button.dataset.route===page);if(button.dataset.route===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    $('breadcrumb').textContent=page;$('view-title').textContent=page;
    $('view-subtitle').textContent=page==='Thời khoá biểu'?'Lịch trong 7 ngày tới.':'Dữ liệu hiện tại trong Google Sheets.';
    const ids=sourceList(); if(!ids.includes(source))source=ids[0]||'';
    const controls=$('view-controls');controls.replaceChildren();
    if(!source){const box=node('div',undefined,'empty-state');box.append(node('h2','Chọn nguồn dữ liệu cho không gian này'),node('p',page==='Thời khoá biểu'?'Thêm lịch một lần trong Cài đặt để tự mở lịch ở các lần sau.':'Thêm file Google Sheets một lần trong Cài đặt để bắt đầu.'));const b=node('button','Mở Cài đặt','primary');b.onclick=onSettings;box.append(b);$('data-content').replaceChildren(box);return;}
    if(ids.length>1){const label=node('label','Nguồn dữ liệu');label.htmlFor='active-source';const select=node('select');select.id='active-source';ids.forEach((id,i)=>{const option=node('option',`${page==='Thời khoá biểu'?'Lịch':'Bộ dữ liệu'} ${i+1}`);option.value=id;select.append(option);});select.value=source;select.onchange=()=>{source=select.value;filter='';open(page);};const field=node('div',undefined,'source-switch');field.append(label,select);controls.append(field);}
    const input=node('input');input.type='search';input.placeholder=page==='Thời khoá biểu'?'Tìm trong lịch…':'Tìm trong bảng…';input.setAttribute('aria-label','Tìm kiếm');input.value=filter;controls.append(input);
    $('data-content').replaceChildren(node('div','Đang mở dữ liệu…','empty-state'));
    try {
      if(page==='Thời khoá biểu'){
        const params=new URLSearchParams({...calendarWindow(),singleEvents:'true',orderBy:'startTime',maxResults:'250',fields:'summary,timeZone,items(summary,start,end),nextPageToken'});
        const data=await load(`calendar:${source}`,`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source)}/events?${params}`,refresh);
        if(current!==revision)return;
        $('view-subtitle').textContent=`${data.summary||'Lịch đã chọn'} · 7 ngày tới`;
        const render=()=>{
          const list=node('div',undefined,'schedule-list');
          const events=(data.items||[]).filter(item=>(item.summary||'').toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')));
          for(const item of events){const row=node('div',undefined,'schedule-row');const start=item.start?.dateTime;const when=start?new Date(start).toLocaleString('vi-VN',{timeZone:data.timeZone||'Asia/Ho_Chi_Minh',dateStyle:'medium',timeStyle:'short'}):`${item.start?.date||''} · Cả ngày`;row.append(node('time',when),node('strong',item.summary||'(Không có tiêu đề)'));list.append(row);}
          if(!events.length)list.append(node('p','Không có lịch phù hợp trong 7 ngày tới.','empty-state'));
          if(data.nextPageToken)list.append(node('p','Đang hiển thị tối đa 250 sự kiện.','help'));
          $('data-content').replaceChildren(list);
        };input.oninput=()=>{filter=input.value;render();};render();
      } else {
        const range=`'${page.replaceAll("'","''")}'`;
        const data=await load(`sheet:${source}:${page}`,`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(source)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,refresh);
        if(current!==revision)return;
        const values=data.values||[],headers=values[0]||[],rows=values.slice(1).filter(row=>row.some(value=>value!==''&&value!==false&&value!=='FALSE'));
        let currentPage=0;
        const render=()=>{
          const filtered=rows.filter(row=>row.some(value=>String(value).toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi'))));
          const lastPage=Math.max(0,Math.ceil(filtered.length/100)-1);currentPage=Math.min(currentPage,lastPage);
          const table=node('table'),thead=node('thead'),tr=node('tr');headers.forEach(h=>tr.append(node('th',h)));thead.append(tr);table.append(thead);
          const tbody=node('tbody');for(const row of filtered.slice(currentPage*100,(currentPage+1)*100)){const r=node('tr');headers.forEach((h,i)=>r.append(node('td',String(row[i]??''))));tbody.append(r);}table.append(tbody);
          const wrap=node('div',undefined,'record-table');wrap.append(table);
          const footer=node('div',undefined,'table-footer');footer.append(node('span',`${filtered.length} dòng · Trang ${currentPage+1}/${lastPage+1}`));
          const prev=node('button','Trước'),next=node('button','Sau');prev.disabled=currentPage===0;next.disabled=currentPage===lastPage;prev.onclick=()=>{currentPage--;render();};next.onclick=()=>{currentPage++;render();};footer.append(prev,next);
          $('data-content').replaceChildren(wrap,footer);
          if(!rows.length)$('data-content').prepend(node('p','Bảng chưa có dữ liệu.','empty-state'));
        };input.oninput=()=>{filter=input.value;currentPage=0;render();};render();
        $('view-subtitle').textContent=`${rows.length} dòng · Chọn Tải lại để nhận thay đổi từ Google Sheets.`;
      }
    } catch(error){if(current!==revision)return;const box=node('div',undefined,'empty-state');box.append(node('h2','Chưa mở được dữ liệu'),node('p',error.message));const retry=node('button','Thử lại','primary');retry.onclick=()=>open(page,true);box.append(retry);$('data-content').replaceChildren(box);onError(error.message);}
  }
  return {open,clear,invalidate:()=>{cache.clear();revision++;},leave:()=>{revision++;}};
}
