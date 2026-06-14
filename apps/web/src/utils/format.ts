// Format helpers — không phụ thuộc dayjs để tránh thêm dep.
// Luôn fallback về "—" khi value null/undefined/invalid.

const pad2 = (n: number) => n.toString().padStart(2, "0");

const safeDate = (v: unknown): Date | null => {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** Format ngày DD/MM/YYYY (mặc định) */
export const fmtDate = (v?: unknown): string => {
  const d = safeDate(v);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Format ngày + giờ DD/MM/YYYY HH:mm */
export const fmtDateTime = (v?: unknown): string => {
  const d = safeDate(v);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/** Format tiền VND có ký hiệu ₫ */
export const fmtVND = (n?: number | null): string =>
  n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n) + " ₫";

/** Format số có dấu phân cách hàng nghìn */
export const fmtNumber = (n?: number | null): string =>
  n == null ? "—" : new Intl.NumberFormat("vi-VN").format(n);

/** Format phần trăm (đầu vào 0-1, ra dạng "85.0%") */
export const fmtPercent = (n?: number | null, d = 1): string =>
  n == null ? "—" : `${(n * 100).toFixed(d)}%`;

/** Format điểm 0-10 (1 chữ số thập phân) */
export const fmtScore = (n?: number | null): string =>
  n == null ? "—" : n.toFixed(1);

/** Format thời gian HH:mm */
export const fmtTime = (v?: unknown): string => {
  const d = safeDate(v);
  if (!d) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
