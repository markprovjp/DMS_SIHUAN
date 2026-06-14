# Quy tắc chấm điểm chuyên cần của Rule Engine

Hệ thống sử dụng bộ quy tắc chấm điểm hoàn toàn tuyến tính và xác định (deterministic) thông qua thư viện `packages/rule-engine` để đảm bảo tính minh bạch, khách quan. **AI không tham gia vào việc chấm điểm hay quyết định hình thức xử lý kỉ luật của nhân sự.**

---

## 1. Công thức tính Điểm chuyên cần (Base Score: 100)

Điểm bắt đầu từ **100**. Các vi phạm sẽ bị trừ điểm theo hệ số cấu hình (mặc định):

### A. Thiếu dữ liệu Check-in/Check-out

- **Thiếu giờ vào (Missing Check-in)**: Trừ **35 điểm**.
- **Thiếu giờ ra (Missing Check-out)**: Trừ **35 điểm**.
- **Không có dữ liệu cả ngày**: Trở về **0 điểm** trực tiếp (Risk: `ABNORMAL`).

### B. Đi trễ & Về sớm

- **Đi trễ (LATE)**: Nếu chấm giờ vào sau giới hạn trễ cho phép (`lateAfter`, mặc định `08:15`):
  - Trừ **2 điểm** cho mỗi 5 phút trễ từ giờ bắt đầu ca (`08:00`).
  - Số điểm trừ tối đa: **20 điểm**.
- **Về sớm (EARLY_LEAVE)**: Nếu chấm giờ ra trước giờ kết thúc ca (`17:00`):
  - Trừ **2 điểm** cho mỗi 5 phút về sớm.
  - Số điểm trừ tối đa: **20 điểm**.

### C. Thiếu giờ làm việc trong ca (UNDER_HOURS)

- Nếu tổng số giờ làm việc (từ Check-in đầu đến Check-out cuối) ít hơn số giờ quy định tối thiểu (`minWorkHours`, mặc định `7.5h`):
  - Trừ **6 điểm** cho mỗi 1 giờ thiếu hụt.
  - Số điểm trừ tối đa: **25 điểm**.

### D. Hành vi chấm công bất thường

- **Chấm công quá nhiều lần (TOO_MANY_EVENTS)**: Trừ **10 điểm** nếu nhân viên chấm công trên 4 lần trong ngày.
- **Chấm trùng lặp cùng thời điểm (DUPLICATE_EVENT)**: Trừ **10 điểm** nếu có 2 sự kiện trùng loại và thời gian.

### E. Vi phạm đi tuyến (Visits)

- **Không viếng thăm khách hàng (NO_VISIT)**: Trừ **10 điểm** nếu ngày làm việc không ghi nhận lượt viếng thăm nào.
- **Tỷ lệ đúng tuyến thấp (LOW_ON_ROUTE_RATE)**: Trừ **10 điểm** nếu tỷ lệ viếng thăm đúng tuyến được chỉ định dưới **80%**.

---

## 2. Phân loại Cấp độ rủi ro chuyên cần (Risk Levels)

Hệ thống tự động phân loại chuyên cần của nhân sự theo 3 cấp độ:

- 🟢 **GOOD**: Điểm số từ **85 trở lên** và không vi phạm lỗi nghiêm trọng nào.
- 🟡 **CHECK**: Điểm số từ **60 đến 84** hoặc có vi phạm một phần dữ liệu cần đối soát giải trình (ví dụ: thiếu 1 đầu chấm công).
- 🔴 **ABNORMAL**: Điểm số **dưới 60** hoặc thiếu cả giờ vào lẫn giờ ra. Cần người quản lý trực tiếp can thiệp và xử lý phê duyệt thủ công.
