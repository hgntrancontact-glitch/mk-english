# mk-english
Ứng dụng quản lý lớp tiếng Anh

## Trạng thái

Đã có trang **Cài đặt kết nối** chạy trên GitHub Pages: đăng nhập Google, lưu nhiều nguồn Sheets/Calendar, kiểm tra tiêu đề của 8 bảng và xem tối đa 30 sự kiện trong 7 ngày tới. Không cần GAS cho phần đọc dữ liệu.

Đây là bản kiểm tra kết nối 0.1, **chưa phải ứng dụng quản lý hoàn chỉnh**. Chưa có nhập/sửa, điểm danh, thu phí, chăm sóc, báo cáo hoặc menu Sheets mới. Đã kiểm thử cục bộ với OAuth/API giả lập; chưa xác nhận đăng nhập thật của chủ tài khoản.

## Mở và thử kết nối

1. Bật Pages: Settings → Pages → Deploy from a branch → main → /(root) → Save.
2. Mở địa chỉ Pages của repository → Kết nối Google → chọn tài khoản đã thêm vào Test users.
3. Google Sheets: dán link → Lưu nguồn → Kiểm tra.
4. Calendar: Lấy danh sách lịch của tôi → chọn lịch → Kiểm tra.

Website chỉ yêu cầu quyền đọc trong bản này. Token chỉ ở bộ nhớ phiên; tải lại trang cần kết nối lại. Link/ID nguồn được lưu riêng trên trình duyệt; dữ liệu học sinh và nội dung lịch không được lưu lên GitHub.

## Kiểm thử

`npm test` chạy 5 kiểm thử bộ xử lý link, cấu hình, lỗi API và khoảng lịch. Không cần cài dependency. Kiểm thử trình duyệt cục bộ bổ sung đã chạy 9 nhóm với Google giả lập; các kết quả này không đo độ trễ Google thật.

## Hướng triển khai

- GitHub Pages phục vụ giao diện web.
- Google Sheets và Google Calendar giữ dữ liệu nguồn, truy cập qua quyền Google của người dùng.
- Cấu hình file/lịch trong ứng dụng; không đưa dữ liệu học sinh, token hoặc khóa bí mật vào repository.
- Đọc [hướng dẫn thiết lập](THIET_LAP.md) trước khi kết nối.
