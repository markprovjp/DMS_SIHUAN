// Bootstrap OpenTelemetry TRƯỚC NestJS nếu OTEL_ENABLED=1.
// Phải là require (không import) để chạy synchronous trước khi NestJS khởi động.
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("./common/observability/telemetry");

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import * as dotenv from "dotenv";
import * as path from "path";
import * as cookieParser from "cookie-parser";
import { getAppUrls } from "./common/config";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { RequestIdMiddleware } from "./common/request-id.middleware";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  // Request-id middleware (must run first so every log has it)
  const requestId = new RequestIdMiddleware();
  app.use((req: any, res: any, next: any) => requestId.use(req, res, next));

  // Cookie parser (cho httpOnly refresh token cookie)
  app.use(cookieParser());

  // Security: Helmet + CORS allowlist (env-driven)
  // Cần credentials: true để cookie httpOnly hoạt động với cross-origin dev (5173 → 3000)
  app.use(helmet());
  app.enableCors({
    origin: getAppUrls(),
    credentials: true,
  });

  app.setGlobalPrefix("api");

  // Strict DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — consistent error shape + masked secrets
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application running on http://localhost:${port}/api ` +
      `(env=${process.env.NODE_ENV || "development"}, cors=${getAppUrls().join(",")})`,
    "Bootstrap",
  );
}
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start application:", err);
  process.exit(1);
});
