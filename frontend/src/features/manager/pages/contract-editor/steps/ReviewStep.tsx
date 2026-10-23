import React from 'react';
import { ContractPreview } from '../../../components/ContractPreview/ContractPreview';
import { StatusBadge } from '../../../components/StatusBadge/StatusBadge';
import type { ContractDraft, CustomerInfo, HorseRef, TransportRequest } from '../../../types';
import { MODE_LABEL, curVersion, fmtDateTime, fmtMoney, sumItems } from '../../../hooks/managerRules';

interface StepProps {
  request: TransportRequest;
  draft: ContractDraft;
  customer?: CustomerInfo;
  horses: HorseRef[];
}

/** Bước 4: xem trước đúng nội dung khách nhận + checklist trước khi phát hành */
export const ReviewStep: React.FC<StepProps> = ({ request: r, draft, customer, horses }) => {
  const prev = curVersion(r), v = (prev?.v ?? 0) + 1, total = sumItems(draft.items);
  const checks: Array<[string, string]> = [
    ['Phương án vận chuyển', `${MODE_LABEL[draft.mode]} • ${fmtDateTime(draft.departAt)} → ${fmtDateTime(draft.arriveAt)}`],
    ['Ngựa lấy từ yêu cầu', `${r.horses.length} ngựa – Manager không sửa dữ liệu ngựa trong hợp đồng`],
    ['Giá & cọc', `${fmtMoney(total)} • cọc ${draft.depositPct}% (${fmtMoney(Math.round((total * draft.depositPct) / 100))})`],
    ['Điều khoản', `12 điều khoản cơ bản${draft.terms.length > 12 ? ` + ${draft.terms.length - 12} bổ sung` : ''}`],
    ['Hạn chung', prev ? `Phát hành v${v} có hạn hoàn tất do máy chủ xác định; v${prev.v} được lưu trong lịch sử` : 'Khách thanh toán cọc, chờ xác minh và ký OTP trước hạn ghi trong hợp đồng'],
  ];
  return (
    <>
      <h3 className="mgr-card__title">4. Kiểm tra cuối & phát hành</h3>
      <p className="mgr-hint" style={{ marginTop: 0 }}>Bản dưới đây đúng là nội dung khách hàng nhận sau khi phát hành.</p>
      <div className="mgr-between" style={{ margin: '8px 0' }}><StatusBadge tone="muted" label="Bản xem trước • chưa phát hành" /><b>CT-{r.id.slice(4)} v{v}</b></div>
      <ContractPreview request={r} customer={customer} horses={horses}
        content={{ ref: `CT-${r.id.slice(4)} v${v}`, mode: draft.mode, departAt: draft.departAt, arriveAt: draft.arriveAt, items: draft.items, depositPct: draft.depositPct, terms: draft.terms, note: draft.note }} />
      <div className="mgr-inner" style={{ marginTop: 14 }}>
        <h4>Nội dung cần xác nhận</h4>
        {checks.map(([a, b], i) => <div key={a} className="mgr-row"><div><b>{String(i + 1).padStart(2, '0')}. {a}</b><span>{b}</span></div></div>)}
        <p className="mgr-hint">Nút Phát hành kiểm tra trường bắt buộc, giá sàn và nội dung điều khoản trước khi lưu.</p>
      </div>
    </>
  );
};

export default ReviewStep;
