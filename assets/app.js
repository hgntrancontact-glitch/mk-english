import {DEFAULT_CLIENT_ID,DEFAULT_ORIGIN,SCOPES} from './config.js?v=0.3.1';
import {validClientId,readSettings,apiError,importSetup} from './core.js?v=0.3.1';
import {$} from './dom.js?v=0.3.1';
import {recordTiming} from './timing.js?v=0.3.1';

const storageKey = `mk-english:${location.pathname}:connections:v1`;
const ownOrigin = location.origin === DEFAULT_ORIGIN || ['localhost','127.0.0.1'].includes(location.hostname);
const browserStorage = {getItem: key => localStorage.getItem(key)};
let settings = readSettings(browserStorage, storageKey, ownOrigin ? DEFAULT_CLIENT_ID : '');
let token = '', expires = 0, generation = 0, sdkReady = false, expiryTimer;
const activeReads = new Set();
let workspace, workspacePromise, settingsModule, settingsPromise;
let screenEpoch=0;
function loadWorkspace(){
  if(!workspacePromise) workspacePromise=import('./workspace.js?v=0.3.1').then(({createWorkspace})=>{workspace=createWorkspace({getGoogle,getSettings:()=>settings,onSettings:showSettings,onError:message=>notice(message,true)});return workspace;}).catch(error=>{workspacePromise=null;throw error;});
  return workspacePromise;
}
function loadSettings(){
  if(!settingsPromise) settingsPromise=import('./settings.js?v=0.3.1').then(({initSettings})=>{settingsModule=initSettings({getSettings:()=>settings,persist,connected,getGeneration:()=>generation,getGoogle,notice});return settingsModule;}).catch(error=>{settingsPromise=null;throw error;});
  return settingsPromise;
}

// Consume the personal launch configuration before loading Google's script.
const setup = new URLSearchParams(location.hash.slice(1)).get('setup');
if (setup !== null) {
  history.replaceState(null,'',location.pathname+location.search);
  try { persist(importSetup(setup,settings)); }
  catch { notice('Chưa lưu được cấu hình khởi động. Bạn có thể thêm nguồn trong Cài đặt.',true); }
}

function showSettings() {
  screenEpoch++;workspace?.leave();
  loadSettings().catch(()=>notice('Không tải được Cài đặt. Kiểm tra mạng rồi mở lại mục này.',true));
  $('welcome').hidden=true;$('app-shell').hidden=false;$('data-screen').hidden=true;$('connections').hidden=false;
  $('breadcrumb').textContent='Cài đặt';
  document.querySelectorAll('[data-route]').forEach(b=>{b.classList.remove('active');b.removeAttribute('aria-current');});
  $('settings-nav').classList.add('active');
}
function showWelcome() { screenEpoch++;$('welcome').hidden=false;$('app-shell').hidden=true; }
async function enterWorkspace() {
  if(!connected()){showWelcome();return;}
  const session=generation,view=++screenEpoch;notice('');
  $('welcome').hidden=true;$('app-shell').hidden=false;$('connections').hidden=true;$('data-screen').hidden=false;
  try {const work=await loadWorkspace();if(session===generation&&view===screenEpoch&&connected())work.open('Lớp học');}
  catch {if(session===generation&&view===screenEpoch)notice('Chưa tải được giao diện. Kiểm tra mạng rồi thử đăng nhập lại.',true);}
}
$('welcome-settings').onclick=showSettings;
$('settings-nav').onclick=showSettings;
$('back-workspace').onclick=enterWorkspace;
$('sidebar-signout').onclick=()=>{disconnect();notice('');};

function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = `notice floating-notice${error ? ' error' : ''}`;
  $('notice').hidden = !message;
}
function persist(next) {
  try { localStorage.setItem(storageKey, JSON.stringify(next)); }
  catch { throw new Error('Trình duyệt không cho lưu cấu hình. Cho phép lưu dữ liệu trang web rồi thử lại.'); }
  settings = next;
  workspace?.invalidate();
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
  workspace?.clear();showWelcome();
  refreshAuth();
}

async function getGoogle(url) {
  const allowed = ['https://sheets.googleapis.com/', 'https://www.googleapis.com/calendar/v3/'];
  if (!allowed.some(prefix => url.startsWith(prefix))) throw new Error('Địa chỉ API không hợp lệ.');
  if (!connected()) { disconnect(); throw new Error('Bấm Kết nối Google trước khi kiểm tra nguồn dữ liệu.'); }
  const current = generation, controller = new AbortController();
  activeReads.add(controller);
  const started=performance.now();let outcome='ok';
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {headers: {Authorization: `Bearer ${token}`}, signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error'});
    const data = await response.json();
    if (generation !== current) throw new Error('Phiên kết nối đã thay đổi.');
    if (!response.ok) {
      if (response.status === 401) { disconnect(); notice(apiError(401,data),true); }
      const error=new Error(apiError(response.status,data));error.status=response.status;throw error;
    }
    return data;
  } catch (error) {
    outcome='error';
    if (error.name === 'AbortError') throw new Error('Yêu cầu đã dừng hoặc Google phản hồi quá lâu. Bạn có thể thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được Google. Kiểm tra mạng hoặc tiện ích chặn kết nối trên trình duyệt.');
    throw error;
  } finally {recordTiming('google-read',performance.now()-started,{service:url.startsWith('https://sheets.')?'sheets':'calendar',outcome});clearTimeout(timeout);activeReads.delete(controller);}
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

function signIn() {
  if (!sdkReady) return;
  if (!validClientId(settings.clientId)) { notice('Mở Cấu hình ứng dụng Google và nhập Client ID của website này.',true); return; }
  disconnect(); notice('');
  loadWorkspace().catch(()=>{});
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

refreshAuth();
const script = document.createElement('script');
script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
const sdkTimeout = setTimeout(() => { if (!sdkReady) { refreshAuth(); notice('Chưa tải được dịch vụ đăng nhập Google. Kiểm tra mạng rồi tải lại trang.',true); } },15000);
script.onload = () => { clearTimeout(sdkTimeout); sdkReady = Boolean(window.google?.accounts?.oauth2); refreshAuth(); };
script.onerror = () => { clearTimeout(sdkTimeout); refreshAuth(); notice('Không tải được dịch vụ đăng nhập Google. Kiểm tra mạng hoặc trình chặn nội dung rồi tải lại trang.',true); };
document.head.append(script);
if (!settings.clientId) { $('client-id').closest('details').open = true; showSettings(); notice('Bản sao website này cần Client ID riêng. Nhập mã trong Cấu hình ứng dụng Google.',true); }
