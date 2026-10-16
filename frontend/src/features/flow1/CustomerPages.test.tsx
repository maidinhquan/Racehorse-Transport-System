import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { flow1 } from "./api";
import type { Estimate, Horse, RequestView, Trip } from "./api";
import { PublicEstimatePage, RequestWizardPage, RequestsPage, RequestDetailPage } from "./CustomerPages";
import { TripFields, EstimateSummary } from "./TripFields";
import { emptyTrip } from "./api";

vi.mock("../../shared/layouts/CustomerLayout/CustomerLayout", () => ({ default: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
const estimate: Estimate = { estimatedPrice: 54600000, estimatedDeposit: 21840000, roadDistanceKm: 300,
  minimumPreparationDays: 2, earliestDepartureDate: "2026-10-18", scope: "ROAD_PICKUP_TO_DELIVERY", attribution: "TEST PROVIDER", currency: "VND" };
const horse: Horse = { horseId: "horse-server", name: "Ngựa API", microchipIso: "123456789012345", feiPassportNo: "DEMO", status: "ACTIVE", documentVersion: 2, selectable: true, unavailableReason: null };
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); localStorage.clear(); });
function mount(element: ReactNode) {
  render(<MemoryRouter initialEntries={["/new"]}><Routes><Route path="/new" element={element} />
    <Route path="/customer/requests/:requestId" element={<p>Đã lưu từ server</p>} /></Routes></MemoryRouter>);
}
async function tripFields(user: ReturnType<typeof userEvent.setup>) {
  vi.spyOn(flow1, "search").mockImplementation(async address => [{ label: address + " đã chọn", point: { latitude: address.startsWith("Lấy") ? 10.8 : 11.5, longitude: 106.6, countryCode: "VN" }, attribution: "TEST" }]);
  fireEvent.change(screen.getByLabelText("Ngày khởi hành mong muốn"), { target: { value: "2026-11-20" } });
  for (const [legend, address] of [["Điểm lấy ngựa (Việt Nam)", "Lấy ngựa"], ["Điểm giao ngựa", "Giao ngựa"]]) {
    const group = screen.getByRole("group", { name: legend });
    await user.type(within(group).getByLabelText("Địa chỉ"), address);
    await user.click(within(group).getByRole("button", { name: "Tìm địa điểm" }));
    await user.click(await within(group).findByRole("button", { name: address + " đã chọn" }));
  }
}
async function toHorses(user: ReturnType<typeof userEvent.setup>) {
  await tripFields(user);
  fireEvent.change(screen.getByLabelText("Hạn giao ngựa"), { target: { value: "2026-11-25" } });
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  const pickup = await screen.findByRole("group", { name: "Người giao ngựa" });
  await user.type(within(pickup).getByLabelText("Họ tên"), "Người giao");
  await user.type(within(pickup).getByLabelText("Số điện thoại"), "0901234567");
  const delivery = screen.getByRole("group", { name: "Người nhận ngựa" });
  await user.type(within(delivery).getByLabelText("Họ tên"), "Người nhận");
  await user.type(within(delivery).getByLabelText("Số điện thoại"), "0907654321");
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByRole("heading", { name: "3. Ngựa và hồ sơ" });
}
describe("Customer Flow 1 API screens", () => {
  it("keeps Geoapify attribution after selection while using Mapbox for preview, and clears stale provenance on edit", async () => {
    vi.spyOn(flow1, "search").mockResolvedValue([{ label: "Hồ Chí Minh", point: { latitude: 10.8, longitude: 106.6, countryCode: "VN" },
      attribution: "Powered by Geoapify | OpenStreetMap", provider: "GEOAPIFY", previewProvider: "MAPBOX" }]);
    function Fields() { const [trip, setTrip] = useState<Trip>(emptyTrip); return <TripFields trip={trip} onChange={setTrip} />; }
    const user = userEvent.setup(); render(<Fields />);
    const group = screen.getByRole("group", { name: "Điểm lấy ngựa (Việt Nam)" });
    await user.type(within(group).getByLabelText("Địa chỉ"), "HCM");
    await user.click(within(group).getByRole("button", { name: "Tìm địa điểm" }));
    await user.click(await within(group).findByRole("button", { name: "Hồ Chí Minh" }));
    expect(within(group).getByRole("link", { name: "Geoapify" })).toHaveAttribute("href", "https://www.geoapify.com/");
    expect(within(group).getByRole("link", { name: /OpenStreetMap/ })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    expect(within(group).getByRole("img")).toHaveAttribute("src", expect.stringContaining("/api/public/maps/mapbox-preview?"));
    await user.type(within(group).getByLabelText("Địa chỉ"), " thay đổi");
    expect(within(group).queryByRole("img")).toBeNull(); expect(within(group).queryByRole("link", { name: "Geoapify" })).toBeNull();
  });
  it("shows attribution for air estimates even though no road route is returned", () => {
    render(<EstimateSummary value={{ ...estimate, roadDistanceKm: null, attribution: null, locationAttribution: "Powered by Geoapify | OpenStreetMap" }} />);
    expect(screen.getByRole("link", { name: "Geoapify" })).toBeVisible();
  });
  it("Mapbox preview points to our API and never includes a provider access token", () => {
    render(<TripFields trip={{ ...emptyTrip, pickup: { address: "Hồ Chí Minh", lat: 10.8, lng: 106.6, country: "VN", mapProvider: "MAPBOX" } }} onChange={() => {}} />);
    const image = screen.getByRole("img", { name: "Bản đồ Mapbox: Điểm lấy ngựa (Việt Nam)" });
    expect(image).toHaveAttribute("src", "/api/public/maps/mapbox-preview?lat=10.8&lng=106.6&country=VN");
    expect(image.getAttribute("src")).not.toContain("access_token");
  });
  it("public estimate displays only the server result and never creates a request", async () => {
    const user = userEvent.setup(); const calculate = vi.spyOn(flow1, "estimate").mockResolvedValue(estimate);
    const submit = vi.spyOn(flow1, "submit"); mount(<PublicEstimatePage />);
    await tripFields(user); await user.click(screen.getByRole("button", { name: "Tính dự toán" }));
    await screen.findByText(/54\.600\.000/); expect(calculate).toHaveBeenCalledWith(expect.objectContaining({ horseCount: 1 }), true);
    expect(submit).not.toHaveBeenCalled();
  });
  it("wizard preserves input when adding a horse and retries failed submit with the same operation key", async () => {
    const user = userEvent.setup();
    vi.spyOn(flow1, "estimate").mockResolvedValue(estimate);
    vi.spyOn(flow1, "horses").mockResolvedValueOnce([]).mockResolvedValue([horse]);
    const create = vi.spyOn(flow1, "createHorse").mockResolvedValue(horse);
    const submit = vi.spyOn(flow1, "submit").mockRejectedValueOnce(new Error("Mạng tạm thời gián đoạn"))
      .mockResolvedValue({ requestId: "r-server", status: "PENDING" } as RequestView);
    mount(<RequestWizardPage />); await toHorses(user);
    await user.click(screen.getByRole("button", { name: "Thêm ngựa tại đây" }));
    await user.type(screen.getByLabelText("Tên ngựa"), "Ngựa API");
    await user.type(screen.getByLabelText("Microchip ISO (15 chữ số)"), horse.microchipIso);
    await user.type(screen.getByLabelText("Số hộ chiếu FEI"), "DEMO");
    await user.type(screen.getByLabelText("Giống"), "Thoroughbred");
    await user.type(screen.getByLabelText("Khối lượng (kg)"), "450");
    fireEvent.change(screen.getByLabelText("Ngày sinh"), { target: { value: "2020-01-01" } });
    await user.upload(screen.getByLabelText(/Ảnh ngựa/), new File(["test bytes"], "horse.png", { type: "image/png" }));
    await user.upload(screen.getByLabelText(/Scan hộ chiếu/), new File(["test bytes"], "passport.pdf", { type: "application/pdf" }));
    const horseForm = screen.getByRole("button", { name: "Lưu hồ sơ ngựa" }).closest("form")!;
    // jsdom's native validity does not see user-event's synthetic FileList. Real
    // file-input/native-submit behavior is covered by the Chromium connected run.
    expect((screen.getByLabelText(/Ảnh ngựa/) as HTMLInputElement).files).toHaveLength(1);
    fireEvent.submit(horseForm);
    await screen.findByRole("checkbox", { name: /Ngựa API/ });
    expect(create).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await screen.findByRole("heading", { name: "4. Kiểm tra và gửi" });
    expect(screen.getByText("2026-11-20 / 2026-11-25")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Tôi xác nhận/ }));
    await user.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
    await screen.findByRole("alert"); expect(screen.queryByText("Đã lưu từ server")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gửi yêu cầu" }));
    await screen.findByText("Đã lưu từ server");
    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[0][1]).toBe(submit.mock.calls[1][1]);
    expect(submit.mock.calls[1][0]).toMatchObject({ trip: { desiredDepartureDate: "2026-11-20" }, horses: [{ horseId: "horse-server", documentVersion: 2 }] });
  });
  it("an unavailable horse cannot be selected and back navigation preserves the trip", async () => {
    const user = userEvent.setup(); vi.spyOn(flow1, "estimate").mockResolvedValue(estimate);
    vi.spyOn(flow1, "horses").mockResolvedValue([{ ...horse, selectable: false, unavailableReason: "SCHEDULE_CONFLICT" }]);
    mount(<RequestWizardPage />); await toHorses(user);
    expect(screen.getByRole("checkbox", { name: /Ngựa API/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Quay lại" }));
    await user.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByLabelText("Ngày khởi hành mong muốn")).toHaveValue("2026-11-20");
    expect(screen.getByLabelText("Hạn giao ngựa")).toHaveValue("2026-11-25");
  });
  it("list and detail display server data instead of local demo requests", async () => {
    const value = { requestId: "r-server", status: "PENDING", departure: "Điểm lấy API", destination: "Điểm giao API", expectedDate: "2026-11-20", committedDeadline: "2026-11-25", snapshot: null } as RequestView;
    vi.spyOn(flow1, "list").mockResolvedValue({ items: [value], page: 1, pageSize: 20, totalCount: 1 });
    vi.spyOn(flow1, "detail").mockResolvedValue(value);
    const first = render(<MemoryRouter><RequestsPage /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Điểm lấy API → Điểm giao API" })).toHaveAttribute("href", "/customer/requests/r-server");
    first.unmount(); render(<MemoryRouter initialEntries={["/r-server"]}><Routes><Route path="/:requestId" element={<RequestDetailPage />} /></Routes></MemoryRouter>);
    await screen.findByText("Trạng thái: PENDING");
  });
});
