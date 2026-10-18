import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import { useRequest, selectedContract, date } from "../../../../flow1/relational/mainBindings";
import "./ContractPage.css";

function ContractPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [isAgreed, setIsAgreed] = useState(false);
  const record = useRequest(requestId);
  const c = selectedContract(record || undefined);
  const isSigned = !!c?.hasAcceptanceEvidence;

  const contract = { contractNumber: c?.contractId || "—", contractDate: "—", customer: record?.customerName || "—", serviceProvider: "CBN Transport", origin: record?.departure || "—", destination: record?.destination || "—", preferredTransportDate: date(record?.departureAt), numberOfHorses: record?.horses.length || 0, finalPrice: c?.totalPrice || 0, currency: c?.currency || "VND", depositPercent: c?.relationalTermsReady ? 40 : 0, depositAmount: c?.depositAmount || 0 };
  const handleBack = () => {
    if (!requestId) return;

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  const handleSignContract = () => { /* OTP UI is deferred to the frontend teammate. */ };
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
          ← Back to Request
        </button>

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
                % •
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
              TERMS AND CONDITIONS
            </h3>

            <ol>
              <li>
                CBN Transport will transport
                the horses listed for this
                request along the agreed
                route.
              </li>

              <li>
                A deposit of{" "}
                {
                  contract.depositPercent
                }
                % of the final agreed price
                is payable after signing.
                The remaining balance is
                payable before departure.
              </li>

              <li>
                The customer provides
                accurate pickup, delivery,
                horse, and document
                information after the
                deposit is paid.
              </li>

              <li>
                The transport date is
                confirmed once all required
                documents have been
                reviewed.
              </li>

              <li>
                Changes to the route, date,
                or number of horses may
                change the final price.
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
                I have read and agree to
                the terms and conditions.
              </span>
            </label>
          ) : (
            <div className="contract-signed-message">
              Contract signed successfully.
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
              Back to Request
            </button>

            {!isSigned ? (
              <button
                type="button"
                className="contract-sign-button"
                disabled title="Cần giao diện xem PDF và xác nhận OTP trước khi ký"
                onClick={
                  handleSignContract
                }
              >
                Sign Contract
              </button>
            ) : (
              <button
                type="button"
                className="contract-payment-button"
                onClick={
                  handlePayment
                }
              >
                Continue to Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default ContractPage;