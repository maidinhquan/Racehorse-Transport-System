import { get, post } from "./api";
export type OtpChallenge = { challengeId: string; expiresAt: string; resendAt: string };
export type Acceptance = { contractId: string; version: number; status: string; overdue: boolean; recoveryRequired: boolean;
  receipt: { contractId: string; customerId: string; contractVersion: number; documentHash: string; method: string; signedAtUtc: string; invoiceId: string; deposit: number } | null;
  invoice: { invoiceId: string; amount: number; paidAmount: number; currency: string; status: string; dueAtUtc: string | null } | null };
const url = (id: string, manager: boolean) => `/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}`;
export const acceptanceApi = {
  get: (id: string, manager: boolean) => get<Acceptance>(url(id, manager) + "/acceptance"),
  otp: (id: string, input: unknown) => post<OtpChallenge>(url(id, false) + "/otp", input),
  sign: (id: string, input: unknown, key: string) => post<Acceptance>(url(id, false) + "/sign", input, key),
  recover: (id: string) => post<Acceptance>(url(id, true) + "/acceptance/recover", {}),
  discard: (id: string, reason: string) => post<Acceptance>(url(id, true) + "/acceptance/discard", { reason }),
};
