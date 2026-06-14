# Chính sách Quyền riêng tư & Bảo vệ Dữ liệu (Privacy Notice)

Hệ thống quản trị chuyên cần DMS AI Admin tuân thủ nghiêm ngặt các tiêu chuẩn về bảo mật thông tin và quyền riêng tư của nhân viên thực địa.

---

## 1. Giới hạn Phạm vi Hoạt động của AI Trợ lý & Vision

- **Không nhận diện khuôn mặt**: Mô-đun AI Vision chỉ phân loại tính hợp lệ và chất lượng hình ảnh check-in thực tế tại điểm bán hàng (ví dụ: xác minh ảnh chụp quầy kệ sản phẩm, biển hiệu cửa hàng thay vì ảnh chụp cá nhân). Hệ thống **không** thực hiện nhận diện khuôn mặt hay sinh trắc học.
- **Không đưa ra phán quyết tự động**: Báo cáo nhận định của AI chỉ mang tính chất tham khảo, hỗ trợ quản lý phân tích dữ liệu nhanh chóng. Mọi hình thức phê duyệt kỷ luật hay xếp hạng thi đua chuyên cần phải do con người phê duyệt thủ công.
- **Mã hóa thông tin nhạy cảm**: AI chỉ nhận dữ liệu đã được làm sạch và thu gọn (mã nhân viên, mã phòng ban) nhằm giảm thiểu tối đa việc rò rỉ thông tin cá nhân.

---

## 2. Lưu trữ & Quản lý Khóa API

- Khóa bảo mật API của OpenAI và Mobiwork OpenAPI chỉ được lưu trữ phía Máy chủ (Server-side) thông qua file cấu hình môi trường bảo mật (`.env` / bảng Setting). Không truyền khóa bảo mật về phía giao diện người dùng (Browser/Client-side).
- Có cơ chế ghi nhật ký hệ thống (Audit Logs) cho mọi hành động liên quan tới đồng bộ dữ liệu, chạy phân tích trợ lý AI hoặc truy vấn hình ảnh thực địa.
