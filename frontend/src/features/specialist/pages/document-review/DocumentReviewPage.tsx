import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SpecialistLayout, Icon } from '../../components/SpecialistLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { Note, openSampleFile } from '../../components/Common/Common';
import { Modal } from '../../components/Modals';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useSpecialist } from '../../hooks/useSpecialist';
import { GROUP_VI, PROVIDER_VI, SCOPE_VI, docEffective, docType, fmtDate, fmtDateTime, horseName, latestVersion, opsBlock } from '../../hooks/specialistRules';
import './DocumentReviewPage.css';

/** Xét duyệt một chứng từ CBN: phiên bản hiện hành, thông tin, lịch sử phiên bản và quyết định */
export const DocumentReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { docId = '' } = useParams<{ docId: string }>();
  const { data, getDocument, getTrip, actions } = useSpecialist();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const d = getDocument(docId), t = d ? getTrip(d.tripId) : undefined;

  if (!d || !t) {
    return <SpecialistLayout title="Chuyến được giao"><Note tone="grey" title="Không tìm thấy chứng từ">Chứng từ {docId} không tồn tại.</Note></SpecialistLayout>;
  }
  const dt = docType(data, d.typeId), v = latestVersion(d), eff = docEffective(d, t);
  const why = opsBlock(t) || (t.status === 'COMPLETED' ? `${t.id} đã hoàn tất; chứng từ đã đóng.` : '')
    || (d.status !== 'SUBMITTED' ? `Phiên bản v${v?.v ?? '—'} đang ở trạng thái ${eff === 'APPROVED' ? 'đã duyệt' : eff === 'REJECTED' ? 'bị từ chối' : 'hết hạn'}; chỉ duyệt được phiên bản đang chờ duyệt.` : '');
  const horseOk = !d.horseId || t.horses.some((h) => h.id === d.horseId);

  const submit = () => {
    if (!decision) return;
    const r = actions.reviewDocument(d.id, v?.v ?? 0, decision, remark);
    if (r.ok) { setDecision(null); setRemark(''); } else setError(r.message);
  };

  return (
    <SpecialistLayout title="Chuyến được giao">
      <button type="button" className="spc-back" onClick={() => navigate(`/specialist/trips/${t.id}/required`)}><Icon name="back" />Quay lại chuyến {t.id}</button>
      <div className="spc-head">
        <div>
          <h2 className="spc-title spc-trip__title">{dt?.name ?? d.typeId} <TripStatusBadge kind="check" status={eff} /></h2>
          <p className="spc-subtitle">{d.id} • {d.horseId ? `${horseName(t, d.horseId)} • ` : ''}{t.id} • {t.requestId}{dt ? ` • ${GROUP_VI[dt.group]}` : ''}</p>
        </div>
        <div className="spc-btn-row" style={{ margin: 0 }}>
          <button type="button" className="spc-btn spc-btn--danger" disabled={!!why} onClick={() => { setDecision('REJECTED'); setError(''); }}>Từ chối</button>
          <button type="button" className="spc-btn spc-btn--solid" disabled={!!why} onClick={() => { setDecision('APPROVED'); setError(''); }}><Icon name="check" />Duyệt</button>
        </div>
      </div>
      {why && <Note tone="grey" title="Không thể xét duyệt">{why}</Note>}

      <div className="spc-docrev">
        <div className="spc-stack">
          <div className="spc-card">
            <h3 className="spc-card__title">Phiên bản {v ? `v${v.v} • ${v.file}` : '—'} {v && <button type="button" className="spc-btn spc-btn--sm" onClick={() => openSampleFile(v.file)}>Mở tệp</button>}</h3>
            <div className="spc-docrev__preview"><div><b>{dt?.name}</b>Bản xem trước mẫu • bản demo không có bản scan thật</div></div>
          </div>
          <div className="spc-card">
            <h3 className="spc-card__title">Thông tin chứng từ</h3>
            <div className="spc-kv">
              <div><span>Số giấy tờ</span><b>{d.number || '—'}</b></div>
              <div><span>Cơ quan cấp</span><b>{d.issuer || '—'}</b></div>
              <div><span>Ngày cấp</span><b>{fmtDate(d.issuedAt)}</b></div>
              <div><span>Ngày hết hạn</span><b>{fmtDate(d.expiry)}</b></div>
              <div><span>Bên chịu trách nhiệm</span><b>{dt ? PROVIDER_VI[dt.provider] : '—'}</b></div>
              <div><span>Phạm vi</span><b>{dt ? SCOPE_VI[dt.scope] : '—'}</b></div>
              <div><span>Hiệu lực cấu hình</span><b>{dt?.validityDays ? `${dt.validityDays} ngày` : 'Theo hạn trên giấy tờ'}</b></div>
              <div><span>Bản cứng gốc</span><b>{d.physicalCopy ? 'Đã nhận' : 'Chưa nhận'}</b></div>
            </div>
            {d.expiry && d.expiry < t.eta.slice(0, 10) && <Note tone="red" title="Hết hạn trước khi chuyến kết thúc">Cần bản thay thế còn hiệu lực trước khi khởi hành.</Note>}
            {d.status === 'REJECTED' && d.rejectReason && <Note tone="red" title="Lý do từ chối">{d.rejectReason}</Note>}
          </div>
          <div className="spc-card">
            <h3 className="spc-card__title">Chuyến & ngựa</h3>
            <div className="spc-kv">
              <div><span>Chuyến</span><b>{t.id}</b></div>
              <div><span>Trạng thái chuyến</span><b><TripStatusBadge kind="trip" status={t.status} /></b></div>
              <div><span>Khởi hành</span><b>{fmtDateTime(t.plannedDepart)}</b></div>
              <div><span>Dự kiến đến</span><b>{fmtDateTime(t.eta)}</b></div>
              <div><span>Ngựa</span><b>{d.horseId ? <>{horseName(t, d.horseId)} <TripStatusBadge label={horseOk ? 'Thuộc chuyến này' : 'Không thuộc chuyến'} tone={horseOk ? 'ok' : 'bad'} /></> : 'Toàn chuyến'}</b></div>
            </div>
          </div>
        </div>
        <div className="spc-stack">
          <div className="spc-card">
            <div className="spc-eyebrow">Các phiên bản</div>
            <ul className="spc-timeline" style={{ marginTop: 10 }}>
              {[...d.versions].reverse().map((x, i) => <li key={x.v} className={i ? '' : 'now'}><b>v{x.v} • {x.file}</b><span>{fmtDateTime(x.at)} • {x.by}</span></li>)}
            </ul>
          </div>
          <div className="spc-card">
            <div className="spc-eyebrow">Quyết định xét duyệt</div>
            {d.reviews.length ? (
              <ul className="spc-timeline" style={{ marginTop: 10 }}>
                {[...d.reviews].reverse().map((x, i) => <li key={i} className={x.decision === 'APPROVED' ? 'done' : ''}><b>v{x.v} • {x.decision === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}</b><span>{fmtDateTime(x.at)} • {x.by}{x.remark ? ` • ${x.remark}` : ''}</span></li>)}
              </ul>
            ) : <p className="spc-muted" style={{ marginTop: 8 }}>Chưa có quyết định.</p>}
          </div>
          <p className="spc-muted">Chứng từ CBN ghi nhận là bản ghi những gì cơ quan chức năng đã cấp; bản ghi tự nó không chứng minh lô hàng đã được chấp thuận.</p>
          <DemoPanel trip={t} />
        </div>
      </div>

      <Modal open={!!decision} title={decision === 'APPROVED' ? `Duyệt ${d.id} v${v?.v}` : `Từ chối ${d.id} v${v?.v}`} okText={decision === 'APPROVED' ? 'Duyệt' : 'Từ chối'}
        danger={decision === 'REJECTED'} onClose={() => setDecision(null)} onOk={submit} error={error}>
        <p>Quyết định áp dụng cho phiên bản v{v?.v} và được lưu vào lịch sử.</p>
        <div className="spc-field">
          <label htmlFor="rv-remark">{decision === 'REJECTED' ? 'Lý do từ chối *' : 'Ghi chú (không bắt buộc)'}</label>
          <textarea id="rv-remark" className="spc-textarea" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </div>
      </Modal>
    </SpecialistLayout>
  );
};

export default DocumentReviewPage;
