import React, { useEffect, useState } from 'react';
import { operationsApi } from '../../api/operationsApi';
import { apiMessage } from '../../api/apiError';
import type { TimedDocuments } from '../../types/operations';
import './TimedDocumentsCard.css';

export const TimedDocumentsCard: React.FC<{ tripId: string; role: 'specialist' | 'coordinator'; onAllowed?: (allowed: boolean) => void }> = ({ tripId, role, onAllowed }) => {
  const [plan, setPlan] = useState<TimedDocuments | null>(null);
  const [departure, setDeparture] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setPlan(null); setError(''); onAllowed?.(false);
    operationsApi.timedDocuments(role, tripId).then(value => {
      if (!active) return; setPlan(value); setDeparture(value.plannedDepart.replace(' ', 'T'));
      onAllowed?.(!value.required || value.status === 'SCHEDULED');
    }).catch(error => { if (active) setError(apiMessage(error)); });
    return () => { active = false; };
  }, [tripId, role, onAllowed]);
  const save = async () => {
    if (!plan || busy) return;
    const stamp = departure.replace('T', ' ');
    if (role === 'coordinator' && (!stamp || stamp < plan.earliestDeparture)) { setError('Chọn ngày giờ khởi hành từ mốc sớm nhất do Specialist gửi.'); return; }
    setBusy(true); setError('');
    try {
      const result = role === 'specialist' ? await operationsApi.sendTimedDocuments(tripId) : await operationsApi.scheduleTimedDocuments(tripId, plan.version, stamp);
      setPlan(result); onAllowed?.(!result.required || result.status === 'SCHEDULED');
    } catch (error) { setError(apiMessage(error)); } finally { setBusy(false); }
  };
  return <section className="timed-docs">
    <div className="timed-docs__head"><div><span>Phối hợp Specialist · Coordinator</span><h3>Hồ sơ có thời hạn & lịch khởi hành</h3></div><b>{plan ? ({ DRAFT: 'Chưa gửi danh sách', SENT: 'Chờ chốt lịch', SCHEDULED: 'Đã chốt lịch' })[plan.status] : 'Đang tải'}</b></div>
    <p>Specialist gửi yêu cầu thời hạn → Coordinator chốt lịch phù hợp → Specialist bắt đầu làm giấy tờ.</p>
    {error && <p role="alert" className="timed-docs__error">{error}</p>}
    {plan && <>
      {!plan.required ? <p>Chuyến này không có hồ sơ ngắn hạn cần phối hợp lịch.</p> : <>
        <div className="timed-docs__table"><table><thead><tr><th>Giấy tờ / ngựa</th><th>Thời gian chuẩn bị</th><th>Hiệu lực</th></tr></thead><tbody>{plan.items.map(item => <tr key={item.typeId + item.horseId}><td>{item.name}<small>{item.horseId || 'Toàn chuyến'}</small></td><td>{item.leadDays} ngày</td><td>{item.validityDays} ngày</td></tr>)}</tbody></table></div>
        <p>Khởi hành sớm nhất: <strong>{plan.earliestDeparture}</strong> (giờ Việt Nam).</p>
        {plan.status === 'SCHEDULED' && <p className="timed-docs__success">Lịch đã xác nhận: {plan.plannedDepart}. Specialist có thể chuẩn bị hồ sơ chính thức.</p>}
        {role === 'specialist' && plan.status === 'DRAFT' && <button type="button" disabled={busy} onClick={save}>{busy ? 'Đang gửi…' : 'Gửi danh sách cho Coordinator'}</button>}
        {role === 'specialist' && plan.status === 'SENT' && <p>Chờ Coordinator xác nhận lịch trước khi chuẩn bị hồ sơ có thời hạn.</p>}
        {role === 'coordinator' && plan.status === 'DRAFT' && <p>Chờ Specialist gửi danh sách. Chưa thể chốt lịch.</p>}
        {role === 'coordinator' && plan.status === 'SENT' && <div className="timed-docs__schedule"><label>Khởi hành dự kiến (giờ Việt Nam)<input type="datetime-local" value={departure} min={plan.earliestDeparture.replace(' ', 'T')} onChange={event => setDeparture(event.target.value)} /></label><button type="button" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Chốt lịch & gửi Specialist'}</button></div>}
      </>}
    </>}
  </section>;
};
