-- Migration: add_perf_indexes
-- Add composite / single-column indexes for common query patterns
-- identified in production-readiness.md. Idempotent.

-- 1. TimesheetDay: composite (employeeId, date desc) cho filter theo NV + range
CREATE INDEX IF NOT EXISTS "TimesheetDay_employeeId_date_idx"
  ON "TimesheetDay"("employeeId", "date" DESC);

-- 2. TimesheetEvaluation: thường query theo riskLevel + sắp xếp theo date
CREATE INDEX IF NOT EXISTS "TimesheetEvaluation_riskLevel_idx"
  ON "TimesheetEvaluation"("riskLevel");

-- 3. Visit: composite (employeeId, date desc) cho filter theo NV + range
CREATE INDEX IF NOT EXISTS "Visit_employeeId_date_idx"
  ON "Visit"("employeeId", "date" DESC);

-- 4. Visit: composite (customerId, date desc) cho lịch sử KH
CREATE INDEX IF NOT EXISTS "Visit_customerId_date_idx"
  ON "Visit"("customerId", "date" DESC);

-- 5. Order: composite (employeeId, date desc)
CREATE INDEX IF NOT EXISTS "Order_employeeId_date_idx"
  ON "Order"("employeeId", "date" DESC);

-- 6. Order: status cho filter duyệt / từ chối
CREATE INDEX IF NOT EXISTS "Order_status_idx"
  ON "Order"("status");

-- 7. Order: customer + date
CREATE INDEX IF NOT EXISTS "Order_customerId_date_idx"
  ON "Order"("customerId", "date" DESC);

-- 8. KpiRecord: composite (employeeId, date desc) cho filter theo nhân viên + kỳ ngày
CREATE INDEX IF NOT EXISTS "KpiRecord_employeeId_date_idx"
  ON "KpiRecord"("employeeId", "date" DESC);

-- 9. InventoryDocument: warehouse + date cho filter nhanh
CREATE INDEX IF NOT EXISTS "InventoryDocument_warehouseId_date_idx"
  ON "InventoryDocument"("warehouseId", "date" DESC);

-- 10. AuditLog: thường filter theo action
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"
  ON "AuditLog"("action");

-- 11. AuditLog: composite (userId, createdAt desc) cho lịch sử user
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx"
  ON "AuditLog"("userId", "createdAt" DESC);

-- 12. AiAnalysisRun: status cho filter run đang chạy
CREATE INDEX IF NOT EXISTS "AiAnalysisRun_status_createdAt_idx"
  ON "AiAnalysisRun"("status", "createdAt" DESC);

-- 13. Employee: email thường được search (đã có UNIQUE, nhưng tối ưu cho ILIKE nếu cần)
-- Bỏ qua vì UNIQUE đã tạo index; thêm partial index cho active employees
CREATE INDEX IF NOT EXISTS "Employee_departmentId_idx"
  ON "Employee"("departmentId");

-- 14. Customer: filter theo tên (search)
CREATE INDEX IF NOT EXISTS "Customer_name_idx"
  ON "Customer"("name");
