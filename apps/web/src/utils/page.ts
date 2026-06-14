/**
 * Normalize các response shape khác nhau từ backend sang array + total.
 *
 * Backend hiện có 2 dạng:
 *  - Dạng cũ (legacy): array thuần — `/api/kpi`, `/api/inventory`, ...
 *  - Dạng mới (paginated): { items, total, page, pageSize }
 *
 * Helper này nhận bất kỳ, trả về { items, total } thống nhất.
 * Dùng nơi cần backward-compat (màn không dùng useTableQuery).
 */

interface PaginatedLike<T = unknown> {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface NormalizedPage<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function isPaginated(v: unknown): v is PaginatedLike {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Array.isArray((v as PaginatedLike).items)
  );
}

export function getPageItems<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isPaginated(payload)) return (payload.items ?? []) as T[];
  return [];
}

export function getPageTotal(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (isPaginated(payload)) {
    if (typeof payload.total === "number") return payload.total;
    // Fallback: nếu backend không trả total, dùng items.length để UI không
    // hiển thị "0 báo cáo" khi thực tế có data.
    return payload.items?.length ?? 0;
  }
  return 0;
}

export function normalizePage<T = unknown>(
  payload: unknown,
): NormalizedPage<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      total: payload.length,
      page: 1,
      pageSize: payload.length,
    };
  }
  if (isPaginated(payload)) {
    return {
      items: (payload.items ?? []) as T[],
      total: payload.total ?? payload.items?.length ?? 0,
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? payload.items?.length ?? 0,
    };
  }
  return { items: [], total: 0, page: 1, pageSize: 0 };
}

export function normalizePageResponse<T = any>(
  payload: any,
): { items: T[]; total: number } {
  if (!payload) return { items: [], total: 0 };
  if (Array.isArray(payload)) {
    return { items: payload, total: payload.length };
  }
  if (typeof payload === "object") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    const total =
      typeof payload.total === "number" ? payload.total : items.length;
    return { items, total };
  }
  return { items: [], total: 0 };
}
