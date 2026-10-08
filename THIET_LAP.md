# Thiết lập ban đầu

## GitHub Pages

Trong repository, mở Settings → Pages. Ở Build and deployment → Source, chọn Deploy from a branch → main → /(root), rồi Save. Đây là cách phát hành dự kiến cho bộ website tĩnh. Khi có mã website sẵn sàng, đẩy mã lên main sẽ cập nhật Pages. Hiện repository mới có tài liệu; chọn nguồn này chưa có nghĩa ứng dụng đã chạy.

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
9. Với luồng token phía trình duyệt dự kiến, để trống Authorized redirect URIs. Nếu kiến trúc xác thực sau này thay đổi, phải cập nhật theo triển khai thực tế.
10. Create; lưu Client ID (đuôi apps.googleusercontent.com) để cấu hình ứng dụng. Client ID là mã định danh công khai; không gửi hoặc commit Client Secret, token, khóa service account.

Đây là phần chuẩn bị quyền. Chưa có ứng dụng triển khai để thử đăng nhập. Khi ứng dụng sẵn sàng, người dùng đăng nhập Google và cấp quyền cho tài nguyên họ được phép truy cập. Kết nối Drive trong chat không tự cấp quyền cho website.

## Tài liệu chính thức

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://developers.google.com/workspace/guides/enable-apis
- https://developers.google.com/workspace/guides/configure-oauth-consent
- https://developers.google.com/workspace/guides/create-credentials
