# Thiết lập ban đầu

## GitHub Pages

Trong repository, mở Settings → Pages. Ở Build and deployment → Source, chọn Deploy from a branch → main → /(root), rồi Save. Website tĩnh nằm ngay ở gốc repository, không cần build. Đẩy mã lên main sẽ cập nhật Pages khi nguồn xuất bản này đã được bật.

Không cần GitHub Pro cho repository Public.

## Google Cloud

Mỗi người mua sở hữu Sheet, Calendar, repository và website riêng. Phần kết nối dữ liệu của website dùng Google API trực tiếp, không dùng GAS. Mỗi website độc lập cần cấu hình OAuth phù hợp với địa chỉ của mình. Cloud Console chỉ dùng lúc thiết lập; người dùng sử dụng website sẽ đăng nhập Google, cấp quyền rồi nhập link Sheet/Calendar.

1. Đăng nhập https://console.cloud.google.com/ bằng tài khoản quản lý Sheets/Calendar.
2. Tạo project tên MK English Web và chọn project này.
3. APIs & Services → Library: bật Google Sheets API và Google Calendar API.
4. Google Auth Platform → Branding → Get started (nếu chưa cấu hình): app name MK English, support/contact email của chủ ứng dụng; Audience External nếu dùng Gmail cá nhân.
5. Audience → Test users → Add users: thêm email sẽ dùng thử. Giữ Testing trong giai đoạn kiểm thử; việc phát hành cho người mua cần hướng dẫn cấu hình và xét duyệt riêng khi phù hợp.
6. Data Access → Add or remove scopes: khai báo các phạm vi ứng dụng sử dụng:
   - https://www.googleapis.com/auth/spreadsheets
   - https://www.googleapis.com/auth/calendar.events
   - https://www.googleapis.com/auth/calendar.calendarlist.readonly
7. Clients → Create client → Web application; tên MK English Web.
8. Authorized JavaScript origins: thêm https://hgntrancontact-glitch.github.io và http://localhost:5173. Không thêm /mk-english vào origin. Bản sao của người mua dùng domain của chính họ.
9. Với luồng token phía trình duyệt hiện tại, để trống Authorized redirect URIs. Nếu kiến trúc xác thực sau này thay đổi, phải cập nhật theo triển khai thực tế.
10. Create; lưu Client ID (đuôi apps.googleusercontent.com) để cấu hình ứng dụng. Client ID là mã định danh công khai; không gửi hoặc commit Client Secret, token, khóa service account.

Bản 0.6 có nhập dữ liệu và chỉnh lịch nên yêu cầu quyền đọc/ghi Sheets và sự kiện Calendar. Khi nâng cấp từ 0.3, đăng nhập lại và đồng ý các quyền mới trong cửa sổ Google. Kết nối Drive trong chat không tự cấp quyền cho website. Bản này giữ access token trong sessionStorage để tải lại cùng tab không phải kết nối lại khi token còn hạn; không cần Cloudflare, backend, Client Secret hoặc redirect URI mới.

## Kiểm tra trên website

1. Mở website Pages, bấm Tiếp tục với Google rồi chọn tài khoản trong danh sách Test users. Nếu đã lưu nguồn hoặc mở link khởi động có cấu hình sẵn, ứng dụng tự mở bảng Lớp học.
2. Chỉ khi chưa có nguồn: vào Cài đặt, dán link Sheet vào ô Google Sheets rồi bấm Lưu nguồn.
3. Trong Cài đặt, bấm Lấy danh sách lịch của tôi rồi chọn lịch. Bấm Về lớp học và sử dụng các mục bên trái. Không cần bấm Kiểm tra nguồn để sử dụng; nút đó chỉ dành cho việc chẩn đoán trong Cài đặt.
4. Có thể thêm nhiều nguồn. Bỏ nguồn chỉ bỏ cấu hình trên trình duyệt, không xoá file hoặc lịch Google.
5. Khi đóng hoặc tải lại trang, bấm Tiếp tục với Google. Token không được lưu lâu dài; link/ID đã nhập vẫn có trong cấu hình. Khi xem bảng, tìm kiếm và chuyển lại mục đã mở không gửi thêm lượt đọc; nút Tải lại lấy dữ liệu mới từ Google.

Người mua có địa chỉ Pages khác phải mở Cấu hình ứng dụng Google trên website và nhập Client ID của chính mình; trang không tự dùng Client ID MK trên tên miền khác. Không tải Client secret lên GitHub.

## Khi không kết nối được

- Google báo tài khoản chưa được phép: kiểm tra Audience → Test users, thêm đúng email đang chọn.
- Google báo origin không hợp lệ: kiểm tra Authorized JavaScript origins là https://TÊN-TÀI-KHOẢN.github.io, không có đường dẫn repository.
- Trang báo API chưa bật: bật Google Sheets API và Google Calendar API trong đúng dự án chứa Client ID.
- Đọc file/lịch bị từ chối: mở trực tiếp nguồn đó bằng cùng tài khoản để kiểm tra quyền.
- Cấu hình Google mới thay đổi có thể cần thời gian có hiệu lực, theo thông báo của Google.

## Tài liệu chính thức

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://developers.google.com/workspace/guides/enable-apis
- https://developers.google.com/workspace/guides/configure-oauth-consent
- https://developers.google.com/workspace/guides/create-credentials
