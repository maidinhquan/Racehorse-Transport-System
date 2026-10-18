import { apiClient } from "../../../shared/api/apiClient";
import { get, post } from "../api";
import type { Trip } from "../api";

export type Horse = { horseId: string; name: string; microchipIso: string; passportNo: string | null; version: string; hasDocuments: boolean; selectable: boolean; breed?: string | null; sex?: string | null; dob?: string | null };
export type Payment = { paymentId: string; version: string; amount: number; receivedAmount: number | null; status: string; transactionCode: string | null; paidAt: string | null; reviewRequired: boolean; reviewReason: string | null; method: string | null; currency: string };
export type OperationalTrip = { tripId: string; version: string; status: string; deploymentStatus: string | null; eventId: string | null; reason: string | null; routingAcknowledgedBy: string | null; documentsAcknowledgedBy: string | null };
export type Contract = { contractId: string; version: string; status: string; isCurrent: boolean; totalPrice: number; depositAmount: number; signDeadline: string | null; depositDeadline: string | null; signedAt: string | null; pdfSha256: string | null; cancellationId: string | null; cancellationStatus: string | null; cancellationReason: string | null; cancellationDecision: string | null; extensionTarget: string | null; extensionReason: string | null; paidAmount: number; invoiceStatus: string | null; payments: Payment[]; trip: OperationalTrip | null; preparationCutoff?: string | null; currency: string; relationalTermsReady: boolean; hasAcceptanceEvidence: boolean };
export type Submission = { trip: Trip; departureAt: string; deliveryAt: string; purpose: string; pickupContact: { name: string; phone: string }; receiver: { name: string; phone: string }; horses: { horseId: string; version: string }[] };
export type Request = { requestId: string; version: string; status: string; departure: string; destination: string; departureAt: string | null; deliveryAt: string | null; managerNotes: string | null; distanceKm: number | null; preparationDays: number | null; pickupContactName: string | null; pickupContactPhone: string | null; receiverName: string | null; receiverPhone: string | null; horses: Horse[]; contracts: Contract[]; input?: Submission | null; mapAttribution?: string | null; customerName?: string | null; customerEmail?: string | null };
export type Handoff = { trip: OperationalTrip; requestId: string; departure: string; destination: string; departureAt: string; deliveryAt: string; contractId: string; pdfSha256: string; horses: Horse[] };
const baseURL = import.meta.env.VITE_API_URL || "/api";
export async function download(path: string, name: string) {
  const r = await apiClient.get(path, { baseURL, responseType: "blob" });
  const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export const relational = {
  pdfUrl: async (path: string) => { const r = await apiClient.get(path, { baseURL, responseType: "blob" }); return URL.createObjectURL(r.data); },
  list: (manager = false) => get<Request[]>(`/${manager ? "manager" : "customer"}/requests`),
  detail: (id: string, manager = false) => get<Request>(`/${manager ? "manager" : "customer"}/requests/${encodeURIComponent(id)}`),
  horses: (departureAt?: string, deliveryAt?: string, requestId?: string) => get<Horse[]>("/customer/horses/selectable" + (departureAt && deliveryAt ? `?${new URLSearchParams({departureAt, deliveryAt, ...(requestId ? {requestId} : {})})}` : "")),
  horse: (form: FormData, key: string) => post<Horse>("/customer/horses", form, key),
  submit: (input: Submission, key: string, id?: string, version?: string) => post<Request>(id ? `/customer/requests/${id}/revision` : "/customer/requests", id ? { input, version } : input, key),
  action: <T,>(url: string, input: object, key?: string) => post<T>(url, input, key),
  queue: () => get<Handoff[]>("/operations/flow1/trips"),
  returned: (id: string) => get<{ requestId: string; contract: Contract }>(`/customer/payments/${encodeURIComponent(id)}/status`),
};
