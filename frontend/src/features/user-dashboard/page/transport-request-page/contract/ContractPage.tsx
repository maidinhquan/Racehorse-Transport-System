import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";
import RequestFlowStepper from "../components/RequestFlowStepper";

import {
  getRequestById,
  updateRequestStatus,
} from "../../../data/transportRequestStorage";
import {
  transportRequestDetails,
} from "../../../data/transportRequestDetailMockData";

import "./ContractPage.css";

function ContractPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const storedRequest = requestId ? getRequestById(requestId) : undefined;
  const detailRequest = requestId
    ? transportRequestDetails.find((item) => item.id === requestId)
    : undefined;
  const request = storedRequest ?? detailRequest;

  const [isAgreed, setIsAgreed] = useState(false);
  const [isSigned, setIsSigned] = useState(() => {
    return (
      (request as any)?.contractStatus === "Signed" ||
      request?.status === "Awaiting Deposit" ||
      request?.status === "Information Required" ||
      request?.status === "Information Submitted" ||
      request?.status === "Documents Under Review"
    );
  });

  const finalPrice = request?.estimatedPrice || 2450;
  const depositPercent = 30;
  const depositAmount = Math.round(finalPrice * 0.3);

  const contract = {
    contractNumber: `CT-${(request?.id || requestId || "8931").replace(/\D/g, "")}`,
    contractDate: request?.requestedDate || new Date().toISOString().slice(0, 10),

    customer: (request as any)?.customerName || "Nguyễn Thanh Quốc Linh",
    serviceProvider: "CBN Transport Logistics",

    origin: request?.origin || "Hanoi, VN",
    destination: request?.destination || "Ho Chi Minh City, VN",

    preferredTransportDate: request?.preferredDate || "2026-11-01",

    numberOfHorses: request?.horseCount || 1,

    finalPrice,
    currency: "USD",

    depositPercent,
    depositAmount,
  };

  const handleBack = () => {
    if (!requestId) return;

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  const handleSignContract = () => {
    if (!isAgreed || !requestId) {
      return;
    }

    setIsSigned(true);

    updateRequestStatus(
      requestId,
      "Awaiting Deposit"
    );
  };

  const handlePayment = () => {
    if (!requestId) return;

    navigate(
      `/customer/requests/${requestId}/payment`
    );
  };

  return (
    <CustomerLayout pageTitle="Service Contract">
      <div className="contract-page">
        <button
          type="button"
          className="contract-page-back"
          onClick={handleBack}
        >
          ← Quay lại chi tiết yêu cầu
        </button>

        {/* Luồng 3 bước: Hợp đồng -> Thanh toán -> Giấy tờ */}
        <RequestFlowStepper currentStep={1} />

        <div className="contract-card">
          {/* HEADER */}
          <div className="contract-top">
            <div>
              <h2 className="contract-company">
                CBN Transport
              </h2>

              <h1 className="contract-title">
                Equine Transport Service Contract
              </h1>
            </div>

            <div className="contract-date">
              <span>Contract Date:</span>

              <strong>
                {contract.contractDate}
              </strong>
            </div>
          </div>

          {/* INFORMATION */}
          <div className="contract-info-grid">
            <div className="contract-info-item">
              <span>
                Contract Number
              </span>

              <strong>
                {contract.contractNumber}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Customer
              </span>

              <strong>
                {contract.customer}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Service Provider
              </span>

              <strong>
                {contract.serviceProvider}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Route
              </span>

              <strong>
                {contract.origin}

                <span className="route-arrow">
                  {" "}→{" "}
                </span>

                {contract.destination}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Preferred Transport Date
              </span>

              <strong>
                {
                  contract.preferredTransportDate
                }
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Number of Horses
              </span>

              <strong>
                {contract.numberOfHorses}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Final Agreed Price
              </span>

              <strong>
                $
                {contract.finalPrice.toFixed(
                  2
                )}{" "}
                {contract.currency}
              </strong>
            </div>

            <div className="contract-info-item">
              <span>
                Deposit
              </span>

              <strong>
                {
                  contract.depositPercent
                }
                % • $
                {contract.depositAmount.toFixed(
                  2
                )}{" "}
                {contract.currency}
              </strong>
            </div>
          </div>

          {/* TERMS */}
          <div className="contract-terms">
            <h3>
              TERMS AND CONDITIONS • ĐIỀU KHOẢN HỢP ĐỒNG
            </h3>

            <ol>
              <li>
                <strong>Lộ trình vận chuyển:</strong> CBN Transport cam kết cung cấp dịch vụ vận chuyển chuyên biệt cho các cá thể ngựa theo đúng lộ trình đã thỏa thuận ({contract.origin} → {contract.destination}).
              </li>

              <li>
                <strong>Nghĩa vụ đặt cọc:</strong> Khách hàng thanh toán tiền cọc {contract.depositPercent}% tổng giá trị hợp đồng (tương đương ${contract.depositAmount.toLocaleString()} {contract.currency}) ngay sau khi ký hợp đồng điện tử này. Số tiền còn lại thanh toán trước thời điểm khởi hành.
              </li>

              <li>
                <strong>Nộp thông tin & Giấy tờ:</strong> Ngay sau khi hoàn tất thanh toán tiền cọc, khách hàng sẽ bắt đầu bước điền thông tin chi tiết (điểm đón, điểm trả, chi tiết cá thể ngựa) và nộp giấy tờ hồ sơ kiểm dịch y tế.
              </li>

              <li>
                <strong>Phê duyệt & Điều phối:</strong> Lịch trình vận chuyển chính thức sẽ được CBN Transport điều phối sau khi toàn bộ hồ sơ chứng từ kiểm dịch được cơ quan chức năng và chuyên gia thẩm định đạt chuẩn.
              </li>

              <li>
                <strong>Điều chỉnh thông tin:</strong> Mọi thay đổi về lộ trình, ngày đón hoặc số lượng ngựa sẽ được cập nhật phụ lục hợp đồng và điều chỉnh chi phí theo quy định.
              </li>
            </ol>
          </div>

          {/* AGREEMENT */}
          {!isSigned ? (
            <label className="contract-agreement">
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(event) =>
                  setIsAgreed(
                    event.target.checked
                  )
                }
              />

              <span>
                Tôi đã đọc, hiểu rõ và đồng ý với các điều khoản hợp đồng dịch vụ vận chuyển ngựa của CBN Transport.
              </span>
            </label>
          ) : (
            <div className="contract-signed-message" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '8px', fontWeight: 600 }}>
              <span>✓</span>
              <span>Hợp đồng đã được ký kết thành công. Vui lòng tiến hành thanh toán tiền cọc 30% để tiếp tục luồng hồ sơ.</span>
            </div>
          )}

          <div className="contract-divider" />

          {/* ACTIONS */}
          <div className="contract-actions">
            <button
              type="button"
              className="contract-back-button"
              onClick={handleBack}
            >
              Quay lại chi tiết đơn
            </button>

            {!isSigned ? (
              <button
                type="button"
                className="contract-sign-button"
                disabled={!isAgreed}
                onClick={
                  handleSignContract
                }
              >
                Xác nhận & Ký hợp đồng
              </button>
            ) : (
              <button
                type="button"
                className="contract-payment-button"
                style={{ background: '#ea580c', borderColor: '#ea580c' }}
                onClick={
                  handlePayment
                }
              >
                Tiến hành thanh toán tiền cọc ➔
              </button>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default ContractPage;