import React, { useRef } from 'react';
import type { Photo } from '../../types';
import { Icon } from '../DriverLayout';
import './PhotoPicker.css';

interface PhotoPickerProps {
  photos: Photo[];
  onAdd: (photo: Photo) => void;
  onRemove?: (index: number) => void;
  disabled?: boolean;
}

/** Chụp / chọn ảnh minh chứng (JPG, PNG) – mở camera sau trên điện thoại */
export const PhotoPicker: React.FC<PhotoPickerProps> = ({ photos, onAdd, onRemove, disabled }) => {
  const input = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => {
      if (!/\.(jpe?g|png)$/i.test(file.name)) return;
      const reader = new FileReader();
      reader.onload = () => onAdd({ name: file.name, url: String(reader.result) });
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <div className="drv-photos">
      {photos.map((p, i) => (
        <div key={p.name + i} className="drv-photos__item">
          <img src={p.url} alt={`Ảnh ${i + 1}`} />
          {onRemove && !disabled && <button type="button" aria-label="Xoá ảnh" onClick={() => onRemove(i)}><Icon name="close" /></button>}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="drv-photos__add" onClick={() => input.current?.click()}>
          <Icon name="camera" />
          <span>Thêm ảnh</span>
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png" capture="environment" multiple hidden onChange={pick} />
    </div>
  );
};

export default PhotoPicker;
