import React from 'react';
import type { ContractItem, ContractTerm, CustomerInfo, HorseRef, TransportMode, TransportRequest } from '../../types';
import { MODE_LABEL, cityLabel, fmtDateTime, fmtMoney, sumItems } from '../../hooks/managerRules';
import './ContractPreview.css';

export interface ContractContent {
  snapshot?: import('../../../customer/types').ContractSnapshot;
  ref: string;
  mode?: TransportMode;
  modeDeferred?: boolean;
  departAt: string;
  arriveAt: string;
  items: ContractItem[];
  depositPct: number;
  terms: ContractTerm[];
  note?: string;
  issuedAt?: string;
  validUntil?: string;
  signedAt?: string;
}

/** Nội dung hợp đồng đúng như khách hàng nhận (không gồm dự toán nội bộ) */
export const ContractPreview: React.FC<{ request: TransportRequest; customer?: CustomerInfo; horses: HorseRef[]; content: ContractContent }> = ({ request: r, customer: c, horses, content: x }) => {
  const snapshot = x.snapshot;
  if (x.issuedAt && !snapshot) return <p role="alert">Chưa có nội dung chốt của phiên bản hợp đồng. Tải lại dữ liệu để xem.</p>;
  r = snapshot ? { ...r, ...snapshot, horses: snapshot.horses.map(h => h.id) } : r;
  c = snapshot?.customer ?? c;
  horses = snapshot ? snapshot.horses : horses;
  const total = sumItems(x.items), deposit = Math.round((total * x.depositPct) / 100);
  return (
    <article className="mgr-contract">
      <header className="mgr-contract__head">
        <div><div className="mgr-contract__brand">CBN Transport</div><h3>Hợp đồng vận chuyển ngựa • {x.ref}</h3></div>
        <div className="mgr-contract__meta">
          {x.issuedAt && <span>Phát hành {fmtDateTime(x.issuedAt)}</span>}
          {x.validUntil && !x.signedAt && <span>Hạn chung {fmtDateTime(x.validUntil)}</span>}
          {x.signedAt && <span>Ký OTP {fmtDateTime(x.signedAt)}</span>}
        </div>
      </header>
      <section>
        <h4>A. Các bên & đối tượng</h4>
        <div className="mgr-kv">
          <div><span>Bên thuê (khách hàng)</span><b>{c?.company}</b><div className="mgr-muted">{c?.name} • {c?.email}</div></div>
          <div><span>Bên vận chuyển</span><b>CBN Transport</b><div className="mgr-muted">Đại diện: Logistics Manager</div></div>
          <div><span>Ngựa ({r.horses.length})</span><b>{r.horses.map((id) => horses.find((h) => h.id === id)?.name ?? id).join(', ')}</b></div>
          <div><span>Yêu cầu</span><b>{r.id}</b></div>
        </div>
      </section>
      <section>
        <h4>B. Phương án vận chuyển</h4>
        <div className="mgr-kv">
          <div><span>Tuyến</span><b>{cityLabel(r.origin)} → {cityLabel(r.destination)}</b></div>
          <div><span>Phương thức</span><b>{x.modeDeferred ? 'Coordinator quyết định khi lập kế hoạch vận chuyển' : x.mode ? MODE_LABEL[x.mode] : 'Chưa ghi nhận'}</b></div>
          <div><span>Điểm nhận</span><b>{r.pickup.name}</b><div className="mgr-muted">{r.pickup.address}</div></div>
          <div><span>Điểm giao</span><b>{r.delivery.name}</b><div className="mgr-muted">{r.delivery.address} • người nhận {r.delivery.contact}</div></div>
          <div><span>Khởi hành dự kiến</span><b>{fmtDateTime(x.departAt)}</b></div>
          <div><span>Đến dự kiến</span><b>{fmtDateTime(x.arriveAt)}</b></div>
        </div>
      </section>
      <section>
        <h4>C. Giá & thanh toán</h4>
        <table className="mgr-contract__price">
          <tbody>
            {x.items.map((i) => <tr key={i.desc}><td>{i.desc}</td><td className="mgr-num">{fmtMoney(Number(i.amount) || 0)}</td></tr>)}
            <tr className="total"><td>Tổng giá hợp đồng</td><td className="mgr-num">{fmtMoney(total)}</td></tr>
            <tr><td>Tiền cọc ({x.depositPct}%) – thanh toán trong hạn ghi trong hợp đồng</td><td className="mgr-num">{fmtMoney(deposit)}</td></tr>
            <tr><td>Số dư – thanh toán trong 24 giờ sau nghiệm thu</td><td className="mgr-num">{fmtMoney(total - deposit)}</td></tr>
          </tbody>
        </table>
        {x.note && <p className="mgr-hint">Ghi chú thương mại: {x.note}</p>}
      </section>
      <section>
        <h4>D. Điều khoản ({x.terms.length})</h4>
        <ol className="mgr-contract__terms">
          {x.terms.map((t, i) => <li key={i}><b>{t.title || `Điều ${i + 1}`}.</b> {t.text}</li>)}
        </ol>
      </section>
    </article>
  );
};

export default ContractPreview;
