import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractDeadlinePanel } from "./ContractDeadlinePanel";
import { deadlineApi } from "./deadlineApi";
import type { Deadlines } from "./deadlineApi";
import type { Publication } from "./publicationApi";
const pdf: Publication = { contractId: "c-one", version: 1, status: "SIGNED", currency: "VND", total: 100000000, deposit: 40000000,
  originalCompletionDeadline: "2026-11-10T10:00:00Z", documentHash: "a".repeat(64), documentSizeBytes: 500000, templateVersion: "v2", overdue: false, recoveryRequired: false };
const initial: Deadlines = { contractId: "c-one", version: 0, originalCompletionDeadline: pdf.originalCompletionDeadline,
  effectiveCompletionDeadline: pdf.originalCompletionDeadline, overdue: false, canExtend: true, history: [] };
afterEach(() => vi.restoreAllMocks());
it("Manager extends with exact PDF/version, Vietnam local time and a stable retry key", async () => {
  vi.spyOn(deadlineApi, "get").mockResolvedValue(initial);
  const extend = vi.spyOn(deadlineApi, "extend").mockRejectedValueOnce(new Error("Mạng gián đoạn")).mockResolvedValue({ ...initial, version: 1, effectiveCompletionDeadline: "2026-11-11T10:00:00Z" });
  const reload = vi.fn().mockResolvedValue(undefined); const user = userEvent.setup();
  render(<ContractDeadlinePanel publication={pdf} manager reload={reload} />);
  await user.click(await screen.findByText("Gia hạn hoàn tất ký và cọc"));
  expect(screen.getByRole("button", { name: "Xác nhận gia hạn" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Hạn mới (giờ Việt Nam UTC+7)"), { target: { value: "2026-11-11T17:00" } });
  await user.type(screen.getByLabelText("Lý do gia hạn (nội bộ)"), "Chờ xác minh cọc");
  await user.click(screen.getByRole("button", { name: "Xác nhận gia hạn" })); await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Xác nhận gia hạn" }));
  await screen.findByText(/Hạn hiệu lực:.*11\/11\/2026/);
  expect(extend.mock.calls[0].slice(0, 2)).toEqual(["c-one", { contractVersion: 1, documentHash: pdf.documentHash,
    expectedExtensionVersion: 0, newDeadline: "2026-11-11T10:00:00.000Z", reason: "Chờ xác minh cọc" }]);
  expect(extend.mock.calls[0][2]).toBe(extend.mock.calls[1][2]); expect(reload).toHaveBeenCalledOnce();
});
it("Customer can refresh and read original/effective history without Manager controls", async () => {
  vi.spyOn(deadlineApi, "get").mockResolvedValue({ ...initial, version: 1, canExtend: false, overdue: true,
    history: [{ version: 1, previousDeadline: initial.originalCompletionDeadline, newDeadline: "2026-11-11T10:00:00Z", atUtc: "2026-10-16T10:00:00Z", reason: null, actor: null }] });
  const reload = vi.fn().mockResolvedValue(undefined);
  render(<ContractDeadlinePanel publication={pdf} manager={false} reload={reload} />);
  await screen.findByRole("list", { name: "Lịch sử gia hạn" }); expect(screen.queryByText("Gia hạn hoàn tất ký và cọc")).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Tải lại hạn hiệu lực" })); expect(reload).toHaveBeenCalledOnce();
  expect(screen.getByText(/Yêu cầu và lịch ngựa vẫn được giữ/)).toBeInTheDocument();
});
it("read-only historical mode hides extension forms even if a stale server view permits them", async () => {
  vi.spyOn(deadlineApi, "get").mockResolvedValue(initial);
  render(<ContractDeadlinePanel publication={pdf} manager readOnly reload={vi.fn()} />);
  await screen.findByText(/Hạn hiệu lực:/); expect(screen.queryByText("Gia hạn hoàn tất ký và cọc")).toBeNull();
});
it("clears a committed extension form when the parent refresh fails so retry cannot accidentally submit a second extension", async () => {
  vi.spyOn(deadlineApi, "get").mockResolvedValue(initial);
  const extend = vi.spyOn(deadlineApi, "extend").mockResolvedValue({ ...initial, version: 1, effectiveCompletionDeadline: "2026-11-11T10:00:00Z" });
  render(<ContractDeadlinePanel publication={pdf} manager reload={vi.fn().mockRejectedValue(new Error("Refresh failed"))} />);
  const user = userEvent.setup(); await user.click(await screen.findByText("Gia hạn hoàn tất ký và cọc"));
  fireEvent.change(screen.getByLabelText("Hạn mới (giờ Việt Nam UTC+7)"), { target: { value: "2026-11-11T17:00" } });
  fireEvent.change(screen.getByLabelText("Lý do gia hạn (nội bộ)"), { target: { value: "Chờ xác minh" } });
  await user.click(screen.getByRole("button", { name: "Xác nhận gia hạn" })); await screen.findByRole("alert");
  expect(screen.getByLabelText("Hạn mới (giờ Việt Nam UTC+7)")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Xác nhận gia hạn" })).toBeDisabled(); expect(extend).toHaveBeenCalledOnce();
});
