import React, { useState } from 'react';
import { DateTimeInput } from '../../../../../shared/components/DateTimeInput/DateTimeInput';
import type { HorseCondition, Trip } from '../../../types';
import { useDriver } from '../../../hooks/useDriver';
import { CONDITION_LABEL, fmtDateTime, nowStamp, toInputValue } from '../../../hooks/driverRules';
import { getUserFullName } from '../../../../../shared/utils/userNameResolver';

const CONDITIONS: HorseCondition[] = ['NORMAL', 'MONITOR', 'ABNORMAL'];
const TONE: Record<HorseCondition, string> = { NORMAL: 'green', MONITOR: 'orange', ABNORMAL: 'red' };

/** Hộ tống / bác sĩ thú y ghi quan sát; tài xế chỉ xem */
export const HealthTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { isEscort, horse, crewMember, actions } = useDriver();
  const [horseId, setHorseId] = useState(trip.horses[0] ?? '');
  const [at, setAt] = useState(toInputValue(nowStamp()));
  const [temp, setTemp] = useState('');
  const [hr, setHr] = useState('');
  const [condition, setCondition] = useState<HorseCondition>('NORMAL');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canWrite = isEscort && trip.status !== 'COMPLETED';

  const save = async () => {
    setSaving(true);
    const r = await actions.addHealthLog(trip.id, { horseId, at, temp: Number(temp), hr: Number(hr), condition, notes });
    setSaving(false);
    if (!r.ok) { setError(r.message); return; }
    setError(''); setTemp(''); setHr(''); setNotes(''); setCondition('NORMAL'); setAt(toInputValue(nowStamp()));
  };

  return (
    <div className="drv-grid2">
      {canWrite ? (
        <div className="drv-card">
          <h3 className="drv-card__title">Quan sát mới</h3>
          <div className="drv-form-grid">
            <div className="drv-field">
              <label htmlFor="drv-h">Ngựa *</label>
              <select id="drv-h" className="drv-select" value={horseId} onChange={(e) => setHorseId(e.target.value)}>
                {trip.horses.map((h) => <option key={h} value={h}>{horse(h)?.name ?? h}</option>)}
              </select>
            </div>
            <div className="drv-field">
              <label htmlFor="drv-hat">Thời điểm *</label>
              <DateTimeInput id="drv-hat" className="drv-input" value={at} onChange={setAt} />
            </div>
            <div className="drv-field">
              <label htmlFor="drv-temp">Thân nhiệt (°C) *</label>
              <input id="drv-temp" className="drv-input" type="number" step="0.1" min="35" max="42" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="VD: 37.8" />
            </div>
            <div className="drv-field">
              <label htmlFor="drv-hr">Nhịp tim (lần/phút) *</label>
              <input id="drv-hr" className="drv-input" type="number" min="20" max="120" inputMode="numeric" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="VD: 40" />
            </div>
          </div>
          <div className="drv-field">
            <label>Tình trạng *</label>
            <div className="drv-radios" role="radiogroup">
              {CONDITIONS.map((c) => (
                <label key={c} className={condition === c ? 'on' : ''}>
                  <input type="radio" name="drv-cond" value={c} checked={condition === c} onChange={() => setCondition(c)} /> {CONDITION_LABEL[c]}
                </label>
              ))}
            </div>
          </div>
          <div className="drv-field">
            <label htmlFor="drv-hn">Ghi chú{condition !== 'NORMAL' ? ' *' : ''}</label>
            <textarea id="drv-hn" className="drv-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ăn, uống, hành vi, xử trí đã thực hiện" />
          </div>
          {error && <p className="drv-error" role="alert">{error}</p>}
          <button type="button" className="drv-btn drv-btn--solid drv-btn--lg drv-btn--block" disabled={saving || !horseId} onClick={save}>{saving ? 'Đang lưu…' : 'Lưu quan sát'}</button>
        </div>
      ) : (
        <div className="drv-card">
          <h3 className="drv-card__title">Sức khoẻ ngựa</h3>
          <p className="drv-subtitle">{isEscort ? 'Chuyến đã hoàn tất.' : 'Quan sát do hộ tống hoặc bác sĩ thú y ghi nhận. Bạn có thể xem tại đây.'}</p>
        </div>
      )}

      <div className="drv-card">
        <h3 className="drv-card__title">Các lần quan sát</h3>
        {trip.health.length ? (
          <div className="drv-hlog__scroll">
          <ul className="drv-timeline">
            {[...trip.health].sort((x, y) => y.at.localeCompare(x.at)).map((h) => {
              const label = h.locationLabel ?? '';
              const atStop = /^Tại\s/i.test(label);
              const onRoad = /^Trên tuyến|^Gần\s/i.test(label);
              const placeText = atStop ? label.replace(/^Tại\s+/i, '') : onRoad ? label.replace(/^Trên tuyến\s*/i, '') : label;
              return (
                <li key={h.id} className={TONE[h.condition]}>
                  <div className="drv-hlog__head">
                    <b>{horse(h.horseId)?.name ?? h.horseId}</b>
                    <span className={`drv-badge drv-badge--${h.condition === 'NORMAL' ? 'ok' : h.condition === 'MONITOR' ? 'warn' : 'bad'}`}>{CONDITION_LABEL[h.condition]}</span>
                  </div>
                  <div className="drv-hlog__time">{fmtDateTime(h.at)} • {getUserFullName(crewMember(h.by)?.name || h.by)}</div>
                  <div className="drv-hlog__stats">
                    <span><small>Thân nhiệt</small><b>{h.temp.toFixed(1)}°C</b></span>
                    <span><small>Nhịp tim</small><b>{h.hr} lần/phút</b></span>
                  </div>
                  {h.notes && h.notes !== 'Quan sát sức khỏe trên đường' && <div className="drv-hlog__note">{h.notes}</div>}
                  <div className="drv-hlog__place">
                    {label ? (
                      <>
                        <span className={`drv-badge drv-badge--${atStop ? 'info' : 'muted'}`}>{atStop ? 'Tại trạm nghỉ' : onRoad ? 'Trên đường đi' : 'Vị trí'}</span>
                        <span>{placeText}</span>
                      </>
                    ) : <span className="drv-badge drv-badge--muted">Chưa ghi vị trí</span>}
                  </div>
                </li>
              );
            })}
          </ul>
          </div>
        ) : <p className="drv-hint">Chưa có quan sát nào.</p>}
      </div>
    </div>
  );
};

export default HealthTab;
