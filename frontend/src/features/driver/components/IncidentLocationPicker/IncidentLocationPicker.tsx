import React, { useCallback, useMemo } from 'react';
import { RouteMap } from '../RouteMap/RouteMap';
import { cleanStopName } from '../../../tracking/utils/progress';
import { incidentSegment, incidentWhere, pointOnSegment, ratioOnSegment } from '../../hooks/driverRules';
import type { Trip } from '../../types';

interface Props {
  trip: Trip;
  ratio: number;
  onChange: (ratio: number) => void;
}

/** Chọn vị trí sự cố trên đoạn đường giữa trạm mới rời (A) và trạm sắp tới (B) */
export const IncidentLocationPicker: React.FC<Props> = ({ trip, ratio, onChange }) => {
  const { a, b, aIndex } = incidentSegment(trip);
  const point = a && b ? pointOnSegment(a, b, ratio) : null;
  const pins = useMemo(() => point ? [{
    id: 'Sự cố', tripId: trip.id, label: 'Vị trí sự cố', lat: point.lat, lng: point.lng,
    where: incidentWhere(trip, ratio), description: 'Vị trí bạn đang chọn', at: '',
  }] : [], [point, trip, ratio]);
  const onPick = useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    if (!a || !b) return;
    const r = ratioOnSegment(a, b, lat, lng);
    if (r !== null) onChange(r);
  }, [a, b, onChange]);

  if (!a || !b || !point) return null;
  const pct = Math.round(ratio * 100);
  return (
    <div className="drv-inc-pick">
      <div className="drv-inc-pick__ends">
        <span><small>Trạm mới rời (A)</small><b>{cleanStopName(a.name)}</b></span>
        <span><small>Trạm sắp tới (B)</small><b>{cleanStopName(b.name)}</b></span>
      </div>
      <p className="drv-hint">
        {pct === 0 ? `Đang tại ${cleanStopName(a.name)}` : `Cách trạm A khoảng ${pct}% đoạn đường`}. Kéo trực tiếp biểu tượng sự cố (!) trên bản đồ hoặc bấm vào cung đường để chọn vị trí.
      </p>
      <RouteMap stops={trip.stops} current={aIndex} height={280} compact onPick={onPick} pins={pins} draggablePin />
    </div>
  );
};

export default IncidentLocationPicker;
