import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/** Gắn correlationId lên mỗi request.
 *  - Ưu tiên header `x-request-id` nếu client gửi (qua proxy / gateway).
 *  - Sinh UUID mới nếu thiếu.
 *  - Echo lại qua response header để client thấy.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = (req.headers["x-request-id"] as string) || "";
    const id = incoming || randomUUID();
    req.correlationId = id;
    res.setHeader("x-request-id", id);
    next();
  }
}
