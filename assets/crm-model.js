export const CRM={
  'Lớp học':{group:'Đào tạo',add:'Thêm lớp học',unit:'lớp',identity:['Lớp học','Mã nhóm lớp'],status:'Tình trạng',filters:['Tình trạng','Số buổi học'],columns:['Lớp học','Mã nhóm lớp','Tình trạng','Sĩ số','Số buổi học','Học phí','Ngày khai giảng'],description:'Theo dõi nhóm lớp, sĩ số và lịch khai giảng.'},
  'Học sinh':{group:'Đào tạo',add:'Thêm học sinh',unit:'học sinh',identity:['Họ tên','Mã học sinh'],status:'Tình trạng',filters:['Tình trạng','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Tình trạng','Lớp học','Mã nhóm lớp','Ngày nhập học','Zalo Phụ huynh'],description:'Hồ sơ học sinh, lớp đang theo học và thông tin liên hệ.'},
  'Thời khoá biểu':{group:'Đào tạo',add:'Thêm lịch',description:'Sắp xếp buổi học và quản lý lịch giảng dạy.'},
  'Điểm danh':{group:'Đào tạo',add:'Ghi điểm danh',unit:'bản ghi',identity:['Họ tên','Mã học sinh'],status:'Điểm danh',filters:['Điểm danh','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Ngày','Giờ bắt đầu','Điểm danh','Lớp học','Ghi chú/ hoặc Lý do'],description:'Theo dõi từng buổi học và tình trạng tham dự.'},
  'Đánh giá học tập':{group:'Đào tạo',add:'Thêm đánh giá',unit:'đánh giá',identity:['Họ tên','Mã học sinh'],status:'Hoàn tất',filters:['Hoàn tất','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Ngày','Hoàn tất','Mức độ tập trung','Mức độ tiếp thu bài','Báo cáo'],description:'Ghi nhận tiến bộ, bài tập và nhận xét học tập.'},
  'Điểm Trường':{group:'Đào tạo',add:'Thêm điểm',unit:'bản ghi',identity:['Họ tên','Mã học sinh'],status:'Loại kiểm tra',filters:['Loại kiểm tra','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Ngày','Loại kiểm tra','Số điểm','Đã thưởng','Ghi chú'],description:'Theo dõi kết quả kiểm tra và thành tích ở trường.'},
  'Học phí':{group:'Tài chính',add:'Ghi nhận học phí',unit:'khoản phí',identity:['Họ tên','Mã học sinh'],status:'Tình trạng',filters:['Tình trạng','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Tình trạng','Thời gian đóng phí','Học phí thực đóng','Thanh toán','Hoàn tất'],description:'Theo dõi kỳ phí và ghi nhận các khoản đã thu.'},
  'Quản lý Thu Chi':{group:'Tài chính',add:'Ghi thu chi',unit:'giao dịch',identity:['Họ tên','Mã học sinh'],status:'Nhóm',filters:['Nhóm','Thanh toán'],columns:['Ngày thu/chi','Họ tên','Nguồn thu','Số tiền thu','Nguồn chi','Số tiền chi','Thanh toán'],description:'Theo dõi giao dịch thu, chi và phương thức thanh toán.'},
  'Chăm sóc khách hàng':{group:'Chăm sóc',add:'Thêm chăm sóc',unit:'hồ sơ',identity:['Họ tên','Mã học sinh'],status:'Hoàn tất',filters:['Hoàn tất','Mã nhóm lớp'],columns:['Họ tên','Mã học sinh','Tình trạng','Đề xuất 1 - Thời gian chăm sóc','Đề xuất 2 - Thời gian chăm sóc','Hoàn tất','Ghi chú'],description:'Theo dõi các lần liên hệ và việc chăm sóc học sinh.'},
};
export function displayValue(value){
  if(value===true||value==='TRUE')return 'Có';if(value===false||value==='FALSE')return 'Chưa';
  if(value===undefined||value===null||value==='')return '—';
  return String(value).replace(/[\p{Extended_Pictographic}\uFE0F]/gu,'').trim();
}
export function visibleColumns(headers,name,all=false){
  if(all)return headers.map((_,i)=>i);
  const preferred=(CRM[name]?.columns||[]).map(h=>headers.indexOf(h)).filter(i=>i>=0);
  return preferred.length?preferred:headers.map((_,i)=>i).filter(i=>headers[i]!=='Stt').slice(0,7);
}
export function groupFields(names){
  const groups=new Map();
  for(const name of names){
    const group=/Zalo|Phụ [Hh]uynh|PH|giới thiệu|quan hệ|liên hệ|Tỉnh|Trường đang/.test(name)?'Liên hệ & gia đình':/phí|tiền|Thanh toán|Ưu đãi|Nguồn thu|Nguồn chi/.test(name)?'Thông tin thanh toán':/Ghi chú|Note|Lý do|Báo cáo|đánh giá|cảm nhận|Mục Tiêu|BTVN|Điểm|điểm|Tỷ lệ|Thái độ|Mức độ|Tương tác|Kiểm tra|Không gian|HS tự/.test(name)?'Ghi nhận & đánh giá':/Ngày|Thời gian|Giờ|Lịch/.test(name)?'Thời gian':'Thông tin chính';
    if(!groups.has(group))groups.set(group,[]);groups.get(group).push(name);
  }
  return groups;
}
export function compareCells(a,b){
  if(a===b)return 0;
  const date=v=>{const m=String(v??'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?Date.UTC(+m[3],+m[2]-1,+m[1]):null;};
  const da=date(a),db=date(b);if(da!==null&&db!==null)return da-db;
  const number=value=>{
    if(typeof value==='number')return value;
    const text=String(value??'').trim().replace(/\s*[đ₫]$/i,'').replace(/\s/g,'');
    if(/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(text))return Number(text.replaceAll('.','').replace(',','.'));
    if(/^-?\d+(?:[.,]\d+)?$/.test(text))return Number(text.replace(',','.'));
    return null;
  };
  const na=number(a),nb=number(b);if(na!==null&&nb!==null)return na-nb;
  return String(a??'').localeCompare(String(b??''),'vi',{numeric:true,sensitivity:'base'});
}
