import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import type { BudgetKey, ContractDraft, TransportRequest } from '../../../types';
import { BUDGET_LABEL, defaultBudget, fmtMoney, floorPrice, sumBudget, sumItems } from '../../../hooks/managerRules';
import { managerApi } from '../../../api/managerApi';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
}

/** Bước 2: dự toán nội bộ (chỉ Manager xem) + giá bán chính thức + tỷ lệ cọc */
export const PricingStep: React.FC<StepProps> = ({ request: r, draft, set }) => {
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [estimateSynced, setEstimateSynced] = useState(false);
  const [currency, setCurrency] = useState<string>('VND');

  const cost = sumBudget(draft.budget);
  const floor = floorPrice(draft.budget);
  const sale = sumItems(draft.items);
  const suggested = Math.max(floor, Math.ceil(cost * 1.25));
  const margin = sale ? Math.round(((sale - cost) / sale) * 100) : 0;
  const below = sale < floor;

  const setItem = (i: number, amount: number) =>
    set({ items: draft.items.map((x, j) => (j === i ? { ...x, amount } : x)) });

  const fetchEstimate = async () => {
    setLoadingEstimate(true);
    try {
      // Đảm bảo thời gian tương lai hợp lệ (chuẩn bị >= 7 ngày + 24h) để Backend C# không báo lỗi INVALID_DEADLINE
      const nowMs = Date.now();
      const minDepMs = nowMs + 10 * 86400000;
      const parsedDep = draft.departAt ? Date.parse(draft.departAt.replace(' ', 'T')) : NaN;
      const depMs = !isNaN(parsedDep) && parsedDep > minDepMs ? parsedDep : minDepMs;
      const delMs = depMs + (draft.mode === 'AIR' ? 2 : 3) * 86400000;

      const plan = await managerApi.getCostEstimate(r.id, {
        transportMode: draft.mode,
        departureAt: new Date(depMs).toISOString(),
        deliveryAt: new Date(delMs).toISOString(),
      });

      if (plan && plan.costs) {
        set({
          budget: {
            TRANSPORT: Math.round(plan.costs.transport),
            PROCEDURE: Math.round(plan.costs.permit),
            VET: Math.round(plan.costs.vet),
            INSURANCE: Math.round(plan.costs.insurance),
            STAFF: Math.round(plan.costs.crew),
          },
        });
        setEstimateSynced(true);
        if (plan.currency) {
          setCurrency(plan.currency);
        }
      } else {
        // Nếu là đơn mock hoặc chưa có trong DB, tự động dùng định mức chuẩn VND
        if (sumBudget(draft.budget) < 100000) {
          set({ budget: defaultBudget(r) });
        }
        setEstimateSynced(false);
      }
    } catch (err) {
      console.warn('Lỗi gọi API cost-estimate:', err);
      if (sumBudget(draft.budget) < 100000) {
        set({ budget: defaultBudget(r) });
      }
      setEstimateSynced(false);
    } finally {
      setLoadingEstimate(false);
    }
  };

  useEffect(() => {
    // Nếu ngân sách đang lưu số tiền USD nhỏ từ mock cũ (< 100,000 VND), quy đổi ngay sang VND
    if (sumBudget(draft.budget) < 100000) {
      set({ budget: defaultBudget(r) });
    }
    void fetchEstimate();
  }, [r.id]);

  return (
    <>
      <h3 className="mgr-card__title">2. Chi phí & giá bán</h3>
      <section className="mgr-inner">
        <div className="mgr-between">
          <h4>2A. Dự toán chi phí nội bộ</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {loadingEstimate && <span className="mgr-muted" style={{ fontSize: 13 }}>Đang tính toán từ API...</span>}
            {estimateSynced ? (
              <StatusBadge tone="ok" label="Đã lấy từ Backend cost-estimate" />
            ) : (
              <StatusBadge tone="brand" label="Định mức chi phí VND" />
            )}
            <button
              type="button"
              className="mgr-btn mgr-btn--sm"
              onClick={() => void fetchEstimate()}
              disabled={loadingEstimate}
              title="Gọi lại API POST /api/manager/requests/{id}/cost-estimate"
            >
              {loadingEstimate ? 'Đang tính...' : '🔄 Tính lại từ Backend'}
            </button>
            <StatusBadge tone="muted" label="Chỉ Manager xem" />
          </div>
        </div>
        <p className="mgr-hint" style={{ marginTop: 0 }}>
          Chi phí gốc được tính tự động từ hệ thống Backend C# qua API cost-estimate (đã gộp cước xe và nhiên liệu thành Phí vận chuyển). Chi phí gốc, giá sàn và giá gợi ý không xuất hiện trên hợp đồng gửi khách hàng.
        </p>
        <div className="mgr-form-grid">
          {(Object.keys(BUDGET_LABEL) as BudgetKey[]).map((k) => (
            <div className="mgr-field" key={k}>
              <label htmlFor={`ct-b-${k}`}>
                {BUDGET_LABEL[k]}
                {['VET', 'INSURANCE'].includes(k) ? ' *' : ''}
              </label>
              <input
                id={`ct-b-${k}`}
                className="mgr-input"
                type="number"
                min={0}
                step={100000}
                value={draft.budget[k] ?? 0}
                onChange={(e) => set({ budget: { ...draft.budget, [k]: Number(e.target.value) } })}
              />
            </div>
          ))}
        </div>
        <div className="mgr-kv mgr-ce__metrics">
          <div><span>Tổng chi phí dự kiến</span><b>{fmtMoney(cost, currency)}</b></div>
          <div><span>Giá sàn (chi phí + 15%)</span><b>{fmtMoney(floor, currency)}</b></div>
          <div><span>Giá gợi ý (chi phí + 25%)</span><b>{fmtMoney(suggested, currency)}</b></div>
        </div>
      </section>

      <section className="mgr-inner">
        <div className="mgr-between">
          <h4>2B. Giá bán chính thức cho khách hàng</h4>
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
          <div><span>Biên lợi nhuận dự kiến</span><b className={margin < 13 ? 'mgr-bad' : 'mgr-ok'}>{margin}%</b></div>
          <div><span>Tiền cọc</span><b>{fmtMoney(Math.round((sale * draft.depositPct) / 100), currency)}</b></div>
        </div>
        {below && (
          <div className="mgr-field" style={{ marginTop: 12 }}>
            <label htmlFor="ct-exception">Lý do bán dưới giá sàn *</label>
            <textarea
              id="ct-exception"
              className="mgr-textarea"
              rows={2}
              value={draft.exception}
              onChange={(e) => set({ exception: e.target.value })}
              placeholder="VD: Khách hàng chiến lược, ký 4 chuyến trong quý."
            />
          </div>
        )}
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
