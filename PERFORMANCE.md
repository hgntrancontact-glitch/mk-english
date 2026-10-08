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
