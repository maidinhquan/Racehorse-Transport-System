import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractAcceptancePanel } from "./ContractAcceptancePanel";
import { acceptanceApi } from "./acceptanceApi";
import type { Acceptance } from "./acceptanceApi";
import type { Publication } from "./publicationApi";
const pdf: Publication = { contractId: "c-1", version: 2, status: "PENDING_SIGNATURE", currency: "VND", total: 100000000, deposit: 40000000,
  originalCompletionDeadline: "2026-11-10T10:00:00Z", documentHash: "a".repeat(64), documentSizeBytes: 500000, templateVersion: "v2", overdue: false, recoveryRequired: false };
const awaiting: Acceptance = { contractId: "c-1", version: 0, status: "PENDING_SIGNATURE", overdue: false, recoveryRequired: false, receipt: null, invoice: null };
const signed: Acceptance = { ...awaiting, version: 2, status: "SIGNED", receipt: { contractId: "c-1", customerId: "owner", contractVersion: 2, documentHash: pdf.documentHash,
  method: "EMAIL_OTP", signedAtUtc: "2026-10-16T10:00:00Z", invoiceId: "di-1", deposit: 40000000 },
  invoice: { invoiceId: "di-1", amount: 40000000, paidAmount: 0, currency: "VND", status: "UNPAID", dueAtUtc: "2026-11-10T10:00:00Z" } };
afterEach(() => vi.restoreAllMocks());
it("requires opening the PDF and explicit consent before requesting an OTP", async () => {
  vi.spyOn(acceptanceApi, "get").mockResolvedValue(awaiting);
  const { rerender } = render(<ContractAcceptancePanel publication={pdf} manager={false} pdfViewed={false} reload={vi.fn()} />);
  const consent = await screen.findByRole("checkbox"); expect(consent).toBeDisabled(); expect(screen.getByRole("button", { name: "Gửi mã OTP" })).toBeDisabled();
  rerender(<ContractAcceptancePanel publication={pdf} manager={false} pdfViewed reload={vi.fn()} />);
  await userEvent.setup().click(consent); expect(screen.getByRole("button", { name: "Gửi mã OTP" })).toBeEnabled();
});
it("binds confirmation to the PDF, preserves retry key and clears OTP after a successful confirmation", async () => {
  vi.spyOn(acceptanceApi, "get").mockResolvedValue(awaiting);
  vi.spyOn(acceptanceApi, "otp").mockResolvedValue({ challengeId: "otp-fixture", expiresAt: new Date(Date.now() + 300000).toISOString(), resendAt: new Date(Date.now() + 60000).toISOString() });
  const confirm = vi.spyOn(acceptanceApi, "sign").mockRejectedValueOnce(new Error("Mạng gián đoạn")).mockResolvedValue(signed);
  const reload = vi.fn().mockResolvedValue(undefined); const user = userEvent.setup();
  render(<ContractAcceptancePanel publication={pdf} manager={false} pdfViewed reload={reload} />);
  await user.click(await screen.findByRole("checkbox")); await user.click(screen.getByRole("button", { name: "Gửi mã OTP" }));
  const input = await screen.findByLabelText("Mã OTP"); await user.type(input, "123456");
  await user.click(screen.getByRole("button", { name: "Xác nhận ký hợp đồng" })); await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Xác nhận ký hợp đồng" }));
  await screen.findByText(/Đã xác nhận bằng OTP email lúc/);
  expect(confirm.mock.calls[0][1]).toEqual({ contractVersion: 2, documentHash: pdf.documentHash, challengeId: "otp-fixture", otp: "123456", acceptedTerms: true });
  expect(confirm.mock.calls[0][2]).toBe(confirm.mock.calls[1][2]); expect(screen.queryByLabelText("Mã OTP")).toBeNull();
  expect(screen.getByText(/40.000.000 VND/)).toBeInTheDocument(); expect(reload).toHaveBeenCalledOnce();
});
it("Manager reads the committed receipt and invoice without Customer signing or recovery controls", async () => {
  vi.spyOn(acceptanceApi, "get").mockResolvedValue(signed);
  render(<ContractAcceptancePanel publication={pdf} manager pdfViewed={false} reload={vi.fn()} />);
  await screen.findByText(/Đã xác nhận bằng OTP email lúc/);
  expect(screen.getByText(/40.000.000 VND/)).toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).toBeNull(); expect(screen.queryByLabelText("Mã OTP")).toBeNull();
  expect(screen.queryByRole("button", { name: /Gửi mã OTP|Phục hồi|Bỏ xác nhận/ })).toBeNull();
  expect(acceptanceApi.get).toHaveBeenCalledWith("c-1", true);
});
