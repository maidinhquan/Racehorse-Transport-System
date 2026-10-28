// Bản đồ Leaflet dùng chung: bản đồ tuyến chỉ đọc, bản đồ bộ lập lộ trình, bản đồ chọn tọa độ địa điểm
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { curRoute, placeById, tripStops } from '../../domain/coordinatorRules';
import type { Any } from '../../store/coordinatorStore';
import { db, useCoordinatorStore } from '../../store/coordinatorStore';
import { STOP_COLOR, STOP_LABEL, dt, incTypeVi } from '../../utils/format';
import { PF, RP, plannerMap, rpCalc, rpCandidates, rpCoords, rpEditable, rpFocus, rpGroups, rpPick, rpRouteKey, rpSeg } from '../../workflows/routePlanner';
import { Empty } from '../common/ui';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const tiles = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' });

/** báo cáo tình trạng tuyến của tài xế, đặt tại mốc đã ghi (không phải GPS) */
function paintReports(t: Any, layer: L.LayerGroup | L.Map) {
  const stops = tripStops(t);
  db.incidents.filter((i: Any) => i.tripId === t.id && !['CLOSED', 'HALTED'].includes(i.status) && ['ROAD_CLOSURE', 'TRAFFIC_ACCIDENT', 'BORDER_DELAY', 'OTHER', 'BAD_WEATHER'].includes(i.type))
    .forEach((i: Any) => {
      const s = stops[i.leg]; if (s?.lat == null) return;
      L.circleMarker([s.lat, s.lng], { radius: 10, color: '#fff', weight: 2, fillColor: i.blocking && !i.continueAt ? '#dc2626' : '#f59e0b', fillOpacity: 1 })
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
  const rt = t ? t.routes.find((r: Any) => r.stops === stops) || curRoute(t) : null;
  if (t && rt) rpCoords(t, rt);
  const geom = rt && rt.geom && rt.geom.length === stops.length - 1 ? rt.geom : null;
  const missing = stops.filter((x: Any) => x.lat == null).length;
  useEffect(() => {
    if (!el.current || !stops.length) return;
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([13, 106], 5);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    tiles().addTo(map);
    const pts = stops.map((x: Any) => (x.lat != null ? [x.lat, x.lng] as [number, number] : null)), air = t && t.mode === 'AIR';
    for (let i = 1; i < pts.length; i++) {
      if (!pts[i - 1] || !pts[i]) continue;
      const done = current >= 0 && i <= current, flight = air && stops[i - 1].type === 'AIRPORT' && stops[i].type === 'AIRPORT';
      L.polyline(geom && geom[i - 1] && !flight ? geom[i - 1] : [pts[i - 1]!, pts[i]!], { color: flight ? '#7c3aed' : done ? '#f57c00' : '#64748b', weight: done ? 5 : 4, dashArray: flight ? '2 10' : geom && !done ? undefined : done ? undefined : '7 8', interactive: false }).addTo(map);
    }
    stops.forEach((x: Any, i: number) => {
      if (!pts[i]) return; const latest = i === current;
      L.circleMarker(pts[i]!, { radius: latest ? 11 : 8, color: '#fff', weight: 3, fillColor: latest ? '#f57c00' : (STOP_COLOR[x.type] || '#64748b'), fillOpacity: 1 })
        .bindTooltip(`${i + 1}. ${esc(x.name)}`)
        .bindPopup(`<b>${i + 1}. ${esc(x.name)}</b><br>${STOP_LABEL[x.type] || x.type}${x.plannedAt ? ' • dự kiến ' + dt(x.plannedAt) : ''}${latest ? '<br>Mốc xác nhận gần nhất' : ''}`).addTo(map);
    });
    if (t) paintReports(t, map);
    const ok = pts.filter(Boolean) as [number, number][]; if (ok.length) map.fitBounds(ok, { padding: [30, 30], maxZoom: 12, animate: false });
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false })); ro.observe(el.current);
    return () => { ro.disconnect(); map.remove(); };
  }, [ver, stops, current, t, geom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!stops || !stops.length) return <div className="rmap"><Empty title="Chưa có điểm dừng" text="Điều phối chưa thêm điểm dừng cho tuyến này." /></div>;
  return (
    <div className="lf-wrap">
      <div className="lf-route" ref={el} role="region" aria-label={`Bản đồ tuyến gồm ${stops.length} điểm dừng`} />
      <div className="legend">
        {[...new Set(stops.map((x: Any) => x.type))].map((k: Any) => <span key={k}><i style={{ background: STOP_COLOR[k] || '#64748b' }} />{STOP_LABEL[k] || k}</span>)}
        <span><i style={{ background: '#f57c00' }} />Mốc xác nhận gần nhất</span>
      </div>
      <p className="hint lf-cap">{geom ? 'Tuyến đường bộ theo kết quả routing đã lưu khi lập lộ trình.' : 'Đường nối các điểm theo thứ tự, chưa phải đường bộ thực tế.'} Vị trí dựa trên mốc tổ xe xác nhận, không có GPS trực tiếp.{missing ? ` Chưa có tọa độ cho ${missing} điểm.` : ''}</p>
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
    const m = L.map(el.current, { scrollWheelZoom: true, fadeAnimation: false }).setView([14, 104], 5);
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    const tl = tiles(); tl.on('tileerror', onTileError); tl.addTo(m);
    layers.current = L.layerGroup().addTo(m); map.current = m; fitted.current = false;
    plannerMap.fitLeg = (geom) => m.fitBounds(geom as Any, { padding: [40, 40] });
    plannerMap.focus = (lat, lng) => m.setView([lat, lng], Math.max(m.getZoom(), 10));
    const ro = new ResizeObserver(() => m.invalidateSize({ pan: false })); ro.observe(el.current);
    return () => { ro.disconnect(); plannerMap.fitLeg = undefined; plannerMap.focus = undefined; m.remove(); map.current = null; };
  }, [t.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current, lg = layers.current; if (!m || !lg) return;
    const rt = curRoute(t); if (!rt) return;
    const ps = RP(t.id), calc = rpCalc(t), edit = rpEditable(t, rt); lg.clearLayers();
    const ok = ps.routing.status === 'ok' && ps.routing.key === rpRouteKey(t, rt), { flight } = rpGroups(t, rt);
    if (ok) (ps.routing.legs || []).forEach((l: Any, i: number) => {
      if (!l) return; const bad = calc && calc.issues.some((x: Any) => x.seg === i);
      L.polyline(l.geom, { color: bad ? '#dc2626' : ps.seg === i ? '#f08a2b' : '#2563eb', weight: ps.seg === i ? 7 : 5, opacity: 0.85, dashArray: ps.routing.sim ? '6 8' : undefined }).on('click', () => rpSeg(t.id, i)).addTo(lg);
    });
    if (flight) { const a = rt.stops[flight[0]], b = rt.stops[flight[1]]; if (a.lat != null && b.lat != null) L.polyline([[a.lat, a.lng], [b.lat, b.lng]], { color: '#7c3aed', weight: 3, dashArray: '2 10' }).bindTooltip('Chặng bay – theo giờ chuyến bay, không tính đường bộ').addTo(lg); }
    if (edit && ok) rpCandidates(t).forEach((c: Any) => {
      const bad = c.why.length;
      L.circleMarker([c.p.lat, c.p.lng], { radius: 7, color: '#fff', weight: 2, fillColor: bad ? '#9ca3af' : '#0ea5e9', fillOpacity: 1 })
        .bindTooltip(`${esc(c.p.name)} • ${c.p.functions.map((fn: string) => PF[fn]).join(', ')}${bad ? ' • không còn phù hợp' : ''}`)
        .on('click', () => rpPick(t.id, c.p.id)).addTo(lg);
    });
    rt.stops.forEach((s: Any, i: number) => {
      if (s.lat == null) return; const end = s.type === 'ORIGIN' || s.type === 'DESTINATION', p = s.placeId && placeById(s.placeId), bad = p && p.status !== 'ACTIVE';
      const html = `<div class="rp-pin ${end ? 'end' : s.required ? 'req' : 'sel'} ${bad ? 'bad' : ''} ${ps.selStop === i ? 'on' : ''}">${i + 1}</div>`;
      L.marker([s.lat, s.lng], { icon: L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }), zIndexOffset: 1000 }).bindTooltip(`${i + 1}. ${esc(s.name)}`).on('click', () => rpFocus(t.id, i, 'map')).addTo(lg);
    });
    paintReports(t, lg);
    if (!fitted.current) { const pts = rt.stops.filter((s: Any) => s.lat != null).map((s: Any) => [s.lat, s.lng]); if (pts.length) m.fitBounds(pts, { padding: [30, 30] }); fitted.current = true; }
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
  const pick = useRef(onPick); pick.current = onPick;
  useEffect(() => {
    if (!el.current) return;
    const has = lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng);
    const m = L.map(el.current).setView(has ? [lat!, lng!] : [14, 105], has ? 12 : 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(m);
    if (has) mk.current = L.marker([lat!, lng!], { icon: pinIcon() }).addTo(m);
    m.on('click', (ev: L.LeafletMouseEvent) => { const ll = ev.latlng.wrap(); pick.current(ll.lat, ll.lng); });
    map.current = m;
    return () => { m.remove(); map.current = null; mk.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current; if (!m || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (mk.current) mk.current.setLatLng([lat, lng]); else mk.current = L.marker([lat, lng], { icon: pinIcon() }).addTo(m);
  }, [lat, lng]);
  return <div id="pl-map" className="pl-map" ref={el} />;
}
