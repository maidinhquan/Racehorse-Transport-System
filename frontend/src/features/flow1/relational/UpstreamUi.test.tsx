import { afterEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ManagerPortal } from "../../Manager/pages/dashboard/ManagerPortal";
import MyHorsesPage from "../../user-dashboard/page/my-horses/MyHorsesPage";
import { CreateRequestWizard } from "../../customer/pages/create-request/CreateRequestWizard";
import { RenderContractsPage } from "../../Manager/pages/dashboard/views/RenderContractsPage";
import { relational } from "./api";
import type { Request, Horse } from "./api";
import type { Contract } from "./api";
vi.mock("./Notifications", () => ({ Notifications: () => null }));
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); localStorage.clear(); });
const horse: Horse = { horseId: "h-real", name: "Owned horse", microchipIso: "123456789012345", passportNo: "FEI-real", version: "hv", hasDocuments: true, selectable: true, breed: "Real breed" };
const request: Request = { requestId: "r-real", version: "rv", status: "PENDING", departure: "Pickup API", destination: "Delivery API", departureAt: "2026-11-20T03:00:00Z", deliveryAt: "2026-11-21T03:00:00Z", managerNotes: null, distanceKm: 300, preparationDays: 2, pickupContactName: "Sender", pickupContactPhone: "0900000000", receiverName: "Receiver", receiverPhone: "0900000001", customerName: "Real Customer", customerEmail: "owner@example.invalid", horses: [horse], contracts: [],
  input: { trip: { pickup: { address: "Pickup API", country: "VN", lat: 10, lng: 106 }, delivery: { address: "Delivery API", country: "VN", lat: 11, lng: 107 }, horseCount: 1, desiredDepartureDate: "2026-11-20", preferredTransportMode: "ROAD" }, departureAt: "2026-11-20T03:00:00Z", deliveryAt: "2026-11-21T03:00:00Z", purpose: "Existing purpose", pickupContact: { name: "Sender", phone: "0900000000" }, receiver: { name: "Receiver", phone: "0900000001" }, horses: [{ horseId: horse.horseId, version: horse.version }] } };

test("Manager keeps main sidebar/filter/table/review modal and does not accept locally after stale API rejection", async () => {
  vi.spyOn(relational, "list").mockResolvedValue([request]); const action = vi.spyOn(relational, "action").mockRejectedValue(new Error("Stale row"));
  render(<MemoryRouter initialEntries={["/manager/requests"]}><ManagerPortal initialNav="requests" /></MemoryRouter>);
  await screen.findByText("Real Customer"); expect(document.querySelector(".manager-sidebar")).toBeInTheDocument(); expect(document.querySelector(".table-controls-card")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Xem & Duyệt" })); await userEvent.click(screen.getByRole("button", { name: /Chấp nhận \(Accept\)/ })); await userEvent.click(screen.getByRole("button", { name: "Xác nhận Chấp thuận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Stale row"); expect(action).toHaveBeenCalledWith("/manager/requests/r-real/accept", expect.objectContaining({ version: "rv" }));
  expect(screen.getByRole("button", { name: "Xác nhận Chấp thuận" })).toBeInTheDocument();
});
test("horse grid retains main card UI, uses owned data and shows no invented medical validation", async () => {
  vi.spyOn(relational, "horses").mockResolvedValue([{ ...horse, hasDocuments: false }]);
  render(<MemoryRouter><MyHorsesPage /></MemoryRouter>); await screen.findByText("Owned horse");
  expect(document.querySelector(".horse-grid .horse-card")).toBeInTheDocument(); expect(screen.getByText("Chưa xác minh")).toBeInTheDocument(); expect(screen.queryByText("Thunderbolt")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Thêm ngựa" })); expect(document.querySelector(".customer-modal-card form")).toBeInTheDocument(); expect(screen.getAllByLabelText(/Ảnh PNG/)).toHaveLength(1);
});
test("revision uses the same four-step UI and preserves actual request/horse versions and availability exclusion", async () => {
  vi.spyOn(relational, "detail").mockResolvedValue({ ...request, status: "CHANGES_REQUESTED" }); vi.spyOn(relational, "horses").mockResolvedValue([horse]);
  const submit = vi.spyOn(relational, "submit").mockResolvedValue(request);
  render(<MemoryRouter initialEntries={["/customer/requests/r-real/revision"]}><Routes><Route path="/customer/requests/:requestId/revision" element={<CreateRequestWizard revision />} /><Route path="/customer/requests/:requestId" element={<p>Saved</p>} /></Routes></MemoryRouter>);
  expect(await screen.findByDisplayValue("Existing purpose")).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Mục đích"), { target: { value: "Updated" } });
  for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Tôi xác nhận thông tin và hồ sơ đã chọn." })); await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  await screen.findByText("Saved"); expect(submit).toHaveBeenCalledWith(expect.objectContaining({ purpose: "Updated", horses: [{ horseId: "h-real", version: "hv" }] }), expect.any(String), "r-real", "rv");
  expect(relational.horses).toHaveBeenCalledWith("2026-11-20T03:00:00.000Z", "2026-11-21T03:00:00.000Z", "r-real");
});

test("Manager contract studio keeps legacy currency and cannot draft or publish unverified history", () => {
  const legacy = { contractId: "history-only", version: "cv", status: "SIGNED", isCurrent: false, relationalTermsReady: false, hasAcceptanceEvidence: false, currency: "USD", totalPrice: 100, paidAmount: 20, payments: [] } as unknown as Contract;
  render(<RenderContractsPage records={[{ ...request, input: undefined, contracts: [legacy] }]} keys={new Map()} reload={vi.fn()} />);
  expect(screen.getByText("100 USD")).toBeInTheDocument(); expect(screen.getByText("20 USD")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Lưu nháp/ })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: /Phát hành & Gửi/ })).not.toBeInTheDocument();
});
