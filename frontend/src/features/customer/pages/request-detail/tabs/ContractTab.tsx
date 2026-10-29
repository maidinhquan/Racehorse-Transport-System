import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import {
  canAcceptTerms,
  canPayDeposit,
  canRequestContractChange,
  canSign,
  ctRef,
  curVersion,
  depositAmount,
  depositState,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  signBlock,
  today,
  versionState,
} from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { ContractBody } from '../../../components/ContractBody/ContractBody';
import { DateField } from '../../../components/DateField/DateField';
import { DemoPanel } from '../../../components/DemoPanel/DemoPanel';
import { AcceptTermsModal } from '../../../components/Modals';
import { LockedCard, Note } from '../../../components/Common/Common';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

type ChangeItem = 'date' | 'notes' | 'commercial' | 'other';
const CHANGE_ITEMS: Array<[ChangeItem, string]> = [
  ['date', 'Ngày vận chuyển mong muốn'], ['notes', 'Yêu cầu chăm sóc đặc biệt'], ['commercial', 'Điều khoản thương mại (giá, thanh toán)'], ['other', 'Thay đổi khác'],
];

/** Tab Hợp đồng & chi phí: trình tự 1 đồng ý điều khoản → 2 ký OTP → 3 đặt cọc; yêu cầu sửa ngay trên trang */
export const ContractTab: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { horses, actions } = useCustomer();
  const [termsOpen, setTermsOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(params.get('change') === '1');
  const [items, setItems] = useState<Partial<Record<ChangeItem, string>>>({});
  const [text, setText] = useState('');
  const v = curVersion(r);

  if (['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'].includes(r.status) || (r.status === 'CANCELLED' && !v)) {
    return (
      <LockedCard title="Chưa có hợp đồng"
        text={r.status === 'REJECTED' ? 'Yêu cầu bị từ chối nên không có hợp đồng.' : 'Hợp đồng với giá chính thức chỉ được soạn sau khi Logistics Manager chấp nhận yêu cầu.'} />
    );
  }
  if (!v) {
    return (
      <div className="cus-grid-main">
        <LockedCard icon="clock" title="Đang soạn hợp đồng" text="Logistics Manager đang soạn hợp đồng với giá chính thức. Hạn hoàn tất được ghi trong từng phiên bản hợp đồng." />
        <DemoPanel request={r} />
      </div>
    );
  }

  const state = versionState(v), ds = depositState(r), paid = ds === 'VERIFIED';
  const live = state === 'ISSUED' && ['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status);
  const canChange = canRequestContractChange(r);

  const submitChange = async () => {
    const res = await actions.requestContractChange(r.id, {
      text,
      proposedDate: 'date' in items ? items.date ?? '' : undefined,
      proposedNotes: items.notes?.trim() || undefined,
      commercial: items.commercial?.trim() || undefined,
      other: items.other?.trim() || undefined,
    });
    if (res.ok) { setChangeOpen(false); setItems({}); setText(''); }
  };

  const status: Record<string, [('blue' | 'yellow' | 'grey' | 'green'), string, string]> = {
    ISSUED: v.termsAcceptedAt ? ['blue', 'Đã đồng ý điều khoản – ký OTP', `Xem lại và ký ${ctRef(v)} trước ${fmtDateTime(v.validUntil)}. Sau khi ký bạn mới thanh toán cọc.`]
      : ['blue', 'Xem hợp đồng của bạn', 'Đồng ý điều khoản, ký OTP, sau đó thanh toán cọc qua VNPAY.'],
    SIGNED: ['blue', 'Đã ký – chờ xác minh tiền cọc', 'Nội dung đã ký chỉ để xem. Yêu cầu chỉ được kích hoạt và tạo chuyến sau khi backend xác minh đủ tiền cọc.'],
    CHANGES_REQUESTED: ['yellow', 'Đã yêu cầu sửa – chờ Manager', 'Phiên bản này không thể ký trong khi Manager xem xét yêu cầu sửa của bạn.'],
    EXPIRED: ['grey', 'Phiên bản hợp đồng đã hết hạn', `${ctRef(v)} hết hạn lúc ${fmtDateTime(v.validUntil)} và không thể ký. Yêu cầu vẫn còn hiệu lực – CBN Transport có thể gia hạn hoặc phát hành phiên bản mới.`],
    EFFECTIVE: ['green', 'Hợp đồng có hiệu lực', `Ký OTP lúc ${fmtDateTime(v.signedAt)}. Phiên bản đã ký chỉ để xem.`],
    FULFILLED: ['grey', 'Hợp đồng đã hoàn thành – hết hiệu lực', 'Mọi nghĩa vụ chính đã hoàn tất và yêu cầu đã đóng. Hợp đồng được lưu để tham chiếu.'],
    SUPERSEDED: ['grey', 'Đã thay thế', ''],
  };
  const [tone, title, msg] = status[state] ?? ['grey', 'Hợp đồng', 'Đang cập nhật trạng thái.'];

  return (
    <>
      <Note tone={tone} title={title}>{msg}</Note>
      {r.status === 'CANCELLATION_REQUESTED' && r.cancelRequest && (
        <Note tone="yellow" title={`Đã yêu cầu hủy • ${fmtDateTime(r.cancelRequest.at)}`}>{r.cancelRequest.reason} – CBN Transport đối soát thanh toán trước khi hủy chính thức.</Note>
      )}

      {changeOpen && canChange && (
        <div className="cus-card cus-rc" style={{ marginTop: 16 }}>
          <h3 className="cus-card__title">
            <span><span className="cus-eyebrow">Đề nghị thay đổi • {ctRef(v)}</span><br />Yêu cầu sửa hợp đồng</span>
            <button type="button" className="cus-btn cus-btn--sm" onClick={() => setChangeOpen(false)}>Đóng</button>
          </h3>
          <div className="cus-field">
            <label htmlFor="rc-add">Bạn muốn sửa nội dung nào?</label>
            <select id="rc-add" className="cus-select" value="" onChange={(e) => { const k = e.target.value as ChangeItem; if (k) setItems((x) => ({ ...x, [k]: '' })); }}>
              <option value="">— Chọn mục cần sửa —</option>
              {CHANGE_ITEMS.filter(([k]) => !(k in items)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {(Object.keys(items) as ChangeItem[]).map((k) => (
            <div key={k} className="cus-rc__item">
              <div className="cus-rc__item-head">
                <b>{CHANGE_ITEMS.find((x) => x[0] === k)?.[1]}</b>
                <button type="button" className="cus-link" onClick={() => setItems((x) => { const n = { ...x }; delete n[k]; return n; })}>Bỏ</button>
              </div>
              {k === 'date' ? (
                <>
                  <p className="cus-muted" style={{ margin: '0 0 6px' }}>Hiện tại: {fmtDate(r.date)}</p>
                  <DateField value={items.date ?? ''} min={today()} onChange={(d) => setItems((x) => ({ ...x, date: d }))} />
                </>
              ) : (
                <textarea className="cus-textarea" rows={2} value={items[k] ?? ''} onChange={(e) => setItems((x) => ({ ...x, [k]: e.target.value }))}
                  placeholder={k === 'notes' ? 'Yêu cầu chăm sóc mới' : k === 'commercial' ? 'VD: Đề nghị giảm phí thủ tục' : 'Mô tả thay đổi'} />
              )}
            </div>
          ))}
          <div className="cus-field" style={{ marginTop: 12 }}>
            <label htmlFor="rc-text">Giải thích nội dung cần sửa *</label>
            <textarea id="rc-text" className="cus-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="VD: Chúng tôi đã có giấy phép nhập khẩu còn hiệu lực, đề nghị giảm phí thủ tục." />
          </div>
          <p className="cus-muted">Đổi tuyến hoặc số lượng ngựa cần Manager xét duyệt lại yêu cầu; hãy mô tả ở trên. {ctRef(v)} không thể ký cho tới khi Manager trả lời hoặc phát hành phiên bản mới.</p>
          <div className="cus-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="cus-btn" onClick={() => setChangeOpen(false)}>Hủy</button>
            <button type="button" className="cus-btn cus-btn--solid" onClick={submitChange}>Gửi yêu cầu sửa</button>
          </div>
        </div>
      )}

      {v.change && (
        <Note tone={v.change.response ? 'grey' : 'yellow'} title={`Yêu cầu sửa của bạn • ${fmtDateTime(v.change.at)}`} icon="chat">
          {v.change.text}
          {[v.change.proposedDate && `Ngày đề xuất: ${fmtDate(v.change.proposedDate)}`, v.change.proposedNotes && `Chăm sóc: ${v.change.proposedNotes}`,
            v.change.commercial && `Thương mại: ${v.change.commercial}`, v.change.other && `Khác: ${v.change.other}`].filter(Boolean).map((x) => <div key={String(x)}>{x}</div>)}
          {v.change.response ? <div><b style={{ display: 'inline' }}>Manager trả lời • {fmtDateTime(v.change.response.at)}:</b> {v.change.response.text}</div> : <div>Đang chờ Manager phản hồi.</div>}
        </Note>
      )}

      <div className="cus-grid-main" style={{ marginTop: 16 }}>
        <div className="cus-stack">
          {state === 'ISSUED' && (
            <div className="cus-card">
              <div className="cus-eyebrow">Trình tự ký</div>
              <ol className="cus-sign-steps">
                <li className={v.termsAcceptedAt ? 'done' : 'now'}><b>1. Đồng ý điều khoản hợp đồng</b><span>{v.termsAcceptedAt ? `Đã đồng ý ${fmtDateTime(v.termsAcceptedAt)}` : 'Xem giá và điều khoản bên dưới'}</span></li>
                <li className={paid ? 'done' : v.termsAcceptedAt ? 'now' : ''}><b>2. Thanh toán cọc – {fmtMoney(depositAmount(r))} ({v.depositPct}%)</b>
                  <span>{paid ? 'Đã xác minh' : ds === 'PENDING' ? 'Đang xác minh – chứng từ thanh toán chưa phải là xác minh' : ds === 'FAILED' ? 'Lần thanh toán trước thất bại – có thể thanh toán lại' : 'QR Sandbox'}</span></li>
                <li className={paid ? 'now' : ''}><b>3. Ký bằng OTP</b><span>{paid ? `Đã mở – ký trước ${fmtDateTime(v.validUntil)}` : 'Mở sau khi tiền cọc được xác minh'}</span></li>
              </ol>
            </div>
          )}
          <ContractBody request={r} v={v} horses={horses} />
          <div className="cus-card">
            <div className="cus-ct-actions">
              <div>
                <button type="button" className="cus-btn" onClick={() => navigate(`/customer/requests/${r.id}/contract/v/${v.v}`)}><Icon name="file" />Xem hợp đồng đầy đủ</button>
                {canChange && !changeOpen && <button type="button" className="cus-btn" onClick={() => setChangeOpen(true)}><Icon name="chat" />{state === 'EXPIRED' ? 'Yêu cầu phiên bản cập nhật' : 'Yêu cầu sửa'}</button>}
              </div>
              <div>
                {canAcceptTerms(r) && <button type="button" className="cus-btn cus-btn--solid" onClick={() => setTermsOpen(true)}>Đồng ý điều khoản</button>}
                {canPayDeposit(r) && <button type="button" className="cus-btn cus-btn--solid" onClick={() => navigate(`/customer/requests/${r.id}/deposit`)}>{ds === 'FAILED' ? 'Thanh toán lại' : 'Thanh toán cọc'}</button>}
                {live && (
                  <button type="button" className={`cus-btn ${canSign(r) ? 'cus-btn--solid' : ''}`} disabled={!canSign(r)} title={signBlock(r)}
                    onClick={() => navigate(`/customer/requests/${r.id}/sign`)}>
                    {canSign(r) ? 'Ký hợp đồng bằng OTP' : 'Ký OTP (chưa đủ điều kiện)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="cus-stack">
          <div className="cus-card">
            <div className="cus-eyebrow">Tóm tắt</div>
            <div className="cus-summary" style={{ marginTop: 10 }}>
              <div className="hl"><span>Tổng hợp đồng</span><b>{fmtMoney(v.total)}</b></div>
              <div><span>Tiền cọc ({v.depositPct}%)</span><b>{fmtMoney(depositAmount(r))}</b></div>
              <div><span>Số dư</span><b>{fmtMoney(v.total - depositAmount(r))}</b></div>
            </div>
          </div>
          <div className="cus-card">
            <h3 className="cus-card__title">Các phiên bản <span className="cus-muted">{r.versions.length} phiên bản</span></h3>
            <ul className="cus-versions">
              {[...r.versions].reverse().map((x) => (
                <li key={x.v}>
                  <button type="button" onClick={() => navigate(`/customer/requests/${r.id}/contract/v/${x.v}`)}>
                    <div className="cus-versions__top"><b>{ctRef(x)}</b>{x === v && <span className="cus-req-tag">Hiện hành</span>}<TripStatusBadge kind="contract" status={versionState(x)} /></div>
                    <div className="cus-versions__meta"><span>{fmtMoney(x.total)}</span><span>Phát hành {fmtDateTime(x.issuedAt)}</span>{x.signedAt ? <span>Ký {fmtDateTime(x.signedAt)}</span> : <span>Hạn {fmtDateTime(x.validUntil)}</span>}</div>
                    {x.change && <div className="cus-versions__note">Yêu cầu sửa: {x.change.text}</div>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="cus-card">
            <div className="cus-eyebrow">Quy tắc hợp đồng</div>
            <ul className="cus-rule-list" style={{ marginTop: 8 }}>
              <li>Thanh toán + xác minh cọc rồi ký OTP trong hạn hoàn tất ghi trong hợp đồng. Manager có thể gia hạn.</li>
              <li>Chỉ ký được phiên bản hiện hành còn hạn.</li>
              <li>Hết hạn không hủy yêu cầu; Manager có thể gia hạn hoặc phát hành phiên bản mới.</li>
              <li>Thứ tự: đồng ý điều khoản → thanh toán cọc → xác minh cọc → ký OTP.</li>
              <li>Bạn có thể hủy yêu cầu bất cứ lúc nào trước khi ký.</li>
            </ul>
          </div>
          {(v.deadlineHistory?.length ?? 0) > 0 && (
            <div className="cus-card">
              <div className="cus-eyebrow">Thay đổi hạn ký</div>
              <ul className="cus-timeline" style={{ marginTop: 10 }}>
                {[...v.deadlineHistory!].reverse().map((h) => (
                  <li key={h.at}><b>{fmtDateTime(h.from)} → {fmtDateTime(h.to)}</b><span>{fmtDateTime(h.at)} • {h.by} • {h.reason}</span></li>
                ))}
              </ul>
            </div>
          )}
          <DemoPanel request={r} />
        </div>
      </div>

      <AcceptTermsModal open={termsOpen} requestId={r.id} onClose={() => setTermsOpen(false)}
        onAccepted={() => { setTermsOpen(false); navigate(`/customer/requests/${r.id}/deposit`); }} />
    </>
  );
};

export default ContractTab;
