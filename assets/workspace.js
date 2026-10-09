import {EXPECTED_TABS} from './config.js?v=0.5.0';
import {createDataStore} from './data-store.js?v=0.5.0';
import {$,el} from './dom.js?v=0.5.0';
import {recordTiming} from './timing.js?v=0.5.0';
import {CRM} from './crm-model.js?v=0.5.0';
import {editing,closePanel} from './panel.js?v=0.5.0';
import {loadingView} from './loading-view.js?v=0.5.0';

const MAX_VIEWS=12;
export function createWorkspace({getGoogle,getSettings,onSettings,onError}) {
  const views=new Map(),pending=new Map(),selectedSources=new Map(),store=createDataStore(getGoogle);
  let warming=false;
  let page='Lớp học',revision=0,epoch=0,activeView;
  const nav=$('main-nav');
  let group='';
  for(const name of ['Lớp học','Học sinh','Thời khoá biểu',...EXPECTED_TABS.slice(2)]) {
    if(CRM[name]?.group!==group){group=CRM[name]?.group;nav.append(el('p',group,'nav-group'));}
    const button=el('button',name,'nav-link');button.dataset.route=name;button.onclick=()=>{if(editing()){onError('Hoàn tất hoặc đóng biểu mẫu đang nhập trước khi chuyển mục.');return;}closePanel();open(name);};nav.append(button);
  }
  $('refresh-data').onclick=()=>{if(!editing())closePanel();open(page,true);};
  $('add-record').onclick=async()=>{
    if(editing())return onError('Biểu mẫu đang mở bên cạnh danh sách.');
    const name=page,source=selectedSources.get(name);if(!source)return onSettings();
    if(name==='Thời khoá biểu'){activeView?.add?.();return;}
    const button=$('add-record');button.disabled=true;
    try{const {openEntry}=await import('./entry-panel.js?v=0.5.0');await openEntry({api:getGoogle,source,name,onSaved:async()=>{epoch++;revision++;disposeViews();await open(name);}});}
    catch(error){onError(error.message);}finally{button.disabled=false;}
  };
  function disposeViews(){for(const view of views.values())view.destroy();views.clear();pending.clear();activeView=null;store.clear();warming=false;}
  function clear(){epoch++;revision++;disposeViews();$('data-content').replaceChildren();$('view-controls').replaceChildren();selectedSources.clear();}
  function remember(key,view) {
    views.delete(key);views.set(key,view);
    while(views.size>MAX_VIEWS){const oldest=views.keys().next().value;if(views.get(oldest)===activeView){const v=views.get(oldest);views.delete(oldest);views.set(oldest,v);continue;}views.get(oldest).destroy();views.delete(oldest);}
  }
  function sourceList(name){const s=getSettings();return name==='Thời khoá biểu'?s.calendars:s.sheets;}
  function warmCalendar() {
    if(warming)return;warming=true;
    const source=getSettings().calendars[0];
    if(source)load('Thời khoá biểu',source,JSON.stringify(['Thời khoá biểu',source]),false).catch(()=>{});
  }
  function load(name,source,key,refresh) {
    if(pending.has(key))return pending.get(key);
    if(!refresh&&views.has(key))return Promise.resolve(views.get(key));
    const session=epoch,isCalendar=name==='Thời khoá biểu';
    const module=isCalendar?import('./calendar-view.js?v=0.5.0'):import('./table.js?v=0.5.0');
    const data=isCalendar?store.calendar(source,refresh):store.table(source,name,refresh);
    const task=Promise.all([data,module]).then(([data,{createView}])=>{
      if(session!==epoch)return null;
      const start=performance.now(),view=createView(data,isCalendar?{read:(window,force=false)=>store.calendar(source,force,window),api:getGoogle,source,onChange:()=>store.clearCalendar()}:{name,source});
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
    if(ids.length>1){const field=el('div',undefined,'source-switch'),label=el('label','Nguồn dữ liệu'),select=el('select');label.htmlFor='active-source';select.id='active-source';ids.forEach((id,i)=>{const option=el('option',`${page==='Thời khoá biểu'?'Lịch':'Bộ dữ liệu'} ${i+1}`);option.value=id;select.append(option);});select.value=source;select.onchange=()=>{if(editing()){select.value=source;onError('Hoàn tất hoặc đóng biểu mẫu trước khi đổi nguồn dữ liệu.');return;}closePanel();selectedSources.set(page,select.value);open(page);};field.append(label,select);$('view-controls').append(field);}
    $('view-controls').append(view.controls);$('data-content').replaceChildren(view.root);view.activate?.();$('view-subtitle').textContent=CRM[page]?.description||view.subtitle;
    $('record-count').hidden=view.count===undefined;if(view.count!==undefined)$('record-count').textContent=String(view.count);
  }
  async function open(name=page,refresh=false) {
    const started=performance.now(),current=++revision;
    page=name;const ids=sourceList(name);let source=selectedSources.get(name);if(!ids.includes(source))source=ids[0]||'';selectedSources.set(name,source);
    $('add-record').textContent=CRM[name]?.add||'Thêm bản ghi';$('add-record').disabled=!source;
    $('welcome').hidden=true;$('app-shell').hidden=false;$('connections').hidden=true;$('data-screen').hidden=false;$('settings-nav').classList.remove('active');
    for(const button of nav.querySelectorAll('[data-route]')){const selected=button.dataset.route===page;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
    $('breadcrumb').textContent=name;$('view-title').textContent=name;
    $('view-category').textContent=CRM[name]?.group||'';$('view-subtitle').textContent=CRM[name]?.description||'';$('record-count').hidden=true;
    const key=JSON.stringify([name,source]);
    if(!source){activeView?.deactivate?.();const box=el('div',undefined,'empty-state');box.append(el('h2','Chọn nguồn dữ liệu cho không gian này'),el('p','Thêm nguồn một lần trong Cài đặt để tự mở ở các lần sau.'));const button=el('button','Mở Cài đặt','primary');button.onclick=onSettings;box.append(button);$('view-controls').replaceChildren();$('data-content').replaceChildren(box);$('view-subtitle').textContent='';$('refresh-data').disabled=false;return;}
    warmCalendar();
    if(refresh&&name==='Thời khoá biểu'&&views.has(key)){mount(views.get(key),ids,source);activeView.refresh?.();return;}
    if(!refresh&&views.has(key)){const view=views.get(key);remember(key,view);mount(view,ids,source);$('refresh-data').disabled=false;$('refresh-data').textContent='Tải lại';recordTiming('view-cache',performance.now()-started);return;}
    $('refresh-data').disabled=true;$('refresh-data').textContent=refresh?'Đang cập nhật…':'Đang mở…';
    if(!refresh){activeView?.deactivate?.();$('view-controls').replaceChildren();$('data-content').replaceChildren(loadingView(name));}
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
