import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import ContractPage from "../user-dashboard/page/transport-request-page/contract/ContractPage";
import { flow1 } from "./api";
import type { RequestView } from "./api";
vi.mock("../../shared/layouts/CustomerLayout/CustomerLayout", () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock("./CustomerReviewPanel", () => ({ CustomerReviewPanel: ({ id }: { id: string }) => <p>Actual review {id}</p> }));
afterEach(() => vi.restoreAllMocks());
function mount() { render(<MemoryRouter initialEntries={["/customer/requests/real-r/contract"]}><Routes>
  <Route path="/customer/requests/:requestId/contract" element={<ContractPage />} /></Routes></MemoryRouter>); }
it("legacy Contract route loads its owned API request and renders the real review instead of local signing", async () => {
  const v = { requestId: "real-r", status: "AWAITING_DEPOSIT", departure: "API A", destination: "API B", review: { version: 2 } } as RequestView;
  vi.spyOn(flow1, "detail").mockResolvedValue(v); mount();
  await screen.findByText("Trạng thái: AWAITING_DEPOSIT"); expect(screen.getByText("Actual review real-r")).toBeInTheDocument();
  expect(flow1.detail).toHaveBeenCalledWith("real-r"); expect(screen.queryByText(/CT-8931|650.*USD|30%|Sign Contract/)).toBeNull();
  expect(screen.getByRole("link", { name: "← Chi tiết yêu cầu" })).toHaveAttribute("href", "/customer/requests/real-r");
});
it("unavailable or unauthorized API request never shows a fixture contract", async () => {
  vi.spyOn(flow1, "detail").mockRejectedValue(new Error("Request not found")); mount();
  await screen.findByRole("alert"); expect(screen.queryByText(/^Actual review/)).toBeNull();
  expect(screen.queryByText(/CT-8931|signed successfully/)).toBeNull();
});
