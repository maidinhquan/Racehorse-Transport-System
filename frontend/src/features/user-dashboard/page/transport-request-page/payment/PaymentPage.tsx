import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import RequestFlowStepper from "../components/RequestFlowStepper";

import {
  getRequestById,
} from "../../../data/transportRequestStorage";
import {
  transportRequestDetails,
} from "../../../data/transportRequestDetailMockData";

import "./PaymentPage.css";

function PaymentPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const storedRequest = requestId ? getRequestById(requestId) : undefined;
  const detailRequest = requestId
    ? transportRequestDetails.find((item) => item.id === requestId)
    : undefined;
  const request = storedRequest ?? detailRequest;

  const finalPrice = request?.estimatedPrice || 2450;
  const depositPercent = 30;
  const depositAmount = Math.round(finalPrice * 0.3);

  const payment = {
    requestId: request?.id || requestId || "UNKNOWN",
    contractNumber: `CT-${(request?.id || requestId || "8931").replace(/\D/g, "")}`,
    origin: request?.origin || "Hanoi, VN",
    destination: request?.destination || "Ho Chi Minh City, VN",
    finalPrice,
    depositPercent,
    depositAmount,
    currency: "USD",
  };

  const handleBack = () => {
    navigate(`/customer/requests/${requestId}/contract`);
  };

  const handlePayWithPayOS = () => {
    navigate(
      `/customer/payment/success?requestId=${payment.requestId}&orderCode=DEMO-${payment.contractNumber}`
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
          ← Quay lại xem Hợp đồng
        </button>

        {/* Luồng 3 bước: Hợp đồng -> Thanh toán -> Giấy tờ */}
        <RequestFlowStepper currentStep={2} />

        <div className="payment-header">
          <div>
            <h1>Thanh toán tiền cọc vận chuyển</h1>

            <p>
              Hoàn tất thanh toán tiền cọc 30% để tiếp tục bước nộp hồ sơ giấy tờ vận chuyển.
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
                  Thông tin thanh toán
                </span>

                <h2>Đặt cọc hợp đồng vận chuyển</h2>
              </div>

              <span className="payment-status">
                Chờ thanh toán
              </span>
            </div>

            <div className="payment-info-grid">
              <div>
                <span>Mã yêu cầu (Request ID)</span>
                <strong>{payment.requestId}</strong>
              </div>

              <div>
                <span>Số hợp đồng (Contract No)</span>
                <strong>{payment.contractNumber}</strong>
              </div>

              <div>
                <span>Lộ trình vận chuyển</span>

                <strong>
                  {payment.origin}
                  {" → "}
                  {payment.destination}
                </strong>
              </div>

              <div>
                <span>Tổng chi phí thỏa thuận</span>

                <strong>
                  ${payment.finalPrice.toLocaleString()}{" "}
                  {payment.currency}
                </strong>
              </div>
            </div>

            <div className="payment-deposit-box">
              <div>
                <span>Số tiền đặt cọc cần thanh toán</span>

                <small>
                  {payment.depositPercent}% giá trị hợp đồng dịch vụ
                </small>
              </div>

              <strong>
                ${payment.depositAmount.toLocaleString()}{" "}
                {payment.currency}
              </strong>
            </div>

            <div className="payment-note">
              <div className="payment-note-icon">
                i
              </div>

              <div>
                <strong>Cổng thanh toán an toàn payOS</strong>

                <p>
                  Sau khi đặt cọc thành công, hệ thống sẽ mở quyền để quý khách bắt đầu điền thông tin chi tiết và nộp giấy tờ hồ sơ kiểm dịch.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="payos-button"
              onClick={handlePayWithPayOS}
            >
              Thanh toán tiền cọc qua payOS
            </button>

            <p className="payment-demo-text">
              Chế độ thử nghiệm: Nút thanh toán sẽ mô phỏng xác nhận đặt cọc thành công từ payOS webhook.
            </p>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentPage;