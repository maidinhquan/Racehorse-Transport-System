import { useState } from "react";
import { relational } from "../../../flow1/relational/api";
import { useRequests, selectedContract, contractView, transactionsView, overdueView, date } from "../../../flow1/relational/mainBindings";
import { managerRequest } from "./managerPresentation";
import type { ContractItem, AlertItem, ActiveTripItem } from "./views/manager.types";

export function useManagerBackend() {
  const { records, reload } = useRequests(true);
  const [keys] = useState(() => new Map<string, string>());
  const request = (id: string) => { const r = records.find(x => x.requestId === id); if (!r) throw new Error("Yêu cầu không còn trong danh sách."); return r; };
  const review = async (id: string, operation: string, reason?: string) => { if (!reason?.trim()) throw new Error("Vui lòng nhập ghi chú quyết định trong ô đã có trước khi xác nhận."); const r = request(id); await relational.action(`/manager/requests/${id}/${operation}`, { version: r.version, reason }); await reload(); };
  const save = async (draft: ContractItem) => {
    const r = request(draft.requestId); if (!r.input || r.status !== "ACCEPTED" || r.contracts.some(c => c.isCurrent)) throw new Error("Chỉ tạo Draft mới cho yêu cầu đã chấp nhận; chỉnh bản đã lưu cần luồng đóng/phát hành lại.");
    if (draft.depositPercent !== 40 || draft.items.length !== 1 || draft.items[0].quantity !== 1 || draft.customTerms) throw new Error("MVP chỉ lưu giá trọn gói, cọc40% và điều khoản PDF mẫu. Các trường khác cần teammate nối thêm.");
    const input = { version: r.version, price: draft.totalAmount, preparationDays: r.preparationDays, deadline: new Date(draft.completionDeadline.slice(0, 16) + ":00+07:00").toISOString() };
    const signature = JSON.stringify([r.requestId, input]); let key = keys.get(signature); if (!key) { key = crypto.randomUUID(); keys.set(signature, key); }
    const c = await relational.action<import("../../../flow1/relational/api").Contract>(`/manager/requests/${r.requestId}/contracts`, input, key);
    await reload(); return contractView(r, c);
  };
  const send = async (id: string, deadline: string) => {
    const r = records.find(r => r.contracts.some(c => c.contractId === id)); const c = r?.contracts.find(c => c.contractId === id);
    if (!c?.isCurrent || c.status !== "DRAFT") throw new Error("Lưu Draft trước khi phát hành.");
    if (Date.parse(deadline + (deadline.length === 16 ? ":00+07:00" : "")) !== Date.parse(c.signDeadline || "")) throw new Error("Hạn đã chốt trên Draft; chưa có UI đóng/phát hành lại để chỉnh sửa.");
    await relational.action(`/manager/contracts/${id}/publish`, { version: c.version }); await reload();
  };
  const extend = async (id: string, deadline: string, reason: string) => { const c = selectedContract(request(id)); if (!c) throw new Error("Không có Contract."); await relational.action(`/manager/contracts/${c.contractId}/extend`, { version: c.version, target: c.signedAt ? "DEPOSIT" : "SIGN", deadline: new Date(deadline + ":00+07:00").toISOString(), reason }); await reload(); };
  const cancelOverdue = async (id: string, reason: string) => { const c = selectedContract(request(id)); if (!c) throw new Error("Không có Contract."); await relational.action(`/manager/contracts/${c.contractId}/cancel-overdue`, { version: c.version, reason }); await reload(); };
  const confirm = async (id: string, _amount: number, _reference: string, note?: string) => {
    const c = records.flatMap(r => r.contracts).find(c => c.payments.some(p => p.paymentId === id)); const p = c?.payments.find(p => p.paymentId === id);
    if (!c || !p || p.method !== "VNPAY" || p.status !== "SUCCESS" || !p.reviewRequired) throw new Error("Chỉ đối soát khoản VNPay đã được IPN xác minh. Không xác nhận tiền bằng thao tác thủ công.");
    await relational.action(`/manager/contracts/${c.contractId}/payments/${id}/review`, { version: p.version, reason: note }); await reload();
  };
  const reject = async () => { throw new Error("MVP chỉ dùng VNPay; không có duyệt/từ chối biên lai chuyển khoản thủ công."); };
  const alerts: AlertItem[] = records.filter(r => r.status === "PENDING").map(r => ({ id: r.requestId, type: "info", bulletColor: "blue", title: r.requestId, subtitle: "Chờ xét duyệt", requestId: r.requestId, linkNav: "requests" }));
  const activeTrips: ActiveTripItem[] = records.flatMap(r => { const c = selectedContract(r); return c?.isCurrent && c.hasAcceptanceEvidence && c.trip && !["CANCELLED", "COMPLETED"].includes(c.trip.status) ? [{ id: c.trip.tripId, route: r.departure + " → " + r.destination, status: c.trip.deploymentStatus || c.trip.status, statusClass: "status-ready", eta: date(r.deliveryAt), lastUpdated: "—", driverEscort: "—" }] : []; });
  return { requests: records.map(managerRequest), contracts: records.flatMap(r => r.contracts.map(c => contractView(r, c))), transactions: transactionsView(records), overdueList: overdueView(records), alerts, activeTrips, review, save, send, extend, cancelOverdue, confirm, reject };
}
