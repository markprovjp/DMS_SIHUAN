/** Map trạng thái backend → tone AntD.
 *  Tone là 1 trong: "success" | "warning" | "danger" | "info" | "default"
 *  Dùng để render StatusTag nhất quán ở mọi màn hình. */
export const statusToTone = (
  s: string | null | undefined,
): "success" | "warning" | "danger" | "info" | "default" => {
  if (!s) return "default";
  const k = s.toUpperCase();
  const map: Record<
    string,
    "success" | "warning" | "danger" | "info" | "default"
  > = {
    // success
    COMPLETED: "success",
    SUCCESS: "success",
    ACTIVE: "success",
    APPROVED: "success",
    GOOD: "success",
    // info
    RUNNING: "info",
    PROCESSING: "info",
    // warning
    PENDING: "warning",
    LATE: "warning",
    WARNING: "warning",
    CHECK: "warning",
    // danger
    ERROR: "danger",
    FAILED: "danger",
    REJECTED: "danger",
    MISSING: "danger",
    ABNORMAL: "danger",
  };
  return map[k] ?? "default";
};

/** Lấy label tiếng Việt cho trạng thái, fallback về string gốc. */
export const statusToLabel = (s: string | null | undefined): string => {
  if (!s) return "—";
  const map: Record<string, string> = {
    COMPLETED: "Hoàn thành",
    RUNNING: "Đang chạy",
    PENDING: "Chờ xử lý",
    ERROR: "Lỗi",
    FAILED: "Thất bại",
    ACTIVE: "Đang hoạt động",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    MISSING: "Vắng",
    LATE: "Trễ",
    EARLY_LEAVE: "Về sớm",
    GOOD: "Tốt",
    CHECK: "Cần kiểm tra",
    ABNORMAL: "Bất thường",
  };
  return map[s.toUpperCase()] ?? s;
};
