export const AI_TEXT_ANALYSIS_SYSTEM_PROMPT = `
Bạn là trợ lý phân tích quản trị DMS nội bộ chuyên nghiệp. Bạn chỉ diễn giải dữ liệu đã được rule-engine chấm điểm và thống kê sẵn. 
Không tự ý thay đổi điểm số chấm công của nhân viên. 
Không kết luận hành vi "gian lận" một cách chủ quan nếu chỉ có dữ liệu bất thường; hãy dùng ngôn ngữ quản trị trung tính như "cần kiểm tra", "cần đối soát", "có dấu hiệu bất thường". 
Trả về dữ liệu dưới dạng JSON khớp hoàn toàn với cấu trúc schema yêu cầu. 
Hãy viết bằng Tiếng Việt ngắn gọn, súc tích, rõ ràng và có ích cho các nhà quản lý doanh nghiệp.
`;

export const AI_TEXT_ANALYSIS_USER_PROMPT_TEMPLATE = (
  compactJsonData: string,
) => `
Hãy phân tích dữ liệu tổng hợp DMS sau đây và cung cấp báo cáo quản trị chi tiết dưới dạng JSON:

Dữ liệu đầu vào:
${compactJsonData}

Yêu cầu xuất đầu ra JSON phải tuân thủ cấu trúc TypeScript sau:
{
  "executiveSummary": "Tóm tắt ngắn gọn (2-3 câu) về tình hình chấm công, viếng thăm khách hàng, đơn hàng, KPI và kho trong kỳ.",
  "keyFindings": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện tổng quan",
      "evidence": "Bằng chứng số liệu cụ thể rút ra từ dữ liệu",
      "affectedEmployees": ["Mã nhân viên 1", "Mã nhân viên 2"],
      "affectedDepartments": ["Tên phòng ban 1"]
    }
  ],
  "recommendations": [
    {
      "priority": "low" | "medium" | "high",
      "action": "Hành động đề xuất",
      "ownerRole": "Vai trò chịu trách nhiệm",
      "dueHint": "Thời hạn gợi ý"
    }
  ],
  "employeeComments": [
    {
      "employeeCode": "Mã nhân viên",
      "comment": "Nhận xét phân tích riêng về nhân viên này dựa trên dữ liệu",
      "suggestedAction": "Hành động cụ thể đề xuất cho nhân viên này"
    }
  ],
  "dataQualityWarnings": [
    "Cảnh báo về chất lượng dữ liệu"
  ],
  "timesheetInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện mô-đun chấm công",
      "evidence": "Bằng chứng cụ thể mô-đun chấm công",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": [],
      "suggestedAction": "Hành động đề xuất xử lý chấm công"
    }
  ],
  "visitInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện mô-đun viếng thăm khách hàng",
      "evidence": "Bằng chứng cụ thể mô-đun viếng thăm",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": ["Mã khách hàng"],
      "suggestedAction": "Hành động đề xuất xử lý viếng thăm"
    }
  ],
  "orderInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện mô-đun đơn hàng",
      "evidence": "Bằng chứng cụ thể mô-đun đơn hàng",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": ["Mã khách hàng"],
      "suggestedAction": "Hành động đề xuất xử lý đơn hàng"
    }
  ],
  "kpiInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện mô-đun chỉ tiêu KPI",
      "evidence": "Bằng chứng cụ thể mô-đun KPI",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": [],
      "suggestedAction": "Hành động đề xuất xử lý chỉ tiêu KPI"
    }
  ],
  "inventoryInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện mô-đun tồn kho",
      "evidence": "Bằng chứng cụ thể mô-đun kho",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": [],
      "suggestedAction": "Hành động đề xuất xử lý tồn kho"
    }
  ],
  "crossModuleInsights": [
    {
      "severity": "info" | "warning" | "critical",
      "title": "Tiêu đề phát hiện liên kết chéo các mô-đun (ví dụ: Chấm công/Viếng thăm/Đơn hàng)",
      "evidence": "Bằng chứng số liệu liên kết chéo",
      "affectedEmployees": ["Mã nhân viên"],
      "affectedDepartments": ["Tên phòng ban"],
      "affectedCustomers": ["Mã khách hàng"],
      "suggestedAction": "Hành động đề xuất liên kết đa mô-đun"
    }
  ]
}
`;

export const AI_VISION_SYSTEM_PROMPT = `
Ban chi phan loai chat luong va tinh lien quan cua anh check-in cong viec. Khong nhan dien nguoi, khong doan danh tinh, khong so sanh khuon mat. Tra ve JSON dung schema.
`;

export const AI_VISION_USER_PROMPT_TEMPLATE = (context: {
  employeeCode?: string;
  date?: string;
  checkType?: string;
  locationText?: string;
}) => `
Hãy phân tích ảnh check-in thực địa được gửi kèm theo và phân loại dựa trên ngữ cảnh công việc sau:
- Mã nhân viên: ${context.employeeCode || "Không rõ"}
- Ngày thực hiện: ${context.date || "Không rõ"}
- Loại chấm công: ${context.checkType || "Không rõ"}
- Địa điểm đăng ký: ${context.locationText || "Không rõ"}

Yêu cầu xuất đầu ra JSON phải tuân thủ schema TypeScript sau:
{
  "classification": "VALID_WORK_CONTEXT" | "BLURRY_OR_UNCLEAR" | "UNRELATED_IMAGE" | "POSSIBLE_PRIVACY_RISK" | "NEEDS_HUMAN_REVIEW",
  "confidence": 0.0 đến 1.0 (mức độ tin cậy của phân loại),
  "reason": "Giải thích chi tiết lý do phân loại bằng tiếng Việt (ví dụ: Ảnh chụp rõ ràng kệ trưng bày sản phẩm của công ty tại cửa hàng tạp hóa).",
  "visibleIssues": [
    "Danh sách các lỗi nhìn thấy trong ảnh nếu có (ví dụ: Ảnh bị mờ, ảnh chụp trong phòng tối, ảnh chụp màn hình máy tính khác)"
  ],
  "suggestedAction": "Hành động đề xuất (ví dụ: Chấp nhận check-in hoặc Yêu cầu nhân viên chụp lại ảnh rõ hơn)"
}
`;

export * from "./schemas";
