import { apiClient } from "../../shared/api/apiClient";
import { get, post } from "./api";
export type Payment = { paymentId: string; version: number; method: string; status: string; declaredAmount: number; verifiedAmount: number;
  reference: string | null; receivedAtUtc: string | null; reason: string | null; memo: string | null; hasProof: boolean; late: boolean };
export type Payments = { contractId: string; invoiceId: string; contractStatus: string; requestStatus: string; requiredDeposit: number;
  verifiedAmount: number; outstandingAmount: number; excessAmount: number; paymentStatus: string; effectiveDeadline: string; deadlineVersion: number;
  canSubmit: boolean; bankName: string | null; bankAccount: string | null; beneficiary: string | null; transferContent: string; payments: Payment[];
  activation: { tripId: string; atUtc: string; scheduleNeedsReview: boolean } | null; financialReviewRequired: boolean; vnpayAvailable?: boolean; ledgerVersion?: number; overdue?: boolean };
export type GatewaySession = { paymentId: string; requestId: string; paymentUrl: string; expiresAtUtc: string; requestedAmount: number };
const path = (id: string, manager = false) => `/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}/payments`;
export const paymentApi = {
  get: (id: string, manager = false) => get<Payments>(path(id, manager)),
  session: (id: string, key: string) => post<GatewaySession>(path(id) + "/vnpay-sessions", {}, key),
  status: (id: string) => get<{ requestId: string; paymentId: string; status: string; summary: Payments }>(`/customer/payments/${encodeURIComponent(id)}`),
  cancel: (id: string, input: { expectedDeadlineVersion: number; reason: string; reconciliationConfirmed: boolean }, key: string) => post<Payments>(path(id, true) + "/cancel-overdue", input, key),
  review: (id: string, input: { expectedLedgerVersion: number; expectedDeadlineVersion: number; reason: string; reviewedActualReceipts: boolean }, key: string) => post<Payments>(path(id, true) + "/financial-review", input, key),
  reviewHistory: (id: string) => get<{ version: number; items: { action: string; actor: string; reason: string | null; atUtc: string }[] }>(path(id, true) + "/financial-review"),
  submit: (id: string, data: FormData, key: string) => post<Payments>(path(id) + "/bank-proofs", data, key),
  confirm: (id: string, paymentId: string, input: { expectedVersion: number; receivedAmount: number; bankReference: string; receivedAtUtc: string }, key: string) =>
    post<Payments>(path(id, true) + `/${encodeURIComponent(paymentId)}/confirm`, input, key),
  reject: (id: string, paymentId: string, input: { expectedVersion: number; reason: string }, key: string) =>
    post<Payments>(path(id, true) + `/${encodeURIComponent(paymentId)}/reject`, input, key),
  proof: async (id: string, p: string, manager: boolean) => {
    const r = await apiClient.get(path(id, manager) + `/${encodeURIComponent(p)}/proof`, { baseURL: import.meta.env.VITE_API_URL || "/api", responseType: "blob" });
    const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = url; a.download = "payment-proof"; a.click(); URL.revokeObjectURL(url);
  },
};
