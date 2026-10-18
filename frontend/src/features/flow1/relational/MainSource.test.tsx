import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireCustomer } from "../../auth/RequireCustomer";
import { getCurrentUser } from "../../auth/api/authApi";
import { relational } from "./api";
import { flow1, get } from "../api";
import { CreateRequestWizard } from "../../customer/pages/create-request/CreateRequestWizard";
import ContractPage from "../../user-dashboard/page/transport-request-page/contract/ContractPage";
import PaymentPage from "../../user-dashboard/page/transport-request-page/payment/PaymentPage";
import PaymentSuccessPage from "../../user-dashboard/page/transport-request-page/payment/PaymentSuccessPage";
import { RenderContractsPage } from "../../Manager/pages/dashboard/views/RenderContractsPage";
import { RenderRequestsPage } from "../../Manager/pages/dashboard/views/RenderRequestsPage";
import { contractView, transactionsView } from "./mainBindings";
import { managerRequest } from "../../Manager/pages/dashboard/managerPresentation";
import { useManagerBackend } from "../../Manager/pages/dashboard/useManagerBackend";
import type { Request, Contract } from "./api";
import { renderHook } from "@testing-library/react";
import { LandingPage } from "../../landing/LandingPage";
import { estimateSeed } from "../api";
import { apiClient } from '../../../shared/api/apiClient';
vi.mock("../../auth/api/authApi", () => ({ getCurrentUser: vi.fn() }));
vi.mock("../api", async original => ({ ...await original<object>(), get: vi.fn() }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.mocked(get).mockResolvedValue([]); vi.spyOn(window, "alert").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
const horse = { horseId: "owned", name: "SQL horse", breed: "Breed", microchipIso: "123456789012345", passportNo: "FEI", hasDocuments: true, selectable: true, version: "hv" };
const row = { requestId: "real", version: "rv", customerName: "SQL Customer", departure: "API A", destination: "API B", status: "ACCEPTED", horses: [horse], preparationDays: 2, departureAt: "2026-11-20T00:00:00Z", deliveryAt: "2026-11-22T00:00:00Z", contracts: [], input: { trip: { pickup: { country: "VN" }, delivery: { country: "VN" } } } } as unknown as Request;
const c = { contractId: "sql-contract", version: "cv", status: "SIGNED", isCurrent: true, relationalTermsReady: true, hasAcceptanceEvidence: true, totalPrice: 100000000, depositAmount: 40000000, currency: "VND", paidAmount: 0, payments: [], signDeadline: "2026-11-01T10:00:00Z", signedAt: "2026-10-20T10:00:00Z" } as unknown as Contract;
function guarded() { render(<MemoryRouter initialEntries={["/customer/create-request"]}><Routes><Route path="/customer/create-request" element={<RequireCustomer><p>Wizard mounted</p></RequireCustomer>} /><Route path="/login" element={<p>Original login</p>} /></Routes></MemoryRouter>); }

test("Quan landing requires a complete route and keeps only advisory hints through guest login", async () => {
  localStorage.setItem("userRole", "CUSTOMER");
  render(<MemoryRouter><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<p>Original login</p>} /></Routes></MemoryRouter>);
  const send = screen.getByRole("button", { name: /Gửi yêu cầu/ });
  expect(send).toBeDisabled();
  await userEvent.selectOptions(screen.getByLabelText("Điểm đi"), "Ho Chi Minh City");
  await userEvent.selectOptions(screen.getByLabelText("Điểm đến"), "Ho Chi Minh City");
  await userEvent.type(screen.getByPlaceholderText("Nhập số ngựa"), "2");
  expect(send).toBeDisabled();
  expect(screen.getByText("Điểm đến phải khác điểm đi.")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Điểm đến"), "Tokyo");
  expect(send).toBeEnabled();
  expect(screen.getByText(/Cọc 40%:/)).toHaveTextContent("37,000,000 VND");
  await userEvent.click(send);
  await screen.findByText("Original login");
  const hint = JSON.parse(sessionStorage.getItem(estimateSeed)!);
  expect(hint.pickup.address).toBe("Ho Chi Minh City");
  expect(hint.delivery.country).toBe("JP");
  expect(hint.horseCount).toBe(2);
  expect(hint).not.toHaveProperty("totalPrice");
});
test("guest direct create-request and role-only hint cannot mount the wizard", async () => {
  localStorage.setItem("userRole", "CUSTOMER"); guarded(); await screen.findByText("Original login"); expect(getCurrentUser).not.toHaveBeenCalled(); expect(screen.queryByText("Wizard mounted")).not.toBeInTheDocument();
});
test.each(["expired", "wrong-role"])("%s token is checked by backend before mounting the wizard", async mode => {
  localStorage.setItem("accessToken", "hint");
  if (mode === "expired") vi.mocked(getCurrentUser).mockRejectedValue(new Error("Unauthorized"));
  else vi.mocked(getCurrentUser).mockResolvedValue({ success: true, message: "", data: { role: "LOGISTICS_MANAGER" } } as never);
  guarded(); await screen.findByText("Original login"); expect(screen.queryByText("Wizard mounted")).not.toBeInTheDocument();
});
test("verified Customer mounts existing page without a replacement loading screen", async () => {
  localStorage.setItem("accessToken", "valid"); vi.mocked(getCurrentUser).mockResolvedValue({ success: true, data: { role: "CUSTOMER" } } as never); guarded(); await screen.findByText("Wizard mounted");
});
test("main contract keeps its card but agreement cannot bypass absent PDF/OTP UI", async () => {
  vi.spyOn(relational, "detail").mockResolvedValue({ ...row, contracts: [{ ...c, status: "PENDING_SIGNATURE", hasAcceptanceEvidence: false, signedAt: null }] }); const action = vi.spyOn(relational, "action");
  render(<MemoryRouter initialEntries={["/customer/requests/real/contract"]}><Routes><Route path="/customer/requests/:requestId/contract" element={<ContractPage />} /></Routes></MemoryRouter>);
  await screen.findByText("sql-contract"); await userEvent.click(screen.getByRole("checkbox")); expect(screen.getByRole("button", { name: "Sign Contract" })).toBeDisabled(); expect(action).not.toHaveBeenCalled(); expect(document.querySelector(".contract-info-grid")).toBeInTheDocument();
});
test("legacy USD contract cannot open VNPay payment", async () => {
  vi.spyOn(relational, "detail").mockResolvedValue({ ...row, contracts: [{ ...c, isCurrent: false, relationalTermsReady: false, hasAcceptanceEvidence: false, currency: "USD", totalPrice: 100 }] });
  render(<MemoryRouter initialEntries={["/customer/requests/real/payment"]}><Routes><Route path="/customer/requests/:requestId/payment" element={<PaymentPage />} /></Routes></MemoryRouter>);
  await screen.findByText("sql-contract"); expect(screen.getByRole("button", { name: "Pay with VNPay" })).toBeDisabled(); expect(document.querySelector(".payment-deposit-box")).toHaveTextContent("USD");
});
test("signed eligible contract uses the existing VNPay button but refuses an unexpected checkout host", async () => {
  vi.spyOn(relational, "detail").mockResolvedValue({ ...row, contracts: [c] });
  const action = vi.spyOn(relational, "action").mockResolvedValue({ url: "https://unexpected.invalid/checkout" });
  render(<MemoryRouter initialEntries={["/customer/requests/real/payment"]}><Routes><Route path="/customer/requests/:requestId/payment" element={<PaymentPage />} /></Routes></MemoryRouter>);
  await screen.findByText("sql-contract"); const button = screen.getByRole("button", { name: "Pay with VNPay" }); expect(button).toBeEnabled();
  await userEvent.click(button); expect(action).toHaveBeenCalledWith("/customer/contracts/sql-contract/vnpay", {}, expect.any(String)); expect(window.alert).toHaveBeenCalledWith("Payment URL không hợp lệ.");
});
test("payment read model distinguishes pending IPN from verified money requiring review", () => {
  const base = { paymentId: "pending", version: "pv", amount: 40000000, receivedAmount: null, status: "PENDING", transactionCode: null, paidAt: null, reviewRequired: false, reviewReason: null, method: "VNPAY", currency: "VND" };
  const records = [{ ...row, contracts: [{ ...c, payments: [base, { ...base, paymentId: "review", status: "SUCCESS", receivedAmount: 40000000, reviewRequired: true }] }] }];
  const payments = transactionsView(records); expect(payments[0].status).toBe("PENDING"); expect(payments[0].statusLabel).toBe("Chờ VNPay IPN"); expect(payments[1].status).toBe("PENDING_CONFIRMATION");
});
test("ReturnURL alone shows unverified status and never calls a payment mutation", async () => {
  vi.spyOn(relational, "returned").mockResolvedValue({ requestId: "real", contract: { ...c, invoiceStatus: "UNPAID" } }); const action = vi.spyOn(relational, "action");
  render(<MemoryRouter initialEntries={["/customer/payments/return?vnp_TxnRef=pid&vnp_ResponseCode=00"]}><PaymentSuccessPage /></MemoryRouter>);
  await screen.findByText("UNPAID"); expect(screen.getByText(/ReturnURL không xác nhận tiền/)).toBeInTheDocument(); expect(action).not.toHaveBeenCalled();
});
test("main Manager modal stays open when acceptance fails", async () => {
  const accept = vi.fn().mockRejectedValue(new Error("stale row"));
  render(<RenderRequestsPage requests={[managerRequest({ ...row, status: "PENDING" })]} onAcceptRequest={accept} onRejectRequest={vi.fn()} onRequestRevision={vi.fn()} onNavigate={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Xem & Duyệt" })); await userEvent.click(screen.getByRole("button", { name: /Chấp nhận \(Accept\)/ })); await userEvent.click(screen.getByRole("button", { name: "Xác nhận Chấp thuận" }));
  expect(window.alert).toHaveBeenCalledWith("stale row"); expect(screen.getByRole("button", { name: "Xác nhận Chấp thuận" })).toBeInTheDocument();
});
test("main contract studio does not report a failed save as success or alter the 40% ratio", async () => {
  const save = vi.fn().mockRejectedValue(new Error("SQL rejected"));
  render(<RenderContractsPage contracts={[contractView(row, { ...c, status: "DRAFT", contractId: "draft:real", totalPrice: 100000000 })]} requests={[managerRequest(row)]} onSaveContract={save} onSendContract={vi.fn()} onNavigate={vi.fn()} />);
  expect(screen.getByRole("button", { name: "30%" })).toBeDisabled(); await userEvent.click(screen.getByRole("button", { name: /Lưu nháp/ })); await waitFor(() => expect(window.alert).toHaveBeenCalledWith("SQL rejected")); expect(screen.queryByText(/Đã lưu thành công/)).not.toBeInTheDocument();
});
test("backend adapter refuses unsupported itemized quote or manual money confirmation", async () => {
  vi.spyOn(relational, "list").mockResolvedValue([row]); const action = vi.spyOn(relational, "action"); const hook = renderHook(useManagerBackend); await waitFor(() => expect(hook.result.current.requests).toHaveLength(1));
  await expect(hook.result.current.save({ ...contractView(row), depositPercent: 30 })).rejects.toThrow("cọc40%");
  await expect(hook.result.current.confirm("unknown", 40000000, "BANK-MANUAL")).rejects.toThrow("Không xác nhận tiền"); expect(action).not.toHaveBeenCalled();
});
test("original wizard sends versions and owner contact, excludes advisory price, and retries with the same key", async () => {
  vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { demoTransportCost: 3500000 } } });
  vi.spyOn(relational, "horses").mockResolvedValue([horse]); vi.mocked(get).mockResolvedValue({ fullName: "Owner", phoneNumber: "0900000000" });
  vi.spyOn(flow1, "search").mockImplementation(async (address, country) => [{ label: address, point: { latitude: 10, longitude: 106, countryCode: country }, attribution: "Fixture" }]);
  const submit = vi.spyOn(relational, "submit").mockRejectedValueOnce(new Error("Retry please")).mockResolvedValue({ ...row, requestId: "saved" });
  render(<MemoryRouter><Routes><Route path="/" element={<CreateRequestWizard />} /><Route path="/customer/requests/saved" element={<p>Saved SQL</p>} /></Routes></MemoryRouter>);
  const dates = document.querySelectorAll('input[type="date"]'); fireEvent.change(dates[0], { target: { value: "2026-11-20" } }); fireEvent.change(dates[1], { target: { value: "2026-11-21" } });
  await userEvent.click(screen.getByRole("button", { name: "2. Địa chỉ Giao/Nhận" }));
  for (const [name, value] of [["Địa chỉ Trại / CLB lấy ngựa", "Pickup"], ["Địa chỉ Trường đua / Trại nhận ngựa", "Delivery"]]) {
    const input = screen.getByRole('combobox', { name });
    await userEvent.click(input); fireEvent.change(input, { target: { value } });
    await userEvent.click(await screen.findByRole('option', { name: value }));
  }
  const inputs = document.querySelectorAll('.form-grid-2 input');
  fireEvent.change(inputs[2], { target: { value: 'Receiver' } }); fireEvent.change(inputs[3], { target: { value: '0900000001' } });
  await userEvent.click(screen.getByRole("button", { name: "3. Chọn Ngựa đua" })); await userEvent.click(await screen.findByText(/SQL horse/)); await userEvent.click(screen.getByRole("button", { name: "4. Hồ sơ & Thương mại" }));
  await userEvent.click(screen.getByRole("button", { name: "Gửi Yêu Cầu Vận Chuyển" })); await screen.findByText(/Retry please/); await userEvent.click(screen.getByRole("button", { name: "Gửi Yêu Cầu Vận Chuyển" })); await screen.findByText("Saved SQL");
  expect(submit.mock.calls[0][1]).toBe(submit.mock.calls[1][1]); const payload = submit.mock.calls[0][0]; expect(payload.horses).toEqual([{ horseId: "owned", version: "hv" }]); expect(payload.pickupContact.phone).toBe("0900000000"); expect(payload).not.toHaveProperty("price"); expect(payload).not.toHaveProperty("commercialValue");
});


test("manager suggested price uses backend demo transport cost without fabricating a floor or planning budget", () => {
  const value = contractView({ ...row, estimatedTransportCost: 55148800 }, c);
  expect(value.suggestedTotal).toBe(55148800);
  expect(value.totalAmount).toBe(c.totalPrice);
  expect(value.floorPrice).toBe(0);
});
