import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CustomerLayout from "../../shared/layouts/CustomerLayout/CustomerLayout";
import { flow1, flow1Error } from "./api";
import type { RequestView } from "./api";
import { DepositPaymentsPanel } from "./DepositPaymentsPanel";
import "./flow1.css";
export function CustomerPaymentPage() {
  const { requestId = "" } = useParams(); const [loaded, setLoaded] = useState<RequestView | null>(null); const [error, setError] = useState("");
  const request = loaded?.requestId === requestId ? loaded : null;
  useEffect(() => { let active = true; flow1.detail(requestId).then(v => { if (active) { setLoaded(v); setError(""); } })
    .catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [requestId]);
  const contract = request?.review?.contract;
  return <CustomerLayout pageTitle="Thanh toán cọc"><section className="flow1-page"><Link to={`/customer/requests/${requestId}`}>← Chi tiết yêu cầu</Link>
    <h1>Thanh toán cọc vận chuyển</h1>{error && <p role="alert">{error}</p>}{!request && !error && <p>Đang tải…</p>}
    {request && (contract && ["SIGNED", "EFFECTIVE"].includes(contract.status) ? <DepositPaymentsPanel key={contract.contractId} id={contract.contractId} />
      : <p>Chỉ thanh toán sau khi xác nhận hợp đồng bằng OTP.</p>)}</section></CustomerLayout>;
}
