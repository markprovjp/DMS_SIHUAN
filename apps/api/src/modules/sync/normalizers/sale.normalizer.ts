import { SyncNormalizer } from "./normalizer.interface";
import * as crypto from "crypto";

export class SaleNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const code = record.ma_nv || record.ma;
    if (!code) return;

    let depId: string | null = null;
    if (record.phong_ban) {
      const dep = await prisma.department.findUnique({
        where: { code: record.phong_ban },
      });
      if (dep) depId = dep.id;
    }

    const name = record.ten || record.ho_ten || "";
    const email = record.email || null;
    const phone = record.so_dien_thoai || null;
    const roleName = record.chuc_danh || null;
    const recordHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/Sale-${JSON.stringify(record)}`)
      .digest("hex");

    await prisma.employee.upsert({
      where: { code },
      update: {
        name,
        email,
        phone,
        roleName,
        departmentId: depId,
        isStub: false, // This is real data sync, not a stub anymore
        sourceEndpoint: "/OpenAPI/V1/Sale",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
      create: {
        code,
        name,
        email,
        phone,
        roleName,
        departmentId: depId,
        isStub: false,
        sourceEndpoint: "/OpenAPI/V1/Sale",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
    });
  }
}
