import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpecTrip } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import {
  COUNTRY_VI,
  LEVEL_VI,
  MODE_VI,
  PROVIDER_VI,
  SCOPE_VI,
  STAGE_VI,
  checklist,
  fmtDate,
  fmtDateTime,
  pkgWhyNot,
  regFor,
  routeNeeds,
  ruleLabel,
  typeName,
} from '../../../hooks/specialistRules';
import { ApplySetModal } from '../../../components/Modals';
import { Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Bộ yêu cầu hồ sơ của chuyến: chọn & áp dụng (xem trước thay đổi), xem bản chụp, cập nhật */
export const RequirementSetCard: React.FC<{ trip: SpecTrip }> = ({ trip: t }) => {
  const navigate = useNavigate();
  const { data } = useSpecialist();
  const [applyOpen, setApplyOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const can = t.status === 'PLANNING';
  const scopeText = `${COUNTRY_VI[t.originCountry]} → ${COUNTRY_VI[t.destCountry]} • ${MODE_VI[t.mode]}`;
  const rs = t.reqSet;

  if (!rs) {
    const fit = data.packages.filter((p) => !pkgWhyNot(p, t));
    return (
      <div className="spc-card spc-rp spc-rp--need">
        <h3 className="spc-card__title">Bộ yêu cầu hồ sơ <TripStatusBadge label="Chưa áp dụng" tone="warn" /></h3>
        <p className="spc-subtitle">Chuyến đã được Manager giao cho bạn. Chọn bộ yêu cầu hồ sơ phù hợp để lập checklist. Khi chưa áp dụng, checklist tạm dùng gợi ý tự động theo tuyến và chưa thể xác nhận Docs READY.</p>
        <div className="spc-chips">{routeNeeds(t).map(([c, d]) => <span key={`${c}${d}`} className={`spc-rp__chip ${regFor(data, c, d) ? '' : 'bad'}`}>{ruleLabel(c, d)}</span>)}</div>
        {can && (fit.length ? (
          <div className="spc-btn-row">
            <button type="button" className="spc-btn spc-btn--solid spc-btn--sm" onClick={() => setApplyOpen(true)}>Xem trước & áp dụng</button>
            <button type="button" className="spc-btn spc-btn--sm" onClick={() => navigate('/specialist/regulations/sets')}>Danh sách bộ yêu cầu</button>
          </div>
        ) : (
          <>
            <Note tone="yellow" title="Chưa có bộ phù hợp">Tạo bộ yêu cầu cho {scopeText} trong Quy định & thiết lập.</Note>
            <button type="button" className="spc-btn spc-btn--sm" style={{ marginTop: 10 }} onClick={() => navigate('/specialist/regulations/sets')}>Mở Bộ yêu cầu hồ sơ</button>
          </>
        ))}
        <p className="spc-muted" style={{ marginTop: 8 }}>Chỉ hiện các bộ phù hợp {scopeText}.</p>
        <ApplySetModal open={applyOpen} trip={t} onClose={() => setApplyOpen(false)} />
      </div>
    );
  }

  const c = checklist(data, t), pk = data.packages.find((p) => p.id === rs.pkgId);
  const later = c.items.filter((i) => i.stage === 'AT_CHECKPOINT').length;
  return (
    <div className="spc-card spc-rp">
      <h3 className="spc-card__title">
        <span>Bộ yêu cầu hồ sơ<br /><small className="spc-muted"><b>{rs.pkgId} • {rs.name}</b> • v{rs.pkgV} • áp dụng {fmtDateTime(rs.at)} bởi {rs.by}</small></span>
        <TripStatusBadge label={`Đã áp dụng v${rs.pkgV}`} tone="ok" />
      </h3>
      <div className="spc-ready__stats spc-ready__stats--4">
        <div><span>Tiến độ (bắt buộc)</span><b>{c.ready}/{c.total}</b><small>đã duyệt</small></div>
        <div><span>Chờ duyệt</span><b>{c.pending}</b><small>mục</small></div>
        <div><span>Cần bổ sung</span><b>{c.needs}</b><small>thiếu / bị từ chối / hết hạn</small></div>
        <div><span>Tại điểm kiểm tra</span><b>{later}</b><small>theo dõi, không chặn Docs READY</small></div>
      </div>
      {pk && pk.v > rs.pkgV && <p className="spc-muted" style={{ marginTop: 10 }}>Bộ đã có phiên bản v{pk.v} (hiệu lực {fmtDate(pk.effectiveFrom)}). Chuyến vẫn dùng v{rs.pkgV} cho tới khi bạn chủ động cập nhật.</p>}
      <div className="spc-btn-row">
        <button type="button" className="spc-btn spc-btn--sm" onClick={() => setShowRules((v) => !v)}>{showRules ? 'Ẩn bộ yêu cầu' : 'Xem bộ yêu cầu'}</button>
        {can && <button type="button" className="spc-btn spc-btn--sm" onClick={() => setApplyOpen(true)}>Cập nhật bộ yêu cầu…</button>}
      </div>
      {!can && <p className="spc-muted" style={{ marginTop: 8 }}>🔒 Chuyến đã qua bước chuẩn bị – bộ yêu cầu được khóa.</p>}
      {showRules && rs.rules.map((r) => (
        <div key={`${r.country}${r.direction}`} style={{ marginTop: 12 }}>
          <div className="spc-rp__rule"><b>{ruleLabel(r.country, r.direction)}</b><span className="spc-muted">{r.regId ? `${r.regId} • phiên bản v${r.regV}` : 'Chưa cấu hình'}</span></div>
          <div className="spc-table-wrap">
            <table className="spc-table">
              <thead><tr><th>Loại giấy tờ</th><th>Bên cung cấp</th><th>Phạm vi</th><th>Mức độ</th><th>Giai đoạn cần</th><th>Điều kiện</th></tr></thead>
              <tbody>
                {r.lines.map((l) => (
                  <tr key={l.typeId}><td><b>{typeName(data, l.typeId)}</b></td><td>{PROVIDER_VI[l.provider]}</td><td>{SCOPE_VI[l.scope]}</td><td>{LEVEL_VI[l.level]}</td><td>{STAGE_VI[l.stage]}</td><td>{l.condition || '—'}</td></tr>
                ))}
                {!r.lines.length && <tr><td colSpan={6} className="spc-muted">Chưa có yêu cầu – checklist không thể đạt cho tới khi bổ sung.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <ApplySetModal open={applyOpen} trip={t} onClose={() => setApplyOpen(false)} />
    </div>
  );
};

export default RequirementSetCard;
