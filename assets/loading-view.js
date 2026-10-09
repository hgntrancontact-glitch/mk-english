import {el} from './dom.js?v=0.6.0';
import {CRM} from './crm-model.js?v=0.6.0';
export function loadingView(name){
  const root=el('div',undefined,'loading-view');root.setAttribute('aria-busy','true');
  const status=el('p',name==='Thời khoá biểu'?'Đang kết nối lịch Google…':'Đang đồng bộ dữ liệu Google…','sync-status');status.setAttribute('role','status');root.append(status);
  const table=el('table',undefined,'loading-table'),head=el('thead'),tr=el('tr'),body=el('tbody');table.setAttribute('aria-hidden','true');
  const labels=(CRM[name]?.columns||['Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy','Chủ nhật']).slice(0,6);
  labels.forEach(label=>tr.append(el('th',label)));head.append(tr);
  for(let i=0;i<6;i++){const row=el('tr');labels.forEach((_,j)=>{const cell=el('td'),line=el('span',undefined,'placeholder-line');line.style.width=`${40+(i*13+j*17)%45}%`;cell.append(line);row.append(cell);});body.append(row);}
  table.append(head,body);const wrap=el('div',undefined,'loading-table-wrap');wrap.append(table);root.append(wrap);return root;
}
