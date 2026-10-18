import { useEffect, useState } from "react";
import { get, flow1Error } from "../api";
import { relational } from "./api";
import type { Request, Contract } from "./api";
import type { ContractItem, BankTransferTransaction, DeadlineOverdueItem } from "../../Manager/pages/dashboard/views/manager.types";

export const date = (s?: string | null) => s && Number.isFinite(Date.parse(s)) ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
export const selectedContract = (r?: Request) => r?.contracts.find(c => c.isCurrent) ?? r?.contracts.at(-1);
export const statusLabels: Record<string, string> = { PENDING: "Waiting for Manager Review", CHANGES_REQUESTED: "Changes Requested", ACCEPTED: "Accepted – Contract Preparation", DRAFT_CONTRACT: "Accepted – Contract Preparation", AWAITING_SIGNATURE: "Contract Ready", AWAITING_DEPOSIT: "Awaiting Deposit", ACTIVATED: "Activated", REJECTED: "Rejected", CANCELLED: "Cancelled", COMPLETED: "Completed" };
export function useRequests(manager = false) {
  const [records, setRecords] = useState<Request[]>([]);
  const reload = async () => { const rows = await relational.list(manager); setRecords(rows); };
  useEffect(() => { let active = true; relational.list(manager).then(v => { if (active) setRecords(v); }).catch(e => { if (active) window.alert(flow1Error(e)); }); return () => { active = false; }; }, [manager]);
  return { records, reload };
}
export function useRequest(id?: string) {
  const [record, setRecord] = useState<Request | null>(null);
  useEffect(() => { let active = true; if (id) relational.detail(id).then(v => { if (active) setRecord(v); }).catch(e => { if (active) window.alert(flow1Error(e)); }); return () => { active = false; }; }, [id]);
  return record?.requestId === id ? record : null;
}
export type Notice = { id: string; title: string; message: string; sentAt: string; isRead: boolean };
export function useNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => { let active = true; get<Notice[]>("/flow1/notifications").then(v => { if (active) setNotices(v); }).catch(e => { if (active) window.alert(flow1Error(e)); }); return () => { active = false; }; }, []);
  return notices;
}
export function requestView(r: Request) {
  const c = selectedContract(r);
  return { id: r.requestId, status: statusLabels[r.status] || r.status, origin: r.departure, destination: r.destination, requestedDate: "", preferredDate: r.departureAt || "", estimatedPrice: c?.totalPrice ?? 0, horseCount: r.horses.length,
    horses: r.horses.map(h => ({ id: h.horseId, name: h.name, breed: h.breed || "—", sex: h.sex || "—" })),
    contract: c ? { number: c.contractId, status: c.signedAt ? "Signed" : c.pdfSha256 ? "Ready" : "Preparing", finalPrice: c.totalPrice } : undefined,
    documents: [...r.horses.flatMap((h, i) => [{ id: i * 2, name: h.name + " · Ảnh/hộ chiếu", status: h.hasDocuments ? "Completed" as const : "Action Required" as const, downloadPath: undefined as string | undefined }]),
      ...(r.documents ?? []).map(d => ({ id: d.documentId, name: (r.horses.find(h => h.horseId === d.horseId)?.name || d.horseId) + " · Hồ sơ bổ sung", status: d.status === "UPLOADED" ? "Pending Review" : d.status,
        downloadPath: `/customer/requests/${encodeURIComponent(r.requestId)}/documents/${encodeURIComponent(d.documentId)}` }))],
    progress: [{ id: 1, label: statusLabels[r.status] || r.status, status: "current" as "completed" | "current" | "upcoming" }],
    managerFeedback: r.managerNotes || undefined, pickupWindow: date(r.departureAt), eta: date(r.deliveryAt), currency: c?.currency || "VND" };
}
export function contractView(r: Request, c?: Contract): ContractItem {
  const price = c?.totalPrice || 0;
  return { id: c?.contractId || `draft:${r.requestId}`, version: "—", requestId: r.requestId, customerName: r.customerName || "—", routeDisplay: r.departure + " → " + r.destination, currency: c?.currency === "USD" ? "USD" : "VND", items: [{ id: "total", category: "TRANSPORT", description: "Giá vận chuyển trọn gói", quantity: 1, unitPrice: price, amount: price, mandatory: true }], totalAmount: price, suggestedTotal: 0, floorPrice: 0, isBelowFloor: false, depositPercent: c?.relationalTermsReady === false ? 0 : 40, depositAmount: c?.depositAmount || 0, completionDeadline: c?.signDeadline ? new Date(Date.parse(c.signDeadline) + 7 * 3600000).toISOString().slice(0, 16) : "", status: (c?.status || "DRAFT") as ContractItem["status"], statusLabel: c?.status || "DRAFT", includedServices: [], excludedServices: [], customTerms: "", createdAt: "—" };
}
export function transactionsView(records: Request[]): BankTransferTransaction[] {
  return records.flatMap(r => r.contracts.flatMap(c => c.payments.map(p => ({ transactionId: p.paymentId, requestId: r.requestId, contractId: c.contractId, customerName: r.customerName || "—", method: p.method === "VNPAY" ? "VNPAY" as const : "BANK_TRANSFER" as const, declaredAmount: p.amount, expectedDepositAmount: c.depositAmount, currency: p.currency, bankName: "—", accountNumber: "—", bankReference: p.transactionCode || "—", paidAt: date(p.paidAt), createdAt: "—", statusLabel: p.reviewRequired ? "Cần đối soát" : p.status === "PENDING" ? "Chờ VNPay IPN" : p.status, status: (p.reviewRequired ? "PENDING_CONFIRMATION" : p.status === "SUCCESS" ? "SUCCESS" : p.status === "PENDING" ? "PENDING" : "FAILED") as BankTransferTransaction["status"], confirmedAmount: p.receivedAmount ?? undefined, rejectReason: p.reviewReason || undefined }))));
}
export function overdueView(records: Request[]): DeadlineOverdueItem[] {
  return records.flatMap(r => r.contracts.filter(c => c.isCurrent && c.relationalTermsReady && ["SIGNED", "PENDING_SIGNATURE"].includes(c.status) && Date.parse((c.signedAt ? c.depositDeadline : c.signDeadline) || "") < Date.now()).map(c => ({ requestId: r.requestId, customerName: r.customerName || "—", routeDisplay: r.departure + " → " + r.destination, contractStatus: c.status as DeadlineOverdueItem["contractStatus"], completionDeadline: (c.signedAt ? c.depositDeadline : c.signDeadline)!, daysExpired: Math.floor((Date.now() - Date.parse((c.signedAt ? c.depositDeadline : c.signDeadline)!)) / 86400000), isGracePeriodEnded: true, depositOutstanding: Math.max(0, c.depositAmount - c.paidAmount), currency: c.currency })));
}
