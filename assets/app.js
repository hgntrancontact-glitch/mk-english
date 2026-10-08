import {DEFAULT_CLIENT_ID, DEFAULT_ORIGIN, SCOPES, EXPECTED_TABS} from './config.js?v=0.2.1';
import {sheetId, calendarId, validClientId, readSettings, apiError, calendarWindow, importSetup} from './core.js?v=0.2.1';
import {createWorkspace} from './workspace.js?v=0.2.1';

const $ = id => document.getElementById(id);
const storageKey = `mk-english:${location.pathname}:connections:v1`;
const ownOrigin = location.origin === DEFAULT_ORIGIN || ['localhost','127.0.0.1'].includes(location.hostname);
const browserStorage = {getItem: key => localStorage.getItem(key)};
let settings = readSettings(browserStorage, storageKey, ownOrigin ? DEFAULT_CLIENT_ID : '');
let token = '', expires = 0, generation = 0, sdkReady = false, expiryTimer;
const activeReads = new Set();
const revisions = {sheet: 0, calendar: 0, list: 0};
const workspace = createWorkspace({getGoogle,getSettings:()=>settings,onSettings:showSettings,onError:message=>notice(message,true)});

// Consume the personal launch configuration before loading Google's script.
const setup = new URLSearchParams(location.hash.slice(1)).get('setup');
if (setup !== null) {
  history.replaceState(null,'',location.pathname+location.search);
  try { persist(importSetup(setup,settings)); }
  catch { notice('Chưa lưu được cấu hình khởi động. Bạn có thể thêm nguồn trong Cài đặt.',true); }
}

function showSettings() {
  workspace.leave();
  $('welcome').hidden=true;$('app-shell').hidden=false;$('data-screen').hidden=true;$('connections').hidden=false;
  $('breadcrumb').textContent='Cài đặt';
  document.querySelectorAll('[data-route]').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  $('settings-nav').classList.add('active');
}
function showWelcome() { $('welcome').hidden=false;$('app-shell').hidden=true; }
function enterWorkspace() { if(!connected()){showWelcome();return;} notice('');workspace.open('Lớp học'); }
$('welcome-settings').onclick=showSettings;
$('settings-nav').onclick=showSettings;
$('back-workspace').onclick=enterWorkspace;
$('sidebar-signout').onclick=()=>{disconnect();notice('');};

function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = `notice floating-notice${error ? ' error' : ''}`;
  $('notice').hidden = !message;
}
function persist(next) {
  try { localStorage.setItem(storageKey, JSON.stringify(next)); }
  catch { throw new Error('Trình duyệt không cho lưu cấu hình. Cho phép lưu dữ liệu trang web rồi thử lại.'); }
  settings = next;
  workspace.invalidate();
}
function connected() { return Boolean(token && Date.now() < expires); }
function refreshAuth() {
  const yes = connected();
  $('auth-badge').textContent = yes ? 'Đã kết nối Google' : 'Chưa kết nối';
  $('auth-badge').className = `badge${yes ? ' connected' : ''}`;
  $('disconnect').hidden = !yes;
  $('connect').textContent = yes ? 'Đổi tài khoản' : 'Kết nối Google';
  $('connect').disabled = !sdkReady;
  $('welcome-connect').disabled=!sdkReady;
  $('welcome-status').textContent=sdkReady?'Chọn tài khoản Google của bạn để tiếp tục.':'Đang chuẩn bị đăng nhập…';
  $('welcome-description').textContent=settings.sheets.length?'Nguồn dữ liệu đã sẵn sàng. Tiếp tục với Google để mở lớp học của bạn.':'Đăng nhập bằng tài khoản Google quản lý lớp học để bắt đầu.';
  document.querySelectorAll('[data-auth]').forEach(b => { b.disabled = !yes; });
  $('auth-status').textContent = yes ? 'Sẵn sàng kiểm tra nguồn dữ liệu' : sdkReady ? 'Đăng nhập để bắt đầu' : 'Chưa tải được dịch vụ đăng nhập';
}
function disconnect() {
  token = ''; expires = 0; generation++;
  clearTimeout(expiryTimer);
  for (const request of activeReads) request.abort();
  activeReads.clear();
  ['sheet-preview','calendar-preview','calendar-choices'].forEach(id => $(id).replaceChildren());
  workspace.clear();showWelcome();
  refreshAuth();
}

async function getGoogle(url) {
  const allowed = ['https://sheets.googleapis.com/', 'https://www.googleapis.com/calendar/v3/'];
  if (!allowed.some(prefix => url.startsWith(prefix))) throw new Error('Địa chỉ API không hợp lệ.');
  if (!connected()) { disconnect(); throw new Error('Bấm Kết nối Google trước khi kiểm tra nguồn dữ liệu.'); }
  const current = generation, controller = new AbortController();
  activeReads.add(controller);
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {headers: {Authorization: `Bearer ${token}`}, signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error'});
    const data = await response.json();
    if (generation !== current) throw new Error('Phiên kết nối đã thay đổi.');
    if (!response.ok) {
      if (response.status === 401) { disconnect(); notice(apiError(401,data),true); }
      throw new Error(apiError(response.status, data));
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Yêu cầu đã dừng hoặc Google phản hồi quá lâu. Bạn có thể thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được Google. Kiểm tra mạng hoặc tiện ích chặn kết nối trên trình duyệt.');
    throw error;
  } finally { clearTimeout(timeout); activeReads.delete(controller); }
}

function renderSources() {
  for (const [kind, ids] of [['sheet',settings.sheets],['calendar',settings.calendars]]) {
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
          persist({...settings,[key]:settings[key].filter(value => value !== id)});
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
  const rev = ++revisions[kind], session = generation;
  const start = performance.now();
  button.disabled = true; button.textContent = 'Đang kiểm tra…';
  const target = $(`${kind}-preview`); target.replaceChildren(el('p','Đang đọc trực tiếp từ Google…'));
  try {
    const result = await (kind === 'sheet' ? inspectSheet(id) : inspectCalendar(id));
    if (session !== generation || rev !== revisions[kind]) return;
    target.replaceChildren(result);
    target.append(el('p',`Lần đọc này: ${((performance.now()-start)/1000).toFixed(1)} giây · ${new Date().toLocaleTimeString('vi-VN')}`,'help'));
    notice('Đã đọc nguồn dữ liệu thành công.');
  } catch(error) {
    if (session !== generation || rev !== revisions[kind]) return;
    target.replaceChildren(el('p',error.message)); notice(error.message,true);
  } finally { button.textContent = 'Kiểm tra'; button.disabled = !connected(); }
}

function addSource(kind,value) {
  const id = kind === 'sheet' ? sheetId(value) : calendarId(value);
  const key = kind === 'sheet' ? 'sheets' : 'calendars';
  if (settings[key].includes(id)) { notice('Nguồn này đã có trong danh sách.'); return; }
  persist({...settings,[key]:[...settings[key],id]}); renderSources();
  notice(connected() ? 'Đã lưu nguồn. Bấm Kiểm tra để đọc dữ liệu.' : 'Đã lưu nguồn. Kết nối Google rồi bấm Kiểm tra.');
}

$('client-id').value = settings.clientId;
$('save-client').addEventListener('click', () => {
  try {
    const id = $('client-id').value.trim();
    if (!validClientId(id)) throw new Error('Client ID cần có đuôi .apps.googleusercontent.com.');
    persist({...settings,clientId:id}); disconnect();
    notice('Đã lưu cấu hình ứng dụng. Tiếp tục với Google để mở không gian.');
  } catch(error) { notice(error.message,true); }
});
$('disconnect').addEventListener('click', () => { disconnect(); notice('Đã kết thúc phiên trên trang này. Muốn thu hồi quyền đã cấp, mở mục Kết nối bên thứ ba trong tài khoản Google.'); });
for (const kind of ['sheet','calendar']) {
  $(`${kind}-form`).addEventListener('submit', event => {
    event.preventDefault();
    const input = $(kind === 'sheet' ? 'sheet-url' : 'calendar-id');
    try { addSource(kind,input.value); input.value = ''; } catch(error) { notice(error.message,true); }
  });
}
$('list-calendars').addEventListener('click', async () => {
  const button = $('list-calendars'), current = generation, rev = ++revisions.list;
  button.disabled = true; button.textContent = 'Đang lấy danh sách…';
  try {
    const all = []; let next = '';
    do {
      const params = new URLSearchParams({maxResults:'250',fields:'items(id,summary,accessRole),nextPageToken'});
      if (next) params.set('pageToken',next);
      const page = await getGoogle(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`);
      all.push(...(page.items || [])); next = page.nextPageToken || '';
    } while(next);
    if (current !== generation || rev !== revisions.list) return;
    const container = $('calendar-choices'); container.replaceChildren();
    const available = all.filter(c => c.accessRole !== 'freeBusyReader');
    if (!available.length) { container.append(el('p','Tài khoản này chưa có lịch đọc được.')); return; }
    const label = el('label','Chọn lịch để thêm'); label.htmlFor = 'calendar-select';
    const select = el('select'); select.id = 'calendar-select';
    const placeholder = el('option','Chọn một lịch…'); placeholder.value = ''; select.append(placeholder);
    for (const c of available) { const option = el('option',c.summary || c.id); option.value = c.id; select.append(option); }
    select.addEventListener('change', () => { if (select.value) { try { addSource('calendar',select.value); } catch(error) { notice(error.message,true); } select.value = ''; } });
    container.append(label,select); notice('Đã lấy danh sách lịch. Chọn lịch cần kết nối.');
  } catch(error) { if (current === generation) notice(error.message,true); }
  finally { button.disabled = !connected(); button.textContent = 'Lấy danh sách lịch của tôi'; }
});

function signIn() {
  if (!sdkReady) return;
  if (!validClientId(settings.clientId)) { notice('Mở Cấu hình ứng dụng Google và nhập Client ID của website này.',true); return; }
  disconnect(); notice('');
  const session = generation;
  const client = google.accounts.oauth2.initTokenClient({
    client_id:settings.clientId, scope:SCOPES.join(' '), include_granted_scopes:false,
    callback: response => {
      if (session !== generation) return;
      if (response.error || !response.access_token) { notice('Chưa được cấp quyền. Thử lại và kiểm tra email đã nằm trong Test users của ứng dụng.',true); refreshAuth(); return; }
      if (!google.accounts.oauth2.hasGrantedAllScopes(response,...SCOPES)) { notice('Bạn chưa cấp đủ quyền đọc Sheets và Calendar. Bấm Kết nối Google để chọn lại quyền.',true); refreshAuth(); return; }
      token = response.access_token; expires = Date.now() + Math.max(0,Number(response.expires_in || 3600)-30)*1000;
      expiryTimer = setTimeout(() => { disconnect(); notice('Phiên Google đã hết hạn. Bấm Kết nối Google để tiếp tục.',true); },Math.max(0,expires-Date.now()));
      refreshAuth();enterWorkspace();
    },
    error_callback: error => {
      if (session !== generation) return;
      notice(error.type === 'popup_closed' ? 'Bạn đã đóng cửa sổ đăng nhập. Có thể bấm Kết nối Google để thử lại.' : 'Không mở được cửa sổ Google. Cho phép cửa sổ bật lên cho website rồi thử lại.',true); refreshAuth();
    },
  });
  $('auth-status').textContent = 'Hoàn tất đăng nhập trong cửa sổ Google';
  $('welcome-status').textContent = 'Hoàn tất đăng nhập trong cửa sổ Google';
  client.requestAccessToken({prompt:'select_account'});
}
$('connect').addEventListener('click',signIn);
$('welcome-connect').addEventListener('click',signIn);

renderSources();
refreshAuth();
const script = document.createElement('script');
script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
const sdkTimeout = setTimeout(() => { if (!sdkReady) { refreshAuth(); notice('Chưa tải được dịch vụ đăng nhập Google. Kiểm tra mạng rồi tải lại trang.',true); } },15000);
script.onload = () => { clearTimeout(sdkTimeout); sdkReady = Boolean(window.google?.accounts?.oauth2); refreshAuth(); };
script.onerror = () => { clearTimeout(sdkTimeout); refreshAuth(); notice('Không tải được dịch vụ đăng nhập Google. Kiểm tra mạng hoặc trình chặn nội dung rồi tải lại trang.',true); };
document.head.append(script);
if (!settings.clientId) { $('client-id').closest('details').open = true; showSettings(); notice('Bản sao website này cần Client ID riêng. Nhập mã trong Cấu hình ứng dụng Google.',true); }
