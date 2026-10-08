import {EXPECTED_TABS} from './config.js?v=0.3.1';
import {sheetId,calendarId,calendarWindow} from './core.js?v=0.3.1';
import {$,el} from './dom.js?v=0.3.1';
import {timingReport} from './timing.js?v=0.3.1';

export function initSettings({getSettings,persist,connected,getGeneration,getGoogle,notice}) {
const revisions={sheet:0,calendar:0,list:0};
function renderSources() {
  for (const [kind, ids] of [['sheet',getSettings().sheets],['calendar',getSettings().calendars]]) {
    const container = $(`${kind}-sources`);
    container.replaceChildren();
    if (!ids.length) container.append(el('div','Chưa có nguồn nào được lưu.','empty'));
    for (const id of ids) {
      const row = el('div',undefined,'source');
      const name = el('code',id);
      const test = el('button','Kiểm tra'); test.type = 'button'; test.dataset.auth = ''; test.disabled = !connected();
      test.addEventListener('click', () => runPreview(kind,id,test));
      const remove = el('button','Bỏ nguồn','remove'); remove.type = 'button';
      remove.addEventListener('click', () => {
        try {
          const key = kind === 'sheet' ? 'sheets' : 'calendars';
          persist({...getSettings(),[key]:getSettings()[key].filter(value => value !== id)});
          revisions[kind]++;
          $(`${kind}-preview`).replaceChildren(); renderSources();
          notice('Đã bỏ nguồn khỏi cấu hình trình duyệt.');
        } catch (error) { notice(error.message,true); }
      });
      row.append(name,test,remove); container.append(row);
    }
  }
}

async function inspectSheet(id) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}`;
  const meta = await getGoogle(`${base}?fields=properties(title),sheets(properties(title,sheetId,sheetType))`);
  const tabs = (meta.sheets || []).map(s => s.properties).filter(s => s.sheetType === 'GRID');
  const found = tabs.filter(s => EXPECTED_TABS.includes(s.title));
  let headers = [];
  if (found.length) {
    const params = new URLSearchParams({fields:'valueRanges(range,values)'});
    found.forEach(s => params.append('ranges',`'${s.title.replaceAll("'","''")}'!1:1`));
    headers = (await getGoogle(`${base}/values:batchGet?${params}`)).valueRanges || [];
  }
  const fragment = document.createDocumentFragment();
  fragment.append(el('h3',meta.properties.title));
  const missing = EXPECTED_TABS.filter(name => !tabs.some(t => t.title === name));
  fragment.append(el('p', missing.length ? `Đọc được file. Chưa có các bảng: ${missing.join(', ')}.` : 'Đọc được đủ 8 bảng theo tên. Dưới đây là tiêu đề cột hiện tại; chưa kiểm tra đầy đủ cấu trúc nghiệp vụ.'));
  const table = el('table'); const thead = el('thead'); const title = el('tr');
  ['Bảng','Tiêu đề cột'].forEach(h => title.append(el('th',h))); thead.append(title); table.append(thead);
  const body = el('tbody');
  found.forEach((s,i) => { const row = el('tr'); row.append(el('td',s.title),el('td',(headers[i]?.values?.[0] || []).join(' · ') || 'Hàng tiêu đề đang trống')); body.append(row); });
  table.append(body); const wrap = el('div',undefined,'table-wrap'); wrap.append(table); fragment.append(wrap);
  return fragment;
}

async function inspectCalendar(id) {
  const params = new URLSearchParams({...calendarWindow(),singleEvents:'true',orderBy:'startTime',maxResults:'30',fields:'summary,timeZone,items(summary,start,end),nextPageToken'});
  const data = await getGoogle(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${params}`);
  const fragment = document.createDocumentFragment();
  fragment.append(el('h3',data.summary || 'Lịch đã chọn'));
  fragment.append(el('p',`Đọc được lịch · ${data.timeZone || 'Múi giờ theo Google'}. Hiển thị tối đa 30 sự kiện trong 7 ngày tới.`));
  if (!data.items?.length) fragment.append(el('p','Kết nối thành công. Không có sự kiện trong khoảng này.'));
  const list = el('ul',undefined,'event-list');
  for (const item of data.items || []) {
    const row = el('li');
    const when = item.start?.dateTime ? new Date(item.start.dateTime).toLocaleString('vi-VN',{timeZone:data.timeZone || 'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}) : `${item.start?.date || ''} · Cả ngày`;
    row.append(el('small',when),el('span',item.summary || '(Không có tiêu đề)')); list.append(row);
  }
  fragment.append(list);
  if (data.nextPageToken) fragment.append(el('p','Còn sự kiện khác ngoài 30 mục xem trước.'));
  return fragment;
}

async function runPreview(kind,id,button) {
  const rev = ++revisions[kind], session = getGeneration();
  const start = performance.now();
  button.disabled = true; button.textContent = 'Đang kiểm tra…';
  const target = $(`${kind}-preview`); target.replaceChildren(el('p','Đang đọc trực tiếp từ Google…'));
  try {
    const result = await (kind === 'sheet' ? inspectSheet(id) : inspectCalendar(id));
    if (session !== getGeneration() || rev !== revisions[kind]) return;
    target.replaceChildren(result);
    target.append(el('p',`Lần đọc này: ${((performance.now()-start)/1000).toFixed(1)} giây · ${new Date().toLocaleTimeString('vi-VN')}`,'help'));
    notice('Đã đọc nguồn dữ liệu thành công.');
  } catch(error) {
    if (session !== getGeneration() || rev !== revisions[kind]) return;
    target.replaceChildren(el('p',error.message)); notice(error.message,true);
  } finally { button.textContent = 'Kiểm tra'; button.disabled = !connected(); }
}

function addSource(kind,value) {
  const id = kind === 'sheet' ? sheetId(value) : calendarId(value);
  const key = kind === 'sheet' ? 'sheets' : 'calendars';
  if (getSettings()[key].includes(id)) { notice('Nguồn này đã có trong danh sách.'); return; }
  persist({...getSettings(),[key]:[...getSettings()[key],id]}); renderSources();
  notice(connected() ? 'Đã lưu nguồn. Bấm Kiểm tra để đọc dữ liệu.' : 'Đã lưu nguồn. Kết nối Google rồi bấm Kiểm tra.');
}

for (const kind of ['sheet','calendar']) {
  $(`${kind}-form`).addEventListener('submit', event => {
    event.preventDefault();
    const input = $(kind === 'sheet' ? 'sheet-url' : 'calendar-id');
    try { addSource(kind,input.value); input.value = ''; } catch(error) { notice(error.message,true); }
  });
}
$('list-calendars').addEventListener('click', async () => {
  const button = $('list-calendars'), current = getGeneration(), rev = ++revisions.list;
  button.disabled = true; button.textContent = 'Đang lấy danh sách…';
  try {
    const all = []; let next = '';
    do {
      const params = new URLSearchParams({maxResults:'250',fields:'items(id,summary,accessRole),nextPageToken'});
      if (next) params.set('pageToken',next);
      const page = await getGoogle(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`);
      all.push(...(page.items || [])); next = page.nextPageToken || '';
    } while(next);
    if (current !== getGeneration() || rev !== revisions.list) return;
    const container = $('calendar-choices'); container.replaceChildren();
    const available = all.filter(c => c.accessRole !== 'freeBusyReader');
    if (!available.length) { container.append(el('p','Tài khoản này chưa có lịch đọc được.')); return; }
    const label = el('label','Chọn lịch để thêm'); label.htmlFor = 'calendar-select';
    const select = el('select'); select.id = 'calendar-select';
    const placeholder = el('option','Chọn một lịch…'); placeholder.value = ''; select.append(placeholder);
    for (const c of available) { const option = el('option',c.summary || c.id); option.value = c.id; select.append(option); }
    select.addEventListener('change', () => { if (select.value) { try { addSource('calendar',select.value); } catch(error) { notice(error.message,true); } select.value = ''; } });
    container.append(label,select); notice('Đã lấy danh sách lịch. Chọn lịch cần kết nối.');
  } catch(error) { if (current === getGeneration()) notice(error.message,true); }
  finally { button.disabled = !connected(); button.textContent = 'Lấy danh sách lịch của tôi'; }
});

renderSources();
const diagnostics=el('details',undefined,'advanced');diagnostics.append(el('summary','Thông tin độ trễ'));
diagnostics.append(el('p','Số liệu chỉ gồm thời gian xử lý và số dòng; không kèm nội dung bảng hoặc thông tin tài khoản.','help'));
const show=el('button','Xem số liệu'),report=el('pre');report.hidden=true;
show.onclick=()=>{report.textContent=timingReport();report.hidden=false;};diagnostics.append(show,report);$('connections').append(diagnostics);
return {renderSources};
}
