# Bảng điều khiển Quản trị Chuyên cần DMS AI Admin (Monorepo)

Hệ thống quản lý, chấm điểm chuyên cần thông minh tích hợp dữ liệu thực địa từ Mobiwork OpenAPI và báo cáo quản trị hỗ trợ bởi OpenAI GPT.

---

## 🛠️ Yêu cầu hệ thống

- **Node.js** >= 18
- **pnpm** >= 8
- **Docker & Docker Compose** (để chạy database & redis)

---

## 🚀 Hướng dẫn khởi chạy nhanh

### 1. Khởi chạy cơ sở dữ liệu và Redis

Chạy lệnh sau tại thư mục gốc để khởi động PostgreSQL và Redis:

```bash
docker-compose up -d
```

### 2. Thiết lập cấu hình môi trường

Sao chép file cấu hình mẫu `.env.example` thành `.env` (đã có sẵn mặc định cho chạy thử local):

```bash
cp .env.example .env
```

### 3. Cài đặt các gói phụ thuộc

```bash
pnpm install
```

### 4. Đồng bộ Database Schema & Seed dữ liệu demo

Lệnh này sẽ tạo cấu trúc bảng trong PostgreSQL và tự động seed tài khoản admin cùng 10 ngày công mẫu với các lỗi vi phạm chuyên cần thực tế (đi trễ, về sớm, thiếu checkin/checkout, sai tuyến,...):

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 5. Khởi chạy môi trường phát triển (Development)

Chạy đồng thời cả Frontend (Vite) và Backend (NestJS API):

```bash
pnpm dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 🔑 Tài khoản Đăng nhập Mẫu

- **Email**: `admin@example.com`
- **Mật khẩu**: `change_me`

---

## 📂 Kiến trúc Thư mục Monorepo

- `apps/web`: Ứng dụng React 18, Vite, Ant Design.
- `apps/api`: NestJS API, Prisma Client.
- `packages/shared`: Chứa các schemas Zod và TypeScript interfaces dùng chung.
- `packages/mobiwork-client`: Client gọi OpenAPI Mobiwork, hỗ trợ tự động phân trang (pagination) và exponential retry backoff.
- `packages/rule-engine`: Trình tính toán, chấm điểm chuyên cần thuần túy TypeScript (với bộ unit tests chi tiết).
- `packages/ai-prompts`: Chứa các Prompts mẫu để lấy cấu trúc dữ liệu JSON từ AI trợ lý và Vision.
