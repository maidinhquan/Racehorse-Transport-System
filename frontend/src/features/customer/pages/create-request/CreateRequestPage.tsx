import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { DateField } from '../../components/DateField/DateField';
import { WizardStepper, wizardPath } from '../../components/WizardStepper/WizardStepper';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import { customerApi } from '../../api/customerApi';
import type { DemoEstimateResult, RequestField, TripInfoInput } from '../../types';
import {
  BOOKING_DESTINATIONS,
  BOOKING_ORIGINS,
  FIELD_LABEL,
  ROUTE_RULE,
  addDays,
  cityLabel,
  estimate,
  fmtDate,
  fmtMoney,
  isSupportedRoute,
  today,
} from '../../hooks/customerRules';
import './CreateRequestPage.css';

/**
 * Bước 1/4 – Thông tin chuyến: tuyến, ngày vận chuyển mong muốn, số ngựa và ước tính sơ bộ.
 * Dùng cho cả tạo mới (/customer/requests/new) và sửa (/customer/requests/:requestId/edit).
 */
export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { getRequest, actions } = useCustomer();
  const r = requestId ? getRequest(requestId) : undefined;
  const editing = !!requestId;

  // Lấy dữ liệu tạm từ Landing Page nếu tạo mới
  const savedPrelim = !editing ? (() => {
    try {
      const raw = sessionStorage.getItem('preliminaryQuote');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })() : null;

  const [form, setForm] = useState<TripInfoInput>(() => ({
    origin: r?.origin ?? savedPrelim?.origin ?? '',
    destination: r?.destination ?? savedPrelim?.destination ?? '',
    date: r?.date ?? addDays(today(), 3),
    horseCount: r?.horseCount ?? savedPrelim?.horseCount ?? 1,
    careNotes: r?.careNotes ?? '',
  }));
  const set = <K extends keyof TripInfoInput>(k: K, v: TripInfoInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [demoEstimate, setDemoEstimate] = useState<DemoEstimateResult | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Tính số ngày tối thiểu cần chuẩn bị theo loại hình vận chuyển
  const isAir = form.origin?.includes('Tokyo') || form.destination?.includes('Tokyo') || form.destination?.includes('Osaka');
  const minLead = isAir ? 7 : 3;
  const minDate = addDays(today(), minLead);

  // Lấy ước tính giá từ Backend Flow 1 API
  useEffect(() => {
    if (!form.origin || !form.destination || form.origin === form.destination || !isSupportedRoute(form.origin, form.destination)) {
      setDemoEstimate(null);
      return;
    }
    let active = true;
    setLoadingEstimate(true);
    customerApi.getDemoEstimate({ origin: form.origin, destination: form.destination, horseCount: form.horseCount })
      .then((res) => {
        if (active) {
          setDemoEstimate(res);
          setLoadingEstimate(false);
        }
      })
      .catch(() => {
        if (active) setLoadingEstimate(false);
      });
    return () => {
      active = false;
    };
  }, [form.origin, form.destination, form.horseCount]);

  if (editing && (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status))) {
    return (
      <CustomerLayout title="Yêu cầu vận chuyển">
        <Note tone="grey" title="Không thể sửa yêu cầu này">Chỉ sửa được bản nháp hoặc yêu cầu đang được Manager yêu cầu chỉnh sửa.</Note>
        <button type="button" className="cus-btn" style={{ marginTop: 12 }} onClick={() => navigate(requestId ? `/customer/requests/${requestId}` : '/customer/requests')}>Quay lại</button>
      </CustomerLayout>
    );
  }

  const revising = r?.status === 'CHANGES_REQUESTED';
  const allowed: RequestField[] = revising ? r?.revisionFields ?? ['route', 'date', 'count', 'notes'] : ['route', 'date', 'count', 'notes'];
  const lock = (f: RequestField) => !allowed.includes(f);
  const valid = isSupportedRoute(form.origin, form.destination) && !!form.date && form.date >= minDate && form.horseCount > 0;

  const hint = !form.origin || !form.destination ? 'Chọn điểm đi, điểm đến, ngày và số ngựa để xem ước tính.'
    : form.origin === form.destination ? 'Điểm đi và điểm đến phải khác nhau.'
    : !isSupportedRoute(form.origin, form.destination) ? `Tuyến này không nhận đơn mới. ${ROUTE_RULE}`
    : !form.date ? 'Chọn ngày vận chuyển mong muốn.'
    : form.date < minDate ? `Tuyến ${isAir ? 'hàng không (Nhật Bản)' : 'đường bộ'} cần đặt trước tối thiểu ${minLead} ngày (từ ${fmtDate(minDate)}).`
    : 'Ngày vận chuyển không được ở quá khứ.';

  const cityOptions = (selected: string, list: typeof BOOKING_ORIGINS) => (
    <>
      <option value="">Chọn thành phố</option>
      {list.map((c) => <option key={c.name} value={c.name}>{cityLabel(c.name)}</option>)}
      {selected && !list.some((c) => c.name === selected) && <option value={selected} disabled>{cityLabel(selected)} – không còn nhận</option>}
    </>
  );

  const save = () => {
    if (!editing) {
      const res = actions.createDraft(form);
      if (res.ok && res.id) navigate(`/customer/requests/${res.id}/wizard/1`);
      return;
    }
    const res = actions.updateTripInfo(r!.id, form);
    if (!res.ok) return;
    navigate(revising && r!.wizardStep >= 3 ? `/customer/requests/${r!.id}/wizard/3` : wizardPath(r!, Math.max(1, Math.min(r!.wizardStep, 3))));
  };

  return (
    <CustomerLayout title="Yêu cầu vận chuyển">
      <button type="button" className="cus-back" onClick={() => navigate(r ? `/customer/requests/${r.id}` : '/customer/requests')}>
        <Icon name="back" />{r ? `Quay lại ${r.id}` : 'Yêu cầu vận chuyển'}
      </button>
      <h2 className="cus-title">{revising ? `Sửa yêu cầu ${r!.id}` : r ? `Tiếp tục yêu cầu ${r.id}` : 'Tạo yêu cầu vận chuyển'}</h2>
      <p className="cus-subtitle">Bước 1/4: Thông tin chuyến. Tiếp theo là điểm nhận/giao, ngựa & hồ sơ, rồi xem lại và gửi Manager xét duyệt.</p>
      <WizardStepper request={r ?? null} current={0} />

      {revising && r?.feedback && (
        <Note tone="yellow" title="Góp ý của Manager">
          {r.feedback}
          <div className="cus-muted" style={{ marginTop: 4 }}>Được phép sửa: {allowed.map((f) => FIELD_LABEL[f]).join(', ')}</div>
        </Note>
      )}

      <div className="cus-card cus-create">
        <h3 className="cus-card__title">Thông tin chuyến</h3>
        <div className="cus-create__grid">
          <div className="cus-field">
            <label htmlFor="cr-origin">Điểm đi *</label>
            <select id="cr-origin" className="cus-select" value={form.origin} disabled={lock('route')} onChange={(e) => set('origin', e.target.value)}>
              {cityOptions(form.origin, BOOKING_ORIGINS)}
            </select>
          </div>
          <div className="cus-field">
            <label htmlFor="cr-dest">Điểm đến *</label>
            <select id="cr-dest" className="cus-select" value={form.destination} disabled={lock('route')} onChange={(e) => set('destination', e.target.value)}>
              {cityOptions(form.destination, BOOKING_DESTINATIONS)}
            </select>
          </div>
          <div className="cus-field">
            <label htmlFor="cr-date">Ngày vận chuyển mong muốn *</label>
            <DateField id="cr-date" value={form.date || minDate} min={minDate} disabled={lock('date')} onChange={(v) => set('date', v)} />
          </div>
          <div className="cus-field">
            <label htmlFor="cr-count">Số lượng ngựa *</label>
            <select id="cr-count" className="cus-select" value={form.horseCount} disabled={lock('count')} onChange={(e) => set('horseCount', Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} ngựa</option>)}
            </select>
          </div>
        </div>
        <div className="cus-field">
          <label htmlFor="cr-notes">Yêu cầu chăm sóc đặc biệt (không bắt buộc)</label>
          <textarea id="cr-notes" className="cus-textarea" rows={3} value={form.careNotes} disabled={lock('notes')}
            placeholder="Lịch ăn uống, điểm dừng nghỉ, đồ dùng quen thuộc…" onChange={(e) => set('careNotes', e.target.value)} />
        </div>

        {valid ? (
          <div className="cus-quote">
            <div className="cus-quote__tag"><span>Ước tính sơ bộ</span> Không ràng buộc, chưa phải giá chính thức</div>
            <div className="cus-kv">
              <div><span>Tuyến</span><b>{cityLabel(form.origin)} → {cityLabel(form.destination)}</b></div>
              <div><span>Ngày vận chuyển</span><b>{fmtDate(form.date)}</b></div>
              <div><span>Số ngựa</span><b>{form.horseCount}</b></div>
              <div>
                <span>Chi phí ước tính</span>
                <b className="cus-quote__amount">
                  {loadingEstimate
                    ? 'Đang tính toán...'
                    : demoEstimate
                    ? `${demoEstimate.estimatedPrice.toLocaleString('vi-VN')} đ`
                    : `${fmtMoney(estimate(form.origin, form.destination, form.horseCount))} USD`}
                </b>
              </div>
              {demoEstimate && (
                <>
                  <div><span>Cọc dự kiến (40%)</span><b>{demoEstimate.estimatedDeposit.toLocaleString('vi-VN')} đ</b></div>
                  {demoEstimate.averageRoadKm > 0 && <div><span>Quãng đường ước tính</span><b>{demoEstimate.averageRoadKm} km</b></div>}
                  {demoEstimate.days > 0 && <div><span>Thời gian dự kiến</span><b>{demoEstimate.days} ngày ({demoEstimate.stableNights} đêm nghỉ)</b></div>}
                </>
              )}
            </div>
            <Note tone="yellow" title="Giá chính thức">Giá cuối cùng do CBN Transport xác nhận trong hợp đồng sau khi xét duyệt yêu cầu.</Note>
          </div>
        ) : (
          <Note tone="grey" title="Ước tính sơ bộ">{hint}</Note>
        )}

        <div className="cus-create__actions">
          <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(r ? `/customer/requests/${r.id}` : '/customer/requests')}>Hủy</button>
          <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" disabled={!valid} onClick={save}>
            {revising && r!.wizardStep >= 3 ? 'Lưu & xem lại' : 'Lưu & tiếp tục'}
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CreateRequestPage;
