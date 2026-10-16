import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepositPaymentsPanel } from "./DepositPaymentsPanel";
import { paymentApi } from "./paymentApi";
import type { Payments } from "./paymentApi";
vi.mock("./DeploymentPanel", () => ({ DeploymentPanel: () => <p>Deployment test boundary</p> }));
const initial: Payments = { contractId: "c-one", invoiceId: "invoice-one", contractStatus: "SIGNED", requestStatus: "AWAITING_DEPOSIT",
  requiredDeposit: 40000000, verifiedAmount: 0, outstandingAmount: 40000000, excessAmount: 0, paymentStatus: "UNPAID",
  effectiveDeadline: "2026-11-10T10:00:00Z", deadlineVersion: 0, canSubmit: true, bankName: "Fixture Bank", bankAccount: "Fixture Account",
  beneficiary: "Fixture Company", transferContent: "invoice-one", payments: [], activation: null, financialReviewRequired: false };
const pending = { paymentId: "p-one", version: 1, method: "BANK_TRANSFER", status: "PENDING_CONFIRMATION", declaredAmount: 40000000,
  verifiedAmount: 0, reference: null, receivedAtUtc: null, reason: null, memo: "Test", hasProof: true, late: false };
afterEach(() => vi.restoreAllMocks());
it("Manager enters actual money and Vietnam posting time; network retry keeps the same operation key", async () => {
  vi.spyOn(paymentApi, "get").mockResolvedValue({ ...initial, payments: [pending] });
  const confirm = vi.spyOn(paymentApi, "confirm").mockRejectedValueOnce(new Error("Network interrupted"))
    .mockResolvedValue({ ...initial, verifiedAmount: 10000000, paymentStatus: "PARTIALLY_PAID", payments: [{ ...pending, version: 2, status: "SUCCESS", verifiedAmount: 10000000 }] });
  render(<DepositPaymentsPanel id="c-one" manager />); const user = userEvent.setup();
  await screen.findByText("Đối chiếu sao kê p-one"); expect(screen.queryByText("Gửi chứng từ để xác minh")).toBeNull();
  expect(screen.getByRole("button", { name: "Xác nhận tiền thực nhận" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Số thực nhận (VND)"), { target: { value: "10000000" } });
  await user.type(screen.getByLabelText("Mã giao dịch ngân hàng"), "BANK-001");
  fireEvent.change(screen.getByLabelText("Thời điểm nhận (giờ Việt Nam UTC+7)"), { target: { value: "2026-10-16T17:30" } });
  await user.click(screen.getByRole("button", { name: "Xác nhận tiền thực nhận" })); await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Xác nhận tiền thực nhận" })); await screen.findByText("Trạng thái thanh toán: PARTIALLY_PAID");
  expect(confirm.mock.calls[0].slice(0, 3)).toEqual(["c-one", "p-one", { expectedVersion: 1, receivedAmount: 10000000, bankReference: "BANK-001", receivedAtUtc: "2026-10-16T10:30:00.000Z" }]);
  expect(confirm.mock.calls[0][3]).toBe(confirm.mock.calls[1][3]);
});
it("Customer sees pending as zero received and can download owned proof without Manager controls", async () => {
  vi.spyOn(paymentApi, "get").mockResolvedValue({ ...initial, canSubmit: false, payments: [pending] });
  const download = vi.spyOn(paymentApi, "proof").mockResolvedValue(undefined);
  render(<DepositPaymentsPanel id="c-one" />); await screen.findByText(/p-one · BANK_TRANSFER · PENDING_CONFIRMATION/);
  expect(screen.queryByText("Xác nhận tiền thực nhận")).toBeNull(); expect(screen.queryByText("Gửi chứng từ để xác minh")).toBeNull();
  expect(within(screen.getByRole("list", { name: "Giao dịch cọc" })).getByText(/Thực nhận đã xác minh: 0/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Tải chứng từ p-one" })); expect(download).toHaveBeenCalledWith("c-one", "p-one", false);
});
it("confirmed activation and excess are visible and cannot submit another proof", async () => {
  vi.spyOn(paymentApi, "get").mockResolvedValue({ ...initial, canSubmit: false, verifiedAmount: 41000000, excessAmount: 1000000,
    financialReviewRequired: true, activation: { tripId: "trip-one", atUtc: "2026-10-16T10:00:00Z", scheduleNeedsReview: true } });
  render(<DepositPaymentsPanel id="c-one" />); await screen.findByText(/Đã kích hoạt chuyến trip-one/);
  expect(screen.getByText(/Cần quản lý đối soát tài chính/)).toBeInTheDocument(); expect(screen.queryByText("Gửi chứng từ để xác minh")).toBeNull();
});
