import { SyncNormalizer } from "./normalizer.interface";
import * as crypto from "crypto";

export class ProductNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const code = record.ma_sp || record.ma;
    if (!code) return;

    const name = record.ten_sp || record.ten || "";
    const unit = record.dvt_chan || record.don_vi_tinh || null;
    const price = record.gia_chan ? Number(record.gia_chan) : 0;
    const recordHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/Product-${JSON.stringify(record)}`)
      .digest("hex");

    await prisma.product.upsert({
      where: { code },
      update: {
        name,
        unit,
        price,
        isStub: false,
        sourceEndpoint: "/OpenAPI/V1/Product",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
      create: {
        code,
        name,
        unit,
        price,
        isStub: false,
        sourceEndpoint: "/OpenAPI/V1/Product",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
    });
  }
}
