import {EXPECTED_TABS} from './config.js?v=0.4.0';

export const requiredFields={
  'Lớp học':['Mã nhóm lớp','Lớp học'], 'Học sinh':['Mã học sinh','Họ tên','Mã nhóm lớp'],
  'Điểm danh':['Mã học sinh','Ngày','Giờ bắt đầu','Điểm danh'],
  'Đánh giá học tập':['Mã học sinh','Ngày'], 'Điểm Trường':['Mã học sinh','Ngày','Loại kiểm tra'],
  'Học phí':['Mã học sinh','Thời gian đóng phí','Học phí/ 1 tháng','Thanh toán'],
  'Quản lý Thu Chi':['Ngày thu/chi'], 'Chăm sóc khách hàng':['Mã học sinh'],
};
export const feeSystemFields=['Hoàn tất','Đã ghi vào thu chi','Ngày chỉnh sửa cuối'];
const base=id=>`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}`;
export function parseSheet(sheet) {
  const rows=sheet.data?.[0]?.rowData||[],headers=(rows[0]?.values||[]).map(c=>c.formattedValue||c.userEnteredValue?.stringValue||'');
  const columns=headers.map((name,index)=>{
    const sample=rows.slice(1).map((r,i)=>({cell:r.values?.[index]||{},row:i+1}));
    const formula=sample.find(x=>x.cell.userEnteredValue?.formulaValue),validation=sample.find(x=>x.cell.dataValidation)?.cell.dataValidation;
    const format=sample.find(x=>x.cell.effectiveFormat?.numberFormat)?.cell.effectiveFormat.numberFormat;
    const kind=validation?.condition?.type==='BOOLEAN'?'checkbox':validation?.condition?.type==='ONE_OF_LIST'?'select':/DATE/.test(format?.type||'')||/^(Ngày|Thời gian đóng phí|Đề xuất [12] - Thời gian)/.test(name)?'date':format?.type==='TIME'||/^Giờ /.test(name)?'time':/^(Học phí|Giảm học phí|Ưu đãi|Số tiền|Số điểm|Điểm BTVN|Điểm định kỳ|Tỷ lệ)/.test(name)?'number':'text';
    return {name,index,formulaRow:formula?.row,computed:!!formula||name==='Stt',kind,options:validation?.condition?.values?.map(v=>v.userEnteredValue)||[],format};
  });
  return {title:sheet.properties.title,id:sheet.properties.sheetId,rowCount:sheet.properties.gridProperties.rowCount,rows,columns,headers};
}
export async function readEntryBook(api,source,name) {
  if(!EXPECTED_TABS.includes(name))throw new Error('Bảng không hợp lệ.');
  const names=[name,...(name==='Học phí'?['Quản lý Thu Chi']:[]),...(name==='Học sinh'?['Lớp học']:name==='Lớp học'?[]:['Học sinh'])];
  const params=new URLSearchParams({includeGridData:'true',fields:'sheets(properties,data(rowData(values(userEnteredValue,effectiveValue,formattedValue,dataValidation,effectiveFormat(numberFormat))))),developerMetadata(metadataId,metadataKey,metadataValue)'});
  names.forEach(n=>params.append('ranges',`'${n.replaceAll("'","''")}'`));
  const data=await api(`${base(source)}?${params}`);
  return {sheets:(data.sheets||[]).map(parseSheet),metadata:data.developerMetadata||[]};
}
export function normalizeInput(sheet,input) {
  const out={};
  for(const c of sheet.columns){
    if(c.computed||!c.name)continue;const value=input[c.name];
    if(c.kind==='checkbox'){out[c.name]=!!value;continue;}
    if(value===undefined||value===''){out[c.name]='';continue;}
    if(c.kind==='number'){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(`${c.name}: nhập số không âm.`);if(/%|Tỷ lệ/.test(c.name)&&n>100)throw new Error(`${c.name}: tối đa 100%.`);out[c.name]=/%|Tỷ lệ/.test(c.name)?n/100:n;}
    else {out[c.name]=String(value).trim();if(c.kind==='select'&&!c.options.includes(out[c.name]))throw new Error(`${c.name}: chọn một giá trị trong danh sách.`);if(c.kind==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(out[c.name]))throw new Error(`${c.name}: ngày không hợp lệ.`);if(c.kind==='time'&&!/^\d{2}:\d{2}$/.test(out[c.name]))throw new Error(`${c.name}: giờ không hợp lệ.`);}
  }
  for(const field of requiredFields[sheet.title]||[])if(!out[field]&&out[field]!==0)throw new Error(`Vui lòng nhập ${field}.`);
  if(sheet.title==='Điểm danh'&&out['Giờ kết thúc']&&out['Giờ kết thúc']<=out['Giờ bắt đầu'])throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
  if(sheet.title==='Quản lý Thu Chi'&&!(Number(out['Số tiền thu'])>0 ^ Number(out['Số tiền chi'])>0))throw new Error('Nhập một khoản thu hoặc một khoản chi lớn hơn 0.');
  if(sheet.title==='Học phí'){
    if(out['Giảm học phí']&&out['Ưu đãi %'])throw new Error('Chọn giảm học phí bằng số tiền hoặc phần trăm.');
    const total=Number(out['Học phí/ 1 tháng'])-Number(out['Giảm học phí']||0)-Number(out['Học phí/ 1 tháng'])*Number(out['Ưu đãi %']||0);
    if(!(total>0))throw new Error('Học phí thực đóng phải lớn hơn 0.');
    out['Hoàn tất']=true;out['Đã ghi vào thu chi']=true;out['Ngày chỉnh sửa cuối']=new Date().toISOString().slice(0,10);
  }
  return out;
}
function serialDate(value){return (Date.parse(value+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000;}
function cellValue(c,value){
  if(value===''||value===undefined)return {stringValue:''};
  if(c.kind==='date')return {numberValue:serialDate(value)};
  if(c.kind==='time'){const [h,m]=value.split(':').map(Number);return {numberValue:(h*60+m)/1440};}
  return typeof value==='boolean'?{boolValue:value}:typeof value==='number'?{numberValue:value}:{stringValue:String(value)};
}
const raw=c=>c?.userEnteredValue||{};
async function marker(key){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key)));return {id:(new DataView(bytes.buffer).getUint32(0)&0x7fffffff)||1,value:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};}
function naturalKey(name,input){const id=String(input['Mã học sinh']||input['Mã nhóm lớp']||'').trim().toUpperCase();if(name==='Lớp học'||name==='Học sinh')return id;if(name==='Học phí')return [id,input['Thời gian đóng phí']?.slice(0,7)];if(name==='Điểm danh')return [id,input['Ngày'],input['Giờ bắt đầu']];return input;}
export async function planEntry(book,name,input){
  const sheet=book.sheets.find(s=>s.title===name);if(!sheet)throw new Error('Không tìm thấy bảng cần nhập.');
  const business=await marker(JSON.stringify(['mk-entry',sheet.id,naturalKey(name,input)]));
  if(book.metadata.some(m=>m.metadataValue===business.value))throw new Error('Dữ liệu này đã được lưu trước đó. Bấm Tải lại để xem.');
  const keys=name==='Lớp học'?['Mã nhóm lớp']:name==='Học sinh'?['Mã học sinh']:name==='Học phí'?['Mã học sinh','Thời gian đóng phí']:name==='Điểm danh'?['Mã học sinh','Ngày','Giờ bắt đầu']:[];
  if(keys.length&&sheet.rows.slice(1).some(row=>keys.every(k=>{
    const c=sheet.columns.find(c=>c.name===k);if(!c)return false;
    const value=row.values?.[c.index];let actual=raw(value);const wanted=cellValue(c,input[k]);
    if(c.kind==='date'&&actual.stringValue){const m=actual.stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)actual={numberValue:serialDate(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`)};}
    if(name==='Học phí'&&c.kind==='date'&&actual.numberValue!==undefined)return new Date(Date.UTC(1899,11,30)+actual.numberValue*86400000).toISOString().slice(0,7)===input[k].slice(0,7);
    if(actual.stringValue!==undefined&&wanted.stringValue!==undefined)return actual.stringValue.trim().toUpperCase()===wanted.stringValue.toUpperCase();
    if(actual.numberValue!==undefined&&wanted.numberValue!==undefined)return Math.abs(actual.numberValue-wanted.numberValue)<1e-9;
    return JSON.stringify(actual)===JSON.stringify(wanted);
  })))throw new Error('Bảng đã có dữ liệu cùng mã hoặc cùng buổi/kỳ. Hãy kiểm tra trước khi nhập thêm.');
  const requests=[],claimIds=new Set(book.metadata.map(m=>m.metadataId));
  function claim(m,key){if(claimIds.has(m.id))throw new Error('Dòng này vừa được lưu ở phiên khác. Đóng biểu mẫu rồi mở lại để cập nhật.');claimIds.add(m.id);requests.push({createDeveloperMetadata:{developerMetadata:{metadataId:m.id,metadataKey:key,metadataValue:m.value,visibility:'DOCUMENT',location:{spreadsheet:true}}}});}
  claim(business,'mk_entry');
  async function add(target,values){
    let row=-1,claimMark;
    for(let r=1;r<target.rowCount;r++){
      const cells=target.rows[r]?.values||[];
      if(target.columns.some(c=>{if(c.name==='Stt')return false;const v=raw(cells[c.index]);return v.stringValue!==undefined&&v.stringValue!==''||v.numberValue!==undefined||v.boolValue===true;}))continue;
      const m=await marker(`mk-row:${target.id}:${r}`);if(claimIds.has(m.id))continue;row=r;claimMark=m;break;
    }
    if(row<0)throw new Error(`${target.title} đã hết dòng trống trong mẫu. Thêm dòng trong Google Sheets rồi mở lại biểu mẫu.`);
    claim(claimMark,'mk_row');
    const full={sheetId:target.id,startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:target.columns.length};
    if(row!==1)for(const type of ['PASTE_FORMAT','PASTE_DATA_VALIDATION'])requests.push({copyPaste:{source:{...full,startRowIndex:1,endRowIndex:2},destination:full,pasteType:type}});
    for(const c of target.columns){
      const dest={...full,startColumnIndex:c.index,endColumnIndex:c.index+1};
      if(c.formulaRow!==undefined){if(c.formulaRow!==row)requests.push({copyPaste:{source:{...dest,startRowIndex:c.formulaRow,endRowIndex:c.formulaRow+1},destination:dest,pasteType:'PASTE_FORMULA'}});continue;}
      const cell={userEnteredValue:c.name==='Stt'?{numberValue:row}:cellValue(c,values[c.name])};
      requests.push({updateCells:{range:dest,rows:[{values:[cell]}],fields:'userEnteredValue'}});
    }
  }
  await add(sheet,input);
  if(name==='Học phí'){
    const cash=book.sheets.find(s=>s.title==='Quản lý Thu Chi');if(!cash)throw new Error('Thiếu bảng Quản lý Thu Chi; chưa lưu học phí.');
    const amount=Number(input['Học phí/ 1 tháng'])-Number(input['Giảm học phí']||0)-Number(input['Học phí/ 1 tháng'])*Number(input['Ưu đãi %']||0);
    await add(cash,{'Ngày thu/chi':input['Thời gian đóng phí'],'Ngày đóng':input['Thời gian đóng phí'],'Ngày tạo':new Date().toISOString().slice(0,10),'Trạng thái':'Đã thu','Đã check':true,'Nhóm':'Cố định','Nguồn thu':'Học phí tháng','Số tiền thu':amount,'Thanh toán':input['Thanh toán'],'Mã học sinh':input['Mã học sinh'],'Ghi chú':input['Ghi chú']||''});
  }
  return {requests};
}
export async function saveEntry(api,source,name,input,originalHeaders){
  const book=await readEntryBook(api,source,name),sheet=book.sheets.find(s=>s.title===name);
  if(!sheet||JSON.stringify(sheet.headers)!==JSON.stringify(originalHeaders))throw new Error('Các cột đã thay đổi. Đóng biểu mẫu rồi mở lại để nhập đúng cấu trúc mới.');
  const normalized=normalizeInput(sheet,input);
  const reference=name==='Học sinh'?['Lớp học','Mã nhóm lớp']:name==='Lớp học'?null:['Học sinh','Mã học sinh'];
  if(reference&&normalized[reference[1]]){
    const related=book.sheets.find(s=>s.title===reference[0]),col=related?.headers.indexOf(reference[1]);
    if(!related||col<0||!related.rows.slice(1).some(r=>r.values?.[col]?.formattedValue===normalized[reference[1]]||r.values?.[col]?.userEnteredValue?.stringValue===normalized[reference[1]]))throw new Error(`${reference[1]} chưa có trong bảng ${reference[0]}. Chọn mã đang có hoặc tạo trước.`);
  }
  const body=await planEntry(book,name,normalized);
  return api(`${base(source)}:batchUpdate`,{method:'POST',body:JSON.stringify(body)});
}
