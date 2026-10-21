import React from 'react';
import type { FileRef, HorseInput, HorseSex } from '../../types';
import { DateField } from '../DateField/DateField';
import { FilePickButton, PHOTO_TYPES, openFile } from '../DocumentList/FilePickButton';
import { Icon } from '../CustomerLayout';
import { SEX_LABEL, today } from '../../hooks/customerRules';
import { useCustomer } from '../../hooks/useCustomer';
import './HorseForm.css';

interface HorseFormProps {
  value: HorseInput;
  onChange: (next: HorseInput) => void;
  /** Ngựa đã gắn với yêu cầu đã gửi: khóa thông tin định danh */
  lockedBy?: string[];
  invalid?: string[];
}

type FileField = 'photo' | 'ownership' | 'valueProof' | 'flu' | 'health';

/** Biểu mẫu hồ sơ ngựa dùng chung: Thêm ngựa, Sửa hồ sơ và "Thêm ngựa mới" trong wizard yêu cầu */
export const HorseForm: React.FC<HorseFormProps> = ({ value: h, onChange, lockedBy = [], invalid = [] }) => {
  const { actions } = useCustomer();
  const locked = lockedBy.length > 0;
  const set = <K extends keyof HorseInput>(k: K, v: HorseInput[K]) => onChange({ ...h, [k]: v });
  const setPass = (k: keyof HorseInput['passport'], v: string | FileRef | undefined) => onChange({ ...h, passport: { ...h.passport, [k]: v } });
  const bad = (k: string) => (invalid.includes(k) ? 'invalid' : '');

  const text = (label: string, k: 'name' | 'breed' | 'color' | 'microchip' | 'vetName' | 'vetPhone' | 'value', lock = false, type = 'text') => (
    <div className="cus-field">
      <label htmlFor={`hf-${k}`}>{label}</label>
      <input id={`hf-${k}`} className={`cus-input ${bad(k)}`} type={type} value={h[k]} readOnly={lock && locked}
        onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  const fileCard = (field: FileField | 'scan', empty: string) => {
    const file = field === 'scan' ? h.passport.scan : h[field];
    const update = (f?: FileRef) => (field === 'scan' ? setPass('scan', f) : set(field, f));
    return file ? (
      <div className="cus-file">
        <span className="cus-file__icon"><Icon name="file" /></span>
        <div className="cus-file__text"><b>{file.name}</b><span>Đã tải lên</span></div>
        <button type="button" className="cus-btn cus-btn--sm" onClick={() => openFile(file)}>Xem</button>
        <FilePickButton label="Thay tệp" onPick={update} onError={actions.showToast} types={field === 'photo' ? PHOTO_TYPES : undefined} />
        <button type="button" className="cus-btn cus-btn--sm cus-btn--danger" onClick={() => update(undefined)}>Xóa</button>
      </div>
    ) : (
      <div className={`cus-file cus-file--empty ${bad(field)}`}>
        <div className="cus-file__text"><b>{empty}</b><span>Định dạng: {field === 'photo' ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'} • tối đa 10 MB</span></div>
        <FilePickButton label="Tải tệp" className="cus-btn cus-btn--sm cus-btn--solid" onPick={update} onError={actions.showToast}
          types={field === 'photo' ? PHOTO_TYPES : undefined} />
      </div>
    );
  };

  return (
    <div className="cus-card cus-horse-form">
      <section>
        <h4>01 · Ảnh nhận diện</h4>
        <div className="cus-horse-form__photo">
          <div className="cus-horse-form__thumb">{h.photo?.url ? <img src={h.photo.url} alt={h.name || 'Ảnh ngựa'} /> : <Icon name="horse" />}</div>
          {fileCard('photo', 'Chưa có ảnh')}
        </div>
      </section>

      <section>
        <h4>02 · Thông tin sinh học & định danh</h4>
        {locked && (
          <div className="cus-note cus-note--grey">
            <Icon name="lock" />
            <div><b>Thông tin định danh đã khóa</b>Ngựa thuộc yêu cầu đã gửi ({lockedBy.join(', ')}). Muốn sửa tên, giống, giới tính, ngày sinh hoặc microchip, hãy liên hệ CBN Transport.</div>
          </div>
        )}
        <div className="cus-horse-form__grid">
          {text('Tên ngựa *', 'name', true)}
          {text('Giống', 'breed', true)}
          <div className="cus-field">
            <label htmlFor="hf-sex">Giới tính</label>
            <select id="hf-sex" className="cus-select" value={h.sex} disabled={locked} onChange={(e) => set('sex', e.target.value as HorseSex)}>
              <option value="">Chọn</option>
              {Object.entries(SEX_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="cus-field">
            <label htmlFor="hf-dob">Ngày sinh</label>
            <DateField id="hf-dob" value={h.dob} max={today()} disabled={locked} onChange={(v) => set('dob', v)} />
          </div>
          {text('Màu lông', 'color')}
          {text('Số microchip', 'microchip', true)}
        </div>
      </section>

      <section>
        <h4>03 · Hộ chiếu ngựa</h4>
        <div className="cus-horse-form__grid">
          <div className="cus-field">
            <label htmlFor="hf-pass-no">Số hộ chiếu</label>
            <input id="hf-pass-no" className={`cus-input ${bad('passNumber')}`} value={h.passport.number} onChange={(e) => setPass('number', e.target.value)} />
          </div>
          <div className="cus-field">
            <label htmlFor="hf-pass-auth">Cơ quan cấp</label>
            <input id="hf-pass-auth" className="cus-input" value={h.passport.authority} onChange={(e) => setPass('authority', e.target.value)} />
          </div>
          <div className="cus-field">
            <label htmlFor="hf-pass-issue">Ngày cấp</label>
            <DateField id="hf-pass-issue" value={h.passport.issueDate} max={today()} onChange={(v) => setPass('issueDate', v)} />
          </div>
          <div className="cus-field">
            <label htmlFor="hf-pass-exp">Ngày hết hạn</label>
            <DateField id="hf-pass-exp" value={h.passport.expiryDate} min={h.passport.issueDate || undefined} onChange={(v) => setPass('expiryDate', v)} />
          </div>
        </div>
        {fileCard('scan', 'Chưa có bản scan hộ chiếu')}
      </section>

      <section>
        <h4>04 · Chứng nhận sở hữu & giá trị thương mại</h4>
        {fileCard('ownership', 'Chưa có giấy chứng nhận sở hữu')}
        <div className="cus-horse-form__grid" style={{ marginTop: 12 }}>
          {text('Giá trị khai báo', 'value', false, 'number')}
          <div className="cus-field">
            <label htmlFor="hf-cur">Đơn vị tiền tệ</label>
            <select id="hf-cur" className="cus-select" value={h.currency} onChange={(e) => set('currency', e.target.value)}>
              {['USD', 'VND', 'JPY', 'EUR', 'AUD', 'SGD'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Bằng chứng định giá (không bắt buộc)</span>{fileCard('valueProof', 'Chưa tải tệp')}</div>
      </section>

      <section>
        <h4>05 · Tiêm ngừa & sức khỏe</h4>
        <div className="cus-horse-form__grid">
          <div className="cus-field">
            <label htmlFor="hf-flu">Ngày tiêm cúm gần nhất</label>
            <DateField id="hf-flu" value={h.fluDate} max={today()} onChange={(v) => set('fluDate', v)} />
          </div>
        </div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Sổ tiêm ngừa</span>{fileCard('flu', 'Chưa tải tệp')}</div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Giấy chứng nhận sức khỏe</span>{fileCard('health', 'Chưa tải tệp')}</div>
        <div className="cus-field" style={{ marginTop: 12 }}>
          <label htmlFor="hf-cond">Ghi chú sức khỏe đặc biệt</label>
          <textarea id="hf-cond" className="cus-textarea" rows={2} value={h.conditions} placeholder="Dị ứng, bệnh nền, thuốc đang dùng hoặc để trống"
            onChange={(e) => set('conditions', e.target.value)} />
        </div>
      </section>

      <section>
        <h4>06 · Bác sĩ thú y riêng</h4>
        <div className="cus-horse-form__grid">
          {text('Tên bác sĩ', 'vetName')}
          {text('Số điện thoại', 'vetPhone', false, 'tel')}
        </div>
      </section>
    </div>
  );
};

export default HorseForm;
