# mk-english
Ứng dụng quản lý lớp tiếng Anh

## Trạng thái

Đã có màn hình chào và **Tiếp tục với Google**, tự mở Lớp học sau khi đăng nhập với nguồn đã lưu. Sidebar xem 8 bảng và lịch trong 7 ngày tới, tìm kiếm cục bộ, phân trang bảng 50 dòng và bộ nhớ đệm trong phiên. Cài đặt riêng cho việc đổi/thêm nguồn Sheets và Calendar. Không cần GAS cho phần đọc dữ liệu.

Đây là bản xem dữ liệu 0.3.1, **chưa phải ứng dụng quản lý hoàn chỉnh**. Có xem các bảng Điểm danh/Học phí/Chăm sóc; chưa có thao tác ghi, tạo điểm danh, thu phí, chăm sóc, báo cáo hoặc menu Sheets mới. Calendar hiện là danh sách 7 ngày, tối đa 250 sự kiện; chưa có lưới lịch chỉnh sửa. Đã kiểm thử cục bộ với OAuth/API giả lập; chưa xác nhận đăng nhập thật của chủ tài khoản.

## Mở và thử kết nối

1. Bật Pages: Settings → Pages → Deploy from a branch → main → /(root) → Save.
2. Mở địa chỉ Pages của repository → Tiếp tục với Google → chọn tài khoản đã thêm vào Test users. Nếu đã lưu nguồn, ứng dụng tự mở dữ liệu; không cần kiểm tra từng nguồn.
3. Nếu chưa có nguồn, vào Cài đặt → Google Sheets: dán link → Lưu nguồn. Calendar: Lấy danh sách lịch của tôi → chọn lịch.
4. Bấm Về lớp học. Những lần sau chỉ cần đăng nhập, nguồn đã lưu được dùng tự động. Chọn Tải lại để lấy các chỉnh sửa trực tiếp từ Google.

Bộ bàn giao có thể kèm link khởi động riêng với cấu hình nguồn trong fragment `#setup=`. Ứng dụng lưu cấu hình trên trình duyệt rồi xoá fragment trước khi tải dịch vụ đăng nhập. Không đưa ID nguồn riêng hoặc link khởi động vào repository công khai. Cấu hình này không chứa token và không thay thế quyền Google.

Website chỉ yêu cầu quyền đọc trong bản này. Token chỉ ở bộ nhớ phiên; tải lại trang cần kết nối lại. Link/ID nguồn được lưu riêng trên trình duyệt; dữ liệu học sinh và nội dung lịch không được lưu lên GitHub.

## Kiểm thử

`npm test` chạy 12 kiểm thử bộ xử lý link, cấu hình, lỗi API, khoảng lịch và bộ nhớ dữ liệu trong phiên. Không cần cài dependency. Kiểm thử trình duyệt cục bộ bổ sung đã chạy 17 nhóm với Google giả lập, gồm mở dữ liệu tự động, bộ nhớ đệm, hết phiên và phản hồi đến sau đăng xuất; các kết quả này không đo độ trễ Google thật.

## Hướng triển khai

- GitHub Pages phục vụ giao diện web.
- Google Sheets và Google Calendar giữ dữ liệu nguồn, truy cập qua quyền Google của người dùng.
- Cấu hình file/lịch trong ứng dụng; không đưa dữ liệu học sinh, token hoặc khóa bí mật vào repository.
- Đọc [hướng dẫn thiết lập](THIET_LAP.md) trước khi kết nối.

## Hiệu năng 0.3.1

- Cài đặt, bảng và lịch chỉ tải mã khi cần.
- Đọc chung 8 bảng của nguồn đang chọn bằng một yêu cầu Sheets khi vào ứng dụng; chuẩn bị lịch mặc định song song. Chuyển mục dùng dữ liệu trong phiên, kể cả mục chưa từng mở. Nguồn khác tải khi bạn chọn nguồn đó.
- Giữ tối đa 12 màn hình đã mở trong phiên; khi quay lại giữ bộ lọc, trang hiện tại và vị trí cuộn. Dữ liệu bảng vẫn được giữ trong phiên khi một màn hình bị loại khỏi bộ nhớ giao diện. Tải lại lấy dữ liệu mới riêng cho mục đang mở; đăng xuất xoá bộ nhớ dữ liệu. Nếu nguồn thiếu hoặc đổi tên tab, ứng dụng thử đọc từng bảng còn hợp lệ.
- Bảng lớn tạo chỉ mục tìm kiếm trong Web Worker; bảng nhỏ lập chỉ mục một lần. Chỉ cập nhật phần thân bảng, giữ nguyên tiêu đề.
- Trong Cài đặt → Thông tin độ trễ → Xem số liệu có thời gian chờ Google và xử lý giao diện, không có nội dung dữ liệu hay ID nguồn.
- Xem [kết quả đo cục bộ](PERFORMANCE.md). Chưa có số đo Google thật trong tài khoản chủ sở hữu.
