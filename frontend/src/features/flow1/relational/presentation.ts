import { useCallback, useEffect, useState } from "react";
import { relational } from "./api";
import type { Request } from "./api";
import type { DetailRequestStatus, TransportRequestDetail } from "../../user-dashboard/data/transportRequestDetailMockData";
import { flow1Error } from "../api";

export const statusLabel: Record<string, DetailRequestStatus> = { PENDING: "Waiting for Manager Review", CHANGES_REQUESTED: "Changes Requested", ACCEPTED: "Accepted – Contract Preparation", DRAFT_CONTRACT: "Accepted – Contract Preparation", AWAITING_SIGNATURE: "Contract Ready", AWAITING_DEPOSIT: "Awaiting Deposit", ACTIVATED: "Activated", REJECTED: "Rejected", CANCELLED: "Cancelled", COMPLETED: "Completed" };
export const date = (s?: string | null) => s && Number.isFinite(Date.parse(s)) ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
export const localTime = (s?: string | null) => s ? new Date(new Date(s).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";
export const currentContract = (r: Request) => r.contracts.find(c => c.isCurrent) ?? r.contracts.at(-1);
export function useRequests(manager = false) {
  const [requests, setRequests] = useState<Request[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => { const v = await relational.list(manager); setRequests(v); setError(""); }, [manager]);
  useEffect(() => { let active = true; relational.list(manager).then(v => { if (active) setRequests(v); }).catch(e => { if (active) setError(flow1Error(e)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [manager]);
  return { requests, error, loading, reload };
}
export function useRequest(id?: string) {
  const [request, setRequest] = useState<Request | null>(null); const [error, setError] = useState("");
  const reload = useCallback(async () => { const r = await relational.detail(id!); setRequest(r); setError(""); }, [id]);
  useEffect(() => { let active = true; relational.detail(id!).then(r => { if (active) setRequest(r); }).catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [id]);
  return { request, error, reload };
}
export function detailView(r: Request): TransportRequestDetail {
  const c = currentContract(r); const step = c?.trip ? 4 : c?.signedAt ? 3 : c?.pdfSha256 ? 2 : 1;
  return { id: r.requestId, status: statusLabel[r.status] ?? "Waiting for Manager Review", origin: r.departure, destination: r.destination,
    requestedDate: "", preferredDate: r.departureAt ?? "", estimatedPrice: c?.totalPrice ?? 0, horseCount: r.horses.length,
    horses: r.horses.map(h => ({ id: h.horseId, name: h.name, breed: h.breed ?? "—", sex: h.sex ?? "—" })),
    contract: c ? { number: c.contractId, status: c.signedAt ? "Signed" : c.pdfSha256 ? "Ready" : "Preparing", finalPrice: c.totalPrice } : undefined,
    documents: r.horses.flatMap((h, i) => [{ id: i * 2, name: h.name + " · Ảnh", status: h.hasDocuments ? "Completed" as const : "Action Required" as const }, { id: i * 2 + 1, name: h.name + " · Hộ chiếu", status: h.hasDocuments ? "Completed" as const : "Action Required" as const }]),
    progress: ["Gửi yêu cầu", "Xét duyệt & hợp đồng", "Ký OTP & cọc", "Kích hoạt / bàn giao"].map((label, i) => ({ id: i, label, status: i + 1 < step ? "completed" : i + 1 === step ? "current" : "upcoming" })),
    managerFeedback: r.managerNotes ?? undefined, pickupWindow: date(r.departureAt), eta: date(r.deliveryAt) };
}
