// Tab "Tuyến đường" = bộ lập lộ trình: danh sách điểm, bản đồ Leaflet, gợi ý địa điểm quanh đoạn tuyến, tổng hợp lịch & chính sách nghỉ
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Icon, Pill } from '../../../components/common/ui';
import { PlannerMap } from '../../../components/maps/LeafletMaps';
import { canPlan, curRoute, placeById, reqOfTrip, tripHorses } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { db, go, useCoordinatorStore } from '../../../store/coordinatorStore';
import { addHours, dt, human } from '../../../utils/format';
import { routeSubmit } from '../../../workflows/coordinatorActions';
import { fmtMin, PF, PF_COLOR, PLACE_ST, ROUTE_POLICY, routeNew, routeSubmitError, ROUTING, RP, rpAdd, rpAirports, rpCalc, rpCandidates, rpDeadline, rpDel, rpDetour, rpEditable, rpEnsure, rpFlightKey, rpFocus, rpGroups, rpMove, rpPolicy, rpPolicyModal, rpRetry, rpRoute, rpRouteKey, rpRoutingModal, rpSave, rpSeg, rpSetAirCare, rpSetFilter, rpSetPurpose, rpSetStop, rpUseSim } from '../../../workflows/routePlanner';

function StopRow({ t, rt, s, i, calc, edit }: { t: Any; rt: Any; s: Any; i: number; calc: Any; edit: boolean }) {
  const ps = RP(t.id), row = calc && calc.rows[i], p = rt.status !== 'DRAFT' && s.placeSnapshot ? s.placeSnapshot : s.placeId ? placeById(s.placeId) : null;
  const segIss = calc ? calc.issues.filter((x: Any) => x.seg === i) : [], stIss = calc ? calc.issues.filter((x: Any) => x.stop === i) : [];
  const kind = s.type === 'ORIGIN' ? 'Điểm nhận (từ yêu cầu)' : s.type === 'DESTINATION' ? 'Điểm giao (từ yêu cầu)' : s.required ? 'Điểm bắt buộc' : 'Điểm tùy chọn';
  const supports: string[] = p ? p.functions : [];
  const mid = i > 0 && i < rt.stops.length - 1;
  const purposes = edit && !s.required && mid
    ? <div className="rp-purp">{['REST', 'FUEL'].filter((fn) => supports.includes(fn)).map((fn) => <label key={fn}><input type="checkbox" checked={s.purposes.includes(fn)} onChange={(e) => rpSetPurpose(t.id, i, fn, e.target.checked)} /> {PF[fn]}</label>)}</div>
    : <span className="rp-tags">{(s.purposes || []).map((fn: string, k: number) => <span key={fn}>{k ? ' • ' : null}<i style={{ background: PF_COLOR[fn] }} />{PF[fn]}</span>)}</span>;
  let legInfo: ReactNode = null;
  if (i < rt.stops.length - 1) {
    const fl = rpGroups(t, rt).flight;
    if (fl && i === fl[0]) legInfo = <div className="rp-leg flight">✈ Chặng bay {t.flight ? `${t.flight.flightNo || ''} • ${dt(t.flight.departAt)} → ${dt(t.flight.arriveAt)}` : '(chưa chọn chuyến bay)'} – không tính đường bộ, không tính là nghỉ</div>;
    else {
      const l = ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt) ? ps.routing.legs[i] : null;
      legInfo = (
        <button type="button" className={`rp-leg ${ps.seg === i ? 'on' : ''} ${segIss.length ? 'bad' : ''}`} onClick={() => rpSeg(t.id, i)}>
          {l ? `${l.km.toFixed(0)} km • ${fmtMin(l.min * ROUTE_POLICY.truckFactor)}` : '…'}{edit ? <> • <b>＋ thêm điểm dừng ở đoạn này</b></> : null}
          {segIss.map((x: Any, k: number) => <span key={k}><Icon name="alert" />{x.msg}</span>)}
        </button>
      );
    }
  }
  const color = s.type === 'ORIGIN' ? '#0f172a' : s.type === 'DESTINATION' ? '#16a34a' : s.required ? '#dc2626' : '#f08a2b';
  return (
    <li className={`rp-stop ${ps.selStop === i ? 'on' : ''} ${s.required ? 'req' : ''} ${stIss.length ? 'bad' : ''}`} id={`rp-stop-${i}`}>
      <div className="rp-stop-main" onClick={(e) => { if ((e.target as HTMLElement).closest('input,button,label')) return; rpFocus(t.id, i); }}>
        <span className="rp-num" style={{ background: color }}>{i + 1}</span>
        <div className="grow"><b>{s.name}</b>
          <small>{kind}{s.required && s.type !== 'ORIGIN' && s.type !== 'DESTINATION' ? ' 🔒' : ''}{s.type === 'ORIGIN' || s.type === 'DESTINATION' ? (s.exactGeo ? ' • tọa độ từ địa chỉ khách chọn' : ' • tọa độ theo thành phố (dữ liệu mẫu)') : p ? ' • ' + p.country : ' • chưa có trong danh mục'}</small>
          {purposes}
          <div className="rp-times">{row && row.arrive ? `Đến ${dt(row.arrive)}` : ''}{mid ? <> • dừng {edit && !s.required ? <><input type="number" min="0" step="5" className="rp-dwell" value={s.dwellMin} onChange={(e) => rpSetStop(t.id, i, 'dwellMin', e.target.value)} /> phút</> : fmtMin(s.dwellMin)}</> : null}{row && row.depart ? ` • rời ${dt(row.depart)}` : ''}</div>
          {mid && s.purposes.includes('REST') ? <label className="rp-unload">{edit ? <input type="checkbox" checked={!!s.unload} onChange={(e) => rpSetStop(t.id, i, 'unload', e.target.checked)} /> : (s.unload ? '✓' : '✗')} Đưa ngựa xuống xe (nghỉ {s.unload ? 'ngoài xe' : 'trên xe'})</label> : null}
          {edit && mid ? <input className="rp-note" placeholder="Mục đích / hoạt động chăm sóc" value={s.careNote || ''} onChange={(e) => rpSetStop(t.id, i, 'careNote', e.target.value)} /> : s.careNote ? <small>{s.careNote}</small> : null}
          {stIss.map((x: Any, k: number) => <div key={k} className="rp-issue"><Icon name="alert" />{x.msg}</div>)}
        </div>
        {edit && !s.required ? <div className="rp-ops">
          <button type="button" className="btn ghost sm" disabled={i <= 1} aria-label="Lên" onClick={() => rpMove(t.id, i, -1)}>↑</button>
          <button type="button" className="btn ghost sm" disabled={i >= rt.stops.length - 2} aria-label="Xuống" onClick={() => rpMove(t.id, i, 1)}>↓</button>
          <button type="button" className="btn danger sm" aria-label="Bỏ" onClick={() => rpDel(t.id, i)}>✕</button>
        </div> : null}
      </div>
      {legInfo}
    </li>
  );
}

function Detail({ t }: { t: Any }) {
  const ps = RP(t.id), rt = curRoute(t), edit = rpEditable(t, rt);
  if (ps.sel && placeById(ps.sel)) {
    const p = placeById(ps.sel), c = rpCandidates(t).find((x: Any) => x.p.id === p.id), d = ps.detour[p.id];
    const yn = (b: Any) => (b ? 'có' : 'không');
    const facts = [p.rest ? `Đỗ xe chuyên dụng: ${yn(p.rest.truckParking)} • chăm sóc trên xe: ${yn(p.rest.onboardCare)} • nước/thức ăn: ${yn(p.rest.waterFeed)} • khu lên/xuống: ${yn(p.rest.loadingArea)} • lưu ngựa: ${yn(p.rest.stabling)} • sức chứa cơ sở: ${p.rest.capacity || '—'} ngựa` : '',
      p.fuel ? `Nhiên liệu: ${p.fuel.fuels} • xe tải lớn vào được: ${yn(p.fuel.heavyAccess)}` : '', p.airport ? `Mã sân bay ${p.airport.iata} • tiếp nhận ngựa: ${yn(p.airport.horseHandling)}` : '', p.service ? `${p.service.kind} • ${p.service.capacity}` : ''].filter(Boolean);
    return (
      <div className="rp-detail"><div className="between"><b>{p.name}</b><Pill v={PLACE_ST[p.status][0]} label={PLACE_ST[p.status][1]} /></div>
        <small>{p.functions.map((fn: string) => PF[fn]).join(' • ')} • {p.province}, {p.country} • giờ hoạt động {p.hours || '—'}</small>
        {facts.map((x, k) => <p key={k}>{x}</p>)}
        {c ? <>
          <div className="rp-impact">
            {d ? (d.status === 'loading' ? 'Đang tính đường đi thực tế qua địa điểm…' : d.status === 'ok'
              ? <><b>Ảnh hưởng dự kiến:</b> +{d.km.toFixed(1)} km • +{fmtMin(d.min)} chạy xe{d.sim ? ' (mô phỏng)' : ''} • ghé khoảng {dt(addHours(rpCalc(t).rows[ps.seg].depart, d.firstMin / 60))}</>
              : <><span className="t-bad">{d.error}</span> <button type="button" className="link" onClick={() => rpDetour(t.id, p.id)}>Thử lại</button></>) : null}
            {c.why.length ? <div className="rp-issue"><Icon name="alert" />Không còn phù hợp: {c.why.join('; ')}</div> : null}
          </div>
          {edit ? <button type="button" className="btn solid block" disabled={p.status !== 'ACTIVE'} onClick={() => rpAdd(t.id, p.id)}>Thêm vào hành trình (đoạn {ps.seg + 1})</button> : null}
        </> : <p className="hint">Chọn một đoạn tuyến để xem ảnh hưởng nếu ghé địa điểm này.</p>}
        <p className="hint">Sức chứa là khả năng tiếp nhận của cơ sở, không phải số chỗ còn trống (chưa có hệ thống đặt chỗ).</p>
      </div>
    );
  }
  return <div className="rp-detail"><p className="hint">{ps.seg == null ? 'Bấm “＋ thêm điểm dừng ở đoạn này” giữa hai điểm trong danh sách để xem địa điểm phù hợp quanh đoạn đó.' : 'Bấm một marker gợi ý trên bản đồ để xem thông tin và ảnh hưởng tới hành trình.'}</p></div>;
}

function Summary({ t }: { t: Any }) {
  const ps = RP(t.id), rt = curRoute(t), calc = rpCalc(t), deadline = rt && rt.status !== 'DRAFT' && rt.deadlineSnapshot ? rt.deadlineSnapshot : rpDeadline(t), rs = ps.routing;
  const status = rs.status === 'loading' ? <div className="rp-state"><span className="geo-spin" />Đang tính tuyến…</div>
    : rs.status === 'error' || rs.status === 'noroute' ? (
      <div className="rp-state bad"><Icon name="alert" /><span>{rs.status === 'noroute' ? 'Không tìm được đường: ' : 'Lỗi routing: '}{rs.error} Danh sách điểm hiện tại chưa có tuyến hợp lệ.</span>
        <button type="button" className="btn ghost sm" onClick={() => rpRetry(t.id)}>Thử lại</button>
        {rs.network ? <button type="button" className="btn ghost sm" onClick={() => rpUseSim(t.id)}>Dùng ước tính mô phỏng</button> : null}</div>) : null;
  if (!calc) return <div className="card pad rp-sum">{status}<p className="hint">Chưa có kết quả tính tuyến cho danh sách điểm hiện tại.</p></div>;
  const issues = calc.issues, policy = rpPolicy(rt), late = !!deadline && calc.eta > deadline;
  const checked = !!rt.airCareConfirmation && rt.airCareConfirmation.flightKey === rpFlightKey(t);
  return (
    <div className="card pad rp-sum">{status}
      {rs.sim ? <div className="note yellow" style={{ margin: '0 0 10px' }}><div><b>Routing mô phỏng (dữ liệu mẫu)</b>Quãng đường/thời gian là ước tính, không phải đường thực tế. OSRM chỉ tham khảo đường bộ; muốn kiểm tra xe lớn cần dịch vụ định tuyến xe tải.</div></div> : null}
      <div className="rp-kpis">
        <div><span>Đường bộ</span><b>{calc.km.toFixed(0)} km</b></div>
        <div><span>Thời gian chạy</span><b>{fmtMin(calc.driveMin)}</b><small>× {policy.truckFactor} cho xe chở ngựa</small></div>
        <div><span>Dừng / chờ</span><b>{fmtMin(calc.stopMin)}</b></div>
        {t.mode === 'AIR' ? <div><span>Thời gian bay</span><b>{fmtMin(calc.flyMin)}</b></div> : null}
        <div><span>ETA</span><b className={late ? 't-bad' : ''}>{dt(calc.eta)}</b><small>{deadline ? 'Hạn giao ' + dt(deadline) : ''}</small></div>
      </div>
      {issues.length || late
        ? <div className="rp-issues"><b>{issues.length + (late ? 1 : 0)} lỗi cần xử lý trước khi gửi duyệt</b><ul>
          {late ? <li>ETA {dt(calc.eta)} trễ hơn hạn giao {dt(deadline)}.</li> : null}
          {issues.map((x: Any, k: number) => <li key={k}>{x.seg != null ? `Đoạn ${x.seg + 1}→${x.seg + 2}: ` : `Điểm ${x.stop + 1}: `}{x.msg}</li>)}</ul></div>
        : <div className="note green" style={{ margin: '10px 0 0' }}><Icon name="check" /><div><b>Lộ trình hợp lệ theo chính sách nghỉ</b>Kiểm tra thêm tuyến xe lớn, lối vào điểm nhận và nguồn lực trước khi gửi Manager duyệt.</div></div>}
      {t.mode === 'AIR' ? <div className="note blue"><div><b>Chăm sóc tại sân bay và trên chuyến bay</b>
        <p>Thời gian bàn giao/chờ/bay/tiếp nhận: {fmtMin(calc.airCareMin)}. Không được tính là nghỉ hồi phục. Mỗi chặng đường bộ có đồng hồ nghỉ riêng.</p>
        {rpEditable(t, rt) ? <label className="check-line"><input type="checkbox" checked={checked} onChange={(e) => rpSetAirCare(t.id, e.target.checked)} /> Đã xác nhận với hãng bay/đối tác phương án chăm sóc ngựa trong lúc bàn giao, chờ, bay và tiếp nhận (demo ghi nhận thủ công).</label>
          : <small>{checked || rt.airCareConfirmation ? 'Đã ghi nhận phương án chăm sóc theo phiên bản đã gửi.' : 'Chưa lưu xác nhận chăm sóc hãng bay.'}</small>}
      </div></div> : null}
      <p className="hint">Chính sách ({policy.label}): nghỉ chăm sóc tối đa mỗi {policy.careIntervalH} giờ, nghỉ ngắn ≥ {policy.shortRestMin} phút, đợt đường bộ ≤ {policy.roadEpisodeH} giờ, nghỉ hồi phục ngoài xe ≥ {policy.recoveryRestH} giờ{t.mode === 'AIR' ? `, bàn giao sân bay ${policy.airportHandoverH} giờ trước bay, tiếp nhận ${policy.airportReceiveH} giờ sau hạ cánh` : ''}. <button type="button" className="link" onClick={rpPolicyModal}>Cấu hình</button></p>
    </div>
  );
}

export function RouteTab({ t }: { t: Any }) {
  const ver = useCoordinatorStore();
  const [tileErr, setTileErr] = useState(false);
  const rt = curRoute(t), r = reqOfTrip(t), ps = RP(t.id);
  useEffect(() => { if (rt) rpRoute(t); }, [ver, t, rt]);
  if (!rt) return (
    <div className="card pad" style={{ marginTop: 16 }}><h3 className="card-title">Chưa có lộ trình</h3><p className="subtitle">Bắt đầu từ điểm nhận và điểm giao trong yêu cầu của khách hàng.</p>
      {canPlan(t) ? <button type="button" className="btn solid" onClick={() => routeNew(t.id)}>Bắt đầu lập lộ trình</button> : null}</div>
  );
  rpEnsure(t, rt);
  const edit = rpEditable(t, rt), calc = rpCalc(t), f = ps.filters;
  const affected = rt.stops.filter((x: Any) => x.placeId && placeById(x.placeId) && placeById(x.placeId).status !== 'ACTIVE');
  return (<>
    <div className="rp-head card pad"><div className="rp-head-grid">
      <div><span>Chuyến</span><b>{t.id} • {human(t.mode)}</b></div>
      <div><span>Nhận → giao</span><b>{r.pickup.name || r.origin} → {r.delivery.name || r.destination}</b></div>
      <div><span>Số ngựa</span><b>{tripHorses(t).length}</b></div>
      <div><span>Khởi hành dự kiến</span><b>{dt(t.plannedDepart)}</b></div>
      <div><span>Hạn giao</span><b>{dt(rpDeadline(t))}</b></div>
      <div><span>Phiên bản</span><b>v{rt.v} • <Pill v={rt.status} /></b></div>
    </div></div>
    {rt.status === 'APPROVED' ? <div className="note green"><Icon name="check" /><div><b>Phiên bản v{rt.v} đã được Manager duyệt – chỉ đọc</b>Muốn chỉnh tuyến, tạo phiên bản điều chỉnh. Thay đổi dữ liệu địa điểm không tự sửa kế hoạch đã duyệt.</div></div>
      : rt.status === 'PENDING_APPROVAL' ? <div className="note yellow"><Icon name="clock" /><div><b>Phiên bản v{rt.v} đang chờ Manager duyệt – chỉ đọc</b></div></div>
        : rt.status === 'RETURNED' ? <div className="note red"><Icon name="alert" /><div><b>Manager trả lại v{rt.v}</b>{rt.note || ''}</div></div> : null}
    {affected.length ? <div className="note red"><Icon name="alert" /><div><b>Có địa điểm không còn hoạt động trong lộ trình</b>{affected.map((x: Any) => x.name).join(', ')}{rt.status === 'APPROVED' ? ' – tạo phiên bản điều chỉnh để thay thế.' : ' – thay bằng điểm khác.'}</div></div> : null}
    <div className="rp-grid">
      <div className="rp-left">
        <div className="between" style={{ marginBottom: 8 }}><h3 className="card-title" style={{ margin: 0 }}>Các điểm theo thứ tự ({rt.stops.length})</h3>
          {edit && t.mode === 'AIR' ? <button type="button" className="btn ghost sm" onClick={() => rpAirports(t.id)}>Chọn sân bay</button> : null}
          <button type="button" className="link" onClick={() => go('f/places')}>Quản lý địa điểm →</button></div>
        <ol className="rp-list">{rt.stops.map((s: Any, i: number) => <StopRow key={i} t={t} rt={rt} s={s} i={i} calc={calc} edit={edit} />)}</ol>
      </div>
      <div className="rp-right">
        <div className="card rp-mapcard">
          {edit ? <PlannerFilters t={t} f={f} /> : null}
          <PlannerMap t={t} onTileError={() => setTileErr(true)} />
          <div className="rp-legend"><span><i className="lg-end" />Điểm nhận/giao</span><span><i className="lg-req" />Điểm bắt buộc</span><span><i className="lg-sel" />Điểm đã chọn</span><span><i className="lg-sug" />Gợi ý</span><span><i className="lg-bad" />Không còn phù hợp</span><span><i className="lg-route" />Tuyến đường bộ</span>{t.mode === 'AIR' ? <span><i className="lg-fly" />Chặng bay</span> : null}</div>
          <p className="hint rp-tilemsg" hidden={!tileErr}>Chưa tải được nền bản đồ (OpenStreetMap). Marker và tuyến vẫn hiển thị.</p>
        </div>
        <div id="rp-detail"><Detail t={t} /></div>
      </div>
    </div>
    <div id="rp-summary"><Summary t={t} /></div>
    <div className="rp-actions">
      {edit ? <><button type="button" className="btn ghost lg" onClick={() => rpSave(t.id)}>Lưu bản nháp</button><button type="button" className="btn solid lg" onClick={() => routeSubmit(t.id)}>Gửi Manager duyệt</button></>
        : canPlan(t) && ['APPROVED', 'RETURNED'].includes(rt.status) ? <button type="button" className="btn solid lg" onClick={() => routeNew(t.id)}>Tạo phiên bản điều chỉnh v{rt.v + 1}</button> : null}
      <span className="hint">{t.demoFlow3 ? 'Routing: Mô phỏng riêng chuyến Demo · không phải đường thực tế' : <>Routing: {ROUTING.provider === 'SIM' ? 'Mô phỏng (dữ liệu mẫu)' : 'OSRM – ' + ROUTING.url.replace(/^https?:\/\//, '').split('/')[0]} • <button type="button" className="link" onClick={rpRoutingModal}>Đổi</button></>}</span>
    </div>
    <p className="au-error" id="f-route-error" hidden={!routeSubmitError || !edit}>{routeSubmitError}</p>
  </>);
}

function PlannerFilters({ t, f }: { t: Any; f: Any }) {
  const all = [...new Set(db.places.map((p: Any) => p.country as string))];
  return (
    <div className="rp-filters">
      <div className="rp-fn">{Object.keys(PF).map((fn) => (
        <label key={fn} style={{ ['--c' as Any]: PF_COLOR[fn] }}><input type="checkbox" checked={f.fn.includes(fn)} onChange={(e) => rpSetFilter(t.id, 'fn', e.target.checked ? [...f.fn, fn] : f.fn.filter((x: string) => x !== fn))} /><i />{PF[fn]}</label>))}</div>
      <div className="rp-frow">
        <select value={f.country} onChange={(e) => rpSetFilter(t.id, 'country', e.target.value)}><option value="">Mọi quốc gia</option>{all.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={f.radius} onChange={(e) => rpSetFilter(t.id, 'radius', Number(e.target.value))}>{[5, 10, 25, 50, 100].map((k) => <option key={k} value={k}>Trong {k} km quanh tuyến</option>)}</select>
        <select value={f.status} onChange={(e) => rpSetFilter(t.id, 'status', e.target.value)}><option value="ACTIVE">Đang hoạt động</option><option value="ACTIVE_SUSP">Gồm tạm ngừng</option><option value="ALL">Mọi trạng thái</option></select>
      </div>
      <div className="rp-frow small">{([['hoursOk', 'Mở cửa lúc dự kiến ghé'], ['capOk', `Sức chứa ≥ ${tripHorses(t).length} ngựa`], ['loading', 'Có khu lên/xuống'], ['stabling', 'Có chỗ lưu ngựa'], ['water', 'Nước/thức ăn'], ['onboard', 'Chăm sóc trên xe']] as Array<[string, string]>).map(([k, l]) => (
        <label key={k}><input type="checkbox" checked={!!f[k]} onChange={(e) => rpSetFilter(t.id, k, e.target.checked)} /> {l}</label>))}</div>
    </div>
  );
}
