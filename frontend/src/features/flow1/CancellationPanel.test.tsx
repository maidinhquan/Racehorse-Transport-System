import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancellationPanel } from "./CancellationPanel";
import { cancellationApi } from "./cancellationApi";
import type { Cancellations } from "./cancellationApi";
import type { Payments } from "./paymentApi";
const payments: Payments = { contractId: "c-one", invoiceId: "i-one", contractStatus: "SIGNED", requestStatus: "AWAITING_DEPOSIT",
  requiredDeposit: 40000000, verifiedAmount: 0, outstandingAmount: 40000000, excessAmount: 0, paymentStatus: "UNPAID", effectiveDeadline: "2026-11-10T10:00:00Z",
  deadlineVersion: 2, ledgerVersion: 7, canSubmit: true, bankName: "Fixture", bankAccount: "Fixture", beneficiary: "Fixture", transferContent: "i-one",
  payments: [], activation: null, financialReviewRequired: false };
const item = { id: "cancel-one", status: "PENDING", customerReason: "Đổi kế hoạch", requestedAtUtc: "2026-10-16T10:00:00Z", decisionReason: null, atUtc: "2026-10-16T10:00:00Z" };
const empty: Cancellations = { contractId: "c-one", version: 0, canRequest: true, canReview: false, items: [] };
afterEach(() => vi.restoreAllMocks());
it("Customer explicitly loads cancellation scope and retries the same request without cancelling locally", async () => {
  const get = vi.spyOn(cancellationApi, "get").mockResolvedValue(empty);
  const request = vi.spyOn(cancellationApi, "request").mockRejectedValueOnce(new Error("Mạng gián đoạn"))
    .mockResolvedValue({ ...empty, version: 1, canRequest: false, items: [item] });
  const refresh = vi.fn().mockResolvedValue(undefined); const user = userEvent.setup();
  render(<CancellationPanel id="c-one" manager={false} payments={payments} refresh={refresh} />);
  expect(get).not.toHaveBeenCalled(); await user.click(screen.getByText("Yêu cầu hủy sau ký", { selector: "summary" }));
  await user.click(screen.getByRole("button", { name: "Tải yêu cầu hủy và số tiền mới nhất" }));
  await user.type(await screen.findByLabelText("Lý do đề nghị hủy"), "Đổi kế hoạch");
  await user.click(screen.getByRole("button", { name: "Gửi đề nghị hủy để quản lý xét duyệt" })); await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Gửi đề nghị hủy để quản lý xét duyệt" })); await screen.findByText(/Đang chờ quản lý xét duyệt/);
  expect(request.mock.calls[0].slice(0, 2)).toEqual(["c-one", { expectedVersion: 0, reason: "Đổi kế hoạch" }]);
  expect(request.mock.calls[0][2]).toBe(request.mock.calls[1][2]); expect(screen.queryByText("Duyệt yêu cầu hủy sau ký")).toBeNull();
});
it("Manager cannot approve when money exists but can reject with exact cancellation/ledger/deadline versions", async () => {
  vi.spyOn(cancellationApi, "get").mockResolvedValue({ ...empty, version: 1, canRequest: false, canReview: true, items: [item] });
  const decide = vi.spyOn(cancellationApi, "decide").mockResolvedValue({ ...empty, version: 2, canRequest: false, canReview: false, items: [{ ...item, status: "REJECTED", decisionReason: "Đã nhận tiền" }] });
  const user = userEvent.setup(); render(<CancellationPanel id="c-one" manager payments={{ ...payments, verifiedAmount: 1000 }} refresh={vi.fn().mockResolvedValue(undefined)} />);
  await user.click(screen.getByText("Yêu cầu hủy sau ký", { selector: "summary" })); await user.click(screen.getByRole("button", { name: "Tải yêu cầu hủy và số tiền mới nhất" }));
  await user.type(await screen.findByLabelText("Lý do quyết định hủy (khách xem được)"), "Đã nhận tiền");
  await user.click(screen.getByLabelText("Đã đối soát không có tiền và không còn giao dịch chờ"));
  expect(screen.getByRole("button", { name: "Duyệt yêu cầu hủy sau ký" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Từ chối yêu cầu hủy sau ký" })); await screen.findByText(/REJECTED.*Quyết định: Đã nhận tiền/);
  expect(decide.mock.calls[0].slice(0, 4)).toEqual(["c-one", "cancel-one", false, { expectedVersion: 1, expectedLedgerVersion: 7, expectedDeadlineVersion: 2, reason: "Đã nhận tiền", reconciliationConfirmed: true }]);
});
