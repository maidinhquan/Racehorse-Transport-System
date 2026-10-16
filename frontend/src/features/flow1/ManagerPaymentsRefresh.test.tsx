import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ManagerRequestPage } from "./ManagerPages";
import { reviewApi } from "./reviewApi";
import type { ManagerReview } from "./reviewApi";
const mocks = vi.hoisted(() => ({ mount: vi.fn() }));
vi.mock("./ContractPublicationPanel", async () => {
  const { useEffect } = await import("react");
  return { ContractPublicationPanel: function Panel() { useEffect(() => { mocks.mount(); }, []); return <p>Publication boundary</p>; } };
});
vi.mock("./DepositPaymentsPanel", () => ({ DepositPaymentsPanel: ({ reload }: { reload: () => Promise<void> }) => <button onClick={reload}>Refresh verified money</button> }));
afterEach(() => { vi.restoreAllMocks(); mocks.mount.mockClear(); });
it("payment notices and activation refresh immutable signed work without remounting all API panels", async () => {
  const initial = { version: 10, request: { requestId: "r-one", status: "AWAITING_DEPOSIT", departure: "Pickup", destination: "Delivery", snapshot: {
    input: { trip: { desiredDepartureDate: "2026-11-20", horseCount: 1, preferredTransportMode: "ROAD" }, deliveryDeadline: "2026-11-25",
      pickupContact: { name: "Sender", phone: "0901234567" }, receiver: { name: "Receiver", phone: "0907654321", isProxy: false }, horses: [] },
    estimate: { minimumPreparationDays: 2, attribution: "Fixture" } } },
    review: { questions: [], changes: [], notices: [], feedback: null }, plan: null, allowedActions: [],
    contract: { contractId: "c-one", status: "SIGNED", total: 100000000, deposit: 40000000, lines: [] }, contractHistory: [] } as unknown as ManagerReview;
  vi.spyOn(reviewApi, "manager").mockResolvedValueOnce(initial).mockResolvedValueOnce({ ...initial, version: 11,
    request: { ...initial.request, status: "ACTIVATED" }, contract: { ...initial.contract!, status: "EFFECTIVE" } });
  render(<MemoryRouter initialEntries={["/manager/requests/r-one"]}><Routes><Route path="/manager/requests/:requestId" element={<ManagerRequestPage />} /></Routes></MemoryRouter>);
  await userEvent.setup().click(await screen.findByRole("button", { name: "Refresh verified money" }));
  await screen.findByText(/Trạng thái: ACTIVATED/); expect(mocks.mount).toHaveBeenCalledOnce();
});
