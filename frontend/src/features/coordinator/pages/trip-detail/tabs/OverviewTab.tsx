// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { Cell } from '../../../components/common/ui';
import { DemoCard } from '../../../components/demo/Demo';
import { custOf, reqOfTrip, tripHorses } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { city, date, dt, human } from '../../../utils/format';
import { PickupAccessCard } from '../../../components/relocation/PickupAccessCard';


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
  const r = reqOfTrip(t);
  const cust = custOf(r);

  const pickupCountry = r.pickup?.country || city(r.origin)[1] || 'VN';
  const deliveryCountry = r.delivery?.country || city(r.destination)[1] || 'JP';

  const pickupName = r.pickup?.name || r.origin || 'Điểm nhận';
  const pickupAddr = r.pickup?.address || (r.origin ? `${r.origin}, ${pickupCountry}` : 'Chưa có địa chỉ chi tiết');

  const deliveryName = r.delivery?.name || r.destination || 'Điểm giao';
  const deliveryAddr = r.delivery?.address || (r.destination ? `${r.destination}, ${deliveryCountry}` : 'Chưa có địa chỉ chi tiết');

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
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{pickupName}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                {pickupAddr}
              </div>
              {r.pickup?.contact || r.pickup?.phone ? (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  Người liên hệ: <b>{r.pickup.contact || '—'}</b> {r.pickup.phone ? `(${r.pickup.phone})` : ''}
                </div>
              ) : null}
              {r.pickup?.access ? (
                <div style={{ marginTop: 8, fontSize: 11, color: '#0f766e', background: '#ccfbf1', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                  Tĩnh không xe: Cao ≤ {r.pickup.access.maxHeightM || 4}m • Rộng ≤ {r.pickup.access.maxWidthM || 2.6}m • Tải ≤ {r.pickup.access.maxGrossT || 20} tấn
                </div>
              ) : null}

              {/* Thẻ điều phối tiếp cận điểm lấy ngựa */}
              <PickupAccessCard t={t} />
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
                {deliveryAddr}
              </div>
              {r.delivery?.contact || r.delivery?.phone ? (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  Người liên hệ: <b>{r.delivery.contact || '—'}</b> {r.delivery.phone ? `(${r.delivery.phone})` : ''}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="eyebrow">Khách hàng &amp; liên hệ</div>
          <div style={{ marginTop: 10 }}>
            <b style={{ fontSize: 14, color: 'var(--ink)' }}>{cust.company || cust.name || '—'}</b>
            {cust.name && cust.company ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Đại diện: {cust.name}</div> : null}
            {cust.phone ? <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>SĐT: {cust.phone}</div> : null}
            {cust.email ? <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Email: {cust.email}</div> : null}
            {cust.address ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>Địa chỉ: {cust.address}</div> : null}
          </div>
        </div>
        {t.demoFlow3 ? null : <DemoCard current={t.id} />}
      </div>
    </div>
  );
}
export default OverviewTab;
