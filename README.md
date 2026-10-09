# MK English

Website quản lý lớp học trên GitHub Pages, kết nối trực tiếp Google Sheets và Google Calendar.

## Bản 0.5.0

- Bố cục CRM toàn trang, Arial, nút chữ, menu trái chia Đào tạo / Tài chính / Chăm sóc và có thể đóng/mở.
- Danh sách có nhóm trạng thái, tìm kiếm, bộ lọc, sắp xếp theo cột và hai chế độ Gọn / Tất cả cột. Chọn một dòng mở hồ sơ đầy đủ bên phải.
- Xem và tìm kiếm 8 bảng. Đọc chung bảng khi vào ứng dụng; chuyển mục dùng dữ liệu trong phiên.
- Nút **Thêm lớp học**, **Thêm học sinh**, **Ghi nhận học phí**… mở khung nhập bên cạnh danh sách, theo tiêu đề cột và ô chọn thực tế của Sheet. Các cột công thức được tự giữ/copy sang dòng trống, không yêu cầu người dùng nhập lại.
- Kiểm tra mã lớp/học sinh liên kết và dữ liệu trùng trước khi ghi. Học phí xác nhận đã nhận tiền: ghi Học phí và Quản lý Thu Chi trong một yêu cầu batch.
- Thời khoá biểu có lưới **Ngày / Tuần / Tháng**, chuyển khoảng ngày, tìm kiếm, thêm lịch và sửa buổi đang chọn. Sửa lịch dùng ETag để phát hiện thay đổi đồng thời.
- Nhiều nguồn có thể cấu hình riêng trong Cài đặt. Dữ liệu và token chỉ nằm trong bộ nhớ phiên, không được đưa lên GitHub hay lưu localStorage.

## Sử dụng

1. Mở website → Tiếp tục với Google. Bản này yêu cầu quyền đọc/ghi Sheets và sự kiện Calendar; chọn đầy đủ quyền khi Google hỏi.
2. Chọn mục bên trái. **Đóng menu / Mở menu** thu gọn hoặc mở lại thanh bên.
3. Với bảng: tìm kiếm/lọc phía trên, bấm tiêu đề cột để sắp xếp. Bấm một dòng xem hồ sơ bên phải. Bấm nút thêm tương ứng, điền các trường bắt buộc, bấm **Lưu vào Google Sheets**. Dữ liệu được tải lại sau khi lưu. Riêng Học phí, lưu nghĩa là đã nhận tiền và đồng thời ghi Thu Chi.
4. Với lịch: chọn **Ngày, Tuần, Tháng** hoặc **Trước, Sau, Hôm nay**. Bấm **Thêm lịch** hoặc chọn khoảng trống để tạo lịch; bấm buổi có sẵn để chỉnh sửa buổi đó.
5. Khi đang nhập, hoàn tất hoặc bấm **Đóng** trước khi chuyển mục/nguồn. Trên điện thoại, hồ sơ/nhập liệu chiếm vùng nội dung; đóng để quay lại danh sách.
6. Khi sửa trực tiếp trong Google, bấm **Tải lại** ở mục tương ứng để nhận dữ liệu mới.

[Hướng dẫn cấu hình](THIET_LAP.md) · [Hiệu năng và kiểm thử](PERFORMANCE.md)

## Phạm vi và giới hạn hiện tại

- Nhập bảng hiện là **thêm bản ghi**; sửa/xoá bản ghi Sheets có sẵn vẫn làm trực tiếp trên Sheet. Chưa có báo cáo tổng hợp, tự đề xuất kỳ chăm sóc/thu phí, tạo điểm danh hàng loạt theo lịch hay menu GAS mới.
- Biểu mẫu sử dụng các dòng trống trong mẫu để giữ phạm vi công thức hiện có. Khi hết dòng trống, ứng dụng dừng trước khi ghi; cần bổ sung dòng và phạm vi công thức trong Sheet. Không tự đổi cấu trúc cột.
- Chống bấm lặp, kiểm tra trùng trước lưu, dấu giao dịch/dòng qua developer metadata trong cùng batch. Web Locks giới hạn các lần lưu cùng nguồn trên cùng trình duyệt. Dấu dòng/giao dịch duy nhất giúp các phiên web tránh cùng ghi vào một dòng. Đây không phải khoá toàn bộ Google Sheets: người đang sửa trực tiếp Sheet vẫn có thể thay đổi ô trong khoảng giữa lúc đọc và ghi. Không nên sửa cùng dòng đồng thời ở hai nơi.
- Calendar hiển thị theo múi giờ thiết bị; sửa lịch lặp áp dụng buổi đang chọn. Chưa chỉnh cả chuỗi, xoá lịch, kéo thả, khách mời hoặc Google Meet. Màu theo màu sự kiện nếu được đặt; màu lịch mặc định dùng xám, chưa lấy cấu hình màu riêng của Calendar.
- Lần vào đầu, đổi nguồn và tải lại cần chờ Google. Chưa có đồng bộ đẩy tức thời.
- Đã kiểm thử cục bộ với Google giả lập và kiểm tra hình ảnh. Chưa tự thực hiện ghi thử trên dữ liệu thật của chủ tài khoản.

## Kiểm thử và thư viện

`npm test` chạy 22 bài kiểm thử. Đã chạy thêm 17 nhóm kiểm thử kết nối/chuyển mục và 12 nhóm giao diện/nhập liệu với Google giả lập, không ghi dữ liệu thật.

FullCalendar Standard 6.1.19 được phục vụ từ `assets/vendor`, giấy phép MIT kèm tại [FULLCALENDAR_LICENSE.md](assets/vendor/FULLCALENDAR_LICENSE.md). Các phần lịch, biểu mẫu và cài đặt được chia module.

GitHub Pages dùng **Deploy from a branch → main → /(root)**. Không dùng GAS backend. Mỗi khách hàng sở hữu bản sao Sheet, Calendar, repository và cấu hình OAuth riêng; không đưa dữ liệu riêng, token hay Client Secret vào repository.
