import { apiClient } from "../../shared/api/apiClient";
import { get, post } from "./api";
export type Publication = { contractId: string; version: number; status: string; currency: string; total: number; deposit: number;
  originalCompletionDeadline: string; documentHash: string; documentSizeBytes: number; templateVersion: string; overdue: boolean; recoveryRequired: boolean };
export const publicationApi = {
  get: (id: string, manager: boolean) => get<Publication | null>(`/${manager ? "manager" : "customer"}/contracts/${id}/publication`),
  send: (id: string, input: unknown, key: string) => post<Publication>(`/manager/contracts/${id}/send`, input, key),
  recover: (id: string) => post<Publication>(`/manager/contracts/${id}/publication/recover`, {}),
  discard: (id: string, reason: string) => post<null>(`/manager/contracts/${id}/publication/discard`, { reason }),
  pdf: async (id: string, manager: boolean) => {
    const r = await apiClient.get(`/${manager ? "manager" : "customer"}/contracts/${id}/pdf`, {
      baseURL: import.meta.env.VITE_API_URL || "/api", responseType: "blob" });
    return URL.createObjectURL(r.data);
  },
};
