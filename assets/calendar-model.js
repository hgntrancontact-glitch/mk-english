export function weekWindow(now=new Date()){
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);
  const end=new Date(start);end.setDate(end.getDate()+7);return {timeMin:start.toISOString(),timeMax:end.toISOString()};
}
export async function readCalendar(api,source,window){
  const params=new URLSearchParams({...window,singleEvents:'true',orderBy:'startTime',maxResults:'2500',fields:'summary,timeZone,items(id,etag,summary,description,location,start,end,htmlLink,colorId),nextPageToken'});
  const data={items:[]};let pages=0;
  do{
    const page=await api(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source)}/events?${params}`);
    data.summary=page.summary;data.timeZone=page.timeZone;data.items.push(...page.items||[]);
    if(!page.nextPageToken)return data;
    params.set('pageToken',page.nextPageToken);pages++;
  }while(pages<20);
  throw new Error('Khoảng lịch có quá nhiều sự kiện. Chọn khoảng ngắn hơn để xem đầy đủ.');
}
export function eventBody(values){
  const title=values.summary.trim();if(!title)throw new Error('Nhập tên lịch.');
  if(!values.start||!values.end||(values.allDay?values.end<values.start:values.end<=values.start))throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
  const body={summary:title,description:values.description||'',location:values.location||''};
  if(values.allDay){body.start={date:values.start};const end=new Date(values.end+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+1);body.end={date:end.toISOString().slice(0,10)};}
  else{body.start={dateTime:new Date(values.start).toISOString()};body.end={dateTime:new Date(values.end).toISOString()};}
  return body;
}
export async function saveCalendarEvent(api,source,values,event,id){
  const base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source)}/events`,body=eventBody(values);
  if(event?.id)return api(`${base}/${encodeURIComponent(event.id)}`,{method:'PATCH',headers:event.etag?{'If-Match':event.etag}:{},body:JSON.stringify(body)});
  try{return await api(base,{method:'POST',body:JSON.stringify({...body,id})});}
  catch(error){
    if(error.status!==409)throw error;
    const saved=await api(`${base}/${id}`);
    const sameDate=(a,b)=>a?.date? a.date===b?.date : Date.parse(a?.dateTime)===Date.parse(b?.dateTime);
    if(saved.summary===body.summary&&sameDate(saved.start,body.start)&&sameDate(saved.end,body.end)&&String(saved.description||'')===body.description&&String(saved.location||'')===body.location)return saved;
    throw new Error('Mã lịch đã được sử dụng. Đóng biểu mẫu và tải lại để kiểm tra.');
  }
}
