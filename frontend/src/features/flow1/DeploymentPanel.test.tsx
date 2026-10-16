import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeploymentPanel } from "./DeploymentPanel";
import { deploymentApi } from "./deploymentApi";
import type { Deployment } from "./deploymentApi";
const initial: Deployment = { contractId: "c-one", requestId: "r-one", tripId: "t-one", status: "PENDING", tripStatus: "PLANNING", version: 1,
  canConfirm: true, canHold: true, canResume: false, history: [], acknowledgements: [] };
afterEach(() => vi.restoreAllMocks());
it("Manager must supply a reason and retries the exact deployment version with the same key", async () => {
  vi.spyOn(deploymentApi, "get").mockResolvedValue(initial);
  const act = vi.spyOn(deploymentApi, "act").mockRejectedValueOnce(new Error("Network interrupted"))
    .mockResolvedValue({ ...initial, status: "CONFIRMED", version: 2, canConfirm: false });
  render(<DeploymentPanel id="c-one" manager />); const user = userEvent.setup();
  expect(await screen.findByRole("button", { name: "Xác nhận bàn giao vận hành" })).toBeDisabled();
  await user.type(screen.getByLabelText("Lý do quyết định triển khai (nội bộ)"), "Lịch và nguồn lực đủ điều kiện");
  await user.click(screen.getByRole("button", { name: "Xác nhận bàn giao vận hành" })); await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Xác nhận bàn giao vận hành" })); await screen.findByText(/Triển khai: CONFIRMED/);
  expect(act.mock.calls[0].slice(0, 3)).toEqual(["c-one", "confirm", { expectedVersion: 1, reason: "Lịch và nguồn lực đủ điều kiện" }]);
  expect(act.mock.calls[0][3]).toBe(act.mock.calls[1][3]);
});
it("Customer can read held status but receives no operational decision controls", async () => {
  vi.spyOn(deploymentApi, "get").mockResolvedValue({ ...initial, status: "ON_HOLD", canConfirm: false, canResume: false, canHold: false });
  render(<DeploymentPanel id="c-one" />); await screen.findByText(/Triển khai: ON_HOLD/);
  expect(screen.queryByText("Tiếp tục chờ xác nhận")).toBeNull(); expect(screen.queryByText("Tạm giữ triển khai")).toBeNull();
});
