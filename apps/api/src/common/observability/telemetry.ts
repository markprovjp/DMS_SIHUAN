/**
 * OpenTelemetry bootstrap — load TRƯỚC NestJS khởi động để capture tất cả request.
 *
 * Chỉ enable khi `OTEL_ENABLED=1`. Mặc định off để dev không bị overhead.
 *
 * Production setup:
 *   1. Set OTEL_ENABLED=1
 *   2. Set OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
 *   3. Restart API
 *
 * Collector sẽ forward sang Jaeger / Tempo / Datadog / Honeycomb tùy setup.
 */
const OTEL_ENABLED = process.env.OTEL_ENABLED === "1";

if (OTEL_ENABLED) {
  // Must be loaded BEFORE NestFactory.create() để instrument các module HTTP/Express
  const { NodeSDK } = require("@opentelemetry/sdk-node");
  const {
    getNodeAutoInstrumentations,
  } = require("@opentelemetry/auto-instrumentations-node");
  const {
    OTLPTraceExporter,
  } = require("@opentelemetry/exporter-trace-otlp-http");
  const { resourceFromAttributes } = require("@opentelemetry/resources");
  const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
  } = require("@opentelemetry/semantic-conventions");

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "dms-ai-admin-api",
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "1.0.0",
      "deployment.environment": process.env.NODE_ENV || "development",
    }),
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        "http://localhost:4318/v1/traces",
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Bỏ qua fs instrumentation (quá nhiều noise)
        "@opentelemetry/instrumentation-fs": { enabled: false },
        // Tắt express view instrumentation
        "@opentelemetry/instrumentation-express": { enabled: true },
        // Capture HTTP, Prisma (tự detect), Redis (BullMQ)
        "@opentelemetry/instrumentation-http": { enabled: true },
        "@opentelemetry/instrumentation-nestjs-core": { enabled: true },
        "@opentelemetry/instrumentation-pino": { enabled: false }, // dùng NestJS Logger
      }),
    ],
  });

  sdk.start();
  // eslint-disable-next-line no-console
  console.log(
    "[OTel] SDK started, exporting to",
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
  );

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await sdk.shutdown();
      // eslint-disable-next-line no-console
      console.log("[OTel] SDK shut down");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[OTel] shutdown error", e);
    }
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
