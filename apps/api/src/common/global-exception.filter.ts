import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { maskSecretsDeep } from "./config";

/** Error shape chuẩn cho toàn bộ API:
 *  {
 *    statusCode: number,
 *    error: string,            // "Bad Request" | "Unauthorized" | ...
 *    message: string | string[],
 *    correlationId?: string,
 *   path?: string,
 *   timestamp?: string,
 * }
 * Không bao giờ leak raw provider exception body hoặc secret.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = "Internal server error";
    let error = "Internal Server Error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === "string") {
        message = r;
      } else if (typeof r === "object" && r !== null) {
        const obj = r as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? exception.message;
        error = (obj.error as string) ?? exception.name;
      } else {
        message = exception.message;
      }
      // Lấy "error" name từ status nếu chưa có
      if (!error || error === "Internal Server Error") {
        error = HttpStatus[status] ?? "Error";
      }
    } else if (exception instanceof Error) {
      // Ẩn internal error message — chỉ log, response generic
      this.logger.error(
        `Unhandled error [${(req as any).correlationId ?? "-"}] ${req.method} ${req.url}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown exception [${(req as any).correlationId ?? "-"}] ${req.method} ${req.url}: ${String(exception)}`,
      );
    }

    const body = maskSecretsDeep({
      statusCode: status,
      error,
      message,
      correlationId: (req as any).correlationId,
      path: req.url,
      timestamp: new Date().toISOString(),
    });

    res.status(status).json(body);
  }
}
