import {el} from './dom.js?v=0.6.0';
import {weekWindow,saveCalendarEvent} from './calendar-model.js?v=0.6.0';
import {openPanel,editing} from './panel.js?v=0.6.0';

if(!window.FullCalendar)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/fullcalendar.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(new Error('Chưa tải được giao diện lịch. Kiểm tra mạng và tải lại trang.'));document.head.append(script);});
const localValue=date=>{const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const colors=['#7986cb','#33b679','#8e24aa','#e67c73','#f6c026','#f5511d','#039be5','#616161','#3f51b5','#0b8043','#d50000'];
export function createView(data,{read,api,source,onChange}) {
  const root=el('div',undefined,'calendar-root'),controls=el('div',undefined,'table-controls'),input=el('input'),status=el('p','', 'calendar-status'),container=el('div');
  input.type='search';input.placeholder='Tìm trong lịch…';input.setAttribute('aria-label','Tìm kiếm');controls.append(input);root.append(status,container);
  let calendar,destroyed=false,rendered=false,initial=data,force=false,events=[],version=0;
  const initialWindow=weekWindow();
  function applyFilter(){if(calendar)calendar.getEvents().forEach(event=>event.setProp('display',event.title.toLowerCase().includes(input.value.toLowerCase())?'auto':'none'));}
  input.oninput=applyFilter;
  async function editor(item,selection){
    if(editing())return;
    const frame=openPanel(item?'Chỉnh sửa lịch':'Thêm lịch'),{panel,body,actions}=frame,form=el('form'),fields=el('div',undefined,'entry-fields'),message=el('p',item?'Thay đổi áp dụng cho buổi đang chọn.':'Lịch sẽ được lưu vào Google Calendar đang chọn.','entry-status'),save=el('button','Lưu lịch','primary'),fieldset=el('fieldset');
    const inputs={},id=crypto.randomUUID().replaceAll('-','');form.id='calendar-entry-form';save.type='submit';save.setAttribute('form',form.id);
    for(const [key,label,type] of [['summary','Tên lịch','text'],['allDay','Cả ngày','checkbox'],['start','Bắt đầu','datetime-local'],['end','Kết thúc','datetime-local'],['location','Địa điểm','text'],['description','Ghi chú','textarea']]){
      const wrap=el('div',undefined,'entry-field'),l=el('label',label),i=el(type==='textarea'?'textarea':'input');if(type!=='textarea')i.type=type;i.id=`calendar-${key}`;l.htmlFor=i.id;i.required=['summary','start','end'].includes(key);wrap.append(l,i);fields.append(wrap);inputs[key]=i;
    }
    function dateTypes(){const day=inputs.allDay.checked;for(const key of ['start','end']){const value=inputs[key].value;inputs[key].type=day?'date':'datetime-local';inputs[key].value=value?(day?value.slice(0,10):value.length===10?value+'T09:00':value):'';}}
    inputs.allDay.checked=!!item?.start?.date||!!selection?.allDay;dateTypes();
    inputs.summary.value=item?.summary||'';inputs.description.value=item?.description||'';inputs.location.value=item?.location||'';
    const start=item?.start?.dateTime||item?.start?.date||selection?.start||new Date(),end=item?.end?.dateTime||item?.end?.date||selection?.end||new Date(new Date(start).getTime()+3600000);
    if(inputs.allDay.checked){inputs.start.value=typeof start==='string'?start.slice(0,10):localValue(start).slice(0,10);const endDay=typeof end==='string'?end.slice(0,10):localValue(end).slice(0,10);const d=new Date(endDay+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);inputs.end.value=d.toISOString().slice(0,10);}else{inputs.start.value=localValue(start);inputs.end.value=localValue(end);}
    inputs.allDay.onchange=dateTypes;fieldset.append(fields);form.append(fieldset);body.append(form,message);actions.append(save);
    let busy=false;
    form.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;frame.setBusy(true);fieldset.disabled=true;save.disabled=true;message.className='entry-status';message.textContent='Đang lưu lịch…';
      try{await saveCalendarEvent(api,source,Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.type==='checkbox'?i.checked:i.value])),item,id);if(!panel.isConnected)return;message.textContent='Đã lưu vào Google Calendar.';save.textContent='Đã lưu';frame.setBusy(false);onChange();initial=null;force=true;calendar.refetchEvents();}
      catch(error){if(!panel.isConnected)return;busy=false;frame.setBusy(false);fieldset.disabled=false;save.disabled=false;message.className='entry-status error';message.textContent=error.status===412?'Lịch đã được sửa ở nơi khác. Đóng biểu mẫu và bấm Tải lại trước khi chỉnh tiếp.':error.message;}
    };
  }
  calendar=new FullCalendar.Calendar(container,{
    locale:'vi',timeZone:'local',initialView:'timeGridWeek',firstDay:1,height:650,
    buttonIcons:false,headerToolbar:{left:'prev,next today',center:'title',right:'timeGridDay,timeGridWeek,dayGridMonth'},
    buttonText:{prev:'Trước',next:'Sau',today:'Hôm nay',day:'Ngày',week:'Tuần',month:'Tháng'},
    allDayText:'Cả ngày',moreLinkText:n=>`${n} lịch khác`,noEventsText:'Chưa có lịch',nowIndicator:true,
    slotMinTime:'00:00:00',slotMaxTime:'24:00:00',scrollTime:'07:00:00',slotLabelFormat:{hour:'2-digit',minute:'2-digit',hour12:false},eventTimeFormat:{hour:'2-digit',minute:'2-digit',hour12:false},
    dayHeaderFormat:{weekday:'short',day:'numeric',month:'numeric'},selectable:true,editable:false,
    select:selection=>{editor(null,selection);calendar.unselect();},eventClick:info=>{info.jsEvent.preventDefault();editor(info.event.extendedProps.original);},
    events:async(info,success,failure)=>{
      const own=++version;status.textContent='Đang lấy lịch…';const window={timeMin:info.start.toISOString(),timeMax:info.end.toISOString()};
      try{
        const current=initial&&JSON.stringify(window)===JSON.stringify(initialWindow)&&!force?initial:await read(window,force);force=false;
        if(destroyed||own!==version)return;
        events=current.items||[];success(events.map((item,i)=>({id:item.id||String(i),title:item.summary||'(Chưa có tên)',start:item.start?.dateTime||item.start?.date,end:item.end?.dateTime||item.end?.date,allDay:!!item.start?.date,backgroundColor:colors[Number(item.colorId)-1]||'#555',borderColor:'transparent',extendedProps:{original:item}})));
        applyFilter();status.textContent=`${current.summary||'Lịch đã chọn'} · Giờ theo thiết bị (${Intl.DateTimeFormat().resolvedOptions().timeZone})`;
      }catch(error){if(destroyed||own!==version)return;status.textContent=error.message;failure(error);}
    }
  });
  return {root,controls,subtitle:'Chọn ngày hoặc bấm vào lịch để nhập và chỉnh sửa.',add(){editor();},refresh(){initial=null;force=true;calendar.refetchEvents();},activate(){if(!rendered){calendar.render();rendered=true;}else calendar.updateSize();},destroy(){destroyed=true;version++;calendar.destroy();root.replaceChildren();controls.replaceChildren();}};
}
