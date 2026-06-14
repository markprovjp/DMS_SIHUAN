import { describe, test, expect, vi } from "vitest";
import { TimesheetNormalizer } from "../normalizers/timesheet.normalizer";
import { VisitNormalizer } from "../normalizers/visit.normalizer";

describe("Sync Normalizers Idempotency and Master Data Stubs", () => {
  test("TimesheetNormalizer automatically creates Employee stub when missing", async () => {
    const mockEmployeeFindUnique = vi.fn().mockResolvedValue(null); // Missing employee
    const mockEmployeeCreate = vi
      .fn()
      .mockResolvedValue({ id: "emp-stub-id", code: "NV001" });
    const mockTimesheetDayUpsert = vi.fn().mockResolvedValue({ id: "day-id" });
    const mockTimesheetEventUpsert = vi.fn().mockResolvedValue({});
    const mockSettingsService = {
      getAll: vi.fn().mockResolvedValue({
        shiftStart: "08:00",
        lateAfter: "08:15",
        shiftEnd: "17:00",
        minWorkHours: "7.5",
        timezone: "Asia/Bangkok",
      }),
    };

    const mockPrisma: any = {
      employee: {
        findUnique: mockEmployeeFindUnique,
        create: mockEmployeeCreate,
      },
      timesheetDay: {
        findUnique: vi.fn().mockResolvedValue({
          id: "day-id",
          date: new Date("2026-06-14T00:00:00.000Z"),
          employee: { id: "emp-stub-id", code: "NV001" },
          events: [],
        }),
        upsert: mockTimesheetDayUpsert,
      },
      timesheetEvent: {
        upsert: mockTimesheetEventUpsert,
      },
      timesheetEvaluation: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      visit: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const normalizer = new TimesheetNormalizer(mockSettingsService);

    // Sample Timesheet record with 1 check-in event
    const record = {
      ma_nv: "NV001",
      ten_nv: "Nguyen Van A",
      day_1: {
        ngay: "14/06/2026",
        thu: "Chủ Nhật",
        data_cc: [{ loai: "Vào", thoi_gian: "08:00", dia_diem: "Văn phòng" }],
      },
    };

    await normalizer.normalize(record, "job-123", mockPrisma);

    // Verify Employee stub was created
    expect(mockEmployeeFindUnique).toHaveBeenCalledWith({
      where: { code: "NV001" },
    });
    expect(mockEmployeeCreate).toHaveBeenCalledWith({
      data: {
        code: "NV001",
        name: "Nguyen Van A",
        isStub: true,
      },
    });

    // Verify TimesheetDay was upserted (idempotency check)
    expect(mockTimesheetDayUpsert).toHaveBeenCalled();
    expect(mockTimesheetEventUpsert).toHaveBeenCalled();
  });

  test("VisitNormalizer automatically creates Customer stub when missing", async () => {
    const mockEmployeeFindUnique = vi
      .fn()
      .mockResolvedValue({ id: "emp-id", code: "NV001" });
    const mockCustomerFindUnique = vi.fn().mockResolvedValue(null); // Missing customer
    const mockCustomerCreate = vi
      .fn()
      .mockResolvedValue({ id: "cust-stub-id", code: "KH001" });
    const mockVisitUpsert = vi.fn().mockResolvedValue({});

    const mockPrisma: any = {
      employee: {
        findUnique: mockEmployeeFindUnique,
      },
      customer: {
        findUnique: mockCustomerFindUnique,
        create: mockCustomerCreate,
      },
      visit: {
        upsert: mockVisitUpsert,
        count: vi.fn().mockResolvedValue(0),
      },
    };

    const normalizer = new VisitNormalizer();

    // Sample Visit record
    const record = {
      ma_nv: "NV001",
      thoi_gian_vt: [
        {
          ma_kh: "KH001",
          ten_kh: "Tap Hoa B",
          ngay: "14/06/2026",
          checkin: "09:00",
          checkout: "09:30",
          dia_chi: "Hanoi",
          dung_tuyen: "Có",
        },
      ],
    };

    await normalizer.normalize(record, "job-123", mockPrisma);

    // Verify Customer stub was created
    expect(mockCustomerFindUnique).toHaveBeenCalledWith({
      where: { code: "KH001" },
    });
    expect(mockCustomerCreate).toHaveBeenCalledWith({
      data: {
        code: "KH001",
        name: "Tap Hoa B",
        address: "Hanoi",
        phone: null,
        isStub: true,
      },
    });

    // Verify Visit was upserted idempotently
    expect(mockVisitUpsert).toHaveBeenCalled();
  });
});
