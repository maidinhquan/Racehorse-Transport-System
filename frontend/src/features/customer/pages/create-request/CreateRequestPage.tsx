import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { DateField } from '../../components/DateField/DateField';
import { WizardStepper, wizardPath } from '../../components/WizardStepper/WizardStepper';
import { RequestPlacesFields, type RequestPlaces } from '../../components/RequestPlaces/RequestPlacesFields';
import { Note } from '../../components/Common/Common';
import { useCustomer } from '../../hooks/useCustomer';
import type { RequestField, TripInfoInput } from '../../types';
import { FIELD_LABEL, addDays, city, displayRequestId, emptyPlace, fmtDate, isSupportedRoute, today } from '../../hooks/customerRules';
import { customerApi } from '../../api/customerApi';
import type { FormOptions } from '../../../../shared/api/contractClient';
import './CreateRequestPage.css';
import { apiMessage } from '../../../../shared/api/apiError';

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
        .catch(error => { if (active) setOptionsError(`Chưa tải được quy định cho tuyến này: ${apiMessage(error)}`); });
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
  const deadlineDays = Math.max(2, Math.ceil((options?.contractDeadlineHours ?? 24) / 24) + 1);
  const prepDays = options?.preparationDays ?? (city(form.destination).country === 'JP' ? 7 : 3);
  const minLeadDays = options?.minimumPickupLeadDays ?? (prepDays + deadlineDays);
  const minDate = options?.earliestPickupDate ?? addDays(today(), minLeadDays);
  const minTransitDays = options?.minTransitDays ?? (city(form.destination).country === 'JP' ? 2 : 0);
  const pickupDate = form.pickupAt || form.date;
  const minDeliveryDate = addDays(pickupDate || minDate, minTransitDays);
  const routeEnabled = options?.supportedRoutes?.some(route => route.originCountry === city(form.origin).country && route.destinationCountry === city(form.destination).country && route.mode === (city(form.destination).country === 'JP' ? 'AIR' : 'ROAD')) ?? false;
  const tripValid = !!routeEnabled && isSupportedRoute(form.origin, form.destination) && !!pickupDate
    && pickupDate >= minDate && !!form.date && form.date >= pickupDate && form.date >= minDeliveryDate;
  const placeValid = Object.values(places).every(p => p.name.trim() && p.address.trim() && p.contact.trim() && /^[+0-9 ()-]{8,}$/.test(p.phone.trim()) && p.cityId && p.latitude != null && p.longitude != null);
  const hint = !form.origin || !form.destination ? 'Chọn thành phố trong địa chỉ nhận và giao ngựa.'
    : form.origin === form.destination ? 'Thành phố nhận và giao phải khác nhau.'
    : !isSupportedRoute(form.origin, form.destination) ? 'Chỉ nhận vận chuyển trong Việt Nam và từ Việt Nam đến Nhật Bản.'
    : optionsError || (!options ? 'Đang tải quy định của tuyến…'
    : !routeEnabled ? 'Tuyến này hiện chưa nhận yêu cầu vận chuyển.'
    : !pickupDate ? 'Chọn ngày nhận ngựa.'
    : pickupDate < minDate ? `Ngày nhận ngựa sớm nhất là ${fmtDate(minDate)} (còn ${minLeadDays} ngày để xét duyệt, hoàn tất hợp đồng và chuẩn bị).`
    : !form.date ? 'Chọn ngày giao ngựa.'
    : form.date < pickupDate ? 'Ngày giao ngựa phải từ ngày nhận trở đi.'
    : form.date < minDeliveryDate ? `Tuyến này cần ít nhất ${minTransitDays} ngày vận chuyển, ngày giao sớm nhất là ${fmtDate(minDeliveryDate)}.` : '');
  const loadingOptions = !options && !optionsError && isSupportedRoute(form.origin, form.destination);
  const back = r ? `/customer/requests/${r.id}` : '/customer/requests';
  const save = async () => {
    if (savingRef.current) return;
    setTried(true);
    if (!tripValid || !placeValid) { actions.showToast(!tripValid ? hint : 'Điền đủ thông tin, chọn tỉnh/thành phố và xác định vị trí nhận/giao trên bản đồ.'); return; }

    const pickupCoords = places.pickup.latitude != null && places.pickup.longitude != null
      ? { latitude: places.pickup.latitude, longitude: places.pickup.longitude }
      : {};
    const deliveryCoords = places.delivery.latitude != null && places.delivery.longitude != null
      ? { latitude: places.delivery.latitude, longitude: places.delivery.longitude }
      : {};

    const readyPickup = {
      ...places.pickup,
      ...pickupCoords,
      cityId: places.pickup.cityId,
      cityName: form.origin,
    };
    const readyDelivery = {
      ...places.delivery,
      ...deliveryCoords,
      cityId: places.delivery.cityId,
      cityName: form.destination,
    };
    setPlaces({ pickup: readyPickup, delivery: readyDelivery });

    savingRef.current = true; setSaving(true);
    try {
      if (!draftId.current) {
        const created = await actions.createDraft({ ...form, pickupAt: form.pickupAt || form.date, horseCount: 1, careNotes: '' }, idempotencyKey);
        if (!created.ok || !created.id) return;
        draftId.current = created.id;
      }
      const result = await actions.saveRequestDetails(draftId.current, form, readyPickup, readyDelivery);
      if (!result.ok) return;
      navigate(wizardPath({ id: draftId.current }, revising && r!.wizardStep >= 3 ? 3 : 2));
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <CustomerLayout title="Yêu cầu vận chuyển"><div className="cus-create-flow">
    <button type="button" className="cus-back" onClick={() => navigate(back)}><Icon name="back" />{r ? `Quay lại ${displayRequestId(r.id)}` : 'Yêu cầu vận chuyển'}</button>
    <h2 className="cus-title">{revising ? `Sửa yêu cầu ${displayRequestId(r!.id)}` : 'Tạo yêu cầu vận chuyển'}</h2>
    <p className="cus-subtitle">Nhập nơi nhận, nơi giao và ngày vận chuyển. Thông tin từng ngựa được khai báo ở bước tiếp theo.</p>
    <WizardStepper request={r ?? null} current={0} />
    {revising && r?.feedback && <Note tone="yellow" title="Góp ý của Manager">{r.feedback}<p>Được phép sửa: {allowed.map(field => FIELD_LABEL[field]).join(', ')}</p></Note>}
    <fieldset className="cus-create__fieldset" disabled={saving}>
      <section className="cus-card cus-create__schedule">
        <div className="cus-create__schedule-left">
          <span className="cus-create__calendar"><Icon name="calendar" /></span>
          <div className="cus-create__schedule-title-group">
            <h3>Lịch vận chuyển mong muốn <span>*</span></h3>
            <p>CBN sẽ xác nhận lịch sau khi xét duyệt yêu cầu.</p>
          </div>
        </div>
        <div className="cus-create__schedule-dates">
          <div className="cus-field cus-create__date-col">
            <label htmlFor="cr-pickup">Mong muốn CBN đến lấy ngựa <span>*</span></label>
            <DateField
              id="cr-pickup"
              value={form.pickupAt || form.date}
              min={minDate}
              disabled={lock('date') || saving}
              invalid={tried && (!form.pickupAt && !form.date)}
              onChange={pickupAt => setForm(f => ({ ...f, pickupAt, date: f.date && f.date >= addDays(pickupAt, minTransitDays) ? f.date : addDays(pickupAt, minTransitDays) }))}
            />
          </div>
          <div className="cus-field cus-create__date-col">
            <label htmlFor="cr-date">Mong muốn ngựa tới nơi giao <span>*</span></label>
            <DateField
              id="cr-date"
              ariaLabel="Ngày vận chuyển mong muốn"
              value={form.date}
              min={minDeliveryDate}
              disabled={lock('date') || saving}
              invalid={tried && (!form.date || form.date < minDate || form.date < minDeliveryDate)}
              onChange={date => setForm(f => ({ ...f, date, pickupAt: f.pickupAt || date }))}
            />
          </div>
        </div>
        {minTransitDays > 0 && <p className="cus-muted">Tuyến này cần ít nhất {minTransitDays} ngày vận chuyển: ngày giao phải sau ngày lấy tối thiểu {minTransitDays} ngày.</p>}
      </section>
      <p className="cus-create__required">Các trường có dấu * là bắt buộc.</p>
      <RequestPlacesFields places={places} origin={form.origin} destination={form.destination} tried={tried} locked={lock}
        onPlaceChange={(key, place) => setPlaces(p => ({ ...p, [key]: place }))}
        onCityChange={(key, value) => { setForm(f => ({ ...f, [key === 'pickup' ? 'origin' : 'destination']: value })); setPlaces(p => ({ ...p, [key]: { ...p[key], cityId: '', latitude: undefined, longitude: undefined } })); }} />
      {loadingOptions && <p className="cus-subtitle" role="status">Đang tải quy định của tuyến…</p>}
      {(tried || optionsError) && !loadingOptions && hint && <Note tone="red" title="Kiểm tra thông tin nhận/giao">{hint}</Note>}
      <div className="cus-create__actions">
        <button type="button" className="cus-btn cus-btn--lg" onClick={() => navigate(back)}>Hủy</button>
        <button type="button" className="cus-btn cus-btn--solid cus-btn--lg" onClick={save} disabled={saving || loadingOptions}
          title={loadingOptions ? 'Đang tải quy định của tuyến' : saving ? 'Đang lưu thông tin' : undefined}>
          {saving ? 'Đang lưu…' : loadingOptions ? 'Đang tải quy định…' : 'Lưu & tiếp tục: Ngựa & hồ sơ →'}
        </button>
      </div>
    </fieldset>
  </div></CustomerLayout>;
};
export default CreateRequestPage;
