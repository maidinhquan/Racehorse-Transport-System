// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { Cell, PillT } from '../../../components/common/ui';
import { DemoCard } from '../../../components/demo/Demo';
import { curRoute, custOf, deployed, deployPill, planPill, planState, reqOfTrip, resourceGaps, resourcePill, routePill, tripHorses, tripNextAction } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { go } from '../../../store/coordinatorStore';
import { city, date, dt, human } from '../../../utils/format';
import { PickupAccessCard } from '../../../components/relocation/PickupAccessCard';

const NEXT_STEP: Record<string, (t: Any) => string> = {
  AWAITING_DEPLOYMENT: () => 'Đang chờ Quản lý vận hành xác nhận triển khai. Việc lập kế hoạch chính thức bắt đầu sau đó.',
  ON_HOLD: () => 'Triển khai đang tạm dừng. Kế hoạch hiện có được giữ ở chế độ chỉ xem cho đến khi Quản lý tiếp tục triển khai.',
  AWAITING_ROUTE: (t) => (curRoute(t) ? `Hoàn tất tuyến phiên bản ${curRoute(t).v} và gửi Quản lý duyệt.` : 'Bắt đầu lập tuyến.'),
  ROUTE_PENDING: (t) => `Tuyến phiên bản ${curRoute(t) ? curRoute(t).v : ''} đang chờ Quản lý quyết định.`,
  ROUTE_RETURNED: () => 'Quản lý đã trả lại tuyến. Hãy đọc nhận xét và tạo phiên bản chỉnh sửa.',
  MISSING_RESOURCES: (t) => `Phân công nguồn lực còn thiếu: ${resourceGaps(t).join(', ')}.`,
  PLANNED: () => 'Tuyến đã được duyệt và nguồn lực đã được phân công. Việc duyệt khởi hành do Quản lý quyết định.',
};

const COUNTRY_NAMES: Record<string, string> = {
  VN: 'Việt Nam (VN)',
  JP: 'Nhật Bản (JP)',
  TH: 'Thái Lan (TH)',
  SG: 'Singapore (SG)',
  KH: 'Campuchia (KH)',
  LA: 'Lào (LA)',
  MY: 'Malaysia (MY)',
  AU: 'Úc (AU)',
  US: 'Hoa Kỳ (US)',
  CN: 'Trung Quốc (CN)',
};

export function OverviewTab({ t }: { t: Any }) {
  const r = reqOfTrip(t), ps = planState(t);
  const cust = custOf(r);

  const pickupCountry = r.pickup?.country || city(r.origin)[1] || 'VN';
  const deliveryCountry = r.delivery?.country || city(r.destination)[1] || 'JP';

  const pickupName = r.pickup?.name || r.origin || 'Điểm nhận';
  const pickupAddr = r.pickup?.address || (r.origin ? `${r.origin}, ${pickupCountry}` : 'Chưa có địa chỉ chi tiết');

  const deliveryName = r.delivery?.name || r.destination || 'Điểm giao';
  const deliveryAddr = r.delivery?.address || (r.destination ? `${r.destination}, ${deliveryCountry}` : 'Chưa có địa chỉ chi tiết');

  const isRelocated = t.pickupRelocation?.status === 'CUSTOMER_CONFIRMED';
  const effectivePickupName = isRelocated ? (t.pickupRelocation.placeName || pickupName) : pickupName;
  const effectivePickupAddr = isRelocated ? (t.pickupRelocation.placeAddress || pickupAddr) : pickupAddr;

  return (
    <div className="grid-main">
      <div className="stack">
        <div className="card">
          <h3 className="card-title">Tổng quan chuyến</h3>
          <div className="kv2">
            <Cell label="Chuyến">{t.id}</Cell>
            <Cell label="Yêu cầu">{r.id}</Cell>
            <Cell label="Khách hàng">
              <b>{cust.company || cust.name || '—'}</b>
              {cust.phone ? <small className="muted" style={{ display: 'block', marginTop: 2 }}>{cust.phone}</small> : null}
            </Cell>
            <Cell label="Điểm đi">{pickupName}, {pickupCountry}</Cell>
            <Cell label="Điểm đến">{deliveryName}, {deliveryCountry}</Cell>
            <Cell label="Phương thức vận chuyển">{t.mode ? human(t.mode) : 'Chưa chọn phương thức'}</Cell>
            <Cell label="Lấy ngựa mong muốn">{r.pickupAt ? date(r.pickupAt.slice(0, 10)) : '—'}</Cell>
            <Cell label="Ngày vận chuyển">{date(r.date)}</Cell>
            <Cell label="Ngựa">{tripHorses(t).length} con</Cell>
            <Cell label="Khởi hành dự kiến">{dt(t.plannedDepart)}</Cell>
            <Cell label="Dự kiến đến">{dt(t.eta)}</Cell>
          </div>

          {/* Địa chỉ chi tiết đối chiếu */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f172a', display: 'inline-block' }}></span>
                  Địa chỉ nhận (Điểm đi)
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                  {COUNTRY_NAMES[pickupCountry] || pickupCountry}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{effectivePickupName}</span>
                {isRelocated && (
                  <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    ĐIỂM ĐÃ ĐỔI
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                📍 {effectivePickupAddr}
              </div>
              {r.pickup?.contact || r.pickup?.phone ? (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  Người liên hệ: <b>{r.pickup.contact || '—'}</b> {r.pickup.phone ? `(${r.pickup.phone})` : ''}
                </div>
              ) : null}
              {r.pickup?.access ? (
                <div style={{ marginTop: 8, fontSize: 11, color: '#0f766e', background: '#ccfbf1', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                  ✓ Tĩnh không xe: Cao ≤ {r.pickup.access.maxHeightM || 4}m • Rộng ≤ {r.pickup.access.maxWidthM || 2.6}m • Tải ≤ {r.pickup.access.maxGrossT || 20} tấn
                </div>
              ) : null}
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                  Địa chỉ giao (Điểm đến)
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                  {COUNTRY_NAMES[deliveryCountry] || deliveryCountry}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{deliveryName}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                📍 {deliveryAddr}
              </div>
              {r.delivery?.contact || r.delivery?.phone ? (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  Người liên hệ: <b>{r.delivery.contact || '—'}</b> {r.delivery.phone ? `(${r.delivery.phone})` : ''}
                </div>
              ) : null}
            </div>
          </div>

          {/* Đánh giá tiếp cận đường vào & Đổi điểm đón (F3-J28 .. J33) */}
          <PickupAccessCard t={t} />

          <div className="kv2" style={{ marginTop: 18 }}>
            <Cell label="Triển khai"><PillT p={deployPill(t)} /></Cell>
            <Cell label="Duyệt tuyến"><PillT p={routePill(t)} /></Cell>
            <Cell label="Nguồn lực">{deployed(t) ? <PillT p={resourcePill(t)} /> : <span className="muted">Sau khi triển khai</span>}</Cell>
            <Cell label="Lập kế hoạch"><PillT p={planPill(t)} /></Cell>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Bước tiếp theo</h3>
          <p className="subtitle">{NEXT_STEP[ps] ? NEXT_STEP[ps](t) : tripNextAction(t)}</p>
          <div className="btn-row">
            {['AWAITING_ROUTE', 'ROUTE_PENDING', 'ROUTE_RETURNED'].includes(ps) ? (
              <button type="button" className="btn solid" onClick={() => go(`f/trip/${t.id}/route`)}>Mở tuyến</button>
            ) : null}
            {ps === 'MISSING_RESOURCES' ? (
              <button type="button" className="btn solid" onClick={() => go(`f/trip/${t.id}/resources`)}>Phân công nguồn lực</button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="eyebrow">Khách hàng &amp; liên hệ</div>
          <div style={{ marginTop: 10 }}>
            <b style={{ fontSize: 14, color: 'var(--ink)' }}>{cust.company || cust.name || '—'}</b>
            {cust.name && cust.company ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Đại diện: {cust.name}</div> : null}
            {cust.phone ? <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>📞 {cust.phone}</div> : null}
            {cust.email ? <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>✉️ {cust.email}</div> : null}
            {cust.address ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>🏢 {cust.address}</div> : null}
          </div>
        </div>
        {t.demoFlow3 ? null : <DemoCard current={t.id} />}
      </div>
    </div>
  );
}
export default OverviewTab;
