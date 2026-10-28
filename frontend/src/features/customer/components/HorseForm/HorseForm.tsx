import React, { useState } from 'react';
import type { FileRef, HorseInput, HorseSex } from '../../types';
import { DateField } from '../DateField/DateField';
import { FilePickButton, PHOTO_TYPES } from '../DocumentList/FilePickButton';
import { Icon } from '../CustomerLayout';
import { SEX_LABEL, today } from '../../hooks/customerRules';
import { useCustomer } from '../../hooks/useCustomer';
import { FilePreviewModal } from '../Modals/FilePreviewModal';
import './HorseForm.css';
import { getDemoMode } from '../../../../shared/context/DemoModeContext';
import { AuthImage } from '../../../../shared/components/AuthImage';

interface HorseFormProps {
  value: HorseInput;
  onChange: (next: HorseInput) => void;
  /** Ngựa đã gắn với yêu cầu đã gửi: khóa thông tin định danh */
  lockedBy?: string[];
  invalid?: string[];
  errors?: Record<string, string>;
  onClearError?: (fieldKey: string) => void;
}

type FileField = 'photo' | 'ownership' | 'valueProof' | 'flu' | 'health';

/** Biểu mẫu hồ sơ ngựa dùng chung: Thêm ngựa, Sửa hồ sơ và "Thêm ngựa mới" trong wizard yêu cầu */
export const HorseForm: React.FC<HorseFormProps> = ({
  value: h,
  onChange,
  lockedBy = [],
  invalid = [],
  errors = {},
  onClearError,
}) => {
  const { actions } = useCustomer();
  const [preview, setPreview] = useState<{ file: FileRef; title: string } | null>(null);
  const locked = lockedBy.length > 0;
  const demo = getDemoMode('customer');
  const set = <K extends keyof HorseInput>(k: K, v: HorseInput[K]) => onChange({ ...h, [k]: v });
  const setPass = (k: keyof HorseInput['passport'], v: string | FileRef | undefined) => onChange({ ...h, passport: { ...h.passport, [k]: v } });
  
  const isBad = (k: string) => Boolean(errors[k]) || invalid.includes(k);
  const bad = (k: string) => (isBad(k) ? 'invalid' : '');
  const getErr = (k: string) => errors[k];
  const clearErr = (k: string) => {
    if (onClearError) onClearError(k);
  };

  const text = (label: string, k: 'name' | 'breed' | 'color' | 'microchip' | 'vetName' | 'vetPhone' | 'value', lock = false, type = 'text') => {
    const errorMsg = getErr(k);
    const badClass = bad(k);
    return (
      <div className={`cus-field ${isBad(k) ? 'has-error' : ''}`}>
        <label htmlFor={`hf-${k}`}>
          {label}
        </label>
        <input
          id={`hf-${k}`}
          className={`cus-input ${badClass}`}
          type={type}
          value={h[k] ?? ''}
          readOnly={lock && locked}
          disabled={!demo && ['color', 'vetName', 'vetPhone'].includes(k)}
          onChange={(e) => {
            clearErr(k);
            set(k, e.target.value);
          }}
        />
        {errorMsg && (
          <span className="cus-error-text" role="alert">
            <Icon name="alert" /> {errorMsg}
          </span>
        )}
      </div>
    );
  };

  const fileTitle = (field: FileField | 'scan') => {
    switch (field) {
      case 'photo': return 'Ảnh nhận diện ngựa';
      case 'scan': return 'Bản scan hộ chiếu ngựa (FEI Passport)';
      case 'ownership': return 'Giấy tờ xác nhận sở hữu ngựa';
      case 'valueProof': return 'Chứng từ định giá ngựa';
      case 'flu': return 'Sổ tiêm ngừa';
      case 'health': return 'Giấy chứng nhận sức khỏe';
      default: return 'Tài liệu ngựa';
    }
  };

  const fileCard = (field: FileField | 'scan', empty: string) => {
    if (!demo && (field === 'flu' || field === 'health')) return <p className="cus-subtitle">Tài liệu này chưa hỗ trợ lưu trực tuyến. Vui lòng liên hệ chuyên viên phụ trách.</p>;
    const file = field === 'scan' ? h.passport.scan : h[field];
    const update = (f?: FileRef) => (field === 'scan' ? setPass('scan', f) : set(field, f));
    return file ? (
      <div className="cus-file">
        <span className="cus-file__icon"><Icon name={field === 'photo' ? 'image' : 'file'} /></span>
        <div className="cus-file__text"><b>{file.name}</b><span>{file.file ? 'Đã chọn, chưa lưu' : 'Đã lưu'}</span></div>
        <button type="button" className="cus-btn cus-btn--sm" onClick={() => setPreview({ file, title: fileTitle(field) })}>Xem</button>
        <FilePickButton label="Thay tệp" onPick={update} onError={actions.showToast} types={field === 'photo' ? PHOTO_TYPES : undefined} />
        {(demo || file.file) && <button type="button" className="cus-btn cus-btn--sm cus-btn--danger" onClick={() => update(undefined)}>Xóa</button>}
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
      <div className="cus-horse-form__heading">
        <h3 className="cus-card__title">Thông tin &amp; hồ sơ ngựa</h3>
        <p className="cus-subtitle">Lưu một lần tại “Ngựa của tôi” để sử dụng khi tạo yêu cầu vận chuyển. Tải tài liệu lên không có nghĩa hồ sơ đã được chuyên viên duyệt.</p>
      </div>
      <section>
        <h4>01 · Ảnh nhận diện</h4>
        <div className="cus-horse-form__photo">
          <button
            type="button"
            className="cus-horse-form__thumb"
            disabled={!h.photo?.url}
            aria-label={h.photo?.url ? 'Xem ảnh nhận diện ngựa' : 'Chưa có ảnh nhận diện ngựa'}
            title={h.photo?.url ? 'Bấm để xem ảnh phóng to' : undefined}
            onClick={() => {
              if (h.photo) setPreview({ file: h.photo, title: 'Ảnh nhận diện ngựa' });
            }}
          >
            <AuthImage framed src={h.photo?.url} alt={h.name || 'Ảnh ngựa'} fallback={h.photo?.url ? 'Đang tải ảnh…' : 'Chưa có ảnh'} />
          </button>
          <div className="cus-horse-form__photo-info">
            <b>{h.photo?.name || 'Chưa tải ảnh nhận diện'}</b>
            <p>Định dạng: JPG, JPEG, PNG · tối đa 10 MB.</p>
            <div className="cus-horse-form__file-actions">
              <FilePickButton label={h.photo ? 'Thay ảnh' : 'Tải ảnh lên'} onPick={(file) => set('photo', file)} onError={actions.showToast}
                types={PHOTO_TYPES} className={`cus-btn cus-btn--sm${h.photo ? '' : ' cus-btn--solid'}`} />
              {h.photo && <button type="button" className="cus-btn cus-btn--sm cus-btn--danger" onClick={() => set('photo', undefined)}>Xóa ảnh</button>}
            </div>
          </div>
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
          {text('Giống ngựa *', 'breed', true)}
          <div className={`cus-field ${isBad('sex') ? 'has-error' : ''}`}>
            <label htmlFor="hf-sex">Giới tính *</label>
            <select
              id="hf-sex"
              className={`cus-select ${bad('sex')}`}
              value={h.sex}
              disabled={locked}
              onChange={(e) => {
                clearErr('sex');
                set('sex', e.target.value as HorseSex);
              }}
            >
              <option value="">Chọn giới tính</option>
              {Object.entries(SEX_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {getErr('sex') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('sex')}
              </span>
            )}
          </div>
          <div className={`cus-field ${isBad('dob') ? 'has-error' : ''}`}>
            <label htmlFor="hf-dob">Ngày sinh *</label>
            <DateField
              id="hf-dob"
              value={h.dob}
              max={today()}
              disabled={locked}
              invalid={isBad('dob')}
              onChange={(v) => {
                clearErr('dob');
                set('dob', v);
              }}
            />
            {getErr('dob') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('dob')}
              </span>
            )}
          </div>
          {text('Màu lông', 'color')}
          {text('Số microchip (15 số) *', 'microchip', true)}
        </div>
      </section>

      <section>
        <h4>03 · Hộ chiếu ngựa</h4>
        <div className="cus-horse-form__section-summary">
          <p className="cus-subtitle">Thông tin hộ chiếu và bản scan</p>
          <span className={`cus-horse-form__file-status${h.passport.scan ? ' is-uploaded' : ''}`}>{h.passport.scan ? 'Đã tải bản scan' : 'Chưa tải bản scan'}</span>
        </div>
        <div className="cus-horse-form__grid">
          <div className={`cus-field ${isBad('passNumber') ? 'has-error' : ''}`}>
            <label htmlFor="hf-pass-no">Số hộ chiếu *</label>
            <input
              id="hf-pass-no"
              className={`cus-input ${bad('passNumber')}`}
              value={h.passport.number}
              onChange={(e) => {
                clearErr('passNumber');
                setPass('number', e.target.value);
              }}
            />
            {getErr('passNumber') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('passNumber')}
              </span>
            )}
          </div>
          <div className={`cus-field ${isBad('passAuth') ? 'has-error' : ''}`}>
            <label htmlFor="hf-pass-auth">Cơ quan cấp *</label>
            <input
              id="hf-pass-auth"
              className={`cus-input ${bad('passAuth')}`}
              value={h.passport.authority}
              onChange={(e) => {
                clearErr('passAuth');
                setPass('authority', e.target.value);
              }}
            />
            {getErr('passAuth') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('passAuth')}
              </span>
            )}
          </div>
          <div className={`cus-field ${isBad('passIssue') ? 'has-error' : ''}`}>
            <label htmlFor="hf-pass-issue">Ngày cấp *</label>
            <DateField
              id="hf-pass-issue"
              value={h.passport.issueDate}
              max={today()}
              invalid={isBad('passIssue')}
              onChange={(v) => {
                clearErr('passIssue');
                setPass('issueDate', v);
              }}
            />
            {getErr('passIssue') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('passIssue')}
              </span>
            )}
          </div>
          <div className={`cus-field ${isBad('passExp') ? 'has-error' : ''}`}>
            <label htmlFor="hf-pass-exp">Ngày hết hạn *</label>
            <DateField
              id="hf-pass-exp"
              value={h.passport.expiryDate}
              min={h.passport.issueDate || undefined}
              invalid={isBad('passExp')}
              onChange={(v) => {
                clearErr('passExp');
                setPass('expiryDate', v);
              }}
            />
            {getErr('passExp') && (
              <span className="cus-error-text" role="alert">
                <Icon name="alert" /> {getErr('passExp')}
              </span>
            )}
          </div>
        </div>
        {fileCard('scan', 'Chưa có bản scan hộ chiếu')}
      </section>

      <section>
        <h4>04 · Chứng nhận sở hữu & giá trị thương mại</h4>
        <p className="cus-subtitle">Hồ sơ sở hữu và bằng chứng định giá (nếu có)</p>
        {fileCard('ownership', 'Chưa có giấy chứng nhận sở hữu')}
        <div className="cus-horse-form__grid" style={{ marginTop: 12 }}>
          {text('Giá trị khai báo (VND) *', 'value', false, 'number')}
          <div className="cus-field">
            <label htmlFor="hf-cur">Đơn vị tiền tệ</label>
            <select id="hf-cur" className="cus-select" value={h.currency} onChange={(e) => set('currency', e.target.value)}>
              {['VND'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Bằng chứng định giá (không bắt buộc)</span>{fileCard('valueProof', 'Chưa tải tệp')}</div>
      </section>

      <section>
        <h4>05 · Hồ sơ tiêm ngừa & sức khỏe</h4>
        {!demo && <p className="cus-subtitle">Ngày tiêm và thông tin bác sĩ riêng chưa hỗ trợ lưu trực tuyến. Ghi chú sức khỏe vẫn được lưu cùng hồ sơ ngựa.</p>}
        <div className="cus-horse-form__grid">
          <div className="cus-field">
            <label htmlFor="hf-flu">Ngày tiêm cúm gần nhất</label>
            <DateField id="hf-flu" value={h.fluDate ?? ''} max={today()} disabled={!demo} onChange={(v) => set('fluDate', v)} />
          </div>
        </div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Sổ tiêm ngừa</span>{fileCard('flu', 'Chưa tải tệp')}</div>
        <div className="cus-horse-form__minor"><span className="cus-eyebrow">Giấy chứng nhận sức khỏe</span>{fileCard('health', 'Chưa tải tệp')}</div>
        <div className="cus-field" style={{ marginTop: 12 }}>
          <label htmlFor="hf-cond">Ghi chú sức khỏe đặc biệt</label>
          <textarea id="hf-cond" className="cus-textarea" rows={2} maxLength={2000} value={h.conditions} placeholder="Dị ứng, bệnh nền, thuốc đang dùng hoặc để trống"
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

      <FilePreviewModal
        open={!!preview}
        file={preview?.file}
        title={preview?.title}
        onClose={() => setPreview(null)}
      />
    </div>
  );
};

export default HorseForm;
