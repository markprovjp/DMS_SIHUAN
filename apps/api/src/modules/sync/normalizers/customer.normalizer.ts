import { SyncNormalizer } from "./normalizer.interface";
import * as crypto from "crypto";

export class CustomerNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const code = record.ma_kh || record.ma || record.makh;
    if (!code) return;

    const name = record.ten_kh || record.ten || record.tenkh || "";
    const address = record.dia_chi || null;
    const phone = record.sdt || null;
    const recordHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/Customer-${JSON.stringify(record)}`)
      .digest("hex");

    await prisma.customer.upsert({
      where: { code },
      update: {
        name,
        address,
        phone,
        isStub: false,
        sourceEndpoint: "/OpenAPI/V1/Customer",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
      create: {
        code,
        name,
        address,
        phone,
        isStub: false,
        sourceEndpoint: "/OpenAPI/V1/Customer",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
    });
  }
}
