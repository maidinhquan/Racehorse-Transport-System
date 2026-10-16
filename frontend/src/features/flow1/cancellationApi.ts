import { get, post } from "./api";
export type Cancellations = { contractId: string; version: number; canRequest: boolean; canReview: boolean;
  items: { id: string; status: string; customerReason: string; requestedAtUtc: string; decisionReason: string | null; atUtc: string }[] };
const path = (id: string, manager: boolean) => `/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}/cancellation-requests`;
export const cancellationApi = {
  get: (id: string, manager = false) => get<Cancellations>(path(id, manager)),
  request: (id: string, input: { expectedVersion: number; reason: string }, key: string) => post<Cancellations>(path(id, false), input, key),
  decide: (id: string, cancellationId: string, approve: boolean, input: { expectedVersion: number; expectedLedgerVersion: number;
    expectedDeadlineVersion: number; reason: string; reconciliationConfirmed: boolean }, key: string) =>
    post<Cancellations>(path(id, true) + `/${encodeURIComponent(cancellationId)}/${approve ? "approve" : "reject"}`, input, key),
};
