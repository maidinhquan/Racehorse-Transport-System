import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "../../landing/LandingPage";
import { CreateRequestWizard } from "../../customer/pages/create-request/CreateRequestWizard";
import { initialTrip, flow1 } from "../api";
import { relational } from "./api";
import { saveLandingRoute } from "../landingDraft";

const horse = { horseId: "owned-horse", name: "My horse", microchipIso: "123456789012345", passportNo: "FEI", version: "horse-rowversion", hasDocuments: true, selectable: true };
function Location() { return <p data-testid="route">{useLocation().pathname}{useLocation().search}</p>; }
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

test("landing demo is VND/40%, carries only route hints across login and cannot submit money", async () => {
  localStorage.setItem("userRole", "CUSTOMER"); // Role hint alone is not a login.
  render(<MemoryRouter><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<Location />} /></Routes></MemoryRouter>);
  await userEvent.selectOptions(screen.getByLabelText("Điểm đến"), "Hanoi");
  expect(screen.getByText(/Cọc 40%:/)).toHaveTextContent("6.500.000");
  await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
  expect(screen.getByTestId("route")).toHaveTextContent("/login?next=flow1");
  const hint = initialTrip(); expect(hint.pickup.address).toBe("Ho Chi Minh City"); expect(hint.delivery.address).toBe("Hanoi");
  expect(hint).not.toHaveProperty("totalPrice"); expect(hint.pickup.lat).toBe(0);
});

test("four-step wizard requires resolved locations and owned available horses, posts real versions without advisory price, and reuses retry key", async () => {
  saveLandingRoute("Ho Chi Minh City", "Hanoi", "VN", 2);
  vi.spyOn(relational, "horses").mockResolvedValue([horse, { ...horse, horseId: "busy", name: "Busy horse", selectable: false }]);
  vi.spyOn(flow1, "search").mockImplementation(async (address, country) => [{ label: address + " found", point: { latitude: address === "Pickup" ? 10 : 11, longitude: 106, countryCode: country }, attribution: "Fixture" }]);
  const submit = vi.spyOn(relational, "submit").mockRejectedValueOnce(new Error("Retryable failure")).mockResolvedValue({ requestId: "created" } as never);
  render(<MemoryRouter><Routes><Route path="/" element={<CreateRequestWizard />} /><Route path="/customer/requests/:id" element={<Location />} /></Routes></MemoryRouter>);
  expect(screen.getByText("Ho Chi Minh City → Hanoi")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "4. Hồ sơ & Xác nhận" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Khởi hành (giờ Việt Nam)"), { target: { value: "2026-11-20T10:00" } });
  fireEvent.change(screen.getByLabelText("Hạn giao (giờ Việt Nam)"), { target: { value: "2026-11-21T10:00" } });
  await userEvent.type(screen.getByLabelText("Mục đích"), "Race"); await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  const addresses = screen.getAllByLabelText("Địa chỉ"); fireEvent.change(addresses[0], { target: { value: "Pickup" } }); fireEvent.change(addresses[1], { target: { value: "Delivery" } });
  for (const [label, value] of Object.entries({ "Người bàn giao": "Sender", "SĐT bàn giao": "0900000000", "Người nhận": "Receiver", "SĐT người nhận": "0900000001" })) await userEvent.type(screen.getByLabelText(label), value);
  await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" })); expect(await screen.findByRole("alert")).toHaveTextContent("Chọn kết quả tìm địa điểm");
  const find = screen.getAllByRole("button", { name: "Tìm địa điểm" });
  await userEvent.click(find[0]); await userEvent.click(await screen.findByRole("button", { name: "Pickup found" }));
  await userEvent.click(find[1]); await userEvent.click(await screen.findByRole("button", { name: "Delivery found" }));
  await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  expect(await screen.findByRole("checkbox", { name: /Busy horse/ })).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox", { name: /My horse/ })); await userEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await userEvent.click(screen.getByRole("checkbox", { name: "Tôi xác nhận thông tin và hồ sơ đã chọn." }));
  await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" })); await screen.findByText("Retryable failure");
  await userEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" })); await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  const [input, key] = submit.mock.calls[0]; expect(submit.mock.calls[1][1]).toBe(key);
  expect(input.departureAt).toBe("2026-11-20T03:00:00.000Z"); expect(input.horses).toEqual([{ horseId: horse.horseId, version: horse.version }]);
  expect(input.trip.horseCount).toBe(1); expect(input).not.toHaveProperty("totalPrice"); expect(input).not.toHaveProperty("depositAmount");
  expect(screen.getByTestId("route")).toHaveTextContent("/customer/requests/created");
});
