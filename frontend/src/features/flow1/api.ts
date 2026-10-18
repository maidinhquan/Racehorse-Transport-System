import { apiClient } from "../../shared/api/apiClient";
import { registrationErrorMessage } from "../auth/api/registrationApi";
import axios from "axios";

export function flow1Error(error: unknown): string {
  if (axios.isAxiosError<{ errorCode?: string }>(error) &&
      ["FLOW1_SQL_SCHEMA_REQUIRED", "FLOW1_STATE_IMPORT_REQUIRED", "FLOW1_STATE_RECONCILIATION_REQUIRED"].includes(error.response?.data.errorCode || ""))
    return "Chức năng đang được bảo trì dữ liệu. Vui lòng thử lại sau hoặc liên hệ quản lý.";
  return registrationErrorMessage(error);
}
export type Location = { address: string; lat: number; lng: number; country: string; mapProvider?: string; geocodingProvider?: string };
export type Trip = { pickup: Location; delivery: Location; preferredTransportMode: string; horseCount: number; desiredDepartureDate: string };
type Envelope<T> = { success: boolean; message: string; data: T };
const baseURL = import.meta.env.VITE_API_URL || "/api";
export async function get<T>(url: string): Promise<T> {
  const r = await apiClient.get<Envelope<T>>(url, { baseURL });
  if (!r.data.success) throw new Error(r.data.message);
  return r.data.data;
}
export async function post<T>(url: string, data: unknown, key?: string): Promise<T> {
  const r = await apiClient.post<Envelope<T>>(url, data, { baseURL, headers: {
    ...(key ? { "Idempotency-Key": key } : {}), ...(data instanceof FormData ? { "Content-Type": undefined } : {}),
  } });
  if (!r.data.success) throw new Error(r.data.message);
  return r.data.data;
}
export const flow1 = {
  search: (address: string, country: string, guest = false) => get<{ label: string; point: { longitude: number; latitude: number; countryCode: string }; attribution: string; provider?: string; previewProvider?: string | null }[]>(
    `${guest ? "/public/estimates" : "/customer"}/locations/search?${new URLSearchParams({ address, country })}`),

};
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
