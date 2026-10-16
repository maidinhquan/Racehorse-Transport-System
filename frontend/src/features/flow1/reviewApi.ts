import { get, post } from "./api";
import type { RequestView, Submission } from "./api";
import { apiClient } from "../../shared/api/apiClient";

export type Line = { category: string; description: string; quantity: number; unitPrice: number };
export type Question = { id: string; question: string; askedBy: string; askedAtUtc: string; answer: string | null };
export type Change = { id: string; reason: string; proposal: Submission; status: string; baseRequestVersion: number; decisionReason?: string };
export type Contract = { contractId: string; status: string; version: number; currency: string; total: number; deposit: number; lines: Line[] };
export type CustomerReview = { version: number; requestVersion: number; feedback: string | null; revisionFields: string[];
  questions: Question[]; changes: Change[]; notices: { id: string; message: string; createdAtUtc: string }[];
  contract: Contract | null; recoveryRequired: boolean; allowedActions: string[] };
export type PlanInput = { departureDate: string; deliveryDate: string; preparationDays: number; vehicleCount: number;
  stallsRequired: number; resources: string; departureGateway: string | null; arrivalGateway: string | null;
  groundLegScope: string; additionalCosts: { category: string; description: string; quantity: number; unitCost: number }[] };
export type Plan = { input: PlanInput; requestVersion: number; pricingPolicyVersion: string; estimatedCost: number;
  floor: number; suggested: number; roadDistanceKm: number | null; minimumPreparationDays: number; attribution: string | null };
export type ManagerReview = { request: RequestView; version: number; review: { requestVersion: number; feedback: string | null;
  revisionFields: string[]; questions: Question[]; changes: Change[]; pending: { operation: { action: string; actor: string } } | null };
  plan: Plan | null; contract: Contract | null; allowedActions: string[]; belowFloorReason?: string | null };
const url = (id: string, manager: boolean) => `/${manager ? "manager" : "customer"}/requests/${encodeURIComponent(id)}`;
export const reviewApi = {
  customer: (id: string) => get<CustomerReview>(url(id, false) + "/review"),
  manager: (id: string) => get<ManagerReview>(url(id, true)),
  list: (status = "", page = 1) => get<{ items: RequestView[]; page: number; pageSize: number; totalCount: number }>(
    "/manager/requests?" + new URLSearchParams({ ...(status ? { status } : {}), page: String(page), pageSize: "20" })),
  actManager: (id: string, action: string, input: Record<string, unknown>, key: string) => post<ManagerReview>(url(id, true) + "/" + action, input, key),
  actCustomer: (id: string, action: string, input: Record<string, unknown>, key: string) => post<CustomerReview>(url(id, false) + "/" + action, input, key),
  document: async (id: string, horse: string, version: number, kind: string) => {
    const r = await apiClient.get(url(id, true) + `/horses/${encodeURIComponent(horse)}/documents/${version}/${kind}`,
      { baseURL: import.meta.env.VITE_API_URL || "/api", responseType: "blob" });
    const objectUrl = URL.createObjectURL(r.data); const link = document.createElement("a");
    link.href = objectUrl; link.download = `${horse}-${kind}-${version}`; link.click(); URL.revokeObjectURL(objectUrl);
  },
};
// Keep the same key on network retries, change it when action/input/version changes.
export function operationKey(ref: { current: { hash: string; key: string } }, action: string, body: unknown) {
  const hash = JSON.stringify({ action, body });
  if (ref.current.hash !== hash) ref.current = { hash, key: crypto.randomUUID() };
  return ref.current.key;
}
