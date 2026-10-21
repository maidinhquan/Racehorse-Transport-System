import React from 'react';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import type { BudgetKey, ContractDraft, TransportRequest } from '../../../types';
import { BUDGET_LABEL, defaultItems, fmtMoney, floorPrice, sumBudget, sumItems } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
}

/** Bước 2: dự toán nội bộ (chỉ Manager xem) + giá bán chính thức + tỷ lệ cọc */
export const PricingStep: React.FC<StepProps> = ({ request: r, draft, set }) => {
  const cost = sumBudget(draft.budget), floor = floorPrice(draft.budget), sale = sumItems(draft.items);
  const suggested = Math.max(floor, sumItems(defaultItems(r)));
  const margin = sale ? Math.round(((sale - cost) / sale) * 100) : 0;
  const below = sale < floor;
  const setItem = (i: number, amount: number) => set({ items: draft.items.map((x, j) => (j === i ? { ...x, amount } : x)) });

  return (
    <>
      <h3 className="mgr-card__title">2. Chi phí & giá bán</h3>
      <section className="mgr-inner">
        <div className="mgr-between"><h4>2A. Dự toán chi phí nội bộ</h4><StatusBadge tone="muted" label="Chỉ Manager xem" /></div>
        <p className="mgr-hint" style={{ marginTop: 0 }}>Chi phí gốc, giá sàn và giá gợi ý không xuất hiện trên hợp đồng gửi khách hàng.</p>
        <div className="mgr-form-grid">
          {(Object.keys(BUDGET_LABEL) as BudgetKey[]).map((k) => (
            <div className="mgr-field" key={k}>
              <label htmlFor={`ct-b-${k}`}>{BUDGET_LABEL[k]}{['VET', 'INSURANCE'].includes(k) ? ' *' : ''}</label>
              <input id={`ct-b-${k}`} className="mgr-input" type="number" min={0} step={10} value={draft.budget[k]}
                onChange={(e) => set({ budget: { ...draft.budget, [k]: Number(e.target.value) } })} />
            </div>
          ))}
        </div>
        <div className="mgr-kv mgr-ce__metrics">
          <div><span>Tổng chi phí dự kiến</span><b>{fmtMoney(cost)}</b></div>
          <div><span>Giá sàn (chi phí + 15%)</span><b>{fmtMoney(floor)}</b></div>
          <div><span>Giá gợi ý</span><b>{fmtMoney(suggested)}</b></div>
        </div>
      </section>

      <section className="mgr-inner">
        <div className="mgr-between"><h4>2B. Giá bán chính thức cho khách hàng</h4><StatusBadge tone="brand" label="Trên hợp đồng" /></div>
        <div className="mgr-form-grid">
          {draft.items.map((i, n) => (
            <div className="mgr-field" key={i.desc}>
              <label htmlFor={`ct-line-${n}`}>{i.desc}{i.required ? ' *' : ''}</label>
              <input id={`ct-line-${n}`} className="mgr-input" type="number" min={0} step={10} value={i.amount} onChange={(e) => setItem(n, Number(e.target.value))} />
            </div>
          ))}
        </div>
        <div className="mgr-kv mgr-ce__metrics">
          <div><span>Giá bán Manager quyết định</span><b>{fmtMoney(sale)}</b></div>
          <div><span>Biên lợi nhuận dự kiến</span><b className={margin < 13 ? 'mgr-bad' : 'mgr-ok'}>{margin}%</b></div>
          <div><span>Tiền cọc</span><b>{fmtMoney(Math.round((sale * draft.depositPct) / 100))}</b></div>
        </div>
        {below && (
          <div className="mgr-field" style={{ marginTop: 12 }}>
            <label htmlFor="ct-exception">Lý do bán dưới giá sàn *</label>
            <textarea id="ct-exception" className="mgr-textarea" rows={2} value={draft.exception} onChange={(e) => set({ exception: e.target.value })}
              placeholder="VD: Khách hàng chiến lược, ký 4 chuyến trong quý." />
          </div>
        )}
        <div className="mgr-form-grid" style={{ marginTop: 12 }}>
          <div className="mgr-field">
            <label htmlFor="ct-deposit">Tỷ lệ cọc (%) *</label>
            <input id="ct-deposit" className="mgr-input" type="number" min={1} max={100} step={1} value={draft.depositPct} onChange={(e) => set({ depositPct: Number(e.target.value) })} />
          </div>
          <div className="mgr-field full">
            <label htmlFor="ct-note">Ghi chú thương mại gửi khách hàng</label>
            <textarea id="ct-note" className="mgr-textarea" rows={2} value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder="VD: Giá đã gồm phí kiểm dịch tại sân bay đến." />
          </div>
        </div>
      </section>
    </>
  );
};

export default PricingStep;
