import React from 'react';
import type { SpecTrip } from '../../types';
import { useDemoMode } from '../../../../shared/context/DemoModeContext';
import { useSpecialist } from '../../hooks/useSpecialist';
import './DemoPanel.css';

/**
 * Nút demo: giả lập Manager giao chuyến, khách hàng nộp giấy tờ, tổ xe đến điểm kiểm tra…
 * Không nút nào là một quyết định duyệt của Specialist (trừ "chuẩn bị đủ hồ sơ" để đi nhanh tới Docs READY).
 */
export const DemoPanel: React.FC<{ trip?: SpecTrip }> = ({ trip }) => {
  const { enabled: isDemoMode } = useDemoMode('specialist');
  const { trips, customerDocs, actions } = useSpecialist();
  if (!isDemoMode) return null;
  const d = actions.demo;
  const pick = (test: (t: SpecTrip) => boolean) => (trip && test(trip) ? trip : trip ? undefined : trips.find(test));

  const assign = pick((t) => t.deployment === 'NOT_CONFIRMED');
  const upload = pick((t) => customerDocs.some((x) => x.tripId === t.id && !x.optional && ['ACTION_REQUIRED', 'MISSING'].includes(x.status)) && t.deployment === 'CONFIRMED');
  const prepare = pick((t) => t.status === 'PLANNING' && t.deployment === 'CONFIRMED' && !t.docsReady);
  const expire = pick((t) => t.status === 'PLANNING' && t.deployment === 'CONFIRMED');
  const arrive = pick((t) => t.status === 'IN_TRANSIT' && t.checkpoints.some((c) => !c.arrivedAt));

  const btns: Array<[string, () => unknown, boolean?]> = [];
  if (assign) btns.push([`Manager: giao ${assign.id} cho tôi`, () => d.managerAssign(assign.id), true]);
  if (upload) btns.push([`Khách hàng nộp giấy tờ còn thiếu (${upload.id})`, () => d.customerUpload(upload.id)]);
  if (prepare) btns.push([`Chuẩn bị đủ hồ sơ & bảo hiểm (${prepare.id})`, () => d.prepareAll(prepare.id)]);
  if (expire) btns.push([`Cho 1 chứng từ hết hạn (${expire.id})`, () => d.expireDocument(expire.id)]);
  if (arrive) btns.push([`Tổ xe đến điểm kiểm tra tiếp theo (${arrive.id})`, () => d.crewArrive(arrive.id)]);
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
