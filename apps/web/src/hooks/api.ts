import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { AxiosError } from "axios";

/** Helper fetch dùng React Query, throw đúng message từ server. */
export async function apiGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await axios.get<T>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await axios.post<T>(url, body);
  return res.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await axios.patch<T>(url, body);
  return res.data;
}

/** Extract error message từ AxiosError hoặc Error thường. */
export function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const ax = e as AxiosError<{ message?: string | string[] }>;
    const m = ax.response?.data?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return ax.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export { useQuery, useMutation, useQueryClient };
