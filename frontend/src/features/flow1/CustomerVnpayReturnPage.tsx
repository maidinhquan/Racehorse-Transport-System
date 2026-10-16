import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../shared/layouts/CustomerLayout/CustomerLayout";
import { paymentApi } from "./paymentApi";
import { flow1Error } from "./api";
export function CustomerVnpayReturnPage() {
  const [query] = useSearchParams(); const id = query.get("vnp_TxnRef") || "";
  const [value, setValue] = useState<{ requestId: string; status: string } | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; paymentApi.status(id).then(v => { if (active) { setValue(v); setError(""); } })
    .catch(e => { if (active) setError(flow1Error(e)); }); return () => { active = false; }; }, [id]);
  return <CustomerLayout pageTitle="Kết quả thanh toán"><section className="flow1-page"><h1>Kết quả VNPay</h1>
    <p>Kết quả được đọc từ hệ thống sau đối soát. Việc quay lại trang này chưa xác nhận đã nhận tiền.</p>
    {error && <p role="alert">{error}</p>}{value && <><p>Trạng thái giao dịch: {value.status}</p>
      <Link to={`/customer/requests/${value.requestId}/payment`}>Xem số tiền đã xác minh và tải lại kết quả</Link></>}
  </section></CustomerLayout>;
}
