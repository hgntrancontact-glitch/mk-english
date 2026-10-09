# Giữ phiên trong tab 0.6.0 — 09/10/2026

Không bổ sung backend. Lưu access token ngắn hạn trong sessionStorage, gắn Client ID và các quyền đã cấp, giữ nguyên mốc hết hạn từ lần đăng nhập. Tải lại trang khôi phục token còn hạn và tự mở ứng dụng. Hết hạn/401/đăng xuất xoá token. Nếu browser chặn sessionStorage, trang hiện tại vẫn dùng token trong RAM.

Nút Tiếp tục với Google dùng `prompt: ''`; chỉ Đổi tài khoản dùng `select_account`. Không tự gọi popup nền hoặc tự kéo dài quyền truy cập. [Google TokenClient](https://developers.google.com/identity/oauth2/web/reference/js-reference#TokenClientConfig).

25 unit tests; 20 nhóm browser kết nối/chuyển mục/khôi phục; 12 nhóm nhập liệu/CRM. Google giả lập, không thử ghi dữ liệu thật. Khôi phục phiên giúp tránh bước kết nối lại khi F5, không giảm thời gian đọc dữ liệu Google và không bảo đảm giữ đăng nhập sau khi đóng tab hoặc token hết hạn.

---

# Bố cục CRM 0.5.0 — 09/10/2026

Danh sách là vùng làm việc chính, có nhóm trạng thái, bộ lọc cục bộ, sắp xếp theo cột và chọn cột hiển thị. Hồ sơ/biểu mẫu mở cạnh danh sách; trên điện thoại dùng vùng nội dung riêng. Không dùng hộp thoại nhập liệu nổi giữa màn hình. Tách crm-model, panel, loading-view và entry-panel để chia trách nhiệm giao diện; tách file không tự giảm độ trễ Google.

Giữ cách đọc chung 8 bảng, cache dữ liệu/DOM và tìm kiếm Worker. Các bộ lọc, đổi cột, xem hồ sơ và chuyển lại bảng dùng dữ liệu trong phiên. Lần đầu hiển thị khung bảng và trạng thái đồng bộ nhỏ; đây là cải tiến trình bày khi chờ, không phải giảm thời gian API.

22 unit tests + 17 nhóm browser kết nối + 12 nhóm browser giao diện/nhập liệu PASS với Google giả lập, không có pageerror. Bao gồm lưu dữ liệu, bộ lọc/cột, hồ sơ đủ trường, bảo toàn bản nhập khi chuyển mục, mobile và thông báo có thể đóng. Đã kiểm tra ảnh desktop, hồ sơ, biểu mẫu, lịch và điện thoại. Chưa thử đăng nhập hoặc ghi Google thật.

Lượt thử cục bộ bảng nhỏ 2 dòng, cố ý trì hoãn batch Google 1 giây: chuyển đủ 8 mục sau batch đầu không tạo yêu cầu Google mới; thời gian trong trang gồm khung hình kế tiếp 2–43 ms. Không phải số đo Google thật hay cam kết cho dữ liệu lớn. Các số đo bên dưới là lịch sử.

---

# Giao diện và nhập liệu 0.4.0

Giữ cách đọc chung 8 bảng của 0.3.1. Bổ sung menu thu gọn, Arial và giao diện trắng/xám. Lịch dùng FullCalendar Standard, tải riêng; dữ liệu lịch tải theo khoảng đang xem, có phân trang API. Biểu mẫu chỉ lấy cấu trúc/ô chọn khi người dùng mở Nhập dữ liệu. Trước lưu, đọc lại các cột, dữ liệu liên kết và dòng trống; việc kiểm tra này có chi phí mạng nhưng không chạy ở mỗi lần chuyển mục.

20 unit tests + 17 nhóm browser kết nối/chuyển mục + 11 nhóm browser nhập liệu/giao diện PASS, không có pageerror. Bao gồm lưu lớp/học sinh rồi đọc lại, cột công thức không cho nhập, học phí và thu chi chung batch, chống bản ghi trùng, lịch ngày/tuần/tháng, thêm và sửa lịch với If-Match, menu đóng/mở và màn hình nhỏ. Tất cả dùng Google giả lập; chưa ghi thử Google thật. Có kiểm tra ảnh desktop, mobile, biểu mẫu và lịch tuần.

Thông tin triển khai API: [Sheets batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate), [Calendar events list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).

Các số đo 0.3.x bên dưới là kết quả lịch sử, không phải số đo hiệu năng mới cho 0.4.

---

# Chuyển mục trong bản 0.3.1

Bản 0.3.0 vẫn gửi một yêu cầu Google riêng khi mở lần đầu mỗi bảng. Tách JavaScript không loại bỏ thời gian chờ này.

Bản 0.3.1 đọc 8 bảng của nguồn được chọn trong một [yêu cầu Sheets batchGet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet), dùng thứ tự trả về được API bảo đảm để ghép đúng bảng. Lịch mặc định được chuẩn bị song song. Mã và DOM của bảng vẫn tải/dựng khi cần. Dữ liệu nguồn giữ trong RAM tới khi đăng xuất hoặc đổi cấu hình, tách riêng từng nguồn; tối đa 12 màn hình giữ DOM và bộ lọc. Nút Tải lại đọc mới riêng mục hiện tại.

Kiểm thử Chrome cục bộ: cố ý trì hoãn Sheets 1.000 ms, chuyển mục trong lúc lần tải đầu đang chạy, rồi mở đủ 8 bảng. Sau lần tải chung, không có thêm yêu cầu Google khi chuyển giữa 8 bảng. Trong lượt thử với bảng nhỏ 2 dòng × 6 cột, các lần chuyển đo trong trang gồm khung hình kế tiếp mất 3–30 ms. Đây là kiểm tra luồng chờ mạng với dữ liệu giả, không phải tốc độ Google thật hay cam kết cho bảng lớn.

12 unit tests và 17 nhóm browser mock đạt, không có lỗi JavaScript. Có kiểm tra tách nguồn, tải lại không bị bản dữ liệu cũ ghi đè, phản hồi đến sau đăng xuất, thiếu tab, lỗi quyền và thử lại sau lỗi mạng. Calendar chuẩn bị sớm bị lỗi không ngăn các bảng mở; khi chọn Lịch, ứng dụng thử tải lại.

Giới hạn: lần vào ứng dụng vẫn cần chờ Google; tải chung chuyển chi phí đọc các bảng về đầu phiên và có thể lâu hơn với nguồn lớn. Đổi sang nguồn chưa tải cũng cần mạng. Chưa đo phiên Google thật của chủ tài khoản. Thay đổi trực tiếp trong Google cần bấm Tải lại ở mục tương ứng; chưa có đồng bộ đẩy tức thời.

---

# Đo hiệu năng 0.2.1 và 0.3.0

Đo cục bộ ngày 08/10/2026 bằng Chrome headless, giả lập CPU chậm hơn 4 lần, dữ liệu 10.000 dòng × 35 cột. Google OAuth và API được mô phỏng. Không dùng dữ liệu học sinh thật.

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| JavaScript ứng dụng tải ở màn hình chào, chưa nén | 29.305 byte | 15.470 byte |
| Gõ đến khi có kết quả tìm kiếm, trung vị 5 truy vấn | 638,5 ms | 114,8 ms |
| Thời gian xử lý đồng bộ sự kiện gõ, trung vị | 634,7 ms | 0,1 ms |
| Quay lại bảng đã mở, gồm khung hình hiển thị | 111,3 ms | 33,7 ms |
| Lượt đọc Google khi quay lại bảng đã mở | 0 | 0 |
| Mở bảng lần đầu, đo từ thao tác của trình kiểm thử | 714 ms | 834 ms |

Lần tìm đầu tiên của bản mới mất 198 ms vì phải tạo chỉ mục. Các lần tiếp theo trong phép thử mất khoảng 99–115 ms. Khoảng đợi 80 ms khi gõ giúp tránh chạy lại tìm kiếm cho từng phím trong một chuỗi gõ nhanh.

Mã được tách để phần Cài đặt và Lịch không tải ở màn hình chào. Tìm kiếm bảng lớn chuyển sang Web Worker, chỉ mục chuẩn hoá một lần. Màn hình đã mở được giữ lại trong phiên thay vì dựng lại bảng; tối đa 6 màn hình được giữ để giới hạn bộ nhớ.

Các số liệu là một lượt so sánh có kiểm soát, không phải cam kết tốc độ trên mọi máy. Thời gian mở bảng lần đầu trong phép thử chưa cải thiện; tách mã có thêm lượt tải module lần đầu. Độ trễ API Google thật chưa được đo. Thao tác lọc và chuyển lại màn hình không cần chờ Google; lần đọc đầu và Tải lại vẫn phụ thuộc mạng và API.

## Kiểm chứng chức năng

6 unit tests và 15 nhóm kiểm thử trình duyệt đạt, gồm tải module khi cần, giữ DOM và bộ lọc, không gửi trùng yêu cầu khi đổi mục nhanh, chặn kết quả cũ ghi đè màn hình mới, xoá dữ liệu khi đăng xuất và xử lý phiên hết hạn.

Thông tin đo thực tế được giữ trong bộ nhớ phiên tại Cài đặt → Thông tin độ trễ. Báo cáo chỉ gồm tên giai đoạn, số dòng/cột và thời gian; không lưu token, ID nguồn, nội dung ô hoặc tiêu đề sự kiện.
