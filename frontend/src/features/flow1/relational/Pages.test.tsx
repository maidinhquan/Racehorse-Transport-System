import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CustomerVnpayReturnPage, RequestDetailPage, RequestWizardPage } from "./Pages";
import { download, relational } from "./api";
import type { Contract, Request } from "./api";

vi.mock("./Notifications", () => ({ Notifications: () => null }));
vi.mock("./api", () => ({ download: vi.fn(), relational: { detail: vi.fn(), action: vi.fn(), returned: vi.fn(), horses: vi.fn() } }));
const contract: Contract = { contractId: "c-one", version: "v1", status: "SIGNED", isCurrent: true, totalPrice: 100000000, depositAmount: 40000000,
  signDeadline: "2026-11-03T03:00:00Z", depositDeadline: "2026-11-02T03:00:00Z", signedAt: "2026-11-01T03:00:00Z", pdfSha256: "a".repeat(64),
  cancellationId: null, cancellationStatus: null, cancellationReason: null, cancellationDecision: null, extensionTarget: null, extensionReason: null,
  currency: "VND", relationalTermsReady: true, hasAcceptanceEvidence: true, paidAmount: 0, invoiceStatus: "UNPAID", payments: [], trip: null };
const request: Request = { requestId: "r-one", version: "rv1", status: "AWAITING_DEPOSIT", departure: "A", destination: "B", departureAt: "2026-11-20T03:00:00Z",
  deliveryAt: "2026-11-21T03:00:00Z", managerNotes: null, distanceKm: 100, preparationDays: 2, pickupContactName: "Sender", pickupContactPhone: "0900000000",
  receiverName: "Receiver", receiverPhone: "0900000001", horses: [], contracts: [contract] };
function page(manager = false) { render(<MemoryRouter initialEntries={[`/${manager ? "manager" : "customer"}/requests/r-one`]}><Routes><Route path={`/${manager ? "manager" : "customer"}/requests/:requestId`} element={<RequestDetailPage manager={manager} />} /></Routes></MemoryRouter>); }
beforeEach(() => { vi.clearAllMocks(); vi.mocked(relational.detail).mockResolvedValue(structuredClone(request)); });

test("customer sees VNPay only, retains cancellation and reads a signed receipt without bank proof or budget controls", async () => {
  page(); expect(await screen.findByRole("button", { name: "Thanh toán qua VNPay" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Đề nghị hủy" })).toBeInTheDocument(); expect(screen.getByRole("status")).toHaveTextContent("Biên nhận xác nhận OTP");
  expect(screen.queryByText(/ủy nhiệm chi|ngân hàng thủ công|preliminary|budget/i)).not.toBeInTheDocument();
  expect(document.querySelector('input[type="file"]')).toBeNull();
});
test("an unsigned customer must download the exact PDF before OTP actions; declined API action shows its error", async () => {
  vi.mocked(relational.detail).mockResolvedValue({ ...request, contracts: [{ ...contract, status: "PENDING_SIGNATURE", signedAt: null }] });
  vi.mocked(download).mockResolvedValue(); vi.mocked(relational.action).mockRejectedValue(new Error("Cooldown active")); page();
  const send = await screen.findByRole("button", { name: "Gửi OTP qua email" }); expect(send).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Xem / tải đúng PDF" })); expect(send).toBeEnabled();
  await userEvent.click(send); await waitFor(() => expect(relational.action).toHaveBeenCalledWith("/customer/contracts/c-one/otp", { version: "v1", pdfSha256: contract.pdfSha256 }, undefined));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
test("manager keeps extension, latest cancellation decision and current deployment controls", async () => {
  vi.mocked(relational.detail).mockResolvedValue({ ...request, contracts: [{ ...contract, cancellationId: "cancel-one", cancellationStatus: "PENDING", cancellationReason: "Changed plans",
    trip: { tripId: "t-one", version: "tv1", status: "PLANNING", deploymentStatus: "ON_HOLD", eventId: null, reason: "Weather", routingAcknowledgedBy: null, documentsAcknowledgedBy: null } }] });
  page(true); expect(await screen.findByRole("button", { name: "Gia hạn cọc" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Chấp thuận hủy/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "confirm" })).toBeDisabled(); expect(screen.getByRole("button", { name: "resume" })).toBeEnabled();
  expect(screen.getByText(/Coordinator:/)).toHaveTextContent("Chưa nhận");
});
test("VNPay return reads owned backend status and cannot activate using response-code query parameters", async () => {
  vi.mocked(relational.returned).mockResolvedValue({ requestId: "r-one", contract: { ...contract, paidAmount: 0 } });
  render(<MemoryRouter initialEntries={["/customer/payments/return?vnp_TxnRef=p-one&vnp_ResponseCode=00"]}><CustomerVnpayReturnPage /></MemoryRouter>);
  await screen.findByRole("link", { name: /Xem/ }); expect(relational.returned).toHaveBeenCalledWith("p-one"); expect(relational.action).not.toHaveBeenCalled();
  expect(screen.getByText(/UNPAID/)).toBeInTheDocument();
});

test("legacy rows preserve original currency and payment identifiers without fabricating an OTP receipt or reopening collection", async () => {
  vi.mocked(relational.detail).mockResolvedValue({ ...request, contracts: [{ ...contract, relationalTermsReady: false, hasAcceptanceEvidence: false,
    payments: [{paymentId:"old-bank",version:"legacy",amount:20,receivedAmount:null,status:"SUCCESS",transactionCode:"old-reference",paidAt:null,reviewRequired:false,reviewReason:null,method:"BANK_TRANSFER",currency:"USD"}] }] });
  page(true);expect(await screen.findByText(/Hồ sơ cũ cần rà soát/)).toBeInTheDocument();expect(screen.getByText(/20 USD/)).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"Truy vấn kết quả từ VNPay"})).not.toBeInTheDocument();expect(screen.queryByRole("button",{name:"Gia hạn cọc"})).not.toBeInTheDocument();
});

test("changing booking dates removes an unavailable selected horse and sends actual UTC bounds to availability", async () => {
  const horse={horseId:"h-one",name:"Date horse",microchipIso:"123456789012345",passportNo:"FEI",version:"h-v1",hasDocuments:true,selectable:true};
  vi.mocked(relational.horses).mockImplementation(async from => [{...horse,selectable:!from}]);
  render(<MemoryRouter><RequestWizardPage /></MemoryRouter>);const checkbox=await screen.findByRole("checkbox",{name:/Date horse/});await waitFor(()=>expect(checkbox).toBeEnabled());await userEvent.click(checkbox);expect(checkbox).toBeChecked();
  fireEvent.change(screen.getByLabelText("Khởi hành (giờ Việt Nam)"),{target:{value:"2026-11-20T10:00"}});fireEvent.change(screen.getByLabelText("Hạn giao (giờ Việt Nam)"),{target:{value:"2026-11-21T10:00"}});
  await screen.findByText(/Không trống trong khoảng ngày này/);expect(checkbox).toBeDisabled();expect(checkbox).not.toBeChecked();
  expect(relational.horses).toHaveBeenCalledWith("2026-11-20T03:00:00.000Z","2026-11-21T03:00:00.000Z",undefined);expect(screen.getByRole("button",{name:"Gửi yêu cầu"})).toBeDisabled();
});
