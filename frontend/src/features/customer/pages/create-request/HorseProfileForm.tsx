import { useState, type FormEvent } from 'react';
import type { HorseDossier, HorseProfile } from '../../types/customerTypes';
import { ProfileFileField } from './ProfileFileField';
import { ReferenceField } from './ReferenceField';

// The same six sections as horseFormFields() in the reference HTML.
export function HorseProfileForm({ initial, existingHorses, onSave, onCancel }: {
  initial?: HorseProfile;
  existingHorses: HorseProfile[];
  onSave: (horse: Omit<HorseProfile, 'id'>) => void;
  onCancel: () => void;
}) {
  const [basic, setBasic] = useState({ name: initial?.name || '', breed: initial?.breed || '', dob: initial?.dob || '', color: initial?.color || '', microchipIso: initial?.microchipIso || '', feiPassportNo: initial?.feiPassportNo || '' });
  const [dossier, setDossier] = useState<HorseDossier>(initial?.dossier || { currency: 'USD', sex: initial?.gender === 'Cái' ? 'Mare' : initial?.gender === 'Thiến' ? 'Gelding' : '' });
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-CA');
  const basicField = (label: string, key: keyof typeof basic, type = 'text') => <ReferenceField label={label}><input type={type} value={basic[key]} max={type === 'date' ? today : undefined} onChange={e => setBasic({ ...basic, [key]: e.target.value })} /></ReferenceField>;
  const detailField = (label: string, key: Exclude<keyof HorseDossier, 'files' | 'value'>, type = 'text') => <ReferenceField label={label}><input type={type} value={dossier[key] || ''} max={key === 'fluDate' ? today : undefined} onChange={e => setDossier({ ...dossier, [key]: e.target.value })} /></ReferenceField>;
  const fileField = (label: string, key: keyof NonNullable<HorseDossier['files']>) => <ProfileFileField label={label} photo={key === 'photo'} value={dossier.files?.[key]} onChange={file => setDossier(prev => ({ ...prev, files: { ...prev.files, [key]: file } }))} />;
  const save = (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!basic.name.trim()) { setError('Vui lòng nhập tên ngựa.'); return; }
    if (dossier.passportIssueDate && dossier.passportExpiryDate && dossier.passportExpiryDate < dossier.passportIssueDate) { setError('Ngày hết hạn không được trước ngày cấp hộ chiếu.'); return; }
    if ((basic.dob && basic.dob > today) || (dossier.fluDate && dossier.fluDate > today)) { setError('Ngày sinh và ngày tiêm ngừa không được trong tương lai.'); return; }
    if (basic.microchipIso.trim() && existingHorses.some(h => h.id !== initial?.id && h.microchipIso.trim() === basic.microchipIso.trim())) { setError('Microchip này đã thuộc một hồ sơ ngựa đã lưu.'); return; }
    try {
      onSave({ ...basic, name: basic.name.trim(), microchipIso: basic.microchipIso.trim(), feiPassportNo: basic.feiPassportNo.trim(), dossier,
        gender: ['Mare', 'Female'].includes(dossier.sex || '') ? 'Cái' : dossier.sex === 'Gelding' ? 'Thiến' : 'Đực',
        weightKg: initial?.weightKg || 0, photoUrl: dossier.files?.photo?.url, status: initial?.status || 'Ready' });
    } catch { setError('Không lưu được hồ sơ. Bộ nhớ trình duyệt có thể đã đầy; hãy giảm dung lượng tệp rồi thử lại.'); }
  };
  return <form className="card form-card cbn-myhorse-form" onSubmit={save}>
    <h3 className="card-title">Thông tin & hồ sơ ngựa</h3>
    <p className="subtitle">Lưu một lần tại “Ngựa của tôi” để sử dụng khi tạo yêu cầu. Tải lên không đồng nghĩa đã được Specialist duyệt.</p>
    <section className="cbn-horse-form-section"><h4>01 · Ảnh nhận diện</h4>{fileField('Ảnh nhận diện', 'photo')}</section>
    <section className="cbn-horse-form-section"><h4>02 · Thông tin sinh học & định danh</h4><div className="form-grid">
      {basicField('Tên ngựa *', 'name')}{basicField('Giống', 'breed')}
      <ReferenceField label="Giới tính"><select className="" value={dossier.sex || ''} onChange={e => setDossier({ ...dossier, sex: e.target.value })}><option value="">Chọn</option>{['Stallion', 'Mare', 'Gelding', 'Male', 'Female'].map(v => <option key={v}>{v}</option>)}</select></ReferenceField>
      {basicField('Ngày sinh', 'dob', 'date')}{basicField('Màu lông', 'color')}{basicField('Số Microchip', 'microchipIso')}
    </div></section>
    <section className="cbn-horse-form-section"><h4>03 · Hộ chiếu ngựa</h4><div className="form-grid">
      {basicField('Số hộ chiếu', 'feiPassportNo')}{detailField('Cơ quan cấp', 'passportAuthority')}{detailField('Ngày cấp', 'passportIssueDate', 'date')}{detailField('Ngày hết hạn', 'passportExpiryDate', 'date')}
    </div>{fileField('Bản scan hộ chiếu', 'passport')}</section>
    <section className="cbn-horse-form-section"><h4>04 · Chứng nhận sở hữu & giá trị thương mại</h4>{fileField('Chứng nhận sở hữu ngựa', 'ownership')}<div className="form-grid">
      <ReferenceField label="Giá trị khai báo"><input type="number" min="0" className="" value={dossier.value ?? ''} onChange={e => setDossier({ ...dossier, value: e.target.value === '' ? undefined : Number(e.target.value) })} /></ReferenceField>
      <ReferenceField label="Đơn vị tiền tệ"><select className="" value={dossier.currency || 'USD'} onChange={e => setDossier({ ...dossier, currency: e.target.value })}>{['USD', 'VND', 'EUR', 'AUD', 'SGD'].map(v => <option key={v}>{v}</option>)}</select></ReferenceField>
    </div>{fileField('Bằng chứng định giá (tùy chọn)', 'valueProof')}</section>
    <section className="cbn-horse-form-section"><h4>05 · Hồ sơ tiêm ngừa & sức khỏe</h4>{detailField('Ngày tiêm cúm gần nhất', 'fluDate', 'date')}{fileField('Sổ tiêm ngừa', 'flu')}{fileField('Giấy chứng nhận sức khỏe', 'health')}
      <div className="form-grid"><ReferenceField label="Ghi chú sức khỏe đặc biệt" full><textarea value={dossier.conditions || ''} onChange={e => setDossier({ ...dossier, conditions: e.target.value })} placeholder="Dị ứng, bệnh nền, thuốc đang dùng hoặc không có…" /></ReferenceField></div>
    </section>
    <section className="cbn-horse-form-section"><h4>06 · Bác sĩ thú y riêng</h4><div className="form-grid">{detailField('Tên bác sĩ', 'vetName')}{detailField('Số điện thoại', 'vetPhone', 'tel')}</div></section>
    {error && <p className="note red" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="btn ghost lg" onClick={onCancel}>Quay lại</button><button type="submit" className="btn solid lg">Lưu hồ sơ ngựa</button></div>
  </form>;
}
