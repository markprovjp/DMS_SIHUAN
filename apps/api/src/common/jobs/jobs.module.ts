import { Global, Module, DynamicModule } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { InProcessJobQueue } from "./in-process.job-queue";
import { BullMqJobQueue } from "./bullmq.job-queue";
import { JobsController } from "./jobs.controller";

const USE_BULL = process.env.USE_BULL === "1";
const REDIS_URL = process.env.REDIS_URL;

@Global()
@Module({})
export class JobsModule {
  /** Dynamic module: chọn InProcess (dev/MVP) hoặc BullMQ (production) dựa vào env.
   *  Mặc định InProcess để dev không cần Redis. */
  static forRoot(): DynamicModule {
    const baseProviders: any[] = [
      InProcessJobQueue,
      {
        // Token chung cho controller + service dùng
        provide: "JOB_QUEUE",
        useExisting: InProcessJobQueue,
      },
    ];
    const baseExports: any[] = [InProcessJobQueue, "JOB_QUEUE"];
    const baseImports: any[] = [];

    if (USE_BULL && REDIS_URL) {
      return {
        module: JobsModule,
        imports: [
          ...baseImports,
          BullModule.forRootAsync({
            useFactory: () => {
              // Parse REDIS_URL thành host/port cho IORedis options
              const url = new URL(REDIS_URL!);
              return {
                redis: {
                  host: url.hostname,
                  port: parseInt(url.port || "6379", 10),
                  password: url.password || undefined,
                  username: url.username || undefined,
                },
              };
            },
          }),
          BullModule.registerQueue({ name: "dms-jobs" }),
        ],
        controllers: [JobsController],
        providers: [
          ...baseProviders,
          BullMqJobQueue,
          {
            provide: "JOB_QUEUE",
            useExisting: BullMqJobQueue, // Override với BullMQ
          },
        ],
        exports: [...baseExports, BullMqJobQueue],
      };
    }

    return {
      module: JobsModule,
      imports: baseImports,
      controllers: [JobsController],
      providers: baseProviders,
      exports: baseExports,
    };
  }
}
