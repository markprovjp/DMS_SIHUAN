# SUPER PROMPT: Chuan Hoa Giao Dien DMS AI Admin Theo Ant Design Enterprise

Ban la senior frontend engineer + product designer chuyen xay dung admin dashboard enterprise bang React, Vite, TypeScript va Ant Design. Hay refactor lai toan bo giao dien `dms-ai-admin` de tro thanh mot he thong admin DMS sang, min, gon, dung tinh than Ant Design/Ant Design Pro. Muc tieu la bo vibe "nhua", "AI demo", neon/gradient qua tay; thay bang giao dien noi bo doanh nghiep chuyen nghiep, doc du lieu nhanh, thao tac lap lai tot.

## 0. Nguon tham khao bat buoc

Truoc khi code, hay tham khao cac chuan sau:

- Ant Design Pro: dashboard enterprise, layout noi bo, menu, top header, account area.
  - https://preview.pro.ant.design/
  - https://github.com/ant-design/ant-design-pro
- Ant Design ProComponents: uu tien ProLayout, ProTable, ProForm, StatisticCard, PageContainer neu phu hop.
  - https://procomponents.ant.design/en-US/components/
  - https://procomponents.ant.design/en-US/components/table/
  - https://procomponents.ant.design/en-US/components/form/
- Ant Design visualization page: dashboard nen co cau truc tong quan -> canh bao -> bang chi tiet.
  - https://ant.design/docs/spec/visualization-page/
- Ant Design Table docs: sort/filter/pagination/scroll/responsive dung chuan, tranh vo layout.
  - https://ant.design/components/table/
- Refine + Ant Design admin templates chi dung de tham khao nhịp layout CRUD/internal tool, khong doi framework neu khong can.
  - https://refine.dev/core/templates/react-admin-panel-ant-design/

## 1. Boi canh du an

Repo: `dms-ai-admin`

Stack hien tai:

- Monorepo pnpm/turbo.
- Frontend: React + Vite + TypeScript + Ant Design.
- Backend: NestJS.
- Domain: DMS AI Admin noi bo, gom dashboard, timesheet, visits, orders, KPI/inventory, AI analysis, sync center, settings, audit.
- Rule engine tinh diem cham cong noi bo, AI chi doc bang tong hop va dien giai.
- Vision chi phan loai chat luong/ngu canh anh check-in, khong nhan dien khuon mat.

## 2. Muc tieu san pham

Lam lai UI de nguoi quan ly ban hang/thuc dia su dung hang ngay:

- Scan nhanh tinh trang cham cong, loi du lieu, canh bao bat thuong.
- Loc, sort, xem chi tiet, xuat file, dong bo du lieu nhanh.
- Dashboard co tinh quan tri, khong phai landing page.
- UI phai giong mot admin enterprise that, khong giong demo AI.
- Giao dien tieng Viet ro, ngan, nghiep vu.

## 3. Nguyen tac thiet ke bat buoc

### Tone

- Sang, min, enterprise, restraint.
- Nen sang hoac trung tinh, khong toi qua.
- Khong dung gradient lon, neon, glow, glassmorphism, blob/orb, shadow qua day.
- Khong tao cam giac landing page/marketing.
- Khong dung card long nhau.
- Border radius nho/vua: 6-8px.
- Shadow rat nhe, uu tien border `#f0f0f0`/token AntD.
- Khoang cach deu, noi dung day du nhung thoang.

### Ant Design-first

Dung nhieu component AntD/ProComponents dung ngu canh:

- `Layout`, `Menu`, `Breadcrumb`, `Dropdown`, `Avatar`, `Badge`.
- `Card`, `Statistic`, `Row`, `Col`, `Flex`, `Space`, `Divider`.
- `Table` hoac `ProTable` cho data-heavy page.
- `Form`, `DatePicker.RangePicker`, `Select`, `Input.Search`, `Segmented`, `Radio.Group`, `Checkbox`, `Switch`.
- `Tabs` cho cac view cung module.
- `Drawer` cho chi tiet ban ghi.
- `Modal` cho confirm/action phu.
- `Tag`, `Badge`, `Alert`, `Result`, `Empty`, `Skeleton`.
- `Tooltip`, `Popover` cho icon/action kho hieu.
- `Timeline` dung API moi `items`.
- `Steps` neu co workflow sync/analyze.
- `Descriptions` cho chi tiet object.
- `List` cho insight/notification.

Neu them dependency thi uu tien:

- `@ant-design/pro-components` cho `ProLayout`, `PageContainer`, `ProTable`, `ProForm`, `StatisticCard`.
- Giu ECharts neu dang co, nhung boc chart vao layout AntD gon.
- Khong doi framework sang Refine/Next neu khong co ly do rat manh.

## 4. Visual system can tao

Tao mot design system nho trong frontend:

- Theme token AntD tai `ConfigProvider`.
- Mau nen app: `#f5f7fb` hoac token tuong duong.
- Surface/card: `#ffffff`.
- Text chinh: `#1f2937` hoac token AntD.
- Text phu: `#6b7280`.
- Primary: xanh enterprise AntD, vi du `#1677ff`, khong purple AI.
- Success: xanh la nhe.
- Warning: amber.
- Error: red.
- Risk:
  - GOOD: green.
  - CHECK: gold/orange.
  - ABNORMAL: red.
- Status code cham cong phai co tag mau nhat quan:
  - Missing check-in/out: red.
  - Late/early: orange.
  - Under-hours: gold.
  - Too many/duplicate: purple hoac volcano nhung dung tiet che.
  - No visit/off route: cyan/orange.

Typography:

- Khong dung hero text.
- Page title 20-24px.
- Section title 16-18px.
- Table text 13-14px.
- Metric value 24-32px tuy ngu canh.
- Khong letter-spacing am.
- Khong scale font theo viewport.

Layout:

- Sidebar width 232-256px desktop, collapsible.
- Header 56-64px, sticky neu hop ly.
- Content max khong qua hep; admin dashboard can full width co padding 24.
- Mobile/tablet phai khong vo bang/filter.

## 5. Kien truc frontend mong muon

Hay refactor co kiem soat, khong dap lai toan bo.

De xuat tao/cai tien:

- `src/theme.ts`: AntD theme tokens, status colors, common component token.
- `src/components/AppShell.tsx` hoac nang cap `Layout.tsx`: shell chuan enterprise.
- `src/components/common/PageHeader.tsx`: title, subtitle, actions, breadcrumb.
- `src/components/common/MetricCard.tsx`: card thong ke nhat quan.
- `src/components/common/StatusTag.tsx`: tag risk/status code.
- `src/components/common/Toolbar.tsx`: filter/action row.
- `src/components/common/DataCard.tsx` neu can, nhung khong tao abstraction qua muc.
- `src/utils/format.ts`: format date, currency, percent, duration neu dang lap lai.

Neu dung ProComponents:

- Dung `PageContainer` cho page shell.
- Dung `ProTable` cho Timesheet/Visits/Orders/Audit neu giup giam code filter/table.
- Dung `ProForm`/`QueryFilter` cho filter.
- Khong them ProComponents neu lam vo build hoac qua phuc tap.

## 6. Yeu cau theo tung man hinh

### 6.1 Login

Hien tai dang hoi "demo". Lam lai thanh login noi bo gon:

- Nen trung tinh, khong gradient neon.
- Card dang enterprise, max width 400-440.
- Logo/icon nho, title `DMS AI Admin`.
- Subtitle ngan: `Quản trị dữ liệu thực địa và chấm công`.
- Form dung AntD chuan, validation ro.
- Khong can social login.
- Khong show credential mau tren UI neu khong co yeu cau.

### 6.2 App Shell / Layout

Lam thanh layout admin dung chuan:

- Sidebar co logo, menu group ro:
  - Tổng quan
  - Chấm công
  - Viếng thăm
  - Đơn hàng
  - KPI & Kho
  - Phân tích AI
  - Đồng bộ
  - Cấu hình
  - Nhật ký
- Menu icon nhat quan tu `@ant-design/icons`.
- Header co breadcrumb/page context, right side co user avatar/dropdown/logout.
- Active menu dung route hien tai.
- Content padding 24 desktop, 16 mobile.
- Bo tat ca trang thai trang tri thua.

### 6.3 Dashboard

Dashboard phai la man tong quan quan tri, khong landing.

Can co:

- Top metric cards:
  - Tổng nhân viên.
  - Ngày công cần kiểm tra.
  - Tỷ lệ thiếu check-in/out.
  - Tỷ lệ đúng tuyến.
  - Doanh số/KPI tổng quan neu co data.
- Section canh bao:
  - `Alert`/`List` cac bat thuong quan trong.
  - Top nhân viên rủi ro cao.
  - Ngày phát sinh nhiều lỗi.
- Charts:
  - Chấm công theo risk level.
  - Xu hướng lỗi theo ngày.
  - Visit/order/KPI neu co.
- Table mini:
  - Recent abnormal timesheet rows.
  - Recent sync jobs.
- Actions:
  - Xem chấm công.
  - Chạy phân tích AI.
  - Đồng bộ dữ liệu.

Khong dung hero, khong dung card qua to.

### 6.4 Timesheet

Day la man hinh quan trong nhat. Phai data-dense va de thao tac.

Can co:

- Page header: `Chấm công`, subtitle ngan.
- Summary strip: total days, average score, GOOD/CHECK/ABNORMAL counts, missing data count.
- Filter toolbar:
  - Range date.
  - Employee code/name.
  - Department.
  - Risk level.
  - Status code.
  - Button search/reset/export.
- Table:
  - Fixed header neu du lieu dai.
  - Columns co width ro.
  - Employee, department, date, check-in, check-out, work hours, score, risk, status tags, visit correlation, actions.
  - Risk/score render bang `Tag`/`Progress` nho.
  - Empty/loading/skeleton ro.
- Drawer detail:
  - Dung `Descriptions` cho employee/date/score.
  - `Timeline` cho events.
  - `Card`/`List` cho reasons/suggestions.
  - Visit same-day section.
  - Re-evaluate action.
  - Neu co anh: show thumbnail co privacy warning, khong face recognition.
- Khong lam drawer qua mau me.

### 6.5 Visits

Can co:

- Summary: total visits, on-route rate, missed/abnormal routes.
- Filter toolbar: date, employee, customer, route status.
- Table chuan: employee, customer, time, route, location, status.
- Map placeholder neu chua co map, nhung khong ve fake map loe loet.
- Drawer/detail customer + visit.

### 6.6 Orders

Can co:

- Summary: revenue, orders count, average order, abnormal orders.
- Filter toolbar.
- Table: order code, employee, customer, date, amount, status, items count.
- Drawer: order detail + products.
- Highlight abnormal order bang Alert/Tag, khong dung mau qua gat.

### 6.7 KPI & Inventory

Can tach bang `Tabs`:

- Tab KPI:
  - Metric cards achieved/not achieved.
  - Table employee KPI.
  - Progress bars dung AntD.
- Tab Inventory:
  - Stock movement summary.
  - Table product/warehouse.
  - Alerts for large movement/low stock.
- Chart duoc boc gon trong `Card`, khong lam dashboard mau me.

### 6.8 AI Analysis

Phai lam AI thanh "tro ly quan tri" nghiem tuc, khong branding AI qua tay.

Can co:

- Page title: `Phân tích quản trị`.
- Button `Tạo phân tích`.
- Form tao analysis dung `Modal` hoac `Drawer`, RangePicker, scope options.
- Khi dang chay: `Spin`, `Steps`, hoac status card.
- Report detail:
  - Executive summary.
  - Key findings.
  - Risk groups.
  - Suggested actions.
  - Data basis/source period.
  - Approval status.
- Luon co note nho: AI dien giai tu du lieu da tinh, rule engine moi la nguon diem cham cong.
- Khong dung robot/gradient lon.

### 6.9 Sync Center

Can co workflow ro:

- Endpoint select dung `Select` searchable.
- Date range.
- Buttons:
  - Preview.
  - Start sync.
- Job status card:
  - Pending/running/completed/failed.
  - Progress.
  - Logs trong `Collapse`/`Typography.Paragraph code`.
- Preview data:
  - Dung `Table` hoac JSON viewer gon, khong raw pre qua lon.
- Job history:
  - Table co status tag, processed/total, created at, actions.

### 6.10 Settings

Cau hinh phai trong, it gay so:

- Dung `Tabs`:
  - Rule Engine.
  - AI Gateway.
  - Mobiwork.
  - Security/General neu co.
- Rule Engine:
  - Form chia group.
  - InputNumber co addon/unit.
  - Alert nho giai thich rule engine tinh diem khong can AI.
- AI Gateway:
  - Provider, base URL, wire API, text model, vision model, effort, verbosity.
  - API key masked.
  - Test Text AI/Test Vision AI buttons.
  - Privacy notice cho Vision.
- Mobiwork:
  - API base, credentials configured masked.
  - Test credentials/preview endpoint neu backend co.
- Khong show full secret.

### 6.11 Audit

Can co:

- Filter: action, date range, user.
- Table: time, actor, action, detail, IP.
- Severity/status tag.
- Long detail co `Typography.Paragraph ellipsis`.

## 7. Functional constraints

Khong duoc lam mat chuc nang hien co:

- Login/logout.
- Timesheet list/filter/detail/evaluate/export.
- Visits/orders/KPI/inventory pages.
- AI text test/analyze/report approve.
- Vision test/analyze.
- Sync preview/run/job history.
- Settings save.
- Audit logs.

Khong duoc:

- Revert backend.
- Doi endpoint API khong can thiet.
- In secret/token/API key ra console/UI.
- Them face recognition UI.
- Them fake data neu API co data that.
- Lam UI chi dep o desktop ma vo mobile.

## 8. Ky thuat implement

Lam theo thu tu:

1. Audit hien trang UI:
   - Liet ke component/page dang co.
   - Tim deprecated AntD props: `visible`, `Timeline.Item`, static `message`, etc.
   - Tim style inline qua nhieu/neon/gradient/shadow qua tay.

2. Tao theme/layout chung:
   - Theme tokens.
   - App shell.
   - Common page header/metric/status components.

3. Refactor tung page:
   - Dashboard.
   - Timesheet.
   - Sync Center.
   - Settings.
   - AI Analysis.
   - Visits/Orders/KPI/Inventory/Audit.

4. Browser verify:
   - Desktop 1440x1000.
   - Tablet 768x1024.
   - Mobile 390x844.
   - Check console errors = 0.
   - Check no overlap.
   - Check buttons/text not clipped.

5. Quality gates:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm build`

## 9. Acceptance criteria

Done khi dat tat ca:

- UI nhin nhu admin enterprise AntD, khong con vibe plastic/AI demo.
- Tat ca page co header, action, loading, empty, error state phu hop.
- Sidebar/header nhat quan.
- Table/filter/drawer chuan AntD, dung mobile.
- Settings che giau secret.
- AI/Vision messaging nghiem tuc, khong hype.
- Khong co AntD deprecated warning trong console.
- Browser console error = 0 tren flow:
  - Login.
  - Dashboard.
  - Timesheet list + drawer.
  - Settings + Test Text AI + Test Vision AI.
  - Sync preview page.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.

## 10. Deliverables

Sau khi lam xong, tra loi ngan gon:

- Cac file da sua/chinh.
- Cac thay doi UI chinh.
- Ket qua test.
- Van de con lai neu co.

Khong viet dai lan man. Khong claim pass neu chua chay test.

