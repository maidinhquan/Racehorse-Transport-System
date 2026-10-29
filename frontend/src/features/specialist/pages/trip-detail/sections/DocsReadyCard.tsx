import React from 'react';
import type { SpecTrip, TripDetailTab } from '../../../types';
import { useSpecialist } from '../../../hooks/useSpecialist';
import { blockingOf, checklist, customerDocCount, docsReadyBlock, fmtDateTime, insuranceState, tripTotals } from '../../../hooks/specialistRules';
import { Icon } from '../../../components/SpecialistLayout';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Thẻ "Xác nhận hồ sơ sẵn sàng (Docs READY)" + 3 ô chuyển nhóm giấy tờ */
export const DocsReadyCard: React.FC<{ trip: SpecTrip; active: TripDetailTab; onTab: (k: TripDetailTab) => void }> = ({ trip: t, active, onTab }) => {
  const { data, actions } = useSpecialist();
  const cu = customerDocCount(data, t), totals = tripTotals(data, t), c = checklist(data, t);
  const co = c.items.filter((i) => i.counted && i.provider === 'CBN');
  const block = docsReadyBlock(data, t), ins = insuranceState(t);
  const blockers = blockingOf(data, t);

  return (
    <div className="spc-card spc-ready">
      <h3 className="spc-card__title">
        <span>Xác nhận hồ sơ sẵn sàng (Docs READY) <span className="spc-muted">• Tổng giấy tờ {totals.done}/{totals.total}</span></span>
        {t.docsReady ? <TripStatusBadge label="Đã xác nhận" tone="ok" /> : <TripStatusBadge label="Chưa xác nhận" tone="warn" />}
      </h3>
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
    </div>
  );
};

export default DocsReadyCard;
