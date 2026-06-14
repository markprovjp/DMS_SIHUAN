import { describe, test, expect, vi } from "vitest";
import { AiAnalysisController } from "../ai-analysis.controller";

describe("AiAnalysisController Pagination & Limit Compatibility", () => {
  test("should pass correct page and pageSize parameters to service", async () => {
    const mockAiService: any = {
      getRuns: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const controller = new AiAnalysisController(mockAiService);

    // Call with specific page and pageSize
    await controller.getRuns({}, 2, 5);

    expect(mockAiService.getRuns).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
    });
  });

  test("should fall back to limit query parameter if page/pageSize are not set", async () => {
    const mockAiService: any = {
      getRuns: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const controller = new AiAnalysisController(mockAiService);

    // Call with query containing limit=1
    await controller.getRuns({ limit: "1" }, 1, 20);

    expect(mockAiService.getRuns).toHaveBeenCalledWith({
      page: 1,
      pageSize: 1,
    });
  });

  test("should enforce safe bounds for page and pageSize", async () => {
    const mockAiService: any = {
      getRuns: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const controller = new AiAnalysisController(mockAiService);

    // Page = -5, pageSize = 200 (both out of bounds)
    await controller.getRuns({}, -5, 200);

    expect(mockAiService.getRuns).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100, // min page 1, max size 100
    });
  });
});
