import { useEffect, useRef, useState } from "react";
import { relational, type Request } from "../../../../flow1/relational/api";
import { flow1Error } from "../../../../flow1/api";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../../../shared/layouts/CustomerLayout/CustomerLayout";

import { useRequest, selectedContract, date } from "../../../../flow1/relational/mainBindings";
import "./ContractPage.css";

function ContractPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [isAgreed, setIsAgreed] = useState(false);
  const initial = useRequest(requestId);
  const [updated, setUpdated] = useState<Request | null>(null);
  const record = updated?.requestId === requestId ? updated : initial;
  const [otp, setOtp] = useState("");
  const [reviewedHash, setReviewedHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const urls = useRef<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);
  const c = selectedContract(record || undefined);
  const isSigned = !!c?.hasAcceptanceEvidence;

  const contract = { contractNumber: c?.contractId || "—", contractDate: "—", customer: record?.customerName || "—", serviceProvider: "CBN Transport", origin: record?.departure || "—", destination: record?.destination || "—", preferredTransportDate: date(record?.departureAt), numberOfHorses: record?.horses.length || 0, finalPrice: c?.totalPrice || 0, currency: c?.currency || "VND", depositPercent: c?.relationalTermsReady ? 40 : 0, depositAmount: c?.depositAmount || 0 };
  const handleBack = () => {
    if (!requestId) return;

    navigate(
      `/customer/requests/${requestId}`
    );
  };

  const signingOpen = !!c?.isCurrent && c.relationalTermsReady && c.status === "PENDING_SIGNATURE" && !!c.pdfSha256 && Date.parse(c.signDeadline || "") > now;
  const reviewed = !!c?.pdfSha256 && reviewedHash === c.pdfSha256;
  const refresh = async () => { if (requestId) { const next = await relational.detail(requestId); setUpdated(next); return next; } };
  const handlePdf = async () => {
    if (!c?.pdfSha256 || busy) return;
    const tab = window.open("about:blank", "_blank");
    if (!tab) { setMessage("Vui lòng cho phép mở tab mới để xem hợp đồng."); return; }
    tab.opener = null; setBusy(true); setMessage("");
    try { const url = await relational.pdfUrl(`/customer/contracts/${encodeURIComponent(c.contractId)}/pdf`); urls.current.push(url); tab.location.href = url; setReviewedHash(c.pdfSha256); }
    catch (e) { tab.close(); setMessage(flow1Error(e)); }
    finally { setBusy(false); }
  };
  const handleOtp = async () => {
    if (!c || !signingOpen || !reviewed || !isAgreed || busy) return;
    setBusy(true); setMessage(""); setOtp("");
    try { await relational.action(`/customer/contracts/${encodeURIComponent(c.contractId)}/otp`, { version: c.version, pdfSha256: c.pdfSha256 }); await refresh(); setMessage("Đã gửi OTP tới email tài khoản. Mã có hiệu lực tối đa 5 phút; gửi lại sau ít nhất 60 giây."); }
    catch (e) { setMessage(flow1Error(e)); try { await refresh(); } catch { /* Keep the original error visible. */ } }
    finally { setBusy(false); }
  };
  const handleSignContract = async () => {
    if (!c || !signingOpen || !reviewed || !isAgreed || !/^\d{6}$/.test(otp) || busy) return;
    setBusy(true); setMessage("");
    try { await relational.action(`/customer/contracts/${encodeURIComponent(c.contractId)}/sign`, { version: c.version, pdfSha256: c.pdfSha256, otp }); setOtp(""); await refresh(); setMessage("Ký hợp đồng thành công. Bạn có thể tiếp tục thanh toán cọc qua VNPay."); }
    catch (e) { setMessage(flow1Error(e)); try { await refresh(); } catch { /* Keep the original error visible. */ } }
    finally { setBusy(false); }
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

          <div className="contract-signing-controls">
            <button type="button" className="contract-back-button" disabled={!c?.pdfSha256 || busy} onClick={handlePdf}>Xem full hợp đồng</button>
            {!isSigned && <>
              <button type="button" className="contract-back-button" disabled={!signingOpen || !reviewed || !isAgreed || busy} onClick={handleOtp}>Gửi OTP</button>
              <label htmlFor="contract-sign-otp">Mã OTP
                <input id="contract-sign-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} disabled={!signingOpen || busy} onChange={event => setOtp(event.target.value.replace(/\D/g, ""))} />
              </label>
              {!reviewed && <p>Mở PDF đầy đủ và xác nhận đồng ý trước khi gửi OTP.</p>}
              {c && !signingOpen && <p>Hợp đồng chưa sẵn sàng ký hoặc đã hết hạn. Vui lòng liên hệ Manager.</p>}
            </>}
            {message && <p role="status">{message}</p>}
          </div>
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
                disabled={!signingOpen || !reviewed || !isAgreed || !/^\d{6}$/.test(otp) || busy}
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
