export function sheetId(value) {
  const input = value.trim();
  if (/^[A-Za-z0-9_-]{15,}$/.test(input)) return input;
  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/|$)/);
    if (url.protocol === 'https:' && url.hostname === 'docs.google.com' && match) return match[1];
  } catch { /* handled below */ }
  throw new Error('Hãy nhập link Google Sheets dạng docs.google.com/spreadsheets/d/… hoặc ID file.');
}

export function calendarId(value) {
  const input = value.trim();
  if (input === 'primary' || /^[^\s/?#]+@[^\s/?#]+$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'calendar.google.com') throw new Error();
    let id = url.searchParams.get('src');
    if (!id && url.searchParams.get('cid')) {
      const encoded = url.searchParams.get('cid').replace(/-/g, '+').replace(/_/g, '/');
      id = atob(encoded);
    }
    if (id && (id === 'primary' || /^[^\s/?#]+@[^\s/?#]+$/.test(id))) return id;
  } catch { /* handled below */ }
  throw new Error('Link này chưa xác định được lịch. Chọn lịch từ danh sách, hoặc lấy ID trong Google Calendar → Cài đặt → Tích hợp lịch.');
}

export function validClientId(value) {
  return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value);
}

// Setup links carry source IDs in a URL fragment, which is not sent to the web host.
// Credentials, tokens and private data are never accepted by this importer.
export function importSetup(value,current) {
  if(value.length>8192)throw new Error('Cấu hình nguồn quá dài.');
  const data=JSON.parse(value);
  if(!Array.isArray(data.sheets)||!Array.isArray(data.calendars))throw new Error('Cấu hình nguồn không hợp lệ.');
  return {...current,
    sheets:[...new Set([...data.sheets.map(sheetId),...current.sheets])],
    calendars:[...new Set([...data.calendars.map(calendarId),...current.calendars])],
  };
}

export function readSettings(storage, key, defaultClientId) {
  try {
    const raw = JSON.parse(storage.getItem(key) || '{}');
    return {
      clientId: validClientId(raw.clientId || '') ? raw.clientId : defaultClientId,
      sheets: [...new Set((Array.isArray(raw.sheets) ? raw.sheets : []).filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{15,}$/.test(id)))],
      calendars: [...new Set((Array.isArray(raw.calendars) ? raw.calendars : []).filter(id => typeof id === 'string' && (id === 'primary' || /^[^\s/?#]+@[^\s/?#]+$/.test(id))))],
    };
  } catch { return {clientId: defaultClientId, sheets: [], calendars: []}; }
}

export function apiError(status, body) {
  const reasons = JSON.stringify(body?.error?.details || []) + JSON.stringify(body?.error?.errors || []);
  if (status === 401) return 'Phiên Google đã hết hạn. Bấm Kết nối Google để đăng nhập lại.';
  if (/SERVICE_DISABLED|accessNotConfigured/i.test(reasons)) return 'API chưa được bật. Vào Google Cloud → APIs & Services → Library, bật Google Sheets API và Google Calendar API.';
  if (status === 403) return 'Google chưa cho phép truy cập. Kiểm tra tài khoản có quyền mở nguồn này và đã cấp đủ quyền cho ứng dụng.';
  if (status === 404) return 'Không tìm thấy nguồn dữ liệu, hoặc tài khoản hiện tại chưa có quyền truy cập. Kiểm tra lại link/ID.';
  if (status === 429) return 'Google đang giới hạn lượt truy cập. Đợi một chút rồi thử lại.';
  return `Google trả về lỗi ${status}. Hãy thử lại hoặc kiểm tra cấu hình nguồn.`;
}

export function calendarWindow(now = new Date()) {
  // Calendar API uses RFC3339 timestamps; a rolling seven-day window avoids guessing the user's time zone.
  return {timeMin: now.toISOString(), timeMax: new Date(now.getTime() + 7 * 86400000).toISOString()};
}
