// Sự cố & khiếu nại: danh sách sự cố trong chuyến (Flow 5) và khiếu nại liên quan (chỉ xem)
import { Navigate, useParams } from 'react-router-dom';
import { Cell, Icon, Pill, PillT, RouteText } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { emp, horse, legOf, reqOfTrip, trip, vehicle } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, go, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt, human, incTypeVi, usd } from '../../utils/format';
import { F5_DONE, F5_PLAN, F5_TYPES, PAYER_VI, ROLE_VI, byVi, curPlan, f5Ack, f5Close, f5Conditions, f5Continue, f5Escalate, f5Next, f5Pill, f5Plan, f5Res, f5Status, f5Submit, f5Why, resSig } from '../../workflows/incidentOperations';

const PLAN_ST: Record<string, string> = { DRAFT: 'Nháp', PENDING_APPROVAL: 'Chờ Manager duyệt', APPROVED: 'Manager đã duyệt', CHANGES_REQUESTED: 'Yêu cầu chỉnh sửa', NOT_REQUIRED: 'Không cần duyệt – đã áp dụng' };
const VET_VI: Record<string, string> = { FIT: 'Đủ sức khỏe tiếp tục', FIT_WITH_CONDITIONS: 'Tiếp tục có điều kiện', NOT_FIT: 'Chưa đủ sức khỏe tiếp tục' };
const UPD_VI: Record<string, string> = { SAFETY: 'An toàn', CARE: 'Chăm sóc ngựa', PROGRESS: 'Diễn biến' };

function NextBox({ i }: { i: Any }) {
  const [k, title, body] = f5Next(i); if (!title) return null;
  return (
    <div className={`f5-next ${k}`}><div className="f5-next-ic"><Icon name={k === 'me' ? 'alert' : k === 'done' ? 'check' : k === 'bad' ? 'alert' : 'clock'} /></div>
      <div><span>{k === 'me' ? 'Việc bạn cần làm' : k === 'done' ? 'Hoàn tất' : k === 'bad' ? 'Dừng' : 'Đang chờ'}</span><b>{title}</b>{body ? <p>{body}</p> : null}</div></div>
  );
}
function PlanCard({ i }: { i: Any }) {
  const t = trip(i.tripId), p = curPlan(i);
  if (!p) return <div className="card pad"><h3 className="card-title">Phương án xử lý</h3><p className="subtitle">Chưa có phương án.</p></div>;
  const conds = f5Conditions(i);
  return (
    <div className="card pad">
      <div className="between"><h3 className="card-title">Phương án v{p.v} {p.status === 'DRAFT' ? '(nháp)' : ''}</h3><Pill v={p.status === 'NOT_REQUIRED' ? 'APPLIED' : p.status} label={PLAN_ST[p.status]} /></div>
      <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>{p.desc}</p>{p.reason ? <p className="hint">Lý do: {p.reason}</p> : null}
      <div className="kv2" style={{ marginTop: 10 }}>
        <Cell label="Loại">{F5_PLAN[p.kind]}</Cell>
        {p.vehicleId ? <Cell label="Xe">{vehicle(p.vehicleId) ? vehicle(p.vehicleId).plate + ' • ' + vehicle(p.vehicleId).model : p.vehicleId}</Cell> : null}
        {p.crewId ? <Cell label="Nhân sự">{human(p.crewRole)}: {emp(p.crewId)?.name || p.crewId}</Cell> : null}
        {p.kind === 'FLIGHT_CHANGE' ? <Cell label="Giờ bay mới">{dt(p.flightAt)}</Cell> : null}
        <Cell label="Thời gian giao">{p.etaTo && p.etaTo !== p.etaBase ? <>{dt(p.etaBase)} → <b>{dt(p.etaTo)}</b></> : 'Giữ nguyên ' + dt(p.etaBase)}</Cell>
        <Cell label="Chi phí phát sinh">{Number(p.cost) ? `${usd(p.cost)} • ${PAYER_VI[p.payer] || human(p.payer)}` : 'Không'}</Cell>
      </div>
      <p className="hint">{p.needsApproval ? `Cần Manager duyệt vì: ${f5Why(p).join(', ')}.` : 'Không cần Manager duyệt: không đổi lộ trình/chuyến bay, không phát sinh chi phí, không đổi thời gian giao đã cam kết.'}{p.inherited ? ` Kế thừa phê duyệt của v${p.inherited} (nội dung thuộc quyền Manager không đổi).` : ''} Chi phí phát sinh không tự cộng vào số tiền khách phải trả.</p>
      {['CONTINUE_ALLOWED', 'RESULT_REPORTED', 'CLOSED', 'HALTED'].includes(i.status) ? null : <>
        <div className="eyebrow" style={{ marginTop: 14 }}>Điều kiện tiếp tục chặng</div>
        <ul className="check-list f5-conds">{conds.map((c, k) => <li key={k} className={c.ok ? 'ok' : ''}><Icon name={c.ok ? 'check' : 'clock'} /><span>{c.label} <small>• {byVi(c.by)}</small></span></li>)}</ul>
      </>}
      {i.plans.length > 1 || p.approvals.length ? <details style={{ marginTop: 10 }}><summary className="hint" style={{ cursor: 'pointer' }}>Các phiên bản &amp; lịch sử phê duyệt ({i.plans.length})</summary>
        {[...i.plans].reverse().map((x: Any) => <div className="f5-ver" key={x.v}><b>v{x.v} • {F5_PLAN[x.kind]}</b> <Pill v={x.status === 'NOT_REQUIRED' ? 'APPLIED' : x.status} /> <span className="muted">{x.by} • {dt(x.at)}</span>
          {x.approvals.map((a: Any, k: number) => <div key={k} className="muted" style={{ fontSize: 12 }}>{a.decision === 'APPROVED' ? 'Phê duyệt' : a.decision === 'INHERITED' ? 'Kế thừa phê duyệt' : 'Yêu cầu chỉnh sửa'} • {a.by} • {dt(a.at)}{a.reason ? ': ' + a.reason : ''}</div>)}</div>)}
      </details> : null}
      {void t}
    </div>
  );
}
function InfoCard({ i }: { i: Any }) {
  const rep = emp(i.by) ? emp(i.by).name : i.by;
  return (
    <div className="card pad"><h3 className="card-title">Thông tin sự cố &amp; bằng chứng</h3>
      <div className="kv2">
        <Cell label="Thời điểm">{dt(i.at)}</Cell><Cell label="Vị trí">{i.location}</Cell><Cell label="Người báo">{rep}{i.reporterRole === 'FLEET_COORDINATOR' ? ' (Điều phối ghi nhận thay)' : ''}</Cell><Cell label="Mức độ"><Pill v={i.severity} /></Cell>
        <Cell label="Ngựa bị ảnh hưởng">{(i.horseIds || []).length ? i.horseIds.map((h: string) => horse(h).name).join(', ') : 'Không'}</Cell><Cell label="Ảnh hưởng tiếp tục chặng">{i.blocking ? 'Có – chặng tạm dừng' : 'Không chặn'}</Cell>
      </div>
      <p style={{ margin: '12px 0 0', lineHeight: 1.6 }}>{i.description}</p>
      {i.safety ? <div className="note green" style={{ marginTop: 10 }}><Icon name="check" /><div><b>Biện pháp đã thực hiện</b>{i.safety}</div></div> : null}
      {(i.photos || []).length ? <div className="photo-strip">{i.photos.map((p: string) => <button type="button" key={p} className="ph">{p}</button>)}</div> : null}
      {i.type === 'HORSE_HEALTH' ? <div className="f5-vet">{i.vet ? <><b>Kết luận bác sĩ bên ngoài: {VET_VI[i.vet.conclusion]}</b><span>{i.vet.name} • {i.vet.clinic} • {i.vet.phone} • ghi nhận bởi {i.vet.by} lúc {dt(i.vet.at)}</span>{i.vet.notes ? <p>{i.vet.notes}</p> : null}{(i.vet.evidence || []).length ? <small>Bằng chứng: {i.vet.evidence.join(', ')}</small> : null}</>
        : <><b>Chưa có kết luận của bác sĩ bên ngoài</b><span>Driver / Escort ghi nhận kết luận, thông tin bác sĩ và bằng chứng; không tự kết luận chuyên môn.</span></>}</div> : null}
      {(i.updates || []).length ? <><div className="eyebrow" style={{ marginTop: 14 }}>Cập nhật hiện trường</div>
        <ul className="timeline">{[...i.updates].reverse().map((u: Any, k: number) => <li key={k} className={u.kind === 'SAFETY' ? 'red' : u.kind === 'CARE' ? 'orange' : ''}><b>{UPD_VI[u.kind] || 'Cập nhật'}: {u.text}</b><span>{dt(u.at)} • {u.by}{u.photo ? ' • ảnh ' + u.photo : ''}</span></li>)}</ul></> : null}
    </div>
  );
}

export function IncidentDetailPage() {
  useCoordinatorStore();
  const { incidentId = '' } = useParams();
  const i = db.incidents.find((x: Any) => x.id === incidentId);
  if (!i) return <Navigate to="/coordinator/incidents" replace />;
  f5Status(i);
  const t = trip(i.tripId), p = curPlan(i), S = i.status, miss = f5Conditions(i).filter((c) => !c.ok);
  const btn = (key: string, label: string, run: () => void, cls = 'ghost', why = '') => (
    <span className="f5-act" key={key}><button type="button" className={`btn ${cls}`} disabled={!!why} onClick={run}>{label}</button>{why ? <small>{why}</small> : null}</span>
  );
  const buttons = [];
  if (S === 'REPORTED') buttons.push(btn('ack', 'Tiếp nhận sự cố', () => f5Ack(i.id), 'solid'));
  if (['PLANNING', 'CHANGES_REQUESTED', 'EXECUTING', 'PENDING_APPROVAL'].includes(S)) buttons.push(btn('plan', p ? (p.status === 'DRAFT' ? `Sửa phương án v${p.v}` : `Sửa phương án (tạo v${p.v + 1})`) : 'Lập phương án', () => f5Plan(i.id), p && p.status !== 'DRAFT' ? 'ghost' : 'solid'));
  if (p && p.status === 'DRAFT') buttons.push(btn('submit', p.needsApproval ? 'Gửi Manager duyệt' : 'Áp dụng phương án (không cần duyệt)', () => f5Submit(i.id), 'solid'));
  if (S === 'EXECUTING') {
    if (!(i.resOk && i.resOk.sig === resSig(p))) buttons.push(btn('res', 'Xác nhận xe & nhân sự đáp ứng phương án', () => f5Res(i.id)));
    buttons.push(btn('cont', 'Cho phép tiếp tục chặng', () => f5Continue(i.id), 'solid', miss.length ? 'Còn thiếu: ' + miss.map((c) => `${c.label} (${byVi(c.by)})`).join('; ') : ''));
  }
  if (!['CLOSED', 'HALTED', 'ESCALATED', 'RESULT_REPORTED', 'CONTINUE_ALLOWED', 'REPORTED'].includes(S)) buttons.push(btn('esc', 'Báo không thể tiếp tục → Manager quyết định', () => f5Escalate(i.id), 'danger'));
  if (S === 'RESULT_REPORTED') buttons.push(btn('close', 'Kiểm tra kết quả & đóng sự cố', () => f5Close(i.id), 'solid'));
  if (S === 'CONTINUE_ALLOWED') buttons.push(btn('close2', 'Đóng sự cố', () => f5Close(i.id), 'ghost', 'Chờ Driver / Escort báo kết quả thực hiện.'));
  return (
    <CoordinatorLayout title="Sự cố & khiếu nại" active="/coordinator/incidents">
      <button type="button" className="link back" onClick={() => go('f/incidents')}>← Danh sách sự cố</button>
      <div className="head"><div><h2 className="page-title" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{i.id} <PillT p={f5Pill(i)} /> <Pill v={i.severity} /></h2>
        <p className="subtitle">{F5_TYPES[i.type] || incTypeVi(i.type)} • {t.id} • {legOf(t, i.leg)}{i.blocking && !i.continueAt && !F5_DONE.includes(i.status) ? <> • <b style={{ color: '#b42318' }}>chặng đang tạm dừng</b></> : null}</p></div></div>
      <NextBox i={i} />
      {buttons.length ? <div className="f5-actions">{buttons}</div> : null}
      <div className="grid-main" style={{ marginTop: 16 }}>
        <div className="stack"><PlanCard i={i} /><InfoCard i={i} /></div>
        <div className="stack">
          <div className="card pad"><div className="eyebrow">Chuyến</div>
            <div className="kv"><div><span>Chuyến</span><b>{t.id}</b></div><div><span>Tuyến</span><b><RouteText r={reqOfTrip(t)} /></b></div><div><span>Trạng thái</span><b>{human(t.status)}</b></div><div><span>ETA đã xác nhận</span><b>{dt(t.eta)}</b></div><div><span>Phụ trách</span><b>{i.owner || 'Chưa tiếp nhận'}</b></div></div>
            <div className="btn-row"><button type="button" className="btn ghost sm" onClick={() => go(`f/trip/${t.id}/progress`)}>Theo dõi hành trình</button></div></div>
          <div className="card pad"><h3 className="card-title">Lịch sử xử lý</h3>
            <ul className="timeline">{[...i.log].reverse().map((x: Any, k: number) => { const [a, b, c, r] = x; return <li key={k}><b>{b}</b><span>{dt(a)}{c ? ' • ' + c : ''}{r ? ' (' + (ROLE_VI[r] || human(r)) + ')' : ''}</span></li>; })}</ul></div>
        </div>
      </div>
      <p className="hint f5-sim">Bản demo: thao tác chỉ cập nhật dữ liệu dùng chung trong trình duyệt (mô phỏng), không gọi API.</p>
    </CoordinatorLayout>
  );
}
export default IncidentDetailPage;
