import { useId, useRef, useState } from 'react';
import type { ProfileFile } from '../../types/customerTypes';
import { ReferenceIcon } from './ReferenceIcon';

export function ProfileFileField({ label, value, onChange, photo = false, documentRow = false }: {
  label: string;
  value?: ProfileFile;
  onChange: (value?: ProfileFile) => void;
  photo?: boolean;
  documentRow?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const picker = <input ref={input} id={id} aria-label={label} type="file" hidden disabled={reading} accept={photo ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'} onChange={async e => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!(photo ? /\.(jpe?g|png)$/i : /\.(pdf|jpe?g|png)$/i).test(file.name)) {
        setError('Định dạng tệp không được hỗ trợ.'); return;
      }
      setReading(true); setError('');
      try {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Không đọc được tệp. Vui lòng chọn lại.'));
          reader.readAsDataURL(file);
        });
        onChange({ name: file.name, url, uploadedAt: new Date().toISOString() });
      } catch (err) { setError(err instanceof Error ? err.message : 'Không đọc được tệp.'); }
      finally { setReading(false); }
    }} />;
  const view = value && <a className="btn ghost sm" href={value.url} target="_blank" rel="noreferrer">Xem tệp</a>;
  const upload = <button type="button" className={`btn ${value || documentRow ? 'ghost' : 'solid'} sm`} disabled={reading} onClick={() => input.current?.click()}>{reading ? 'Đang đọc tệp…' : value ? 'Thay tệp' : 'Tải tệp'}</button>;
  const remove = value && <button type="button" className="btn danger sm" onClick={() => onChange(undefined)}>Xóa tệp</button>;
  const feedback = <>{reading && <span role="status">Đang đọc tệp…</span>}{error && <p className="field-error" role="alert">{error}</p>}</>;
  if (photo) return <div className="photo-upload">{picker}<div className="photo">{value ? <img src={value.url} alt="Ảnh nhận diện ngựa" /> : 'Chưa có ảnh'}</div><div><div className="value sm">{value?.name || 'Chưa tải ảnh lên'}</div><p className="label" style={{ marginTop: 6 }}>Định dạng: JPG, JPEG, PNG.</p><div className="file-actions">{upload}{remove}</div>{feedback}</div></div>;
  if (documentRow) return <div className="doc-row">{picker}<div className="top"><b>{label}</b><span className="pill draft">{value ? 'Đã gửi · Chờ duyệt' : 'Chưa tải lên'}</span>{view}{upload}</div><div className="meta">{value ? `Đã tải lên: ${value.name}` : 'Chưa nộp tệp'}</div>{feedback}</div>;
  return <div className={`file-card ${value ? '' : 'empty-file'}`}>{picker}{value && <span className="doc-icon g"><ReferenceIcon name="file" /></span>}<div className="doc-text"><b>{value?.name || label}</b><span>{value ? 'Đã tải lên · Chưa được duyệt' : 'Định dạng: PDF, JPG, JPEG, PNG.'}</span></div>{view}{upload}{remove}{feedback}</div>;
}
