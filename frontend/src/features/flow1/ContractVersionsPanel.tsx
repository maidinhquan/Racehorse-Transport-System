import { useState } from "react";
import { money } from "./api";
import { ContractPublicationPanel } from "./ContractPublicationPanel";
import type { ContractVersion } from "./reviewApi";
export function ContractVersionsPanel({ versions = [], manager = false, reload }: {
  versions?: ContractVersion[] | null; manager?: boolean; reload: () => Promise<void>;
}) {
  const [opened, setOpened] = useState<string | null>(null);
  if (!versions?.length) return null;
  return <section><h3>Các phiên bản hợp đồng trước</h3>{versions.map(v => <article key={v.contractId}>
    <p>{v.contractId} · {v.status} · Tổng {money(v.total)} · Cọc {money(v.deposit)}</p>
    {v.hasPublishedPdf && <button onClick={() => setOpened(opened === v.contractId ? null : v.contractId)}>Xem lại PDF {v.contractId}</button>}
    {opened === v.contractId && <ContractPublicationPanel id={v.contractId} manager={manager} status={v.status} readOnly reload={reload} />}
  </article>)}</section>;
}
