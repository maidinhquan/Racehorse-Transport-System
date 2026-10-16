import { get, post } from "./api";
export type Deadlines = { contractId: string; version: number; originalCompletionDeadline: string; effectiveCompletionDeadline: string;
  overdue: boolean; canExtend: boolean; history: { version: number; previousDeadline: string; newDeadline: string; atUtc: string; reason: string | null; actor: string | null }[] };
export const deadlineApi = {
  get: (id: string, manager: boolean) => get<Deadlines>(`/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}/deadlines`),
  extend: (id: string, input: unknown, key: string) => post<Deadlines>(`/manager/contracts/${encodeURIComponent(id)}/extensions`, input, key),
};
