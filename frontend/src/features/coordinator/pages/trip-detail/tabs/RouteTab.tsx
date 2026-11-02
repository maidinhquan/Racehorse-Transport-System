// Tab "Tuyến đường" = bộ lập lộ trình: danh sách điểm, bản đồ Leaflet, gợi ý địa điểm quanh đoạn tuyến, tổng hợp lịch & chính sách nghỉ
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Field, Icon, Pill } from '../../../components/common/ui';
import { DateTimeInput } from '../../../components/forms/DateTime';
import { PlannerMap } from '../../../components/maps/LeafletMaps';
import { canPlan, curRoute, placeById, reqOfTrip, trip, tripHorses } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { commit, db, go, openModal, toast, useCoordinatorStore } from '../../../store/coordinatorStore';
import { addHours, dt, human, stampMs } from '../../../utils/format';
import { airportLabel, selectAirportsModal } from '../../../workflows/airOperations';
import { routeSubmit } from '../../../workflows/coordinatorActions';
import { fmtMin, PF, PF_COLOR, PLACE_ST, plannerMap, ROUTE_POLICY, routeNew, routeSubmitError, ROUTING, RP, rpAdd, rpCalc, rpCandidates, rpDeadline, rpDel, rpDetour, rpEditable, rpEditEndpoint, rpEnsure, rpFixDomesticRoute, rpFlightKey, rpFocus, rpGroups, rpMove, rpPolicy, rpPolicyModal, rpRetry, rpRoute, rpRouteKey, rpRoutingModal, rpSave, rpSeg, rpSetAirCare, rpSetFilter, rpSetPurpose, rpSetStop, rpUseSim } from '../../../workflows/routePlanner';

/** Căn lùi giờ xuất phát sao cho xe vừa kịp đến sân bay trước giờ bay đúng số giờ quy định */
function calcIdealDepart(t: Any, rt: Any) {
  const f = t.flight;
  if (!f || !f.departAt) return null;
  const ps = RP(t.id);
  const fl = rpGroups(t, rt).flight;
  if (!fl) return null;
  const depIdx = fl[0];
  let driveMinBeforeAirport = 0;
  for (let k = 0; k < depIdx; k++) {
    const l = ps.routing?.legs && ps.routing.legs[k];
    if (l) driveMinBeforeAirport += l.min * ROUTE_POLICY.truckFactor;
    else driveMinBeforeAirport += 30; // ước tính tối thiểu 30p nếu chưa có routing
  }
  const totalLeadHours = ROUTE_POLICY.airportHandoverH + (driveMinBeforeAirport / 60);
  return addHours(f.departAt, -totalLeadHours);
}

function rpSyncDepartureToFlight(tid: string) {
  const t = trip(tid), rt = curRoute(t);
  if (!t || !rt) return;
  const ideal = calcIdealDepart(t, rt);
  if (!ideal) return toast('Chưa có giờ bay hợp lệ để căn lịch.');
  t.plannedDepart = ideal;
  rt.departureSnapshot = ideal;
  toast(`Đã căn giờ đón: ${dt(ideal)} (vừa kịp đến sân bay trước giờ cất cánh ${ROUTE_POLICY.airportHandoverH} giờ).`);
  commit();
  void rpRoute(t, true);
}

function rpEditDepart(tid: string) {
  const t = trip(tid), rt = curRoute(t);
  if (!t) return;
  openModal({
    title: 'Đổi giờ khởi hành / đón ngựa dự kiến',
    ok: 'Lưu giờ khởi hành',
    init: { depart: t.plannedDepart ? t.plannedDepart.replace(' ', 'T') : '' },
    body: () => (
      <>
        <Field label="Giờ đón ngựa tại điểm xuất phát *">
          <DateTimeInput name="depart" />
        </Field>
        <p className="hint">Giờ xe bắt đầu rời điểm nhận. Toàn bộ lộ trình và thời gian đến các trạm dừng, sân bay sẽ tự động tính toán lại theo mốc này.</p>
      </>
    ),
    onOk: (v) => {
      if (!v.depart) return 'Vui lòng chọn ngày giờ khởi hành.';
      const val = String(v.depart).replace('T', ' ');
      t.plannedDepart = val;
      if (rt) rt.departureSnapshot = val;
      toast(`Đã cập nhật giờ khởi hành: ${dt(val)}.`);
      commit();
      void rpRoute(t, true);
    },
  });
}

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
  const fl = rpGroups(t, rt).flight;
  const isDepAirport = !!fl && i === fl[0];
  const isArrAirport = !!fl && i === fl[1];
  const isAirport = s.type === 'AIRPORT' || isDepAirport || isArrAirport;

  const f = t.flight;
  const arriveAtAirport = row && row.arrive;
  const waitingMin = isDepAirport && f && f.departAt && arriveAtAirport && stampMs(f.departAt) > stampMs(arriveAtAirport)
    ? (stampMs(f.departAt) - stampMs(arriveAtAirport)) / 60000
    : 0;
  const idealDepart = isDepAirport ? calcIdealDepart(t, rt) : null;
  const excessWait = waitingMin >= (ROUTE_POLICY.airportHandoverH + 1.5) * 60;

  if (i < rt.stops.length - 1) {
    if (t.mode === 'AIR' && !fl) {
      legInfo = (
        <div
          className="rp-flight-banner"
          style={{
            padding: '12px 14px',
            margin: '8px 0',
            borderRadius: 8,
            border: '1px dashed var(--orange, #f57c00)',
            background: '#fffaf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#c2410c' }}>
              Chưa chọn cặp sân bay cất / hạ cánh
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Vận chuyển Hàng không cần chọn sân bay cất cánh và hạ cánh để hệ thống lập lộ trình chặng đón và chặng trả (không tìm tuyến đường bộ xuyên lục địa).
            </div>
          </div>
          {edit ? (
            <button
              type="button"
              className="btn solid sm"
              onClick={() => selectAirportsModal(t.id)}
            >
              Chọn sân bay ngay
            </button>
          ) : null}
        </div>
      );
    } else if (fl && i === fl[0]) {
      const hasContract = !!(t.flight?.contractNo || t.flight?.bookingRef || t.flight?.flightNo);
      legInfo = (
        <div
          className="rp-flight-banner"
          style={{
            padding: '9px 12px',
            margin: '6px 0',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>
                Chặng bay: {t.flight?.from ? airportLabel(t.flight.from) : 'Sân bay đi'} → {t.flight?.to ? airportLabel(t.flight.to) : 'Sân bay đến'}
              </span>
              {hasContract ? (
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#e2e8f0', color: '#334155', fontWeight: 600 }}>
                  {t.flight.airline || 'Hãng bay'} • {t.flight.flightNo || t.flight.contractNo}
                </span>
              ) : (
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>
                  Chưa nhập HĐ bay
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {t.flight?.departAt && t.flight?.arriveAt ? (
                <>
                  Cất cánh: <b>{dt(t.flight.departAt)}</b> → Hạ cánh: <b>{dt(t.flight.arriveAt)}</b>
                  {t.flight?.jetStallId ? <> • Chuồng: <b>{t.flight.jetStallId}</b></> : null}
                </>
              ) : (
                'Thông tin hợp đồng và chuồng bay nhập tại tab Chuyến bay.'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {edit ? (
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => selectAirportsModal(t.id)}
              >
                Đổi sân bay
              </button>
            ) : null}
            <button
              type="button"
              className="btn sm solid"
              onClick={() => go(`f/trip/${t.id}/flight`)}
            >
              {hasContract ? 'Chi tiết HĐ bay →' : 'Nhập HĐ tại tab Chuyến bay →'}
            </button>
          </div>
        </div>
      );
    } else {
      const l = ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt) ? ps.routing.legs[i] : null;
      legInfo = (
        <button type="button" className={`rp-leg ${ps.seg === i ? 'on' : ''} ${segIss.length ? 'bad' : ''}`} onClick={() => rpSeg(t.id, i)}>
          {l ? `${l.km.toFixed(0)} km • ${fmtMin(l.min * ROUTE_POLICY.truckFactor)}` : '…'}{edit ? <> • <b>＋ thêm điểm dừng ở đoạn này</b></> : null}
          {segIss.map((x: Any, k: number) => (
            <span key={k}>
              <Icon name="alert" />{x.msg}
              {x.msg.includes('lãnh thổ') && edit ? (
                <span
                  role="button"
                  tabIndex={0}
                  style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    rpFixDomesticRoute(t.id, i);
                  }}
                >
                  🛣️ Nắn tuyến qua QL1A
                </span>
              ) : null}
            </span>
          ))}
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
          <small>{kind}{s.required && s.type !== 'ORIGIN' && s.type !== 'DESTINATION' ? ' 🔒' : ''}{s.type === 'ORIGIN' || s.type === 'DESTINATION' ? (s.exactGeo ? ' • tọa độ từ địa chỉ khách chọn' : ' • tọa độ theo thành phố (dữ liệu mẫu)') : s.type === 'AIRPORT' ? ` • Sân bay ${t.flight?.contractNo || t.flight?.bookingRef ? `(HĐ: ${t.flight.contractNo || t.flight.bookingRef})` : ''}` : p ? ' • ' + p.country : ' • chưa có trong danh mục'}{isAirport && edit ? <button type="button" className="link" style={{ marginLeft: 6, fontSize: 11 }} onClick={() => selectAirportsModal(t.id)}>Đổi sân bay</button> : null}</small>
          {purposes}
          <div className="rp-times">{row && row.arrive ? `Đến ${dt(row.arrive)}` : ''}{mid ? <> • dừng {edit && !s.required ? <><input type="number" min="0" step="5" className="rp-dwell" value={s.dwellMin} onChange={(e) => rpSetStop(t.id, i, 'dwellMin', e.target.value)} /> phút</> : fmtMin(s.dwellMin)}</> : null}{row && row.depart ? ` • rời ${dt(row.depart)}` : ''}{i === 0 && edit ? <button type="button" className="link" style={{ marginLeft: 8, fontSize: 11 }} onClick={() => rpEditDepart(t.id)}>✏️ Đổi giờ đón</button> : null}</div>
          {mid && s.purposes.includes('REST') ? <label className="rp-unload">{edit ? <input type="checkbox" checked={!!s.unload} onChange={(e) => rpSetStop(t.id, i, 'unload', e.target.checked)} /> : (s.unload ? '✓' : '✗')} Đưa ngựa xuống xe (nghỉ {s.unload ? 'ngoài xe' : 'trên xe'})</label> : null}
          {/* Đối với sân bay: hiển thị thông tin nghiệp vụ hàng không tự động, không hiện ô nhập tay careNote */}
          {isAirport ? (
            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {isDepAirport ? (
                <>
                  <span>Bàn giao ngựa & chuồng Jet Stall {t.flight?.jetStallId ? `(${t.flight.jetStallId})` : ''} trước giờ bay ≥ {ROUTE_POLICY.airportHandoverH}h</span>
                  {t.flight?.contractNo || t.flight?.bookingRef ? (
                    <span style={{ color: '#047857', fontWeight: 600 }}>• Theo HĐ {t.flight.contractNo || t.flight.bookingRef || t.flight.flightNo}</span>
                  ) : null}
                </>
              ) : isArrAirport ? (
                <>
                  <span>Tiếp nhận ngựa & kiểm dịch sau hạ cánh ({ROUTE_POLICY.airportReceiveH}h làm thủ tục)</span>
                  {t.flight?.arriveAt ? (
                    <span style={{ color: '#047857', fontWeight: 600 }}>• Hạ cánh: {dt(t.flight.arriveAt)}</span>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : (
            edit && mid ? <input className="rp-note" placeholder="Mục đích / hoạt động chăm sóc" value={s.careNote || ''} onChange={(e) => rpSetStop(t.id, i, 'careNote', e.target.value)} /> : s.careNote ? <small>{s.careNote}</small> : null
          )}
          {/* Gợi ý thông minh tự căn giờ đón nếu xe đến sân bay sớm hơn giờ bay quá nhiều */}
          {isDepAirport && excessWait && idealDepart ? (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, fontSize: 11.5, color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <span>💡 Xe đến sân bay trước giờ bay <b>{(waitingMin / 60).toFixed(1)} giờ</b> (thừa {(waitingMin / 60 - ROUTE_POLICY.airportHandoverH).toFixed(1)}h so với mức chuẩn {ROUTE_POLICY.airportHandoverH}h).</span>
                <div style={{ color: '#a16207', marginTop: 2 }}>Tránh để ngựa chờ lâu ở sân bay: Khuyên dùng đón muộn hơn tại chuồng khách.</div>
              </div>
              {edit ? (
                <button
                  type="button"
                  className="btn solid sm"
                  style={{ padding: '3px 10px', fontSize: 11, background: '#ca8a04', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  onClick={() => rpSyncDepartureToFlight(t.id)}
                >
                  ⚡ Căn giờ đón ({dt(idealDepart)})
                </button>
              ) : null}
            </div>
          ) : null}
          {stIss.map((x: Any, k: number) => (
            <div key={k} className="rp-issue">
              <Icon name="alert" />
              <span>{x.msg}</span>
            </div>
          ))}
        </div>
        <div className="rp-ops">
          {isAirport ? (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                const la = s.lat != null ? s.lat : p?.lat;
                const lo = s.lng != null ? s.lng : p?.lng;
                rpFocus(t.id, i);
                if (la != null && lo != null) {
                  plannerMap.focus?.(la, lo);
                }
              }}
              title="Phóng to và định vị sân bay này trên bản đồ"
            >
              Xem trên bản đồ
            </button>
          ) : null}
          {edit && (s.type === 'ORIGIN' || s.type === 'DESTINATION') ? (
            <button type="button" className="btn ghost sm" onClick={() => rpEditEndpoint(t.id, i)} title="Ghim lại vị trí trên bản đồ">
              📍 Ghim lại vị trí
            </button>
          ) : edit && !s.required ? (
            <>
              <button type="button" className="btn ghost sm" disabled={i <= 1} aria-label="Lên" onClick={() => rpMove(t.id, i, -1)}>↑</button>
              <button type="button" className="btn ghost sm" disabled={i >= rt.stops.length - 2} aria-label="Xuống" onClick={() => rpMove(t.id, i, 1)}>↓</button>
              <button type="button" className="btn danger sm" aria-label="Bỏ" onClick={() => rpDel(t.id, i)}>✕</button>
            </>
          ) : null}
        </div>
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
      <div className="rp-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <b>{p.name}</b>
            <Pill v={PLACE_ST[p.status][0]} label={PLACE_ST[p.status][1]} />
          </div>
          <button type="button" className="btn ghost sm" style={{ padding: '1px 6px', fontSize: 11 }} onClick={() => { ps.sel = null; commit(); }}>✕ Đóng</button>
        </div>
        <small>{p.functions.map((fn: string) => PF[fn]).join(' • ')} • {p.province}, {p.country} • giờ hoạt động {p.hours || '—'}</small>
        {facts.map((x, k) => <p key={k}>{x}</p>)}
        {c ? <>
          <div className="rp-impact">
            {d ? (d.status === 'loading' ? 'Đang tính đường đi thực tế qua địa điểm…' : d.status === 'ok'
              ? <><b>Ảnh hưởng dự kiến:</b> +{d.km.toFixed(1)} km • +{fmtMin(d.min)} chạy xe{d.sim ? ' (mô phỏng)' : ''} • ghé khoảng {ps.seg != null && rpCalc(t)?.rows?.[ps.seg] ? dt(addHours(rpCalc(t).rows[ps.seg].depart, d.firstMin / 60)) : 'chưa xác định giờ'}</>
              : <><span className="t-bad">{d.error}</span> <button type="button" className="link" onClick={() => rpDetour(t.id, p.id)}>Thử lại</button></>) : null}
            {c.why.length ? <div className="rp-issue"><Icon name="alert" />Không còn phù hợp: {c.why.join('; ')}</div> : null}
          </div>
          {edit ? <button type="button" className="btn solid block" disabled={p.status !== 'ACTIVE'} onClick={() => rpAdd(t.id, p.id)}>Thêm vào hành trình{ps.seg != null ? ` (đoạn ${ps.seg + 1})` : ''}</button> : null}
        </> : <p className="hint">Chọn một đoạn tuyến để xem ảnh hưởng nếu ghé địa điểm này.</p>}
        <p className="hint">Sức chứa là khả năng tiếp nhận của cơ sở, không phải số chỗ còn trống (chưa có hệ thống đặt chỗ).</p>
      </div>
    );
  }

  return null;
}

function Summary({ t }: { t: Any }) {
  const ps = RP(t.id), rt = curRoute(t), calc = rpCalc(t), deadline = rt && rt.status !== 'DRAFT' && rt.deadlineSnapshot ? rt.deadlineSnapshot : rpDeadline(t), rs = ps.routing;

  if (t.mode === 'AIR' && rt && !rpGroups(t, rt).flight) {
    const edit = rpEditable(t, rt);
    return (
      <div className="card pad rp-sum">
        <div className="note yellow" style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Chưa chọn tuyến máy bay (sân bay cất / hạ cánh)</b>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              Vận chuyển Hàng không gồm 2 chặng đường bộ kết nối qua 1 chuyến bay thẳng. Vui lòng chọn cặp sân bay để hệ thống phân tách chặng và tìm tuyến đường bộ đón/trả.
            </p>
          </div>
          {edit ? (
            <button
              type="button"
              className="btn solid sm"
              onClick={() => selectAirportsModal(t.id)}
            >
              Chọn sân bay ngay
            </button>
          ) : null}
        </div>
      </div>
    );
  }

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
        : <div className="note green" style={{ margin: '10px 0 0' }}><Icon name="check" /><div><b>Lộ trình hợp lệ theo chính sách nghỉ</b>{t.mode === 'AIR' ? 'Kiểm tra thêm tuyến xe lớn, lối vào điểm nhận và nguồn lực trước khi gửi Manager duyệt.' : 'Lộ trình đã sẵn sàng. Có thể chốt và áp dụng trực tiếp cho chuyến đi.'}</div></div>}
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
  useCoordinatorStore();
  const [tileErr, setTileErr] = useState(false);
  const [viewLeg, setViewLeg] = useState<'all' | 'vn' | 'jp'>('all');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMaximized(false);
        setTimeout(() => plannerMap.invalidate?.(), 100);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMaximized]);
  const rt = curRoute(t), r = reqOfTrip(t), ps = RP(t.id);
  const routeKey = rt ? rpRouteKey(t, rt) : '';
  useEffect(() => {
    if (rt) {
      const ps = RP(t.id);
      if (ps.routing.key !== routeKey || ps.routing.status === 'idle') {
        void rpRoute(t);
      }
    }
  }, [t.id, routeKey]);
  if (!rt) return (
    <>
      <div className="card pad" style={{ marginTop: 16 }}><h3 className="card-title">Chưa có lộ trình</h3><p className="subtitle">Bắt đầu từ điểm nhận và điểm giao trong yêu cầu của khách hàng.</p>
        {canPlan(t) ? <button type="button" className="btn solid" disabled={!t.mode} onClick={() => routeNew(t.id)}>Bắt đầu lập lộ trình</button> : null}</div></>
  );
  rpEnsure(t, rt);
  const edit = rpEditable(t, rt), calc = rpCalc(t), f = ps.filters;
  const affected = rt.stops.filter((x: Any) => x.placeId && placeById(x.placeId) && placeById(x.placeId).status !== 'ACTIVE');
  return (<>
    <div className="rp-head card pad"><div className="rp-head-grid">
      <div><span>Phương thức theo hợp đồng</span><b>{t.id} • {t.mode ? human(t.mode) : 'Chưa chọn phương thức'}</b></div>
      <div><span>Nhận → giao</span><b>{r.pickup.name || r.origin} → {r.delivery.name || r.destination}</b></div>
      <div><span>Số ngựa</span><b>{tripHorses(t).length}</b></div>
      <div><span>Khởi hành dự kiến</span><b>{dt(t.plannedDepart)} {edit ? <button type="button" className="link" style={{ marginLeft: 6, fontSize: 11 }} onClick={() => rpEditDepart(t.id)}>Đổi</button> : null}</b></div>
      <div><span>Hạn giao</span><b>{dt(rpDeadline(t))}</b></div>
      <div><span>Phiên bản</span><b>v{rt.v} • <Pill v={rt.status} /></b></div>
    </div></div>
    {rt.status === 'APPROVED' ? <div className="note green"><Icon name="check" /><div><b>Phiên bản v{rt.v} đã được phê duyệt & áp dụng – chỉ đọc</b>Muốn chỉnh tuyến, tạo phiên bản điều chỉnh. Thay đổi dữ liệu địa điểm không tự sửa kế hoạch đã duyệt.</div></div>
      : rt.status === 'PENDING_APPROVAL' ? <div className="note yellow"><Icon name="clock" /><div><b>Phiên bản v{rt.v} đang chờ Manager duyệt – chỉ đọc</b></div></div>
        : rt.status === 'RETURNED' ? <div className="note red"><Icon name="alert" /><div><b>Manager trả lại v{rt.v}</b>{rt.note || ''}</div></div> : null}
    {affected.length ? <div className="note red"><Icon name="alert" /><div><b>Có địa điểm không còn hoạt động trong lộ trình</b>{affected.map((x: Any) => x.name).join(', ')}{rt.status === 'APPROVED' ? ' – tạo phiên bản điều chỉnh để thay thế.' : ' – thay bằng điểm khác.'}</div></div> : null}
    <div className="rp-grid">
      <div className="rp-left">
        <div className="between" style={{ marginBottom: 8 }}><h3 className="card-title" style={{ margin: 0 }}>Các điểm theo thứ tự ({rt.stops.length})</h3>
          {edit && t.mode === 'AIR' ? (
            <button
              type="button"
              className="btn solid sm"
              onClick={() => selectAirportsModal(t.id)}
            >
              {t.flight?.from && t.flight?.to ? 'Đổi sân bay' : 'Chọn sân bay'}
            </button>
          ) : null}
          <button type="button" className="link" onClick={() => go('f/places')}>Quản lý địa điểm →</button></div>
        {edit && t.mode === 'AIR' && (!rpGroups(t, rt).flight || !t.flight?.from || !t.flight?.to) ? (
          <div className="note yellow" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>Lộ trình chưa chọn sân bay. Vui lòng chọn sân bay để phân tách chặng đường bộ và đường bay.</span>
            <button
              type="button"
              className="btn solid sm"
              onClick={() => selectAirportsModal(t.id)}
            >
              Chọn sân bay
            </button>
          </div>
        ) : null}
        {t.pickupRelocation?.status === 'CUSTOMER_CONFIRMED' ? (
          <div className="note green" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" />
            <div>
              <b>Điểm đón mới có hiệu lực:</b> {t.pickupRelocation.placeName || t.pickupRelocation.placeSnapshot?.name} (Khách hàng đã đồng ý dời điểm đón). Tuyến đường xuất phát từ cơ sở này.
            </div>
          </div>
        ) : t.pickupAccess?.result === 'INACCESSIBLE' ? (
          <div className="note yellow" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <b>⚠️ Điểm đón gốc xe lớn không vào được:</b> {t.pickupRelocation ? `Đề xuất dời điểm đang ở trạng thái ${t.pickupRelocation.status}` : 'Cần lập đề xuất đổi điểm tập kết'}.
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={() => go(`f/trip/${t.id}/overview`)}
            >
              Xem đề xuất →
            </button>
          </div>
        ) : null}
        <ol className="rp-list">{rt.stops.map((s: Any, i: number) => <StopRow key={i} t={t} rt={rt} s={s} i={i} calc={calc} edit={edit} />)}</ol>
      </div>
      <div className="rp-right">
        <div className={`card rp-mapcard ${isMaximized ? 'is-maximized' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, flexWrap: 'wrap', gap: 6 }}>
            {t.mode === 'AIR' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  Góc nhìn:
                </span>
                <button
                  type="button"
                  className={`btn sm ${viewLeg === 'all' ? 'solid' : 'ghost'}`}
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    background: viewLeg === 'all' ? 'var(--orange, #f57c00)' : '#ffffff',
                    color: viewLeg === 'all' ? '#ffffff' : '#334155',
                    border: viewLeg === 'all' ? '1px solid var(--orange, #f57c00)' : '1px solid #cbd5e1',
                    fontWeight: 600,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setViewLeg('all');
                    plannerMap.fitAll?.();
                  }}
                  title="Xem toàn cảnh tuyến bao gồm cả chặng bay Việt Nam → Nhật Bản"
                >
                  Toàn cảnh (VN → JP)
                </button>
                <button
                  type="button"
                  className={`btn sm ${viewLeg === 'vn' ? 'solid' : 'ghost'}`}
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    background: viewLeg === 'vn' ? 'var(--orange, #f57c00)' : '#ffffff',
                    color: viewLeg === 'vn' ? '#ffffff' : '#334155',
                    border: viewLeg === 'vn' ? '1px solid var(--orange, #f57c00)' : '1px solid #cbd5e1',
                    fontWeight: 600,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setViewLeg('vn');
                    plannerMap.fitGroup?.(0);
                  }}
                  title="Phóng to chặng đường bộ tại Việt Nam: Điểm nhận → Sân bay Tân Sơn Nhất (SGN)"
                >
                  Chặng VN (SGN)
                </button>
                <button
                  type="button"
                  className={`btn sm ${viewLeg === 'jp' ? 'solid' : 'ghost'}`}
                  style={{
                    padding: '3px 10px',
                    fontSize: 12,
                    background: viewLeg === 'jp' ? 'var(--orange, #f57c00)' : '#ffffff',
                    color: viewLeg === 'jp' ? '#ffffff' : '#334155',
                    border: viewLeg === 'jp' ? '1px solid var(--orange, #f57c00)' : '1px solid #cbd5e1',
                    fontWeight: 600,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setViewLeg('jp');
                    plannerMap.fitGroup?.(1);
                  }}
                  title="Phóng to chặng đường bộ tại Nhật Bản: Sân bay Narita (NRT) → Điểm giao"
                >
                  Chặng Nhật Bản (NRT → Tokyo)
                </button>
              </div>
            ) : (
              <span style={{ fontWeight: 600, color: '#475569' }}>
                Bản đồ lộ trình vận chuyển:
              </span>
            )}

            <button
              type="button"
              className="rp-map-maximize-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 6,
                background: isMaximized ? '#0f172a' : '#ffffff',
                color: isMaximized ? '#ffffff' : '#1e293b',
                border: '1px solid ' + (isMaximized ? '#0f172a' : '#cbd5e1'),
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
              onClick={() => {
                setIsMaximized((v) => !v);
                setTimeout(() => plannerMap.invalidate?.(), 100);
              }}
              title={isMaximized ? 'Thu nhỏ về khung nhìn ban đầu (Esc)' : 'Phóng to bản đồ toàn màn hình để dễ xem và thao tác'}
            >
              {isMaximized ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Thu nhỏ <kbd style={{ fontSize: 10, padding: '1px 4px', background: 'rgba(255,255,255,0.2)', borderRadius: 3 }}>Esc</kbd></span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                  </svg>
                  <span>Phóng to bản đồ</span>
                </>
              )}
            </button>
          </div>
          {edit ? <PlannerFilters t={t} f={f} /> : null}
          <PlannerMap t={t} onTileError={() => setTileErr(true)} />
          <div className="rp-legend">
            <span><i className="lg-end" />Điểm nhận/giao</span>
            <span><i className="lg-req" />Điểm bắt buộc</span>
            <span><i style={{ background: '#f57c00', width: 14, height: 10, borderRadius: 2, display: 'inline-block' }} />Sân bay</span>
            <span><i className="lg-sel" />Điểm đã chọn</span>
            <span><i className="lg-sug" />Gợi ý</span>
            <span><i className="lg-bad" />Không còn phù hợp</span>
            <span><i className="lg-route" />Tuyến đường bộ</span>
            {t.mode === 'AIR' ? <span><i className="lg-fly" />Chặng bay</span> : null}
          </div>
          <p className="hint rp-tilemsg" hidden={!tileErr}>Chưa tải được nền bản đồ Geoapify. Vui lòng thử lại sau.</p>
        </div>
        {ps.sel && placeById(ps.sel) ? <div id="rp-detail"><Detail t={t} /></div> : null}
      </div>
    </div>
    <div id="rp-summary"><Summary t={t} /></div>
    <div className="rp-actions">
      {edit ? <><button type="button" className="btn ghost lg" onClick={() => rpSave(t.id)}>Lưu bản nháp</button><button type="button" className="btn solid lg" onClick={() => routeSubmit(t.id)}>{t.mode === 'AIR' ? 'Gửi Manager duyệt' : 'Chốt & Áp dụng lộ trình'}</button></>
        : canPlan(t) && ['APPROVED', 'RETURNED'].includes(rt.status) ? <button type="button" className="btn solid lg" onClick={() => routeNew(t.id)}>Tạo phiên bản điều chỉnh v{rt.v + 1}</button> : null}
      <span className="hint">{t.demoFlow3 ? 'Routing: Mô phỏng riêng chuyến Demo · không phải đường thực tế' : <>Routing: {ROUTING.provider === 'SIM' ? 'Mô phỏng (dữ liệu mẫu)' : 'OSRM – ' + ROUTING.url.replace(/^https?:\/\//, '').split('/')[0]} • <button type="button" className="link" onClick={rpRoutingModal}>Đổi</button></>}</span>
    </div>
    <p className="au-error" id="f-route-error" hidden={!routeSubmitError || !edit}>{routeSubmitError}</p>
  </>);
}

function PlannerFilters({ t, f }: { t: Any; f: Any }) {
  const all = [...new Set(db.places.map((p: Any) => p.country as string))].filter(Boolean);
  const cands = rpCandidates(t);
  const isMultiFilter = (f.fn || []).length > 1;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeAdvCount = (f.country ? 1 : 0) +
    (f.status && f.status !== 'ACTIVE' ? 1 : 0) +
    (f.radius && f.radius !== 25 ? 1 : 0) +
    (['hoursOk', 'capOk', 'loading', 'stabling', 'water', 'onboard'] as const).filter((k) => !!f[k]).length;

  return (
    <div className="rp-filters" style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Hàng 1: Filter Chips chính và nút Mở rộng nâng cao */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginRight: 2 }}>Hiển thị:</span>
          {Object.keys(PF).map((fn) => {
            const active = (f.fn || []).includes(fn);
            const color = PF_COLOR[fn] || '#2563eb';
            return (
              <button
                key={fn}
                type="button"
                className="btn sm"
                style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: active ? `${color}18` : '#ffffff',
                  border: active ? `1.5px solid ${color}` : '1px solid #cbd5e1',
                  color: active ? color : '#334155',
                  boxShadow: active ? `0 1px 3px ${color}25` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  const next = active ? f.fn.filter((x: string) => x !== fn) : [...(f.fn || []), fn];
                  rpSetFilter(t.id, 'fn', next);
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    display: 'inline-block',
                    boxShadow: active ? `0 0 0 2px ${color}40` : 'none',
                  }}
                />
                {PF[fn]}
                {active ? <span style={{ fontSize: 11, fontWeight: 800 }}>✓</span> : null}
              </button>
            );
          })}
        </div>

        {/* Nút thu gọn/mở rộng Bộ lọc nâng cao */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            {isMultiFilter ? (
              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                ⚡ Khớp cả {f.fn.length} tiêu chí ({cands.length})
              </span>
            ) : f.fn?.length === 1 ? (
              <span>Tìm thấy {cands.length} địa điểm</span>
            ) : null}
          </div>

          <button
            type="button"
            className="btn ghost sm"
            style={{
              padding: '3px 8px',
              fontSize: 11.5,
              fontWeight: 600,
              color: activeAdvCount > 0 ? '#0284c7' : '#64748b',
              background: activeAdvCount > 0 ? '#f0f9ff' : '#ffffff',
              border: activeAdvCount > 0 ? '1px solid #bae6fd' : '1px solid #e2e8f0',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Tùy chỉnh bán kính, quốc gia và các tiện ích chi tiết"
          >
            ⚙️ Nâng cao {activeAdvCount > 0 ? `(${activeAdvCount})` : ''} {showAdvanced ? '▴' : '▾'}
          </button>
        </div>
      </div>

      {/* Phần bộ lọc nâng cao - Chỉ hiện khi bấm nút Nâng cao */}
      {showAdvanced ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 4,
          }}
        >
          {/* Hàng chọn quốc gia, bán kính, trạng thái */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Phạm vi:</span>
            <select
              value={f.country}
              onChange={(e) => rpSetFilter(t.id, 'country', e.target.value)}
              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5, background: '#fff' }}
            >
              <option value="">Tất cả quốc gia</option>
              {all.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={f.radius}
              onChange={(e) => rpSetFilter(t.id, 'radius', Number(e.target.value))}
              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5, background: '#fff' }}
            >
              <option value={25}>Trong 25 km quanh tuyến (Mặc định)</option>
              <option value={50}>Trong 50 km quanh tuyến</option>
              <option value={100}>Trong 100 km quanh tuyến</option>
              <option value={200}>Trong 200 km quanh tuyến</option>
              <option value={0}>Không giới hạn bán kính (Toàn quốc)</option>
            </select>
            <select
              value={f.status}
              onChange={(e) => rpSetFilter(t.id, 'status', e.target.value)}
              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 11.5, background: '#fff' }}
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="ACTIVE_SUSP">Gồm tạm ngừng</option>
              <option value="ALL">Mọi trạng thái</option>
            </select>

            {activeAdvCount > 0 ? (
              <button
                type="button"
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'none',
                  color: '#ef4444',
                  fontSize: 11,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
                onClick={() => {
                  rpSetFilter(t.id, 'country', '');
                  rpSetFilter(t.id, 'radius', 25);
                  rpSetFilter(t.id, 'status', 'ACTIVE');
                  ['hoursOk', 'capOk', 'loading', 'stabling', 'water', 'onboard'].forEach((k) => rpSetFilter(t.id, k, false));
                }}
              >
                Đặt lại nâng cao
              </button>
            ) : null}
          </div>

          {/* Hàng chọn tiện ích chi tiết */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Tiện ích:</span>
            {([
              ['hoursOk', '🕒 Mở cửa lúc dự kiến ghé'],
              ['capOk', `🐴 Sức chứa ≥ ${tripHorses(t).length} ngựa`],
              ['loading', '🚚 Có khu lên/xuống'],
              ['stabling', '🏠 Có chỗ lưu ngựa'],
              ['water', '💧 Nước/thức ăn'],
              ['onboard', '🩺 Chăm sóc trên xe'],
            ] as Array<[string, string]>).map(([k, label]) => {
              const checked = !!f[k];
              return (
                <button
                  key={k}
                  type="button"
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: checked ? 600 : 400,
                    background: checked ? '#ecfdf5' : '#ffffff',
                    border: checked ? '1px solid #10b981' : '1px solid #e2e8f0',
                    color: checked ? '#047857' : '#475569',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => rpSetFilter(t.id, k, !checked)}
                >
                  {checked ? <span style={{ fontWeight: 800 }}>✓</span> : null}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
