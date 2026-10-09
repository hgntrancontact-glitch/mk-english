import {el} from './dom.js?v=0.6.0';
import {openPanel} from './panel.js?v=0.6.0';
import {CRM,groupFields} from './crm-model.js?v=0.6.0';
import {readEntryBook,saveEntry,requiredFields,feeSystemFields} from './sheet-entry.js?v=0.6.0';

export async function openEntry({api,source,name,onSaved}){
  const frame=openPanel(CRM[name]?.add||`Thêm ${name.toLowerCase()}`),{body,actions,panel}=frame,status=el('p','Đang lấy các trường nhập…','entry-status');body.append(status);
  const save=el('button','Lưu vào Google Sheets','primary');save.disabled=true;actions.append(save);
  try{
    const book=await readEntryBook(api,source,name);if(!panel.isConnected)return;
    const sheet=book.sheets.find(s=>s.title===name);if(!sheet)throw new Error('Không tìm thấy bảng trong nguồn đã chọn.');
    const form=el('form'),fieldset=el('fieldset'),fields=el('div',undefined,'entry-sections'),inputs=new Map(),fieldNodes=new Map();
    form.id='entry-form';save.type='submit';save.setAttribute('form',form.id);
    const automatic=[];
    for(const c of sheet.columns){
      if(!c.name)continue;if(c.computed||(name==='Học phí'&&feeSystemFields.includes(c.name))){automatic.push(c.name);continue;}
      const group=el('div',undefined,'entry-field'),label=el('label',c.name),input=el(c.kind==='select'?'select':/ghi chú|note|lý do|báo cáo/i.test(c.name)?'textarea':'input');
      const id=`entry-field-${c.index}`;input.id=id;input.name=c.name;label.htmlFor=id;
      if(c.kind==='select'){input.append(el('option','Chọn…'));input.firstChild.value='';for(const value of c.options){const opt=el('option',value.replace(/[\p{Extended_Pictographic}\uFE0F]/gu,'').trim());opt.value=value;input.append(opt);}}
      else if(input.tagName==='INPUT'){input.type=c.kind==='checkbox'?'checkbox':c.kind; if(c.kind==='number'){input.step='any';input.min='0';if(/%|Tỷ lệ/.test(c.name))input.max='100';}}
      input.required=(requiredFields[name]||[]).includes(c.name);if(input.required)label.append(' *');
      const related=c.name==='Mã học sinh'&&name!=='Học sinh'?book.sheets.find(s=>s.title==='Học sinh'):c.name==='Mã nhóm lớp'&&name==='Học sinh'?book.sheets.find(s=>s.title==='Lớp học'):null;
      if(related){const index=related.headers.indexOf(c.name),list=el('datalist');list.id=`suggest-${c.index}`;for(const row of related.rows.slice(1)){const value=row.values?.[index]?.formattedValue||row.values?.[index]?.userEnteredValue?.stringValue;if(value){const option=el('option');option.value=value;list.append(option);}}group.append(list);input.setAttribute('list',list.id);}
      group.append(label,input);if(/%|Tỷ lệ/.test(c.name))group.append(el('small','Nhập phần trăm, ví dụ 10 nghĩa là 10%.'));fieldNodes.set(c.name,group);inputs.set(c.name,input);
    }
    for(const [title,names] of groupFields([...fieldNodes.keys()])){const section=el('section',undefined,'form-section'),grid=el('div',undefined,'entry-fields');section.append(el('h3',title),grid);names.forEach(name=>grid.append(fieldNodes.get(name)));fields.append(section);}
    fieldset.append(fields);form.append(fieldset);body.prepend(form);
    if(automatic.length){const detail=el('details',undefined,'computed-note');detail.append(el('summary',`${automatic.length} thông tin được tự tính`),el('p',automatic.join(', ')));body.append(detail);}
    status.textContent=name==='Học phí'?'Lưu học phí xác nhận đã nhận tiền và đồng thời ghi vào Quản lý Thu Chi.':'Thông tin được lưu vào bảng đang chọn.';save.disabled=false;
    let busy=false;
    form.onsubmit=async event=>{
      event.preventDefault();if(busy)return;busy=true;frame.setBusy(true);fieldset.disabled=true;save.disabled=true;save.textContent='Đang lưu…';status.className='entry-status';status.textContent='Đang kiểm tra và lưu dữ liệu…';
      const values=Object.fromEntries([...inputs].map(([name,input])=>[name,input.type==='checkbox'?input.checked:input.value]));
      try{
        const work=()=>{if(!panel.isConnected)throw new Error('Biểu mẫu đã đóng.');return saveEntry(api,source,name,values,sheet.headers);};
        await (navigator.locks?navigator.locks.request(`mk-sheet:${source}`,work):work());
        if(!panel.isConnected)return;
        status.textContent='Đã lưu vào Google Sheets.';save.textContent='Đã lưu';await onSaved();frame.setBusy(false);
      }catch(error){if(!panel.isConnected)return;status.className='entry-status error';status.textContent=error.message;fieldset.disabled=false;save.disabled=false;save.textContent='Lưu vào Google Sheets';frame.setBusy(false);busy=false;}
    };
  }catch(error){status.className='entry-status error';status.textContent=error.message;}
}
