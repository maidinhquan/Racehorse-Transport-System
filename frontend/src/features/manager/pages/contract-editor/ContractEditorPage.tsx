import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ManagerLayout } from '../../components/ManagerLayout';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { BackLink, LockedCard, Note } from '../../components/Common/Common';
import { WorkflowNav } from '../../components/WorkflowNav/WorkflowNav';
import { ContractPreview } from '../../components/ContractPreview/ContractPreview';
import { Modal, ReasonModal } from '../../components/Modals';
import { DemoPanel } from '../../components/DemoPanel/DemoPanel';
import { useManager } from '../../hooks/useManager';
import {
  CANCELLABLE,
  CONTRACT_STATE_LABEL,
  ctRef,
  curVersion,
  depositOf,
  depositPaid,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isAccepted,
  isSigned,
  pendingTx,
  routeText,
  sumBudget,
  timeLeft,
  versionState,
} from '../../hooks/managerRules';
import { ContractWizard } from './ContractWizard';
import './ContractEditorPage.css';

type Dialog = '' | 'view' | 'cancel' | 'extend';

/** Hợp đồng & giá của một yêu cầu: soạn 4 bước, phát hành, phản hồi yêu cầu sửa, gia hạn, lịch sử phiên bản */
export const ContractEditorPage: React.FC = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { data, getRequest, tripFor, customer, horses, actions } = useManager();
  const [editing, setEditing] = useState(false);
  const [response, setResponse] = useState('');
  const [dialog, setDialog] = useState<Dialog>('');
  const close = () => setDialog('');
  const r = getRequest(requestId);

  if (!r) {
    return (
      <ManagerLayout title="Hợp đồng & giá">
        <BackLink to="/manager/contracts">Danh sách hợp đồng</BackLink>
        <LockedCard title="Không tìm thấy yêu cầu" text={`Không có yêu cầu ${requestId ?? ''}.`} icon="info" />
      </ManagerLayout>
    );
  }
  const t = tripFor(r.id), v = curVersion(r), state = v ? versionState(v) : undefined, c = customer(r);
  const head = (
    <>
      <BackLink to="/manager/contracts">Danh sách hợp đồng</BackLink>
      <div className="mgr-head">
        <div>
          <h2 className="mgr-title mgr-ce__title">{v ? `Hợp đồng ${ctRef(v)}` : 'Hợp đồng nháp'} • {r.id} {state && <StatusBadge kind="contract" status={state} />}</h2>
          <p className="mgr-subtitle">{c?.company} • {routeText(r)} • <StatusBadge status={r.status} /></p>
        </div>
        <div className="mgr-btn-row">
          {v && <button type="button" className="mgr-btn" onClick={() => setDialog('view')}>Xem toàn bộ hợp đồng</button>}
          <Link className="mgr-btn" to={`/manager/requests/${r.id}`}>Mở yêu cầu</Link>
          {t && <Link className="mgr-btn mgr-btn--solid" to={`/manager/trips/${t.id}`}>Đến chuyến {t.id} →</Link>}
        </div>
      </div>
      <WorkflowNav request={r} trip={t} current="contract" />
    </>
  );

  if (!isAccepted(r)) {
    return (
      <ManagerLayout title="Hợp đồng & giá">
        {head}
        <LockedCard title="Hợp đồng & giá bán chưa được mở" text="Manager cần chấp thuận yêu cầu trước khi soạn hợp đồng, nhập chi phí nội bộ hoặc quyết định giá bán.">
          <div style={{ marginTop: 10 }}><Link className="mgr-btn mgr-btn--solid mgr-btn--sm" to={`/manager/requests/${r.id}`}>Quay lại Thông tin & xét duyệt</Link></div>
        </LockedCard>
      </ManagerLayout>
    );
  }

  const isVoid = state === 'VOID';
  const blockedByMoney = depositPaid(data, r) || !!pendingTx(data, r);
  const canIssue = ['CONTRACT_PREPARATION', 'CONTRACT_READY', 'CONTRACT_CHANGES_REQUESTED'].includes(r.status) && !isSigned(r) && !blockedByMoney;
  const editorOpen = canIssue && (!v || isVoid || state === 'CHANGES_REQUESTED' || state === 'EXPIRED' || editing);
  const change = v?.change && !v.change.response ? v.change : undefined;
  const canManage = !!v && !v.signedAt && ['ISSUED', 'EXPIRED'].includes(state!) && ['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status);
  const processing = data.transactions.find((x) => x.requestId === r.id && x.status === 'PROCESSING');

  return (
    <ManagerLayout title="Hợp đồng & giá">
      {head}
      {['CANCELLED', 'REJECTED'].includes(r.status) && <Note tone="grey" title="Yêu cầu đã hủy">{r.reason ?? 'Không thể chuẩn bị hợp đồng.'}</Note>}
      {isVoid && (
        <Note tone="yellow" title="Hợp đồng đã bị thu hồi / rút lại">
          Phiên bản hợp đồng này đã được thu hồi trong hệ thống. Quản lý có thể soạn và phát hành phiên bản mới ngay bên dưới để khách hàng ký lại.
          <Link className="mgr-link" style={{ marginLeft: 16 }} to={`/manager/requests/${r.id}`}>Quay lại yêu cầu</Link>
        </Note>
      )}
      {r.status === 'CANCELLATION_REQUESTED' && <Note tone="red" title="Khách hàng yêu cầu hủy">Quyết định tại trang yêu cầu trước khi tiếp tục. <Link className="mgr-link" to={`/manager/requests/${r.id}`}>Mở yêu cầu</Link></Note>}

      <div className="mgr-grid-main">
        <div className="mgr-stack">
          {editorOpen && (
            <section className="mgr-card" style={{ border: '2px solid #f97316' }}>
              <ContractWizard key={`${r.id}-${v?.v ?? 0}`} request={r} customer={c} horses={horses}
                onSave={async (d) => {
                  return await actions.saveDraft(r.id, d);
                }}
                onIssue={async (d) => {
                  const res = await actions.issueContract(r.id, d, response);
                  if (res.ok) {
                    setEditing(false);
                    setResponse('');
                  }
                  return res;
                }}
                onCancel={editing && !isVoid ? () => setEditing(false) : undefined} />
            </section>
          )}

          {v && (
            <section className="mgr-card">
              <div className="mgr-between">
                <h3 className="mgr-card__title">Lịch sử phiên bản: {ctRef(v)} {state && <StatusBadge kind="contract" status={state} />}</h3>
                {!editorOpen && canIssue && (
                  <button type="button" className="mgr-btn mgr-btn--solid mgr-btn--sm" onClick={() => setEditing(true)}>
                    Soạn phiên bản mới
                  </button>
                )}
              </div>
              <div className="mgr-kv">
                <div><span>Phiên bản</span><b>{ctRef(v)} • {CONTRACT_STATE_LABEL[state!]}</b></div>
                <div><span>Giá hợp đồng</span><b>{fmtMoney(v.total)}</b></div>
                <div><span>Tiền cọc ({v.depositPct}%)</span><b>{fmtMoney(depositOf(r))}</b></div>
                <div><span>Dự toán nội bộ</span><b>{fmtMoney(sumBudget(v.budget))}</b><div className="mgr-muted">Biên {v.total ? Math.round(((v.total - sumBudget(v.budget)) / v.total) * 100) : 0}%</div></div>
                <div><span>Phát hành</span><b>{fmtDateTime(v.issuedAt)}</b></div>
                <div><span>{v.signedAt ? 'Ký OTP' : 'Hạn chung 24 giờ'}</span><b>{v.signedAt ? fmtDateTime(v.signedAt) : `${fmtDateTime(v.validUntil)} (${timeLeft(v.validUntil)})`}</b></div>
                <div><span>Khách đồng ý điều khoản</span><b>{v.termsAcceptedAt ? fmtDateTime(v.termsAcceptedAt) : 'Chưa'}</b></div>
                <div><span>Tiền cọc</span><b>{depositPaid(data, r) ? 'Đã xác minh' : pendingTx(data, r) ? 'Đang chờ xác minh' : 'Chưa thanh toán'}</b></div>
              </div>
              {v.exception && <p className="mgr-hint">Lý do bán dưới giá sàn: {v.exception}</p>}
              {blockedByMoney && !v.signedAt && <p className="mgr-hint">Khách đã thanh toán / đang thanh toán cọc cho phiên bản này nên không phát hành lại được.</p>}
            </section>
          )}

          {change && (
            <section className="mgr-card mgr-ce__change">
              <div className="mgr-between"><h3 className="mgr-card__title">Khách hàng yêu cầu sửa hợp đồng</h3><StatusBadge tone="warn" label="Chờ phản hồi" /></div>
              <div className="mgr-msg"><b>{c?.name}</b><small>{fmtDateTime(change.at)} • {ctRef(v!)}</small><p>{change.text}</p>
                {change.proposedDate && <p className="mgr-hint">Ngày vận chuyển đề xuất: {fmtDate(r.date)} → <b>{fmtDate(change.proposedDate)}</b></p>}
                {change.commercial && <p className="mgr-hint">Điều khoản thương mại: {change.commercial}</p>}
              </div>
              <div className="mgr-field" style={{ marginTop: 12 }}>
                <label htmlFor="ct-response">Phản hồi gửi khách hàng *</label>
                <textarea id="ct-response" className="mgr-textarea" rows={3} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Giải thích quyết định của bạn" />
              </div>
              <div className="mgr-btn-row">
                <button type="button" className="mgr-btn" onClick={() => { if (actions.respondChange(r.id, 'KEPT', response).ok) setResponse(''); }}>Từ chối sửa & giữ {ctRef(v!)}</button>
                <button type="button" className="mgr-btn" onClick={() => { if (actions.respondChange(r.id, 'RETURNED', response).ok) setResponse(''); }}>Trả yêu cầu cho khách chỉnh sửa</button>
              </div>
              <p className="mgr-hint">Đồng ý sửa: soạn và phát hành phiên bản mới ngay bên dưới (ngày đề xuất được cập nhật vào yêu cầu, phản hồi ở trên được gửi kèm).</p>
            </section>
          )}

          {editorOpen && (
            <section className="mgr-card">
              <ContractWizard key={`${r.id}-${v?.v ?? 0}`} request={r} customer={c} horses={horses}
                onSave={async (d) => {
                  return await actions.saveDraft(r.id, d);
                }}
                onIssue={async (d) => {
                  const res = await actions.issueContract(r.id, d, response);
                  if (res.ok) {
                    setEditing(false);
                    setResponse('');
                  }
                  return res;
                }}
                onCancel={editing ? () => setEditing(false) : undefined} />
            </section>
          )}

          {!editorOpen && v && (
            <section className="mgr-card">
              <div className="mgr-between"><h3 className="mgr-card__title">Điều khoản hợp đồng ({v.terms.length})</h3>
                {v.signedAt ? <StatusBadge tone="ok" label="Đã khóa sau ký OTP" /> : canIssue && <button type="button" className="mgr-btn mgr-btn--sm" onClick={() => setEditing(true)}>Chỉnh sửa trước ký</button>}</div>
              <ol className="mgr-contract__terms">{v.terms.map((x, i) => <li key={i}><b>{x.title}.</b> {x.text}</li>)}</ol>
              {v.note && <p className="mgr-hint">Ghi chú gửi khách hàng: {v.note}</p>}
            </section>
          )}

          <section className="mgr-card">
            <h3 className="mgr-card__title">Lịch sử phiên bản & thương lượng</h3>
            {r.versions.length ? (
              <ul className="mgr-timeline">
                {[...r.versions].reverse().map((x) => (
                  <li key={x.v} className={x === v ? 'now' : 'done'}>
                    <b>{ctRef(x)} • {CONTRACT_STATE_LABEL[versionState(x)]} • {fmtMoney(x.total)}</b>
                    <span>Phát hành {fmtDateTime(x.issuedAt)}{x.signedAt ? ` • ký OTP ${fmtDateTime(x.signedAt)}` : ` • hạn ${fmtDateTime(x.validUntil)}`}</span>
                    {x.extensions.map((e) => <span key={e.at}>Gia hạn {fmtDateTime(e.at)}: {fmtDateTime(e.from)} → {fmtDateTime(e.to)}</span>)}
                    {x.change && <span>Khách yêu cầu sửa {fmtDateTime(x.change.at)}: {x.change.text}</span>}
                    {x.change?.response && <span>Phản hồi {fmtDateTime(x.change.response.at)}: {x.change.response.text}</span>}
                  </li>
                ))}
              </ul>
            ) : <p className="mgr-hint" style={{ marginTop: 0 }}>Hợp đồng chưa phát hành. Lịch sử phiên bản sẽ xuất hiện tại đây.</p>}
          </section>
        </div>

        <aside className="mgr-stack">
          {canManage && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Quản lý hạn chung</h3>
              <p className="mgr-hint" style={{ marginTop: 0 }}>Thanh toán cọc, xác minh và ký OTP phải hoàn tất trước {fmtDateTime(v!.validUntil)}. Không tự động hủy khi quá hạn.</p>
              <div className="mgr-actions" style={{ flexDirection: 'column' }}>
                <button type="button" className="mgr-btn" onClick={() => actions.remindSign(r.id)}>Nhắc khách cọc & ký</button>
                <button type="button" className="mgr-btn" onClick={() => setDialog('extend')}>Gia hạn thêm 24 giờ</button>
                {pendingTx(data, r)?.status === 'PENDING_CONFIRMATION' && <Link className="mgr-btn mgr-btn--solid" to="/manager/payments">Xác minh tiền cọc</Link>}
              </div>
            </section>
          )}
          {CANCELLABLE.includes(r.status) && state !== 'VOID' && (
            <section className="mgr-card">
              <h3 className="mgr-card__title">Hủy / Thu hồi hợp đồng</h3>
              <p className="mgr-hint" style={{ marginTop: 0 }}>Chỉ hủy/thu hồi được trước khi khách ký OTP. Hợp đồng chưa ký sẽ bị thu hồi.</p>
              <button type="button" className="mgr-btn mgr-btn--danger mgr-btn--sm" onClick={() => setDialog('cancel')}>Hủy / Thu hồi hợp đồng</button>
            </section>
          )}
          <DemoPanel buttons={[
            { label: 'Khách hàng đồng ý điều khoản', run: () => actions.demo.customerAcceptTerms(r.id), primary: true, hidden: !(r.status === 'CONTRACT_READY' && state === 'ISSUED' && !v?.termsAcceptedAt) },
            { label: 'Khách hàng chuyển khoản tiền cọc', run: () => actions.demo.customerPayBank(r.id), primary: true, hidden: !(r.status === 'CONTRACT_READY' && state === 'ISSUED' && !!v?.termsAcceptedAt && !pendingTx(data, r) && !depositPaid(data, r)) },
            { label: `Cổng thanh toán xác nhận ${processing?.id ?? ''}`, run: () => actions.demo.gatewayConfirm(processing!.id), primary: true, hidden: !processing },
            { label: 'Khách hàng ký OTP', run: () => actions.demo.customerSign(r.id), primary: true, hidden: r.status !== 'DEPOSIT_VERIFIED' },
            { label: 'Khách hàng yêu cầu sửa hợp đồng', run: () => actions.demo.customerRequestChange(r.id), hidden: !(r.status === 'CONTRACT_READY' && state === 'ISSUED' && !depositPaid(data, r) && !pendingTx(data, r)) },
            { label: 'Khách hàng yêu cầu hủy', run: () => actions.demo.customerRequestCancel(r.id), hidden: !['CONTRACT_READY', 'DEPOSIT_VERIFIED'].includes(r.status) },
          ]} hint="Giả lập thao tác của khách hàng và cổng thanh toán với hợp đồng này." />
        </aside>
      </div>

      {v && (
        <Modal open={dialog === 'view'} title={`Hợp đồng ${ctRef(v)}`} wide cancelText="Đóng" onClose={close}>
          <ContractPreview request={r} customer={c} horses={horses}
            content={{ ref: ctRef(v), mode: v.mode, departAt: v.departAt, arriveAt: v.arriveAt, items: v.items, depositPct: v.depositPct, terms: v.terms, note: v.note, issuedAt: v.issuedAt, validUntil: v.validUntil, signedAt: v.signedAt }} />
        </Modal>
      )}
      <Modal open={dialog === 'extend'} title={`Gia hạn ${r.id}`} okText="Gia hạn 24 giờ" onClose={close} onOk={() => { if (actions.extendContract(r.id).ok) close(); }}>
        <p>Hạn chung hiện tại: <b>{v ? fmtDateTime(v.validUntil) : '—'}</b>. Sau khi gia hạn, khách có thêm 24 giờ (tính từ hạn hiện tại hoặc từ bây giờ nếu đã quá hạn).</p>
      </Modal>
      <ReasonModal open={dialog === 'cancel'} title={`Thu hồi / Hủy hợp đồng ${r.id}`} okText="Thu hồi hợp đồng" danger minLength={10} confirmText="Tôi hiểu thao tác này không thể hoàn tác."
        placeholder="VD: Khách không phản hồi sau 3 lần nhắc và hạn chung đã hết." onClose={close} onSubmit={async (x) => {
          const res = await actions.cancelRequest(r.id, x);
          if (res.ok) {
            close();
            navigate(`/manager/requests/${r.id}`);
          }
          return res.ok;
        }} />
    </ManagerLayout>
  );
};

export default ContractEditorPage;
