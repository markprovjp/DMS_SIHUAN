import { Injectable } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import { SyncNormalizer } from "./normalizers/normalizer.interface";
import { SaleGroupNormalizer } from "./normalizers/salegroup.normalizer";
import { SaleNormalizer } from "./normalizers/sale.normalizer";
import { CustomerNormalizer } from "./normalizers/customer.normalizer";
import { ProductNormalizer } from "./normalizers/product.normalizer";
import { WarehouseNormalizer } from "./normalizers/warehouse.normalizer";
import { RouteNormalizer } from "./normalizers/route.normalizer";
import { TimesheetNormalizer } from "./normalizers/timesheet.normalizer";
import { VisitNormalizer } from "./normalizers/visit.normalizer";
import { OrderNormalizer } from "./normalizers/order.normalizer";
import { KpiNormalizer } from "./normalizers/kpi.normalizer";
import { InventoryNormalizer } from "./normalizers/inventory.normalizer";

export type SyncStreamDefinition = {
  streamName: string;
  endpoint: string;
  primaryKey: (record: any) => string | null;
  cursorField?: string;
  dependencies?: string[];
  normalizer: SyncNormalizer;
};

@Injectable()
export class SyncStreamRegistry {
  private streams: Map<string, SyncStreamDefinition> = new Map();

  constructor(private settingsService: SettingsService) {
    this.registerStreams();
  }

  private registerStreams() {
    const defaultPk = (r: any) => r.ma || r.id || null;

    const definitions: SyncStreamDefinition[] = [
      {
        streamName: "SaleGroup",
        endpoint: "/OpenAPI/V1/SaleGroup",
        primaryKey: defaultPk,
        normalizer: new SaleGroupNormalizer(),
      },
      {
        streamName: "Sale",
        endpoint: "/OpenAPI/V1/Sale",
        primaryKey: (r) => r.ma_nv || r.ma || null,
        dependencies: ["SaleGroup"],
        normalizer: new SaleNormalizer(),
      },
      {
        streamName: "Customer",
        endpoint: "/OpenAPI/V1/Customer",
        primaryKey: (r) => r.ma_kh || r.ma || r.makh || null,
        normalizer: new CustomerNormalizer(),
      },
      {
        streamName: "Product",
        endpoint: "/OpenAPI/V1/Product",
        primaryKey: (r) => r.ma_sp || r.ma || null,
        normalizer: new ProductNormalizer(),
      },
      {
        streamName: "Warehouse",
        endpoint: "/OpenAPI/V1/Warehouse",
        primaryKey: defaultPk,
        normalizer: new WarehouseNormalizer(),
      },
      {
        streamName: "Route",
        endpoint: "/OpenAPI/V1/Route",
        primaryKey: defaultPk,
        normalizer: new RouteNormalizer(),
      },
      {
        streamName: "TimesheetData",
        endpoint: "/OpenAPI/V1/TimesheetData",
        primaryKey: (r) => r.ma_nv || r.ma_nhan_vien || null,
        dependencies: ["Sale"],
        normalizer: new TimesheetNormalizer(this.settingsService),
      },
      {
        streamName: "VisitData",
        endpoint: "/OpenAPI/V1/VisitData",
        primaryKey: (r) => r.ma_nv || r.ma_nhan_vien || null,
        dependencies: ["Sale", "Customer"],
        normalizer: new VisitNormalizer(),
      },
      {
        streamName: "Order",
        endpoint: "/OpenAPI/V1/Order",
        primaryKey: (r) => r.ma_phieu || r.so_phieu || r.ma_don || null,
        dependencies: ["Sale", "Customer", "Product"],
        normalizer: new OrderNormalizer(),
      },
      {
        streamName: "KPI",
        endpoint: "/OpenAPI/V1/KPI",
        primaryKey: (r) => r.ma_nv || r.ma_nhan_vien || null,
        dependencies: ["Sale"],
        normalizer: new KpiNormalizer(),
      },
      {
        streamName: "Inventory",
        endpoint: "/OpenAPI/V1/Inventory",
        primaryKey: (r) => r.ma_phieu || r.so_phieu || null,
        dependencies: ["Warehouse", "Sale", "Product"],
        normalizer: new InventoryNormalizer(),
      },
    ];

    for (const def of definitions) {
      this.streams.set(def.endpoint, def);
      this.streams.set(def.streamName, def);
    }
  }

  getDefinition(endpointOrName: string): SyncStreamDefinition | undefined {
    return this.streams.get(endpointOrName);
  }

  getAllDefinitions(): SyncStreamDefinition[] {
    const unique = new Set(this.streams.values());
    return Array.from(unique);
  }
}
