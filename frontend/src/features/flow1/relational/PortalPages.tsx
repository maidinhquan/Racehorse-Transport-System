import { CoordinatorPortal } from "../../coordinator/pages/dashboard/CoordinatorPortal";
import { SpecialistPortal } from "../../specialist/pages/dashboard/SpecialistPortal";

export function OperationsFlowHome({ stream }: { stream: "ROUTING" | "DOCUMENTS" }) {
  return stream === "ROUTING"
    ? <CoordinatorPortal initialNav="dashboard" flow1 />
    : <SpecialistPortal initialNav="dashboard" flow1 />;
}
