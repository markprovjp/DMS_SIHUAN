# Tài liệu API (API Documentation)

Mọi yêu cầu API đến máy chủ có tiền tố mặc định là `/api`. Các endpoint yêu cầu Bearer JWT token ở header `Authorization: Bearer <token>` ngoại trừ đăng nhập.

---

## 1. Xác thực (Authentication)

### Đăng nhập hệ thống

- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "change_me"
  }
  ```
- **Response**: Trả về `access_token` JWT và thông tin tài khoản đăng nhập.

### Đăng xuất & Thông tin tài khoản

- `POST /api/auth/logout`: Đăng xuất.
- `GET /api/auth/me`: Trả về thông tin tài khoản hiện tại từ JWT token.

---

## 2. Cấu hình (Settings)

- `GET /api/settings`: Xem toàn bộ tham số cấu hình.
- `PATCH /api/settings`: Cập nhật cấu hình (múi giờ, giờ ca làm việc, hệ số điểm phạt, API keys).

---

## 3. Đồng bộ dữ liệu (Sync Center)

- `GET /api/mobiwork/endpoints`: Liệt kê danh sách các OpenAPI endpoints hỗ trợ.
- `POST /api/mobiwork/preview`: Lấy thử 5 bản ghi thô đầu tiên để kiểm tra kết nối API.
- `POST /api/sync/run`: Kích hoạt job chạy đồng bộ dữ liệu thực địa trong nền.
- `GET /api/sync/jobs`: Danh sách các tiến trình đồng bộ gần đây.
- `GET /api/sync/jobs/:id`: Trạng thái chi tiết và tiến độ xử lý của 1 job.

---

## 4. Chấm công & Phân tích chuyên cần (Timesheets)

- `GET /api/timesheet/summary`: Thống kê tổng hợp số lượt vi phạm (đi trễ, về sớm, thiếu checkin/checkout).
- `GET /api/timesheet/days`: Danh sách bảng công chuyên cần của nhân sự kèm điểm và đánh giá lỗi.
- `GET /api/timesheet/days/:id`: Xem chi tiết ngày công, bao gồm timeline các mốc checkin và lịch trình đi tuyến.
- `POST /api/timesheet/days/:id/evaluate`: Chạy tính toán lại điểm số chuyên cần của ngày công.
- `POST /api/timesheet/export`: Xuất dữ liệu bảng công chuyên cần ra file Excel.

---

## 5. Báo cáo Trợ lý AI (AI Management)

- `POST /api/ai/timesheet/analyze`: Gửi số liệu tổng hợp trong kỳ cho OpenAI và tạo báo cáo quản trị.
- `GET /api/ai/runs`: Danh sách báo cáo AI đã khởi lập.
- `POST /api/ai/runs/:id/approve`: Duyệt báo cáo AI để xuất bản chính thức.
