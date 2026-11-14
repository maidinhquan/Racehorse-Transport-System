// Tab "Xe & nhân sự": chuyến đường bộ (một xe + tổ lái) hoặc chuyến AIR (hai chặng xe sân bay, mỗi chặng 3 nhân sự riêng)
import { useEffect, useState } from 'react';
import { Pill, Tabs, tabOn } from '../../../components/common/ui';
import { canPlan, checkpoint, crewConflict, curRoute, emp, fleetCountry, groundCanEdit, groundLegCheck, groundLegEndDate, groundLegs, groundServiceArea, isDriver, isSameStaff, isVet, reqOfTrip, crewGaps, tripHorses, vehicle, vehicleAccessIssue, vehicleConflict, setServerBusyCrew, selectableStaff } from '../../../domain/coordinatorRules';
import { flow3Api } from '../../../api/flow3Api';
import type { Any } from '../../../store/coordinatorStore';
import { commit, db, go, ui, useCoordinatorStore } from '../../../store/coordinatorStore';
import { city, cityLabel, date, dt } from '../../../utils/format';
import { crewSave, groundCrewSave, groundVehicleSet, routeSubmit, routeWithdraw, vehicleAssign } from '../../../workflows/coordinatorActions';
import { getUserFullName } from '../../../../../shared/utils/userNameResolver';

function RoadResources({ t }: { t: Any }) {
  const [, setBusyLoaded] = useState(0);
  // Hỏi máy chủ ai đang giữ chuyến khác để loại họ khỏi danh sách chọn ngay từ đầu
  useEffect(() => {
    let active = true;
    flow3Api.getStaff({ tripId: t.id }).then((list) => {
      if (!active || !Array.isArray(list)) return;
      const busy: Array<[string, string]> = [];
      for (const st of list as Any[]) {
        const hit = (st.blockers || []).find((b: Any) => b.code === 'RESOURCE_CONFLICT');
        const other = hit && String(hit.message || '').match(/TRIP[_-]?\d+/i)?.[0];
        if (other) busy.push([st.id, other]);
      }
      setServerBusyCrew(busy);
      setBusyLoaded((n) => n + 1);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [t.id]);
  const v = t.vehicleId && vehicle(t.vehicleId), n = tripHorses(t).length, canEdit = groundCanEdit(t);
  const r = reqOfTrip(t), co = city(r.origin)[1], end = t.eta.slice(0, 10);
  const [pick, setPick] = useState<Record<string, string>>({ ...(t.crew || {}) });
  useEffect(() => { setPick({ ...(t.crew || {}) }); }, [t.id, JSON.stringify(t.crew || {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const roles: Array<[string, string]> = [['MAIN_DRIVER', 'Tài xế chính'], ['CO_DRIVER', 'Phụ xe / người chăm sóc'], ['VETERINARIAN', 'Bác sĩ thú y']];
  // Chỉ hiện xe dùng được ngay: đúng quốc gia, sẵn sàng, đủ ngăn, không trùng lịch, vào được điểm nhận/giao, chưa được chọn
  const usable = (x: Any) => fleetCountry(x) === co && x.status === 'READY' && x.stalls >= n && !vehicleConflict(x, t)
    && !vehicleAccessIssue(t, x, 'pickup') && !vehicleAccessIssue(t, x, 'delivery');
  const options = db.vehicles.filter((x: Any) => usable(x) && x.id !== t.vehicleId);
  // Nhân sự: đúng vai trò, không bận chuyến khác, chứng chỉ thú y còn hạn, chưa được chọn ở vị trí khác
  const available = (role: string) => selectableStaff().filter((e: Any) => (role === 'VETERINARIAN' ? isVet(e) && e.certExpiry >= end : isDriver(e))
    && !crewConflict(e, t) && !roles.some(([k]) => k !== role && isSameStaff(pick[k], e.id)));
  /** Người đúng vai trò nhưng đang bận chuyến trùng lịch hoặc hết hạn chứng chỉ – hiện mờ kèm lý do. */
  const blocked = (role: string): Array<[string, string]> => selectableStaff().filter((e: Any) => (role === 'VETERINARIAN' ? isVet(e) : isDriver(e)) && !available(role).includes(e) && !isSameStaff(pick[role], e.id) && !roles.some(([k]) => k !== role && isSameStaff(pick[k], e.id)))
    .map((e: Any) => [e.id, `${e.name} – ${crewConflict(e, t) ? `bận ${crewConflict(e, t).id}` : role === 'VETERINARIAN' && e.certExpiry < end ? `chứng chỉ hết hạn ${date(e.certExpiry)}` : 'không phù hợp'}`]);
  const vehicleOk = !!v && usable(v), crewOk = roles.every(([k]) => !!t.crew?.[k]);
  return (<>
    <section className="cbn-road-leg" style={{ marginTop: 18 }}>
      <header className="cbn-road-head">
        <div className="cbn-road-head__main">
          <div className="between">
            <div>
              <div className="eyebrow">ĐƯỜNG BỘ</div>
              <h3>Xe &amp; nhân sự</h3>
            </div>
            <Pill v={vehicleOk && crewOk ? 'READY' : 'PENDING'} label={vehicleOk && crewOk ? 'Đã đủ nguồn lực' : 'Chưa đầy đủ'} />
          </div>
          <div className="cbn-road-endpoints">
            <div className="cbn-road-endpoint">
              <span className="cbn-road-endpoint__tag"><i className="dot from" />Điểm nhận</span>
              <b>{r.pickup?.name || cityLabel(r.origin)}</b>
              {r.pickup?.address ? <small>{r.pickup.address}</small> : null}
            </div>
            <div className="cbn-road-endpoint">
              <span className="cbn-road-endpoint__tag"><i className="dot to" />Điểm giao</span>
              <b>{r.delivery?.name || cityLabel(r.destination)}</b>
              {r.delivery?.address ? <small>{r.delivery.address}</small> : null}
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>{n} ngựa • Hạn chứng chỉ bác sĩ: {date(end)}</p>
        </div>
      </header>
      <div className="cbn-road-grid">
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Xe vận chuyển</h4><Pill v={vehicleOk ? 'READY' : 'PENDING'} label={vehicleOk ? 'Hợp lệ' : v ? 'Cần thay' : 'Chưa chọn'} /></div>
          {v ? <div className="cbn-road-selected"><span>Xe đang phân công</span><b>{v.plate}</b><small>{v.model} · {v.stalls} ngăn{vehicleOk ? '' : ' · Không còn phù hợp, cần thay xe'}</small></div> : null}
          {canEdit ? (options.length ? options.map((x: Any) => (
            <div className="cbn-road-vrow" key={x.id}>
              <div className="grow"><b>{x.plate}</b><p>{x.model} • {x.stalls} ngăn • {x.base}</p><small>{x.features || 'Xe vận chuyển ngựa'} • Sẵn sàng</small></div>
              <button type="button" className="btn solid sm" onClick={() => vehicleAssign(t.id, x.id)}>{v ? 'Đổi sang xe này' : 'Phân công'}</button>
            </div>))
            : <div className="cbn-road-empty">{v ? 'Không còn xe phù hợp khác để đổi.' : 'Không có xe phù hợp: tất cả xe đang bận, bảo dưỡng hoặc không đủ điều kiện.'}</div>)
            : null}
        </div>
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Nhân sự</h4><Pill v={crewOk ? 'READY' : 'PENDING'} label={crewOk ? 'Đủ 3 vị trí' : 'Chưa đủ 3 vị trí'} /></div>
          {canEdit ? <>
            <div className="cbn-road-staff">{roles.map(([key, title]) => {
              const opts: Array<[string, string]> = [['', '— Chọn nhân sự phù hợp —'], ...available(key).map((e: Any) => [e.id, `${e.name}${key === 'VETERINARIAN' ? ' · chứng chỉ đến ' + date(e.certExpiry) : ''}`] as [string, string])];
              const saved = emp(pick[key]); if (saved && !opts.some(([id]) => id === saved.id)) opts.push([saved.id, saved.name + ' · Không còn hợp lệ (cần thay)']);
              return <div className="field" key={key}><label>{title} *</label><select id={`f-crew-${key}`} value={pick[key] || ''} onChange={(e) => setPick({ ...pick, [key]: e.target.value })}>{opts.map(([id, l]) => <option key={id} value={id}>{l}</option>)}{blocked(key).map(([id, l]) => <option key={`b-${id}`} value={id} disabled>{l}</option>)}</select></div>;
            })}</div>
            <button type="button" className="btn solid" style={{ marginTop: 16 }} onClick={() => crewSave(t.id, pick)}>Lưu phân công nhân sự</button>
          </> : <div className="cbn-air-crew">{roles.map(([key, title]) => <div className="cbn-air-crew-row" key={key}><span>{title}</span><b>{getUserFullName(emp(t.crew?.[key])?.name || t.crew?.[key], 'Chưa phân công')}</b></div>)}</div>}
        </div>
      </div>
    </section>
  </>);
}
const ROLES = (isOrigin: boolean): Array<[string, string]> => [['MAIN_DRIVER', 'Tài xế chính'], ['CO_DRIVER', 'Phụ lái kiêm Escort'], ['VETERINARIAN', isOrigin ? 'Bác sĩ thú y A' : 'Bác sĩ thú y B']];
function GroundLeg({ t, leg }: { t: Any; leg: string }) {
  const g = groundLegs(t)[leg], check = groundLegCheck(t, leg), co = check.country, canEdit = groundCanEdit(t);
  const r = reqOfTrip(t), isOrigin = leg === 'outbound', area = isOrigin ? r.origin : r.destination;
  const fromAirport = t.flight?.from ? checkpoint(t.flight.from) : curRoute(t)?.stops?.filter((s: Any) => s.type === 'AIRPORT')[0]?.cp && checkpoint(curRoute(t).stops.filter((s: Any) => s.type === 'AIRPORT')[0].cp);
  const toAirport = t.flight?.to ? checkpoint(t.flight.to) : curRoute(t)?.stops?.filter((s: Any) => s.type === 'AIRPORT').slice(-1)[0]?.cp && checkpoint(curRoute(t).stops.filter((s: Any) => s.type === 'AIRPORT').slice(-1)[0].cp);
  const airport = isOrigin ? fromAirport : toAirport;
  const beginName = isOrigin ? (r.pickup?.name || cityLabel(r.origin)) : (airport?.name || 'Chưa chọn sân bay đến');
  const beginSub = isOrigin ? (r.pickup?.address || '') : '';
  const finishName = isOrigin ? (airport?.name || 'Chưa chọn sân bay xuất phát') : (r.delivery?.name || cityLabel(r.destination));
  const finishSub = isOrigin ? '' : (r.delivery?.address || '');
  const n = tripHorses(t).length, end = groundLegEndDate(t, leg), other = groundLegs(t)[isOrigin ? 'inbound' : 'outbound'];
  const base = db.vehicles.filter((v: Any) => fleetCountry(v) === co && groundServiceArea(v, co, area) && v.status === 'READY' && v.stalls >= n && !vehicleConflict(v, t) && other.vehicleId !== v.id);
  const options = base.filter((v: Any) => !vehicleAccessIssue(t, v, isOrigin ? 'pickup' : 'delivery') && v.id !== g.vehicleId);
  const available = (role: string) => selectableStaff().filter((e: Any) => e.country === co && groundServiceArea(e, co, area)
    && (role === 'VETERINARIAN' ? isVet(e) && e.certExpiry >= end : isDriver(e))
    && !crewConflict(e, t)
    && !Object.values(other.crew || {}).some((assignedId) => isSameStaff(assignedId as string, e.id))
    && !roles.some(([k]) => k !== role && isSameStaff(sel[k], e.id)));
  /** Người đúng vai trò/khu vực nhưng đang bận chuyến trùng lịch hoặc ở chặng còn lại – hiện mờ kèm lý do. */
  const blocked = (role: string): Array<[string, string]> => selectableStaff().filter((e: Any) => e.country === co && groundServiceArea(e, co, area) && (role === 'VETERINARIAN' ? isVet(e) : isDriver(e)) && !available(role).includes(e) && !isSameStaff(sel[role], e.id) && !roles.some(([k]) => k !== role && isSameStaff(sel[k], e.id)))
    .map((e: Any) => [e.id, `${e.name} – ${crewConflict(e, t) ? `bận ${crewConflict(e, t).id}` : Object.values(other.crew || {}).some((assignedId) => isSameStaff(assignedId as string, e.id)) ? 'đã ở chặng còn lại' : role === 'VETERINARIAN' && e.certExpiry < end ? `chứng chỉ hết hạn ${date(e.certExpiry)}` : 'không phù hợp'}`]);
  const [sel, setSel] = useState<Record<string, string>>({ ...(g.crew || {}) });
  useEffect(() => { setSel({ ...(g.crew || {}) }); }, [t.id, leg, JSON.stringify(g.crew || {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const roles = ROLES(isOrigin);
  const status = check.ok ? 'Đã đủ nguồn lực' : (!g.vehicleId && !['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'].some((k) => g.crew?.[k]) ? 'Chưa phân công' : 'Chưa đầy đủ');
  return (
    <section className="cbn-road-leg">
      <header className="cbn-road-head">
        <div className="cbn-road-head__main">
          <div className="between">
            <div>
              <div className="eyebrow">{isOrigin ? 'CHẶNG 1 • PRE-FLIGHT ROAD' : 'CHẶNG 2 • POST-FLIGHT ROAD'}</div>
              <h3>ROAD {co} – {isOrigin ? 'Vận chuyển trước chuyến bay' : 'Vận chuyển sau chuyến bay'}</h3>
            </div>
            <Pill v={check.ok ? 'READY' : 'PENDING'} label={status} />
          </div>
          <div className="cbn-road-endpoints">
            <div className="cbn-road-endpoint">
              <span className="cbn-road-endpoint__tag"><i className="dot from" />Điểm xuất phát chặng</span>
              <b>{beginName}</b>
              {beginSub ? <small>{beginSub}</small> : null}
            </div>
            <div className="cbn-road-endpoint">
              <span className="cbn-road-endpoint__tag"><i className="dot to" />Điểm kết thúc chặng</span>
              <b>{finishName}</b>
              {finishSub ? <small>{finishSub}</small> : null}
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>Quốc gia: {co} • {cityLabel(area)}, {co} • Hạn chứng chỉ bác sĩ: {date(end)}</p>
        </div>
      </header>
            <div className="cbn-road-grid">
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Xe vận chuyển</h4><Pill v={check.vehicleOk ? 'READY' : 'PENDING'} label={check.vehicleOk ? 'Hợp lệ' : 'Chưa hợp lệ'} /></div>
          {g.vehicleId ? <div className="cbn-road-selected"><span>Xe đang phân công</span><b>{check.vehicle?.plate || 'Không tìm thấy xe'}</b><small>{check.vehicle?.model || 'Cần thay phương tiện'} · {check.vehicleOk ? 'Đủ chỗ, phù hợp khu vực và lịch' : 'Không đáp ứng điều kiện'}</small></div> : null}
          {options.length ? <>{options.map((v: Any) => (
            <div className="cbn-road-vrow" key={v.id}>
              <div className="grow"><b>{v.plate}</b><p>{v.model} • {v.stalls} ngăn • {v.base} ({co})</p><small>{v.features || 'Xe vận chuyển ngựa'} • Sẵn sàng</small></div>
              {canEdit ? <button type="button" className={`btn ${g.vehicleId === v.id ? 'soft' : 'solid'} sm`} disabled={g.vehicleId === v.id} onClick={() => groundVehicleSet(t.id, leg, v.id)}>{g.vehicleId === v.id ? 'Đã chọn' : 'Phân công'}</button>
                : g.vehicleId === v.id ? <Pill v="READY" label="Đang sử dụng" /> : null}
            </div>))}</>
            : <div className="cbn-road-empty">Không có xe hợp lệ tại quốc gia/khu vực này, hoặc xe đã kín lịch. Cần bổ sung nguồn lực hợp lệ từ Fleet/đối tác trước khi xác nhận.</div>}
        </div>
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Nhân sự</h4><Pill v={check.crewOk ? 'READY' : 'PENDING'} label={check.crewOk ? 'Đủ 3 vị trí' : 'Chưa đủ 3 vị trí'} /></div>
          {canEdit ? <>
            <div className="cbn-road-staff">{roles.map(([key, title]) => {
              const opts: Array<[string, string]> = [['', '— Chọn nhân sự phù hợp —'], ...available(key).filter((e: Any) => !roles.some(([k]) => k !== key && sel[k] === e.id)).map((e: Any) => [e.id, `${e.name}${key === 'VETERINARIAN' ? ' · chứng chỉ đến ' + date(e.certExpiry) : ''}`] as [string, string])];
              const saved = emp(g.crew?.[key]); if (saved && !opts.some(([id]) => id === saved.id)) opts.push([saved.id, saved.name + ' · Không còn hợp lệ (cần thay)']);
              return <div className="field" key={key}><label>{title} *</label><select id={`f-ground-${leg}-${key}`} value={sel[key] || ''} onChange={(e) => setSel({ ...sel, [key]: e.target.value })}>{opts.map(([id, l]) => <option key={id} value={id}>{l}</option>)}{blocked(key).map(([id, l]) => <option key={`b-${id}`} value={id} disabled>{l}</option>)}</select></div>;
            })}</div>
            <button type="button" className="btn solid" style={{ marginTop: 16 }} onClick={() => groundCrewSave(t.id, leg, roles.map(([k]) => sel[k] || ''))}>Lưu phân công nhân sự</button>
          </> : <div className="cbn-air-crew">{roles.map(([key, title]) => <div className="cbn-air-crew-row" key={key}><span>{title}</span><b>{getUserFullName(emp(g.crew?.[key])?.name || g.crew?.[key], 'Chưa phân công')}</b></div>)}</div>}
        </div>
      </div>
      <details className="cbn-road-history"><summary style={{ cursor: 'pointer', userSelect: 'none' }}>▶ Lịch sử phân công chặng ({(g.history || []).length})</summary>
        {(g.history || []).length ? (g.history || []).slice(-6).reverse().map((h: Any, k: number) => <div className="cbn-road-log" key={k}><b>{h.action}</b> • {dt(h.at)} • {getUserFullName(h.by)}<p>{h.before || '—'} → {h.after || '—'}</p></div>) : <p className="hint">Chưa có thay đổi nào được lưu.</p>}
      </details>
    </section>
  );
}
function AirResources({ t }: { t: Any }) {
  const leg = tabOn('f-leg', 'outbound');
  return (<>
    <Tabs k="f-leg" fallback="outbound" items={[['outbound', 'Chặng 1 - Trước chuyến bay'], ['inbound', 'Chặng 2 - Sau chuyến bay']]} />
    <div className="cbn-road-stack"><GroundLeg key={leg} t={t} leg={leg} /></div>
  </>);
}
export function ResourcesTab({ t }: { t: Any }) {
  useCoordinatorStore();
  if (!ui.tab['f-leg']) { ui.tab['f-leg'] = 'outbound'; }
  void commit;
  return (<>
    {t.mode === 'AIR' ? <AirResources t={t} /> : <RoadResources t={t} />}
    <SubmitCard t={t} />
  </>);
}

/** Gửi Manager duyệt: chỉ bấm được khi tuyến nháp đã có đủ xe và nhân sự. */
function SubmitCard({ t }: { t: Any }) {
  const rt = curRoute(t);
  if (!canPlan(t) || !rt) return null;
  if (rt.status === 'PENDING_APPROVAL') {
    return (
      <div className="card pad" style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
        <div className="between">
          <h3 className="card-title" style={{ margin: 0, color: '#0f172a' }}>Đã gửi Manager duyệt tuyến v{rt.v}</h3>
          <Pill v="PENDING_APPROVAL" label="Chờ Manager duyệt" />
        </div>
        <p className="subtitle" style={{ margin: '8px 0 0' }}>
          Lộ trình và nguồn lực đã được gửi cho Logistics Manager xem xét. Phân công xe và nhân sự tạm thời được khóa.
        </p>
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn ghost" onClick={() => go(`f/trip/${t.id}/route`)}>Xem lại lộ trình đã gửi</button>
          <button type="button" className="btn solid" onClick={() => routeWithdraw(t.id)}>Hủy gửi</button>
        </div>
      </div>
    );
  }
  if (rt.status !== 'DRAFT') return null;
  const gaps = crewGaps(t), air = t.mode === 'AIR';
  return (
    <div className="card pad" style={{ marginTop: 16 }}>
      <div className="between"><h3 className="card-title">Gửi Manager duyệt</h3>
        <Pill v={gaps.length ? 'PENDING' : 'READY'} label={gaps.length ? 'Chưa đủ xe/nhân sự' : 'Sẵn sàng gửi'} /></div>
      <p className="subtitle">Tuyến nháp v{rt.v}{air ? ' cùng xe và nhân sự hai chặng đường bộ.' : ' cùng xe và tổ lái.'}</p>
      {gaps.length ? <div className="note yellow" style={{ marginTop: 10 }}><div><b>Còn thiếu:</b> {gaps.join(', ')}</div></div> : null}
      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={() => go(`f/trip/${t.id}/route`)}>Xem lại tuyến</button>
        <button type="button" className="btn solid" disabled={!!gaps.length} onClick={() => routeSubmit(t.id)}>Gửi Manager duyệt</button>
      </div>
    </div>
  );
}
