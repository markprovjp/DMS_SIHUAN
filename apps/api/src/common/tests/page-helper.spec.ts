/**
 * Test logic của page.ts helper mà KHÔNG import trực tiếp file TS từ apps/web
 * (vitest của api không resolve TS ngoài workspace của nó).
 *
 * Helper page.ts là pure logic, không có React/Node deps nên test bằng cách
 * mirror logic ở đây; nếu helper đổi behavior, chỗ này sẽ diverge. Đây là
 * trade-off giữa test coverage và setup cost cho monorepo. Helper nên được
 * move sang shared/ nếu muốn test từ cả 2 phía.
 *
 * (Logic copy y nguyên từ apps/web/src/utils/page.ts)
 */

interface PaginatedLike<T = unknown> {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface NormalizedPage<T = unknown> {
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

function getPageItems<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (isPaginated(payload)) return (payload.items ?? []) as T[];
  return [];
}

function getPageTotal(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (isPaginated(payload)) {
    if (typeof payload.total === "number") return payload.total;
    return payload.items?.length ?? 0;
  }
  return 0;
}

function normalizePage<T = unknown>(payload: unknown): NormalizedPage<T> {
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

function normalizePageResponse<T = any>(
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

import { describe, test, expect } from "vitest";

describe("page helper - normalize paginated response", () => {
  test("array input returns same array", () => {
    const arr = [{ id: 1 }, { id: 2 }];
    expect(getPageItems(arr)).toEqual(arr);
    expect(getPageTotal(arr)).toBe(2);
    const norm = normalizePage(arr);
    expect(norm.items).toEqual(arr);
    expect(norm.total).toBe(2);
  });

  test("paginated {items,total,page,pageSize} returns items + total", () => {
    const payload = {
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 42,
      page: 2,
      pageSize: 3,
    };
    expect(getPageItems(payload)).toEqual(payload.items);
    expect(getPageTotal(payload)).toBe(42);
    const norm = normalizePage(payload);
    expect(norm.items).toEqual(payload.items);
    expect(norm.total).toBe(42);
    expect(norm.page).toBe(2);
    expect(norm.pageSize).toBe(3);
  });

  test("paginated with no total field falls back to items length", () => {
    const payload = { items: [{ id: 1 }, { id: 2 }] };
    expect(getPageItems(payload)).toEqual([{ id: 1 }, { id: 2 }]);
    expect(getPageTotal(payload)).toBe(2);
  });

  test("null returns empty array", () => {
    expect(getPageItems(null)).toEqual([]);
    expect(getPageTotal(null)).toBe(0);
    expect(normalizePage(null).items).toEqual([]);
  });

  test("undefined returns empty array", () => {
    expect(getPageItems(undefined)).toEqual([]);
    expect(getPageTotal(undefined)).toBe(0);
    expect(normalizePage(undefined).items).toEqual([]);
  });

  test("empty array is preserved (not confused with undefined)", () => {
    expect(getPageItems([])).toEqual([]);
    expect(getPageTotal([])).toBe(0);
  });

  test("object with non-array items field is treated as empty", () => {
    const payload = { items: "not-array" } as unknown;
    expect(getPageItems(payload)).toEqual([]);
  });

  test("Dashboard parse path: items[0] from paginated AI runs", () => {
    const aiRes = { data: { items: [{ id: "r1", status: "DONE" }], total: 1 } };
    const items = getPageItems<{ id: string; status: string }>(aiRes.data);
    expect(items[0]?.id).toBe("r1");
    expect(items[0]?.status).toBe("DONE");
  });

  test("Dashboard parse path: critical days from paginated timesheet/days", () => {
    const daysRes = {
      data: {
        items: [
          { date: "2026-06-01", risk: "ABNORMAL" },
          { date: "2026-06-02", risk: "ABNORMAL" },
        ],
        total: 12,
      },
    };
    const items = getPageItems<{ date: string; risk: string }>(daysRes.data);
    const top5 = items.slice(0, 5);
    expect(top5).toHaveLength(2);
    expect(top5[0].date).toBe("2026-06-01");
  });

  test("normalizePageResponse helper tests", () => {
    expect(normalizePageResponse(null)).toEqual({ items: [], total: 0 });
    expect(normalizePageResponse(undefined)).toEqual({ items: [], total: 0 });
    expect(normalizePageResponse([])).toEqual({ items: [], total: 0 });
    expect(normalizePageResponse([{ id: 1 }])).toEqual({
      items: [{ id: 1 }],
      total: 1,
    });
    expect(normalizePageResponse({ items: [{ id: 1 }], total: 10 })).toEqual({
      items: [{ id: 1 }],
      total: 10,
    });
    expect(normalizePageResponse({ items: "not-array" })).toEqual({
      items: [],
      total: 0,
    });
  });
});
