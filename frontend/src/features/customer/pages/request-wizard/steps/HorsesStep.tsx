import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HorseInput, TransportRequest } from '../../../types';
import { customerApi } from '../../../api/customerApi';
import { useCustomer } from '../../../hooks/useCustomer';
import { emptyHorse, horseDocItems, horseLine, horseRequests, validateHorseForm, HORSE_FIELD_ELEMENT_IDS } from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { DocumentRows } from '../../../components/DocumentList/DocumentList';
import { HorseForm } from '../../../components/HorseForm/HorseForm';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { getDemoMode } from '../../../../../shared/context/DemoModeContext';
import { apiMessage } from '../../../../../shared/api/apiError';
import { AuthImage } from '../../../../../shared/components/AuthImage';

/** Bước 2/3 – giấy tờ chung của đơn + chọn ngựa cho từng vị trí và hoàn thiện hồ sơ từng ngựa */
export const HorsesStep: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { horses, requests, actions } = useCustomer();
  const [slot, setSlot] = useState(() => Math.max(0, r.horses.findIndex((h) => !h)));
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [draft, setDraft] = useState<HorseInput>(emptyHorse());
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [selectable, setSelectable] = useState<string[] | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');

  const handleClearDraftError = (key: string) => {
    setDraftErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  useEffect(() => {
    let active = true;
    if (getDemoMode('customer')) { setSelectable(horses.map(h => h.id)); return; }
    customerApi.getSelectableHorses(r.date, r.id, r.pickupAt)
      .then(rows => {
        if (active) {
          if (rows && rows.length > 0) {
            setSelectable(rows.filter(h => h.selectable).map(h => h.id));
          } else setSelectable([]);
          setAvailabilityError('');
        }
      })
      .catch(error => {
        if (active) {
          setSelectable([]);
          setAvailabilityError(apiMessage(error));
        }
      });
    return () => { active = false; };
  }, [r.date, r.pickupAt, r.id, horses.length]);
  const selectedId = r.horses[slot] ?? '';
  const selected = horses.find((h) => h.id === selectedId);
  const backTo = `/customer/requests/${r.id}/wizard/2`;

  const pick = (id: string) => {
    if (id && !selectable?.includes(id)) { actions.showToast('Ngựa chưa được xác nhận khả dụng cho ngày này.'); return; }
    actions.setHorseSlot(r.id, slot, id);
  };
  const saveNew = async () => {
    const errMap = validateHorseForm(draft);
    if (Object.keys(errMap).length > 0) {
      setDraftErrors(errMap);
      const firstKey = Object.keys(errMap)[0];
      const elId = HORSE_FIELD_ELEMENT_IDS[firstKey];
      if (elId) {
        const el = document.getElementById(elId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
      return;
    }
    setDraftErrors({});
    const res = await actions.createHorse(draft);
    if (!res.ok || !res.id) return;
    actions.setHorseSlot(r.id, slot, res.id);
    setDraft(emptyHorse());
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

      {/* Top Scope & Horse Count Card matching Step 1 Schedule */}
      <section className="cus-card cus-create__schedule cus-horse-step__top-card">
        <div className="cus-create__schedule-left">
          <span className="cus-create__calendar" style={{ background: '#fff7ed', borderColor: '#ffedd5', color: '#ea580c' }}>
            <Icon name="horse" />
          </span>
          <div className="cus-create__schedule-title-group">
            <h3>Số lượng ngựa vận chuyển <span>*</span></h3>
            <p>Mỗi chuyến vận chuyển hỗ trợ từ 1 đến 6 ngựa. Chọn số lượng ngựa cần chở.</p>
          </div>
        </div>
        <div className="cus-create__schedule-dates" style={{ alignItems: 'center' }}>
          <div className="cus-create__date-col" style={{ width: '180px' }}>
            <label htmlFor="request-horse-count">Quy mô đoàn ngựa <span>*</span></label>
            <select
              id="request-horse-count"
              className="cus-select cus-date__field"
              value={r.horseCount}
              disabled={r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses')}
              onChange={event => {
                if (mode === 'new') { actions.showToast('Lưu ngựa đang nhập trước khi đổi số lượng.'); return; }
                const count = Number(event.target.value);
                const result = actions.setHorseCount(r.id, count);
                if (result.ok) setSlot(current => Math.min(current, count - 1));
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count} ngựa</option>)}
            </select>
          </div>
          <span className="cus-wizard__count">{r.horses.filter(Boolean).length}/{r.horseCount} đã chọn</span>
        </div>
      </section>

      {/* Main Horse Configuration Card */}
      <div className="cus-card cus-horse-step__main-card">
        <div className="cus-create__place-heading" style={{ marginBottom: 18 }}>
          <span className="cus-badge cus-badge--cyan">Khai báo ngựa</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 650, color: 'var(--cus-ink)' }}>
              Thông tin từng ngựa & hồ sơ kiểm dịch
            </h3>
            <p className="cus-subtitle" style={{ margin: 0, fontSize: '13px' }}>
              Chọn từng vị trí bên dưới để gán ngựa đã lưu hoặc thêm mới. Hồ sơ giấy tờ và lưu ý chăm sóc được quản lý theo từng con.
            </p>
          </div>
        </div>

        <div className="cus-horse-step__slots-wrap">
          <div className="cus-horse-step__slots-list">
            {r.horses.map((id, i) => {
              const h = horses.find(item => item.id === id);
              const isSelected = i === slot;
              const hasHorse = Boolean(id);
              return (
                <button
                  key={i}
                  type="button"
                  className={`cus-horse-step__slot-btn ${isSelected ? 'active' : ''} ${hasHorse ? 'filled' : ''}`}
                  onClick={() => { setSlot(i); setMode('existing'); }}
                >
                  <span className="cus-horse-step__slot-num">{i + 1}</span>
                  <div className="cus-horse-step__slot-info">
                    <span className="cus-horse-step__slot-title">
                      {hasHorse ? (h?.name || id) : `Vị trí ${i + 1}`}
                    </span>
                    <span className="cus-horse-step__slot-sub">
                      {hasHorse ? (h?.breed || 'Đã chọn') : 'Chưa chọn ngựa'}
                    </span>
                  </div>
                  {hasHorse && <Icon name="check" className="cus-horse-step__slot-icon" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cus-wizard__seg">
          <button type="button" className={mode === 'existing' ? 'on' : ''} onClick={() => setMode('existing')}>
            Chọn ngựa đã lưu ({horses.length})
          </button>
          <button type="button" className={mode === 'new' ? 'on' : ''} onClick={() => setMode('new')}>
            + Thêm ngựa mới
          </button>
        </div>

        {mode === 'existing' ? (
          <>
            <div className="cus-wizard__picker">
              {horses.map((h) => {
                const taken = r.horses.some((id, i) => id === h.id && i !== slot);
                const unavailable = !selectable?.includes(h.id);
                const locked = r.status === 'CHANGES_REQUESTED' && !(r.revisionFields ?? ['horses']).includes('horses');
                return (
                  <label key={h.id} className={`cus-pick ${selectedId === h.id ? 'selected' : ''} ${taken ? 'disabled' : ''}`}>
                    <input type="radio" name="pick-horse" checked={selectedId === h.id} disabled={taken || unavailable || locked} onChange={() => pick(h.id)} />
                    <span className="cus-pick__thumb"><AuthImage src={h.photo?.url} fallback={<Icon name="horse" />} /></span>
                    <span className="cus-pick__text"><b>{h.name}</b><small>{horseLine(h)}{taken ? ' • Đã chọn ở vị trí khác' : ''}</small></span>
                    <TripStatusBadge label={horseRequests(h, requests).length ? 'Đã dùng trong đơn' : 'Chưa dùng'} tone={horseRequests(h, requests).length ? 'info' : 'muted'} />
                  </label>
                );
              })}
              {!horses.length && <p className="cus-subtitle">Bạn chưa có ngựa. Chọn “Thêm ngựa mới” để khai báo.</p>}
            </div>
            {selected && (
              <div className="cus-wizard__profile">
                <div className="cus-wizard__profile-head">
                  <b>{selected.name}</b><span>{selected.microchip || selected.id}</span>
                  <button type="button" className="cus-btn cus-btn--sm" onClick={() => actions.setHorseSlot(r.id, slot, '')}>Bỏ khỏi yêu cầu</button>
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
            {Object.keys(draftErrors).length > 0 && (
              <div className="cus-horse-form-page__alert" role="alert">
                <Icon name="alert" />
                <span>Có <strong>{Object.keys(draftErrors).length}</strong> trường thông tin cần hoàn thiện (được đánh dấu đỏ bên dưới).</span>
              </div>
            )}
            <HorseForm
              value={draft}
              onChange={setDraft}
              errors={draftErrors}
              onClearError={handleClearDraftError}
            />
            <div className="cus-btn-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="cus-btn cus-btn--solid" onClick={saveNew}>Lưu ngựa mới & chọn cho vị trí {slot + 1}</button>
            </div>
          </>
        )}
      </div>

      <div className="cus-wizard__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(`/customer/requests/${r.id}/edit`)}>
          ← Quay lại: Nhận & giao ngựa
        </button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={next}>
          Tiếp tục: Kiểm tra & gửi →
        </button>
      </div>
    </div>
  );
};

export default HorsesStep;
