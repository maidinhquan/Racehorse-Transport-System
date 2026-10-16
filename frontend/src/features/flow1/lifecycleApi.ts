import { get, post } from "./api";
export type Lifecycle = { contractId: string; status: string; version: number; canDecline: boolean; canExpire: boolean; canReissue: boolean;
  history: { action: string; reason: string | null; atUtc: string; replacementContractId: string | null; actor: string | null }[] };
const url = (id: string, manager: boolean) => `/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}`;
export const lifecycleApi = {
  get: (id: string, manager: boolean) => get<Lifecycle>(url(id, manager) + "/lifecycle"),
  close: (id: string, manager: boolean, input: unknown, key: string) => post<Lifecycle>(url(id, manager) + (manager ? "/expire" : "/decline"), input, key),
};
