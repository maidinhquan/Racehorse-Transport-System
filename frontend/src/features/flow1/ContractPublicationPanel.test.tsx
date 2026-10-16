import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractPublicationPanel } from "./ContractPublicationPanel";
import { publicationApi } from "./publicationApi";
import type { Publication } from "./publicationApi";
vi.mock("./ContractAcceptancePanel", () => ({ ContractAcceptancePanel: ({ pdfViewed }: { pdfViewed: boolean }) => <span data-testid="pdf-consent-gate">{String(pdfViewed)}</span> }));
vi.mock("./ContractLifecyclePanel", () => ({ ContractLifecyclePanel: () => null }));
vi.mock("./ContractDeadlinePanel", () => ({ ContractDeadlinePanel: () => null }));

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
it("Manager reads a committed PDF without reissuing or offering split-storage recovery", async () => {
  vi.spyOn(publicationApi, "get").mockResolvedValue(issued);
  const send = vi.spyOn(publicationApi, "send");
  render(<ContractPublicationPanel id="c-test" manager reviewVersion={12} status="PENDING_SIGNATURE" reload={vi.fn()} />);
  await screen.findByRole("button", { name: "Xem PDF đã phát hành" });
  expect(screen.queryByRole("button", { name: "Phát hành PDF hợp đồng" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Phục hồi|Bỏ bản/ })).toBeNull();
  expect(publicationApi.get).toHaveBeenCalledWith("c-test", true); expect(send).not.toHaveBeenCalled();
});
it("does not reuse the old PDF preview as evidence of viewing a replacement contract", async () => {
  const next = { ...issued, contractId: "c-next", documentHash: "b".repeat(64) };
  vi.spyOn(publicationApi, "get").mockResolvedValueOnce(issued).mockResolvedValueOnce(next);
  vi.spyOn(publicationApi, "pdf").mockResolvedValue("about:blank");
  const original = URL.revokeObjectURL; URL.revokeObjectURL = vi.fn();
  try {
    const { rerender, unmount } = render(<ContractPublicationPanel id="c-test" status="PENDING_SIGNATURE" reload={vi.fn()} />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Xem PDF đã phát hành" }));
    expect(screen.getByTestId("pdf-consent-gate")).toHaveTextContent("true");
    rerender(<ContractPublicationPanel id="c-next" status="PENDING_SIGNATURE" reload={vi.fn()} />);
    await screen.findByText(next.documentHash); expect(screen.getByTestId("pdf-consent-gate")).toHaveTextContent("false");
    expect(screen.queryByTitle("PDF hợp đồng đã phát hành")).toBeNull(); unmount();
  } finally { URL.revokeObjectURL = original; }
});
it("clears the old issued PDF immediately when Customer switches to a new unissued Draft", async () => {
  const get = vi.spyOn(publicationApi, "get").mockResolvedValue(issued);
  const { rerender } = render(<ContractPublicationPanel id="c-test" status="SIGN_DECLINED" reload={vi.fn()} />);
  await screen.findByText(issued.documentHash);
  rerender(<ContractPublicationPanel id="new-draft" status="DRAFT" reload={vi.fn()} />);
  expect(screen.queryByText(issued.documentHash)).toBeNull();
  expect(screen.queryByRole("button", { name: "Xem PDF đã phát hành" })).toBeNull(); expect(get).toHaveBeenCalledOnce();
});
