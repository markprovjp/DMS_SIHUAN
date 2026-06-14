import { describe, test, expect, vi } from "vitest";
import { OrdersService } from "../orders.service";
import { OrdersController } from "../orders.controller";

describe("Orders Service & Controller", () => {
  test("approve updates order status and creates audit log", async () => {
    const mockPrisma: any = {
      order: {
        update: vi
          .fn()
          .mockResolvedValue({ id: "o-1", code: "DH01", status: "APPROVED" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const service = new OrdersService(mockPrisma);
    const result = await service.approve("o-1");

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "o-1" },
      data: { status: "APPROVED" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "ORDER_APPROVE",
        details: "Đã duyệt đơn hàng mã DH01 (ID: o-1)",
      },
    });
    expect(result.status).toBe("APPROVED");
  });

  test("reject updates order status and creates audit log", async () => {
    const mockPrisma: any = {
      order: {
        update: vi
          .fn()
          .mockResolvedValue({ id: "o-1", code: "DH01", status: "REJECTED" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const service = new OrdersService(mockPrisma);
    const result = await service.reject("o-1");

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "o-1" },
      data: { status: "REJECTED" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "ORDER_REJECT",
        details: "Đã từ chối đơn hàng mã DH01 (ID: o-1)",
      },
    });
    expect(result.status).toBe("REJECTED");
  });

  test("controller endpoints call service approve and reject methods", async () => {
    const mockService: any = {
      approve: vi.fn().mockResolvedValue({ id: "o-1", status: "APPROVED" }),
      reject: vi.fn().mockResolvedValue({ id: "o-1", status: "REJECTED" }),
    };

    const controller = new OrdersController(mockService);

    const approveResult = await controller.approve("o-1");
    expect(mockService.approve).toHaveBeenCalledWith("o-1");
    expect(approveResult.status).toBe("APPROVED");

    const rejectResult = await controller.reject("o-1");
    expect(mockService.reject).toHaveBeenCalledWith("o-1");
    expect(rejectResult.status).toBe("REJECTED");
  });
});
