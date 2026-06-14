import * as fs from "fs";
import * as path from "path";

export interface MobiworkConfig {
  apiBase?: string;
  userId: string;
  token: string;
}

export interface EndpointParameter {
  name: string;
  required: boolean;
  description: string;
  schemaType: string;
  default: any;
  enum?: string[];
}

export interface EndpointMetadata {
  path: string;
  method: string;
  tag: string;
  summary: string;
  operationId: string;
  parameters: EndpointParameter[];
}

// Simple sleep helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MobiworkClient {
  private config: MobiworkConfig;
  private endpoints: EndpointMetadata[] = [];

  constructor(config: MobiworkConfig) {
    this.config = {
      apiBase: "https://openapi.mobiwork.vn",
      ...config,
    };
    this.loadEndpoints();
  }

  private loadEndpoints() {
    try {
      // Try local package copy first
      const localPath = path.join(__dirname, "endpoints.json");
      if (fs.existsSync(localPath)) {
        this.endpoints = JSON.parse(fs.readFileSync(localPath, "utf8"));
      } else {
        // Fallback to reference path
        const fallbackPath = path.join(
          __dirname,
          "../../../../DMS/data/endpoints.json",
        );
        if (fs.existsSync(fallbackPath)) {
          this.endpoints = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
        }
      }
    } catch (e) {
      console.warn(
        "Failed to load Mobiwork endpoint metadata, using empty list:",
        e,
      );
    }
  }

  public getEndpoints(): EndpointMetadata[] {
    return this.endpoints;
  }

  public getEndpoint(pathname: string): EndpointMetadata | undefined {
    return this.endpoints.find((e) => e.path === pathname);
  }

  public hasCredentials(): boolean {
    return !!(
      this.config.userId &&
      this.config.token &&
      this.config.userId !== "your_user_id_here" &&
      this.config.token !== "your_token_here"
    );
  }

  private makeAuthHeader(): string {
    const raw = `${this.config.userId}:${this.config.token}`;
    return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
  }

  private buildUrl(pathname: string, params: Record<string, any> = {}): URL {
    if (!pathname || !pathname.startsWith("/OpenAPI/V1/")) {
      throw new Error(
        "Invalid Mobiwork OpenAPI path. Path must start with /OpenAPI/V1/",
      );
    }

    const apiBase = this.config.apiBase || "https://openapi.mobiwork.vn";
    const url = new URL(
      pathname,
      apiBase.endsWith("/") ? apiBase : `${apiBase}/`,
    );

    // Normalize parameter overrides
    const normalized = { ...params };
    if (
      pathname === "/OpenAPI/V1/Route" &&
      Number(normalized.page_size || 0) > 10
    ) {
      normalized.page_size = 10; // Mobiwork Route endpoint has max page size of 10
    }

    for (const [key, value] of Object.entries(normalized)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    return url;
  }

  public async call(
    pathname: string,
    params: Record<string, any> = {},
    attempt = 1,
  ): Promise<any> {
    if (!this.hasCredentials()) {
      throw new Error(
        "Missing Mobiwork credentials. Please configure MOBIWORK_USER_ID and MOBIWORK_TOKEN.",
      );
    }

    const endpoint = this.getEndpoint(pathname);
    if (!endpoint) {
      throw new Error(`Unsupported GET endpoint: ${pathname}`);
    }

    const url = this.buildUrl(pathname, params);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: this.makeAuthHeader(),
        },
      });

      const bodyText = await response.text();
      let body: any;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (response.status === 429 && attempt < 4) {
        await sleep(1300 * attempt);
        return this.call(pathname, params, attempt + 1);
      }

      if (!response.ok) {
        const error = new Error(
          `Mobiwork API returned HTTP ${response.status}.`,
        ) as any;
        error.statusCode = response.status;
        error.apiBody = body;
        throw error;
      }

      return body;
    } catch (e: any) {
      if (attempt < 4 && (e.statusCode === 429 || !e.statusCode)) {
        await sleep(1300 * attempt);
        return this.call(pathname, params, attempt + 1);
      }
      throw e;
    }
  }

  public extractRecords(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (payload.data && typeof payload.data === "object") return [payload.data];
    return [payload];
  }

  public async callAll(
    pathname: string,
    params: Record<string, any> = {},
    options: { fetchAll?: boolean; pageSize?: number; maxPages?: number } = {},
  ): Promise<any> {
    const endpoint = this.getEndpoint(pathname);
    if (!endpoint) {
      throw new Error(`Unsupported GET endpoint: ${pathname}`);
    }

    const hasPageParams =
      endpoint.parameters.some((p) => p.name === "page_size") &&
      endpoint.parameters.some((p) => p.name === "page_number");

    if (!options.fetchAll || !hasPageParams) {
      return this.call(pathname, params);
    }

    const requestedPageSize = Number(
      params.page_size || options.pageSize || 1000,
    );
    const pageSize =
      pathname === "/OpenAPI/V1/Route"
        ? Math.min(requestedPageSize, 10)
        : requestedPageSize;
    const startPage = Number(params.page_number || 1);
    const maxPages = Number(options.maxPages || 100);
    const merged: any[] = [];
    let lastBody: any = null;

    for (let offset = 0; offset < maxPages; offset++) {
      const pageNumber = startPage + offset;
      const pageBody = await this.call(pathname, {
        ...params,
        page_size: pageSize,
        page_number: pageNumber,
      });

      lastBody = pageBody;
      const pageRecords = this.extractRecords(pageBody);
      merged.push(...pageRecords);

      const total = Number(pageBody && pageBody.total);
      if (Number.isFinite(total) && total > 0 && merged.length >= total) break;
      if (pageRecords.length === 0 || pageRecords.length < pageSize) break;
    }

    if (lastBody && typeof lastBody === "object" && !Array.isArray(lastBody)) {
      return {
        ...lastBody,
        data: merged,
        exported_pages: Math.ceil(merged.length / pageSize),
      };
    }

    return merged;
  }
}
