import {EXPECTED_TABS} from './config.js?v=0.3.0';
import {calendarWindow} from './core.js?v=0.3.0';
import {$,el} from './dom.js?v=0.3.0';
import {recordTiming} from './timing.js?v=0.3.0';

const MAX_VIEWS=6;
export function createWorkspace({getGoogle,getSettings,onSettings,onError}) {
  const views=new Map(),pending=new Map(),selectedSources=new Map();
  let page='Lớp học',revision=0,epoch=0,activeView;
  const nav=$('main-nav');
  for(const name of ['Lớp học','Học sinh','Thời khoá biểu',...EXPECTED_TABS.slice(2)]) {
    const button=el('button',name,'nav-link');button.dataset.route=name;button.onclick=()=>open(name);nav.append(button);
  }
  $('refresh-data').onclick=()=>open(page,true);
  function disposeViews(){for(const view of views.values())view.destroy();views.clear();pending.clear();activeView=null;}
  function clear(){epoch++;revision++;disposeViews();$('data-content').replaceChildren();$('view-controls').replaceChildren();selectedSources.clear();}
  function remember(key,view) {
    views.delete(key);views.set(key,view);
    while(views.size>MAX_VIEWS){const oldest=views.keys().next().value;if(views.get(oldest)===activeView){const v=views.get(oldest);views.delete(oldest);views.set(oldest,v);continue;}views.get(oldest).destroy();views.delete(oldest);}
  }
  function sourceList(name){const s=getSettings();return name==='Thời khoá biểu'?s.calendars:s.sheets;}
  function resource(name,source) {
    if(name==='Thời khoá biểu') {
      const params=new URLSearchParams({...calendarWindow(),singleEvents:'true',orderBy:'startTime',maxResults:'250',fields:'summary,timeZone,items(summary,start,end),nextPageToken'});
      return {url:`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source)}/events?${params}`,module:import('./calendar-view.js?v=0.3.0')};
    }
    const range=`'${name.replaceAll("'","''")}'`;
    return {url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(source)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,module:import('./table.js?v=0.3.0')};
  }
  function load(name,source,key,refresh) {
    if(pending.has(key))return pending.get(key);
    if(!refresh&&views.has(key))return Promise.resolve(views.get(key));
    const session=epoch,{url,module}=resource(name,source);
    const task=Promise.all([getGoogle(url),module]).then(([data,{createView}])=>{
      if(session!==epoch)return null;
      const start=performance.now(),view=createView(data);
      recordTiming('view-create',performance.now()-start,{type:name==='Thời khoá biểu'?'calendar':'table'});
      if(session!==epoch){view.destroy();return null;}
      const old=views.get(key);if(old&&old!==activeView)old.destroy();
      remember(key,view);return view;
    }).finally(()=>{if(pending.get(key)===task)pending.delete(key);});
    pending.set(key,task);return task;
  }
  function mount(view,ids,source) {
    if(activeView?.root.isConnected)activeView.deactivate?.();
    if(activeView&&!Array.from(views.values()).includes(activeView))activeView.destroy();
    activeView=view;$('view-controls').replaceChildren();
    if(ids.length>1){const field=el('div',undefined,'source-switch'),label=el('label','Nguồn dữ liệu'),select=el('select');label.htmlFor='active-source';select.id='active-source';ids.forEach((id,i)=>{const option=el('option',`${page==='Thời khoá biểu'?'Lịch':'Bộ dữ liệu'} ${i+1}`);option.value=id;select.append(option);});select.value=source;select.onchange=()=>{selectedSources.set(page,select.value);open(page);};field.append(label,select);$('view-controls').append(field);}
    $('view-controls').append(view.controls);$('data-content').replaceChildren(view.root);view.activate?.();$('view-subtitle').textContent=view.subtitle;
  }
  async function open(name=page,refresh=false) {
    const started=performance.now(),current=++revision;
    page=name;const ids=sourceList(name);let source=selectedSources.get(name);if(!ids.includes(source))source=ids[0]||'';selectedSources.set(name,source);
    $('welcome').hidden=true;$('app-shell').hidden=false;$('connections').hidden=true;$('data-screen').hidden=false;$('settings-nav').classList.remove('active');
    for(const button of nav.children){const selected=button.dataset.route===page;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    $('breadcrumb').textContent=name;$('view-title').textContent=name;
    const key=JSON.stringify([name,source]);
    if(!source){activeView?.deactivate?.();const box=el('div',undefined,'empty-state');box.append(el('h2','Chọn nguồn dữ liệu cho không gian này'),el('p','Thêm nguồn một lần trong Cài đặt để tự mở ở các lần sau.'));const button=el('button','Mở Cài đặt','primary');button.onclick=onSettings;box.append(button);$('view-controls').replaceChildren();$('data-content').replaceChildren(box);$('view-subtitle').textContent='';$('refresh-data').disabled=false;return;}
    if(!refresh&&views.has(key)){const view=views.get(key);remember(key,view);mount(view,ids,source);$('refresh-data').disabled=false;$('refresh-data').textContent='Tải lại';recordTiming('view-cache',performance.now()-started);return;}
    $('refresh-data').disabled=true;$('refresh-data').textContent=refresh?'Đang cập nhật…':'Đang mở…';
    if(!refresh){activeView?.deactivate?.();$('view-controls').replaceChildren();$('data-content').replaceChildren(el('div','Đang mở dữ liệu…','empty-state'));$('view-subtitle').textContent='';}
    try {
      const view=await load(name,source,key,refresh);
      if(current!==revision||!view)return;
      mount(view,ids,source);recordTiming('view-open',performance.now()-started);
    } catch(error){
      if(current!==revision)return;
      const box=el('div',undefined,'empty-state');box.append(el('h2','Chưa mở được dữ liệu'),el('p',error.message));const retry=el('button','Thử lại','primary');retry.onclick=()=>open(name,true);box.append(retry);$('data-content').replaceChildren(box);onError(error.message);
    } finally {if(current===revision){$('refresh-data').disabled=false;$('refresh-data').textContent='Tải lại';}}
  }
  return {open,clear,invalidate(){epoch++;revision++;disposeViews();},leave(){revision++;activeView?.deactivate?.();}};
}
