import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HorseInput, TransportRequest } from '../../../types';
import { customerApi } from '../../../api/customerApi';
import { useCustomer } from '../../../hooks/useCustomer';
import { emptyHorse, horseDocItems, horseLine, horseRequests, sharedDocItems } from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DocumentRows } from '../../../components/DocumentList/DocumentList';
import { HorseForm } from '../../../components/HorseForm/HorseForm';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';

/** Bước 2/3 – giấy tờ chung của đơn + chọn ngựa cho từng vị trí và hoàn thiện hồ sơ từng ngựa */
export const HorsesStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { horses, requests, actions } = useCustomer();
  const [slot, setSlot] = useState(() => Math.max(0, r.horses.findIndex((h) => !h)));
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [draft, setDraft] = useState<HorseInput>(emptyHorse());
  const [selectable, setSelectable] = useState<string[] | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [changingHorse, setChangingHorse] = useState(false);
  useEffect(() => {
    let active = true;
    customerApi.getSelectableHorses(r.date, r.id).then(rows => { if (active) { setSelectable(rows.filter(h => h.selectable).map(h => h.id)); setAvailabilityError(''); } })
      .catch(() => { if (active) { setSelectable(null); setAvailabilityError('Chưa kiểm tra được lịch ngựa. Vui lòng tải lại trước khi chọn.'); } });
    return () => { active = false; };
  }, [r.date, r.id, horses.length]);
  const selectedId = r.horses[slot] ?? '';
  const selected = horses.find((h) => h.id === selectedId);
  const backTo = `/customer/requests/${r.id}/wizard/2`;

  const pick = (id: string) => {
    if (id && !selectable?.includes(id)) { actions.showToast('Ngựa chưa được xác nhận khả dụng cho ngày này.'); return; }
    actions.setHorseSlot(r.id, slot, id);
    setChangingHorse(false);
  };
  const saveNew = async () => {
    const res = await actions.createHorse(draft);
    if (!res.ok || !res.id) return;
    actions.setHorseSlot(r.id, slot, res.id);
    setDraft(emptyHorse());
    setChangingHorse(false);
    setMode('existing');
  };
  const next = async () => {
    const empty = r.horses.findIndex((h) => !h);
    if (empty >= 0) { setSlot(empty); actions.showToast(`Hãy chọn ngựa cho vị trí ${empty + 1}.`); return; }
    const res = await actions.completeHorsesStep(r.id);
    if (res.ok) navigate(`/customer/requests/${r.id}/wizard/3`);
  };

  return (
    <div className="cus-stack">
      {availabilityError && <p role="alert">{availabilityError}</p>}
      <div className="cus-card">
        <div className="cus-wizard__horse-head">
          <div>
            <span className="cus-eyebrow">Thông tin từng ngựa</span>
            <h3 className="cus-card__title" style={{ marginTop: 4 }}>Danh sách ngựa & hồ sơ</h3>
            <p className="cus-subtitle" style={{ marginTop: -6 }}>Chọn ngựa từ “Ngựa của tôi” hoặc thêm ngựa mới. Hồ sơ của từng ngựa được kiểm tra ngay tại đây.</p>
          </div>
          <span className="cus-wizard__count">{r.horses.filter(Boolean).length}/{r.horseCount} ngựa</span>
        </div>

        <div className="cus-field cus-wizard__horse-count"><label htmlFor="request-horse-count">Số lượng ngựa trong chuyến *</label>
          <select id="request-horse-count" className="cus-select" value={r.horseCount} disabled={r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses')}
            onChange={event => {
              if (mode === 'new') { actions.showToast('Lưu ngựa đang nhập trước khi đổi số lượng.'); return; }
              const count = Number(event.target.value);
              const result = actions.setHorseCount(r.id, count);
              if (result.ok) setSlot(current => Math.min(current, count - 1));
            }}>
            {[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} ngựa</option>)}
          </select>
        </div>
        <div className="cus-wizard__chips">
          {r.horses.map((id, i) => (
            <button key={i} type="button" className={`cus-chip ${i === slot ? 'on' : ''} ${id ? 'cus-chip--done' : ''}`} onClick={() => { setSlot(i); setMode('existing'); setChangingHorse(false); }}>
              {id ? <><Icon name="check" />{horses.find((h) => h.id === id)?.name ?? id}</> : `Ngựa ${i + 1}`}
            </button>
          ))}
        </div>

        <div className="cus-wizard__seg">
          <button type="button" className={mode === 'existing' ? 'on' : ''} onClick={() => setMode('existing')}>Chọn ngựa đã lưu</button>
          <button type="button" className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>Thêm ngựa mới</button>
        </div>

        {mode === 'existing' ? (
          <>
            {(!selected || changingHorse) ? (
              <>
                {changingHorse && selected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <span>Đang chọn ngựa cho vị trí {slot + 1} (hiện tại: <b>{selected.name}</b>)</span>
                    <button type="button" className="cus-btn cus-btn--sm" onClick={() => setChangingHorse(false)}>Hủy đổi</button>
                  </div>
                )}
                <div className="cus-wizard__picker">
                  {horses.map((h) => {
                    const taken = r.horses.some((id, i) => id === h.id && i !== slot);
                    const unavailable = !selectable?.includes(h.id);
                    const locked = r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses');
                    return (
                      <label key={h.id} className={`cus-pick ${selectedId === h.id ? 'selected' : ''} ${taken ? 'disabled' : ''}`}>
                        <input type="radio" name="pick-horse" checked={selectedId === h.id} disabled={taken || unavailable || locked} onChange={() => pick(h.id)} />
                        <span className="cus-pick__thumb">{h.photo?.url ? <img src={h.photo.url} alt="" /> : <Icon name="horse" />}</span>
                        <span className="cus-pick__text"><b>{h.name}</b><small>{horseLine(h)}{taken ? ' • Đã chọn ở vị trí khác' : ''}</small></span>
                        <TripStatusBadge label={horseRequests(h, requests).length ? 'Đã dùng trong đơn' : 'Chưa dùng'} tone={horseRequests(h, requests).length ? 'info' : 'muted'} />
                      </label>
                    );
                  })}
                  {!horses.length && <p className="cus-subtitle">Bạn chưa có ngựa. Chọn “Thêm ngựa mới” để khai báo.</p>}
                </div>
              </>
            ) : null}

            {selected && !changingHorse && (
              <div className="cus-wizard__profile">
                <div className="cus-wizard__profile-head">
                  <div>
                    <b>{selected.name}</b><span>{selected.microchip || selected.id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="cus-btn cus-btn--sm" onClick={() => setChangingHorse(true)}>Chọn ngựa khác</button>
                    <button type="button" className="cus-btn cus-btn--sm" onClick={() => { actions.setHorseSlot(r.id, slot, ''); setChangingHorse(true); }}>Bỏ khỏi yêu cầu</button>
                  </div>
                </div>
                <p className="cus-subtitle">Thông tin hộ chiếu, sở hữu, giá trị và y tế lấy từ “Ngựa của tôi”. Có thể sửa thông tin hoặc tải tệp ngay bên dưới.</p>
                <DocumentRows requestId={r.id} items={horseDocItems(r, selected)} editable backTo={backTo} />
                <div className="cus-field" style={{ marginTop: 12 }}>
                  <label htmlFor="horse-note">Yêu cầu chăm sóc riêng cho {selected.name} trong chuyến (không bắt buộc)</label>
                  <textarea id="horse-note" className="cus-textarea" rows={2} value={r.horseNotes[selected.id] ?? ''} disabled={r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['notes']).includes('notes')}
                    placeholder="Lịch ăn, chăm sóc, lưu ý khi vận chuyển…" onChange={(e) => actions.setHorseNote(r.id, selected.id, e.target.value)} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <HorseForm value={draft} onChange={setDraft} />
            <div className="cus-btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="cus-btn cus-btn--solid" onClick={saveNew}>Lưu ngựa mới & chọn cho vị trí {slot + 1}</button>
            </div>
          </>
        )}
      </div>

      <div className="cus-card">
        <span className="cus-eyebrow">Hồ sơ dùng chung</span>
        <h3 className="cus-card__title" style={{ marginTop: 4 }}>Giấy tờ chung của đơn vận chuyển</h3>
        <p className="cus-subtitle" style={{ marginTop: -6, marginBottom: 12 }}>Khai báo một lần cho cả yêu cầu. ATA Carnet chỉ hiện với tuyến Việt Nam → Nhật Bản.</p>
        <DocumentRows requestId={r.id} items={sharedDocItems(r)} editable backTo={backTo} />
      </div>

      <div className="cus-wizard__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/edit`)}>Quay lại</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={next}>Lưu & xem lại yêu cầu</button>
      </div>
    </div>
  );
};

export default HorsesStep;
