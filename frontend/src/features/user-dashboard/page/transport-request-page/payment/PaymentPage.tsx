import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./PaymentPage.css";

function PaymentPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  // Mock data tạm thời.
  // Sau này lấy từ backend theo requestId.
  const payment = {
    requestId: requestId ?? "UNKNOWN",
    contractNumber: "CT-8931",
    origin: "Hanoi, VN",
    destination: "Ho Chi Minh City, VN",
    finalPrice: 650,
    depositPercent: 30,
    depositAmount: 195,
    currency: "USD",
  };

  const handleBack = () => {
    navigate(`/customer/requests/${requestId}`);
  };

  const handlePayWithPayOS = () => {
    /*
      SAU NÀY:

      1. Frontend gọi backend:
         POST /api/payments/create

      2. Backend trả:
         {
           checkoutUrl: "https://pay.payos.vn/..."
         }

      3. Frontend:
         window.location.href = checkoutUrl;
    */

    /*
      MOCK FLOW để test frontend hiện tại.

      Giả sử user thanh toán thành công trên payOS,
      redirect sang success page.
    */

    navigate(
      `/customer/payment/success?requestId=${requestId}&orderCode=DEMO-8931`
    );
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
                  ${payment.finalPrice.toFixed(2)}{" "}
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
                ${payment.depositAmount.toFixed(2)}{" "}
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
                  You will be redirected to payOS to complete
                  this payment securely.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="payos-button"
              onClick={handlePayWithPayOS}
            >
              Pay with payOS
            </button>

            <p className="payment-demo-text">
              Demo mode: this button currently simulates the
              payOS redirect flow.
            </p>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentPage;