import { SyncNormalizer } from "./normalizer.interface";

export class RouteNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const code = record.ma || record.code;
    if (!code) return;

    await prisma.route.upsert({
      where: { code },
      update: { name: record.ten || "" },
      create: { code, name: record.ten || "" },
    });
  }
}
