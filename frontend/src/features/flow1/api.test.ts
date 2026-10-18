import { expect, it } from "vitest";
import { flow1Error } from "./api";

it.each(["FLOW1_SQL_SCHEMA_REQUIRED", "FLOW1_STATE_IMPORT_REQUIRED", "FLOW1_STATE_RECONCILIATION_REQUIRED"])(
  "shows a maintenance message for %s without exposing internal migration instructions", errorCode => {
    const message = flow1Error({ isAxiosError: true, response: { data: { errorCode, message: "Apply internal migration and inspect private source files" } } });
    expect(message).toContain("bảo trì dữ liệu"); expect(message).not.toContain("migration");
  });
it("preserves actionable business validation messages", () => {
  expect(flow1Error({ isAxiosError: true, response: { data: { errorCode: "STALE_VERSION", message: "Reload the current version" } } }))
    .toBe("Reload the current version");
});
