import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSheet,normalizeInput,planEntry,saveEntry} from '../assets/sheet-entry.js';
import {eventBody,saveCalendarEvent,readCalendar,weekWindow} from '../assets/calendar-model.js';

const str=value=>({userEnteredValue:{stringValue:value},formattedValue:value});
function fixture(name,headers,id=1){return {properties:{title:name,sheetId:id,gridProperties:{rowCount:10}},data:[{rowData:[{values:headers.map(str)},{values:headers.map((h,i)=>h==='Họ tên'&&name!=='Học sinh'?{userEnteredValue:{formulaValue:'=IF(B2="","",B2)'}}:h==='Hoàn tất'?{dataValidation:{condition:{type:'BOOLEAN'}}}:{})}]}]};}
const classes=()=>parseSheet(fixture('Lớp học',['Stt','Mã nhóm lớp','Lớp học','Ngày khai giảng','Học phí','Note']));

test('Input normalizes numbers and dates, keeps phone/text literal and zero values',()=>{
  const sheet=classes(),values=normalizeInput(sheet,{'Mã nhóm lớp':'  GROUP-1  ','Lớp học':'Lớp mẫu','Học phí':'0','Note':'=IMPORTXML("x")'});
  assert.equal(values['Mã nhóm lớp'],'GROUP-1');assert.equal(values['Học phí'],0);assert.equal(values.Note,'=IMPORTXML("x")');
  assert.throws(()=>normalizeInput(sheet,{'Mã nhóm lớp':'a'}),/Lớp học/);
  assert.throws(()=>normalizeInput(sheet,{'Mã nhóm lớp':'a','Lớp học':'A','Học phí':-1}),/không âm/);
});
test('New entries occupy only blank template rows, preserve formulas, and claim rows atomically',async()=>{
  const original=fixture('Học sinh',['Stt','Mã học sinh','Họ tên','Mã nhóm lớp','Tình trạng']);
  original.data[0].rowData[1].values=[{userEnteredValue:{numberValue:1}},str('OLD'),str('Cũ'),str('GROUP'),{userEnteredValue:{formulaValue:'=IF(B2="","","Đang học")'}}];
  const sheet=parseSheet(original),book={sheets:[sheet],metadata:[]},input=normalizeInput(sheet,{'Mã học sinh':'NEW','Họ tên':'Mới','Mã nhóm lớp':'GROUP'}),body=await planEntry(book,'Học sinh',input);
  const writes=body.requests.filter(r=>r.updateCells);assert(writes.every(r=>r.updateCells.range.startRowIndex===2));
  assert.equal(body.requests.filter(r=>r.createDeveloperMetadata).length,2);
  assert(body.requests.some(r=>r.copyPaste?.pasteType==='PASTE_FORMULA'&&r.copyPaste.source.startColumnIndex===4));
  assert(!writes.some(r=>r.updateCells.range.startColumnIndex===4));
  const saved={...book,metadata:body.requests.filter(r=>r.createDeveloperMetadata).map(r=>r.createDeveloperMetadata.developerMetadata)};
  await assert.rejects(planEntry(saved,'Học sinh',input),/đã được lưu/);
  await assert.rejects(planEntry(book,'Học sinh',{...input,'Mã học sinh':'OLD'}),/cùng mã/);
});
test('A non-empty checkbox is not treated as an unused row; full templates fail without a write',async()=>{
  const raw=fixture('Lớp học',['Mã nhóm lớp','Lớp học','Hoạt động']);raw.properties.gridProperties.rowCount=2;raw.data[0].rowData[1].values[2]={userEnteredValue:{boolValue:true},dataValidation:{condition:{type:'BOOLEAN'}}};
  await assert.rejects(planEntry({sheets:[parseSheet(raw)],metadata:[]},'Lớp học',{'Mã nhóm lớp':'A','Lớp học':'Test'}),/hết dòng trống/);
});
test('Fee receipt and cash receipt share one atomic batch and calculate discounts',async()=>{
  const fee=parseSheet(fixture('Học phí',['Mã học sinh','Thời gian đóng phí','Hoàn tất','Thanh toán','Học phí/ 1 tháng','Giảm học phí','Ưu đãi %','Họ tên','Đã ghi vào thu chi'],1));
  const cash=parseSheet(fixture('Quản lý Thu Chi',['Ngày thu/chi','Mã học sinh','Số tiền thu','Họ tên','Thanh toán','Nguồn thu'],2));
  const input=normalizeInput(fee,{'Mã học sinh':'HS-1','Thời gian đóng phí':'2026-10-08','Thanh toán':'Tiền mặt','Học phí/ 1 tháng':'1800000','Ưu đãi %':'10'});
  assert.equal(input['Ưu đãi %'],.1);assert.equal(input['Hoàn tất'],true);
  const body=await planEntry({sheets:[fee,cash],metadata:[]},'Học phí',input);
  assert.deepEqual([...new Set(body.requests.filter(r=>r.updateCells).map(r=>r.updateCells.range.sheetId))],[1,2]);
  assert(body.requests.some(r=>r.updateCells?.range.sheetId===2&&r.updateCells.rows[0].values[0].userEnteredValue.numberValue===1620000));
  assert.equal(body.requests.filter(r=>r.createDeveloperMetadata).length,3);
  await assert.rejects(planEntry({sheets:[fee],metadata:[]},'Học phí',input),/Thiếu bảng/);
});
test('Save re-reads the schema and refuses writes if headers changed',async()=>{
  let writes=0;const api=async(url,opts)=>{if(opts)writes++;return {sheets:[fixture('Lớp học',['Changed'])]};};
  await assert.rejects(saveEntry(api,'example','Lớp học',{},['Original']),/các cột|Các cột/);assert.equal(writes,0);
});
test('Calendar accepts one-day all-day events with exclusive end and rejects inverted times',()=>{
  assert.deepEqual(eventBody({summary:'Học',allDay:true,start:'2026-10-08',end:'2026-10-08'}).end,{date:'2026-10-09'});
  assert.throws(()=>eventBody({summary:'Học',start:'2026-10-08T15:00',end:'2026-10-08T14:00'}),/kết thúc/);
  const w=weekWindow(new Date('2026-10-08T12:00:00'));assert.equal(new Date(w.timeMin).getDay(),1);
});
test('Calendar paging reads all events; event edits include optimistic concurrency header',async()=>{
  const calls=[];const data=await readCalendar(async url=>{calls.push(url);return calls.length===1?{items:[{id:'a'}],nextPageToken:'next'}:{items:[{id:'b'}]};},'example',weekWindow());assert.equal(data.items.length,2);assert(calls[1].includes('pageToken=next'));
  let request;await saveCalendarEvent(async(url,options)=>{request={url,options};return {};},'example',{summary:'New',start:'2026-10-08T13:00',end:'2026-10-08T14:00'},{id:'event',etag:'etag'},'unused');
  assert.equal(request.options.method,'PATCH');assert.equal(request.options.headers['If-Match'],'etag');assert(!('recurrence' in JSON.parse(request.options.body)));
});
test('Calendar retry reconciles an existing inserted event despite Google normalizing timestamps',async()=>{
  let calls=0;const data=await saveCalendarEvent(async(url,options)=>{calls++;if(options)throw Object.assign(new Error('exists'),{status:409});return {summary:'Lịch',start:{dateTime:'2026-10-08T15:00:00+07:00',timeZone:'Asia/Ho_Chi_Minh'},end:{dateTime:'2026-10-08T16:00:00+07:00'}};},'example',{summary:'Lịch',start:'2026-10-08T08:00:00Z',end:'2026-10-08T09:00:00Z'},null,'fake');
  assert.equal(data.summary,'Lịch');assert.equal(calls,2);
});
