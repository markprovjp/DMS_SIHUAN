export interface SyncNormalizer {
  normalize(record: any, jobId: string, prisma: any): Promise<void>;
}
