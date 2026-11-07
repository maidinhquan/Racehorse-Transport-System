// Sự cố & khiếu nại: danh sách sự cố trong chuyến (Flow 5) và khiếu nại liên quan (chỉ xem)
import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Cell, Icon, Pill, PillT, RouteText } from '../../components/common/ui';
import { CoordinatorLayout } from '../../components/layout/CoordinatorLayout';
import { emp, horse, legOf, reqOfTrip, trip, vehicle } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { cleanId, db, go, syncCoordinatorIncidents, useCoordinatorStore } from '../../store/coordinatorStore';
import { dt, human, incTypeVi, usd } from '../../utils/format';
import { F5_DONE, F5_PLAN, F5_TYPES, PAYER_VI, ROLE_VI, byVi, curPlan, f5Ack, f5Close, f5Conditions, f5Continue, f5Next, f5Pill, f5Plan, f5Res, f5Status, f5Submit, resSig } from '../../workflows/incidentOperations';

const PLAN_ST: Record<string, string> = { DRAFT: 'Nháp', APPROVED: 'Đã duyệt & áp dụng', NOT_REQUIRED: 'Đã áp dụng' };
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
        <Cell label="Loại">{F5_PLAN[p.kind] || p.kind}</Cell>
        {p.vehicleId ? <Cell label="Xe">{vehicle(p.vehicleId) ? vehicle(p.vehicleId).plate + ' • ' + vehicle(p.vehicleId).model : p.vehicleId}</Cell> : null}
        {p.newCrew && Object.keys(p.newCrew).length ? (
          <Cell label="Nhân sự thay thế">
            {Object.entries(p.newCrew).map(([r, cid]) => `${human(r)}: ${emp(cid as string)?.name || cid}`).join('; ')}
          </Cell>
        ) : p.crewId ? (
          <Cell label="Nhân sự">{human(p.crewRole)}: {emp(p.crewId)?.name || p.crewId}</Cell>
        ) : null}
        <Cell label="Thời gian giao">{p.etaTo && p.etaTo !== p.etaBase ? <>{dt(p.etaBase)} → <b>{dt(p.etaTo)}</b></> : 'Giữ nguyên ' + dt(p.etaBase)}</Cell>
        <Cell label="Chi phí phát sinh">{Number(p.cost) ? `${usd(p.cost)} • ${PAYER_VI[p.payer] || human(p.payer)}` : 'Không'}</Cell>
      </div>
      <p className="hint">Điều phối viên toàn quyền quyết định phương án và áp dụng trực tiếp cho chuyến đi. Chi phí phát sinh không tự cộng vào số tiền khách phải trả.</p>
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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const t = trip(i.tripId);
  const repUser = emp(i.by);
  const repName = i.reporterName || (repUser ? repUser.name : i.by);
  const isVetReporter = i.reporterRole === 'VETERINARIAN' || i.type === 'HORSE_HEALTH' || /BS\.|Bác sĩ|thú y/i.test(repName);
  const roleLabel = isVetReporter ? 'Bác sĩ thú y / Hộ tống áp tải' : 'Tài xế vận hành';
  const phone = i.reporterPhone || (repUser ? repUser.phone : (t?.crew?.MAIN_DRIVER ? emp(t.crew.MAIN_DRIVER)?.phone : ''));
  const currentVeh = t?.vehicleId ? vehicle(t.vehicleId) : null;
  const tripHorseList = t ? (i.horseIds && i.horseIds.length ? i.horseIds : (t.horses || [])) : [];

  return (
    <div className="card pad">
      <div className="between">
        <h3 className="card-title">Thông tin sự cố &amp; bằng chứng hiện trường</h3>
        <span className="badge" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4, background: isVetReporter ? '#ecfdf5' : '#eff6ff', color: isVetReporter ? '#047857' : '#1d4ed8', fontWeight: 600 }}>
          {roleLabel}
        </span>
      </div>

      <div className="kv2" style={{ marginTop: 12 }}>
        <Cell label="Người báo cáo">
          <b>{repName}</b>
          <div className="muted" style={{ fontSize: 12 }}>{roleLabel}</div>
        </Cell>
        <Cell label="Liên hệ khẩn cấp">
          {phone ? (
            <a href={`tel:${phone}`} style={{ color: 'var(--accent-primary, #2563eb)', fontWeight: 600, textDecoration: 'none' }}>
              SĐT: {phone}
            </a>
          ) : (
            <span className="muted">Chưa có SĐT</span>
          )}
        </Cell>
        <Cell label="Thời điểm">{dt(i.at)}</Cell>
        <Cell label="Mức độ nghiêm trọng"><Pill v={i.severity} /></Cell>
        <Cell label="Vị trí sự cố">{i.location || 'Trên đường vận chuyển'}</Cell>
        <Cell label="Tọa độ GPS">
          {i.locationCoordinates ? <code style={{ fontSize: 12, background: 'var(--bg-page, #f3f4f6)', padding: '2px 6px', borderRadius: 4 }}>{i.locationCoordinates}</code> : 'Chưa có tọa độ'}
        </Cell>
        <Cell label="Xe hiện tại của chuyến">
          {currentVeh ? `${currentVeh.plate} • ${currentVeh.model} (${currentVeh.stalls} ô chuồng)` : 'Chưa gán xe'}
        </Cell>
        <Cell label="Ngựa trên xe">
          {tripHorseList.length ? `${tripHorseList.length} con: ${tripHorseList.map((h: string) => horse(h)?.name || h).join(', ')}` : 'Không có ngựa'}
        </Cell>
      </div>

      {/* Khối an toàn & sơ cứu hiện trường */}
      <div className="note green" style={{ marginTop: 14 }}>
        <Icon name="check" />
        <div>
          <b>Hiện trạng an toàn hiện trường</b>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5 }}>
            {i.immediateCare || i.safety || 'Người và ngựa đã được đảm bảo an toàn / Đang tiến hành sơ cứu tại chỗ.'}
          </p>
        </div>
      </div>

      {/* Mô tả chi tiết do tài xế / bác sĩ gửi */}
      <div style={{ marginTop: 14, padding: 12, background: 'var(--bg-page, #f9fafb)', borderRadius: 8, border: '1px solid var(--border-color, #e5e7eb)' }}>
        <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--text-secondary, #4b5563)' }}>
          Chi tiết diễn biến do nhân sự hiện trường cung cấp:
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary, #111827)', whiteSpace: 'pre-wrap' }}>
          {i.description || 'Chưa có mô tả chi tiết.'}
        </p>
      </div>

      {/* Ảnh chụp hiện trường */}
      {(i.photos || []).length ? (
        <div style={{ marginTop: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Ảnh / Bằng chứng hiện trường ({i.photos.length}) – Bấm để phóng to</div>
          <div className="photo-strip">
            {i.photos.map((p: string, idx: number) => {
              const isImg = p.startsWith('data:image') || p.startsWith('http') || p.startsWith('blob:') || /\.(jpe?g|png|webp|gif)$/i.test(p);
              return (
                <button
                  type="button"
                  key={idx}
                  className="ph"
                  title="Nhấn để phóng to ảnh xem chi tiết"
                  onClick={() => setSelectedPhoto(p)}
                >
                  {isImg ? <img src={p} alt={`Ảnh sự cố ${idx + 1}`} /> : <span>{p}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
              background: 'var(--bg-surface, #fff)', padding: 16, borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'var(--bg-page, #f3f4f6)', border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontWeight: 'bold'
              }}
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, textAlign: 'left', color: 'var(--text-primary, #111827)' }}>
              Ảnh bằng chứng sự cố
            </h4>
            {selectedPhoto.startsWith('data:image') || selectedPhoto.startsWith('http') || selectedPhoto.startsWith('blob:') ? (
              <img
                src={selectedPhoto}
                alt="Bằng chứng sự cố"
                style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 6, display: 'block' }}
              />
            ) : (
              <div style={{ padding: '30px 40px', minWidth: 280 }}>
                <p style={{ margin: 0 }}>Tệp đính kèm: <b>{selectedPhoto}</b></p>
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Tệp mẫu không có hình ảnh nhị phân đi kèm.</p>
              </div>
            )}
          </div>
        </div>
      )}
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

  useEffect(() => {
    void syncCoordinatorIncidents();
  }, []);

  const i = db.incidents.find((x: Any) => cleanId(x.id) === cleanId(incidentId));
  if (!i) return <Navigate to="/coordinator/incidents" replace />;
  f5Status(i);
  const realTrip = trip(i.tripId);
  const t = realTrip || { id: i.tripId || '—', status: 'IN_TRANSIT', eta: '', stops: [], crew: {}, vehicleId: '', requestId: '' };
  const p = curPlan(i), S = i.status, miss = f5Conditions(i).filter((c) => !c.ok);
  const btn = (key: string, label: string, run: () => void, cls = 'ghost', why = '') => (
    <span className="f5-act" key={key}><button type="button" className={`btn ${cls}`} disabled={!!why} onClick={run}>{label}</button>{why ? <small>{why}</small> : null}</span>
  );
  const buttons = [];
  if (S === 'REPORTED') buttons.push(btn('ack', 'Tiếp nhận sự cố', () => f5Ack(i.id), 'solid'));
  if (['PLANNING', 'CHANGES_REQUESTED', 'EXECUTING'].includes(S)) buttons.push(btn('plan', p ? (p.status === 'DRAFT' ? `Sửa phương án v${p.v}` : `Sửa phương án (tạo v${p.v + 1})`) : 'Lập phương án', () => f5Plan(i.id), p && p.status !== 'DRAFT' ? 'ghost' : 'solid'));
  if (p && p.status === 'DRAFT') buttons.push(btn('submit', 'Duyệt & Áp dụng phương án', () => f5Submit(i.id), 'solid'));
  if (S === 'EXECUTING') {
    if (!(i.resOk && i.resOk.sig === resSig(p))) buttons.push(btn('res', 'Xác nhận xe & nhân sự đáp ứng phương án', () => f5Res(i.id)));
    buttons.push(btn('cont', 'Cho phép tiếp tục chặng', () => f5Continue(i.id), 'solid', miss.length ? 'Còn thiếu: ' + miss.map((c) => `${c.label} (${byVi(c.by)})`).join('; ') : ''));
  }
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
            <div className="kv"><div><span>Chuyến</span><b>{t.id}</b></div><div><span>Tuyến</span><b>{reqOfTrip(t) ? <RouteText r={reqOfTrip(t)} /> : '—'}</b></div><div><span>Trạng thái</span><b>{human(t.status)}</b></div><div><span>ETA đã xác nhận</span><b>{dt(t.eta)}</b></div><div><span>Phụ trách</span><b>{i.owner || 'Chưa tiếp nhận'}</b></div></div>
            {realTrip && <div className="btn-row"><button type="button" className="btn ghost sm" onClick={() => go(`f/trip/${t.id}/progress`)}>Theo dõi hành trình</button></div>}</div>
          <div className="card pad"><h3 className="card-title">Lịch sử xử lý</h3>
            <ul className="timeline">{[...i.log].reverse().map((x: Any, k: number) => { const [a, b, c, r] = x; return <li key={k}><b>{b}</b><span>{dt(a)}{c ? ' • ' + c : ''}{r ? ' (' + (ROLE_VI[r] || human(r)) + ')' : ''}</span></li>; })}</ul></div>
        </div>
      </div>
      <p className="hint f5-sim">Bản demo: thao tác chỉ cập nhật dữ liệu dùng chung trong trình duyệt (mô phỏng), không gọi API.</p>
    </CoordinatorLayout>
  );
}
export default IncidentDetailPage;
