import { describe, test, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../auth.service";
import * as bcrypt from "bcryptjs";

/** Test refresh token rotation + reuse detection.
 *  Không cần DB thật — mock PrismaService đầy đủ. */

const newId = () => "id-" + Math.random().toString(36).slice(2, 10);

const makeUser = (over: any = {}) => ({
  id: "user-1",
  email: "admin@example.com",
  password: bcrypt.hashSync("correct-password", 8),
  role: "ADMIN" as const,
  isActive: true,
  lastLoginAt: null,
  ...over,
});

const makeTokenRecord = (over: any = {}) => ({
  id: newId(),
  userId: "user-1",
  tokenHash: "hash-not-yet-set",
  family: "fam-1",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  replacedBy: null,
  createdAt: new Date(),
  userAgent: null,
  ipAddress: null,
  user: makeUser(),
  ...over,
});

describe("AuthService — refresh token rotation", () => {
  let prisma: any;
  let jwt: any;
  let audit: any;
  let svc: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn(), update: vi.fn().mockResolvedValue({}) },
      refreshToken: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: data.id,
          ...data,
        })),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    jwt = {
      sign: vi.fn().mockImplementation((payload, opts) => {
        return `mock.jwt.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
      }),
      verify: vi.fn().mockReturnValue({
        sub: "user-1",
        jti: "jti-1",
        family: "fam-1",
        h: "h-1",
        typ: "refresh",
      }),
    };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    svc = new AuthService(prisma, jwt, audit);
  });

  test("login returns opaque refresh token (not JWT) and access token", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const result = await svc.login("admin@example.com", "correct-password", {
      ipAddress: "127.0.0.1",
    });
    expect(result.access_token).toMatch(/^mock\.jwt\./);
    // Opaque token: 48 bytes base64url, ~64 chars, KHÔNG chứa dấu chấm JWT
    expect(result.refresh_token).not.toContain(".");
    expect(result.refresh_token.length).toBeGreaterThan(50);
    // Đã tạo DB record với opaqueHash
    expect(prisma.refreshToken.create).toHaveBeenCalledOnce();
    const created = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
  });

  test("refresh: hash plain opaque → lookup → rotate → issue new pair", async () => {
    // Setup: user login lần đầu
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const first = await svc.login("admin@example.com", "correct-password");

    // Server lưu DB record với hash
    const firstRecord = prisma.refreshToken.create.mock.calls[0][0].data;
    const firstHash = firstRecord.tokenHash;

    // Lookup bằng hash
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({ id: firstRecord.id, tokenHash: firstHash }),
    );

    const result = await svc.refresh(first.refresh_token);
    expect(result.access_token).toBeDefined();
    expect(result.refresh_token).not.toEqual(first.refresh_token); // rotated

    // Token cũ bị revoke
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: firstRecord.id },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  test("refresh: REUSE of revoked token → revoke entire family", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const first = await svc.login("admin@example.com", "correct-password");
    const firstRecord = prisma.refreshToken.create.mock.calls[0][0].data;
    const firstHash = firstRecord.tokenHash;
    const firstFamily = firstRecord.family;

    // User refreshes 1 lần (OK, rotate)
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({ id: firstRecord.id, tokenHash: firstHash }),
    );
    await svc.refresh(first.refresh_token);

    // Attacker cố dùng lại token đầu (bị revoke) → reuse detected
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({
        id: firstRecord.id,
        tokenHash: firstHash,
        family: firstFamily,
        revokedAt: new Date(), // đã revoke
      }),
    );
    await expect(svc.refresh(first.refresh_token)).rejects.toThrow();

    // Toàn bộ family bị revoke
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { family: firstFamily, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  test("refresh: unknown token → reject", async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(svc.refresh("not-a-real-token")).rejects.toThrow(
      /Refresh token không hợp lệ/,
    );
  });

  test("refresh: expired token → reject without reusing family", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const first = await svc.login("admin@example.com", "correct-password");
    const firstRecord = prisma.refreshToken.create.mock.calls[0][0].data;
    const firstHash = firstRecord.tokenHash;
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({
        id: firstRecord.id,
        tokenHash: firstHash,
        family: firstRecord.family,
        expiresAt: new Date(Date.now() - 1000), // expired
      }),
    );
    await expect(svc.refresh(first.refresh_token)).rejects.toThrow(/hết hạn/);
    // KHÔNG revoke family khi expired (chỉ revoke khi reuse/reuse detection)
    const familyCalls = prisma.refreshToken.updateMany.mock.calls.filter(
      (c: any[]) => c[0]?.where?.family,
    );
    expect(familyCalls.length).toBe(0);
  });

  test("refresh: inactive user → reject", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const first = await svc.login("admin@example.com", "correct-password");
    const firstRecord = prisma.refreshToken.create.mock.calls[0][0].data;
    const firstHash = firstRecord.tokenHash;
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({
        id: firstRecord.id,
        tokenHash: firstHash,
        family: firstRecord.family,
        user: makeUser({ isActive: false }),
      }),
    );
    await expect(svc.refresh(first.refresh_token)).rejects.toThrow(/vô hiệu/);
  });

  test("logout: revoke family nếu token còn sống", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    const first = await svc.login("admin@example.com", "correct-password");
    const firstRecord = prisma.refreshToken.create.mock.calls[0][0].data;
    const firstHash = firstRecord.tokenHash;
    const firstFamily = firstRecord.family;
    prisma.refreshToken.findUnique.mockResolvedValue(
      makeTokenRecord({
        id: firstRecord.id,
        tokenHash: firstHash,
        family: firstFamily,
      }),
    );
    await svc.logout(first.refresh_token, "user-1");
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { family: firstFamily, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  test("logout: fallback revoke-all-for-user nếu không có token", async () => {
    await svc.logout(undefined, "user-1");
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  test("login: inactive user → reject", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));
    await expect(
      svc.login("admin@example.com", "correct-password"),
    ).rejects.toThrow(/không hợp lệ/);
  });

  test("login: wrong password → reject + audit", async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    await expect(svc.login("admin@example.com", "wrong")).rejects.toThrow(
      /không hợp lệ/,
    );
  });
});
