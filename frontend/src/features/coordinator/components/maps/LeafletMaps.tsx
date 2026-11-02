// Bản đồ Leaflet dùng chung: bản đồ tuyến chỉ đọc, bản đồ bộ lập lộ trình, bản đồ chọn tọa độ địa điểm
import L from 'leaflet';
import { addGeoapifyTiles } from '../../../../shared/maps/GeoapifyTiles';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { curRoute, placeById, tripStops } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, useCoordinatorStore } from '../../store/coordinatorStore';
import { STOP_LABEL, dt, incTypeVi } from '../../utils/format';
import { kmBetween, PF, PF_COLOR, RP, plannerMap, rpCalc, rpCandidates, rpCoords, rpEditable, rpFocus, rpGroups, rpPick, rpRoute, rpRouteKey, rpSeg } from '../../workflows/routePlanner';
import { Empty } from '../common/ui';

// Cấu hình icon mặc định Leaflet để tương thích Vite
delete (L.Icon.Default.prototype as Any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));


/** báo cáo tình trạng tuyến của tài xế, đặt tại mốc đã ghi (không phải GPS) */
function paintReports(t: Any, layer: L.LayerGroup | L.Map) {
  if (!t || !db?.incidents) return;
  const stops = tripStops(t) || [];
  (db.incidents || [])
    .filter((i: Any) => (i.tripId === t.id || i.tripId === t.tripId) && !['CLOSED', 'HALTED'].includes(i.status) && ['ROAD_CLOSURE', 'TRAFFIC_ACCIDENT', 'BORDER_DELAY', 'OTHER', 'BAD_WEATHER'].includes(i.type))
    .forEach((i: Any) => {
      const s = stops[i.leg];
      const lat = Number(s?.lat), lng = Number(s?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      L.circleMarker([lat, lng], { radius: 10, color: '#fff', weight: 2, fillColor: i.blocking && !i.continueAt ? '#dc2626' : '#f59e0b', fillOpacity: 1 })
        .bindTooltip(`${esc(i.id)} · ${esc(incTypeVi(i.type))}`)
        .bindPopup(`<b>${esc(incTypeVi(i.type))}</b><p>${esc(i.location)}</p><p>${esc(i.description)}</p><small>${dt(i.at)} · Báo cáo tài xế tại mốc ${Number(i.leg) + 1}, không phải GPS</small>`)
        .addTo(layer as Any);
    });
}

// ---------------------------------------------------------------------------
// Bản đồ tuyến chỉ đọc (routeMap của bản HTML)
// ---------------------------------------------------------------------------
export function RouteMap({ t, stops, current = -1 }: { t?: Any; stops: Any[]; current?: number }) {
  const ver = useCoordinatorStore();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const rt = t ? (t.routes || []).find((r: Any) => r.stops === stops) || curRoute(t) : null;
  if (t && rt) rpCoords(t, rt);
  const ps = t ? RP(t.id) : null;
  const geom = (rt && rt.geom && Array.isArray(rt.geom) && rt.geom.length === stops.length - 1)
    ? rt.geom
    : (rt && rt.routingSnapshot?.legs && Array.isArray(rt.routingSnapshot.legs) && rt.routingSnapshot.legs.length === stops.length - 1)
    ? rt.routingSnapshot.legs.map((l: Any) => l?.geom)
    : (ps && ps.routing?.status === 'ok' && ps.routing?.legs?.length === stops.length - 1)
    ? ps.routing.legs.map((l: Any) => l?.geom)
    : null;
  const missing = (stops || []).filter((x: Any) => x?.lat == null || !Number.isFinite(Number(x?.lat))).length;

  useEffect(() => {
    if (!geom && t && rt && (!ps || ps.routing?.status === 'idle') && missing === 0) {
      void rpRoute(t);
    }
  }, [t, rt, geom, ps, missing]);

  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMaximized]);

  useEffect(() => {
    const tm = setTimeout(() => {
      try {
        mapRef.current?.invalidateSize({ pan: false });
      } catch {}
    }, 120);
    return () => clearTimeout(tm);
  }, [isMaximized]);

  useEffect(() => {
    if (!el.current || !stops?.length) return;

    if (mapRef.current) {
      try { mapRef.current.remove(); } catch {}
      mapRef.current = null;
    }
    if ((el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const map = L.map(el.current, {
      scrollWheelZoom: true,
      attributionControl: true,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    }).setView([13, 106], 5);
    mapRef.current = map;
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const cancelTiles = addGeoapifyTiles(map, () => {});

    const pts = (stops || []).map((x: Any) => {
      const lat = Number(x?.lat);
      const lng = Number(x?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? ([lat, lng] as [number, number]) : null;
    });
    const air = t && t.mode === 'AIR';

    for (let i = 1; i < pts.length; i++) {
      if (!pts[i - 1] || !pts[i]) continue;
      const done = current >= 0 && i <= current;
      const flight = air && stops[i - 1]?.type === 'AIRPORT' && stops[i]?.type === 'AIRPORT';
      const segmentGeom = geom && Array.isArray(geom[i - 1]) ? geom[i - 1] : null;
      L.polyline(segmentGeom && !flight ? segmentGeom : [pts[i - 1]!, pts[i]!], {
        color: flight ? '#ea580c' : done ? '#f57c00' : '#2563eb',
        weight: done ? 5 : 5,
        opacity: 0.85,
        dashArray: flight ? '2 10' : (!segmentGeom && !done) ? '6 8' : undefined,
        interactive: false,
      }).addTo(map);
    }

    stops.forEach((x: Any, i: number) => {
      if (!pts[i]) return;
      const latest = i === current;
      const end = x.type === 'ORIGIN' || x.type === 'DESTINATION';
      const isAirport = x.type === 'AIRPORT';
      const p = x.placeId && placeById(x.placeId);
      const bad = p && p.status !== 'ACTIVE';
      const isReq = x.required || x.type === 'CHECKPOINT' || isAirport;
      const pinClass = `rp-pin ${end ? 'end' : isReq ? 'req' : 'sel'} ${bad ? 'bad' : ''} ${latest ? 'cur' : ''}`;
      const html = `<div class="${pinClass}">${i + 1}</div>`;
      L.marker(pts[i]!, {
        icon: L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
        zIndexOffset: isAirport ? 1100 : latest ? 1200 : 1000,
      })
        .bindTooltip(`${i + 1}. ${esc(x.name)}`)
        .bindPopup(`<b>${i + 1}. ${isAirport ? 'Sân bay: ' : ''}${esc(x.name)}</b><br>${STOP_LABEL[x.type] || x.type}${x.plannedAt ? ' • dự kiến ' + dt(x.plannedAt) : ''}${latest ? '<br><b>Mốc xác nhận gần nhất</b>' : ''}`)
        .addTo(map);
    });

    if (t) paintReports(t, map);

    const ok = pts.filter((p: [number, number] | null): p is [number, number] => p !== null);
    if (ok.length === 1) {
      map.setView(ok[0], 12);
    } else if (ok.length > 1) {
      try {
        const maxDist = kmBetween(ok[0], ok[ok.length - 1]);
        if (maxDist > 1500) {
          const lats = ok.map((p: [number, number]) => p[0]), lngs = ok.map((p: [number, number]) => p[1]);
          const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
          const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
          map.setView([cLat, cLng], 3);
        } else {
          map.fitBounds(ok, { padding: [30, 30], maxZoom: 12, animate: false });
        }
      } catch {}
    }

    const ro = new ResizeObserver(() => {
      try {
        map.invalidateSize({ pan: false });
      } catch {}
    });
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      cancelTiles();
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      if (el.current && (el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, [ver, stops, current, t, geom]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!stops || !stops.length) return <div className="rmap"><Empty title="Chưa có điểm dừng" text="Điều phối chưa thêm điểm dừng cho tuyến này." /></div>;
  const air = t && t.mode === 'AIR';
  return (
    <div className={`lf-wrap ${isMaximized ? 'is-maximized' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
          {isMaximized ? '🗺️ Bản đồ lộ trình (Toàn màn hình)' : '🗺️ Bản đồ lộ trình'}
        </span>
        <button
          type="button"
          className="rp-map-maximize-btn"
          onClick={() => setIsMaximized((m: boolean) => !m)}
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
              <span>Thu nhỏ (Esc)</span>
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
      <div className="lf-route" ref={el} role="region" aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`} />
      <div className="legend rp-legend">
        <span><i className="lg-end" />Điểm nhận/giao</span>
        <span><i className="lg-req" />Điểm bắt buộc</span>
        <span><i className="lg-sel" />Điểm đã chọn</span>
        <span><i className="lg-route" />Tuyến đường bộ</span>
        {air ? <span><i className="lg-fly" />Chặng bay</span> : null}
        {current >= 0 ? <span><i style={{ background: '#f57c00', outline: '2px solid #fde047' }} />Mốc xác nhận gần nhất</span> : null}
      </div>
      <p className="hint lf-cap">{geom ? 'Tuyến đường bộ theo kết quả routing đã đồng bộ từ bộ lập lộ trình.' : 'Đường nối các điểm theo thứ tự, đang tải tuyến đường bộ thực tế...'} Vị trí dựa trên mốc tổ xe xác nhận, không có GPS trực tiếp.{missing ? ` Chưa có tọa độ cho ${missing} điểm.` : ''}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bản đồ bộ lập lộ trình – tạo một lần, vẽ lại lớp khi dữ liệu thay đổi
// ---------------------------------------------------------------------------
export function PlannerMap({ t, onTileError }: { t: Any; onTileError: () => void }) {
  const ver = useCoordinatorStore();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current) return;
    if (map.current) {
      try { map.current.remove(); } catch {}
      map.current = null;
    }
    if ((el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const rtInit = curRoute(t);
    const ptsInit = (rtInit?.stops || [])
      .map((s: Any) => {
        const la = Number(s?.lat), lo = Number(s?.lng);
        return Number.isFinite(la) && Number.isFinite(lo) ? ([la, lo] as [number, number]) : null;
      })
      .filter((p: [number, number] | null): p is [number, number] => p !== null);

    let initCenter: [number, number] = [14, 104];
    let initZoom = 5;
    if (ptsInit.length > 1) {
      const maxDist = kmBetween(ptsInit[0], ptsInit[ptsInit.length - 1]);
      if (maxDist > 1500) {
        const lats = ptsInit.map((p: [number, number]) => p[0]), lngs = ptsInit.map((p: [number, number]) => p[1]);
        initCenter = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
        initZoom = 3;
      }
    }

    const m = L.map(el.current, { scrollWheelZoom: true, fadeAnimation: false }).setView(initCenter, initZoom);
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const cancelTiles = addGeoapifyTiles(m, onTileError);
    layers.current = L.layerGroup().addTo(m);
    map.current = m;
    fitted.current = false;

    const fitAllStops = (force = false) => {
      if (!m) return;
      const rtNow = curRoute(t);
      if (!rtNow?.stops?.length) return;
      const pts = rtNow.stops
        .map((s: Any) => {
          const la = Number(s?.lat), lo = Number(s?.lng);
          return Number.isFinite(la) && Number.isFinite(lo) ? ([la, lo] as [number, number]) : null;
        })
        .filter((p: [number, number] | null): p is [number, number] => p !== null);

      if (!pts.length) return;
      if (!force && fitted.current) return;

      try {
        m.invalidateSize({ pan: false });
        if (pts.length === 1) {
          m.setView(pts[0], 12);
        } else {
          const maxDist = kmBetween(pts[0], pts[pts.length - 1]);
          if (maxDist > 1500) {
            const lats = pts.map((p: [number, number]) => p[0]), lngs = pts.map((p: [number, number]) => p[1]);
            const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
            const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
            m.setView([cLat, cLng], 3);
          } else {
            m.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
          }
        }
        fitted.current = true;
      } catch {
        setTimeout(() => {
          try {
            if (m && pts.length) {
              m.invalidateSize({ pan: false });
              const maxDist = kmBetween(pts[0], pts[pts.length - 1]);
              if (maxDist > 1500) {
                const lats = pts.map((p: [number, number]) => p[0]), lngs = pts.map((p: [number, number]) => p[1]);
                m.setView([(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2], 3);
              } else {
                m.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
              }
              fitted.current = true;
            }
          } catch {}
        }, 150);
      }
    };

    plannerMap.fitLeg = (geom) => {
      if (!m || !Array.isArray(geom) || !geom.length) return;
      try {
        if (geom.length === 1) m.setView(geom[0] as Any, 12);
        else m.fitBounds(geom as Any, { padding: [40, 40] });
      } catch {}
    };
    plannerMap.focus = (lat, lng) => {
      const la = Number(lat), lo = Number(lng);
      if (!m || !Number.isFinite(la) || !Number.isFinite(lo)) return;
      try {
        m.invalidateSize({ pan: false });
        m.setView([la, lo], 12);
      } catch {}
    };
    plannerMap.fitAll = () => fitAllStops(true);
    plannerMap.fitGroup = (groupIndex: number) => {
      if (!m) return;
      const rtNow = curRoute(t);
      if (!rtNow?.stops?.length) return;
      const { groups } = rpGroups(t, rtNow);
      let grp = groups[groupIndex];
      if (!grp || !grp.length) {
        if (groupIndex === 0) {
          const firstAir = rtNow.stops.findIndex((s: Any) => s.type === 'AIRPORT');
          grp = firstAir >= 0 ? [...Array(firstAir + 1).keys()] : [0, 1];
        } else {
          const lastAir = [...rtNow.stops].map((s: Any, i: number) => (s.type === 'AIRPORT' ? i : -1)).filter((i) => i >= 0).pop();
          grp = lastAir !== undefined && lastAir >= 0 ? [...Array(rtNow.stops.length - lastAir).keys()].map((k) => k + lastAir) : [rtNow.stops.length - 2, rtNow.stops.length - 1];
        }
      }
      const pts = grp
        .map((idx: number) => {
          const s = rtNow.stops[idx];
          const la = Number(s?.lat), lo = Number(s?.lng);
          return Number.isFinite(la) && Number.isFinite(lo) ? ([la, lo] as [number, number]) : null;
        })
        .filter((p: [number, number] | null): p is [number, number] => p !== null);
      if (!pts.length) return;
      try {
        m.invalidateSize({ pan: false });
        if (pts.length === 1) m.setView(pts[0], 12);
        else m.fitBounds(pts, { padding: [50, 50], maxZoom: 12 });
      } catch {}
    };
    plannerMap.invalidate = () => {
      try { m.invalidateSize({ pan: false }); } catch {}
    };

    const ro = new ResizeObserver(() => {
      try {
        m.invalidateSize({ pan: false });
        if (!fitted.current) {
          fitAllStops();
        }
      } catch {}
    });
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      cancelTiles();
      plannerMap.fitLeg = undefined;
      plannerMap.focus = undefined;
      plannerMap.fitAll = undefined;
      plannerMap.fitGroup = undefined;
      plannerMap.invalidate = undefined;
      try {
        m.remove();
      } catch {}
      map.current = null;
      if (el.current && (el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current, lg = layers.current;
    if (!m || !lg) return;
    const rt = curRoute(t);
    if (!rt) return;

    const ps = RP(t.id), calc = rpCalc(t), edit = rpEditable(t, rt);
    lg.clearLayers();
    const ok = ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt);
    const { flight } = rpGroups(t, rt);

    const drawnLegs = (ps.routing.legs && ps.routing.legs.some((l: Any) => l && Array.isArray(l.geom) && l.geom.length > 1)) || (ok && ps.routing.legs && ps.routing.legs.length);
    if (drawnLegs) {
      (ps.routing.legs || []).forEach((l: Any, i: number) => {
        if (!l || !Array.isArray(l.geom) || !l.geom.length) return;
        // Đoạn đường chỉ đỏ khi chính đoạn đó chưa đạt chuẩn: chạy liên tục > 4h chưa nghỉ (sinceCare), cắt qua biên giới, hoặc lỗi routing.
        // Cảnh báo đợt đường bộ (hành trình tổng > 12h cần nghỉ qua đêm) là cảnh báo toàn chuyến, không làm đỏ từng đoạn ngắn đã phân đoạn chuẩn.
        const bad = calc && calc.issues.some((x: Any) => x.seg === i && !x.msg.includes('Đợt đường bộ'));
        L.polyline(l.geom, {
          color: bad ? '#dc2626' : ps.seg === i ? '#f08a2b' : '#2563eb',
          weight: ps.seg === i ? 7 : 5,
          opacity: 0.85,
          dashArray: l.sim ? '6 8' : undefined,
        })
          .on('click', () => rpSeg(t.id, i))
          .addTo(lg);
      });
    } else if (rt.stops && rt.stops.length >= 2) {
      // Khi đang chờ routing hoặc routing chưa sẵn sàng: vẽ đường nét đứt tạm giữa các điểm đường bộ để người dùng luôn thấy tuyến đường
      for (let i = 1; i < rt.stops.length; i++) {
        const sA = rt.stops[i - 1], sB = rt.stops[i];
        const isFlight = flight && i - 1 === flight[0] && i === flight[1];
        if (isFlight) continue;
        const pA = [Number(sA?.lat), Number(sA?.lng)], pB = [Number(sB?.lat), Number(sB?.lng)];
        if (Number.isFinite(pA[0]) && Number.isFinite(pA[1]) && Number.isFinite(pB[0]) && Number.isFinite(pB[1])) {
          L.polyline([pA as [number, number], pB as [number, number]], {
            color: '#2563eb',
            weight: 4,
            opacity: 0.75,
            dashArray: '6 8',
          })
            .on('click', () => rpSeg(t.id, i - 1))
            .addTo(lg);
        }
      }
    }

    if (flight && rt.stops) {
      const a = rt.stops[flight[0]], b = rt.stops[flight[1]];
      const aLat = Number(a?.lat), aLng = Number(a?.lng), bLat = Number(b?.lat), bLng = Number(b?.lng);
      if (Number.isFinite(aLat) && Number.isFinite(aLng) && Number.isFinite(bLat) && Number.isFinite(bLng)) {
        L.polyline([[aLat, aLng], [bLat, bLng]], {
          color: '#ea580c',
          weight: 3,
          dashArray: '2 10',
        })
          .bindTooltip('Chặng bay – theo giờ chuyến bay, không tính đường bộ')
          .addTo(lg);
      }
    }

    if (edit) {
      rpCandidates(t).forEach((c: Any) => {
        if (!c?.p) return;
        const cLat = Number(c.p.lat), cLng = Number(c.p.lng);
        if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) return;
        const bad = (c.why || []).length;
        const activeFn = (c.p.functions || []).find((fn: string) => (ps.filters?.fn || []).includes(fn)) || (c.p.functions || [])[0];
        const markerColor = bad ? '#9ca3af' : (PF_COLOR[activeFn] || '#0ea5e9');
        const isSel = ps.sel === c.p.id;

        const isAirport = c.p.functions?.includes('AIRPORT');
        const tooltipName = isAirport && c.p.airport?.iata
          ? `${esc(c.p.name)} (${esc(c.p.airport.iata)})`
          : esc(c.p.name);

        const dotStyle = `width:12px;height:12px;border-radius:50%;background:${markerColor};border:2px solid ${isSel ? 'var(--orange, #f57c00)' : '#fff'};box-shadow:${isSel ? '0 0 0 3px rgba(245,124,0,0.45)' : '0 1px 4px rgba(0,0,0,0.3)'};cursor:pointer;`;
        const html = `<div class="rp-cand-dot ${isSel ? 'on' : ''}" style="${dotStyle}"></div>`;

        L.marker([cLat, cLng], {
          icon: L.divIcon({ html, className: '', iconSize: [12, 12], iconAnchor: [6, 6] }),
          zIndexOffset: isAirport ? 950 : 900,
        })
          .bindTooltip(tooltipName, { direction: 'top', offset: [0, -6] })
          .bindPopup(`<b>${esc(c.p.name)}</b><br><small>${(c.p.functions || []).map((fn: string) => PF[fn] || fn).join(' · ')} • ${c.p.province || ''}, ${c.p.country || ''}${bad ? `<br><span style="color:#dc2626">⚠️ ${c.why.join('; ')}</span>` : ''}</small>`)
          .on('click', () => rpPick(t.id, c.p.id))
          .addTo(lg);
      });
    }

    (rt.stops || []).forEach((s: Any, i: number) => {
      const sLat = Number(s?.lat), sLng = Number(s?.lng);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return;
      const end = s.type === 'ORIGIN' || s.type === 'DESTINATION';
      const isAirport = s.type === 'AIRPORT';
      const p = s.placeId && placeById(s.placeId);
      const bad = p && p.status !== 'ACTIVE';
      const isReq = s.required || isAirport;
      const pinClass = `rp-pin ${end ? 'end' : isReq ? 'req' : 'sel'} ${bad ? 'bad' : ''} ${ps.selStop === i ? 'on' : ''}`;
      const html = `<div class="${pinClass}">${i + 1}</div>`;
      L.marker([sLat, sLng], {
        icon: L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }),
        zIndexOffset: isAirport ? 1100 : 1000,
      })
        .bindTooltip(`${i + 1}. ${esc(s.name)}`)
        .bindPopup(`<b>${i + 1}. ${isAirport ? 'Sân bay: ' : ''}${esc(s.name)}</b><br>Loại: ${STOP_LABEL[s.type] || s.type}${s.plannedAt ? ' • dự kiến ' + dt(s.plannedAt) : ''}`)
        .on('click', () => rpFocus(t.id, i, 'map'))
        .addTo(lg);
    });

    paintReports(t, lg);

    if (!fitted.current) {
      plannerMap.fitAll?.();
    }
  }, [ver, t]);

  return <div id="rp-map" className="rp-map" ref={el} />;
}

// ---------------------------------------------------------------------------
// Bản đồ chọn tọa độ trong hộp thoại địa điểm
// ---------------------------------------------------------------------------
const pinIcon = () => L.divIcon({ html: '<div class="rp-pin sel">●</div>', className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
export function PlacePickMap({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const mk = useRef<L.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!el.current) return;
    if (map.current) {
      try { map.current.remove(); } catch {}
      map.current = null;
    }
    if ((el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
    }

    const numLat = Number(lat), numLng = Number(lng);
    const has = lat != null && lng != null && Number.isFinite(numLat) && Number.isFinite(numLng);
    const m = L.map(el.current, { scrollWheelZoom: true }).setView(has ? [numLat, numLng] : [14, 105], has ? 12 : 5);
    const cancelTiles = addGeoapifyTiles(m, () => {});

    if (has) mk.current = L.marker([numLat, numLng], { icon: pinIcon() }).addTo(m);

    m.on('click', (ev: L.LeafletMouseEvent) => {
      const ll = ev.latlng.wrap();
      if (Number.isFinite(ll.lat) && Number.isFinite(ll.lng)) {
        pick.current(ll.lat, ll.lng);
      }
    });
    map.current = m;

    const ro = new ResizeObserver(() => {
      try {
        m.invalidateSize({ pan: false });
      } catch {}
    });
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      cancelTiles();
      try {
        m.remove();
      } catch {}
      map.current = null;
      mk.current = null;
      if (el.current && (el.current as unknown as { _leaflet_id?: number })._leaflet_id) {
        delete (el.current as unknown as { _leaflet_id?: number })._leaflet_id;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    const numLat = Number(lat), numLng = Number(lng);
    if (!m || lat == null || lng == null || !Number.isFinite(numLat) || !Number.isFinite(numLng)) return;
    if (mk.current) mk.current.setLatLng([numLat, numLng]);
    else mk.current = L.marker([numLat, numLng], { icon: pinIcon() }).addTo(m);
  }, [lat, lng]);

  return <div id="pl-map" className="pl-map" ref={el} />;
}
