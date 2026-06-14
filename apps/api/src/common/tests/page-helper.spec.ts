import { describe, test, expect } from "vitest";
import {
  getPageItems,
  getPageTotal,
  normalizePage,
  normalizePageResponse,
} from "@dms-admin/shared";

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
