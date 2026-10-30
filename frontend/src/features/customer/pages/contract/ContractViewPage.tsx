import React, { useEffect, useState } from 'react';
import { customerApi } from '../../api/customerApi';
import { apiMessage } from '../../../../shared/api/apiError';
import type { ContractVersion } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { ContractBody } from '../../components/ContractBody/ContractBody';
import { Note } from '../../components/Common/Common';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { cityLabel, ctRef, curVersion, fmtDateTime, versionState } from '../../hooks/customerRules';
import { downloadFile } from '../../../../shared/api/downloadFile';
import './ContractPages.css';

/** Hợp đồng đầy đủ của một phiên bản (chỉ xem; phiên bản cũ không thể ký) */
export const ContractViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId = '', version = '' } = useParams<{ requestId: string; version: string }>();
  const { horses, getRequest, actions } = useCustomer(requestId);
  const r = getRequest(requestId);
  const ref = r && curVersion(r);
  const selectedNo = version ? Number(version) : ref?.v;
  const [loadedVersion, setLoadedVersion] = useState<ContractVersion | null>(null);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true; setLoadedVersion(null); setLoadError('');
    if (ref?.contractId && selectedNo && Number.isInteger(selectedNo) && selectedNo > 0) {
      customerApi.getContractVersion(ref.contractId, selectedNo).then(value => { if (active) setLoadedVersion(value); })
        .catch(error => { if (active) setLoadError(apiMessage(error)); });
    }
    return () => { active = false; };
  }, [ref?.contractId, selectedNo]);
  const v = loadedVersion;

  if (!r || !v) {
    return <CustomerLayout title="Hợp đồng"><Note tone="grey" title="Không tìm thấy hợp đồng">{loadError || 'Đang tải phiên bản hợp đồng được chọn…'}</Note></CustomerLayout>;
  }
  const current = v.v === curVersion(r)?.v, state = versionState(v);

  const handleDownloadPdf = async () => {
    if (!v.contractId) return actions.showToast('Chưa có mã hợp đồng.');
    try { await downloadFile(`/customer/contracts/${v.contractId}/versions/${v.v}/pdf`, `${v.contractId}-v${v.v}.pdf`); }
    catch (error) { actions.showToast(apiMessage(error)); }
  };

  return (
    <CustomerLayout title="Hợp đồng">
      <button type="button" className="cus-back" onClick={() => navigate(`/customer/requests/${r.id}/contract`)}><Icon name="back" />Hợp đồng & chi phí</button>
      <div className="cus-head">
        <div>
          <h2 className="cus-title cus-detail__title">Hợp đồng dịch vụ {ctRef(v)} <TripStatusBadge kind="contract" status={state} /></h2>
          <p className="cus-subtitle">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)}</p>
        </div>
        <button type="button" className="cus-btn" onClick={handleDownloadPdf}><Icon name="file" />Xem / Tải file PDF</button>
      </div>
      {!current && <Note tone="grey" title="Phiên bản cũ – chỉ xem">Phiên bản này đã được thay bằng {ctRef(curVersion(r)!)} và không thể ký.</Note>}
      {current && state === 'EXPIRED' && <Note tone="grey" title="Phiên bản đã hết hạn">Không thể ký nữa. Yêu cầu phiên bản cập nhật ở tab Hợp đồng & chi phí.</Note>}
      {state === 'FULFILLED' && <Note tone="grey" title="Đã hoàn thành – hết hiệu lực">Yêu cầu đã đóng{r.closedAt ? ` ${fmtDateTime(r.closedAt)}` : ''}. Hợp đồng đã ký được lưu để tham chiếu.</Note>}
      {['SIGNED', 'EFFECTIVE', 'FULFILLED'].includes(state) && <Note tone="green" title={`Đã ký điện tử bằng OTP • ${fmtDateTime(v.signedAt)}`}>Người ký: {v.snapshot?.customer.name ?? '—'}. Phiên bản đã ký chỉ để xem.</Note>}

      <div className="cus-card cus-contract-head">
        <div><b className="cus-contract-head__brand">CBN Transport</b><span>{v.number} • v{v.v} • {fmtDateTime(v.issuedAt)}</span></div>
        <h3>Hợp đồng dịch vụ vận chuyển ngựa</h3>
        <div className="cus-kv">
          <div><span>Khách hàng</span><b>{v.snapshot?.customer.name ?? '—'}</b></div>
          <div><span>Công ty / trại ngựa</span><b>{v.snapshot?.customer.company ?? '—'}</b></div>
          <div><span>Bên cung cấp dịch vụ</span><b>CBN Transport</b></div>
          <div><span>Email ký OTP</span><b>{v.snapshot?.customer.email ?? '—'}</b></div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}><ContractBody request={r} v={v} horses={horses} /></div>
    </CustomerLayout>
  );
};

export default ContractViewPage;
