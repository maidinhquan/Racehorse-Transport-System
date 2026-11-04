import React, { useEffect } from 'react';
import type { ContractEditorData } from '../../../api/managerApi';
import type { ContractDraft, HorseRef, TransportMode, TransportRequest } from '../../../types';
import { addDays, fmtDate, MODE_LABEL, today } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
  horses: HorseRef[];
  defaults: ContractEditorData['defaults'];
  policyReady: boolean;
}

/** Bước 1: phương án vận chuyển dự kiến (để lập giá) */
export const PlanStep: React.FC<StepProps> = ({ request: r, draft, set, horses, defaults, policyReady }) => {
  const minPrepDays = policyReady ? (defaults?.preparationDays ?? null) : null;
  // The selected route is enough to keep the editor usable if an older server omits the optional route list.
  const routes = (defaults?.supportedRoutes?.length ? defaults.supportedRoutes : [defaults?.selectedRoute])
    .filter((route): route is NonNullable<typeof route> => !!route);
  const modes = routes.length
    ? [...new Set(routes.map(route => route.mode))]
    : (['ROAD', 'AIR'] as TransportMode[]);
  const prepDays = minPrepDays ?? (draft.mode === 'AIR' ? 7 : 3);
  const minDepartDate = addDays(today(), prepDays + 2);

  // The customer's original dates. After a version is published the request carries the contract's dates,
  // so prefer the values recorded in the contract snapshot.
  const original = [...(r.versions ?? [])].reverse().find((v) => v.snapshot?.requestedPickupAt)?.snapshot;
  const requestedPickup = original?.requestedPickupAt || r.pickupAt;
  const requestedDelivery = original?.requestedDate || r.date;
  const isAdjusted = !!(requestedPickup && requestedPickup.slice(0, 10) < minDepartDate);

  // Tự động gán ngày khởi hành và đến nơi: ưu tiên theo ngày khách yêu cầu nếu còn đủ điều kiện;
  // nếu ngày khách yêu cầu quá sớm/đã qua (nhỏ hơn minDepartDate) thì tự động dời sang minDepartDate để đảm bảo hợp lệ.
  useEffect(() => {
    if (requestedPickup && requestedDelivery) {
      const depDate = requestedPickup.slice(0, 10);
      const effectiveDepDate = depDate < minDepartDate ? minDepartDate : depDate;
      const depTime = draft.departAt && draft.departAt.length > 10 ? draft.departAt.slice(10) : ' 08:00';
      const expectedDep = `${effectiveDepDate}${depTime}`;

      let arrDate = requestedDelivery.slice(0, 10);
      if (arrDate <= effectiveDepDate) {
        arrDate = addDays(effectiveDepDate, 1);
      }
      const arrTime = draft.arriveAt && draft.arriveAt.length > 10 ? draft.arriveAt.slice(10) : ' 18:00';
      const expectedArr = `${arrDate}${arrTime}`;

      if (draft.departAt !== expectedDep || draft.arriveAt !== expectedArr) {
        set({ departAt: expectedDep, arriveAt: expectedArr });
      }
    }
  }, [requestedPickup, requestedDelivery, minDepartDate, draft.departAt, draft.arriveAt, set]);

  return (
    <>
      <h3 className="mgr-card__title">1. Phương án vận chuyển dự kiến</h3>
      <p className="mgr-hint" style={{ marginTop: 0 }}>
        Thông tin để lập giá. Coordinator lập tuyến, xe và nhân sự chi tiết sau khi chuyến được kích hoạt.
      </p>

      <p className="mgr-hint">
        {minPrepDays === null ? 'Đang tải quy định chuẩn bị cho phương thức đã chọn…' : `Phương thức ${draft.mode ? MODE_LABEL[draft.mode] : ''} cần ${minPrepDays} ngày chuẩn bị. Khởi hành sớm nhất: ${fmtDate(minDepartDate)}.`}
      </p>
      <div className="mgr-form-grid">
        <div className="mgr-field">
          <label htmlFor="ct-mode">Phương thức vận chuyển *</label>
          <select id="ct-mode" className="mgr-input" value={draft.mode ?? ''} onChange={e => set({ mode: e.target.value as TransportMode })}>
            <option value="" disabled>Chọn phương thức</option>
            {(modes.length > 0 ? modes : (['ROAD', 'AIR'] as TransportMode[])).map(mode => <option key={mode} value={mode}>{MODE_LABEL[mode]}</option>)}
          </select>
          <p className="mgr-hint">Chỉ hiển thị phương thức được hỗ trợ cho tuyến này.</p>
        </div>
        <div className="mgr-field">
          <label>Ngựa theo yêu cầu (chỉ xem)</label>
          <div className="mgr-input mgr-ce__readonly">{r.horses.map((id) => horses.find((h) => h.id === id)?.name ?? id).join(', ')}</div>
        </div>
        <div className="mgr-field">
          <label>Khởi hành dự kiến (chỉ xem)</label>
          <div className="mgr-input mgr-ce__readonly">
            {fmtDate(draft.departAt || minDepartDate)}
          </div>
          <p className="mgr-hint">
            Khách yêu cầu lấy ngựa: {fmtDate(requestedPickup)}
            {isAdjusted ? ` (Tự động dời sang ${fmtDate(minDepartDate)} để đảm bảo 24h ký hợp đồng và ${prepDays} ngày chuẩn bị).` : '.'}
          </p>
        </div>
        <div className="mgr-field">
          <label>Đến dự kiến (chỉ xem)</label>
          <div className="mgr-input mgr-ce__readonly">
            {fmtDate(draft.arriveAt)}
          </div>
          <p className="mgr-hint">Khách yêu cầu giao ngựa: {fmtDate(requestedDelivery)}.</p>
        </div>
      </div>
    </>
  );
};

export default PlanStep;
