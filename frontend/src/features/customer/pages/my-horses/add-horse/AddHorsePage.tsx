import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CustomerLayout } from '../../../components/CustomerLayout';
import { getHorseProfiles, horseAge, saveHorseProfile, validateHorseUpload } from '../../../data/horseProfileStorage';
import type { HorseFileKind, HorseProfile, HorseUpload } from '../../../data/horseProfileStorage';
import { useHorseFileUrl } from '../../../hooks/useHorseFileUrl';
import './AddHorsePage.css';

const emptyForm = {
    name: '', breed: '', gender: '', birthDate: '', coatColor: '', microchip: '',
    passportNumber: '', passportAuthority: '', passportIssueDate: '', passportExpiryDate: '',
    declaredValue: '', currency: 'USD', lastFluDate: '', healthNotes: '', vetName: '', vetPhone: '',
};
type FormValues = typeof emptyForm;
type FieldErrors = Partial<Record<keyof FormValues, string>>;

function todayString() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function UploadField({ title, file, photo = false, disabled, onPick, onRemove }: {
    title: string; file?: HorseUpload; photo?: boolean; disabled: boolean;
    onPick: (file: File) => void; onRemove: () => void;
}) {
    const id = useId();
    const url = useHorseFileUrl(file);
    return <div className={`ahp-upload ${photo ? 'ahp-photo-upload' : ''}`}>
        {photo && <div className="ahp-photo-preview">{url ? <img src={url} alt="Ảnh nhận diện ngựa vừa chọn" /> : <span>Chưa có ảnh</span>}</div>}
        <div className="ahp-upload-content">
            <strong>{file?.name || (photo ? 'Chưa tải ảnh lên' : `Chưa tải ${title.toLowerCase()}`)}</strong>
            <p>{file ? `${(file.size / 1024).toFixed(0)} KB • Đã chọn tệp, chưa thẩm định.` : `Định dạng chấp nhận: ${photo ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'}. Tối đa 5 MB/tệp.`}</p>
            <div className="ahp-upload-actions">
                <label className={`ahp-upload-button ${disabled ? 'ahp-disabled' : ''}`} htmlFor={id}>
                    {file ? 'Thay tệp' : photo ? 'Tải ảnh lên' : 'Tải tệp'}<span className="ahp-sr-only"> {title}</span>
                    <input id={id} className="ahp-sr-only" type="file" disabled={disabled}
                        accept={photo ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'}
                        onChange={e => { const selected = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (selected) onPick(selected); }} />
                </label>
                {file && url && <a className="ahp-file-link" href={url} target="_blank" rel="noopener noreferrer">Xem tệp<span className="ahp-sr-only"> {title}</span></a>}
                {file && <button type="button" className="ahp-remove" disabled={disabled} onClick={onRemove}>Xóa tệp<span className="ahp-sr-only"> {title}</span></button>}
            </div>
        </div>
    </div>;
}

export function AddHorsePage() {
    const { horseId } = useParams();
    return <HorseProfileForm key={horseId || 'new'} horseId={horseId} />;
}

function HorseProfileForm({ horseId }: { horseId?: string }) {
    const navigate = useNavigate();
    const formRef = useRef<HTMLFormElement>(null);
    const savingRef = useRef(false);
    const [values, setValues] = useState<FormValues>({ ...emptyForm });
    const [files, setFiles] = useState<Partial<Record<HorseFileKind, HorseUpload>>>({});
    const [errors, setErrors] = useState<FieldErrors>({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<HorseProfile | null>(null);
    const [loading, setLoading] = useState(Boolean(horseId));
    const [loadError, setLoadError] = useState('');
    const [loadRevision, setLoadRevision] = useState(0);
    const today = todayString();

    useEffect(() => {
        if (!horseId) return;
        let active = true;
        setLoading(true); setLoadError('');
        getHorseProfiles().then(horses => {
            if (!active) return;
            const horse = horses.find(h => h.id === horseId);
            if (!horse) { setLoadError('Không tìm thấy hồ sơ ngựa.'); return; }
            setEditing(horse);
            const next = { ...emptyForm };
            for (const key of Object.keys(next) as (keyof FormValues)[]) {
                const value = horse[key];
                next[key] = value === undefined ? emptyForm[key] : String(value);
            }
            setValues(next); setFiles(horse.files);
        }).catch(e => { if (active) setLoadError(e instanceof Error ? e.message : 'Không tải được hồ sơ.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [horseId, loadRevision]);

    const change = (key: keyof FormValues, value: string) => {
        setValues(previous => ({ ...previous, [key]: value }));
        setErrors(previous => ({ ...previous, [key]: undefined }));
    };
    const upload = (kind: HorseFileKind, file: File) => {
        try {
            validateHorseUpload(file, kind);
            setFiles(previous => ({ ...previous, [kind]: { name: file.name, type: file.type, size: file.size, blob: file } }));
            setError('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Không đọc được tệp.'); }
    };
    const remove = (kind: HorseFileKind) => setFiles(previous => {
        const next = { ...previous }; delete next[kind]; return next;
    });
    const field = (key: keyof FormValues, label: string, type = 'text', required = false, max?: string) => <div className="ahp-field">
        <label htmlFor={`ahp-${key}`}>{label}{required && ' *'}</label>
        <input id={`ahp-${key}`} name={key} type={type} value={values[key]} required={required}
            max={max} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined}
            inputMode={key === 'microchip' ? 'numeric' : undefined} maxLength={key === 'microchip' ? 15 : undefined}
            aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `ahp-error-${key}` : undefined}
            onChange={e => change(key, e.target.value)} />
        {errors[key] && <span className="ahp-field-error" id={`ahp-error-${key}`}>{errors[key]}</span>}
    </div>;
    const fileField = (kind: HorseFileKind, title: string, photo = false) => <UploadField title={title} file={files[kind]}
        photo={photo} disabled={saving} onPick={file => upload(kind, file)} onRemove={() => remove(kind)} />;

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (savingRef.current || loading || loadError) return;
        const invalid: FieldErrors = {};
        if (!values.name.trim()) invalid.name = 'Vui lòng nhập tên ngựa.';
        if (values.microchip.trim() && !/^\d{15}$/.test(values.microchip.trim())) invalid.microchip = 'Số Microchip phải gồm 15 chữ số.';
        if (values.birthDate && values.birthDate > today) invalid.birthDate = 'Ngày sinh không được ở tương lai.';
        if (values.lastFluDate && values.lastFluDate > today) invalid.lastFluDate = 'Ngày tiêm không được ở tương lai.';
        if (values.birthDate && values.lastFluDate && values.lastFluDate < values.birthDate) invalid.lastFluDate = 'Ngày tiêm không được trước ngày sinh.';
        if (values.passportIssueDate && values.passportExpiryDate && values.passportExpiryDate < values.passportIssueDate) invalid.passportExpiryDate = 'Ngày hết hạn không được trước ngày cấp.';
        if (values.declaredValue && (!Number.isFinite(Number(values.declaredValue)) || Number(values.declaredValue) < 0)) invalid.declaredValue = 'Giá trị khai báo phải là số không âm.';
        if (values.vetPhone.trim() && !/^\+?[\d\s().-]+$/.test(values.vetPhone.trim())) invalid.vetPhone = 'Số điện thoại không hợp lệ.';
        setErrors(invalid); setError('');
        const first = Object.keys(invalid)[0];
        if (first) {
            setError('Vui lòng kiểm tra các trường được đánh dấu.');
            formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
            return;
        }
        savingRef.current = true; setSaving(true);
        try {
            const age = values.birthDate ? horseAge(values.birthDate) : editing?.birthDate ? 0 : (editing?.age || 0);
            const horse: HorseProfile = {
                ...editing, ...values, name: values.name.trim(), breed: values.breed.trim(), gender: values.gender || 'Chưa cập nhật',
                microchip: values.microchip.trim(), id: editing?.id || `HOR-${crypto.randomUUID()}`, age,
                declaredValue: values.declaredValue === '' ? undefined : Number(values.declaredValue),
                submissionStatus: editing?.submissionStatus || 'unsubmitted', submissionBadgeText: editing?.submissionBadgeText || 'Chưa nộp cùng đơn', usageCount: editing?.usageCount || 0,
                profileStatus: values.microchip && values.passportNumber && files.passport && files.ownership ? 'Đã lưu hồ sơ cơ bản – chưa thẩm định' : 'Cần bổ sung',
                passportScanStatus: files.passport ? 'Đã tải lên – chưa thẩm định' : 'Chưa tải lên',
                medicalRecordStatus: files.health || files.vaccination ? 'Đã tải lên – chưa thẩm định' : 'Chưa tải lên',
                files, createdAt: editing?.createdAt || new Date().toISOString(),
                legacyMissingFiles: Object.fromEntries(Object.entries(editing?.legacyMissingFiles || {}).filter(([kind]) => !files[kind as HorseFileKind])),
            };
            await saveHorseProfile(horse);
            navigate('/customer/horses', { state: { horseSaved: horse.name } });
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được hồ sơ ngựa.'); }
        finally { savingRef.current = false; setSaving(false); }
    };

    const title = horseId ? 'Sửa hồ sơ ngựa' : 'Thêm ngựa mới';
    if (loading || loadError) return <CustomerLayout pageTitle={title} activeNav="horses"><div className="add-horse-page">
        <Link className="ahp-back" to="/customer/horses">← Quay lại Ngựa của tôi</Link>
        {loading ? <p role="status">Đang tải hồ sơ…</p> : <div role="alert">{loadError} <button type="button" onClick={() => setLoadRevision(value => value + 1)}>Thử lại</button></div>}
    </div></CustomerLayout>;

    return <CustomerLayout pageTitle={title} activeNav="horses">
        <div className="add-horse-page">
            <Link className="ahp-back" to="/customer/horses">← Quay lại Ngựa của tôi</Link>
            <header className="ahp-heading"><h2>{title}</h2>
                <p>Lưu ngựa vào hồ sơ cá nhân. Có thể bổ sung giấy tờ sau; chuyên viên chỉ kiểm tra khi đơn vận chuyển được chấp thuận và vào giai đoạn chuẩn bị.</p></header>
            <form ref={formRef} noValidate onSubmit={submit}>
                {error && <p role="alert" className="ahp-error">{error}</p>}
                {Object.keys(editing?.legacyMissingFiles || {}).some(kind => !files[kind as HorseFileKind]) && <p className="ahp-error" role="note">Một số tệp cũ chỉ còn tên, chưa có nội dung lưu được. Vui lòng tải lại ảnh và giấy tờ tương ứng.</p>}
                <fieldset className="ahp-card" disabled={saving}>
                    <legend className="ahp-sr-only">Thông tin và hồ sơ ngựa</legend>
                    <div className="ahp-card-intro"><h3>Thông tin &amp; hồ sơ ngựa</h3>
                        <p>Lưu một lần tại “Ngựa của tôi” để sử dụng khi tạo Request. Tình trạng tải lên không có nghĩa đã được Specialist duyệt.</p></div>
                    <section className="ahp-section"><h4>01 · Ảnh nhận diện</h4>{fileField('photo', 'Ảnh nhận diện', true)}</section>
                    <section className="ahp-section"><h4>02 · Thông tin sinh học &amp; định danh</h4>
                        <div className="ahp-grid">{field('name', 'Tên ngựa', 'text', true)}{field('breed', 'Giống')}
                            <div className="ahp-field"><label htmlFor="ahp-gender">Giới tính</label><select id="ahp-gender" value={values.gender} onChange={e => change('gender', e.target.value)}>
                                <option value="">Chọn</option><option>Ngựa đực giống</option><option>Ngựa cái</option><option>Ngựa thiến</option><option>Đực</option><option>Cái</option>
                            </select></div>
                            {field('birthDate', 'Ngày sinh', 'date', false, today)}{field('coatColor', 'Màu lông')}{field('microchip', 'Số Microchip')}
                        </div></section>
                    <section className="ahp-section"><div className="ahp-section-title"><h4>03 · Hộ chiếu ngựa</h4><span className="ahp-status">{files.passport ? 'Đã chọn tệp – chưa thẩm định' : 'Chưa tải lên'}</span></div>
                        <p className="ahp-description">Thông tin hộ chiếu và bản scan</p>
                        <div className="ahp-grid">{field('passportNumber', 'Số hộ chiếu')}{field('passportAuthority', 'Cơ quan cấp')}{field('passportIssueDate', 'Ngày cấp', 'date')}{field('passportExpiryDate', 'Ngày hết hạn', 'date')}</div>
                        {fileField('passport', 'Bản quét hộ chiếu')}</section>
                    <section className="ahp-section"><h4>04 · Chứng nhận sở hữu &amp; giá trị thương mại</h4>
                        <p className="ahp-description">Hồ sơ sở hữu và bằng chứng định giá (nếu có)</p>{fileField('ownership', 'Giấy chứng nhận sở hữu')}
                        <div className="ahp-grid">{field('declaredValue', 'Giá trị khai báo', 'number')}
                            <div className="ahp-field"><label htmlFor="ahp-currency">Đơn vị tiền tệ</label><select id="ahp-currency" value={values.currency} onChange={e => change('currency', e.target.value)}>{['USD', 'VND', 'EUR', 'AUD', 'SGD'].map(currency => <option key={currency}>{currency}</option>)}</select></div></div>
                        <h5>Bằng chứng định giá</h5>{fileField('valueProof', 'Bằng chứng định giá')}</section>
                    <section className="ahp-section"><h4>05 · Hồ sơ tiêm ngừa &amp; sức khỏe</h4>
                        <div className="ahp-grid">{field('lastFluDate', 'Ngày tiêm cúm gần nhất', 'date', false, today)}</div>
                        <h5>Sổ tiêm ngừa</h5>{fileField('vaccination', 'Sổ tiêm ngừa')}<h5>Giấy chứng nhận sức khỏe</h5>{fileField('health', 'Giấy chứng nhận sức khỏe')}
                        <div className="ahp-field"><label htmlFor="ahp-healthNotes">Ghi chú sức khỏe đặc biệt</label><textarea id="ahp-healthNotes" rows={4} placeholder="Dị ứng, bệnh nền, thuốc đang dùng hoặc không có…" value={values.healthNotes} onChange={e => change('healthNotes', e.target.value)} /></div></section>
                    <section className="ahp-section"><h4>06 · Bác sĩ thú y riêng</h4><div className="ahp-grid">{field('vetName', 'Tên bác sĩ')}{field('vetPhone', 'Số điện thoại', 'tel')}</div></section>
                </fieldset>
                <div className="ahp-footer"><p>Chỉ tên ngựa là bắt buộc khi lưu hồ sơ cá nhân. Giấy tờ có thể bổ sung sau.</p>
                    <div className="ahp-footer-actions"><button type="button" className="ahp-cancel" disabled={saving} onClick={() => navigate('/customer/horses')}>Hủy</button>
                        <button type="submit" className="ahp-submit" disabled={saving}>{saving ? 'Đang lưu…' : horseId ? 'Lưu thay đổi' : 'Lưu hồ sơ ngựa'}</button></div></div>
            </form>
        </div>
    </CustomerLayout>;
}

export default AddHorsePage;
