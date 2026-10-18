import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import { useRequest, currentContract, date } from "../../../../flow1/relational/presentation";
import { relational, download } from "../../../../flow1/relational/api";
import { flow1Error } from "../../../../flow1/api";
import { LifecycleActions } from "../../../../flow1/relational/LifecycleActions";
import "./ContractPage.css";

function ContractPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [isAgreed, setIsAgreed] = useState(false);
  const {request,error:loadError,reload}=useRequest(requestId);
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);const [viewed,setViewed]=useState<string|null>(null);const [otpOpen,setOtpOpen]=useState(false);const [otp,setOtp]=useState("");
  const c=request?currentContract(request):undefined;
  if(!request||!c)return <CustomerLayout pageTitle="Service Contract"><div className="contract-card">{loadError?<p role="alert">{loadError}</p>:request?"Chưa có hợp đồng.":"Đang tải…"}</div></CustomerLayout>;
  const isSigned=!!c.signedAt;
  const contract={contractNumber:c.contractId,contractDate:date(c.signDeadline),customer:request.customerName||localStorage.getItem("userFullName")||"—",serviceProvider:"CBN Transport",origin:request.departure,destination:request.destination,preferredTransportDate:date(request.departureAt),numberOfHorses:request.horses.length,finalPrice:c.totalPrice,currency:c.currency,depositPercent:c.relationalTermsReady?40:"—",depositAmount:c.depositAmount};
  const handleBack=()=>navigate(`/customer/requests/${requestId}`);
  const handlePayment=()=>navigate(`/customer/requests/${requestId}/payment`);
  const handleSignContract=async()=>{setBusy(true);setError("");try{await relational.action(`/customer/contracts/${c.contractId}/otp`,{version:c.version,pdfSha256:c.pdfSha256});await reload();setOtpOpen(true);}catch(e){setError(flow1Error(e));}finally{setBusy(false);}};

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
              <span>Signing Deadline:</span>

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

          {error&&<p role="alert">{error}</p>}
          {!c.relationalTermsReady&&<p>Hồ sơ cũ cần rà soát; chưa đủ chứng cứ PDF/OTP để mở ký hoặc thu cọc.</p>}
          {c.pdfSha256&&<div className="contract-actions"><button className="contract-back-button" disabled={busy} onClick={async()=>{try{await download(`/customer/contracts/${c.contractId}/pdf`,c.contractId+".pdf");setViewed(c.pdfSha256);}catch(e){setError(flow1Error(e));}}}>Xem / tải đúng PDF</button></div>}
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
                Pickup, delivery and horse documents are reviewed before signature. The published PDF contains the binding terms.
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
              {c.hasAcceptanceEvidence?`Biên nhận xác nhận OTP: ${date(c.signedAt)}`:"Thời điểm ký lưu trong hồ sơ cũ"}
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
                disabled={!isAgreed||busy||viewed!==c.pdfSha256||!c.pdfSha256||!c.relationalTermsReady||!c.isCurrent||c.status!=="PENDING_SIGNATURE"}
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
          <LifecycleActions c={c} reload={reload}/>
        </div>
        {otpOpen&&<div className="customer-modal-overlay"><div className="customer-modal-card"><div className="modal-header"><h3>Xác nhận hợp đồng bằng OTP</h3><button className="modal-close" onClick={()=>setOtpOpen(false)}>✕</button></div><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await relational.action(`/customer/contracts/${c.contractId}/sign`,{version:c.version,pdfSha256:c.pdfSha256,otp});setOtp("");await reload();setOtpOpen(false);}catch(e){setError(flow1Error(e));}finally{setBusy(false);}}}><div className="modal-body"><p>Mã đã gửi qua email; chỉ xác nhận đúng PDF vừa xem.</p><label className="form-label">OTP xác nhận<input required className="form-input" autoComplete="one-time-code" pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}</div><div className="modal-footer"><button className="primary-button" disabled={busy}>Xác nhận hợp đồng</button></div></form></div></div>}
      </div>
    </CustomerLayout>
  );
}

export default ContractPage;
