import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { OperationsInbox } from "./OperationsInbox";
import { deploymentApi } from "./deploymentApi";
import type { Deployment, Handoff } from "./deploymentApi";
const row: Deployment = { contractId: "c-one", requestId: "r-one", tripId: "t-one", status: "CONFIRMED", tripStatus: "PLANNING", version: 2,
  canConfirm: false, canHold: true, canResume: false, history: [], acknowledgements: [] };
const handoff: Handoff = { schemaVersion: 1, eventId: "event-one", requestId: "r-one", tripId: "t-one", contractId: "c-one", requestVersion: 1,
  planVersion: 1, contractVersion: 1, documentHash: "a".repeat(64), documentReviewStatus: "PENDING_SPECIALIST_REVIEW", acknowledgements: [],
  plan: { departureDate: "2026-11-20", deliveryDate: "2026-11-25", plannedDepartureAt: null, preparationDays: 2, vehicleCount: 1, stallsRequired: 1,
    resources: "Fleet plan", departureGateway: null, arrivalGateway: null, groundLegScope: "EXCLUDED" },
  request: { trip: { pickup: { address: "Pickup", lat: 10, lng: 106, country: "VN" }, delivery: { address: "Delivery", lat: 11, lng: 107, country: "VN" },
    preferredTransportMode: "ROAD", horseCount: 1, desiredDepartureDate: "2026-11-20" }, deliveryDeadline: "2026-11-25", purpose: "COMPETITION",
    pickupContact: { name: "Sender", phone: "0901234567" }, receiver: { name: "Receiver", phone: "0907654321", isProxy: true }, horses: [{ horseId: "h-one", documentVersion: 1 }] } };
afterEach(() => vi.restoreAllMocks());
it("held queue items cannot be opened or acknowledged in the UI", async () => {
  vi.spyOn(deploymentApi, "queue").mockResolvedValue([{ ...row, status: "ON_HOLD" }]); const get = vi.spyOn(deploymentApi, "handoff");
  render(<MemoryRouter><OperationsInbox stream="ROUTING" /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Xem bàn giao t-one" })).toBeDisabled(); expect(get).not.toHaveBeenCalled();
});
it("Specialist acknowledges the exact current event and can download its frozen document version", async () => {
  vi.spyOn(deploymentApi, "queue").mockResolvedValue([row]); vi.spyOn(deploymentApi, "handoff").mockResolvedValue(handoff);
  const ack = vi.spyOn(deploymentApi, "ack").mockResolvedValue({ ...handoff, acknowledgements: [{ stream: "DOCUMENTS", eventId: "event-one", actor: "specialist", atUtc: "2026-10-16T10:00:00Z" }] });
  const download = vi.spyOn(deploymentApi, "document").mockResolvedValue(undefined); const user = userEvent.setup();
  render(<MemoryRouter><OperationsInbox stream="DOCUMENTS" /></MemoryRouter>);
  await user.click(await screen.findByRole("button", { name: "Xem bàn giao t-one" }));
  await user.click(await screen.findByRole("button", { name: "Tải hộ chiếu h-one" })); expect(download).toHaveBeenCalledWith("t-one", "h-one", 1, "passport");
  await user.click(screen.getByRole("button", { name: "Xác nhận tiếp nhận DOCUMENTS" })); await screen.findByText("Đã tiếp nhận bàn giao DOCUMENTS.");
  expect(ack.mock.calls[0].slice(0, 2)).toEqual(["t-one", { expectedVersion: 2, eventId: "event-one", stream: "DOCUMENTS" }]);
});
