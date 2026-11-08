import React from 'react';
import type { SpecTrip } from '../../types';
import { useSpecialist } from '../../hooks/useSpecialist';
import { useDemoMode } from '../../../../shared/context/DemoModeContext';
import { useSharedIncidents, saveSharedIncident, getSharedIncidents } from '../../../../shared/utils/sharedIncidents';
import './DemoPanel.css';

/**
 * Nút demo: giả lập Manager giao chuyến, khách hàng nộp giấy tờ, tổ xe đến điểm kiểm tra…
 * Không nút nào là một quyết định duyệt của Specialist (trừ "chuẩn bị đủ hồ sơ" để đi nhanh tới Docs READY).
 */
export const DemoPanel: React.FC<{ trip?: SpecTrip }> = ({ trip }) => {
  const { enabled: isDemoMode } = useDemoMode('specialist');
  const { trips, customerDocs, actions } = useSpecialist();
  const incidents = useSharedIncidents(trip?.id);
  if (!isDemoMode) return null;
  const d = actions.demo;
  const pick = (test: (t: SpecTrip) => boolean) => (trip && test(trip) ? trip : trip ? undefined : trips.find(test));

  const assign = pick((t) => t.deployment === 'NOT_CONFIRMED');
  const upload = pick((t) => customerDocs.some((x) => x.tripId === t.id && !x.optional && ['ACTION_REQUIRED', 'MISSING'].includes(x.status)) && t.deployment === 'CONFIRMED');
  const prepare = pick((t) => t.status === 'PLANNING' && t.deployment === 'CONFIRMED' && !t.docsReady);
  const expire = pick((t) => t.status === 'PLANNING' && t.deployment === 'CONFIRMED' && !t.docsReady);
  const arrive = pick((t) => t.status === 'IN_TRANSIT' && t.checkpoints.some((c) => !c.arrivedAt));

  const hasIncident = trip ? incidents.length > 0 || (trip.status as string) === 'INCIDENT' : false;

  const btns: Array<[string, () => unknown, boolean?]> = [];
  if (assign) btns.push([`Manager: giao ${assign.id} cho tôi`, () => d.managerAssign(assign.id), true]);
  if (upload) btns.push([`Khách hàng nộp giấy tờ còn thiếu (${upload.id})`, () => d.customerUpload(upload.id)]);
  if (prepare) btns.push([`Chuẩn bị đủ hồ sơ & bảo hiểm (${prepare.id})`, () => d.prepareAll(prepare.id)]);
  if (expire) btns.push([`Cho 1 chứng từ hết hạn (${expire.id})`, () => d.expireDocument(expire.id)]);
  if (arrive) btns.push([`Tổ xe đến điểm kiểm tra tiếp theo (${arrive.id})`, () => d.crewArrive(arrive.id)]);

  if (trip && trip.docsReady && !hasIncident) {
    btns.push([`Mô phỏng sự cố vận chuyển (${trip.id})`, () => {
      saveSharedIncident({
        id: `INC_${Date.now().toString().slice(-4)}`,
        tripId: trip.id,
        type: 'CUSTOMS_HOLD',
        severity: 'HIGH',
        status: 'REPORTED',
        at: new Date().toISOString(),
        by: 'Tài xế / Tổ xe',
        location: 'Cửa khẩu kiểm soát',
        description: 'Hải quan yêu cầu rà soát bổ sung chứng từ kiểm dịch và hồ sơ vận chuyển.',
        photos: [],
      });
    }]);
  } else if (trip && trip.docsReady && hasIncident) {
    btns.push([`Xoá sự cố mô phỏng (${trip.id})`, () => {
      const all = getSharedIncidents().filter(
        (i) => (i.tripId || '').replace(/-/g, '_') !== (trip.id || '').replace(/-/g, '_')
      );
      localStorage.setItem('rts_shared_incidents', JSON.stringify(all));
      window.dispatchEvent(new Event('rts_shared_incidents_changed'));
    }]);
  }

  if (!btns.length) return null;

  return (
    <div className="spc-demo">
      <div className="spc-demo__title">Nút demo</div>
      <p>Giả lập thao tác của Manager, khách hàng và tổ xe trên dữ liệu dùng chung để thử các tình huống.</p>
      {btns.map(([label, run, primary]) => (
        <button key={label} type="button" className={`spc-btn spc-btn--sm spc-btn--block ${primary ? 'spc-btn--solid' : ''}`} onClick={() => { run(); }}>{label}</button>
      ))}
    </div>
  );
};

export default DemoPanel;
