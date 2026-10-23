import React from 'react';
import type { ContractVersion, Horse, TransportRequest } from '../../types';
import { cityLabel, fmtDate, fmtDateTime, fmtMoney, isPast, timeLeft, versionState } from '../../hooks/customerRules';
import { PlaceBlock } from '../Common/Common';
import { TripStatusBadge } from '../TripStatusBadge/TripStatusBadge';
import './ContractBody.css';

/** Bảng khoản mục giá chính thức + tiền cọc + số dư */
export const ItemsTable: React.FC<{ v: ContractVersion }> = ({ v }) => {
  const dep = Math.round((v.total * v.depositPct) / 100);
  return (
    <div className="cus-table-wrap">
      <table className="cus-table cus-items">
        <thead><tr><th>Khoản mục</th><th className="num">Số tiền (VND)</th></tr></thead>
        <tbody>
          {v.items.map((i) => (
            <tr key={i.desc}><td>{i.desc}{i.required && <span className="cus-req-tag">Bắt buộc</span>}</td><td className="num">{fmtMoney(i.amount)}</td></tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td>Tổng giá trị hợp đồng</td><td className="num">{fmtMoney(v.total)}</td></tr>
          <tr className="muted"><td>Tiền cọc {v.depositPct}%</td><td className="num">{fmtMoney(dep)}</td></tr>
          <tr className="muted"><td>Số dư thanh toán sau bàn giao</td><td className="num">{fmtMoney(v.total - dep)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
};

/** Nội dung hợp đồng: A. Tổng quan vận chuyển, B. Giá chính thức, C. Thông tin hợp đồng & điều khoản */
export const ContractBody: React.FC<{ request: TransportRequest; v: ContractVersion; horses: Horse[] }> = ({ request: r, v }) => {
  const snapshot = v.snapshot;
  if (!snapshot || !v.terms?.length || !v.mode) return <div className="cus-note cus-note--yellow" role="alert">Chưa có đủ nội dung phiên bản hợp đồng từ máy chủ. Tải lại dữ liệu trước khi đồng ý điều khoản hoặc ký.</div>;
  const plan = { mode: v.mode };
  const detail = snapshot;
  const state = versionState(v);
  const dep = Math.round((v.total * v.depositPct) / 100);
  return (
    <div className="cus-stack">
      <div className="cus-card">
        <h3 className="cus-card__title">A. Tổng quan vận chuyển</h3>
        <div className="cus-kv">
          <div><span>Mã yêu cầu</span><b>{r.id}</b></div>
          <div><span>Ngày khách mong muốn</span><b>{fmtDate(detail.date)}</b></div>
          <div><span>Điểm đi</span><b>{cityLabel(detail.origin)}</b></div>
          <div><span>Điểm đến</span><b>{cityLabel(detail.destination)}</b></div>
          <div><span>Phương thức dự kiến</span><b>{plan.mode === 'AIR' ? 'Hàng không + đường bộ' : 'Đường bộ'}</b></div>
          <div><span>Số ngựa</span><b>{detail.horses.length}</b></div>
          <div><span>Khởi hành dự kiến</span><b>{fmtDateTime(v.departAt)}</b></div>
          <div><span>Đến dự kiến</span><b>{fmtDateTime(v.arriveAt)}</b></div>
        </div>
        <div className="cus-grid2" style={{ marginTop: 14 }}>
          <div><div className="cus-eyebrow">Điểm nhận</div><PlaceBlock place={detail.pickup} who="Người liên hệ" /></div>
          <div><div className="cus-eyebrow">Điểm giao</div><PlaceBlock place={detail.delivery} who="Người nhận" /></div>
        </div>
        <div className="cus-eyebrow" style={{ marginTop: 14 }}>Ngựa</div>
        <ul className="cus-contract__horses">
          {detail.horses.map(h => <li key={h.id}><b>{h.name}</b> • Microchip {h.microchip || '—'} • Hộ chiếu {h.passportNo || '—'}</li>)}
        </ul>
        <div className="cus-eyebrow" style={{ marginTop: 10 }}>Yêu cầu chăm sóc đặc biệt</div>
        <p className="cus-lines">{detail.careNotes || <span className="cus-muted">Không có.</span>}</p>
      </div>

      <div className="cus-card cus-contract__price">
        <h3 className="cus-card__title">
          <span><span className="cus-official">Giá hợp đồng chính thức</span><br />B. Giá chính thức</span>
          <span className="cus-contract__total">{fmtMoney(v.total)} <small>VND</small></span>
        </h3>
        <ItemsTable v={v} />
        <div className="cus-eyebrow" style={{ marginTop: 14 }}>Điều kiện thanh toán</div>
        <ul className="cus-rule-list">
          <li>Hạn hoàn tất cho thanh toán cọc, xác minh và ký OTP: {fmtDateTime(v.validUntil)} (Manager có thể gia hạn).</li>
          <li>Khách hàng thanh toán cọc trước; nút ký OTP chỉ mở sau khi tiền cọc ({fmtMoney(dep)}) được xác minh đầy đủ.</li>
          <li>Hợp đồng có hiệu lực và chuyến đi được tạo chỉ sau khi ký OTP thành công.</li>
          <li>Số dư thanh toán trong 24 giờ sau khi bàn giao có xác minh.</li>
        </ul>
        {v.note && <div className="cus-note cus-note--grey"><div><b>Ghi chú của Manager</b>{v.note}</div></div>}
      </div>

      <div className="cus-card">
        <h3 className="cus-card__title">C. Thông tin hợp đồng <TripStatusBadge kind="contract" status={state} /></h3>
        <div className="cus-kv">
          <div><span>Số hợp đồng</span><b>{v.number}</b></div>
          <div><span>Phiên bản</span><b>v{v.v}</b></div>
          <div><span>Ngày phát hành</span><b>{fmtDateTime(v.issuedAt)}</b></div>
          <div>
            <span>Hạn chung cọc / ký OTP</span>
            <b>{v.signedAt ? `Đã ký ${fmtDateTime(v.signedAt)}` : <>{fmtDateTime(v.validUntil)} <small className={isPast(v.validUntil) ? 'cus-bad' : 'cus-muted'}>({timeLeft(v.validUntil)})</small></>}</b>
          </div>
          <div><span>Tiền cọc</span><b>{v.depositPct}% • {fmtMoney(dep)}</b></div>
          {v.termsAcceptedAt && <div><span>Đồng ý điều khoản</span><b>{fmtDateTime(v.termsAcceptedAt)}</b></div>}
        </div>
        <div className="cus-eyebrow" style={{ marginTop: 14 }}>Điều khoản</div>
        <ol className="cus-terms">{v.terms.map((t, i) => <li key={i}><b>{t.title}</b>: {t.text}</li>)}</ol>
      </div>
    </div>
  );
};

export default ContractBody;
