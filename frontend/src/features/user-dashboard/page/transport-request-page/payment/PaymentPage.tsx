import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import "./PaymentPage.css";
import { useRequest, currentContract, date } from "../../../../flow1/relational/presentation";
import { relational } from "../../../../flow1/relational/api";
import { flow1Error, money } from "../../../../flow1/api";
import { LifecycleActions } from "../../../../flow1/relational/LifecycleActions";

function PaymentPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const key=useRef(crypto.randomUUID());const {request,error:loadError,reload}=useRequest(requestId);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const c=request?currentContract(request):undefined;
  if(!request||!c)return <CustomerLayout pageTitle="Payment"><div className="payment-card">{loadError?<p role="alert">{loadError}</p>:request?"Chưa có hợp đồng.":"Đang tải…"}</div></CustomerLayout>;
  const payment={requestId:request.requestId,contractNumber:c.contractId,origin:request.departure,destination:request.destination,finalPrice:c.totalPrice,depositPercent:c.relationalTermsReady?40:"—",depositAmount:c.depositAmount,currency:c.currency};
  const handleBack=()=>navigate(`/customer/requests/${requestId}`);
  const cash=(amount:number)=>c.currency==="VND"?money(amount):amount.toLocaleString("vi-VN")+" "+c.currency;
  const canPay=c.relationalTermsReady&&c.hasAcceptanceEvidence&&c.isCurrent&&c.status==="SIGNED"&&c.cancellationStatus!=="PENDING"&&c.paidAmount<c.depositAmount&&!c.payments.some(p=>p.reviewRequired);
  const handlePayWithPayOS=async()=>{setBusy(true);setError("");try{const session=await relational.action<{paymentUrl:string}>(`/customer/contracts/${c.contractId}/vnpay`,{},key.current);const url=new URL(session.paymentUrl);if(url.origin!=="https://sandbox.vnpayment.vn")throw new Error("Địa chỉ thanh toán không hợp lệ.");window.location.assign(url.href);}catch(e){setError(flow1Error(e));}finally{setBusy(false);}};

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
          <section className="payment-card">{error&&<p role="alert">{error}</p>}
            <div className="payment-card-header">
              <div>
                <span className="payment-eyebrow">
                  Payment Summary
                </span>

                <h2>Transport Deposit</h2>
              </div>

              <span className="payment-status">
                {c.invoiceStatus||"Chưa ký"}
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
                  {payment.finalPrice.toLocaleString("vi-VN")}{" "}
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
                {payment.depositAmount.toLocaleString("vi-VN")}{" "}
                {payment.currency}
              </strong>
            </div>

            <p className="payment-demo-text">{c.relationalTermsReady?"Đã xác minh":"Giá trị trong hồ sơ"}: {cash(c.paidAmount)} / {cash(c.depositAmount)} · Hạn cọc {date(c.depositDeadline)}</p>
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
              disabled={!canPay||busy}
              onClick={handlePayWithPayOS}
            >
              Thanh toán qua VNPay
            </button>

            <p className="payment-demo-text">
              Tiền được xác minh từ IPN có chữ ký. Trang trả về không tự xác nhận thanh toán.
            </p>
            <div className="payment-info-grid">{c.payments.map(p=><div key={p.paymentId}><span>{p.method} · {p.status}</span><strong>{cash(p.amount)} · {p.transactionCode||"Chờ kết quả"}</strong>{p.reviewRequired&&<p>Cần đối soát: {p.reviewReason}</p>}</div>)}</div>
            <button type="button" className="payment-back" onClick={()=>reload().catch(e=>setError(flow1Error(e)))}>Tải lại trạng thái</button><LifecycleActions c={c} reload={reload}/>
          </section>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default PaymentPage;
