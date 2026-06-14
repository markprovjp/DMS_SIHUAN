import { describe, test, expect, vi } from "vitest";
import { SettingsService } from "../settings.service";

describe("SettingsService Masking & Protection", () => {
  test("getAllMasked masks sensitive keys into structured objects", async () => {
    // Mock Prisma findMany
    const mockPrisma: any = {
      setting: {
        findMany: vi.fn().mockResolvedValue([
          { key: "timezone", value: "Asia/Bangkok" },
          { key: "openaiApiKey", value: "sk-abcdef123456" },
          { key: "token", value: "my_mobiwork_token" },
          { key: "somePublicSetting", value: "hello" },
        ]),
      },
    };

    const service = new SettingsService(mockPrisma);
    const maskedSettings = await service.getAllMasked();

    // timezone & somePublicSetting should remain as raw strings
    expect(maskedSettings.timezone).toBe("Asia/Bangkok");
    expect(maskedSettings.somePublicSetting).toBe("hello");

    // openaiApiKey & token should be masked objects
    expect(maskedSettings.openaiApiKey).toEqual({
      configured: true,
      masked: "****3456", // Displays last 4 characters
    });
    expect(maskedSettings.token).toEqual({
      configured: true,
      masked: "****oken",
    });
  });

  test("getAllMasked masks aiApiKey", async () => {
    const mockPrisma: any = {
      setting: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ key: "aiApiKey", value: "9r-secret-12345" }]),
      },
    };

    const service = new SettingsService(mockPrisma);
    const maskedSettings = await service.getAllMasked();

    expect(maskedSettings.aiApiKey).toEqual({
      configured: true,
      masked: "****2345",
    });
  });

  test("getAllMasked handles empty sensitive keys", async () => {
    const mockPrisma: any = {
      setting: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ key: "openaiApiKey", value: "" }]),
      },
    };

    const service = new SettingsService(mockPrisma);
    const maskedSettings = await service.getAllMasked();

    expect(maskedSettings.openaiApiKey).toEqual({
      configured: false,
      masked: "",
    });
  });

  test("updateMany skips updating when masked values are provided", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const mockPrisma: any = {
      setting: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: mockUpsert,
      },
    };

    const service = new SettingsService(mockPrisma);

    // We try to update settings. Key "openaiApiKey" has masked values (object or string starting with ****)
    // Key "timezone" is updated normally.
    await service.updateMany({
      timezone: "Asia/Tokyo",
      openaiApiKey: { configured: true, masked: "********" }, // Case 1: object
      token: "********", // Case 2: string ********
      someSecret: "****3456", // Case 3: string starting with ****
      anotherSecret: "new_real_secret_key", // Case 4: real new value
    });

    // We expect upsert to be called ONLY for timezone and anotherSecret
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "timezone" },
        create: { key: "timezone", value: "Asia/Tokyo" },
      }),
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "anotherSecret" },
        create: { key: "anotherSecret", value: "new_real_secret_key" },
      }),
    );
  });
});
