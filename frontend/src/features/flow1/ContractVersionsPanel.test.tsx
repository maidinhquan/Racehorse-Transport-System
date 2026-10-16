import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContractVersionsPanel } from "./ContractVersionsPanel";
vi.mock("./ContractPublicationPanel", () => ({ ContractPublicationPanel: ({ id, readOnly }: { id: string; readOnly: boolean }) => <p>Opened {id} readOnly={String(readOnly)}</p> }));
it("loads only the chosen historical PDF in read-only mode and excludes unissued Drafts", async () => {
  render(<ContractVersionsPanel versions={[
    { contractId: "old-draft", version: 1, status: "SUPERSEDED", total: 100, deposit: 40, hasPublishedPdf: false },
    { contractId: "old-issued", version: 1, status: "SIGN_DECLINED", total: 100, deposit: 40, hasPublishedPdf: true },
  ]} reload={vi.fn()} />);
  expect(screen.queryByText(/^Opened/)).toBeNull(); expect(screen.queryByRole("button", { name: "Xem lại PDF old-draft" })).toBeNull();
  await userEvent.setup().click(screen.getByRole("button", { name: "Xem lại PDF old-issued" }));
  expect(screen.getByText("Opened old-issued readOnly=true")).toBeInTheDocument();
});
