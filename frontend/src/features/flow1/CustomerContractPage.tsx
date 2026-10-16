import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomerLayout from "../../shared/layouts/CustomerLayout/CustomerLayout";
import { flow1, flow1Error } from "./api";
import type { RequestView } from "./api";
import { CustomerReviewPanel } from "./CustomerReviewPanel";
import "./flow1.css";

export function CustomerContractPage() {
  const { requestId = "" } = useParams(); const [loaded, setLoaded] = useState<RequestView | null>(null); const [error, setError] = useState("");
  const request = loaded?.requestId === requestId ? loaded : null;
  useEffect(() => { let active = true; flow1.detail(requestId).then(v => { if (active) { setLoaded(v); setError(""); } })
    .catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [requestId]);
  return <CustomerLayout pageTitle="Hợp đồng vận chuyển"><section className="flow1-page">
    <Link to={`/customer/requests/${requestId}`}>← Chi tiết yêu cầu</Link><h1>Hợp đồng yêu cầu vận chuyển</h1>
    {error && <p role="alert">{error}</p>}{!request && !error && <p>Đang tải…</p>}
    {request && <><p>{request.departure} → {request.destination}</p><p>Trạng thái: {request.status}</p>
      {request.review ? <CustomerReviewPanel id={request.requestId} value={request.review} reload={async () => setLoaded(await flow1.detail(requestId))} />
        : <p>Chưa có hợp đồng được tạo cho yêu cầu này.</p>}
    </>}
  </section></CustomerLayout>;
}
