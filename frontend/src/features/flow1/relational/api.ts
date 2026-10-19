import { apiClient } from "../../../shared/api/apiClient";
import axios from "axios";
import { get, post } from "../api";
import type { Trip } from "../api";

export type Horse = { horseId: string; name: string; microchipIso: string; passportNo: string | null; version: string; hasDocuments: boolean; selectable: boolean; breed?: string | null; sex?: string | null; dob?: string | null };
export type Payment = { paymentId: string; version: string; amount: number; receivedAmount: number | null; status: string; transactionCode: string | null; paidAt: string | null; reviewRequired: boolean; reviewReason: string | null; method: string | null; currency: string };
export type OperationalTrip = { tripId: string; version: string; status: string; deploymentStatus: string | null; eventId: string | null; reason: string | null; routingAcknowledgedBy: string | null; documentsAcknowledgedBy: string | null };
export type Contract = { contractId: string; version: string; status: string; isCurrent: boolean; totalPrice: number; depositAmount: number; signDeadline: string | null; depositDeadline: string | null; signedAt: string | null; pdfSha256: string | null; cancellationId: string | null; cancellationStatus: string | null; cancellationReason: string | null; cancellationDecision: string | null; extensionTarget: string | null; extensionReason: string | null; paidAmount: number; invoiceStatus: string | null; payments: Payment[]; trip: OperationalTrip | null; preparationCutoff?: string | null; currency: string; relationalTermsReady: boolean; hasAcceptanceEvidence: boolean };
export type WorkflowContract = Contract & {workflowVersion:number;contractVersion:number;depositPercent:number;insuranceAmount:number;terms:string;termsAcceptedAtUtc:string|null;refundStatus:string|null;refundAmount:number|null;refundReference:string|null;changes:{changeId:string;status:string;reason:string;decision:string|null;sections:string[]}[];history:{action:string;reason:string;actorId:string;atUtc:string;previousDeadline:string|null;newDeadline:string|null}[]};
export type Submission = { trip: Trip; departureAt: string; deliveryAt: string; purpose: string; pickupContact: { name: string; phone: string }; receiver: { name: string; phone: string }; horses: { horseId: string; version: string }[]; declaredValueUsd?: number | null };
export type RequestDocument = { documentId: string; horseId: string; documentType: string; status: string };
export type BaselineUpload = { file: File; horseId: string };
export type Request = { requestId: string; version: string; status: string; departure: string; destination: string; departureAt: string | null; deliveryAt: string | null; managerNotes: string | null; distanceKm: number | null; preparationDays: number | null; pickupContactName: string | null; pickupContactPhone: string | null; receiverName: string | null; receiverPhone: string | null; horses: Horse[]; contracts: Contract[]; input?: Submission | null; mapAttribution?: string | null; customerName?: string | null; customerEmail?: string | null; declaredValueUsd?: number | null; documents?: RequestDocument[] };
export type Handoff = { trip: OperationalTrip; requestId: string; departure: string; destination: string; departureAt: string; deliveryAt: string; contractId: string; pdfSha256: string; horses: Horse[] };
const baseURL = import.meta.env.VITE_API_URL || "/api";
export async function download(path: string, name: string) {
  const r = await apiClient.get(path, { baseURL, responseType: "blob" });
  const mime = String(r.headers["content-type"] || r.data.type || "").split(";")[0];
  const extension = ({ "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg" } as Record<string, string>)[mime] || "";
  const url = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = url; a.download = /\.[a-z0-9]+$/i.test(name) ? name : name + extension; a.click(); URL.revokeObjectURL(url);
}
export const relational = {
  pdfUrl: async (path: string) => { const r = await apiClient.get(path, { baseURL, responseType: "blob" }); return URL.createObjectURL(r.data); },
  list: (manager = false) => get<Request[]>(`/${manager ? "manager" : "customer"}/requests`),
  detail: (id: string, manager = false) => get<Request>(`/${manager ? "manager" : "customer"}/requests/${encodeURIComponent(id)}`),
  horses: (departureAt?: string, deliveryAt?: string, requestId?: string) => get<Horse[]>("/customer/horses/selectable" + (departureAt && deliveryAt ? `?${new URLSearchParams({departureAt, deliveryAt, ...(requestId ? {requestId} : {})})}` : "")),
  horse: (form: FormData, key: string) => post<Horse>("/customer/horses", form, key),
  submit: (input: Submission, key: string, id?: string, version?: string) => post<Request>(id ? `/customer/requests/${id}/revision` : "/customer/requests", id ? { input, version } : input, key),
  submitDocuments: (input: Submission, documents: BaselineUpload[], key: string, id?: string, version?: string) => {
    const form = new FormData();
    form.append("payload", JSON.stringify(input));
    if (version) form.append("version", version);
    for (const document of documents) { form.append("horseIds", document.horseId); form.append("files", document.file); }
    return post<Request>(id ? `/customer/requests/${encodeURIComponent(id)}/revision-with-documents` : "/customer/requests/with-documents", form, key).catch(error => {
      if (!id && axios.isAxiosError(error) && error.response?.status === 404)
        throw new Error("Backend đang chạy chưa bật phần giá trị khai báo/hồ sơ bổ sung. Yêu cầu này chưa được lưu; vui lòng liên hệ quản lý.");
      throw error;
    });
  },
  action: <T,>(url: string, input: object, key?: string) => post<T>(url, input, key),
  queue: () => get<Handoff[]>("/operations/flow1/trips"),
  returned: (id: string) => get<{ requestId: string; contract: Contract }>(`/customer/payments/${encodeURIComponent(id)}/status`),
};
