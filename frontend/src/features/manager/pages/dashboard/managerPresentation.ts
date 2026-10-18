import type { Request } from "../../../flow1/relational/api";
import { selectedContract, date } from "../../../flow1/relational/mainBindings";
import type { TransportRequestItem, RequestStatus } from "./views/manager.types";

const labels: Record<string, string> = { PENDING: "Chờ xét duyệt", ACCEPTED: "Đã chấp nhận – Đang soạn hợp đồng", CHANGES_REQUESTED: "Yêu cầu điều chỉnh", AWAITING_SIGNATURE: "Chờ khách ký OTP", AWAITING_DEPOSIT: "Chờ cọc", DRAFT_CONTRACT: "Đang soạn hợp đồng", ACTIVATED: "Đã kích hoạt", REJECTED: "Đã từ chối", CANCELLED: "Đã hủy" };
export function managerRequest(r: Request): TransportRequestItem {
  const c = selectedContract(r); const days = r.departureAt ? Math.ceil((Date.parse(r.departureAt) - Date.now()) / 86400000) : 0;
  return { id: r.requestId, customerName: r.customerName || "—", email: r.customerEmail || "—", contactPerson: r.pickupContactName || "—", phone: r.pickupContactPhone || "—",
    originCountry: r.input?.trip.pickup.country || "—", destinationCountry: r.input?.trip.delivery.country || "—", originCity: r.departure, destinationCity: r.destination, routeDisplay: r.departure + " → " + r.destination,
    departureDate: date(r.departureAt), departureDateRaw: r.departureAt?.slice(0, 10) || "", daysRemaining: days, daysRemainingText: r.departureAt ? `còn ${days} ngày` : "—", deliveryDeadline: date(r.deliveryAt), transportMode: r.input?.trip.preferredTransportMode === "AIR" ? "AIR" : "ROAD",
    horses: r.horses.map(h => ({ id: h.horseId, name: h.name, breed: h.breed || "—", age: h.dob ? Math.max(0, new Date().getFullYear() - new Date(h.dob).getFullYear()) : null, microchipId: h.microchipIso, documents: { passport: h.hasDocuments, quarantineCert: false, bloodTest: false, ownershipCert: false } })),
    status: (["DRAFT_CONTRACT", "AWAITING_SIGNATURE"].includes(r.status) ? "AWAITING_CONTRACT" : r.status) as RequestStatus, statusLabel: labels[r.status] || r.status, createdAt: "—", specialRequirements: r.input?.purpose, contractId: c?.contractId,
    declaredValueUsd: r.declaredValueUsd, baselineDocuments: r.documents ?? [] };
}
