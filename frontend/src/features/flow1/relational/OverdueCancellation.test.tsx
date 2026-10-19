import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenderPaymentsPage } from "../../Manager/pages/dashboard/views/RenderPaymentsPage";
import type { DeadlineOverdueItem } from "../../Manager/pages/dashboard/views/manager.types";

const overdue = { requestId: "REQ_2026_004", customerName: "Customer", routeDisplay: "A → B", contractStatus: "PENDING_SIGNATURE", completionDeadline: "2026-10-01T00:00:00Z", daysExpired: 1, isGracePeriodEnded: true, depositOutstanding: 400000, currency: "VND" } as DeadlineOverdueItem;
function page(cancel: (id: string, reason: string) => Promise<void>) {
  render(<RenderPaymentsPage transactions={[]} overdueList={[overdue]} onCancelOverdue={cancel} onConfirmTransaction={vi.fn()} onRejectTransaction={vi.fn()} onExtendDeadline={vi.fn()} onNavigate={vi.fn()} />);
}

test("overdue cancellation failure stays visible inside the open modal", async () => {
  const cancel=vi.fn().mockRejectedValue(new Error("Resolve money and gateway attempts first."));page(cancel);
  await userEvent.click(screen.getByRole("button", { name: /Quản lý Quá hạn/ }));
  await userEvent.click(screen.getByRole("button", { name: "Hủy đơn" }));
  await userEvent.click(screen.getByRole("button", { name: "Xác nhận Hủy Đơn Quá Hạn" }));
  const error=await screen.findByRole("alert");
  expect(error).toHaveTextContent("Resolve money and gateway attempts first.");
  expect(error.closest(".modal-box")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Xác nhận Hủy Đơn Quá Hạn" })).toBeEnabled();
});

test("same cancel button submits the overdue signature request and closes only after success", async () => {
  const cancel=vi.fn().mockResolvedValue(undefined);page(cancel);
  await userEvent.click(screen.getByRole("button", { name: /Quản lý Quá hạn/ }));
  await userEvent.click(screen.getByRole("button", { name: "Hủy đơn" }));
  await userEvent.click(screen.getByRole("button", { name: "Xác nhận Hủy Đơn Quá Hạn" }));
  expect(cancel).toHaveBeenCalledWith("REQ_2026_004",expect.any(String));
  expect(screen.queryByRole("button", { name: "Xác nhận Hủy Đơn Quá Hạn" })).not.toBeInTheDocument();
});
