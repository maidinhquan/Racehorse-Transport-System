import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { Note, RouteText } from '../../components/Common/Common';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { useCustomer } from '../../hooks/useCustomer';
import { FilePreviewModal } from '../../components/Modals/FilePreviewModal';
import type { FileRef } from '../../types';
import {
  PASSPORT_LABEL,
  SEX_LABEL,
  displayRequestId,
  fmtDate,
  horseIssues,
  horseRequests,
  activeHorseRequests,
  passportStatus,
} from '../../hooks/customerRules';
import './HorseDetailPage.css';
import { AuthImage } from '../../../../shared/components/AuthImage';

/** Chi tiết hồ sơ ngựa: thông tin, giấy tờ đã lưu, giấy tờ theo từng yêu cầu và lịch sử vận chuyển */
export const HorseDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { horseId = '', tab = 'overview' } = useParams<{ horseId: string; tab: string }>();
  const { horses, requests } = useCustomer();
  const [preview, setPreview] = useState<{ file: FileRef; title: string } | null>(null);
  const h = horses.find((x) => x.id === horseId);
  if (!h) {
    return <CustomerLayout title="Ngựa của tôi"><Note tone="grey" title="Không tìm thấy ngựa">Ngựa {horseId} không có trong thư viện của bạn.</Note></CustomerLayout>;
  }
  const history = horseRequests(h, requests);
  const active = activeHorseRequests(h, requests);
  const issues = horseIssues(h), ps = passportStatus(h);
  const fileRow = (label: string, file?: FileRef) => (
    <div className="cus-hd__file">
      <span>{label}</span>
      {file ? <><b>{file.name}</b><button type="button" className="cus-btn cus-btn--sm" onClick={() => setPreview({ file, title: label })}>Xem tệp</button></> : <TripStatusBadge label="Còn thiếu" tone="bad" />}
    </div>
  );

  return (
    <CustomerLayout title="Ngựa của tôi">
      <button type="button" className="cus-back" onClick={() => navigate('/customer/horses')}><Icon name="back" />Ngựa của tôi</button>
      <div className="cus-card cus-hd__hero">
        <div
          className="cus-hd__photo"
          style={{ cursor: h.photo?.url ? 'pointer' : 'default' }}
          title={h.photo?.url ? 'Bấm để xem ảnh phóng to' : undefined}
          onClick={() => {
            if (h.photo) setPreview({ file: h.photo, title: `Ảnh nhận diện: ${h.name}` });
          }}
        >
          <AuthImage framed src={h.photo?.url} alt={h.name} fallback={<Icon name="horse" />} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 className="cus-title cus-detail__title">{h.name} <TripStatusBadge label={active.length ? 'Đã dùng trong yêu cầu' : 'Chưa dùng'} tone={active.length ? 'info' : 'muted'} /></h2>
          <p className="cus-subtitle">{h.id}</p>
        </div>
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/horses/${h.id}/edit`)}>Chỉnh sửa hồ sơ</button>
      </div>
      {issues.length > 0 && (
        <Note tone="yellow" title="Cần hoàn thiện"><ul className="cus-rule-list" style={{ margin: '4px 0 0' }}>{issues.map((t) => <li key={t}>{t}</li>)}</ul></Note>
      )}

      <div className="cus-tabs">
        <button type="button" className={tab !== 'history' ? 'on' : ''} onClick={() => navigate(`/customer/horses/${h.id}`)}>Hồ sơ ngựa</button>
        <button type="button" className={tab === 'history' ? 'on' : ''} onClick={() => navigate(`/customer/horses/${h.id}/history`)}>Lịch sử vận chuyển ({history.length})</button>
      </div>

      {tab !== 'history' ? (
        <div className="cus-grid2">
          <div className="cus-card">
            <h3 className="cus-card__title">Thông tin sinh học & định danh</h3>
            <div className="cus-kv">
              <div><span>Tên ngựa</span><b>{h.name}</b></div>
              <div><span>Giống</span><b>{h.breed || '—'}</b></div>
              <div><span>Giới tính</span><b>{SEX_LABEL[h.sex] ?? '—'}</b></div>
              <div><span>Ngày sinh</span><b>{fmtDate(h.dob)}</b></div>
              <div><span>Microchip</span><b>{h.microchip || '—'}</b></div>
            </div>
          </div>
          <div className="cus-card">
            <h3 className="cus-card__title">Hộ chiếu ngựa <TripStatusBadge label={PASSPORT_LABEL[ps]} tone={ps === 'VALID' ? 'ok' : ps === 'EXPIRING_SOON' ? 'warn' : 'bad'} /></h3>
            <div className="cus-kv">
              <div><span>Số hộ chiếu</span><b>{h.passport.number || '—'}</b></div>
              <div><span>Cơ quan cấp</span><b>{h.passport.authority || '—'}</b></div>
              <div><span>Ngày cấp</span><b>{fmtDate(h.passport.issueDate)}</b></div>
              <div><span>Ngày hết hạn</span><b>{fmtDate(h.passport.expiryDate)}</b></div>
            </div>
            {fileRow('Bản scan', h.passport.scan)}
          </div>
          <div className="cus-card">
            <h3 className="cus-card__title">Sở hữu & giá trị thương mại</h3>
            {fileRow('Chứng nhận sở hữu', h.ownership)}
            <div className="cus-kv" style={{ marginTop: 12 }}>
              <div><span>Giá trị khai báo</span><b>{h.value ? `${Number(h.value).toLocaleString('en-US')} ${h.currency}` : '—'}</b></div>
            </div>
            {fileRow('Bằng chứng định giá', h.valueProof)}
          </div>
          <div className="cus-card">
            <h3 className="cus-card__title">Tiêm ngừa & sức khỏe</h3>
            <div className="cus-kv">
              <div><span>Ghi chú sức khỏe</span><b>{h.conditions || 'Không khai báo'}</b></div>
            </div>
            {fileRow('Sổ tiêm ngừa', h.flu)}
          </div>
        </div>
      ) : (
        <div className="cus-card" style={{ padding: 0 }}>
          <div className="cus-table-wrap">
            <table className="cus-table">
              <thead><tr><th>Mã yêu cầu</th><th>Tuyến</th><th>Ngày vận chuyển</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => navigate(`/customer/requests/${r.id}`)}>
                    <td className="cus-id">{displayRequestId(r.id)}</td><td><RouteText r={r} /></td><td>{fmtDate(r.date)}</td><td><TripStatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {!history.length && <tr><td colSpan={4} className="cus-empty">Ngựa chưa tham gia chuyến vận chuyển nào.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <FilePreviewModal
        open={!!preview}
        file={preview?.file}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
    </CustomerLayout>
  );
};

export default HorseDetailPage;
