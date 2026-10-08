import {el} from './dom.js?v=0.3.0';
export function createView(data) {
  const root=el('div',undefined,'schedule-list'),controls=el('div',undefined,'table-controls'),input=el('input');
  input.type='search';input.placeholder='Tìm trong lịch…';input.setAttribute('aria-label','Tìm kiếm');controls.append(input);
  const formatter=new Intl.DateTimeFormat('vi-VN',{timeZone:data.timeZone||'Asia/Ho_Chi_Minh',dateStyle:'medium',timeStyle:'short'});
  const records=(data.items||[]).map(item=>{
    const name=item.summary||'(Không có tiêu đề)',row=el('div',undefined,'schedule-row');
    const when=item.start?.dateTime?formatter.format(new Date(item.start.dateTime)):`${item.start?.date||''} · Cả ngày`;
    row.append(el('time',when),el('strong',name));return {row,key:name.toLowerCase()};
  });
  const empty=el('p','Không có lịch phù hợp trong 7 ngày tới.','empty-state');
  records.forEach(record=>root.append(record.row));root.append(empty);
  if(data.nextPageToken)root.append(el('p','Đang hiển thị tối đa 250 sự kiện.','help'));
  function filter(){const key=input.value.toLowerCase();let count=0;for(const record of records){record.row.hidden=!record.key.includes(key);if(!record.row.hidden)count++;}empty.hidden=count>0;}
  input.oninput=filter;filter();
  return {root,controls,subtitle:`${data.summary||'Lịch đã chọn'} · 7 ngày tới`,destroy(){root.replaceChildren();controls.replaceChildren();}};
}
