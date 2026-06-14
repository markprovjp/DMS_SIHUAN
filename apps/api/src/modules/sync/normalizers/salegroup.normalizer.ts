import { SyncNormalizer } from "./normalizer.interface";

export class SaleGroupNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    if (!record.ma) return;

    await prisma.department.upsert({
      where: { code: record.ma },
      update: { name: record.ten || "" },
      create: { code: record.ma, name: record.ten || "" },
    });
  }
}
