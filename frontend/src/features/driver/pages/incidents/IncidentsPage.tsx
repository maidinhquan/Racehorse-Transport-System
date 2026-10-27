import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { useDriver } from '../../hooks/useDriver';
import { INCIDENT_TYPE_LABEL, SEVERITY_LABEL, fmtDateTime, nowStamp, whereNow } from '../../hooks/driverRules';
import type { IncidentSeverity, IncidentType, Trip } from '../../types';
import './IncidentsPage.css';

const TYPES = Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[];
const SEVERITIES = Object.keys(SEVERITY_LABEL) as IncidentSeverity[];

/** Form báo cáo sự cố cho chuyến đang hoạt động */
const ReportForm: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { incidentPhotos, actions } = useDriver();
  const [type, setType] = useState<IncidentType | ''>('');
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [locationDetail, setLocationDetail] = useState('');
  const [description, setDescription] = useState('');
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!type || !severity) { setError('Chọn loại và mức độ sự cố.'); return; }
    setSending(true);
    const r = await actions.reportIncident(trip.id, { type, severity, description, locationDetail, safe });
    setSending(false);
    if (!r.ok) { setError(r.message); return; }
    setError(''); setType(''); setSeverity(''); setLocationDetail(''); setDescription(''); setSafe(false);
  };

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Báo cáo sự cố</h3>
      <div className="drv-note drv-note--red" style={{ marginTop: 0, marginBottom: 14 }}>
        <Icon name="alert" />
        <div><b>An toàn trước tiên</b>Đảm bảo an toàn cho người và ngựa, bắt đầu sơ cứu rồi mới báo cáo. Cứu hộ khẩn cấp không bao giờ phải chờ phê duyệt.</div>
      </div>
      <div className="drv-form-grid">
        <div className="drv-field">
          <label htmlFor="inc-type">Loại sự cố *</label>
          <select id="inc-type" className="drv-select" value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            <option value="">Chọn</option>
            {TYPES.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="drv-field">
          <label htmlFor="inc-sev">Mức độ *</label>
          <select id="inc-sev" className="drv-select" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>
            <option value="">Chọn</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="drv-inc-where">
        <div><span>Thời điểm</span><b>{fmtDateTime(nowStamp())}</b></div>
        <div><span>Vị trí</span><b>{whereNow(trip)}</b></div>
        <small>Tự lấy theo thời điểm báo cáo và mốc gần nhất: đang ở trạm thì ghi trạm, đang chạy thì ghi đoạn tuyến.</small>
      </div>
      <div className="drv-field">
        <label htmlFor="inc-loc">Chi tiết vị trí (không bắt buộc)</label>
        <input id="inc-loc" className="drv-input" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="VD: km 42, gần cây xăng Petrolimex" />
      </div>
      <div className="drv-field">
        <label htmlFor="inc-desc">Chuyện gì đã xảy ra *</label>
        <textarea id="inc-desc" className="drv-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả tình huống, tình trạng ngựa và những gì bạn đã làm" />
      </div>
      <div className="drv-field">
        <label>Ảnh</label>
        <PhotoPicker photos={incidentPhotos} onAdd={actions.addIncidentPhoto} onRemove={actions.removeIncidentPhoto} />
      </div>
      <label className="drv-check">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
        Người và ngựa đã an toàn hoặc đã bắt đầu sơ cứu
      </label>
      {error && <p className="drv-error" role="alert">{error}</p>}
      <button type="button" className="drv-btn drv-btn--danger-solid drv-btn--lg drv-btn--block" style={{ marginTop: 10 }} disabled={sending} onClick={send}>
        {sending ? 'Đang gửi…' : 'Gửi báo cáo'}
      </button>
    </div>
  );
};

export const IncidentsPage: React.FC = () => {
  const { tripId } = useParams<{ tripId?: string }>();
  const navigate = useNavigate();
  const { activeTrips, incidents } = useDriver();
  const trip = activeTrips.find((t) => t.id === tripId) ?? activeTrips[0];
  const list = trip ? incidents.filter((i) => i.tripId === trip.id) : [];

  return (
    <DriverLayout title="Báo cáo sự cố">
      {!trip ? (
        <div className="drv-card drv-empty"><b>Không có chuyến đang hoạt động</b>Chỉ báo cáo sự cố cho chuyến đang được giao.</div>
      ) : (
        <>
          <div className="drv-head">
            <div>
              <h2 className="drv-title">Báo cáo &amp; theo dõi sự cố • {trip.id}</h2>
              <p className="drv-subtitle">{trip.origin} → {trip.destination}. Manager, Coordinator và khách hàng nhận thông báo ngay khi bạn gửi.</p>
            </div>
            {activeTrips.length > 1 && (
              <select className="drv-select" style={{ width: 'auto' }} value={trip.id} onChange={(e) => navigate(`/driver/incidents/${e.target.value}`)} aria-label="Chọn chuyến">
                {activeTrips.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            )}
          </div>
          <div className="drv-grid2">
            <ReportForm trip={trip} />
            <div className="drv-card">
              <h3 className="drv-card__title">Sự cố của chuyến này</h3>
              {list.length ? list.map((i) => (
                <div key={i.id} className="drv-verify">
                  <div className="drv-card__title" style={{ marginBottom: 4 }}><span>{i.id} • {INCIDENT_TYPE_LABEL[i.type]}</span><TripStatusBadge status={i.status} /></div>
                  <p className="drv-hint" style={{ marginTop: 0 }}>{fmtDateTime(i.at)} • {i.location} • mức độ {SEVERITY_LABEL[i.severity].toLowerCase()}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55 }}>{i.description}</p>
                  {i.photos.length > 0 && <p className="drv-hint">{i.photos.length} ảnh đính kèm</p>}
                  {i.approvedPlan && <div className="drv-note drv-note--green"><Icon name="check" /><div><b>Phương án đã duyệt</b>{i.approvedPlan}</div></div>}
                </div>
              )) : <p className="drv-hint">Chưa có sự cố nào được báo.</p>}
            </div>
          </div>
        </>
      )}
    </DriverLayout>
  );
};

export default IncidentsPage;
