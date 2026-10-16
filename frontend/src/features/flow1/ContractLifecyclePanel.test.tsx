import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractLifecyclePanel } from "./ContractLifecyclePanel";
import { lifecycleApi } from "./lifecycleApi";
import type { Lifecycle } from "./lifecycleApi";
import type { Publication } from "./publicationApi";
const publication: Publication = { contractId: "issued-1", version: 2, documentHash: "b".repeat(64), status: "PENDING_SIGNATURE",
  currency: "VND", total: 100000000, deposit: 40000000, originalCompletionDeadline: "2026-11-10T10:00:00Z",
  documentSizeBytes: 600000, templateVersion: "v2", overdue: false, recoveryRequired: false };
const open: Lifecycle = { contractId: "issued-1", version: 0, status: "PENDING_SIGNATURE", canDecline: true, canExpire: false, canReissue: false, history: [] };
afterEach(() => vi.restoreAllMocks());
it("Customer closes the exact issued document with a reason and stable network retry key", async () => {
  vi.spyOn(lifecycleApi, "get").mockResolvedValue(open);
  const close = vi.spyOn(lifecycleApi, "close").mockRejectedValueOnce(new Error("Mạng gián đoạn")).mockResolvedValue({ ...open, version: 1, status: "SIGN_DECLINED", canDecline: false });
  const reload = vi.fn().mockResolvedValue(undefined); const user = userEvent.setup();
  render(<ContractLifecyclePanel publication={publication} manager={false} reload={reload} />);
  await user.click(await screen.findByText("Từ chối phiên bản hợp đồng"));
  expect(screen.getByRole("button", { name: "Xác nhận từ chối hợp đồng" })).toBeDisabled();
  await user.type(screen.getByLabelText("Lý do từ chối hợp đồng"), "Cần sửa điều khoản");
  await user.click(screen.getByRole("button", { name: "Xác nhận từ chối hợp đồng" }));
  await screen.findByRole("alert"); await user.click(screen.getByRole("button", { name: "Xác nhận từ chối hợp đồng" }));
  await screen.findByText("Phiên bản này: SIGN_DECLINED");
  expect(close.mock.calls[0].slice(0, 3)).toEqual(["issued-1", false, { contractVersion: 2, documentHash: publication.documentHash, expectedLifecycleVersion: 0, reason: "Cần sửa điều khoản" }]);
  expect(close.mock.calls[0][3]).toBe(close.mock.calls[1][3]); expect(reload).toHaveBeenCalledOnce();
  expect(screen.queryByText("Đánh dấu hợp đồng hết hạn")).toBeNull();
});
it("Manager gets explicit expiry only when enabled by server, with no Customer decline control", async () => {
  vi.spyOn(lifecycleApi, "get").mockResolvedValue({ ...open, canDecline: false, canExpire: true });
  const close = vi.spyOn(lifecycleApi, "close").mockResolvedValue({ ...open, version: 1, status: "EXPIRED", canDecline: false, canReissue: true });
  const user = userEvent.setup(); render(<ContractLifecyclePanel publication={publication} manager reload={vi.fn()} />);
  await user.click(await screen.findByText("Xử lý phiên bản quá hạn"));
  await user.type(screen.getByLabelText("Lý do đánh dấu hết hạn"), "Hết thời hạn hoàn tất");
  await user.click(screen.getByRole("button", { name: "Đánh dấu hợp đồng hết hạn" }));
  await screen.findByText(/Có thể tạo Draft mới/); expect(close.mock.calls[0][1]).toBe(true);
  expect(screen.queryByText("Từ chối phiên bản hợp đồng")).toBeNull();
});
it("historical read-only mode shows evidence without any closing controls", async () => {
  vi.spyOn(lifecycleApi, "get").mockResolvedValue({ ...open, history: [{ action: "REISSUED", atUtc: "2026-10-16T11:00:00Z", reason: null, actor: null, replacementContractId: "issued-2" }] });
  render(<ContractLifecyclePanel publication={publication} manager={false} readOnly reload={vi.fn()} />);
  await screen.findByText(/Draft mới: issued-2/); expect(screen.queryByText("Từ chối phiên bản hợp đồng")).toBeNull();
});
