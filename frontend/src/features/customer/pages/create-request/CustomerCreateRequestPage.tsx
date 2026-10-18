import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../../../shared/layouts/CustomerLayout/CustomerLayout';
import { customerMockStore } from '../../services/customerMockStore';
import type { BaselineDocument, HorseProfile, ProfileFile, TransportPlace } from '../../types/customerTypes';
import { HorseProfileForm } from './HorseProfileForm';
import { ProfileFileField } from './ProfileFileField';
import { ReferenceField } from './ReferenceField';
import { ReferenceIcon } from './ReferenceIcon';
import './CustomerHtmlReference.css';
import './CustomerCreateRequestPage.css';

const VN_CITIES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];
const DESTINATIONS = [...VN_CITIES, 'Tokyo'];
const STEPS = ['Chuyến đi', 'Nhận & giao', 'Ngựa & hồ sơ', 'Xem lại & gửi'];
const emptyPlace = (): TransportPlace => ({ name: '', contact: '', address: '', postal: '', phone: '', notes: '' });
const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const cityAlias = (city: string) => ({ 'Ho Chi Minh City': 'Hồ Chí Minh', Hanoi: 'Hà Nội', 'Da Nang': 'Đà Nẵng' })[city] || city;
const HORSE_FILES = [
  ['passport', 'Hộ chiếu ngựa'], ['ownership', 'Chứng nhận sở hữu ngựa'], ['valueProof', 'Bằng chứng định giá (tùy chọn)'],
  ['flu', 'Sổ tiêm ngừa'], ['health', 'Giấy chứng nhận sức khỏe'],
] as const;

const getInitialForm = (editId: string | null) => {
  if (editId) {
    const r = customerMockStore.getRequestById(editId);
    if (!r || !['Draft', 'Changes Requested'].includes(r.status)) {
      return {
        error: 'Yêu cầu này không còn được phép chỉnh sửa.',
        draftId: editId,
        origin: '',
        destination: '',
        date: '',
        count: 1,
        slots: [''],
        pickup: emptyPlace(),
        delivery: emptyPlace(),
        documents: [] as BaselineDocument[],
        horseNotes: {} as Record<string, string>,
      };
    }
    return {
      error: '',
      draftId: r.id,
      origin: cityAlias(r.originCity),
      destination: cityAlias(r.destinationCity),
      date: r.expectedDate,
      count: r.requestedHorseCount || Math.max(1, r.horseIds.length),
      slots: r.horseSlots || (r.horseIds.length ? r.horseIds : ['']),
      pickup: r.pickup || { ...emptyPlace(), address: r.pickupAddress },
      delivery: r.delivery || { ...emptyPlace(), address: r.deliveryAddress, contact: r.receiverName, phone: r.receiverPhone },
      documents: r.documents,
      horseNotes: r.horseNotes || {},
    };
  }

  let origin = '';
  let destination = '';
  let date = '';
  let count = 1;
  let slots = [''];

  try {
    const quote = JSON.parse(sessionStorage.getItem('preliminaryQuote') || 'null');
    if (quote) {
      if (VN_CITIES.includes(cityAlias(quote.origin))) origin = cityAlias(quote.origin);
      if (DESTINATIONS.includes(cityAlias(quote.destination))) destination = cityAlias(quote.destination);
      if (quote.date) date = quote.date;
      const n = Number(quote.count || quote.horseCount || 1);
      if (Number.isInteger(n) && n >= 1 && n <= 6) {
        count = n;
        slots = Array(n).fill('');
      }
    }
  } catch {
    // Invalid saved quotes do not prevent creating a request
  }

  return {
    error: '',
    draftId: undefined as string | undefined,
    origin,
    destination,
    date,
    count,
    slots,
    pickup: emptyPlace(),
    delivery: emptyPlace(),
    documents: [] as BaselineDocument[],
    horseNotes: {} as Record<string, string>,
  };
};

export const CustomerCreateRequestPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const [initialData] = useState(() => getInitialForm(editId));

  const [draftId, setDraftId] = useState<string | undefined>(initialData.draftId);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [error, setError] = useState(initialData.error);
  const [origin, setOrigin] = useState(initialData.origin);
  const [destination, setDestination] = useState(initialData.destination);
  const [date, setDate] = useState(initialData.date);
  const [count, setCount] = useState(initialData.count);
  const [pickup, setPickup] = useState<TransportPlace>(initialData.pickup);
  const [delivery, setDelivery] = useState<TransportPlace>(initialData.delivery);
  const [horses, setHorses] = useState<HorseProfile[]>(() => customerMockStore.getHorses());
  const [slots, setSlots] = useState<string[]>(initialData.slots);
  const [slot, setSlot] = useState(0);
  const [horseNotes, setHorseNotes] = useState<Record<string, string>>(initialData.horseNotes);
  const [horseForm, setHorseForm] = useState<'new' | 'edit' | null>(null);
  const [documents, setDocuments] = useState<BaselineDocument[]>(initialData.documents);
  const [saving, setSaving] = useState(false);
  const international = destination === 'Tokyo';
  const estimate = (international ? 1850 : 650) * count;
  const selected = horses.find(h => h.id === slots[slot]);

  const fileFor = (docKey: string, horseId?: string): ProfileFile | undefined => {
    const doc = documents.find(d => d.docKey === docKey && d.horseId === horseId);
    if (doc) return doc.fileUrl ? { name: doc.fileName || doc.name, url: doc.fileUrl, uploadedAt: doc.uploadedAt || '' } : undefined;
    return horses.find(h => h.id === horseId)?.dossier?.files?.[docKey as typeof HORSE_FILES[number][0]];
  };
  const putFile = (docKey: string, name: string, file?: ProfileFile, horseId?: string) => {
    setDocuments(prev => [...prev.filter(d => !(d.docKey === docKey && d.horseId === horseId)), {
      docKey, name, horseId, scope: horseId ? 'horse' : 'request', status: file ? 'Submitted' : 'Draft',
      fileName: file?.name, fileUrl: file?.url, uploadedAt: file?.uploadedAt,
    }]);
  };
  const sharedKeys = international ? [['invite', 'Thư mời thi đấu'], ['raceReg', 'Giấy đăng ký giải đua'], ['ataCarnet', 'ATA Carnet (nếu áp dụng)']] : [['invite', 'Thư mời thi đấu'], ['raceReg', 'Giấy đăng ký giải đua']];
  const requestDocuments = () => {
    const result = documents.filter(d => d.horseId ? slots.includes(d.horseId) : sharedKeys.some(([key]) => key === d.docKey));
    slots.filter(Boolean).forEach(id => HORSE_FILES.forEach(([key, name]) => {
      if (!result.some(d => d.docKey === key && d.horseId === id)) {
        const f = fileFor(key, id);
        result.push({ docKey: key, name, scope: 'horse', horseId: id, status: f ? 'Submitted' : 'Draft', fileName: f?.name, fileUrl: f?.url, uploadedAt: f?.uploadedAt });
      }
    }));
    return result;
  };
  const validate = (s: number) => {
    if (s === 0) {
      if (!VN_CITIES.includes(origin) || !DESTINATIONS.includes(destination) || origin === destination) return 'Vui lòng chọn tuyến vận chuyển khả dụng, điểm đi và điểm đến khác nhau.';
      if (!date || date < todayLocal()) return 'Ngày vận chuyển mong muốn phải từ hôm nay trở đi.';
    }
    if (s === 1) {
      if ([pickup, delivery].some(p => !p.name.trim() || !p.contact.trim() || !p.address.trim() || !p.phone.trim())) return 'Vui lòng điền tên địa điểm, người liên hệ, địa chỉ và số điện thoại tại cả hai điểm nhận và giao.';
    }
    if (s === 2) {
      if (horseForm) return 'Vui lòng lưu hồ sơ ngựa đang nhập trước khi tiếp tục.';
      if (slots.length !== count || slots.some(id => !id)) return `Vui lòng chọn đủ ${count} ngựa.`;
      if (new Set(slots).size !== slots.length) return 'Không thể chọn cùng một ngựa hai lần.';
      for (const id of slots) {
        const h = horses.find(item => item.id === id);
        if (!h || h.status === 'InTransit') return 'Ngựa đã chọn không khả dụng.';
        if (!h.name.trim() || !h.microchipIso.trim() || !h.feiPassportNo.trim()) return `${h.name}: cần tên, số Microchip và số hộ chiếu.`;
        if (!fileFor('passport', id) || !fileFor('ownership', id)) return `${h.name}: cần bản scan hộ chiếu và chứng nhận sở hữu trước khi gửi yêu cầu.`;
        if (h.dossier?.passportExpiryDate && h.dossier.passportExpiryDate < todayLocal()) return `${h.name}: hộ chiếu đã hết hạn, vui lòng cập nhật hồ sơ.`;
      }
    }
    return '';
  };
  const saveRequest = (status: 'Draft' | 'Pending') => customerMockStore.createRequest({
    originCity: origin, originCountry: 'Việt Nam', destinationCity: destination, destinationCountry: international ? 'Nhật Bản' : 'Việt Nam',
    transportType: international ? 'Hàng không' : 'Đường bộ', expectedDate: date, committedDeadline: editId ? customerMockStore.getRequestById(editId)?.committedDeadline || '' : '',
    pickupAddress: pickup.address, deliveryAddress: delivery.address, pickup, delivery,
    receiverName: delivery.contact, receiverPhone: delivery.phone, receiverEmail: editId ? customerMockStore.getRequestById(editId)?.receiverEmail || '' : '', requestedHorseCount: count, horseSlots: slots,
    horseIds: slots.filter(Boolean), horseNotes, specialCareNotes: slots.filter(id => horseNotes[id]).map(id => `${horses.find(h => h.id === id)?.name}: ${horseNotes[id]}`).join('\n'),
    commercialValueUsd: slots.reduce((sum, id) => {
      const d = horses.find(h => h.id === id)?.dossier;
      return sum + (d?.currency === 'USD' ? d.value || 0 : 0);
    }, 0), documents: requestDocuments(), status,
  }, draftId);
  const next = () => {
    const issue = validate(step);
    if (issue) { setError(issue); return; }
    try {
      if (!editId || customerMockStore.getRequestById(editId)?.status === 'Draft') setDraftId(saveRequest('Draft').id);
      setStep(step + 1); setMaxStep(Math.max(maxStep, step + 1)); setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được bản nháp.'); }
  };
  const submit = () => {
    if (saving) return;
    for (let s = 0; s < 3; s++) {
      const issue = validate(s);
      if (issue) { setStep(s); setError(issue); return; }
    }
    setSaving(true);
    try {
      const r = saveRequest('Pending');
      sessionStorage.removeItem('preliminaryQuote'); navigate(`/customer/requests/${r.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu.'); setSaving(false); }
  };
  const changeStep = (s: number) => { setStep(s); setError(''); setHorseForm(null); };
  const placeBlock = (title: string, place: TransportPlace, update: (p: TransportPlace) => void, prefix: string) => <div className="card form-card">
    <h3 className="card-title">{title}</h3><div className="form-grid">
      {([['name', 'Tên trại / chuồng *'], ['contact', 'Người liên hệ *'], ['address', 'Địa chỉ *'], ['postal', 'Mã bưu chính'], ['phone', 'Số điện thoại *'], ['notes', 'Hướng dẫn bổ sung']] as const).map(([key, label]) => <ReferenceField key={key} label={label} full={['address', 'notes'].includes(key)}>
        {key === 'notes' ? <textarea aria-label={`${prefix} — ${label}`} value={place[key]} onChange={e => update({ ...place, [key]: e.target.value })} /> : <input aria-label={`${prefix} — ${label}`} type={key === 'phone' ? 'tel' : 'text'} value={place[key]} onChange={e => update({ ...place, [key]: e.target.value })} />}
      </ReferenceField>)}
    </div></div>;
  const canEditHorse = selected && !customerMockStore.getRequests().some(r => r.id !== draftId && r.horseIds.includes(selected.id) && !['Draft', 'Changes Requested', 'Rejected', 'Cancelled', 'Closed'].includes(r.status));
  const readRow = (name: string, note: string, editable = false) => <div className="doc-row"><div className="top"><b>{name}</b><span className="pill draft">Thông tin hồ sơ</span>{editable && canEditHorse && <button className="btn ghost sm" onClick={() => setHorseForm('edit')}>Sửa thông tin</button>}</div><div className="meta">{note}</div></div>;
  const documentReview = (horseId?: string) => (horseId ? HORSE_FILES : sharedKeys).map(([key, name]) => <div className="doc-row" key={key}><div className="top"><b>{name}</b><span className="pill draft">{fileFor(key, horseId) ? 'Đã gửi · Chờ duyệt' : 'Chưa tải lên'}</span>{fileFor(key, horseId) && <a className="btn ghost sm" href={fileFor(key, horseId)!.url} target="_blank" rel="noreferrer">Xem tệp</a>}</div><div className="meta">{fileFor(key, horseId)?.name || 'Chưa nộp tệp'}</div></div>);
  const footer = <div className="form-actions"><button className="btn ghost lg" onClick={() => step ? changeStep(step - 1) : navigate('/customer/requests')}>{step ? 'Quay lại' : 'Hủy'}</button>
    {step < 3 ? <button className="btn solid lg" disabled={step === 0 && !!validate(0)} onClick={next}>Lưu & tiếp tục</button> : <button className="btn solid lg" disabled={saving} onClick={submit}>{saving ? 'Đang gửi…' : 'Gửi yêu cầu để xét duyệt'}</button>}
  </div>;
  return <CustomerLayout pageTitle="Yêu cầu vận chuyển"><div className="customer-html-reference"><div className={`view${step === 0 ? ' narrow' : ''}`}>
    <button className="link back" onClick={() => navigate('/customer/requests')}>← Quay lại danh sách yêu cầu</button>
    <h2 className="page-title">{editId ? `Sửa yêu cầu vận chuyển ${editId}` : 'Tạo Yêu Cầu Vận Chuyển Mới'}</h2>
    <p className="subtitle">{step === 0 ? 'Bước 1/4: Thông tin chuyến đi. Tiếp theo là điểm nhận/giao, ngựa & hồ sơ, và xác nhận gửi Manager xét duyệt.' : `${draftId || ''} • ${origin}, VN → ${destination}, ${international ? 'JP' : 'VN'} • ${count} ngựa`}</p>
    <div className="stepper wiz" aria-label="Các bước tạo yêu cầu">{STEPS.map((name, i) => <button key={name} type="button" disabled={i > maxStep || !!horseForm} aria-current={step === i ? 'step' : undefined} className={`step ${i < step ? 'done' : i === step ? 'current' : ''} ${i <= maxStep ? 'reachable' : ''}`} onClick={() => changeStep(i)}><div className="num">{i < step ? <ReferenceIcon name="check" /> : i + 1}</div>{name}</button>)}</div>
    {error && <div className="note red" role="alert">{error}</div>}
    {step === 0 && <div className="card form-card"><h3 className="card-title">Thông tin chuyến đi</h3><div className="form-grid">
      <ReferenceField label="Điểm đi"><select value={origin} onChange={e => setOrigin(e.target.value)}><option value="">Chọn thành phố</option>{VN_CITIES.map(c => <option key={c} value={c}>{c}, Việt Nam (VN)</option>)}</select></ReferenceField>
      <ReferenceField label="Điểm đến"><select value={destination} onChange={e => setDestination(e.target.value)}><option value="">Chọn thành phố</option>{DESTINATIONS.map(c => <option key={c} value={c}>{c}, {c === 'Tokyo' ? 'Nhật Bản (JP)' : 'Việt Nam (VN)'}</option>)}</select></ReferenceField>
      <ReferenceField label="Ngày vận chuyển mong muốn"><input type="date" min={todayLocal()} value={date} onChange={e => setDate(e.target.value)} /></ReferenceField>
      <ReferenceField label="Số lượng ngựa"><select value={count} onChange={e => { const n = Number(e.target.value); setCount(n); setSlots(prev => Array.from({ length: n }, (_, i) => prev[i] || '')); setSlot(0); }}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} ngựa</option>)}</select></ReferenceField>
    </div>
    {validate(0) ? <div className="note grey" style={{ marginTop: 20 }}><ReferenceIcon name="info" /><div><b>Dự toán sơ bộ</b>{origin && origin === destination ? 'Điểm đi và điểm đến phải khác nhau.' : date && date < todayLocal() ? 'Ngày vận chuyển mong muốn không được trong quá khứ.' : 'Nhập điểm đi, điểm đến, ngày và số lượng ngựa để xem dự toán.'}</div></div> : <>
      <div className="quote-box"><div className="eyebrow" style={{ marginBottom: 16 }}><span className="est-tag">Dự toán sơ bộ</span> Chỉ tham khảo, chưa phải giá chính thức</div><div className="kv-grid"><div><div className="label">Tuyến</div><div className="value">{origin}, VN <span className="arrow">→</span> {destination}, {international ? 'JP' : 'VN'}</div></div><div><div className="label">Ngày vận chuyển mong muốn</div><div className="value">{date}</div></div><div><div className="label">Số lượng ngựa</div><div className="value">{count}</div></div></div><div className="cost"><div className="eyebrow">Chi phí vận chuyển ước tính</div><p style={{ marginTop: 8 }}><strong>{estimate.toLocaleString()}</strong><small>USD</small></p></div></div>
      <div className="note yellow" style={{ marginTop: 12 }}><ReferenceIcon name="info" /><div>Đây là báo giá ước tính ban đầu. Giá hợp đồng cuối cùng sẽ được CBN Transport xác nhận sau khi xem xét yêu cầu của bạn.</div></div>
    </>}{footer}</div>}
    {step === 1 && <>{placeBlock(`Thông tin nhận ngựa — ${origin}`, pickup, setPickup, 'Điểm nhận')}{placeBlock(`Thông tin giao ngựa — ${destination}`, delivery, setDelivery, 'Điểm giao')}{footer}</>}
    {step === 2 && <div className="card form-card cbn-request-horse-docs" style={{ marginTop: 0 }}>
      <div className="cbn-doc-section-head"><div><span className="eyebrow">01 · Hồ sơ dùng chung</span><h3 className="card-title">Giấy tờ chung của đơn vận chuyển</h3><p className="subtitle">Chỉ khai báo một lần cho toàn bộ Request; ATA Carnet hiển thị với tuyến Việt Nam → Nhật Bản khi áp dụng.</p></div></div>
      {sharedKeys.map(([key, name]) => <ProfileFileField documentRow key={key} label={name} value={fileFor(key)} onChange={f => putFile(key, name, f)} />)}
      <div className="cbn-doc-section-head cbn-doc-horse-divider"><div><span className="eyebrow">02 · Theo từng ngựa</span><h3 className="card-title">Danh sách ngựa & hồ sơ</h3><p className="subtitle">Chọn ngựa từ “Ngựa của tôi” hoặc thêm ngựa mới. Mỗi hồ sơ được nhập và kiểm tra tại đây, không có bước giấy tờ lặp lại.</p></div><span className="cbn-horse-count">{slots.filter(Boolean).length}/{count} ngựa</span></div>
      <div className="hchips" aria-label="Danh sách ngựa trong yêu cầu">{slots.map((id, i) => <button key={i} disabled={!!horseForm} className={`hchip ${id ? 'done' : ''} ${slot === i ? 'active' : ''}`} onClick={() => setSlot(i)}>{id && <ReferenceIcon name="check" />}{horses.find(h => h.id === id)?.name || `Ngựa ${i + 1}`}</button>)}</div>
      {selected && <div className="btn-row" style={{ margin: '10px 0' }}><button className="btn ghost sm" onClick={() => { setSlots(prev => prev.map((id, i) => i === slot ? '' : id)); setHorseForm(null); }}>Bỏ {selected.name} khỏi Request</button></div>}
      <div className="seg"><button className={!horseForm ? 'active' : ''} onClick={() => setHorseForm(null)}>Chọn ngựa đã lưu</button><button className={horseForm === 'new' ? 'active' : ''} onClick={() => setHorseForm('new')}>Thêm ngựa mới</button></div>
      <div className="cbn-horse-slot">{horseForm ? <div className="cbn-horse-new-form"><HorseProfileForm key={`${slot}-${horseForm}`} initial={horseForm === 'edit' ? selected : undefined} existingHorses={horses} onCancel={() => setHorseForm(null)} onSave={data => {
        const saved = horseForm === 'edit' && selected ? customerMockStore.updateHorse(selected.id, data) : customerMockStore.addHorse(data);
        if (!saved) throw new Error('Không lưu được hồ sơ.');
        setDocuments(prev => prev.filter(d => !(d.horseId === saved.id && !d.fileUrl)));
        setHorses(customerMockStore.getHorses()); setSlots(prev => prev.map((id, i) => i === slot ? saved.id : id)); setHorseForm(null); setError('');
      }} /></div> : <div className="cbn-horse-picker">{horses.length === 0 && <p className="subtitle">Bạn chưa có ngựa. Chọn Thêm ngựa mới để khai báo.</p>}{horses.map(h => {
        const taken = slots.some((id, i) => id === h.id && i !== slot), busy = h.status === 'InTransit';
        return <label key={h.id} className={`pick ${selected?.id === h.id ? 'selected' : ''} ${taken || busy ? 'disabled' : ''}`}><input type="radio" name="horse-pick" checked={selected?.id === h.id} disabled={taken || busy} onChange={() => { setSlots(prev => prev.map((id, i) => i === slot ? h.id : id)); setError(''); }} /><span className="thumb">{h.photoUrl && <img src={h.photoUrl} alt="" />}</span><div className="doc-text"><b>{h.name}</b><span>{h.breed} · {h.microchipIso || 'Chưa có Microchip'}{taken ? ' · Đã chọn trong đơn này' : busy ? ' · Đang vận chuyển' : ''}</span></div><span className="pill draft">{busy ? 'Đang vận chuyển' : 'Hồ sơ đã lưu'}</span></label>;
      })}</div>}</div>
      {selected && !horseForm && <div className="cbn-horse-doc-profile"><div className="cbn-doc-profile-heading"><b>{selected.name}</b><span>{selected.microchipIso || selected.id}</span></div><p className="subtitle">Thông tin định danh, hộ chiếu, sở hữu, thương mại và y tế được lấy từ “Ngựa của tôi”. Có thể sửa thông tin hoặc tải tệp ngay bên dưới.</p>
        {HORSE_FILES.map(([key, name]) => <ProfileFileField documentRow key={key} label={name} value={fileFor(key, selected.id)} onChange={f => putFile(key, name, f, selected.id)} />)}
        {readRow('Thông tin sinh học', `Giống: ${selected.breed || '—'} • Giới tính: ${selected.dossier?.sex || selected.gender} • Sinh: ${selected.dob || '—'} • Microchip: ${selected.microchipIso || '—'} • Số hộ chiếu: ${selected.feiPassportNo || '—'}`, true)}
        {readRow('Giá trị thương mại', `Giá trị: ${selected.dossier?.value ?? '—'} ${selected.dossier?.currency || 'USD'}`, true)}
        {readRow('Ghi chú sức khỏe đặc biệt', selected.dossier?.conditions || 'Không khai báo tình trạng đặc biệt.', true)}
        {readRow('Bác sĩ thú y riêng', `Tên: ${selected.dossier?.vetName || '—'} • SĐT: ${selected.dossier?.vetPhone || '—'}`, true)}
      </div>}
      {selected && !horseForm && <div className="form-grid cbn-horse-care"><ReferenceField full label="Yêu cầu chăm sóc riêng cho ngựa trong chuyến (không bắt buộc)"><textarea value={horseNotes[selected.id] || ''} onChange={e => setHorseNotes({ ...horseNotes, [selected.id]: e.target.value })} placeholder="Lịch ăn, chăm sóc, xử lý đặc biệt khi vận chuyển..." /></ReferenceField></div>}
      {!horseForm && footer}
    </div>}
    {step === 3 && <>
      <div className="card review-section"><div className="between"><h3 className="card-title">Thông tin chuyến đi</h3><button className="link" onClick={() => changeStep(0)}>Sửa</button></div><div className="kv-grid"><div><div className="label">Tuyến</div><div className="value">{origin}, VN → {destination}, {international ? 'JP' : 'VN'}</div></div><div><div className="label">Ngày vận chuyển mong muốn</div><div className="value">{date}</div></div><div><div className="label">Số lượng ngựa</div><div className="value">{count}</div></div></div><p className="hint">Dự toán sơ bộ (tham khảo): {estimate.toLocaleString()} USD. Giá chính thức được ghi trong hợp đồng nháp sau khi Manager chấp nhận yêu cầu.</p></div>
      <div className="card review-section"><div className="between"><h3 className="card-title">Nhận & giao ngựa</h3><button className="link" onClick={() => changeStep(1)}>Sửa</button></div><div className="two">{[pickup, delivery].map((p, i) => <div key={i}><div className="eyebrow">{i ? 'Điểm giao' : 'Điểm nhận'}</div><div className="lines"><b>{p.name}</b><br />{p.address}{p.postal ? `, ${p.postal}` : ''}<br />{p.contact} • {p.phone}{p.notes && <><br />Ghi chú: {p.notes}</>}</div></div>)}</div></div>
      <div className="card review-section"><div className="between"><h3 className="card-title">Ngựa & hồ sơ</h3><button className="link" onClick={() => changeStep(2)}>Sửa</button></div><p className="subtitle">Giấy tờ chung được trình bày trước hồ sơ từng ngựa. Mỗi tài liệu có trạng thái độc lập; tải lên không đồng nghĩa đã được duyệt.</p><div className="doc-group-title">Giấy tờ chung của đơn vận chuyển</div>{documentReview()}{slots.map(id => <div key={id}><div className="eyebrow" style={{ margin: '14px 0 6px' }}>{horses.find(h => h.id === id)?.name} • {id}</div>{documentReview(id)}</div>)}</div>
      {slots.some(id => horseNotes[id]) && <div className="card review-section"><div className="between"><h3 className="card-title">Yêu cầu chăm sóc riêng</h3><button className="link" onClick={() => changeStep(2)}>Sửa</button></div><div className="lines">{slots.filter(id => horseNotes[id]).map(id => <p key={id}><b>{horses.find(h => h.id === id)?.name}:</b> {horseNotes[id]}</p>)}</div></div>}
      {footer}
    </>}
  </div></div></CustomerLayout>;
};
