import React from 'react';
import type { ContractDraft, ContractTerm } from '../../../types';

interface StepProps {
  draft: ContractDraft;
  set: (patch: Partial<ContractDraft>) => void;
}

const GROUPS = ['Pháp lý, đối tượng & phạm vi', 'Giá, thanh toán & trách nhiệm', 'Sự cố, nghiệm thu & hiệu lực'];

/** Bước 3: 12 điều khoản cơ bản (sửa nội dung) + điều khoản bổ sung */
export const TermsStep: React.FC<StepProps> = ({ draft, set }) => {
  const setTerm = (i: number, patch: Partial<ContractTerm>) => set({ terms: draft.terms.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const extra = draft.terms.slice(12);
  return (
    <>
      <h3 className="mgr-card__title">3. Điều khoản hợp đồng</h3>
      <p className="mgr-hint" style={{ marginTop: 0 }}>Chỉ biên soạn nội dung pháp lý. Giá, tỷ lệ cọc và ghi chú thương mại đặt ở Bước 2. Hợp đồng đã ký OTP không thể sửa.</p>
      {GROUPS.map((g, gi) => (
        <details key={g} className="mgr-acc" open={gi === 0}>
          <summary><div><b>{g}</b><small>Điều {gi * 4 + 1}–{gi * 4 + 4}</small></div><span className="mgr-muted">Mở / thu gọn</span></summary>
          <div className="mgr-acc__body">
            {draft.terms.slice(gi * 4, gi * 4 + 4).map((t, k) => {
              const i = gi * 4 + k;
              return (
                <div className="mgr-field" key={i}>
                  <label htmlFor={`ct-term-${i}`}>Điều {i + 1}. {t.title} *</label>
                  <textarea id={`ct-term-${i}`} className="mgr-textarea" rows={3} value={t.text} onChange={(e) => setTerm(i, { text: e.target.value })} />
                </div>
              );
            })}
          </div>
        </details>
      ))}
      <div className="mgr-between" style={{ marginTop: 16 }}>
        <div><b>Điều khoản bổ sung ({extra.length})</b><p className="mgr-hint" style={{ margin: '2px 0 0' }}>Thêm điều khoản riêng cho yêu cầu này khi cần.</p></div>
        <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => set({ terms: [...draft.terms, { title: '', text: '' }] })}>＋ Thêm điều khoản</button>
      </div>
      {extra.map((t, k) => {
        const i = 12 + k;
        return (
          <div key={i} className="mgr-inner" style={{ marginTop: 10 }}>
            <div className="mgr-between"><b>Điều {i + 1}</b><button type="button" className="mgr-link" onClick={() => set({ terms: draft.terms.filter((_, j) => j !== i) })}>Xóa</button></div>
            <div className="mgr-field">
              <label htmlFor={`ct-term-title-${i}`}>Tiêu đề *</label>
              <input id={`ct-term-title-${i}`} className="mgr-input" value={t.title} onChange={(e) => setTerm(i, { title: e.target.value })} placeholder="VD: Người đi kèm của khách hàng" />
            </div>
            <div className="mgr-field">
              <label htmlFor={`ct-term-${i}`}>Nội dung *</label>
              <textarea id={`ct-term-${i}`} className="mgr-textarea" rows={3} value={t.text} onChange={(e) => setTerm(i, { text: e.target.value })} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default TermsStep;
