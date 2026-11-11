// Sự cố & khiếu nại: danh sách sự cố trong chuyến (Flow 5) và khiếu nại liên quan (chỉ xem)
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Cell, Icon, Pill, PillT, RouteText } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { emp, horse, legOf, reqOfTrip, trip, vehicle } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { cleanId, db, go, syncCoordinatorIncidents, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt, human, incTypeVi, usd } from '../../utils/format';
import { PickupAccessCard } from '../../components/relocation/PickupAccessCard';
import { PickupAccessResolutionModal } from '../../components/relocation/PickupAccessResolutionModal';
import {
  F5_DONE,
  F5_PLAN,
  F5_SCENARIOS,
  F5_TYPES,
  PAYER_VI,
  ROLE_VI,
  byVi,
  curPlan,
  f5Ack,
  f5ApproveVetTransfer,
  f5Close,
  f5Conditions,
  f5Continue,
  f5Escalate,
  f5Next,
  f5Pill,
  f5Plan,
  f5Status,
  f5Submit,
} from '../../workflows/incidentOperations';

const PLAN_ST: Record<string, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt & áp dụng',
  NOT_REQUIRED: 'Đã áp dụng',
};
const VET_VI: Record<string, string> = {
  FIT: 'Đủ sức khỏe tiếp tục',
  FIT_WITH_CONDITIONS: 'Tiếp tục có điều kiện',
  NOT_FIT: 'Chưa đủ sức khỏe tiếp tục',
};
const UPD_VI: Record<string, string> = {
  SAFETY: 'An toàn',
  CARE: 'Chăm sóc ngựa',
  PROGRESS: 'Diễn biến',
};

const HEALTH_ISSUE_MAP: Record<string, string> = {
  HORSE_FEVER: 'Ngựa sốt (thân nhiệt cao)',
  HORSE_COLIC: 'Ngựa đau (đau bụng / co thắt)',
  HORSE_SHOCK: 'Ngựa sốc (sốc nhiệt / hạ huyết áp)',
};

function NextBox({ i }: { i: Any }) {
  const [k, title, body] = f5Next(i);
  if (!title) return null;
  return (
    <div className={`f5-next ${k}`}>
      <div className="f5-next-ic">
        <Icon name={k === 'me' ? 'alert' : k === 'done' ? 'check' : k === 'bad' ? 'alert' : 'clock'} />
      </div>
      <div>
        <span>{k === 'me' ? 'Việc bạn cần làm' : k === 'done' ? 'Hoàn tất' : k === 'bad' ? 'Dừng' : 'Đang chờ'}</span>
        <b>{title}</b>
        {body ? <p>{body}</p> : null}
      </div>
    </div>
  );
}

/** Thẻ chuyên biệt cho Sự cố sức khỏe ngựa do Bác sĩ thú y báo cáo */
function HorseHealthCard({ i, liveResolved, liveReferral }: { i: Any; liveResolved?: boolean; liveReferral?: boolean }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const t = trip(i.tripId);
  const repUser = emp(i.by);
  const repName = i.reporterName || (repUser ? repUser.name : i.by) || 'Bác sĩ thú y';
  const phone = i.reporterPhone || (repUser ? repUser.phone : (t?.crew?.VETERINARIAN ? emp(t.crew.VETERINARIAN)?.phone : ''));

  const horseId = i.horseId || (t?.horses && t.horses[0]) || '';
  const horseObj = horseId ? horse(horseId) : null;
  const horseNameDisplay = i.horseName || (horseObj ? horseObj.name : horseId) || 'Ngựa trên chuyến';

  const conds = f5Conditions(i);

  // Đọc cờ kết quả cấp cứu từ Bác sĩ
  let isResolved = Boolean(liveResolved || i.vetStatus === 'STABILIZED');
  let resolvedNote = i.vetResolutionNote || '';
  let isReferral = Boolean(liveReferral || i.vetStatus === 'REFERRAL_REQUESTED');
  let referralStation = i.targetVetStation || '';
  let referralReason = '';

  if (typeof window !== 'undefined') {
    try {
      const cleanIncId = cleanId(i.id);
      const rawRes = localStorage.getItem(`rts_vet_resolved_${cleanIncId}`) || localStorage.getItem(`rts_vet_resolved_${i.id}`);
      if (rawRes) {
        const parsed = JSON.parse(rawRes);
        isResolved = true;
        if (parsed.note) resolvedNote = parsed.note;
      }
      const rawRef = localStorage.getItem(`rts_vet_referral_${cleanIncId}`) || localStorage.getItem(`rts_vet_referral_${i.id}`);
      if (rawRef) {
        const parsedRef = JSON.parse(rawRef);
        isReferral = true;
        if (parsedRef.station) referralStation = `${parsedRef.station}${parsedRef.address ? ` (${parsedRef.address})` : ''}${parsedRef.phone ? ` • SĐT: ${parsedRef.phone}` : ''}`;
        if (parsedRef.reason) referralReason = parsedRef.reason;
      }
    } catch {
      // ignore
    }
  }

  const isTransferApproved = Boolean(i.resolutionType === 'VET_TRANSFER');

  return (
    <div className="card pad">
      <div className="between">
        <h3 className="card-title" style={{ margin: 0 }}>Hồ sơ sự cố sức khỏe ngựa &amp; Báo cáo y tế</h3>
        <span
          className="badge"
          style={{
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 6,
            background: '#ecfdf5',
            color: '#065f46',
            fontWeight: 700,
            border: '1px solid #a7f3d0',
          }}
        >
          Bác sĩ thú y chuyên trách
        </span>
      </div>

      {/* Thông tin con ngựa bị sự cố */}
      <div
        style={{
          marginTop: 14,
          padding: 14,
          background: 'var(--bg-page, #f8fafc)',
          borderRadius: 8,
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Con ngựa gặp sự cố
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginTop: 2 }}>
              {horseNameDisplay} {horseId ? <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>({horseId})</span> : null}
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: 13,
              border: '1px solid #fecaca',
            }}
          >
            {HEALTH_ISSUE_MAP[i.healthIssueType] || 'Sự cố y tế của ngựa'}
          </span>
        </div>

        {horseObj && (
          <div className="kv2" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-color, #e2e8f0)' }}>
            <Cell label="Giống ngựa">{horseObj.breed || 'Thoroughbred'}</Cell>
            <Cell label="Đặc điểm">{horseObj.color ? `${horseObj.color} • ${horseObj.sex || 'Ngựa đua'}` : '—'}</Cell>
            <Cell label="Độ tuổi">{horseObj.age ? `${horseObj.age} tuổi` : '—'}</Cell>
            <Cell label="Mã vi mạch (Microchip)">
              <code>{horseObj.microchip || 'Chưa gắn chip'}</code>
            </Cell>
          </div>
        )}
      </div>

      {/* Báo cáo chi tiết của Bác sĩ thú y */}
      <div className="kv2" style={{ marginTop: 14 }}>
        <Cell label="Bác sĩ thú y báo cáo">
          <b>{repName}</b>
          <div className="muted" style={{ fontSize: 12 }}>Bác sĩ phụ trách đoàn vận chuyển</div>
        </Cell>
        <Cell label="Liên hệ khẩn cấp Bác sĩ">
          {phone ? (
            <a href={`tel:${phone}`} style={{ color: 'var(--accent-primary, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              SĐT: {phone}
            </a>
          ) : (
            <span className="muted">Chưa có SĐT</span>
          )}
        </Cell>
        <Cell label="Thời điểm báo cáo">{dt(i.at)}</Cell>
        <Cell label="Mức độ nguy cấp">
          <Pill v={i.severity} />
        </Cell>
        <Cell label="Vị trí hiện trường">{i.location || 'Trên đường vận chuyển'}</Cell>
        <Cell label="Tọa độ GPS">
          {i.locationCoordinates ? (
            <code style={{ fontSize: 12, background: 'var(--bg-page, #f3f4f6)', padding: '2px 6px', borderRadius: 4 }}>
              {i.locationCoordinates}
            </code>
          ) : (
            'Chưa có tọa độ'
          )}
        </Cell>
      </div>

      {/* Sơ cứu khẩn cấp tại chỗ */}
      <div className="note green" style={{ marginTop: 14 }}>
        <Icon name="check" />
        <div>
          <b>Biện pháp sơ cứu khẩn cấp đã tiến hành tại chỗ</b>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.55 }}>
            {i.immediateCare || 'Bác sĩ thú y đã tiến hành các biện pháp sơ cứu và hạ nhiệt ban đầu.'}
          </p>
        </div>
      </div>

      {/* Triệu chứng lâm sàng do Bác sĩ ghi nhận */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: 'var(--bg-page, #f9fafb)',
          borderRadius: 8,
          border: '1px solid var(--border-color, #e5e7eb)',
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--text-secondary, #4b5563)' }}>
          Triệu chứng lâm sàng quan sát được:
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary, #111827)', whiteSpace: 'pre-wrap' }}>
          {i.description || 'Chưa có mô tả triệu chứng.'}
        </p>
      </div>

      {/* Ảnh chụp hiện trường */}
      {(i.photos || []).length ? (
        <div style={{ marginTop: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Ảnh / Bằng chứng sức khỏe ngựa ({i.photos.length}) – Bấm để phóng to
          </div>
          <div className="photo-strip">
            {i.photos.map((p: string, idx: number) => {
              const isImg = p.startsWith('data:image') || p.startsWith('http') || p.startsWith('blob:') || /\.(jpe?g|png|webp|gif)$/i.test(p);
              return (
                <button
                  type="button"
                  key={idx}
                  className="ph"
                  title="Nhấn để phóng to ảnh xem chi tiết"
                  onClick={() => setSelectedPhoto(p)}
                >
                  {isImg ? <img src={p} alt={`Ảnh ngựa ${idx + 1}`} /> : <span>{p}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Trạng thái cấp cứu hiện trường thời gian thực */}
      <div style={{ marginTop: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Trạng thái cấp cứu hiện trường
        </div>

        {isResolved ? (
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: '#ecfdf5',
              border: '1px solid #6ee7b7',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#059669', fontWeight: 'bold', fontSize: 16 }}>✓</span>
              <b style={{ color: '#065f46', fontSize: 14 }}>
                Bác sĩ thú y xác nhận: Sự cố đã được xử lý ổn định
              </b>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#047857' }}>
              Ngựa đã hạ sốt/hết đau bụng, nhịp tim và thở bình thường. Đủ điều kiện tiếp tục hành trình.
            </p>
            {resolvedNote && (
              <div style={{ fontSize: 13, color: '#065f46', marginTop: 4, background: '#ffffff', padding: 8, borderRadius: 6, border: '1px solid #d1fae5' }}>
                <b>Ghi chú lâm sàng:</b> {resolvedNote}
              </div>
            )}
          </div>
        ) : isReferral ? (
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: isTransferApproved ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${isTransferApproved ? '#93c5fd' : '#fca5a5'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert" />
              <b style={{ color: isTransferApproved ? '#1e40af' : '#991b1b', fontSize: 14 }}>
                {isTransferApproved
                  ? 'Đã duyệt chuyển viện khẩn cấp đến cơ sở thú y'
                  : 'Cảnh báo: Bác sĩ thú y báo cáo KHÔNG THỂ XỬ LÝ TẠI CHỖ'}
              </b>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: isTransferApproved ? '#1e3a8a' : '#7f1d1d' }}>
              {isTransferApproved
                ? 'Phương án chuyển viện đã được kích hoạt. Xe đang di chuyển đưa ngựa đến cơ sở y tế đã duyệt.'
                : 'Ngựa cần đưa đến cơ sở y tế chuyên khoa gần nhất để cấp cứu chuyên sâu.'}
            </p>
            <div style={{ fontSize: 13, background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div><b>Cơ sở y tế đề xuất:</b> {referralStation || 'Trạm thú y cấp cứu'}</div>
              {referralReason && <div style={{ marginTop: 4 }}><b>Đánh giá lâm sàng:</b> {referralReason}</div>}
            </div>

            {!isTransferApproved && (
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  className="btn solid"
                  style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff', fontWeight: 600 }}
                  onClick={() => f5ApproveVetTransfer(i.id)}
                >
                  Duyệt chuyển trạm y tế
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="clock" />
            <div>
              <b style={{ color: '#92400e', fontSize: 13 }}>Đang cấp cứu &amp; theo dõi tại hiện trường</b>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>
                Bác sĩ thú y đang sơ cứu tại chỗ. Đang chờ kết luận cấp cứu (Xử lý ổn định hoặc Đề xuất chuyển viện).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Điều kiện tiếp tục chặng */}
      {!['CONTINUE_ALLOWED', 'RESULT_REPORTED', 'CLOSED', 'HALTED'].includes(i.status) ? (
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow">Điều kiện tiếp tục chặng</div>
          <ul className="check-list f5-conds" style={{ marginTop: 8 }}>
            {conds.map((c, k) => (
              <li key={k} className={c.ok ? 'ok' : ''}>
                <Icon name={c.ok ? 'check' : 'clock'} />
                <span>
                  {c.label} <small>• {byVi(c.by)}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Modal phóng to ảnh */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: 'var(--bg-surface, #fff)',
              padding: 16,
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'var(--bg-page, #f3f4f6)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, textAlign: 'left', color: 'var(--text-primary, #111827)' }}>
              Ảnh hiện trạng sức khỏe ngựa
            </h4>
            {selectedPhoto.startsWith('data:image') || selectedPhoto.startsWith('http') || selectedPhoto.startsWith('blob:') ? (
              <img
                src={selectedPhoto}
                alt="Hiện trạng ngựa"
                style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6, display: 'block' }}
              />
            ) : (
              <div style={{ padding: '30px 40px', minWidth: 280 }}>
                <p style={{ margin: 0 }}>Tệp đính kèm: <b>{selectedPhoto}</b></p>
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Tệp mẫu không có hình ảnh nhị phân đi kèm.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({ i }: { i: Any }) {
  const t = trip(i.tripId), p = curPlan(i);
  if (!p) return <div className="card pad"><h3 className="card-title">Phương án xử lý</h3><p className="subtitle">Chưa có phương án.</p></div>;
  const conds = f5Conditions(i);
  const scenarioObj = p.scenario ? F5_SCENARIOS[p.scenario] : null;
  const scenarioTitle = scenarioObj?.title || p.scenarioTitle;
  const scenarioDesc = scenarioObj?.desc || p.scenarioDesc;

  return (
    <div className="card pad">
      <div className="between">
        <h3 className="card-title">Phương án v{p.v} {p.status === 'DRAFT' ? '(nháp)' : ''}</h3>
        <Pill v={p.status === 'NOT_REQUIRED' ? 'APPLIED' : p.status} label={PLAN_ST[p.status]} />
      </div>

      {scenarioTitle && (
        <div style={{ margin: '12px 0 10px', padding: '12px 14px', background: 'var(--bg-page, #f8fafc)', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary, #1e40af)', fontSize: 13.5 }}>
              {scenarioTitle}
            </span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>
              {F5_PLAN[p.kind] || p.kind}
            </span>
          </div>
          {scenarioDesc && (
            <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-secondary, #475569)' }}>
              {scenarioDesc}
            </p>
          )}
        </div>
      )}

      <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>{p.desc}</p>
      {p.reason ? <p className="hint">Lý do: {p.reason}</p> : null}

      <div className="eyebrow" style={{ marginTop: 14 }}>Phân công nhiệm vụ &amp; Điều phối tài nguyên</div>
      <div className="kv2" style={{ marginTop: 8 }}>
        <Cell label="Nhóm phương án">{F5_PLAN[p.kind] || p.kind}</Cell>
        <Cell label="Thời gian giao">{p.etaTo && p.etaTo !== p.etaBase ? <>{dt(p.etaBase)} → <b>{dt(p.etaTo)}</b></> : 'Giữ nguyên ' + dt(p.etaBase)}</Cell>

        {p.vehicleId ? (
          <Cell label="Phương tiện thay thế">
            <b>{vehicle(p.vehicleId) ? vehicle(p.vehicleId).plate + ' • ' + vehicle(p.vehicleId).model : p.vehicleId}</b>
            {p.reliefDriverId && (
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Tài xế trung chuyển: <b>{emp(p.reliefDriverId)?.name || p.reliefDriverId}</b> (hỗ trợ sang ngựa &amp; ở lại hiện trường)
              </div>
            )}
          </Cell>
        ) : null}

        {p.newCrew && Object.keys(p.newCrew).length ? (
          <Cell label="Nhân sự thay thế">
            {Object.entries(p.newCrew).map(([r, cid]) => `${human(r)}: ${emp(cid as string)?.name || cid}`).join('; ')}
          </Cell>
        ) : p.crewId ? (
          <Cell label="Nhân sự thay thế">
            {human(p.crewRole || 'MAIN_DRIVER')}: <b>{emp(p.crewId)?.name || p.crewId}</b>
            {p.crewSwapMode === '2.1_QUICK_SWAP' && <div className="muted" style={{ fontSize: 12 }}>Phụ lái đủ điều kiện đổi lên lái chính</div>}
            {p.companyCarPlate && <div className="muted" style={{ fontSize: 12 }}>Xe con công ty hỗ trợ: {p.companyCarPlate}</div>}
            {p.taxiVendor && <div className="muted" style={{ fontSize: 12 }}>Đối tác di chuyển: {p.taxiVendor} ({usd(p.taxiCost || 0)})</div>}
          </Cell>
        ) : null}

        {(p.towingPartner || p.ambulancePartner || p.specialistId) ? (
          <Cell label="Đơn vị hỗ trợ cứu hộ">
            {p.towingPartner && (
              <div>Xe kéo: <b>{p.towingPartner}</b> {p.towingPhone ? `(SĐT: ${p.towingPhone})` : ''} • {p.towingCost ? usd(p.towingCost) : 'Nội bộ'}</div>
            )}
            {p.ambulancePartner && (
              <div>Cứu thương 115: <b>{p.ambulancePartner}</b> {p.ambulancePhone ? `(SĐT: ${p.ambulancePhone})` : ''}</div>
            )}
            {p.specialistId && (
              <div>Chuyên viên hiện trường: <b>{emp(p.specialistId)?.name || p.specialistId}</b></div>
            )}
          </Cell>
        ) : null}

        {p.splitHorseId ? (
          <Cell label="Tách đàn &amp; Chuyển viện">
            <div>Ngựa tách chuyến: <b>{horse(p.splitHorseId)?.name || p.splitHorseId}</b></div>
            {p.horseAmbulancePartner && <div className="muted" style={{ fontSize: 12 }}>Đơn vị cấp cứu dã chiến: {p.horseAmbulancePartner}</div>}
            {p.targetVetHospital && <div className="muted" style={{ fontSize: 12 }}>Bệnh viện thú y tiếp nhận: {p.targetVetHospital}</div>}
            {p.vetEscortName && <div className="muted" style={{ fontSize: 12 }}>Nhân sự áp tải hộ tống: {p.vetEscortName}</div>}
            <div className="muted" style={{ fontSize: 11.5, color: 'var(--accent-primary, #1d4ed8)', marginTop: 2 }}>
              Vận đơn và giấy kiểm dịch cá thể này được tách riêng.
            </div>
          </Cell>
        ) : null}
      </div>

      <div className="eyebrow" style={{ marginTop: 14 }}>Hạch toán chi phí sự cố nội bộ</div>
      <div style={{ marginTop: 6, padding: '10px 14px', background: 'var(--bg-surface-alt, #f1f5f9)', borderRadius: 6, border: '1px solid var(--border-color, #cbd5e1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary, #475569)' }}>Chi phí cứu hộ &amp; điều chuyển phát sinh:</span>
          <b style={{ fontSize: 14 }}>{Number(p.cost) ? usd(p.cost) : '0 VNĐ'}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary, #475569)' }}>Đối tượng chịu phí:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#047857' }}>
            {PAYER_VI[p.payer] || 'CBN Transport (Nội bộ) & Bảo hiểm'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed var(--border-color, #cbd5e1)' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Khách hàng thanh toán:</span>
          <b style={{ fontSize: 15, color: '#047857' }}>0 VNĐ</b>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        Điều phối viên toàn quyền quyết định và áp dụng phương án cho chuyến đi. Mọi chi phí phát sinh do sự cố kỹ thuật/nhân sự được hạch toán vào chi phí vận hành nội bộ, cam kết không thu thêm của khách hàng.
      </p>

      {['CONTINUE_ALLOWED', 'RESULT_REPORTED', 'CLOSED', 'HALTED'].includes(i.status) ? null : <>
        <div className="eyebrow" style={{ marginTop: 14 }}>Điều kiện tiếp tục chặng</div>
        <ul className="check-list f5-conds">{conds.map((c, k) => <li key={k} className={c.ok ? 'ok' : ''}><Icon name={c.ok ? 'check' : 'clock'} /><span>{c.label} <small>• {byVi(c.by)}</small></span></li>)}</ul>
      </>}
      {(i.plans?.length || 0) > 1 || (p.approvals?.length || 0) > 0 ? <details style={{ marginTop: 10 }}><summary className="hint" style={{ cursor: 'pointer' }}>Các phiên bản &amp; lịch sử phê duyệt ({i.plans?.length || 0})</summary>
        {[...(i.plans || [])].reverse().map((x: Any) => <div className="f5-ver" key={x.v}><b>v{x.v} • {F5_PLAN[x.kind]}</b> <Pill v={x.status === 'NOT_REQUIRED' ? 'APPLIED' : x.status} /> <span className="muted">{x.by} • {dt(x.at)}</span>
          {(Array.isArray(x.approvals) ? x.approvals : []).map((a: Any, k: number) => <div key={k} className="muted" style={{ fontSize: 12 }}>{a.decision === 'APPROVED' ? 'Phê duyệt' : a.decision === 'INHERITED' ? 'Kế thừa phê duyệt' : 'Yêu cầu chỉnh sửa'} • {a.by} • {dt(a.at)}{a.reason ? ': ' + a.reason : ''}</div>)}</div>)}
      </details> : null}
      {void t}
    </div>
  );
}

function InfoCard({ i }: { i: Any }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const t = trip(i.tripId);
  const repUser = emp(i.by);
  const repName = i.reporterName || (repUser ? repUser.name : i.by);
  const isVetReporter = i.reporterRole === 'VETERINARIAN' || i.type === 'HORSE_HEALTH' || /BS\.|Bác sĩ|thú y/i.test(repName);
  const roleLabel = isVetReporter ? 'Bác sĩ thú y / Hộ tống áp tải' : 'Tài xế vận hành';
  const phone = i.reporterPhone || (repUser ? repUser.phone : (t?.crew?.MAIN_DRIVER ? emp(t.crew.MAIN_DRIVER)?.phone : ''));
  const currentVeh = t?.vehicleId ? vehicle(t.vehicleId) : null;
  const tripHorseList = t ? (i.horseIds && i.horseIds.length ? i.horseIds : (t.horses || [])) : [];

  return (
    <div className="card pad">
      <div className="between">
        <h3 className="card-title">Thông tin sự cố &amp; bằng chứng hiện trường</h3>
        <span className="badge" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: isVetReporter ? '#ecfdf5' : '#eff6ff', color: isVetReporter ? '#047857' : '#1d4ed8', fontWeight: 600 }}>
          {roleLabel}
        </span>
      </div>

      <div className="kv2" style={{ marginTop: 12 }}>
        <Cell label="Loại sự cố / Lý do">
          <b style={{ color: 'var(--text-primary, #111827)' }}>
            {i.type === 'HORSE_HEALTH' ? 'Sự cố y tế & sức khỏe ngựa' : (F5_TYPES[i.type] || incTypeVi(i.type) || i.type)}
          </b>
        </Cell>
        <Cell label="Mức độ nghiêm trọng"><Pill v={i.severity} /></Cell>
        <Cell label="Người báo cáo">
          <b>{repName}</b>
          <div className="muted" style={{ fontSize: 12 }}>{roleLabel}</div>
        </Cell>
        <Cell label="Liên hệ khẩn cấp">
          {phone ? (
            <a href={`tel:${phone}`} style={{ color: 'var(--accent-primary, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              SĐT: {phone}
            </a>
          ) : (
            <span className="muted">Chưa có SĐT</span>
          )}
        </Cell>
        <Cell label="Thời điểm">{dt(i.at)}</Cell>
        <Cell label="Vị trí sự cố">{i.location || 'Trên đường vận chuyển'}</Cell>
        <Cell label="Tọa độ GPS">
          {i.locationCoordinates ? <code style={{ fontSize: 12, background: 'var(--bg-page, #f3f4f6)', padding: '2px 6px', borderRadius: 4 }}>{i.locationCoordinates}</code> : 'Chưa có tọa độ'}
        </Cell>
        <Cell label="Xe hiện tại của chuyến">
          {currentVeh ? `${currentVeh.plate} • ${currentVeh.model} (${currentVeh.stalls} ô chuồng)` : 'Chưa gán xe'}
        </Cell>
        <Cell label="Ngựa trên xe">
          {tripHorseList.length ? `${tripHorseList.length} con: ${tripHorseList.map((h: string) => horse(h)?.name || h).join(', ')}` : 'Không có ngựa'}
        </Cell>
      </div>

      {/* Khối an toàn & sơ cứu hiện trường */}
      <div className="note green" style={{ marginTop: 14 }}>
        <Icon name="check" />
        <div>
          <b>Hiện trạng an toàn hiện trường</b>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5 }}>
            {(!isVetReporter && (i.immediateCare?.includes('sơ cứu') || !i.immediateCare))
              ? 'Xe đã dừng ở vị trí an toàn hoặc chỗ đỗ ổn định.'
              : (i.immediateCare || i.safety || (isVetReporter ? 'Người và ngựa đã được đảm bảo an toàn / Đang tiến hành sơ cứu tại chỗ.' : 'Xe đã dừng ở vị trí an toàn hoặc chỗ đỗ ổn định.'))}
          </p>
        </div>
      </div>

      {/* Mô tả chi tiết do tài xế / bác sĩ gửi */}
      <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-page, #f9fafb)', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)' }}>
        <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--text-secondary, #4b5563)' }}>
          Chi tiết diễn biến do nhân sự hiện trường cung cấp:
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary, #111827)', whiteSpace: 'pre-wrap' }}>
          {i.description || 'Chưa có mô tả chi tiết.'}
        </p>
      </div>

      {/* Ảnh chụp hiện trường */}
      {(i.photos || []).length ? (
        <div style={{ marginTop: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Ảnh / Bằng chứng hiện trường ({i.photos.length}) – Bấm để phóng to</div>
          <div className="photo-strip">
            {i.photos.map((p: string, idx: number) => {
              const isImg = p.startsWith('data:image') || p.startsWith('http') || p.startsWith('blob:') || /\.(jpe?g|png|webp|gif)$/i.test(p);
              return (
                <button
                  type="button"
                  key={idx}
                  className="ph"
                  title="Nhấn để phóng to ảnh xem chi tiết"
                  onClick={() => setSelectedPhoto(p)}
                >
                  {isImg ? <img src={p} alt={`Ảnh sự cố ${idx + 1}`} /> : <span>{p}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
              background: 'var(--bg-surface, #fff)', padding: 16, borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'var(--bg-page, #f3f4f6)', border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontWeight: 'bold'
              }}
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, textAlign: 'left', color: 'var(--text-primary, #111827)' }}>
              Ảnh bằng chứng sự cố
            </h4>
            {selectedPhoto.startsWith('data:image') || selectedPhoto.startsWith('http') || selectedPhoto.startsWith('blob:') ? (
              <img
                src={selectedPhoto}
                alt="Bằng chứng sự cố"
                style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6, display: 'block' }}
              />
            ) : (
              <div style={{ padding: '30px 40px', minWidth: 280 }}>
                <p style={{ margin: 0 }}>Tệp đính kèm: <b>{selectedPhoto}</b></p>
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Tệp mẫu không có hình ảnh nhị phân đi kèm.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {i.type === 'HORSE_HEALTH' ? <div className="f5-vet">{i.vet ? <><b>Kết luận bác sĩ bên ngoài: {VET_VI[i.vet.conclusion]}</b><span>{i.vet.name} • {i.vet.clinic} • {i.vet.phone} • ghi nhận bởi {i.vet.by} lúc {dt(i.vet.at)}</span>{i.vet.notes ? <p>{i.vet.notes}</p> : null}{(i.vet.evidence || []).length ? <small>Bằng chứng: {i.vet.evidence.join(', ')}</small> : null}</>
        : <><b>Chưa có kết luận của bác sĩ bên ngoài</b><span>Tài xế / Áp tải ghi nhận kết luận, thông tin bác sĩ và bằng chứng; không tự kết luận chuyên môn.</span></>}</div> : null}
      {(i.updates || []).length ? <><div className="eyebrow" style={{ marginTop: 14 }}>Cập nhật hiện trường</div>
        <ul className="timeline">{[...i.updates].reverse().map((u: Any, k: number) => <li key={k} className={u.kind === 'SAFETY' ? 'red' : u.kind === 'CARE' ? 'orange' : ''}><b>{UPD_VI[u.kind] || 'Cập nhật'}: {u.text}</b><span>{dt(u.at)} • {u.by}{u.photo ? ' • ảnh ' + u.photo : ''}</span></li>)}</ul></> : null}
    </div>
  );
}

export function IncidentDetailPage() {
  useCoordinatorStore();
  const { incidentId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [driverAck, setDriverAck] = useState<boolean>(() => {
    try {
      const raw =
        localStorage.getItem(`rts_driver_ack_${cleanId(incidentId)}`) ||
        localStorage.getItem(`rts_driver_ack_${incidentId}`) ||
        localStorage.getItem(`rts_ack_${cleanId(incidentId)}`) ||
        localStorage.getItem(`rts_ack_${incidentId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Boolean(parsed?.ok && parsed?.role !== 'COORDINATOR' && !parsed?.by?.includes('Điều phối'));
      }
      return false;
    } catch {
      return false;
    }
  });

  const [vetResolved, setVetResolved] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`rts_vet_resolved_${cleanId(incidentId)}`) || localStorage.getItem(`rts_vet_resolved_${incidentId}`);
      return !!raw;
    } catch {
      return false;
    }
  });

  const [vetReferral, setVetReferral] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`rts_vet_referral_${cleanId(incidentId)}`) || localStorage.getItem(`rts_vet_referral_${incidentId}`);
      return !!raw;
    } catch {
      return false;
    }
  });

  const [showPickupResolutionModal, setShowPickupResolutionModal] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    syncCoordinatorIncidents().finally(() => {
      if (mounted) setLoading(false);
    });

    const checkStorage = () => {
      try {
        const raw =
          localStorage.getItem(`rts_driver_ack_${cleanId(incidentId)}`) ||
          localStorage.getItem(`rts_driver_ack_${incidentId}`) ||
          localStorage.getItem(`rts_ack_${cleanId(incidentId)}`) ||
          localStorage.getItem(`rts_ack_${incidentId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          setDriverAck(Boolean(parsed?.ok && parsed?.role !== 'COORDINATOR' && !parsed?.by?.includes('Điều phối')));
        } else {
          setDriverAck(false);
        }
        const rawRes = localStorage.getItem(`rts_vet_resolved_${cleanId(incidentId)}`) || localStorage.getItem(`rts_vet_resolved_${incidentId}`);
        if (rawRes) setVetResolved(true);
        const rawRef = localStorage.getItem(`rts_vet_referral_${cleanId(incidentId)}`) || localStorage.getItem(`rts_vet_referral_${incidentId}`);
        if (rawRef) setVetReferral(true);
      } catch {
        // ignore
      }
    };

    const handleSceneReady = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail && (cleanId(ce.detail.id) === cleanId(incidentId) || ce.detail.id === incidentId)) {
        if (ce.detail.role !== 'COORDINATOR' && !ce.detail.by?.includes('Điều phối')) {
          setDriverAck(true);
        }
      }
    };

    const handleVetStatus = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail && (cleanId(ce.detail.id) === cleanId(incidentId) || ce.detail.id === incidentId)) {
        if (ce.detail.status === 'STABILIZED') {
          setVetResolved(true);
          setVetReferral(false);
        } else if (ce.detail.status === 'REFERRAL_REQUESTED') {
          setVetReferral(true);
          setVetResolved(false);
        }
      }
    };

    window.addEventListener('rts_incident_scene_ready', handleSceneReady);
    window.addEventListener('rts_vet_status_changed', handleVetStatus);
    window.addEventListener('rts_requests_updated', checkStorage);
    window.addEventListener('storage', checkStorage);
    return () => {
      mounted = false;
      window.removeEventListener('rts_incident_scene_ready', handleSceneReady);
      window.removeEventListener('rts_vet_status_changed', handleVetStatus);
      window.removeEventListener('rts_requests_updated', checkStorage);
      window.removeEventListener('storage', checkStorage);
    };
  }, [incidentId]);

  const i = db.incidents.find((x: Any) => cleanId(x.id) === cleanId(incidentId));
  if (!i) {
    if (loading) {
      return (
        <CoordinatorLayout title="Sự cố & khiếu nại" active="/coordinator/incidents">
          <div className="card pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p className="subtitle">Đang tải thông tin sự cố...</p>
          </div>
        </CoordinatorLayout>
      );
    }
    return <Navigate to="/coordinator/incidents" replace />;
  }

  f5Status(i);
  const realTrip = trip(i.tripId);
  const t = realTrip || { id: i.tripId || '—', status: 'IN_TRANSIT', eta: '', stops: [], crew: {}, vehicleId: '', requestId: '' };
  const p = curPlan(i);
  const S = i.status;
  const miss = f5Conditions(i).filter((c) => !c.ok);

  const isHorseHealth = i.type === 'HORSE_HEALTH' || i.reporterRole === 'VETERINARIAN';
  const targetRoleLabel = isHorseHealth ? 'Bác sĩ thú y' : 'Tài xế';

  const hasUpdateAck = Boolean(
    i.updates && i.updates.some((u: Any) =>
      String(u.text || u.notes || '').toLowerCase().includes('tiếp nhận phương án') ||
      String(u.text || u.notes || '').toLowerCase().includes('sẵn sàng phối hợp')
    )
  );
  const isSceneReady = Boolean(i.sceneReady || driverAck || hasUpdateAck);

  const isVetReferralCondition = Boolean(vetReferral || i.vetStatus === 'REFERRAL_REQUESTED');
  const isTransferApproved = Boolean(i.resolutionType === 'VET_TRANSFER');

  const btn = (key: string, label: string, run: () => void, cls = 'ghost', why = '') => (
    <span className="f5-act" key={key}>
      <button type="button" className={`btn ${cls}`} disabled={!!why} onClick={run}>
        {label}
      </button>
      {why ? <small>{why}</small> : null}
    </span>
  );

  const buttons = [];

  // Nút 1: Tiếp nhận sự cố
  if (S === 'REPORTED') {
    buttons.push(btn('ack', 'Tiếp nhận sự cố', () => f5Ack(i.id), 'solid'));
  }

  // Đối với sự cố Sức khỏe ngựa
  if (isHorseHealth) {
    if (['PLANNING', 'CHANGES_REQUESTED', 'EXECUTING'].includes(S)) {
      // Nếu Bác sĩ báo đề xuất chuyển viện và chưa duyệt
      if (isVetReferralCondition && !isTransferApproved) {
        buttons.push(
          <span className="f5-act" key="vet-transfer">
            <button
              type="button"
              className="btn solid"
              style={{ background: '#b91c1c', borderColor: '#b91c1c', color: '#fff', fontWeight: 600 }}
              onClick={() => f5ApproveVetTransfer(i.id)}
            >
              Duyệt chuyển trạm y tế
            </button>
          </span>
        );
      }

      // Nút Cho phép tiếp tục chặng (khi đã xử lý ổn định hoặc đã duyệt chuyển viện)
      buttons.push(
        btn(
          'cont',
          'Cho phép tiếp tục chặng',
          () => f5Continue(i.id),
          isSceneReady ? 'solid' : 'ghost',
          !isSceneReady
            ? `Chờ ${targetRoleLabel.toLowerCase()} xác nhận tiếp nhận phương án ngoài hiện trường.`
            : (miss.length ? 'Còn thiếu: ' + miss.map((c) => `${c.label} (${byVi(c.by)})`).join('; ') : '')
        )
      );

      // Nút Chuyển Quản lý nếu cần can thiệp cấp cao
      buttons.push(
        btn('esc', 'Từ chối hỗ trợ – Chuyển Quản lý', () => f5Escalate(i.id), 'ghost')
      );
    }
  } else {
    // Đối với sự cố Phương tiện / Giao thông của Tài xế
    if (['PLANNING', 'CHANGES_REQUESTED', 'EXECUTING'].includes(S)) {
      const isPickupBlocked = i.type === 'PICKUP_ACCESS_BLOCKED' || i.category === 'PICKUP_ACCESS_BLOCKED' || t?.pickupAccessStatus === 'BLOCKED';
      const isPlanLocked = Boolean(isSceneReady && S === 'EXECUTING');
      buttons.push(
        btn(
          'plan',
          p ? (p.status === 'DRAFT' ? `Sửa phương án v${p.v}` : `Sửa phương án (tạo v${p.v + 1})`) : 'Lập phương án',
          () => {
            if (isPickupBlocked) {
              setShowPickupResolutionModal(true);
            } else {
              f5Plan(i.id);
            }
          },
          p && p.status !== 'DRAFT' ? 'ghost' : 'solid',
          isPlanLocked ? `${targetRoleLabel} đã tiếp nhận phương án, không thể chỉnh sửa trong khi đang thực hiện.` : ''
        )
      );
    }
    if (p && p.status === 'DRAFT') {
      buttons.push(btn('submit', 'Duyệt & Áp dụng phương án', () => f5Submit(i.id), 'solid'));
    }
    if (S === 'EXECUTING') {
      if (isSceneReady) {
        buttons.push(
          <span className="f5-act" key="driver-ack">
            <button
              type="button"
              className="btn"
              disabled
              style={{
                background: '#ecfdf3',
                color: '#027a48',
                borderColor: '#a6f4c7',
                cursor: 'default',
                fontWeight: 600,
              }}
            >
              Đã xác nhận: {targetRoleLabel} đã tiếp nhận phương án
            </button>
          </span>
        );
      } else {
        buttons.push(
          <span className="f5-act" key="driver-wait">
            <button
              type="button"
              className="btn ghost"
              disabled
              style={{ opacity: 0.75, cursor: 'default' }}
              title={`Đang chờ ${targetRoleLabel.toLowerCase()} xác nhận tiếp nhận phương án ngoài hiện trường`}
            >
              Chờ {targetRoleLabel.toLowerCase()} tiếp nhận phương án...
            </button>
          </span>
        );
      }
      buttons.push(
        btn(
          'cont',
          'Cho phép tiếp tục chặng',
          () => f5Continue(i.id),
          isSceneReady ? 'solid' : 'ghost',
          !isSceneReady
            ? `Chờ ${targetRoleLabel.toLowerCase()} xác nhận tiếp nhận phương án ngoài hiện trường.`
            : (miss.length ? 'Còn thiếu: ' + miss.map((c) => `${c.label} (${byVi(c.by)})`).join('; ') : '')
        )
      );
    }
  }

  if (S === 'RESULT_REPORTED' || S === 'CONTINUE_ALLOWED') {
    buttons.push(btn('close', 'Đóng sự cố', () => f5Close(i.id), 'solid'));
  }

  const r = reqOfTrip(t);
  const pickupLat = Number(r?.pickup?.lat || r?.pickupLatitude || t?.pickupLatitude || 10.8231);
  const pickupLng = Number(r?.pickup?.lng || r?.pickupLongitude || t?.pickupLongitude || 106.6297);
  const pickupName = r?.pickup?.name || r?.pickupStableName || r?.origin || 'Trang trại điểm đón';
  const reportedLat = i?.reportedLatitude ? Number(i.reportedLatitude) : (i?.lat ? Number(i.lat) : undefined);
  const reportedLng = i?.reportedLongitude ? Number(i.reportedLongitude) : (i?.lng ? Number(i.lng) : undefined);

  const cleanTripKey = (t?.id || t?.tripId || i?.tripId || '').replace(/-/g, '_');
  let cachedEvidence: any = null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`rts_pickup_evidence_${cleanTripKey}`) : null;
    if (raw) cachedEvidence = JSON.parse(raw);
  } catch {}

  const rawImg = i?.imageUrl || t?.imageUrl || '';
  const parts = rawImg.includes('||') ? rawImg.split('||') : [rawImg];
  const blockedImg = t?.blockedImageUrl || i?.blockedImageUrl || cachedEvidence?.blockedImageUrl || (parts[0]?.trim() || undefined);
  const relocationImg = t?.relocationImageUrl || i?.relocationImageUrl || cachedEvidence?.relocationImageUrl || (parts.length > 1 ? parts[1]?.trim() : undefined);
  const descMatch = i?.description?.match(/Vị trí dời đề xuất:\s*([^.]+)/i);
  const extractedPlace = descMatch ? descMatch[1].trim() : undefined;
  const isMockPlace = (val?: string | null) => !val || val.toLowerCase().includes('ngã ba đường liên xã');
  const proposedPlace =
    (!isMockPlace(i?.proposedRelocationPlaceName) ? i?.proposedRelocationPlaceName : undefined) ||
    (!isMockPlace(cachedEvidence?.proposedPlaceName) ? cachedEvidence?.proposedPlaceName : undefined) ||
    (!isMockPlace(extractedPlace) ? extractedPlace : undefined) ||
    (!isMockPlace(t?.relocationMeetingPointName) ? t?.relocationMeetingPointName : undefined);

  return (
    <CoordinatorLayout title="Sự cố & khiếu nại" active="/coordinator/incidents">
      <button type="button" className="link back" onClick={() => go('f/incidents')}>
        ← Danh sách sự cố
      </button>

      <div className="head">
        <div>
          <h2 className="page-title" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {i.id} <PillT p={f5Pill(i)} /> <Pill v={i.severity} />
          </h2>
          <p className="subtitle">
            {isHorseHealth ? 'Sự cố y tế & sức khỏe ngựa' : (F5_TYPES[i.type] || incTypeVi(i.type))} • {t.id} • {legOf(t, i.leg)}
            {i.blocking && !i.continueAt && !F5_DONE.includes(i.status) ? (
              <> • <b style={{ color: '#b42318' }}>chặng đang tạm dừng</b></>
            ) : null}
          </p>
        </div>
      </div>

      <NextBox i={i} />
      {buttons.length ? <div className="f5-actions">{buttons}</div> : null}

      <div className="grid-main" style={{ marginTop: 16 }}>
        <div className="stack">
          {isHorseHealth ? (
            <HorseHealthCard i={i} liveResolved={vetResolved} liveReferral={vetReferral} />
          ) : (
            <>
              {(i.type === 'ROAD_CLOSURE' || i.type === 'OTHER' || i.type === 'PICKUP_ACCESS_BLOCKED' || t?.pickupAccessStatus || i.pickupAccessBlocked) && (
                <PickupAccessCard t={t} incident={i} onUpdated={() => syncCoordinatorIncidents()} />
              )}
              <PlanCard i={i} />
              <InfoCard i={i} />
            </>
          )}
        </div>

        <div className="stack">
          <div className="card pad">
            <div className="eyebrow">Chuyến</div>
            <div className="kv">
              <div><span>Chuyến</span><b>{t.id}</b></div>
              <div><span>Tuyến</span><b>{reqOfTrip(t) ? <RouteText r={reqOfTrip(t)} /> : '—'}</b></div>
              <div><span>Trạng thái</span><b>{human(t.status)}</b></div>
              <div><span>ETA đã xác nhận</span><b>{dt(t.eta)}</b></div>
              <div><span>Phụ trách</span><b>{i.owner || 'Chưa tiếp nhận'}</b></div>
            </div>
            {realTrip && (
              <div className="btn-row">
                <button type="button" className="btn ghost sm" onClick={() => go(`f/trip/${t.id}/progress`)}>
                  Theo dõi hành trình
                </button>
              </div>
            )}
          </div>

          <div className="card pad">
            <h3 className="card-title">Lịch sử xử lý</h3>
            <ul className="timeline">
              {[...(Array.isArray(i.log) ? i.log : [])].reverse().map((x: Any, k: number) => {
                const [a, b, c, r] = x;
                return (
                  <li key={k}>
                    <b>{b}</b>
                    <span>
                      {dt(a)}
                      {c ? ' • ' + c : ''}
                      {r ? ' (' + (ROLE_VI[r] || human(r)) + ')' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <PickupAccessResolutionModal
        isOpen={showPickupResolutionModal}
        onClose={() => setShowPickupResolutionModal(false)}
        tripId={t?.id || t?.tripId || i.tripId || ''}
        pickupStableName={pickupName}
        pickupLatitude={pickupLat}
        pickupLongitude={pickupLng}
        reportedLatitude={reportedLat}
        reportedLongitude={reportedLng}
        incidentReason={i.description || t?.pickupAccessReason}
        proposedMeetingPointName={proposedPlace}
        blockedImageUrl={blockedImg}
        relocationImageUrl={relocationImg}
        onSuccess={() => {
          setShowPickupResolutionModal(false);
          void syncCoordinatorIncidents();
        }}
      />
    </CoordinatorLayout>
  );
}

export default IncidentDetailPage;
