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

/** Nén ảnh bằng Canvas trước khi đưa vào base64 để tránh quá tải bộ nhớ và mạng */
function compressImage(file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = String(e.target?.result || '');
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/** Chụp / chọn ảnh minh chứng (JPG, PNG) – mở camera sau trên điện thoại */
export const PhotoPicker: React.FC<PhotoPickerProps> = ({ photos, onAdd, onRemove, disabled }) => {
  const input = useRef<HTMLInputElement>(null);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!/\.(jpe?g|png)$/i.test(file.name)) continue;
      const compressedUrl = await compressImage(file);
      if (compressedUrl) {
        onAdd({ name: file.name, url: compressedUrl });
      }
    }
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
