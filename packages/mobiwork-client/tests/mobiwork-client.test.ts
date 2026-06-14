import { describe, it, expect, vi } from "vitest";
import { MobiworkClient } from "../src";

// We can mock endpoints data if needed, but we have copy-item endpoints.json locally
describe("MobiworkClient Unit Tests", () => {
  it("should detect when credentials are not configured", () => {
    const client = new MobiworkClient({
      userId: "your_user_id_here",
      token: "your_token_here",
    });
    expect(client.hasCredentials()).toBe(false);
  });

  it("should detect valid credentials", () => {
    const client = new MobiworkClient({
      userId: "real_user",
      token: "real_token",
    });
    expect(client.hasCredentials()).toBe(true);
  });

  it("should support extractRecords utility", () => {
    const client = new MobiworkClient({ userId: "", token: "" });

    expect(client.extractRecords([1, 2])).toEqual([1, 2]);
    expect(client.extractRecords({ data: [3, 4] })).toEqual([3, 4]);
    expect(client.extractRecords({ items: [5, 6] })).toEqual([5, 6]);
    expect(client.extractRecords({ results: [7] })).toEqual([7]);
    expect(client.extractRecords({ rows: [8] })).toEqual([8]);
    expect(client.extractRecords({ data: { id: 1 } })).toEqual([{ id: 1 }]);
    expect(client.extractRecords(null)).toEqual([]);
  });

  it("should check endpoints list and find endpoints", () => {
    const client = new MobiworkClient({ userId: "", token: "" });
    const endpoints = client.getEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);

    const timesheet = client.getEndpoint("/OpenAPI/V1/TimesheetData");
    expect(timesheet).toBeDefined();
    expect(timesheet?.method).toBe("GET");
  });

  it("should build correct URL with params and handle Route page size constraints", () => {
    const client = new MobiworkClient({ userId: "user", token: "token" });

    // Testing route endpoint constraint
    const routeUrl = (client as any).buildUrl("/OpenAPI/V1/Route", {
      page_size: 20,
      q: "search",
    });
    expect(routeUrl.searchParams.get("page_size")).toBe("10");
    expect(routeUrl.searchParams.get("q")).toBe("search");

    // Testing regular endpoint
    const salesUrl = (client as any).buildUrl("/OpenAPI/V1/Sale", {
      page_size: 20,
    });
    expect(salesUrl.searchParams.get("page_size")).toBe("20");

    // Testing invalid path
    expect(() => (client as any).buildUrl("/invalid")).toThrow();
  });

  it("should retry on 429 status code and eventually succeed", async () => {
    vi.useFakeTimers();
    const client = new MobiworkClient({ userId: "user", token: "token" });

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        return {
          status: 429,
          ok: false,
          text: async () => JSON.stringify({ error: "Too Many Requests" }),
        };
      }
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      };
    });
    global.fetch = mockFetch;

    const promise = client.call("/OpenAPI/V1/TimesheetData");

    // Fast forward fake timers to resolve sleeps
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toEqual({ success: true });
    expect(callCount).toBe(3);
    vi.useRealTimers();
  });

  it("should paginate and merge all records in callAll", async () => {
    const client = new MobiworkClient({ userId: "user", token: "token" });

    // Mock endpoint parameters to support page params in test
    const endpoint = client.getEndpoint("/OpenAPI/V1/TimesheetData");
    if (endpoint) {
      endpoint.parameters.push(
        {
          name: "page_size",
          required: false,
          description: "page size",
          schemaType: "integer",
          default: 10,
        },
        {
          name: "page_number",
          required: false,
          description: "page number",
          schemaType: "integer",
          default: 1,
        },
      );
    }

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      const urlObj = new URL(url);
      const page = urlObj.searchParams.get("page_number");

      if (page === "1") {
        return {
          status: 200,
          ok: true,
          text: async () =>
            JSON.stringify({
              total: 3,
              data: [{ id: 1 }, { id: 2 }],
            }),
        };
      } else {
        return {
          status: 200,
          ok: true,
          text: async () =>
            JSON.stringify({
              total: 3,
              data: [{ id: 3 }],
            }),
        };
      }
    });
    global.fetch = mockFetch;

    const result = await client.callAll(
      "/OpenAPI/V1/TimesheetData",
      {},
      { fetchAll: true, pageSize: 2 },
    );

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(callCount).toBe(2);
  });
});
