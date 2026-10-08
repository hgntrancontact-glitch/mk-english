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
   - https://www.googleapis.com/auth/spreadsheets.readonly
   - https://www.googleapis.com/auth/calendar.events.readonly
   - https://www.googleapis.com/auth/calendar.calendarlist.readonly
7. Clients → Create client → Web application; tên MK English Web.
8. Authorized JavaScript origins: thêm https://hgntrancontact-glitch.github.io và http://localhost:5173. Không thêm /mk-english vào origin. Bản sao của người mua dùng domain của chính họ.
9. Với luồng token phía trình duyệt dự kiến, để trống Authorized redirect URIs. Nếu kiến trúc xác thực sau này thay đổi, phải cập nhật theo triển khai thực tế.
10. Create; lưu Client ID (đuôi apps.googleusercontent.com) để cấu hình ứng dụng. Client ID là mã định danh công khai; không gửi hoặc commit Client Secret, token, khóa service account.

Đây là các quyền đọc dành cho bản kiểm tra kết nối 0.1. Chức năng ghi dữ liệu sẽ cần cấp quyền bổ sung khi được triển khai. Kết nối Drive trong chat không tự cấp quyền cho website.

## Kiểm tra trên website

1. Mở website Pages, bấm Kết nối Google rồi chọn tài khoản trong danh sách Test users.
2. Dán link Sheet vào ô Google Sheets, bấm Lưu nguồn rồi Kiểm tra. Trang sẽ hiển thị tên file và tiêu đề các bảng đọc được.
3. Bấm Lấy danh sách lịch của tôi, chọn lịch rồi bấm Kiểm tra cạnh nguồn lịch. Trang hiển thị tối đa 30 sự kiện trong 7 ngày tới.
4. Có thể thêm nhiều nguồn. Bỏ nguồn chỉ bỏ cấu hình trên trình duyệt, không xoá file hoặc lịch Google.
5. Khi đóng hoặc tải lại trang, bấm Kết nối Google lại. Token không được lưu lâu dài; link/ID đã nhập vẫn có trong cấu hình.

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
