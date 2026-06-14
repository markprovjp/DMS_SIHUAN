import {
  useQuery,
  keepPreviousData,
  UseQueryOptions,
} from "@tanstack/react-query";
import axios from "axios";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UseTableQueryParams<F, T> {
  /** URL cố định của endpoint. */
  url: string;
  /** Filter object sẽ merge thành query string. */
  filters: F;
  /** Current page, 1-based. */
  page: number;
  pageSize: number;
  /** React Query options bổ sung. */
  queryOptions?: Omit<
    UseQueryOptions<PaginatedResponse<T>>,
    "queryKey" | "queryFn"
  >;
}

/** Generic server-side paginated table query.
 *  Dùng React Query giữ cache + refetch. Giữ previous data khi đổi page cho UX mượt.
 *
 *  Ví dụ:
 *    const { data, isLoading, total, page, setPage } = useTableQuery({
 *      url: "/api/orders",
 *      filters,
 *      page, pageSize,
 *    });
 */
export function useTableQuery<F extends Record<string, unknown>, T = any>({
  url,
  filters,
  page,
  pageSize,
  queryOptions,
}: UseTableQueryParams<F, T>) {
  const params: Record<string, string | number> = { page, pageSize };
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "" && v !== undefined) {
      params[k] = v as any;
    }
  }

  return useQuery<PaginatedResponse<T>>({
    queryKey: [url, params],
    queryFn: async () => {
      const res = await axios.get(url, { params });
      // Hỗ trợ cả 2 dạng: server mới trả {items,total,page,pageSize} hoặc cũ trả mảng
      if (Array.isArray(res.data)) {
        return {
          items: res.data,
          total: res.data.length,
          page: 1,
          pageSize: res.data.length,
        };
      }
      return res.data;
    },
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}
