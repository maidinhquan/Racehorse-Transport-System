import React from 'react';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import type { ContractDraft, TransportRequest } from '../../../types';
import { fmtMoney, sumItems } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
}

/** Bước 2: giá bán chính thức + tỷ lệ cọc */
export const PricingStep: React.FC<StepProps> = ({ draft, set }) => {
  const currency = 'VND';
  const sale = sumItems(draft.items);

  const setItem = (i: number, amount: number) =>
    set({ items: draft.items.map((x, j) => (j === i ? { ...x, amount } : x)) });

  return (
    <>
      <h3 className="mgr-card__title">2. Giá bán</h3>
      <section className="mgr-inner">
        <div className="mgr-between">
          <h4>Giá bán chính thức cho khách hàng</h4>
          <StatusBadge tone="brand" label="Trên hợp đồng" />
        </div>
        <p className="mgr-hint" style={{ marginTop: 0 }}>
          Manager tự nhập giá bán các hạng mục thương mại bên dưới. Các khoản bắt buộc (*) cần nhập giá lớn hơn 0 trước khi phát hành hợp đồng.
        </p>
        <div className="mgr-form-grid">
          {draft.items.map((i, n) => (
            <div className="mgr-field" key={i.desc}>
              <label htmlFor={`ct-line-${n}`}>
                {i.desc}
                {i.required ? ' *' : ''}
              </label>
              <input
                id={`ct-line-${n}`}
                className="mgr-input"
                type="number"
                min={0}
                step={100000}
                value={i.amount === 0 ? '' : i.amount}
                placeholder="Nhập giá bán..."
                onChange={(e) => setItem(n, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
        <div className="mgr-kv mgr-ce__metrics">
          <div><span>Giá bán Manager quyết định</span><b>{fmtMoney(sale, currency)}</b></div>
          <div><span>Tiền cọc</span><b>{fmtMoney(Math.round((sale * draft.depositPct) / 100), currency)}</b></div>
        </div>
        <div className="mgr-form-grid" style={{ marginTop: 12 }}>
          <div className="mgr-field">
            <label htmlFor="ct-deposit">Tỷ lệ cọc (%) *</label>
            <input
              id="ct-deposit"
              className="mgr-input"
              type="number"
              min={1}
              max={100}
              step={1}
              value={draft.depositPct}
              onChange={(e) => set({ depositPct: Number(e.target.value) })}
            />
          </div>
          <div className="mgr-field full">
            <label htmlFor="ct-note">Ghi chú thương mại gửi khách hàng</label>
            <textarea
              id="ct-note"
              className="mgr-textarea"
              rows={2}
              value={draft.note}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="VD: Giá đã gồm phí kiểm dịch tại sân bay đến."
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default PricingStep;
