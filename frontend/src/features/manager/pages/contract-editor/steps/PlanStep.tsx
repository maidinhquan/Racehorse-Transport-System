import React from 'react';
import { DateTimeField } from '../../../components/DateField/DateTimeField';
import type { ContractDraft, HorseRef, TransportMode, TransportRequest } from '../../../types';
import { MODE_LABEL, fmtDate, today } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
  horses: HorseRef[];
}

/** Bước 1: phương án vận chuyển dự kiến (để lập giá) */
export const PlanStep: React.FC<StepProps> = ({ request: r, draft, set, horses }) => (
  <>
    <h3 className="mgr-card__title">1. Phương án vận chuyển dự kiến</h3>
    <p className="mgr-hint" style={{ marginTop: 0 }}>Thông tin để lập giá. Coordinator lập tuyến, xe và nhân sự chi tiết sau khi chuyến được kích hoạt.</p>
    <div className="mgr-form-grid">
      <div className="mgr-field">
        <label htmlFor="ct-mode">Phương thức dự kiến *</label>
        <select id="ct-mode" className="mgr-select" value={draft.mode} onChange={(e) => set({ mode: e.target.value as TransportMode })}>
          {(Object.keys(MODE_LABEL) as TransportMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
        </select>
      </div>
      <div className="mgr-field">
        <label>Ngựa theo yêu cầu (chỉ xem)</label>
        <div className="mgr-input mgr-ce__readonly">{r.horses.map((id) => horses.find((h) => h.id === id)?.name ?? id).join(', ')}</div>
      </div>
      <div className="mgr-field">
        <label htmlFor="ct-depart">Khởi hành dự kiến *</label>
        <DateTimeField id="ct-depart" value={draft.departAt} min={today()} onChange={(v) => set({ departAt: v })} />
        <p className="mgr-hint">Khách mong muốn ngày {fmtDate(r.date)}.</p>
      </div>
      <div className="mgr-field">
        <label htmlFor="ct-arrive">Đến dự kiến *</label>
        <DateTimeField id="ct-arrive" value={draft.arriveAt} min={draft.departAt.slice(0, 10) || today()} onChange={(v) => set({ arriveAt: v })} />
      </div>
    </div>
  </>
);

export default PlanStep;
