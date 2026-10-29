import React, { useState } from 'react';
import type { CrewAssignment, CrewSlot, LegKey, Trip } from '../../../types';
import { useCoordinator } from '../../../hooks/useCoordinator';
import {
  ROLE_LABEL,
  SLOTS,
  SLOT_LABEL,
  canPlan,
  countryName,
  resourceGaps,
  serviceCountry,
  staffBlock,
  unitGaps,
  vehicleBlock,
} from '../../../hooks/coordinatorRules';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Một xe + tổ lái (chuyến bộ) hoặc một chặng xe của chuyến hàng không */
const UnitCard: React.FC<{ trip: Trip; leg?: LegKey }> = ({ trip, leg }) => {
  const { trips, vehicles, staff, actions } = useCoordinator();
  const unit = leg && trip.legs ? trip.legs[leg] : { vehicleId: trip.vehicleId, crew: trip.crew };
  const [draft, setDraft] = useState<CrewAssignment>(unit.crew);
  const [prevCrew, setPrevCrew] = useState<CrewAssignment>(unit.crew);
  if (unit.crew !== prevCrew) {
    setPrevCrew(unit.crew);
    setDraft(unit.crew);
  }

  const country = serviceCountry(trip, leg);
  const editable = canPlan(trip);
  const gaps = unitGaps(trip, vehicles, staff, trips, leg);
  const localVehicles = vehicles.filter((v) => v.country === country);
  const candidates = (slot: CrewSlot) => staff.filter((s) => !staffBlock(s, slot, trip, trips, leg) || s.id === unit.crew[slot]);

  return (
    <div className="crd-unit">
      <div className="crd-unit__head">
        <div>
          {leg && trip.legs ? (
            <>
              <div className="crd-unit__eyebrow">{leg === 'outbound' ? 'Chặng 1 · Trước chuyến bay' : 'Chặng 2 · Sau chuyến bay'}</div>
              <div className="crd-unit__title">{trip.legs[leg].title}</div>
              <div className="crd-muted">{trip.legs[leg].from} → {trip.legs[leg].to} • {countryName(country)}</div>
            </>
          ) : (
            <>
              <div className="crd-unit__eyebrow">Xe & tổ lái</div>
              <div className="crd-unit__title">{trip.origin} → {trip.destination}</div>
              <div className="crd-muted">{trip.horses.length} ngựa • xe và nhân sự tại {countryName(country)}</div>
            </>
          )}
        </div>
        {gaps.length ? <TripStatusBadge tone="warn" label="Chưa đủ" /> : <TripStatusBadge tone="ok" label="Đã bố trí" />}
      </div>

      <div className="crd-grid2">
        <div className="crd-card">
          <h3 className="crd-card__title">Xe vận chuyển</h3>
          {localVehicles.map((v) => {
            const why = vehicleBlock(v, trip, trips, leg), selected = v.id === unit.vehicleId;
            return (
              <div key={v.id} className={`crd-vehicle ${selected ? 'selected' : ''}`}>
                <div>
                  <b>{v.plate}</b>
                  <div className="crd-muted">{v.model} • {v.stalls} ngăn • {v.base}</div>
                  {why && !selected && <div className="crd-muted" style={{ color: '#b45309' }}>{why}</div>}
                </div>
                {selected ? <TripStatusBadge tone="ok" label="Đã chọn" />
                  : <button type="button" className="crd-btn crd-btn--solid crd-btn--sm" disabled={!editable || !!why} title={why} onClick={() => actions.assignVehicle(trip.id, v.id, leg)}>Phân công</button>}
              </div>
            );
          })}
          {!localVehicles.length && <p className="crd-muted">Không có xe đăng ký tại {countryName(country)}.</p>}
        </div>

        <div className="crd-card">
          <h3 className="crd-card__title">Nhân sự</h3>
          <p className="crd-muted" style={{ marginTop: -6 }}>Ba người riêng biệt, đúng quốc gia, chưa được gắn vào chuyến nào khác đang hoạt động; chứng chỉ thú y còn hiệu lực.</p>
          {SLOTS.map((slot) => (
            <div className="crd-field" key={slot}>
              <label htmlFor={`crd-${leg ?? 'trip'}-${slot}`}>{SLOT_LABEL[slot]} *</label>
              <select id={`crd-${leg ?? 'trip'}-${slot}`} className="crd-select" disabled={!editable} value={draft[slot] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [slot]: e.target.value || undefined }))}>
                <option value="">— Chọn nhân sự phù hợp —</option>
                {candidates(slot).map((s) => <option key={s.id} value={s.id}>{s.name} • {ROLE_LABEL[s.role]}</option>)}
              </select>
            </div>
          ))}
          <button type="button" className="crd-btn crd-btn--solid" disabled={!editable} onClick={() => actions.assignCrew(trip.id, draft, leg)}>Lưu phân công nhân sự</button>
        </div>
      </div>

      {gaps.length > 0 && <div className="crd-note crd-note--yellow"><div><b>Còn thiếu</b>{gaps.join(' • ')}</div></div>}
    </div>
  );
};

export const ResourcesTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { trips, vehicles, staff, actions } = useCoordinator();
  const [leg, setLeg] = useState<LegKey>('outbound');
  const gaps = resourceGaps(trip, vehicles, staff, trips);
  const legOk = (k: LegKey) => !unitGaps(trip, vehicles, staff, trips, k).length;

  return (
    <>
      {trip.deploymentStatus === 'CONFIRMED' && trip.status !== 'PLANNING' && (
        <div className="crd-note crd-note--grey"><div><b>Chỉ xem</b>Chuyến đã qua bước lập kế hoạch, không thay đổi phân công.</div></div>
      )}

      {trip.mode === 'AIR' && trip.legs ? (
        <>
          <div className="crd-note crd-note--yellow" style={{ marginTop: 0 }}>
            <div><b>Đường bộ trước/sau chuyến bay</b>Mỗi chặng có một xe, tài xế chính, phụ lái kiêm Escort và bác sĩ thú y riêng. Hãng hàng không thuê ngoài lo chăm sóc ngựa trên máy bay.</div>
          </div>
          <div className="crd-leg-tabs" role="tablist">
            {(['outbound', 'inbound'] as LegKey[]).map((k) => (
              <button key={k} type="button" className={leg === k ? 'on' : ''} onClick={() => setLeg(k)}>
                {k === 'outbound' ? 'Chặng 1 · Trước chuyến bay' : 'Chặng 2 · Sau chuyến bay'}{legOk(k) ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <UnitCard trip={trip} leg={leg} key={leg} />
        </>
      ) : <UnitCard trip={trip} />}

      <div className="crd-card" style={{ marginTop: 16 }}>
        <h3 className="crd-card__title">
          <span>Xác nhận bố trí phương tiện & nhân sự</span>
          {trip.resourcesConfirmed ? <TripStatusBadge tone="ok" label="Đã xác nhận" /> : <TripStatusBadge tone="warn" label="Chưa xác nhận" />}
        </h3>
        {trip.resourcesConfirmed
          ? <p className="crd-muted">Xác nhận lúc {trip.resourcesConfirmed.at} bởi {trip.resourcesConfirmed.by}. Thay đổi xe/nhân sự sẽ phải xác nhận lại.</p>
          : gaps.length
            ? <div className="crd-note crd-note--yellow" style={{ marginTop: 0 }}><div><b>Chưa đủ điều kiện</b>{gaps.join(' • ')}</div></div>
            : <p className="crd-muted">Đã đủ xe và nhân sự. Xác nhận để báo Manager (Operations READY).</p>}
        {!trip.resourcesConfirmed && (
          <button type="button" className="crd-btn crd-btn--solid" style={{ marginTop: 12 }} disabled={gaps.length > 0 || !canPlan(trip)} onClick={() => actions.confirmResources(trip.id)}>Xác nhận nguồn lực</button>
        )}
      </div>
    </>
  );
};

export default ResourcesTab;
