import { apiClient } from "../../shared/api/apiClient";
import { get, post } from "./api";
import type { Submission } from "./api";
export type Deployment = { contractId: string; requestId: string; tripId: string; status: string; tripStatus: string; version: number;
  canConfirm: boolean; canHold: boolean; canResume: boolean; history: { action: string; reason: string | null; atUtc: string }[];
  acknowledgements: { stream: string; eventId: string; actor: string; atUtc: string }[] };
export type Handoff = { schemaVersion: number; eventId: string; requestId: string; tripId: string; contractId: string;
  requestVersion: number; planVersion: number; contractVersion: number; documentHash: string;
  plan: { departureDate: string; deliveryDate: string; plannedDepartureAt: string | null; preparationDays: number; vehicleCount: number;
    stallsRequired: number; resources: string; departureGateway: string | null; arrivalGateway: string | null; groundLegScope: string };
  request: Submission; documentReviewStatus: string; acknowledgements: Deployment["acknowledgements"] };
const path = (id: string, manager: boolean) => `/${manager ? "manager" : "customer"}/contracts/${encodeURIComponent(id)}/deployment`;
const handoff = (trip: string) => `/operations/trips/${encodeURIComponent(trip)}/flow1-handoff`;
export const deploymentApi = {
  get: (id: string, manager: boolean) => get<Deployment>(path(id, manager)),
  act: (id: string, action: string, input: { expectedVersion: number; reason: string }, key: string) => post<Deployment>(path(id, true) + `/${action}`, input, key),
  queue: () => get<Deployment[]>("/operations/flow1-work"),
  handoff: (trip: string) => get<Handoff>(handoff(trip)),
  ack: (trip: string, input: { expectedVersion: number; eventId: string; stream: string }, key: string) => post<Handoff>(handoff(trip) + "/acknowledgements", input, key),
  document: async (trip: string, horse: string, version: number, kind: string) => {
    const r = await apiClient.get(`/operations/trips/${encodeURIComponent(trip)}/horses/${encodeURIComponent(horse)}/documents/${version}/${kind}`,
      { baseURL: import.meta.env.VITE_API_URL || "/api", responseType: "blob" });
    const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = url; a.download = `horse-${kind}-${version}`; a.click(); URL.revokeObjectURL(url);
  },
};
