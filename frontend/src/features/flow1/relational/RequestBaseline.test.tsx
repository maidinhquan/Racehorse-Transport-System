import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiClient } from "../../../shared/api/apiClient";
import { CreateRequestWizard } from "../../customer/pages/create-request/CreateRequestWizard";
import { flow1, get } from "../api";
import { relational } from "./api";
import type { Request, Submission } from "./api";
import { managerRequest } from "../../Manager/pages/dashboard/managerPresentation";
import { requestView } from "./mainBindings";

vi.mock("../api", async original => ({ ...await original<object>(), get: vi.fn() }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.spyOn(window, "alert").mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());
const horses = ["a", "b"].map(horseId => ({ horseId, name: "Horse " + horseId, microchipIso: "123456789012345", passportNo: "FEI", version: "v-" + horseId, hasDocuments: true, selectable: true }));
const result = { requestId: "saved", horses, contracts: [], status: "PENDING" } as unknown as Request;
async function wizard(two = true) {
  vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: { demoTransportCost: 7000000, estimatedPrice: 99999999 } } });
  vi.spyOn(relational, "horses").mockResolvedValue(two ? horses : [horses[0]]);
  vi.mocked(get).mockResolvedValue({ fullName: "Owner", phoneNumber: "0900000000" });
  vi.spyOn(flow1, "search").mockImplementation(async (address, country) => [
    { label: `Other ${address}`, point: { latitude: 10, longitude: 106, countryCode: country }, attribution: "Fixture" },
    { label: address, point: { latitude: 12, longitude: 108, countryCode: country }, attribution: "Fixture" },
  ]);
  render(<MemoryRouter><Routes><Route path="/" element={<CreateRequestWizard />} /><Route path="/customer/requests/saved" element={<p>Saved SQL</p>} /></Routes></MemoryRouter>);
  const dates = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: "2026-11-20" } }); fireEvent.change(dates[1], { target: { value: "2026-11-21" } });
  await userEvent.click(screen.getByRole("button", { name: "2. Địa chỉ Giao/Nhận" }));
  for (const [name, value] of [["Địa chỉ Trại / CLB lấy ngựa", "Pickup"], ["Địa chỉ Trường đua / Trại nhận ngựa", "Delivery"]]) {
    const input = screen.getByRole('combobox', { name });
    await userEvent.click(input); fireEvent.change(input, { target: { value } });
    await userEvent.click(await screen.findByRole('option', { name: value }));
  }
  const inputs = document.querySelectorAll('.form-grid-2 input');
  fireEvent.change(inputs[2], { target: { value: 'Receiver' } });
  fireEvent.change(inputs[3], { target: { value: '0900000001' } });
  await userEvent.click(screen.getByRole("button", { name: "3. Chọn Ngựa đua" }));
  await userEvent.click(await screen.findByText(/Horse a/));
  if (two) await userEvent.click(await screen.findByText(/Horse b/));
  await userEvent.click(screen.getByRole("button", { name: "4. Hồ sơ & Thương mại" }));
}
test("multiple-horse uploads require attribution, retain total USD and reuse the same key/files on retry", async () => {
  const submit = vi.spyOn(relational, "submitDocuments").mockRejectedValueOnce(new Error("Try again")).mockResolvedValue(result);
  const old = vi.spyOn(relational, "submit");
  await wizard();
  await userEvent.type(screen.getByLabelText("Định giá thương mại (USD) phục vụ bảo hiểm & hải quan"), "150000.25");
  const files = [new File(["%PDF-1.4 medical baseline a"], "a.pdf", { type: "application/pdf" }), new File(["%PDF-1.4 medical baseline b"], "b.pdf", { type: "application/pdf" })];
  await userEvent.upload(screen.getByLabelText("Hồ sơ lý lịch và y tế bổ sung"), files);
  const send = screen.getByRole("button", { name: "Gửi Yêu Cầu Vận Chuyển" });
  await userEvent.click(send); await screen.findByText(/Chọn ngựa tương ứng cho từng hồ sơ/);
  expect(submit).not.toHaveBeenCalled(); expect(old).not.toHaveBeenCalled();
  await userEvent.selectOptions(screen.getByLabelText("Ngựa của hồ sơ a.pdf"), "a");
  await userEvent.selectOptions(screen.getByLabelText("Ngựa của hồ sơ b.pdf"), "b");
  expect(screen.queryByText(/Chọn ngựa tương ứng cho từng hồ sơ/)).not.toBeInTheDocument();
  await userEvent.click(send); await screen.findByText(/Try again/);
  await userEvent.click(send); await screen.findByText("Saved SQL");
  expect(submit.mock.calls[0][0].declaredValueUsd).toBe(150000.25);
  expect(submit.mock.calls[0][0].trip.pickup.lat).toBe(12);
  expect(submit.mock.calls[0][0].trip.delivery.lng).toBe(108);
  expect(flow1.search).toHaveBeenCalledTimes(2); // No new geocode search during submit/retry.
  expect(submit.mock.calls[0][0]).not.toHaveProperty("price");
  expect(submit.mock.calls[0][1].map(d => [d.horseId, d.file.name])).toEqual([["a", "a.pdf"], ["b", "b.pdf"]]);
  expect(submit.mock.calls[0][2]).toBe(submit.mock.calls[1][2]);
  expect(old).not.toHaveBeenCalled();
});

test('editing a selected address blocks submit until it is explicitly selected again', async () => {
  const submit = vi.spyOn(relational, 'submit'); const documents = vi.spyOn(relational, 'submitDocuments');
  await wizard(false);
  await userEvent.click(screen.getByRole('button', { name: '2. Địa chỉ Giao/Nhận' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Địa chỉ Trại / CLB lấy ngựa' }), { target: { value: 'Edited address' } });
  await userEvent.click(screen.getByRole('button', { name: '4. Hồ sơ & Thương mại' }));
  await userEvent.click(screen.getByRole('button', { name: 'Gửi Yêu Cầu Vận Chuyển' }));
  await screen.findByText(/Vui lòng chọn địa chỉ Trại/);
  expect(submit).not.toHaveBeenCalled(); expect(documents).not.toHaveBeenCalled();
});

test('changing destination country clears a prior selection even when switching back', async () => {
  const submit = vi.spyOn(relational, 'submit'); await wizard(false);
  await userEvent.click(screen.getByRole('button', { name: '1. Tuyến & Dự toán' }));
  const destination = document.querySelectorAll('select')[1];
  fireEvent.change(destination, { target: { value: 'Nhật Bản' } }); fireEvent.change(destination, { target: { value: 'Việt Nam' } });
  await userEvent.click(screen.getByRole('button', { name: '4. Hồ sơ & Thương mại' }));
  await userEvent.click(screen.getByRole('button', { name: 'Gửi Yêu Cầu Vận Chuyển' }));
  await screen.findByText(/Vui lòng chọn địa chỉ Trường đua/); expect(submit).not.toHaveBeenCalled();
});
test("declared total without files still uses the new endpoint; zero is refused before sending", async () => {
  const submit = vi.spyOn(relational, "submitDocuments").mockResolvedValue(result);
  await wizard(false);
  const value = screen.getByLabelText("Định giá thương mại (USD) phục vụ bảo hiểm & hải quan");
  fireEvent.change(value, { target: { value: "0" } });
  await userEvent.click(screen.getByRole("button", { name: "Gửi Yêu Cầu Vận Chuyển" }));
  await screen.findByText(/Giá trị tổng cả đơn phải lớn hơn 0 USD/); expect(submit).not.toHaveBeenCalled();
  fireEvent.change(value, { target: { value: "100" } });
  await userEvent.click(screen.getByRole("button", { name: "Gửi Yêu Cầu Vận Chuyển" })); await screen.findByText("Saved SQL");
  expect(submit.mock.calls[0][0].declaredValueUsd).toBe(100); expect(submit.mock.calls[0][1]).toEqual([]);
});
test("multipart serialization binds each file to its selected horse and leaves boundary headers to the browser", async () => {
  const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { success: true, data: result } });
  await relational.submitDocuments({ declaredValueUsd: 120 } as Submission, [{ horseId: "a", file: new File(["%PDF-1.4 medical baseline"], "a.pdf") }], "baseline-key-one");
  expect(post.mock.calls[0][0]).toBe("/customer/requests/with-documents");
  const form = post.mock.calls[0][1] as FormData;
  expect(JSON.parse(form.get("payload") as string).declaredValueUsd).toBe(120);
  expect(form.getAll("horseIds")).toEqual(["a"]); expect((form.get("files") as File).name).toBe("a.pdf");
  expect(post.mock.calls[0][2]?.headers?.["Content-Type"]).toBeUndefined();
});
test("read models retain declared value and uploaded status without marking medical evidence as verified", () => {
  const row = { ...result, declaredValueUsd: 120, documents: [{ documentId: "d", horseId: "a", documentType: "BASELINE_MEDICAL", status: "UPLOADED" }] };
  const manager = managerRequest(row); expect(manager.declaredValueUsd).toBe(120); expect(manager.baselineDocuments?.[0].status).toBe("UPLOADED");
  const owner = requestView(row); expect(owner.documents.at(-1)?.status).toBe("Pending Review");
  expect(owner.documents.at(-1)?.downloadPath).toBe("/customer/requests/saved/documents/d");
});

test('estimated transport cost uses backend demo amount, never the manager contract quote or a fake zero', () => {
  const row = { ...result, estimatedTransportCost: 110297600 };
  expect(requestView(row).estimatedPrice).toBe(110297600);
  expect(requestView({ ...row, estimatedTransportCost: null }).estimatedPrice).toBeNull();
});

test('wizard preview uses transport-only backend estimate rather than the old hardcoded banner', async () => {
  await wizard(false);
  await userEvent.click(screen.getByRole('button', { name: '1. Tuyến & Dự toán' }));
  await screen.findByText('7,000,000 VND');
  expect(apiClient.post).toHaveBeenCalledWith('/customer/estimates', expect.objectContaining({ horseCount: 1 }), expect.anything());
  expect(screen.queryByText('99,999,999 VND')).not.toBeInTheDocument();
});
test("an older runtime cannot silently discard declaration or files by falling back to JSON submit", async () => {
  const post = vi.spyOn(apiClient, "post").mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  await expect(relational.submitDocuments({ declaredValueUsd: 120 } as Submission, [], "baseline-key-one")).rejects.toThrow("Yêu cầu này chưa được lưu");
  expect(post).toHaveBeenCalledTimes(1); expect(post.mock.calls[0][0]).toBe("/customer/requests/with-documents");
});
