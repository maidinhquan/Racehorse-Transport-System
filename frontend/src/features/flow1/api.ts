import { apiClient } from "../../shared/api/apiClient";
import { registrationErrorMessage } from "../auth/api/registrationApi";

export const flow1Error = registrationErrorMessage;
export type Location = { address: string; lat: number; lng: number; country: string; mapProvider?: string };
export type Trip = { pickup: Location; delivery: Location; preferredTransportMode: string; horseCount: number; desiredDepartureDate: string };
export type Estimate = { estimatedPrice: number; estimatedDeposit: number; roadDistanceKm: number | null;
  minimumPreparationDays: number; earliestDepartureDate: string; scope: string; attribution: string | null; currency: string };
export type Horse = { horseId: string; name: string; microchipIso: string; feiPassportNo: string;
  status: string; documentVersion: number; selectable: boolean; unavailableReason: string | null };
export type Contact = { name: string; phone: string };
export type Submission = { trip: Trip; deliveryDeadline: string; purpose: string; pickupContact: Contact;
  receiver: Contact & { isProxy: boolean }; horses: { horseId: string; documentVersion: number }[] };
export type RequestView = { requestId: string; status: string; departure: string; destination: string; expectedDate: string;
  committedDeadline: string; version: number; snapshot: { input: Submission; estimate: Estimate; receiverVerificationStatus: string } | null };
type Envelope<T> = { success: boolean; message: string; data: T };
const baseURL = import.meta.env.VITE_API_URL || "/api";
async function get<T>(url: string): Promise<T> {
  const r = await apiClient.get<Envelope<T>>(url, { baseURL });
  if (!r.data.success) throw new Error(r.data.message);
  return r.data.data;
}
async function post<T>(url: string, data: unknown, key?: string): Promise<T> {
  const r = await apiClient.post<Envelope<T>>(url, data, { baseURL, headers: {
    ...(key ? { "Idempotency-Key": key } : {}), ...(data instanceof FormData ? { "Content-Type": undefined } : {}),
  } });
  if (!r.data.success) throw new Error(r.data.message);
  return r.data.data;
}
export const flow1 = {
  search: (address: string, country: string, guest = false) => get<{ label: string; point: { longitude: number; latitude: number; countryCode: string }; attribution: string; provider?: string }[]>(
    `${guest ? "/public/estimates" : "/customer"}/locations/search?${new URLSearchParams({ address, country })}`),
  mapPreviewUrl: (point: Location) => `${baseURL.replace(/\/$/, "")}/public/maps/mapbox-preview?${new URLSearchParams({ lat: String(point.lat), lng: String(point.lng), country: point.country })}`,
  estimate: (trip: Trip, guest = false) => post<Estimate>(guest ? "/public/estimates" : "/customer/estimates", trip),
  horses: (departure?: string, deadline?: string) => get<Horse[]>("/customer/horses/selectable" +
    (departure && deadline ? `?${new URLSearchParams({ departure, deadline })}` : "")),
  createHorse: (data: FormData, key: string) => post<Horse>("/customer/horses", data, key),
  submit: (data: Submission, key: string) => post<RequestView>("/customer/requests", data, key),
  list: (page = 1) => get<{ items: RequestView[]; page: number; pageSize: number; totalCount: number }>(`/customer/requests?page=${page}&pageSize=20`),
  detail: (id: string) => get<RequestView>(`/customer/requests/${encodeURIComponent(id)}`),
  updateDocuments: (id: string, data: FormData, key: string) => post<{ version: number }>(`/customer/horses/${encodeURIComponent(id)}/documents`, data, key),
  download: async (id: string, version: number, kind: "photo" | "passport") => {
    const r = await apiClient.get(`/customer/horses/${encodeURIComponent(id)}/documents/${version}/${kind}`, { baseURL, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const link = document.createElement("a"); link.href = url; link.download = `${kind}-${version}`;
    link.click(); URL.revokeObjectURL(url);
  },
};
export const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
export const emptyTrip: Trip = { pickup: { address: "", lat: 0, lng: 0, country: "VN" },
  delivery: { address: "", lat: 0, lng: 0, country: "VN" }, preferredTransportMode: "ROAD", horseCount: 1, desiredDepartureDate: "" };
export const estimateSeed = "flow1-estimate-seed";
export function initialTrip(): Trip {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(estimateSeed) || "null");
    // Only trip estimate fields are retained between login and the wizard, never horses/files/contacts.
    if (parsed?.pickup?.country === "VN" && ["VN", "JP"].includes(parsed?.delivery?.country) &&
      typeof parsed.desiredDepartureDate === "string" && typeof parsed.horseCount === "number")
      return { pickup: parsed.pickup, delivery: parsed.delivery, preferredTransportMode: parsed.preferredTransportMode,
        desiredDepartureDate: parsed.desiredDepartureDate, horseCount: parsed.horseCount };
  } catch { /* Missing/malformed session hint never creates a server draft. */ }
  return structuredClone(emptyTrip);
}
