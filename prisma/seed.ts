import { PrismaClient, Role, RiskLevel } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper to hash password using bcryptjs.
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

async function main() {
  console.log("Seeding database...");

  // 1. Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change_me";
  const adminHash = hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin user created/upserted: ${admin.email}`);

  // 2. Create default settings
  const settings = [
    { key: "timezone", value: "Asia/Bangkok" },
    { key: "shiftStart", value: "08:00" },
    { key: "lateAfter", value: "08:15" },
    { key: "shiftEnd", value: "17:00" },
    { key: "minWorkHours", value: "7.5" },
    { key: "visionEnabled", value: "false" },
    {
      key: "ruleWeights",
      value: JSON.stringify({
        missingCheckInPenalty: 35,
        missingCheckOutPenalty: 35,
        lateMinutePenaltyMultiplier: 2,
        lateMaxPenalty: 20,
        earlyLeaveMinutePenaltyMultiplier: 2,
        earlyLeaveMaxPenalty: 20,
        underHoursPenaltyMultiplier: 6,
        underHoursMaxPenalty: 25,
        tooManyEventsPenalty: 10,
        duplicateEventPenalty: 10,
        noVisitPenalty: 10,
        lowOnRouteRatePenalty: 10,
      }),
    },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("Default settings created/upserted.");

  // 3. Create departments
  const depSales = await prisma.department.upsert({
    where: { code: "SALES" },
    update: {},
    create: { code: "SALES", name: "Phòng Kinh Doanh" },
  });

  const depLogistics = await prisma.department.upsert({
    where: { code: "LOGISTICS" },
    update: {},
    create: { code: "LOGISTICS", name: "Phòng Vận Tải" },
  });
  console.log("Departments created.");

  // 4. Create products
  const products = [
    {
      code: "SP001",
      name: "Nước Khoáng Sihuan 500ml",
      price: 5000,
      unit: "Chai",
    },
    {
      code: "SP002",
      name: "Nước Tinh Khiết Sihuan 1.5L",
      price: 12000,
      unit: "Chai",
    },
    {
      code: "SP003",
      name: "Trà Xanh Sihuan Ít Đường",
      price: 8000,
      unit: "Chai",
    },
    {
      code: "SP004",
      name: "Sữa Đậu Nành Sihuan Organic",
      price: 10000,
      unit: "Hộp",
    },
  ];

  const dbProducts = [];
  for (const p of products) {
    const dbP = await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    dbProducts.push(dbP);
  }
  console.log("Products created.");

  // 5. Create warehouses
  const warehouseMain = await prisma.warehouse.upsert({
    where: { code: "WH_MAIN" },
    update: {},
    create: { code: "WH_MAIN", name: "Kho Chính Sihuan Hà Nội" },
  });
  console.log("Warehouses created.");

  // 6. Create customers
  const customers = [
    {
      code: "KH001",
      name: "Đại Lý Tạp Hóa Minh Khuê",
      address: "12 Cầu Giấy, Hà Nội",
      phone: "0987654321",
    },
    {
      code: "KH002",
      name: "Siêu Thị Mini Mart An Bình",
      address: "45 Trần Hưng Đạo, Hà Nội",
      phone: "0912345678",
    },
    {
      code: "KH003",
      name: "Cửa Hàng Tiện Lợi Circle K Láng",
      address: "88 Đường Láng, Hà Nội",
      phone: "0909090909",
    },
    {
      code: "KH004",
      name: "Nhà Phân Phối Nước Giải Khát Thành Công",
      address: "120 Nguyễn Trãi, Hà Nội",
      phone: "0933333333",
    },
  ];

  const dbCustomers = [];
  for (const c of customers) {
    const dbC = await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    dbCustomers.push(dbC);
  }
  console.log("Customers created.");

  // 7. Create employees
  const employees = [
    {
      code: "NV001",
      name: "Nguyễn Văn Hùng",
      email: "hungnv@example.com",
      phone: "0981112222",
      roleName: "Nhân viên bán hàng",
      departmentId: depSales.id,
    },
    {
      code: "NV002",
      name: "Trần Thị Mai",
      email: "maitt@example.com",
      phone: "0983334444",
      roleName: "Nhân viên bán hàng",
      departmentId: depSales.id,
    },
    {
      code: "NV003",
      name: "Phạm Minh Đức",
      email: "ducpm@example.com",
      phone: "0985556666",
      roleName: "Giám sát bán hàng",
      departmentId: depSales.id,
    },
    {
      code: "NV004",
      name: "Lê Văn Nam",
      email: "namlv@example.com",
      phone: "0987778888",
      roleName: "Tài xế giao hàng",
      departmentId: depLogistics.id,
    },
    {
      code: "NV005",
      name: "Hoàng Kim Chi",
      email: "chihk@example.com",
      phone: "0989990000",
      roleName: "Nhân viên kinh doanh",
      departmentId: depSales.id,
    },
  ];

  const dbEmployees = [];
  for (const e of employees) {
    const dbE = await prisma.employee.upsert({
      where: { code: e.code },
      update: {},
      create: e,
    });
    dbEmployees.push(dbE);
  }
  console.log("Employees created.");

  // 8. Create Timesheet & Visit data for NV001 across multiple dates (10 distinct timesheet days)
  const baseDate = new Date("2026-06-01T00:00:00.000Z");

  // Case 1: GOOD Day (Normal on-time)
  const day1Date = new Date(baseDate.getTime() + 0 * 24 * 60 * 60 * 1000); // 2026-06-01
  const t1 = await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day1Date,
      weekday: "Thứ Hai",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-01T08:00:00+07:00"),
            location: "Văn phòng Cầu Giấy",
            note: "Đúng giờ",
          },
          {
            type: "Ra",
            time: new Date("2026-06-01T17:00:00+07:00"),
            location: "Văn phòng Cầu Giấy",
            note: "Tan ca",
          },
        ],
      },
      evaluation: {
        create: {
          score: 100,
          riskLevel: RiskLevel.GOOD,
          statusCodes: [],
          reasons: ["Chấm công đúng quy định."],
          suggestions: ["Tiếp tục phát huy."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:00",
          lastCheckOut: "17:00",
          workHours: 9.0,
          eventCount: 2,
        },
      },
    },
  });

  // Create visits for Day 1
  await prisma.visit.create({
    data: {
      employeeId: dbEmployees[0].id,
      customerId: dbCustomers[0].id,
      date: day1Date,
      checkin: new Date("2026-06-01T09:30:00+07:00"),
      checkout: new Date("2026-06-01T10:00:00+07:00"),
      addressCheckin: "12 Cầu Giấy, Hà Nội",
      isOnRoute: true,
      hasOrder: true,
      note: "Khách hàng lấy thêm Sihuan 500ml",
    },
  });

  // Case 2: Missing Check-in
  const day2Date = new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 2026-06-02
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day2Date,
      weekday: "Thứ Ba",
      events: {
        create: [
          {
            type: "Ra",
            time: new Date("2026-06-02T17:05:00+07:00"),
            location: "Cửa hàng KH002",
          },
        ],
      },
      evaluation: {
        create: {
          score: 65,
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["MISSING_CHECK_IN"],
          reasons: ["Thiếu thông tin giờ vào (Check-in)."],
          suggestions: ["Bổ sung giờ vào hoặc đối soát với quản lý."],
          hasCheckIn: false,
          hasCheckOut: true,
          lastCheckOut: "17:05",
          eventCount: 1,
        },
      },
    },
  });

  // Case 3: Missing Check-out
  const day3Date = new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2026-06-03
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day3Date,
      weekday: "Thứ Tư",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-03T07:55:00+07:00"),
            location: "Circle K Láng",
          },
        ],
      },
      evaluation: {
        create: {
          score: 65,
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["MISSING_CHECK_OUT"],
          reasons: ["Thiếu thông tin giờ ra (Check-out)."],
          suggestions: ["Bổ sung giờ ra để tính đủ giờ làm."],
          hasCheckIn: true,
          hasCheckOut: false,
          firstCheckIn: "07:55",
          eventCount: 1,
        },
      },
    },
  });

  // Case 4: Late check-in (45 mins late)
  const day4Date = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 2026-06-04
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day4Date,
      weekday: "Thứ Năm",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-04T08:45:00+07:00"),
            location: "Tạp hóa Minh Khuê",
          },
          {
            type: "Ra",
            time: new Date("2026-06-04T17:00:00+07:00"),
            location: "Văn phòng Cầu Giấy",
          },
        ],
      },
      evaluation: {
        create: {
          score: 82, // 100 - ceil(45/5)*2 = 100 - 18 = 82
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["LATE"],
          reasons: ["Đi trễ 45 phút."],
          suggestions: ["Lưu ý đi làm đúng giờ quy định."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:45",
          lastCheckOut: "17:00",
          workHours: 8.25,
          eventCount: 2,
          lateMinutes: 45,
        },
      },
    },
  });

  // Case 5: Early leave (35 mins early)
  const day5Date = new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000); // 2026-06-05
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day5Date,
      weekday: "Thứ Sáu",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-05T07:58:00+07:00"),
            location: "Văn phòng Cầu Giấy",
          },
          {
            type: "Ra",
            time: new Date("2026-06-05T16:25:00+07:00"),
            location: "Circle K Láng",
          },
        ],
      },
      evaluation: {
        create: {
          score: 86, // 100 - ceil(35/5)*2 = 100 - 14 = 86
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["EARLY_LEAVE"],
          reasons: ["Về sớm 35 phút."],
          suggestions: ["Vui lòng làm việc đủ giờ ca làm quy định."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "07:58",
          lastCheckOut: "16:25",
          workHours: 8.45,
          eventCount: 2,
          earlyLeaveMinutes: 35,
        },
      },
    },
  });

  // Case 6: Under Hours (Total work hours is 6.5h)
  const day6Date = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 2026-06-08 (Skip weekend)
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day6Date,
      weekday: "Thứ Hai",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-08T09:00:00+07:00"),
            location: "Văn phòng Cầu Giấy",
          },
          {
            type: "Ra",
            time: new Date("2026-06-08T15:30:00+07:00"),
            location: "Văn phòng Cầu Giấy",
          },
        ],
      },
      evaluation: {
        create: {
          // Late arrival (60m -> Penalty 20 max)
          // Early leave (90m -> Penalty 20 max)
          // Under hours (6.5h vs 7.5h: 1 hour missing -> Penalty 6)
          // Score: 100 - 20 - 20 - 6 = 54
          score: 54,
          riskLevel: RiskLevel.ABNORMAL,
          statusCodes: ["LATE", "EARLY_LEAVE", "UNDER_HOURS"],
          reasons: [
            "Đi trễ 60 phút.",
            "Về sớm 90 phút.",
            "Thiếu giờ làm việc (chỉ đạt 6.5h / tối thiểu 7.5h).",
          ],
          suggestions: ["Đảm bảo đúng giờ và đủ thời lượng làm việc."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "09:00",
          lastCheckOut: "15:30",
          workHours: 6.5,
          eventCount: 2,
          lateMinutes: 60,
          earlyLeaveMinutes: 90,
        },
      },
    },
  });

  // Case 7: Too Many Events
  const day7Date = new Date(baseDate.getTime() + 8 * 24 * 60 * 60 * 1000); // 2026-06-09
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day7Date,
      weekday: "Thứ Ba",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-09T08:00:00+07:00"),
            location: "Văn phòng",
          },
          {
            type: "Checkin",
            time: new Date("2026-06-09T10:00:00+07:00"),
            location: "Circle K",
          },
          {
            type: "Checkout",
            time: new Date("2026-06-09T11:00:00+07:00"),
            location: "Circle K",
          },
          {
            type: "Checkin",
            time: new Date("2026-06-09T13:00:00+07:00"),
            location: "An Bình",
          },
          {
            type: "Ra",
            time: new Date("2026-06-09T17:00:00+07:00"),
            location: "Văn phòng",
          },
        ],
      },
      evaluation: {
        create: {
          score: 90, // 100 - 10 (too many events)
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["TOO_MANY_EVENTS"],
          reasons: ["Số lần chấm công nhiều bất thường (5 lần)."],
          suggestions: ["Tránh bấm nút chấm công lặp lại nhiều lần liên tục."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:00",
          lastCheckOut: "17:00",
          workHours: 9.0,
          eventCount: 5,
        },
      },
    },
  });

  // Case 8: Duplicate Events
  const day8Date = new Date(baseDate.getTime() + 9 * 24 * 60 * 60 * 1000); // 2026-06-10
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day8Date,
      weekday: "Thứ Tư",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-10T08:00:00+07:00"),
            location: "Văn phòng",
          },
          {
            type: "Vào",
            time: new Date("2026-06-10T08:00:00+07:00"),
            location: "Văn phòng",
          }, // Duplicate
          {
            type: "Ra",
            time: new Date("2026-06-10T17:00:00+07:00"),
            location: "Văn phòng",
          },
        ],
      },
      evaluation: {
        create: {
          score: 90, // 100 - 10 (duplicate event)
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["DUPLICATE_EVENT"],
          reasons: [
            "Phát hiện các sự kiện chấm công trùng lặp cùng thời điểm.",
          ],
          suggestions: ["Kiểm tra kết nối hoặc thiết bị ghi nhận chấm công."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:00",
          lastCheckOut: "17:00",
          workHours: 9.0,
          eventCount: 3,
        },
      },
    },
  });

  // Case 9: No visits during workday
  const day9Date = new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 2026-06-11
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day9Date,
      weekday: "Thứ Năm",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-11T08:00:00+07:00"),
            location: "Văn phòng",
          },
          {
            type: "Ra",
            time: new Date("2026-06-11T17:00:00+07:00"),
            location: "Văn phòng",
          },
        ],
      },
      // Evaluated as no visits (visits array is specified as empty in logic)
      evaluation: {
        create: {
          score: 90, // 100 - 10 (no visit)
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["NO_VISIT"],
          reasons: [
            "Không phát hiện lượt viếng thăm khách hàng nào trong ngày.",
          ],
          suggestions: ["Cần giải trình lý do không đi tuyến viếng thăm."],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:00",
          lastCheckOut: "17:00",
          workHours: 9.0,
          eventCount: 2,
        },
      },
    },
  });

  // Case 10: Low Route Rate (< 80% on-route)
  const day10Date = new Date(baseDate.getTime() + 11 * 24 * 60 * 60 * 1000); // 2026-06-12
  await prisma.timesheetDay.create({
    data: {
      employeeId: dbEmployees[0].id,
      date: day10Date,
      weekday: "Thứ Sáu",
      events: {
        create: [
          {
            type: "Vào",
            time: new Date("2026-06-12T08:00:00+07:00"),
            location: "Văn phòng",
          },
          {
            type: "Ra",
            time: new Date("2026-06-12T17:00:00+07:00"),
            location: "Văn phòng",
          },
        ],
      },
      evaluation: {
        create: {
          score: 90, // 100 - 10 (low route rate)
          riskLevel: RiskLevel.CHECK,
          statusCodes: ["LOW_ON_ROUTE_RATE"],
          reasons: ["Tỷ lệ viếng thăm đúng tuyến thấp (33% < 80%)."],
          suggestions: [
            "Thực hiện viếng thăm khách hàng theo đúng tuyến phân công.",
          ],
          hasCheckIn: true,
          hasCheckOut: true,
          firstCheckIn: "08:00",
          lastCheckOut: "17:00",
          workHours: 9.0,
          eventCount: 2,
        },
      },
    },
  });

  // Add 3 visits for day 10 (1 on-route, 2 off-route)
  await prisma.visit.createMany({
    data: [
      {
        employeeId: dbEmployees[0].id,
        customerId: dbCustomers[0].id,
        date: day10Date,
        checkin: new Date("2026-06-12T09:00:00+07:00"),
        checkout: new Date("2026-06-12T09:20:00+07:00"),
        isOnRoute: true,
      },
      {
        employeeId: dbEmployees[0].id,
        customerId: dbCustomers[1].id,
        date: day10Date,
        checkin: new Date("2026-06-12T10:15:00+07:00"),
        checkout: new Date("2026-06-12T10:35:00+07:00"),
        isOnRoute: false,
      },
      {
        employeeId: dbEmployees[0].id,
        customerId: dbCustomers[2].id,
        date: day10Date,
        checkin: new Date("2026-06-12T11:30:00+07:00"),
        checkout: new Date("2026-06-12T11:50:00+07:00"),
        isOnRoute: false,
      },
    ],
  });
  console.log("Timesheet days and visits seeded for NV001.");

  // 9. Seed 5 Business Orders
  const orderDates = [day1Date, day4Date, day5Date, day8Date, day10Date];
  for (let i = 0; i < 5; i++) {
    const o = await prisma.order.create({
      data: {
        employeeId: dbEmployees[0].id,
        customerId: dbCustomers[i % dbCustomers.length].id,
        code: `DH00${i + 1}`,
        status: i === 4 ? "HỦY" : "HOÀN THÀNH",
        totalAmount: 500000 * (i + 1),
        vatAmount: 50000 * (i + 1),
        discount: 10000 * (i + 1),
        payableAmount: 540000 * (i + 1),
        date: orderDates[i],
        items: {
          create: [
            {
              productId: dbProducts[0].id,
              quantity: 50,
              price: 5000,
              total: 250000,
            },
            {
              productId: dbProducts[1].id,
              quantity: 25,
              price: 12000,
              total: 300000,
            },
          ],
        },
      },
    });
    console.log(`Order created: ${o.code}`);
  }

  // 10. Seed KPI data
  const kpiRecords = [
    {
      employeeId: dbEmployees[0].id,
      kpiName: "Doanh Số",
      targetValue: 50000000,
      actualValue: 42000000,
      achievementRate: 0.84,
      date: day1Date,
    },
    {
      employeeId: dbEmployees[0].id,
      kpiName: "Số Lượt Viếng Thăm",
      targetValue: 120,
      actualValue: 105,
      achievementRate: 0.875,
      date: day1Date,
    },
    {
      employeeId: dbEmployees[1].id,
      kpiName: "Doanh Số",
      targetValue: 45000000,
      actualValue: 48000000,
      achievementRate: 1.06,
      date: day1Date,
    },
  ];

  await prisma.kpiRecord.createMany({ data: kpiRecords });
  console.log("KPI records seeded.");

  // 11. Seed Inventory data
  const inventoryDoc = await prisma.inventoryDocument.create({
    data: {
      employeeId: dbEmployees[0].id,
      warehouseId: warehouseMain.id,
      code: `KK001`,
      type: "NHẬP KHO",
      date: day1Date,
      items: {
        create: [
          { productId: dbProducts[0].id, quantity: 1000, value: 5000000 },
          { productId: dbProducts[1].id, quantity: 500, value: 6000000 },
        ],
      },
    },
  });
  console.log(`Inventory Document seeded: ${inventoryDoc.code}`);

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
