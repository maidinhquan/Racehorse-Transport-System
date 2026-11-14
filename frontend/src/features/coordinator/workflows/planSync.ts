// Gửi phương án (tuyến + xe + nhân sự) của Điều phối lên backend để Quản lý xem và duyệt được ở mọi máy.
import { apiClient } from '../../../shared/api/apiClient';
import { curRoute, emp, groundLegs, placeById, vehicle } from '../domain/coordinatorRules';
import type { Any } from '../store/coordinatorStore';
import type { PlanDraftInput } from '../types/flow3.types';

const ROLE_LABEL: Record<string, string> = { MAIN_DRIVER: 'Tài xế chính', CO_DRIVER: 'Phụ lái', VETERINARIAN: 'Bác sĩ thú y' };
const ROLES = ['MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'];
const vehLabel = (id?: string) => { const v = id && vehicle(id); return v ? `${v.plate} • ${v.model}` : ''; };
const crewOfMap = (crew: Any) => ({ MAIN_DRIVER: crew?.MAIN_DRIVER || null, CO_DRIVER: crew?.CO_DRIVER || null, VETERINARIAN: crew?.VETERINARIAN || null });

function buildPlan(t: Any): PlanDraftInput | null {
  const rt = curRoute(t); if (!rt?.stops?.length) return null;
  const last = rt.stops.length - 1;
  const stops = rt.stops.map((s: Any, i: number) => ({
    clientKey: `stop-${i + 1}`,
    type: s.type || (i === 0 ? 'ORIGIN' : i === last ? 'DESTINATION' : 'REST_STOP'),
    placeId: s.placeId || null,
    purposes: s.purposes || [],
    dwellMin: Number(s.dwellMin) || 0,
    unload: !!s.unload,
    careNote: s.careNote || '',
    name: s.name || placeById(s.placeId)?.name || '',
    lat: Number.isFinite(s.lat) ? s.lat : undefined,
    lng: Number.isFinite(s.lng) ? s.lng : undefined,
    arriveAt: s.plannedAt || undefined,
    departAt: s.departAt || undefined,
  }));
  let resources: Any[], vehicleLabel: string, crewLabels: Array<[string, string]>;
  if (t.mode === 'AIR') {
    const g = groundLegs(t), legs: Array<[string, string]> = [['outbound', 'Chặng 1'], ['inbound', 'Chặng 2']];
    resources = legs.map(([k]) => ({ leg: k, vehicleId: g[k]?.vehicleId || null, crew: crewOfMap(g[k]?.crew), truckProfile: null }));
    vehicleLabel = legs.map(([k, n]) => `${n}: ${vehLabel(g[k]?.vehicleId) || 'chưa có xe'}`).join(' · ');
    crewLabels = legs.flatMap(([k, n]) => ROLES.filter((r) => g[k]?.crew?.[r]).map((r) => [`${n} – ${ROLE_LABEL[r]}`, emp(g[k].crew[r])?.name || g[k].crew[r]] as [string, string]));
  } else {
    resources = [{ leg: 'road', vehicleId: t.vehicleId || null, crew: crewOfMap(t.crew), truckProfile: null }];
    vehicleLabel = vehLabel(t.vehicleId);
    crewLabels = ROLES.filter((r) => t.crew?.[r]).map((r) => [ROLE_LABEL[r], emp(t.crew[r])?.name || t.crew[r]] as [string, string]);
  }
  return {
    expectedVersion: 0, pickupAt: t.plannedDepart, plannedDepart: t.plannedDepart, stops, resources,
    note: rt.note || '', eta: rt.metrics?.eta || t.eta, vehicleLabel, crewLabels,
  } as PlanDraftInput;
}

/** Lưu nháp rồi gửi duyệt trên backend. Trả về '' nếu thành công, ngược lại là thông báo lỗi. */
export async function pushPlanToBackend(t: Any): Promise<string> {
  const body = buildPlan(t); if (!body) return 'Chưa có tuyến để gửi.';
  try {
    // Gọi thẳng API: phần thông tin hiển thị (tên điểm, giờ, xe, nhân sự) chưa có trong contract Flow 3 nên flow3Client sẽ chặn.
    const id = encodeURIComponent(t.id);
    const ok = (r: Any) => r?.data?.success !== false;
    const saved = await apiClient.put(`/coordinator/trips/${id}/plan-draft`, body, { headers: { 'Idempotency-Key': `pd-${t.id}-${Date.now()}` } });
    if (!ok(saved)) return saved?.data?.message || 'Không lưu được phương án.';
    const sent = await apiClient.post(`/coordinator/trips/${id}/plan/submit`, { expectedVersion: 0, planVersion: curRoute(t)?.v || 1 }, { headers: { 'Idempotency-Key': `sp-${t.id}-${Date.now()}` } });
    if (!ok(sent)) return sent?.data?.message || 'Không gửi được phương án.';
    return '';
  } catch (e: Any) {
    const d = e?.response?.data;
    const fields = d?.errors && typeof d.errors === 'object' ? Object.entries(d.errors).filter(([k]) => k !== 'exceptionType' && k !== 'stackTrace').map(([k, v]) => `${k}: ${([] as string[]).concat(v as string[]).join(', ')}`).join('; ') : '';
    return [d?.message || e?.message || 'Không kết nối được máy chủ.', fields].filter(Boolean).join(' – ');
  }
}
