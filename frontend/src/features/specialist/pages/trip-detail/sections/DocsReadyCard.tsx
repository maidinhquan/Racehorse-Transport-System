import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SpecTrip, TripDetailTab } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import {
  MODE_VI,
  blockingOf,
  checklist,
  countryName,
  customerDocCount,
  docsReadyBlock,
  fmtDateTime,
  insuranceState,
  tripTotals,
} from '../../../hooks/specialistRules';
import { Icon } from '../../../components/SpecialistLayout';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { ApplySetModal } from '../../../components/Modals';
import { useSharedIncidents } from '../../../../../shared/utils/sharedIncidents';

/** Thẻ "Xác nhận hồ sơ sẵn sàng (Docs READY)" + 3 ô chuyển nhóm giấy tờ + thông tin bộ yêu cầu */
export const DocsReadyCard: React.FC<{ trip: SpecTrip; active: TripDetailTab; onTab: (k: TripDetailTab) => void }> = ({ trip: t, active, onTab }) => {
  const navigate = useNavigate();
  const { data, actions } = useSpecialist();
  const [applyOpen, setApplyOpen] = useState(false);
  const cu = customerDocCount(data, t), totals = tripTotals(data, t), c = checklist(data, t);
  const co = c.items.filter((i) => i.counted && i.provider === 'CBN');
  const block = docsReadyBlock(data, t), ins = insuranceState(t);
  const blockers = blockingOf(data, t);
  const can = t.status === 'PLANNING';
  const incidents = useSharedIncidents(t.id);
  const unreviewedCount = incidents.filter((i) => !i.complianceReview).length;

  const originName = countryName(t.originCountry);
  const destName = countryName(t.destCountry);

  return (
    <div className="spc-card spc-ready">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <h3 className="spc-card__title" style={{ margin: 0 }}>
          <span>Xác nhận hồ sơ sẵn sàng (Docs READY) <span className="spc-muted">• Tổng giấy tờ {totals.done}/{totals.total}</span></span>
          {t.docsReady || t.status === 'COMPLETED' ? (
            <TripStatusBadge label="Đã xác nhận" tone="ok" />
          ) : !t.reqSet ? (
            <TripStatusBadge label={`Chưa có giấy tờ đến ${destName}`} tone="bad" />
          ) : (
            <TripStatusBadge label="Chưa xác nhận" tone="warn" />
          )}
        </h3>
        {t.reqSet ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span className="spc-muted">
              Bộ yêu cầu: <b>{t.reqSet.pkgId}</b> ({t.reqSet.name}) • v{t.reqSet.pkgV}
            </span>
            {can && (
              <button
                type="button"
                className="spc-btn spc-btn--sm"
                style={{ padding: '2px 8px', fontSize: 12 }}
                onClick={() => setApplyOpen(true)}
              >
                Đổi bộ yêu cầu
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: '#be123c', fontWeight: 600 }}>Chưa có bộ yêu cầu</span>
            <button
              type="button"
              className="spc-btn spc-btn--sm spc-btn--solid"
              style={{ padding: '2px 8px', fontSize: 12, background: '#e11d48', borderColor: '#be123c' }}
              onClick={() => navigate('/specialist/regulations/sets')}
            >
              + Tạo bộ yêu cầu
            </button>
          </div>
        )}
      </div>

      {!t.reqSet && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: 8,
            padding: '10px 14px',
            margin: '8px 0 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <b style={{ color: '#be123c', fontSize: 13, display: 'block' }}>
              Giấy tờ đi đến {destName} chưa có, vui lòng tạo
            </b>
            <span style={{ color: '#881337', fontSize: 12 }}>
              Tuyến {originName} → {destName} ({MODE_VI[t.mode] || t.mode}) chưa có bộ quy định / yêu cầu hồ sơ chuẩn.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="spc-btn spc-btn--solid spc-btn--sm"
              style={{ background: '#e11d48', borderColor: '#be123c', whiteSpace: 'nowrap' }}
              onClick={() => navigate('/specialist/regulations/sets')}
            >
              Tạo bộ yêu cầu hồ sơ
            </button>
            {can && (
              <button
                type="button"
                className="spc-btn spc-btn--sm"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => setApplyOpen(true)}
              >
                Chọn bộ khác
              </button>
            )}
          </div>
        </div>
      )}

      <div className="spc-ready__stats">
        <button type="button" className={active === 'customer' ? 'on' : ''} onClick={() => onTab('customer')}>
          <span>Giấy tờ khách hàng cung cấp</span><b>{cu.done}/{cu.total}</b><small>đã duyệt</small>
        </button>
        <button type="button" className={active === 'required' ? 'on' : ''} onClick={() => onTab('required')}>
          <span>Giấy tờ công ty phải làm</span><b>{co.filter((i) => i.status === 'APPROVED').length}/{co.length}</b><small>đã duyệt</small>
        </button>
        <button type="button" className={active === 'insurance' ? 'on' : ''} onClick={() => onTab('insurance')}>
          <span>Bảo hiểm vận chuyển</span><b>{ins === 'VERIFIED' ? 'Đã xác minh' : ins === 'PENDING' ? 'Chờ xác minh' : 'Chưa có'}</b><small>{t.insurance?.insurer ?? 'bắt buộc'}</small>
        </button>
        <button type="button" className={active === 'incidents' ? 'on' : ''} onClick={() => onTab('incidents')}>
          <span>Sự cố vận chuyển</span><b>{incidents.length ? `${incidents.length} sự cố` : '0 sự cố'}</b><small>{unreviewedCount > 0 ? `${unreviewedCount} cần rà soát` : incidents.length ? 'Đã rà soát' : 'Bình thường'}</small>
        </button>
      </div>

      {t.docsReady ? (
        <p className="spc-subtitle">Đã xác nhận lúc {fmtDateTime(t.docsReady.at)} bởi {t.docsReady.by}. Nếu hồ sơ hoặc bảo hiểm thay đổi, xác nhận tự hết hiệu lực.</p>
      ) : (
        <>
          <p className="spc-subtitle">Xác nhận khi toàn bộ hồ sơ đã duyệt và bảo hiểm đã xác minh. Manager chỉ duyệt khởi hành được sau bước này.</p>
          {blockers.length > 0 && (
            <ul className="spc-blockers">{blockers.map(([bad, text]) => <li key={text} className={bad ? 'bad' : ''}><Icon name={bad ? 'alert' : 'clock'} />{text}</li>)}</ul>
          )}
          {t.status === 'PLANNING' && (
            <div className="spc-btn-row">
              <button type="button" className={`spc-btn ${block ? '' : 'spc-btn--solid'}`} disabled={!!block} title={block} onClick={() => actions.confirmDocsReady(t.id)}>
                <Icon name="check" />Xác nhận hồ sơ sẵn sàng
              </button>
              {block && <span className="spc-muted" style={{ alignSelf: 'center' }}>{block}</span>}
            </div>
          )}
        </>
      )}

      <ApplySetModal open={applyOpen} trip={t} onClose={() => setApplyOpen(false)} />
    </div>
  );
};

export default DocsReadyCard;
