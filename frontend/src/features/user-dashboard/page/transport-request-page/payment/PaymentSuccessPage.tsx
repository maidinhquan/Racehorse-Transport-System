import { relational } from "../../../../flow1/relational/api";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./PaymentSuccessPage.css";

function PaymentSuccessPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<{ requestId: string; paid: boolean; state: string } | null>(null);
  const requestId = status?.requestId || searchParams.get("requestId");
  const ref = searchParams.get("vnp_TxnRef");
  useEffect(() => { let active = true;
    const load = async () => { try {
      if (ref) { const r = await relational.returned(ref); if (active) setStatus({ requestId: r.requestId, paid: r.contract.hasAcceptanceEvidence && r.contract.paidAmount >= r.contract.depositAmount && r.contract.invoiceStatus === 'PAID', state: r.contract.invoiceStatus || 'Chưa được xác minh' }); }
      else if (requestId) { const r = await relational.detail(requestId); const c = r.contracts.find(c => c.isCurrent); if (active) setStatus({ requestId: r.requestId, paid: !!c?.hasAcceptanceEvidence && c.paidAmount >= c.depositAmount && c.invoiceStatus === 'PAID', state: c?.invoiceStatus || 'Chưa được xác minh' }); }
    } catch { if (active) setStatus({ requestId: '', paid: false, state: 'Chưa xác minh được trạng thái' }); } };
    void load(); return () => { active = false; };
  }, [ref, requestId]);

  const orderCode =
    searchParams.get("orderCode");

  const [seconds, setSeconds] =
    useState(3);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);

          navigate(
            `/customer/requests/${requestId}`
          );

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [navigate, requestId]);

  const handleContinue = () => {
    if (!requestId) {
      navigate("/customer/requests");
      return;
    }

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  return (
    <CustomerLayout pageTitle="Payment">
      <div className="payment-result-page">
        <div className="payment-success-card">
          <div className="payment-success-icon">
            {status?.paid ? "✓" : "…"}
          </div>

          <h1>
            Payment Status
          </h1>

          <p>
            {status?.paid ? "Backend đã xác nhận đủ cọc." : "Chưa có xác nhận đủ cọc từ backend. ReturnURL không xác nhận tiền."}
          </p>

          <div className="payment-success-info">
            <div>
              <span>
                Request ID
              </span>

              <strong>
                {requestId ?? "—"}
              </strong>
            </div>

            <div>
              <span>
                Order Code
              </span>

              <strong>
                {orderCode ?? "—"}
              </strong>
            </div>

            <div>
              <span>
                Request Status
              </span>

              <strong className="success-status">
                {status?.state || "Đang kiểm tra"}
              </strong>
            </div>
          </div>

          <div className="payment-success-message">
            Trạng thái yêu cầu và chuyến được backend cập nhật sau khi xác minh thanh toán.
          </div>

          <p className="payment-redirect-text">
            Returning to your request in{" "}
            <strong>
              {seconds}
            </strong>{" "}
            second
            {seconds !== 1 ? "s" : ""}
            ...
          </p>

          <button
            type="button"
            onClick={handleContinue}
          >
            Continue Now
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentSuccessPage;