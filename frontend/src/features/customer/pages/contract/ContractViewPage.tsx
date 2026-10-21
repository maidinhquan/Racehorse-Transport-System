import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { ContractBody } from '../../components/ContractBody/ContractBody';
import { Note } from '../../components/Common/Common';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { cityLabel, ctRef, curVersion, fmtDateTime, versionState } from '../../hooks/customerRules';
import './ContractPages.css';

/** Hợp đồng đầy đủ của một phiên bản (chỉ xem; phiên bản cũ không thể ký) */
export const ContractViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId = '', version = '' } = useParams<{ requestId: string; version: string }>();
  const { profile, horses, getRequest } = useCustomer();
  const r = getRequest(requestId);
  const v = r?.versions.find((x) => x.v === Number(version)) ?? (r ? curVersion(r) : undefined);

  if (!r || !v) {
    return <CustomerLayout title="Hợp đồng"><Note tone="grey" title="Không tìm thấy hợp đồng">Yêu cầu {requestId} chưa có phiên bản hợp đồng này.</Note></CustomerLayout>;
  }
  const current = v === curVersion(r), state = versionState(v);

  return (
    <CustomerLayout title="Hợp đồng">
      <button type="button" className="cus-back" onClick={() => navigate(`/customer/requests/${r.id}/contract`)}><Icon name="back" />Hợp đồng & chi phí</button>
      <div className="cus-head">
        <div>
          <h2 className="cus-title cus-detail__title">Hợp đồng dịch vụ {ctRef(v)} <TripStatusBadge kind="contract" status={state} /></h2>
          <p className="cus-subtitle">{r.id} • {cityLabel(r.origin)} → {cityLabel(r.destination)}</p>
        </div>
        <button type="button" className="cus-btn" onClick={() => window.print()}><Icon name="file" />In / lưu PDF</button>
      </div>
      {!current && <Note tone="grey" title="Phiên bản cũ – chỉ xem">Phiên bản này đã được thay bằng {ctRef(curVersion(r)!)} và không thể ký.</Note>}
      {current && state === 'EXPIRED' && <Note tone="grey" title="Phiên bản đã hết hạn">Không thể ký nữa. Yêu cầu phiên bản cập nhật ở tab Hợp đồng & chi phí.</Note>}
      {state === 'FULFILLED' && <Note tone="grey" title="Đã hoàn thành – hết hiệu lực">Yêu cầu đã đóng{r.closedAt ? ` ${fmtDateTime(r.closedAt)}` : ''}. Hợp đồng đã ký được lưu để tham chiếu.</Note>}
      {['EFFECTIVE', 'FULFILLED'].includes(state) && <Note tone="green" title={`Đã ký điện tử bằng OTP • ${fmtDateTime(v.signedAt)}`}>Người ký: {profile.name}. Phiên bản đã ký chỉ để xem.</Note>}

      <div className="cus-card cus-contract-head">
        <div><b className="cus-contract-head__brand">CBN Transport</b><span>{v.number} • v{v.v} • {fmtDateTime(v.issuedAt)}</span></div>
        <h3>Hợp đồng dịch vụ vận chuyển ngựa</h3>
        <div className="cus-kv">
          <div><span>Khách hàng</span><b>{profile.name}</b></div>
          <div><span>Công ty / trại ngựa</span><b>{profile.company}</b></div>
          <div><span>Bên cung cấp dịch vụ</span><b>CBN Transport</b></div>
          <div><span>Email ký OTP</span><b>{profile.email}</b></div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}><ContractBody request={r} v={v} horses={horses} /></div>
    </CustomerLayout>
  );
};

export default ContractViewPage;
