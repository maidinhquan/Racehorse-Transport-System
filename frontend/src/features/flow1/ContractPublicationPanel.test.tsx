import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractPublicationPanel } from "./ContractPublicationPanel";
import { publicationApi } from "./publicationApi";
import type { Publication } from "./publicationApi";

const issued: Publication = { contractId: "c-test", version: 1, status: "PENDING_SIGNATURE", currency: "VND", total: 115000000,
  deposit: 46000000, originalCompletionDeadline: "2026-11-10T10:00:00Z", documentHash: "a".repeat(64),
  documentSizeBytes: 600000, templateVersion: "v2", overdue: false, recoveryRequired: false };
afterEach(() => vi.restoreAllMocks());
it("Manager publishes with review version and a stable retry key, translating Vietnam local time", async () => {
  vi.spyOn(publicationApi, "get").mockResolvedValue(null);
  const send = vi.spyOn(publicationApi, "send").mockRejectedValueOnce(new Error("Mạng gián đoạn")).mockResolvedValue(issued);
  const reload = vi.fn().mockResolvedValue(undefined);
  render(<ContractPublicationPanel id="c-test" manager reviewVersion={12} status="DRAFT" reload={reload} />);
  fireEvent.change(screen.getByLabelText("Hạn hoàn tất ký và cọc (giờ Việt Nam UTC+7)"), { target: { value: "2026-11-10T17:00" } });
  const user = userEvent.setup(); await user.click(screen.getByRole("button", { name: "Phát hành PDF hợp đồng" }));
  await screen.findByRole("alert"); await user.click(screen.getByRole("button", { name: "Phát hành PDF hợp đồng" }));
  await screen.findByRole("button", { name: "Xem PDF đã phát hành" });
  expect(send.mock.calls[0][1]).toEqual({ expectedReviewVersion: 12, completionDeadline: "2026-11-10T10:00:00.000Z" });
  expect(send.mock.calls[0][2]).toBe(send.mock.calls[1][2]); expect(reload).toHaveBeenCalledOnce();
});
it("Customer can read an overdue issued contract without any Manager publication controls", async () => {
  vi.spyOn(publicationApi, "get").mockResolvedValue({ ...issued, overdue: true });
  render(<ContractPublicationPanel id="c-test" status="PENDING_SIGNATURE" reload={vi.fn()} />);
  await screen.findByRole("button", { name: "Xem PDF đã phát hành" });
  expect(screen.getByText(/Yêu cầu không tự hủy/)).toBeInTheDocument(); expect(screen.getByText(issued.documentHash)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Phát hành PDF hợp đồng" })).toBeNull();
  expect(publicationApi.get).toHaveBeenCalledWith("c-test", false);
});
it("Manager can recover an existing prepared PDF without submitting a new publication", async () => {
  vi.spyOn(publicationApi, "get").mockResolvedValue({ ...issued, recoveryRequired: true, status: "DRAFT" });
  const recover = vi.spyOn(publicationApi, "recover").mockResolvedValue(issued); const send = vi.spyOn(publicationApi, "send");
  render(<ContractPublicationPanel id="c-test" manager reviewVersion={12} status="DRAFT" reload={vi.fn().mockResolvedValue(undefined)} />);
  await userEvent.setup().click(await screen.findByRole("button", { name: "Phục hồi phát hành" }));
  await screen.findByRole("button", { name: "Xem PDF đã phát hành" });
  expect(recover).toHaveBeenCalledWith("c-test"); expect(send).not.toHaveBeenCalled();
});
