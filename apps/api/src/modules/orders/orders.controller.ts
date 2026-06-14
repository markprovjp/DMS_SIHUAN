import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { Role } from "@prisma/client";
import { OrdersQueryDto } from "../../common/dto";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /** Server-side paginated. */
  @Get()
  async findAll(
    @Query() q: OrdersQueryDto,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("20"), ParseIntPipe) pageSize = 20,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    return this.ordersService.findAll({
      employeeCode: q.employeeCode,
      status: q.status,
      startDate: q.startDate,
      endDate: q.endDate,
      page: safePage,
      pageSize: safeSize,
    });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.id;
    const ip = req.ip;
    return this.ordersService.approve(id, userId, ip);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post(":id/reject")
  async reject(@Param("id") id: string, @Req() req: any) {
    const userId = req.user?.id;
    const ip = req.ip;
    return this.ordersService.reject(id, userId, ip);
  }
}
