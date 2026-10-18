import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import RequestFlowStepper from "../components/RequestFlowStepper";

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
    useState(4);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    // Đã thanh toán tiền cọc -> Kích hoạt bước điền thông tin giấy tờ
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

          // Tự động chuyển sang bước điền thông tin giấy tờ
          navigate(
            `/customer/requests/${requestId}/information`
          );

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [navigate, requestId]);

  const handleStartDocuments = () => {
    if (!requestId) {
      navigate("/customer/requests");
      return;
    }

    navigate(
      `/customer/requests/${requestId}/information`
    );
  };

  const handleViewRequest = () => {
    if (!requestId) {
      navigate("/customer/requests");
      return;
    }

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  return (
    <CustomerLayout pageTitle="Payment Successful">
      <div className="payment-result-page">
        {/* Luồng 3 bước: Hợp đồng -> Thanh toán -> Giấy tờ */}
        <RequestFlowStepper currentStep={3} />

        <div className="payment-success-card">
          <div className="payment-success-icon">
            ✓
          </div>

          <h1>
            Thanh toán tiền cọc thành công!
          </h1>

          <p>
            Khoản tiền đặt cọc 30% cho hợp đồng đã được xác nhận thành công qua payOS.
          </p>

          <div className="payment-success-info">
            <div>
              <span>
                Mã yêu cầu
              </span>

              <strong>
                {requestId ?? "—"}
              </strong>
            </div>

            <div>
              <span>
                Mã giao dịch
              </span>

              <strong>
                {orderCode ?? "—"}
              </strong>
            </div>

            <div>
              <span>
                Trạng thái tiếp theo
              </span>

              <strong className="success-status" style={{ color: '#16a34a' }}>
                Bắt đầu điền thông tin & giấy tờ
              </strong>
            </div>
          </div>

          <div className="payment-success-message" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '14px', borderRadius: '8px', lineHeight: 1.5 }}>
            Bây giờ quý khách có thể bắt đầu điền chi tiết điểm đón/trả, thông tin cá thể ngựa và nộp hồ sơ giấy tờ kiểm dịch y tế.
          </div>

          <p className="payment-redirect-text" style={{ marginTop: '16px' }}>
            Tự động chuyển đến trang điền thông tin & giấy tờ sau{" "}
            <strong>
              {seconds}
            </strong>{" "}
            giây...
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}
              onClick={handleStartDocuments}
            >
              📝 Bắt đầu điền thông tin giấy tờ ngay ➔
            </button>

            <button
              type="button"
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
              onClick={handleViewRequest}
            >
              Xem chi tiết đơn yêu cầu
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentSuccessPage;