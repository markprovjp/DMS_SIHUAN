import {
  SetMetadata,
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";

export const ROLES_KEY = "roles";

/** Đánh dấu endpoint yêu cầu 1 trong các role.
 *  Dùng: @Roles(Role.ADMIN, Role.MANAGER) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Guard kiểm tra user.role có nằm trong danh sách cho phép không.
 *  Phải đặt SAU JwtAuthGuard trong @UseGuards(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException("Chưa xác thực");
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Yêu cầu role: ${required.join(", ")} — role hiện tại: ${user.role}`,
      );
    }
    return true;
  }
}
