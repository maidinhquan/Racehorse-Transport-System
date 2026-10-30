// Tab "Xe & nhân sự": chuyến đường bộ (một xe + tổ lái) hoặc chuyến AIR (hai chặng xe sân bay, mỗi chặng 3 nhân sự riêng)
import { useEffect, useState } from 'react';
import { Pill, Tabs, tabOn } from '../../../components/common/ui';
import { canPlan, checkpoint, crewConflict, crewOf, curRoute, emp, fleetCountry, groundCanEdit, groundLegCheck, groundLegEndDate, groundLegs, groundServiceArea, isDriver, isVet, reqOfTrip, resourceGaps, tripHorses, vehicle, vehicleAccessIssue, vehicleConflict } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { commit, db, ui, useCoordinatorStore } from '../../../store/coordinatorStore';
import { cityLabel, date, dt, human } from '../../../utils/format';
import { crewSave, groundCrewSave, groundVehicleSet, resourceConfirm, vehicleAssign } from '../../../workflows/coordinatorActions';

function RoadResources({ t }: { t: Any }) {
  const v = t.vehicleId && vehicle(t.vehicleId), n = tripHorses(t).length;
  const [pick, setPick] = useState<Record<string, string>>({ ...(t.crew || {}) });
  useEffect(() => { setPick({ ...(t.crew || {}) }); }, [t.id, JSON.stringify(t.crew || {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos: Array<[string, string]> = [['MAIN_DRIVER', 'Tài xế chính *'], ['CO_DRIVER', 'Phụ xe / người chăm sóc *'], ['VETERINARIAN', 'Bác sĩ thú y *']];
  const opts = (role: string): Array<[string, string]> => [['', 'Chưa phân công'], ...db.employees.filter((e: Any) => (role === 'VETERINARIAN' ? e.position === 'VETERINARIAN' : e.role === 'DRIVER')).map((e: Any) => {
    const c = crewConflict(e, t), certBad = role === 'VETERINARIAN' && e.certExpiry < t.eta.slice(0, 10);
    return [e.id, `${e.name}${c ? ` – bận chuyến ${c.id}` : ''}${certBad ? ` – chứng chỉ hết hạn ${date(e.certExpiry)}` : ''}`] as [string, string];
  })];
  const access = (x: Any) => vehicleAccessIssue(t, x, 'pickup') || vehicleAccessIssue(t, x, 'delivery');
  const hidden = db.vehicles.filter((x: Any) => access(x)).length;
  const gaps = resourceGaps(t);
  return (<>
    <div className="grid2">
      <div className="card"><h3 className="card-title">Xe</h3>
        {v ? <div className="verify-row ok"><div className="between"><b style={{ color: 'var(--ink)' }}>{v.plate} • {v.model}</b><Pill v={v.status} /></div><p className="hint" style={{ marginTop: 6 }}>{v.stalls} ngăn • {v.features}</p></div> : <p className="subtitle">Chưa phân xe.</p>}
        {canPlan(t) ? <>
          <div className="eyebrow" style={{ marginTop: 16 }}>Xe khả dụng ({n} ngựa)</div>
          {hidden ? <p className="hint">Đã lọc {hidden} xe không vào được điểm nhận/giao (kích thước/tải trọng).</p> : null}
          {db.vehicles.filter((x: Any) => !access(x)).map((x: Any) => {
            const c = vehicleConflict(x, t), why = x.status !== 'READY' ? human(x.status) + (x.note ? ': ' + x.note : '') : x.stalls < n ? `Chỉ có ${x.stalls} ngăn` : c ? `Đã đặt cho ${c.id}` : '';
            return (
              <div className="chk-row" key={x.id}><div className="doc-text"><b>{x.plate}</b><span>{x.model} • {x.stalls} ngăn • {x.base}{why ? ' • ' + why : ''}</span></div>
                {x.id === t.vehicleId ? <Pill v="ASSIGNED" /> : <button type="button" className={`btn ${why ? 'ghost' : 'solid'} sm`} disabled={!!why} onClick={() => vehicleAssign(t.id, x.id)}>Phân công</button>}</div>
            );
          })}
        </> : null}
      </div>
      <div className="card"><h3 className="card-title">Nhân sự</h3><p className="subtitle">Một người không thể giữ hai vị trí. Chứng chỉ của bác sĩ thú y phải còn hiệu lực đến khi tới nơi ({date(t.eta.slice(0, 10))}).</p>
        {canPlan(t) ? <>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            {pos.map(([k, l]) => <div className="field" key={k}><label>{l}</label>
              <select id={`f-crew-${k}`} value={pick[k] || ''} onChange={(e) => setPick({ ...pick, [k]: e.target.value })}>{opts(k).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>)}
          </div>
          <div className="btn-row"><button type="button" className="btn solid" onClick={() => crewSave(t.id, pick)}>Lưu nhân sự</button></div>
        </> : crewOf(t).length ? crewOf(t).map(([k, id]) => <div className="chk-row" key={k}><div className="doc-text"><b>{emp(id)?.name}</b><span>{human(k)} • {emp(id)?.phone}</span></div></div>) : <p className="hint">Chưa phân công nhân sự.</p>}
      </div>
    </div>
    <div className="card pad" style={{ marginTop: 16 }}>
      <div className="between"><h3 className="card-title">Xác nhận bố trí xe &amp; nhân sự</h3><Pill v={t.resourcesConfirmed ? 'READY' : 'PENDING'} label={t.resourcesConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'} /></div>
      <p className="subtitle">Coordinator chịu trách nhiệm chọn xe, đủ tài xế và bác sĩ thú y. Manager không phê duyệt nhân sự riêng, nhưng sẽ kiểm tra quyết định này trước khi duyệt khởi hành.</p>
      {gaps.length ? <div className="note yellow"><div><b>Còn thiếu:</b> {gaps.join(', ')}</div></div> : null}
      {t.resourcesConfirmed ? <p className="hint">Người xác nhận: {t.resourcesConfirmed.by || 'Fleet Coordinator'} • {dt(t.resourcesConfirmed.at)}</p> : null}
      {canPlan(t) && !t.resourcesConfirmed ? <div className="btn-row"><button type="button" className="btn solid" disabled={!!gaps.length} onClick={() => resourceConfirm(t.id)}>Xác nhận bố trí xe &amp; nhân sự</button></div> : null}
    </div>
  </>);
}

const ROLES = (isOrigin: boolean): Array<[string, string]> => [['MAIN_DRIVER', 'Tài xế chính'], ['CO_DRIVER', 'Phụ lái kiêm Escort'], ['VETERINARIAN', isOrigin ? 'Bác sĩ thú y A' : 'Bác sĩ thú y B']];
function GroundLeg({ t, leg }: { t: Any; leg: string }) {
  const g = groundLegs(t)[leg], check = groundLegCheck(t, leg), co = check.country, canEdit = groundCanEdit(t);
  const r = reqOfTrip(t), isOrigin = leg === 'outbound', area = isOrigin ? r.origin : r.destination;
  const fromAirport = t.flight?.from ? checkpoint(t.flight.from) : curRoute(t)?.stops?.filter((s: Any) => s.type === 'AIRPORT')[0]?.cp && checkpoint(curRoute(t).stops.filter((s: Any) => s.type === 'AIRPORT')[0].cp);
  const toAirport = t.flight?.to ? checkpoint(t.flight.to) : curRoute(t)?.stops?.filter((s: Any) => s.type === 'AIRPORT').slice(-1)[0]?.cp && checkpoint(curRoute(t).stops.filter((s: Any) => s.type === 'AIRPORT').slice(-1)[0].cp);
  const airport = isOrigin ? fromAirport : toAirport;
  const begin = isOrigin ? [r.pickup?.name, r.pickup?.address].filter(Boolean).join(' · ') || cityLabel(r.origin) : airport?.name || 'Chưa chọn sân bay đến';
  const finish = isOrigin ? airport?.name || 'Chưa chọn sân bay xuất phát' : [r.delivery?.name, r.delivery?.address].filter(Boolean).join(' · ') || cityLabel(r.destination);
  const n = tripHorses(t).length, end = groundLegEndDate(t, leg), other = groundLegs(t)[isOrigin ? 'inbound' : 'outbound'];
  const base = db.vehicles.filter((v: Any) => fleetCountry(v) === co && groundServiceArea(v, co, area) && v.status === 'READY' && v.stalls >= n && !vehicleConflict(v, t) && other.vehicleId !== v.id);
  const options = base.filter((v: Any) => !vehicleAccessIssue(t, v, isOrigin ? 'pickup' : 'delivery')), hiddenByAccess = base.length - options.length;
  const available = (role: string) => db.employees.filter((e: Any) => e.country === co && groundServiceArea(e, co, area) && (role === 'VETERINARIAN' ? isVet(e) && e.certExpiry >= end : isDriver(e)) && !crewConflict(e, t) && !Object.values(other.crew || {}).includes(e.id));
  const [sel, setSel] = useState<Record<string, string>>({ ...(g.crew || {}) });
  useEffect(() => { setSel({ ...(g.crew || {}) }); }, [t.id, leg, JSON.stringify(g.crew || {})]); // eslint-disable-line react-hooks/exhaustive-deps
  const roles = ROLES(isOrigin);
  const status = check.ok ? 'Đã đủ nguồn lực' : (!g.vehicleId && !['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'].some((k) => g.crew?.[k]) ? 'Chưa phân công' : 'Chưa đầy đủ');
  return (
    <section className="cbn-road-leg">
      <header className="cbn-road-head">
        <div><div className="eyebrow">{isOrigin ? 'CHẶNG 1 · ĐƯỜNG BỘ TRƯỚC CHUYẾN BAY' : 'CHẶNG 2 · ĐƯỜNG BỘ SAU CHUYẾN BAY'}</div>
          <h3>ROAD {co} – {isOrigin ? 'Vận chuyển trước chuyến bay' : 'Vận chuyển sau chuyến bay'}</h3>
          <div className="cbn-road-route"><span>{begin}</span><b>→</b><span>{finish}</span></div>
          <p className="hint">Quốc gia: {co} · {cityLabel(area)} · Hạn chứng chỉ bác sĩ: {date(end)}</p></div>
        <Pill v={check.ok ? 'READY' : 'PENDING'} label={status} />
      </header>
      {!canEdit ? <div className="note grey" style={{ margin: '12px 0' }}>{!canPlan(t) ? 'Phân công chỉ xem khi Trip chưa được triển khai hoặc đã rời giai đoạn Planning.' : 'Tuyến đang chờ duyệt hoặc đã được Manager duyệt. Muốn thay nguồn lực, hãy tạo phiên bản tuyến mới để Manager phê duyệt lại.'}</div> : null}
      <div className="cbn-road-grid">
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Xe vận chuyển</h4><Pill v={check.vehicleOk ? 'READY' : 'PENDING'} label={check.vehicleOk ? 'Hợp lệ' : 'Chưa hợp lệ'} /></div>
          {g.vehicleId ? <div className="cbn-road-selected"><span>Xe đang phân công</span><b>{check.vehicle?.plate || 'Không tìm thấy xe'}</b><small>{check.vehicle?.model || 'Cần thay phương tiện'} · {check.vehicleOk ? 'Đủ chỗ, phù hợp khu vực và lịch' : 'Không đáp ứng điều kiện'}</small></div> : null}
          {options.length ? <>{options.map((v: Any) => (
            <div className="cbn-road-vrow" key={v.id}>
              <div className="grow"><b>{v.plate}</b><p>{v.model} · {v.stalls} ngăn · {v.base} ({co})</p><small>{v.features || 'Xe vận chuyển ngựa'} · Sẵn sàng</small></div>
              {canEdit ? <button type="button" className={`btn ${g.vehicleId === v.id ? 'soft' : 'solid'} sm`} disabled={g.vehicleId === v.id} onClick={() => groundVehicleSet(t.id, leg, v.id)}>{g.vehicleId === v.id ? 'Đã chọn' : 'Phân công'}</button>
                : g.vehicleId === v.id ? <Pill v="READY" label="Đang sử dụng" /> : null}
            </div>))}
            {hiddenByAccess ? <p className="hint">Đã lọc {hiddenByAccess} xe không vào được {isOrigin ? 'điểm nhận' : 'điểm giao'} (kích thước/tải trọng).</p> : null}</>
            : <div className="cbn-road-empty">Không có xe hợp lệ tại quốc gia/khu vực này, hoặc xe đã kín lịch. Cần bổ sung nguồn lực hợp lệ từ Fleet/đối tác trước khi xác nhận.</div>}
        </div>
        <div className="card cbn-road-card"><div className="between"><h4 className="card-title">Nhân sự</h4><Pill v={check.crewOk ? 'READY' : 'PENDING'} label={check.crewOk ? 'Đủ 3 vị trí' : 'Chưa đủ 3 vị trí'} /></div>
          <p className="subtitle">Ba người riêng biệt, đúng quốc gia/khu vực, chưa được gắn vào chuyến nào khác đang hoạt động; chứng chỉ thú y còn hiệu lực.</p>
          {canEdit ? <>
            <div className="cbn-road-staff">{roles.map(([key, title]) => {
              const opts: Array<[string, string]> = [['', '— Chọn nhân sự phù hợp —'], ...available(key).map((e: Any) => [e.id, `${e.name}${key === 'VETERINARIAN' ? ' · CC: ' + e.certExpiry : ''}`] as [string, string])];
              const saved = emp(g.crew?.[key]); if (saved && !opts.some(([id]) => id === saved.id)) opts.push([saved.id, saved.name + ' · Không còn hợp lệ (cần thay)']);
              return <div className="field" key={key}><label>{title} *</label><select id={`f-ground-${leg}-${key}`} value={sel[key] || ''} onChange={(e) => setSel({ ...sel, [key]: e.target.value })}>{opts.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></div>;
            })}</div>
            <button type="button" className="btn solid" style={{ marginTop: 16 }} onClick={() => groundCrewSave(t.id, leg, roles.map(([k]) => sel[k] || ''))}>Lưu phân công nhân sự</button>
          </> : <div className="cbn-air-crew">{roles.map(([key, title]) => <div className="cbn-air-crew-row" key={key}><span>{title}</span><b>{emp(g.crew?.[key])?.name || 'Chưa phân công'}</b></div>)}</div>}
          <p className="cbn-road-note">{isOrigin ? 'Tại sân bay xuất phát, bác sĩ A phối hợp bàn giao ngựa và hồ sơ y tế cho đơn vị hàng không.' : 'Sau thủ tục tiếp nhận và kiểm dịch, bác sĩ B tiếp nhận ngựa, hồ sơ và thông tin sức khỏe từ đơn vị hàng không.'}</p>
        </div>
      </div>
      <details className="cbn-road-history"><summary>Lịch sử phân công chặng ({(g.history || []).length})</summary>
        {(g.history || []).length ? (g.history || []).slice(-6).reverse().map((h: Any, k: number) => <div className="cbn-road-log" key={k}><b>{h.action}</b> · {dt(h.at)} · {h.by}<p>{h.before || '—'} → {h.after || '—'}</p></div>) : <p className="hint">Chưa có thay đổi nào được lưu.</p>}
      </details>
    </section>
  );
}
function AirResources({ t }: { t: Any }) {
  const gaps = resourceGaps(t), leg = tabOn('f-leg', 'outbound');
  return (<>
    <div className="cbn-air-strip"><b>Phương án B – Đường bộ trước/sau chuyến bay:</b> Mỗi chặng có một xe, tài xế chính, phụ lái kiêm Escort và bác sĩ thú y riêng. Bác sĩ A bàn giao tại sân bay đi; bác sĩ B nhận bàn giao tại sân bay đến. <b>Hãng hàng không thuê ngoài</b> bố trí nhân sự chăm sóc ngựa và phương án hỗ trợ thú y trên máy bay, không yêu cầu bác sĩ CBN bay cùng.</div>
    <Tabs k="f-leg" fallback="outbound" items={[['outbound', `Chặng 1 · Trước chuyến bay${groundLegCheck(t, 'outbound').ok ? ' ✓' : ''}`], ['inbound', `Chặng 2 · Sau chuyến bay${groundLegCheck(t, 'inbound').ok ? ' ✓' : ''}`]]} />
    <div className="cbn-road-stack"><GroundLeg key={leg} t={t} leg={leg} /></div>
    <div className="card pad" style={{ marginTop: 17 }}>
      <div className="between"><h3 className="card-title">Xác nhận bố trí phương tiện &amp; nhân sự</h3><Pill v={t.resourcesConfirmed ? 'READY' : 'PENDING'} label={t.resourcesConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'} /></div>
      {gaps.length ? <div className="note yellow" style={{ marginTop: 14 }}><div><b>Chưa đủ điều kiện</b><p>{gaps.join(' • ')}</p></div></div>
        : <p className="hint">Hai chặng đường bộ đã có xe và đủ ba nhân sự riêng; hãng hàng không phụ trách chăm sóc ngựa trong chuyến bay.</p>}
      {canPlan(t) && !t.resourcesConfirmed ? <div className="btn-row"><button type="button" className="btn solid" disabled={!!gaps.length} onClick={() => resourceConfirm(t.id)}>Xác nhận nguồn lực</button></div> : null}
    </div>
  </>);
}
export function ResourcesTab({ t }: { t: Any }) {
  useCoordinatorStore();
  if (!ui.tab['f-leg']) { ui.tab['f-leg'] = 'outbound'; }
  void commit;
  return t.mode === 'AIR' ? <AirResources t={t} /> : <RoadResources t={t} />;
}
