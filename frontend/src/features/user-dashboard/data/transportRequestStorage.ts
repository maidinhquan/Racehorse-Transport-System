export type FakeRequestStatus =
  | "Waiting for Manager Review"
  | "Changes Requested"
  | "Accepted – Contract Preparation"
  | "Contract Ready"
  | "Awaiting Deposit"
  | "Information Required"
  | "Information Submitted"
  | "Documents Under Review"
  | "Scheduled"
  | "In Transit"
  | "Completed"
  | "Rejected";

export interface FakeTransportRequest {
  id: string;
  origin: string;
  destination: string;
  requestedDate: string;
  preferredDate: string;
  horseCount: number;
  estimatedPrice: number;
  status: FakeRequestStatus;
  horses?: string[];
  contractStatus?: "Not Available" | "Preparing" | "Ready" | "Signed";
  customerName?: string;
  phone?: string;
  email?: string;
  specialRequirements?: string;
  transportMode?: "AIR" | "ROAD";
  originCountry?: string;
  destinationCountry?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  committedDeadline?: string;
  commercialValue?: number;
}

const STORAGE_KEY = "cbn_transport_requests";

const defaultRequests: FakeTransportRequest[] = [
  {
    id: "TRN-0148",
    origin: "Ho Chi Minh City",
    destination: "Bangkok",
    requestedDate: "2026-09-28",
    preferredDate: "2026-10-05",
    horseCount: 1,
    horses: ["Thunderbolt"],
    estimatedPrice: 2450,
    status: "In Transit",
    contractStatus: "Signed",
    transportMode: "ROAD",
    customerName: "Nguyễn Thanh Quốc Linh",
  },
  {
    id: "TRN-0152",
    origin: "Hanoi",
    destination: "Singapore",
    requestedDate: "2026-10-01",
    preferredDate: "2026-10-12",
    horseCount: 1,
    horses: ["Storm Runner"],
    estimatedPrice: 3100,
    status: "Documents Under Review",
    contractStatus: "Ready",
    transportMode: "AIR",
    customerName: "Nguyễn Thanh Quốc Linh",
  },
  {
    id: "TR-2026-JP01",
    origin: "Ho Chi Minh City",
    destination: "Tokyo (Japan)",
    requestedDate: "2026-10-10",
    preferredDate: "2026-10-28",
    horseCount: 1,
    horses: ["Thunderbolt Prime"],
    estimatedPrice: 5800,
    status: "Information Required",
    contractStatus: "Preparing",
    transportMode: "AIR",
    customerName: "Nguyễn Thanh Quốc Linh",
    destinationCountry: "JP",
  },
];

export function getRequests(): FakeTransportRequest[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRequests));
    return defaultRequests;
  }

  const parsed: FakeTransportRequest[] = JSON.parse(saved);

  // Đảm bảo đơn hàng đi Nhật Bản luôn có trong danh sách hệ thống
  if (!parsed.some((r) => r.id === "TR-2026-JP01")) {
    parsed.unshift(defaultRequests[2]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  }

  return parsed;
}

export function getRequestById(id: string) {
  return getRequests().find((request) => request.id === id);
}

export function saveRequests(requests: FakeTransportRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("cbn_request_updated"));
}

export function createRequest(
  data: Omit<FakeTransportRequest, "id" | "requestedDate" | "status"> & Partial<FakeTransportRequest>
) {
  const requests = getRequests();
  const id = `TRN-${Math.floor(1000 + Math.random() * 9000)}`;

  const newRequest: FakeTransportRequest = {
    ...data,
    id,
    requestedDate: new Date().toISOString().slice(0, 10),
    status: "Waiting for Manager Review",
    contractStatus: data.contractStatus || "Not Available",
    horses: data.horses && data.horses.length > 0 ? data.horses : ["Thunder Strike"],
    customerName: data.customerName || "Nguyễn Thanh Quốc Linh",
    phone: data.phone || "+84 909 888 999",
    email: data.email || "linh.nguyen@equine.vn",
  };

  saveRequests([newRequest, ...requests]);

  // Đồng bộ tức thời sang kho của Logistics Manager
  try {
    const isJP =
      (data.destination || "").toLowerCase().includes("nhật") ||
      (data.destination || "").toLowerCase().includes("tokyo") ||
      (data.destination || "").toLowerCase().includes("japan");

    const managerReqItem = {
      id,
      customerName: newRequest.customerName,
      contactPerson: newRequest.receiverName || newRequest.customerName,
      phone: newRequest.receiverPhone || newRequest.phone,
      email: newRequest.email,
      originCountry: data.originCountry || "VN",
      originCity: data.origin || "Ho Chi Minh City",
      destinationCountry: isJP ? "JP" : (data.destinationCountry || "OTHER"),
      destinationCity: data.destination || "Tokyo",
      routeDisplay: `${data.origin} → ${data.destination}`,
      departureDate: data.preferredDate || new Date().toISOString().slice(0, 10),
      departureDateRaw: data.preferredDate || new Date().toISOString().slice(0, 10),
      daysRemainingText: "in 7 ngày",
      daysRemaining: 7,
      deliveryDeadline: data.committedDeadline || data.preferredDate || new Date().toISOString().slice(0, 10),
      transportMode: data.transportMode || ("AIR" as const),
      status: "PENDING" as const,
      statusLabel: "Chờ xét duyệt • Khách hàng mới gửi yêu cầu",
      createdAt: "Hôm nay " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      specialRequirements:
        data.specialRequirements ||
        `Điểm đón: ${data.pickupAddress || 'Chưa cập nhật'}. Điểm giao: ${data.deliveryAddress || 'Chưa cập nhật'}. Người nhận: ${data.receiverName || 'N/A'} (${data.receiverPhone || 'N/A'}). Định giá: $${Number(data.commercialValue || 0).toLocaleString()} USD.`,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone,
      commercialValue: data.commercialValue,
      horses: (newRequest.horses || ["Thunder Strike"]).map((name, idx) => ({
        id: idx + 1,
        name,
        breed: "Thoroughbred",
        age: 4,
        microchipId: "981020000" + (123456 + idx),
        documents: { passport: true, quarantineCert: true, bloodTest: true, ownershipCert: true },
      })),
    };

    const customManagerList = JSON.parse(localStorage.getItem("cbn_custom_manager_requests") || "[]");
    localStorage.setItem("cbn_custom_manager_requests", JSON.stringify([managerReqItem, ...customManagerList]));
    window.dispatchEvent(new CustomEvent("cbn_request_created", { detail: managerReqItem }));
  } catch (err) {
    console.error("Lỗi khi đồng bộ yêu cầu sang Manager:", err);
  }

  return newRequest;
}

export function updateRequestStatus(id: string, status: FakeRequestStatus) {
  const requests = getRequests();

  const updated = requests.map((request) =>
    request.id === id
      ? {
          ...request,
          status,
          contractStatus:
            status === "Accepted – Contract Preparation"
              ? ("Preparing" as const)
              : status === "Contract Ready"
              ? ("Ready" as const)
              : request.contractStatus,
        }
      : request
  );

  saveRequests(updated);

  // Đồng bộ trạng thái sang Manager Portal
  try {
    const customManagerList = JSON.parse(localStorage.getItem("cbn_custom_manager_requests") || "[]");
    const updatedCustom = customManagerList.map((m: any) => {
      if (m.id === id) {
        if (status === "Information Submitted") {
          return {
            ...m,
            status: "PENDING",
            statusLabel: "Chờ duyệt • Khách hàng đã nộp đủ hồ sơ",
          };
        } else if (status === "Accepted – Contract Preparation") {
          return {
            ...m,
            status: "ACCEPTED",
            statusLabel: "Đã chấp nhận – Đang soạn hợp đồng",
          };
        } else if (status === "Rejected") {
          return {
            ...m,
            status: "REJECTED",
            statusLabel: "Đã từ chối",
          };
        }
      }
      return m;
    });
    localStorage.setItem("cbn_custom_manager_requests", JSON.stringify(updatedCustom));
  } catch (err) {
    console.error("Lỗi đồng bộ trạng thái sang Manager:", err);
  }

  window.dispatchEvent(new CustomEvent("cbn_request_updated", { detail: { id, status } }));
}

export function resetDemoRequests() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("cbn_custom_manager_requests");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRequests));
}