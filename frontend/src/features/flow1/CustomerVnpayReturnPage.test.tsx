import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CustomerVnpayReturnPage } from "./CustomerVnpayReturnPage";
import { paymentApi } from "./paymentApi";
vi.mock("../../shared/layouts/CustomerLayout/CustomerLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
afterEach(() => vi.restoreAllMocks());
it("a forged success query cannot override pending SQL status or trigger a payment write", async () => {
  const status = vi.spyOn(paymentApi, "status").mockResolvedValue({ requestId: "r-owner", paymentId: "vp123", status: "PENDING_GATEWAY", summary: {} as never });
  const create = vi.spyOn(paymentApi, "session"); const confirm = vi.spyOn(paymentApi, "confirm");
  render(<MemoryRouter initialEntries={["/customer/payments/return?vnp_TxnRef=vp123&vnp_ResponseCode=00&vnp_TransactionStatus=00"]}><CustomerVnpayReturnPage /></MemoryRouter>);
  await screen.findByText("Trạng thái giao dịch: PENDING_GATEWAY"); expect(status).toHaveBeenCalledWith("vp123");
  expect(screen.getByRole("link", { name: "Xem số tiền đã xác minh và tải lại kết quả" })).toHaveAttribute("href", "/customer/requests/r-owner/payment");
  expect(create).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
});
