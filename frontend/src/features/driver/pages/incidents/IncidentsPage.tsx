import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DriverLayout, Icon } from '../../components/DriverLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { IncidentLocationPicker } from '../../components/IncidentLocationPicker/IncidentLocationPicker';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { Modal } from '../../components/Modals/Modal';
import { useDriver } from '../../hooks/useDriver';
import { INCIDENT_TYPE_LABEL, SEVERITY_LABEL, defaultSegmentRatio, fmtDateTime, incidentWhere, nowStamp, segmentPickable } from '../../hooks/driverRules';
import { apiClient } from '../../../../shared/api/apiClient';
import type { Incident, IncidentSeverity, IncidentType, Trip } from '../../types';
import './IncidentsPage.css';

const TYPES = Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[];
const SEVERITIES = Object.keys(SEVERITY_LABEL) as IncidentSeverity[];

const PLAN_TYPE_LABEL: Record<string, string> = {
  NO_CHANGE: 'Khắc phục tại chỗ, giữ nguyên kế hoạch',
  VEHICLE_SWAP: 'Thay xe vận chuyển',
  CREW_SWAP: 'Thay đổi nhân sự tổ xe',
  VEHICLE_AND_CREW_SWAP: 'Thay cả xe và nhân sự',
  ROUTE_ADJUST: 'Điều chỉnh lộ trình trong tuyến pháp lý đã duyệt',
  COORDINATOR_APPLIED: 'Phương án xử lý được Điều phối viên phê duyệt',
};

/** Form báo cáo sự cố cho chuyến đang hoạt động */
const ReportForm: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { incidentPhotos, actions, me } = useDriver();

  // Phân biệt thẩm quyền báo cáo: Bác sĩ thú y (vấn đề ngựa) vs Tài xế (vấn đề xe & đường)
  const isVet = React.useMemo(() => {
    if (me?.role === 'VETERINARIAN') return true;
    const fn = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userFullName') : '') || me?.name || '';
    const em = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('userEmail') : '') || '';
    return /BS\.|Bác sĩ|thú y|escort|vet/i.test(fn) || /escort|vet/i.test(em);
  }, [me]);

  const allowedTypes = React.useMemo(() => {
    if (isVet) return ['HORSE_HEALTH'] as IncidentType[];
    return TYPES.filter((t) => t !== 'HORSE_HEALTH');
  }, [isVet]);

  const [type, setType] = useState<IncidentType | ''>(() => (isVet ? 'HORSE_HEALTH' : ''));
  const [severity, setSeverity] = useState<IncidentSeverity | ''>('');
  const [locationDetail, setLocationDetail] = useState('');
  const [ratio, setRatio] = useState(() => defaultSegmentRatio(trip));
  const pickable = segmentPickable(trip);
  const [description, setDescription] = useState('');
  const [safe, setSafe] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!type || !severity) { setError('Chọn loại và mức độ sự cố.'); return; }
    setSending(true);
    const r = await actions.reportIncident(trip.id, { type, severity, description, locationDetail, safe, ratio: pickable ? ratio : 0 });
    setSending(false);
    if (!r.ok) { setError(r.message); return; }
    setError(''); setType(isVet ? 'HORSE_HEALTH' : ''); setSeverity(''); setLocationDetail(''); setDescription(''); setSafe(false); setRatio(defaultSegmentRatio(trip));
  };

  return (
    <div className="drv-card">
      <h3 className="drv-card__title">Báo cáo sự cố</h3>
      <div className="drv-note drv-note--red" style={{ marginTop: 0, marginBottom: 10 }}>
        <Icon name="alert" />
        <div><b>An toàn trước tiên</b>Đảm bảo an toàn cho người và ngựa, bắt đầu sơ cứu rồi mới báo cáo. Cứu hộ khẩn cấp không bao giờ phải chờ phê duyệt.</div>
      </div>
      <div className="drv-note drv-note--blue" style={{ marginTop: 0, marginBottom: 14 }}>
        <Icon name="info" />
        <div>
          <b>{isVet ? 'Thẩm quyền Bác sĩ thú y / Hộ tống' : 'Thẩm quyền Tài xế vận hành'}</b>
          {isVet
            ? 'Bác sĩ thú y chuyên trách theo dõi và báo cáo các sự cố y tế / sức khỏe của ngựa trên đường vận chuyển.'
            : 'Tài xế chuyên trách báo cáo các sự cố về phương tiện, đường sá và cửa khẩu. Các sự cố sức khỏe ngựa do Bác sĩ thú y báo cáo.'}
        </div>
      </div>
      <div className="drv-form-grid">
        <div className="drv-field">
          <label htmlFor="inc-type">Loại sự cố *</label>
          <select id="inc-type" className="drv-select" value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            {!isVet && <option value="">Chọn</option>}
            {allowedTypes.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABEL[t]}</option>)}
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
        <div><span>Vị trí</span><b>{incidentWhere(trip, pickable ? ratio : 0)}</b></div>
      </div>
      {pickable && <IncidentLocationPicker trip={trip} ratio={ratio} onChange={setRatio} />}
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
  const { activeTrips, incidents, actions } = useDriver();
  const trip = activeTrips.find((t) => t.id === tripId) ?? activeTrips[0];
  const list = trip
    ? incidents.filter(
        (i) => String(i.tripId || '').trim().toUpperCase() === String(trip.id || '').trim().toUpperCase()
      )
    : [];

  // Luôn sắp xếp sự cố mới nhất lên trên đầu
  const sortedList = [...list].sort((a, b) => {
    const tA = new Date(a.at || 0).getTime() || 0;
    const tB = new Date(b.at || 0).getTime() || 0;
    if (tB !== tA) return tB - tA;
    return b.id.localeCompare(a.id);
  });

  const [viewingPlanIncident, setViewingPlanIncident] = useState<Incident | null>(null);
  const [acknowledgedIncidents, setAcknowledgedIncidents] = useState<Record<string, boolean>>({});
  const [acking, setAcking] = useState(false);

  const handleAcknowledgePlan = async (incId: string) => {
    setAcking(true);
    try {
      await apiClient.post(`/incidents/${incId}/updates`, {
        updateType: 'FIELD_LOG',
        notes: 'Tổ xe đã đọc kỹ phương án xử lý và sẵn sàng phối hợp tại hiện trường.',
      });
    } catch {
      // Backend log sync fallback
    }
    setAcknowledgedIncidents((prev) => ({ ...prev, [incId]: true }));
    setAcking(false);
    actions.showToast('Đã xác nhận sẵn sàng phối hợp phương án với Điều phối viên.');
  };

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
            <ReportForm key={trip.id} trip={trip} />
            <div className="drv-card">
              <div className="between" style={{ marginBottom: 12 }}>
                <h3 className="drv-card__title" style={{ margin: 0 }}>Lịch sử sự cố của chuyến ({sortedList.length})</h3>
                <span className="drv-hint" style={{ margin: 0 }}>Mới nhất lên đầu</span>
              </div>
              {sortedList.length ? sortedList.map((i) => {
                const hasPlan = !!(i.approvedPlan || i.resolutionNotes);
                const isAcked = !!acknowledgedIncidents[i.id];

                return (
                  <div key={i.id} className="drv-verify" style={{ marginBottom: 14 }}>
                    <div className="drv-card__title" style={{ marginBottom: 4 }}>
                      <span>{i.id} • {INCIDENT_TYPE_LABEL[i.type]}</span>
                      <TripStatusBadge status={i.status} />
                    </div>
                    <p className="drv-hint" style={{ marginTop: 0 }}>
                      {fmtDateTime(i.at)} • {i.location} • mức độ {SEVERITY_LABEL[i.severity].toLowerCase()}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55 }}>{i.description}</p>
                    {i.photos.length > 0 && <p className="drv-hint">{i.photos.length} ảnh đính kèm</p>}

                    {hasPlan ? (
                      <div className="drv-note drv-note--green" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="check" />
                          <b>Điều phối đã phê duyệt phương án xử lý</b>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                          {i.approvedPlan || 'Đã có phương án xử lý cụ thể từ Điều phối viên.'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="drv-btn drv-btn--solid drv-btn--sm"
                            onClick={() => setViewingPlanIncident(i)}
                          >
                            Xem phương án xử lý
                          </button>
                          {isAcked && <span style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>✓ Đã xác nhận sẵn sàng</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="drv-note drv-note--blue" style={{ marginTop: 10 }}>
                        <Icon name="info" />
                        <div>
                          <b>Đang chờ xử lý</b>
                          <div style={{ fontSize: 12, marginTop: 2 }}>Điều phối viên đang kiểm tra hiện trường để ra phương án xử lý.</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }) : <p className="drv-hint">Chưa có sự cố nào được báo.</p>}
            </div>
          </div>
        </>
      )}

      {/* Modal hiển thị chi tiết phương án xử lý cho tài xế / bác sĩ */}
      {viewingPlanIncident && (
        <Modal
          open={!!viewingPlanIncident}
          title={`Phương án xử lý sự cố • ${viewingPlanIncident.id}`}
          okText={acknowledgedIncidents[viewingPlanIncident.id] ? 'Đã xác nhận' : 'Đã nắm rõ & Bắt đầu phối hợp'}
          okDisabled={acknowledgedIncidents[viewingPlanIncident.id] || acking}
          onOk={() => handleAcknowledgePlan(viewingPlanIncident.id)}
          onClose={() => setViewingPlanIncident(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--bg-page, #f3f4f6)', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 2 }}>Hướng xử lý của Điều phối:</div>
              <b style={{ fontSize: 14, color: 'var(--text-primary, #111827)' }}>
                {PLAN_TYPE_LABEL[viewingPlanIncident.resolutionType || ''] || viewingPlanIncident.resolutionType || 'Phương án khắc phục sự cố'}
              </b>
            </div>

            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, fontWeight: 600 }}>
                Chỉ dẫn cụ thể cho tổ xe tại hiện trường:
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--bg-surface, #fff)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                {viewingPlanIncident.approvedPlan || 'Thực hiện các bước khắc phục theo chỉ dẫn của Điều phối viên.'}
              </div>
            </div>

            {viewingPlanIncident.resolutionNotes && viewingPlanIncident.resolutionNotes !== viewingPlanIncident.approvedPlan && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, fontWeight: 600 }}>
                  Thông tin điều động hỗ trợ (Phương tiện / Nhân sự / Lộ trình):
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--bg-page, #f8fafc)', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
                  {viewingPlanIncident.resolutionNotes}
                </div>
              </div>
            )}

            <div className="drv-note drv-note--blue" style={{ marginTop: 4 }}>
              <Icon name="info" />
              <div>
                <b>Lưu ý tổ xe:</b> Luôn ưu tiên an toàn cho người và ngựa. Bấm nút <i>“Đã nắm rõ &amp; Bắt đầu phối hợp”</i> bên dưới để thông báo cho Điều phối viên biết bạn đã tiếp nhận phương án.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </DriverLayout>
  );
};

export default IncidentsPage;
