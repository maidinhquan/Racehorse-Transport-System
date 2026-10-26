import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { DateField } from '../../components/DateField/DateField';
import { WizardStepper, wizardPath } from '../../components/WizardStepper/WizardStepper';
import { RequestPlacesFields, type RequestPlaces } from '../../components/RequestPlaces/RequestPlacesFields';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import type { RequestField, TripInfoInput } from '../../types';
import { FIELD_LABEL, addDays, city, emptyPlace, fmtDate, isSupportedRoute, today } from '../../hooks/customerRules';
import { customerApi } from '../../api/customerApi';
import type { FormOptions } from '../../../../shared/api/contractClient';
import './CreateRequestPage.css';

/** First of three steps: schedule, pickup address/contact, delivery address/contact. */
export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestId } = useParams<{ requestId: string }>();
  const { getRequest, actions } = useCustomer();
  const r = requestId ? getRequest(requestId) : undefined;
  const [form, setForm] = useState<TripInfoInput>(() => ({ origin: r?.origin ?? '', destination: r?.destination ?? '', date: r?.date ?? '', pickupAt: r?.pickupAt ?? '', horseCount: r?.horseCount ?? 1, careNotes: r?.careNotes ?? '' }));
  const [places, setPlaces] = useState<RequestPlaces>(() => ({ pickup: { ...(r?.pickup ?? emptyPlace()) }, delivery: { ...(r?.delivery ?? emptyPlace()) } }));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  // A draft created before a failed details save is reused on retry.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const draftId = useRef<string | undefined>(requestId);
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [optionsError, setOptionsError] = useState('');
  useEffect(() => {
    let active = true; setOptions(null); setOptionsError('');
    if (isSupportedRoute(form.origin, form.destination)) {
      customerApi.getFormOptions(form.origin, form.destination).then(value => { if (active) setOptions(value); })
        .catch(() => { if (active) setOptionsError('Chưa tải được quy định cho tuyến này. Vui lòng thử lại.'); });
    }
    return () => { active = false; };
  }, [form.origin, form.destination]);

  if (requestId && (!r || !['DRAFT', 'CHANGES_REQUESTED'].includes(r.status))) return <CustomerLayout title="Yêu cầu vận chuyển">
    <Note tone="grey" title="Không thể sửa yêu cầu này">Chỉ sửa được bản nháp hoặc yêu cầu đang được Manager yêu cầu chỉnh sửa.</Note>
    <button type="button" className="cus-btn" onClick={() => navigate(`/customer/requests/${requestId}`)}>Quay lại</button>
  </CustomerLayout>;

  const revising = r?.status === 'CHANGES_REQUESTED';
  const allowed: RequestField[] = revising ? r?.revisionFields ?? ['route', 'date', 'places', 'horses', 'notes'] : ['route', 'date', 'places', 'horses', 'notes'];
  const lock = (field: RequestField) => !allowed.includes(field);
  const minDate = addDays(today(), options?.preparationDays ?? 0);
  const routeEnabled = options?.supportedRoutes.some(route => route.originCountry === city(form.origin).country && route.destinationCountry === city(form.destination).country && route.mode === (city(form.destination).country === 'JP' ? 'AIR' : 'ROAD'));
  const tripValid = !!routeEnabled && isSupportedRoute(form.origin, form.destination) && !!form.pickupAt && form.pickupAt >= minDate && !!form.date && form.date >= form.pickupAt;
  const placeValid = Object.values(places).every(p => p.name.trim() && p.address.trim() && p.contact.trim() && /^[+0-9 ()-]{8,}$/.test(p.phone.trim()));
  const hint = !form.origin || !form.destination ? 'Chọn thành phố trong địa chỉ nhận và giao ngựa.'
    : form.origin === form.destination ? 'Thành phố nhận và giao phải khác nhau.'
    : !isSupportedRoute(form.origin, form.destination) ? 'Chỉ nhận vận chuyển trong Việt Nam và từ Việt Nam đến Nhật Bản.'
    : optionsError || (!options ? 'Đang tải quy định của tuyến…'
    : !routeEnabled ? 'Tuyến này hiện chưa nhận yêu cầu vận chuyển.'
    : !form.pickupAt ? 'Chọn ngày mong muốn CBN đến lấy ngựa.'
    : form.pickupAt < minDate ? `Ngày lấy ngựa cần từ ${fmtDate(minDate)} để đủ thời gian chuẩn bị.`
    : !form.date ? 'Chọn ngày mong muốn ngựa tới nơi giao.'
    : form.date < form.pickupAt ? 'Ngày giao mong muốn phải từ ngày lấy ngựa trở đi.'
    : form.date < minDate ? `Tuyến này cần chuẩn bị ${options.preparationDays} ngày, vui lòng chọn từ ${fmtDate(minDate)}.` : '');
  const back = r ? `/customer/requests/${r.id}` : '/customer/requests';
  const save = async () => {
    if (savingRef.current) return;
    setTried(true);
    if (!tripValid || !placeValid) { actions.showToast(!tripValid ? hint : 'Điền đủ địa chỉ, người liên hệ và số điện thoại hợp lệ ở cả hai địa điểm.'); return; }
    savingRef.current = true; setSaving(true);
    try {
      if (!draftId.current) {
        const created = await actions.createDraft({ ...form, horseCount: 1, careNotes: '' }, idempotencyKey);
        if (!created.ok || !created.id) return;
        draftId.current = created.id;
      }
      const result = await actions.saveRequestDetails(draftId.current, form, places.pickup, places.delivery);
      if (!result.ok) return;
      navigate(wizardPath({ id: draftId.current }, revising && r!.wizardStep >= 3 ? 3 : 2));
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <CustomerLayout title="Yêu cầu vận chuyển"><div className="cus-create-flow">
    <button type="button" className="cus-back" onClick={() => navigate(back)}><Icon name="back" />{r ? `Quay lại ${r.id}` : 'Yêu cầu vận chuyển'}</button>
    <h2 className="cus-title">{revising ? `Sửa yêu cầu ${r!.id}` : 'Tạo yêu cầu vận chuyển'}</h2>
    <p className="cus-subtitle">Nhập địa chỉ cùng ngày lấy và ngày giao mong muốn. Thông tin từng ngựa được khai báo ở bước tiếp theo.</p>
    <WizardStepper request={r ?? null} current={0} />
    {revising && r?.feedback && <Note tone="yellow" title="Góp ý của Manager">{r.feedback}<p>Được phép sửa: {allowed.map(field => FIELD_LABEL[field]).join(', ')}</p></Note>}
    <fieldset className="cus-create__fieldset" disabled={saving}>
      <section className="cus-card cus-create__schedule"><div className="cus-create__schedule-heading"><span className="cus-create__calendar"><Icon name="calendar" /></span><div>
        <h3>Lịch vận chuyển mong muốn <span>*</span></h3><p>CBN sẽ xác nhận lịch sau khi xét duyệt yêu cầu.</p>
      </div></div><div className="cus-create__dates">
        <div className="cus-field"><label htmlFor="cr-pickup">Mong muốn CBN đến lấy ngựa *</label><DateField id="cr-pickup" value={form.pickupAt} min={minDate} max={form.date || undefined} disabled={lock('date') || saving} invalid={tried && (!form.pickupAt || form.pickupAt < minDate)} onChange={pickupAt => setForm(f => ({ ...f, pickupAt }))} /></div>
        <div className="cus-field"><label htmlFor="cr-date">Mong muốn ngựa tới nơi giao *</label><DateField id="cr-date" value={form.date} min={form.pickupAt || minDate} disabled={lock('date') || saving} invalid={tried && (!form.date || form.date < form.pickupAt)} onChange={date => setForm(f => ({ ...f, date }))} /></div>
      </div></section>
      <p className="cus-create__required">Các trường có dấu * là bắt buộc.</p>
      <RequestPlacesFields places={places} origin={form.origin} destination={form.destination} tried={tried} locked={lock}
        onPlaceChange={(key, place) => setPlaces(p => ({ ...p, [key]: place }))}
        onCityChange={(key, value) => { setForm(f => ({ ...f, [key === 'pickup' ? 'origin' : 'destination']: value })); setPlaces(p => ({ ...p, [key]: { ...p[key], latitude: undefined, longitude: undefined } })); }} />
      {(tried || optionsError) && hint && <Note tone="red" title="Kiểm tra thông tin nhận/giao">{hint}</Note>}
      <div className="cus-create__actions"><button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(back)}>Hủy</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu & tiếp tục: Ngựa & hồ sơ'}</button>
      </div>
    </fieldset>
  </div></CustomerLayout>;
};
export default CreateRequestPage;
