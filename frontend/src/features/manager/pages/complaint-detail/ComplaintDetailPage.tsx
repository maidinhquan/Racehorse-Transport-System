import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard, openSampleFile } from '../../components/Common/Common';
import { ReasonModal } from '../../components/Modals';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useManager } from '../../hooks/useManager';
import { COMPLAINT_TYPE_LABEL, TRIP_STATUS_LABEL, fmtDateTime, fmtMoney, horseName } from '../../hooks/managerRules';

/** Chi tiết khiếu nại: hội thoại, phản hồi / đề xuất giải quyết, ghi nhận kết quả, chuyển cấp */
export const ComplaintDetailPage: React.FC = () => {
  const { complaintId } = useParams();
  const { data, complaints, getRequest, tripFor, customer, actions } = useManager();
  const [text, setText] = useState('');
  const [propose, setPropose] = useState(false);
  const [amount, setAmount] = useState(0);
  const [recording, setRecording] = useState(false);
  const c = complaints.find((x) => x.id === complaintId);
  if (!c) {
    return (
      <ManagerLayout title="Sự cố & khiếu nại">
        <BackLink to="/manager/incidents?tab=complaints">Khiếu nại</BackLink>
        <LockedCard title="Không tìm thấy khiếu nại" text={`Không có khiếu nại ${complaintId ?? ''}.`} icon="info" />
      </ManagerLayout>
    );
  }
  const r = getRequest(c.requestId)!, t = tripFor(r.id);
  const send = () => { if (actions.replyComplaint(c.id, text, propose, propose ? amount : 0).ok) { setText(''); setPropose(false); setAmount(0); } };
  const history: Array<[string, string]> = [[c.createdAt, 'Khách hàng gửi khiếu nại']];
  c.messages.slice(1).forEach((m) => history.push([m.at, `${m.from === 'MANAGER' ? 'Manager' : 'Khách hàng'} phản hồi`]));
  if (c.resolvedAt) history.push([c.resolvedAt, 'Đã giải quyết']);
  history.sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <ManagerLayout title="Sự cố & khiếu nại">
      <BackLink to="/manager/incidents?tab=complaints">Khiếu nại</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{c.id} <StatusBadge kind="complaint" status={c.status} /></h2>
          <p className="mgr-subtitle">{c.title} • {r.id} • {customer(r)?.company}</p>
        </div>
        {['NEW', 'IN_PROGRESS'].includes(c.status) && <button type="button" className="mgr-btn" onClick={() => actions.escalateComplaint(c.id)}>Chuyển lên Ban giám đốc</button>}
      </div>
      <div className="mgr-grid-main">
        <section className="mgr-card">
          <h3 className="mgr-card__title">Hội thoại</h3>
          <div className="mgr-thread">
            {c.messages.map((m, k) => (
              <div key={`${m.at}-${k}`} className={`mgr-msg ${m.from === 'MANAGER' ? 'me' : ''}`}>
                <b>{m.name}</b><small>{fmtDateTime(m.at)}</small><p>{m.text}</p>
                {m.files && <div className="mgr-photos">{m.files.map((f) => <button key={f} type="button" className="mgr-photo" onClick={() => openSampleFile(f)}>{f}</button>)}</div>}
              </div>
            ))}
          </div>
          {c.status !== 'RESOLVED' && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--mgr-line)', paddingTop: 14 }}>
              <div className="mgr-field">
                <label htmlFor="cmp-reply">Phản hồi khách hàng *</label>
                <textarea id="cmp-reply" className="mgr-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Giải thích kết quả kiểm tra và hướng giải quyết" />
              </div>
              <label className="mgr-check"><input type="checkbox" checked={propose} onChange={(e) => setPropose(e.target.checked)} /> Đây là đề xuất giải quyết (khách hàng được yêu cầu xác nhận)</label>
              {propose && (
                <div className="mgr-field" style={{ maxWidth: 260 }}>
                  <label htmlFor="cmp-amount">Đề xuất bồi thường (USD)</label>
                  <input id="cmp-amount" className="mgr-input" type="number" min={0} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </div>
              )}
              <div className="mgr-btn-row">
                <button type="button" className="mgr-btn mgr-btn--solid" onClick={send}>Gửi phản hồi</button>
                <button type="button" className="mgr-btn" onClick={() => setRecording(true)}>Ghi nhận kết quả đã thống nhất</button>
              </div>
              <p className="mgr-hint">Khiếu nại chỉ được coi là đã giải quyết khi khách xác nhận đề xuất, hoặc Manager ghi nhận kết quả đã thống nhất kèm bằng chứng. Khoản bồi thường không cộng vào số dư hợp đồng cho đến khi được thống nhất.</p>
            </div>
          )}
        </section>
        <aside className="mgr-stack">
          <section className="mgr-card">
            <h3 className="mgr-card__title">Thông tin</h3>
            <div className="mgr-kv" style={{ gridTemplateColumns: '1fr' }}>
              <div><span>Loại</span><b>{COMPLAINT_TYPE_LABEL[c.type]}</b></div>
              <div><span>Ngựa</span><b>{c.horseId ? horseName(data, c.horseId) : '—'}</b></div>
              <div><span>Gửi lúc</span><b>{fmtDateTime(c.createdAt)}</b></div>
              <div><span>Chuyến</span><b>{t ? `${t.id} • ${TRIP_STATUS_LABEL[t.status]}` : '—'}</b></div>
            </div>
            <div className="mgr-actions"><Link className="mgr-btn mgr-btn--sm" to={`/manager/requests/${r.id}/closure`}>Bàn giao & đóng đơn {r.id}</Link></div>
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Đề xuất giải quyết</h3>
            {c.resolution ? (
              <div className="mgr-kv" style={{ gridTemplateColumns: '1fr' }}>
                <div><span>Nội dung</span><b style={{ whiteSpace: 'normal' }}>{c.resolution.proposal}</b></div>
                <div><span>Bồi thường đề xuất</span><b>{c.resolution.amount ? fmtMoney(c.resolution.amount) : '—'}</b></div>
              </div>
            ) : <p className="mgr-hint" style={{ marginTop: 0 }}>Chưa có đề xuất.</p>}
          </section>
          <section className="mgr-card">
            <h3 className="mgr-card__title">Lịch sử</h3>
            <ul className="mgr-timeline">{history.map(([at, label], k) => <li key={`${at}-${k}`} className={k === 0 ? 'now' : 'done'}><b>{label}</b><span>{fmtDateTime(at)}</span></li>)}</ul>
          </section>
          <DemoPanel buttons={[{ label: 'Khách hàng đồng ý phương án giải quyết', run: () => actions.demo.customerConfirmResolution(c.id), primary: true, hidden: c.status !== 'PROPOSED' }]} />
        </aside>
      </div>
      <ReasonModal open={recording} title={`Ghi nhận kết quả • ${c.id}`} okText="Đánh dấu đã giải quyết" minLength={10} label="Kết quả đã thống nhất & bằng chứng *"
        placeholder="VD: Gọi điện 05/10 10:00, khách đồng ý nhận hỗ trợ 150 USD chi phí thú y (biên bản đính kèm email)." onClose={() => setRecording(false)}
        onSubmit={(x) => actions.recordResolution(c.id, x).ok} />
    </ManagerLayout>
  );
};

export default ComplaintDetailPage;
