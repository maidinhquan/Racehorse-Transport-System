import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import {
  updateRequestStatus,
} from "../../../data/transportRequestStorage";

import "./PaymentSuccessPage.css";

function PaymentSuccessPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const requestId =
    searchParams.get("requestId");

  const orderCode =
    searchParams.get("orderCode");

  const [seconds, setSeconds] =
    useState(3);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    /*
      MOCK ONLY.

      Sau này KHÔNG update frontend như này.

      Backend webhook payOS sẽ cập nhật:
      Awaiting Deposit
      →
      Information Required
    */
    updateRequestStatus(
      requestId,
      "Information Required"
    );
  }, [requestId]);

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
            ✓
          </div>

          <h1>
            Payment Successful
          </h1>

          <p>
            Your deposit payment has been
            confirmed successfully.
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
                Information Required
              </strong>
            </div>
          </div>

          <div className="payment-success-message">
            You can now continue and provide
            pickup, delivery, horse and
            document information.
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