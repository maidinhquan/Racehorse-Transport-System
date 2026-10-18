import { useRef } from "react";
import { useRequest, selectedContract } from "../../../flow1/relational/mainBindings";
import { relational } from "../../../flow1/relational/api";
import { flow1Error } from "../../../flow1/api";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./PaymentPage.css";

function PaymentPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const record = useRequest(requestId); const c = selectedContract(record || undefined); const key = useRef(crypto.randomUUID());
  const payable = !!c?.isCurrent && c.relationalTermsReady && c.hasAcceptanceEvidence && c.status === "SIGNED" && c.paidAmount < c.depositAmount && c.cancellationStatus !== "PENDING" && !c.payments.some(p => p.reviewRequired);
  const payment = { requestId: requestId || "—", contractNumber: c?.contractId || "—", origin: record?.departure || "—", destination: record?.destination || "—", finalPrice: c?.totalPrice || 0, depositPercent: c?.relationalTermsReady ? 40 : 0, depositAmount: c?.depositAmount || 0, currency: c?.currency || "VND" };
  const handleBack = () => {
    navigate(`/customer/requests/${requestId}`);
  };

  const handlePayWithVNPay = async () => {
    if (!c || !payable) return;
    try { const session = await relational.action<{ url: string }>(`/customer/contracts/${c.contractId}/vnpay`, {}, key.current); const url = new URL(session.url); if (url.protocol !== "https:" || url.hostname !== "sandbox.vnpayment.vn") throw new Error("Payment URL không hợp lệ."); window.location.assign(url.href); } catch (e) { window.alert(flow1Error(e)); }
  };
  return (
    <CustomerLayout pageTitle="Payment">
      <div className="payment-page">
        <button
          type="button"
          className="payment-back"
          onClick={handleBack}
        >
          ← Back to Request
        </button>

        <div className="payment-header">
          <div>
            <h1>Deposit Payment</h1>

            <p>
              Complete the required deposit to continue your
              transport request.
            </p>
          </div>

          <span className="payment-request-badge">
            {payment.requestId}
          </span>
        </div>

        <div className="payment-content">
          <section className="payment-card">
            <div className="payment-card-header">
              <div>
                <span className="payment-eyebrow">
                  Payment Summary
                </span>

                <h2>Transport Deposit</h2>
              </div>

              <span className="payment-status">
                Awaiting Payment
              </span>
            </div>

            <div className="payment-info-grid">
              <div>
                <span>Request ID</span>
                <strong>{payment.requestId}</strong>
              </div>

              <div>
                <span>Contract Number</span>
                <strong>{payment.contractNumber}</strong>
              </div>

              <div>
                <span>Route</span>

                <strong>
                  {payment.origin}
                  {" → "}
                  {payment.destination}
                </strong>
              </div>

              <div>
                <span>Final Agreed Price</span>

                <strong>
                  {payment.finalPrice.toFixed(2)}{" "}
                  {payment.currency}
                </strong>
              </div>
            </div>

            <div className="payment-deposit-box">
              <div>
                <span>Required Deposit</span>

                <small>
                  {payment.depositPercent}% of final agreed
                  price
                </small>
              </div>

              <strong>
                {payment.depositAmount.toFixed(2)}{" "}
                {payment.currency}
              </strong>
            </div>

            <div className="payment-note">
              <div className="payment-note-icon">
                i
              </div>

              <div>
                <strong>Secure payment</strong>

                <p>
                  You will be redirected to VNPay to complete
                  this payment securely.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="payos-button"
              disabled={!payable} onClick={handlePayWithVNPay}
            >
              Pay with VNPay
            </button>

            <p className="payment-demo-text">
              Trạng thái thanh toán chỉ được xác nhận bởi backend qua VNPay IPN.
            </p>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentPage;