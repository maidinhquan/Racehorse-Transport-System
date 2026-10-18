import { useNavigate, useSearchParams } from "react-router-dom";

import CustomerLayout from "../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./PaymentCancelPage.css";

function PaymentCancelPage() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const requestId =
    searchParams.get("requestId");

  const handleTryAgain = () => {
    if (!requestId) {
      navigate(
        "/customer/requests"
      );

      return;
    }

    navigate(
      `/customer/requests/${requestId}/payment`
    );
  };

  const handleBack = () => {
    if (!requestId) {
      navigate(
        "/customer/requests"
      );

      return;
    }

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  return (
    <CustomerLayout pageTitle="Payment">
      <div className="payment-cancel-page">
        <div className="payment-cancel-card">
          <div className="payment-cancel-icon">
            ×
          </div>

          <h1>
            Payment Cancelled
          </h1>

          <p>
            Your payment was not completed.
            No successful deposit payment has
            been confirmed.
          </p>

          {requestId && (
            <div className="payment-cancel-request">
              <span>
                Transport Request
              </span>

              <strong>
                {requestId}
              </strong>
            </div>
          )}

          <div className="payment-cancel-note">
            Your request remains in{" "}
            <strong>
              Awaiting Deposit
            </strong>
            . You can try the payment again
            when you're ready.
          </div>

          <div className="payment-cancel-actions">
            <button
              type="button"
              className="payment-cancel-back"
              onClick={handleBack}
            >
              Back to Request
            </button>

            <button
              type="button"
              className="payment-try-again"
              onClick={
                handleTryAgain
              }
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentCancelPage;