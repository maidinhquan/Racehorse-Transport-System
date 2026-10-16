import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ManagerRequestPage, ManagerRequestsPage } from "./ManagerPages";
import { CustomerReviewPanel } from "./CustomerReviewPanel";
import { reviewApi } from "./reviewApi";
import type { ManagerReview, CustomerReview } from "./reviewApi";

const manager: ManagerReview = {
  request: { requestId: "r-api", status: "PENDING", departure: "Điểm lấy API", destination: "Điểm giao API", expectedDate: "2026-11-20", committedDeadline: "2026-11-25", version: 1,
    snapshot: { input: { trip: { pickup: { address: "A", lat: 10.8, lng: 106.6, country: "VN" }, delivery: { address: "B", lat: 11.5, lng: 106.6, country: "VN" },
      preferredTransportMode: "ROAD", horseCount: 1, desiredDepartureDate: "2026-11-20" }, deliveryDeadline: "2026-11-25", purpose: "COMPETITION",
      pickupContact: { name: "Người giao", phone: "0901234567" }, receiver: { name: "Người nhận", phone: "0907654321", isProxy: true }, horses: [] },
      estimate: { estimatedPrice: 48600000, estimatedDeposit: 19440000, roadDistanceKm: 300, minimumPreparationDays: 2, earliestDepartureDate: "2026-10-18", scope: "ROAD", currency: "VND", attribution: "TEST" },
      receiverVerificationStatus: "REQUIRED_NOT_VERIFIED" } },
  version: 0, review: { requestVersion: 1, feedback: null, revisionFields: [], questions: [], changes: [] }, plan: null, contract: null,
  allowedActions: ["ACCEPT", "REJECT", "ASK_INFO", "REQUEST_REVISION"],
};
afterEach(() => vi.restoreAllMocks());
function mountManager() { render(<MemoryRouter initialEntries={["/r-api"]}><Routes><Route path="/:requestId" element={<ManagerRequestPage />} /></Routes></MemoryRouter>); }
describe("Flow 1 Manager review", () => {
  it("loads real list results with server status filter", async () => {
    const list = vi.spyOn(reviewApi, "list").mockResolvedValue({ items: [manager.request], page: 1, pageSize: 20, totalCount: 1 });
    render(<MemoryRouter><ManagerRequestsPage /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Điểm lấy API → Điểm giao API" })).toHaveAttribute("href", "/manager/requests/r-api");
    expect(list).toHaveBeenCalledWith("PENDING", 1);
  });
  it("keeps expected version and idempotency key on a failed accept retry", async () => {
    vi.spyOn(reviewApi, "manager").mockResolvedValue(manager);
    const accepted = { ...manager, version: 2, request: { ...manager.request, status: "ACCEPTED" }, allowedActions: ["SAVE_PLAN"] };
    const act = vi.spyOn(reviewApi, "actManager").mockRejectedValueOnce(new Error("Mạng gián đoạn")).mockResolvedValue(accepted);
    mountManager(); const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Chấp nhận yêu cầu" }));
    await screen.findByRole("alert"); await user.click(screen.getByRole("button", { name: "Chấp nhận yêu cầu" }));
    await screen.findByRole("heading", { name: "Kế hoạch sơ bộ và ngân sách" });
    expect(act).toHaveBeenCalledTimes(2); expect(act.mock.calls[0][2]).toEqual({ expectedVersion: 0 });
    expect(act.mock.calls[0][3]).toBe(act.mock.calls[1][3]);
  });
  it("hides drafting controls when a pending change blocks them", async () => {
    const proposal = { ...manager.request.snapshot!.input, purpose: "TRAINING", pickupContact: { name: "Người giao mới", phone: "0909999999" },
      horses: [{ horseId: "h-proposed", documentVersion: 2 }] };
    vi.spyOn(reviewApi, "manager").mockResolvedValue({ ...manager, request: { ...manager.request, status: "ACCEPTED" },
      allowedActions: ["REJECT", "ASK_INFO", "APPROVE_CHANGE", "REJECT_CHANGE"], review: { ...manager.review,
        changes: [{ id: "ch-one", reason: "Đổi người nhận", proposal, status: "PENDING", baseRequestVersion: 1 }] } });
    mountManager(); await screen.findByRole("button", { name: "Duyệt thay đổi" });
    expect(screen.queryByRole("button", { name: "Tạo hợp đồng Draft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu kế hoạch sơ bộ" })).toBeNull();
    expect(screen.getByText(/Người giao đề xuất: Người giao mới/)).toBeInTheDocument();
    expect(screen.getByText(/Mục đích: TRAINING/)).toBeInTheDocument();
    const download = vi.spyOn(reviewApi, "document").mockResolvedValue(undefined);
    await userEvent.setup().click(screen.getByRole("button", { name: "Tải hộ chiếu đề xuất" }));
    expect(download).toHaveBeenCalledWith("r-api", "h-proposed", 2, "passport");
  });
  it("Customer answers a question with the review version and does not change canonical fields", async () => {
    const view: CustomerReview = { version: 4, requestVersion: 1, feedback: null, revisionFields: [],
      questions: [{ id: "q-one", question: "Xác nhận liên hệ?", askedBy: "manager", askedAtUtc: "2026-10-16", answer: null }],
      changes: [], notices: [], contract: null, recoveryRequired: false, allowedActions: ["RESPOND_INFO"] };
    const act = vi.spyOn(reviewApi, "actCustomer").mockResolvedValue(view); const reload = vi.fn().mockResolvedValue(undefined);
    render(<MemoryRouter><CustomerReviewPanel id="r-api" value={view} reload={reload} /></MemoryRouter>);
    const user = userEvent.setup(); await user.type(screen.getByLabelText("Câu trả lời"), "Đã xác nhận");
    await user.click(screen.getByRole("button", { name: "Gửi câu trả lời" }));
    expect(act).toHaveBeenCalledWith("r-api", "info-responses", { expectedVersion: 4, questionId: "q-one", reason: "Đã xác nhận" }, expect.any(String));
    expect(reload).toHaveBeenCalledOnce();
  });
});
