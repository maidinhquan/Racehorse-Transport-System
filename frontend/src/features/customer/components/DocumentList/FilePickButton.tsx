import React, { useRef } from 'react';
import type { FileRef } from '../../types';

export const SCAN_TYPES = ['pdf', 'jpg', 'jpeg', 'png'];
export const PHOTO_TYPES = ['jpg', 'jpeg', 'png'];

interface FilePickButtonProps {
  label: string;
  onPick: (file: FileRef) => void;
  onError?: (message: string) => void;
  types?: string[];
  className?: string;
  disabled?: boolean;
}

/** Nút chọn tệp từ máy (kiểm tra định dạng, tạo object URL để xem lại trong phiên làm việc) */
export const FilePickButton: React.FC<FilePickButtonProps> = ({ label, onPick, onError, types = SCAN_TYPES, className = 'cus-btn cus-btn--sm', disabled }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => ref.current?.click()}>{label}</button>
      <input ref={ref} type="file" hidden accept={types.map((t) => `.${t}`).join(',')}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
          if (!types.includes(ext)) { onError?.(`Định dạng được chấp nhận: ${types.join(', ').toUpperCase()}.`); return; }
          if (f.size > 10 * 1024 * 1024) { onError?.('Tệp tối đa 10 MB.'); return; }
          onPick({ name: f.name, url: URL.createObjectURL(f) });
        }} />
    </>
  );
};

/** Mở tệp: tệp vừa tải lên thì mở object URL; tệp mẫu thì mở trang minh họa */
export function openFile(file: FileRef) {
  if (file.url) { window.open(file.url, '_blank', 'noopener'); return; }
  const html = `<title>${file.name}</title><body style="font-family:sans-serif;padding:40px;color:#334155"><h2>${file.name}</h2><p>Tệp mẫu trong dữ liệu demo CBN Transport. Không có tài liệu thật đính kèm.</p>`;
  window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank', 'noopener');
}

export default FilePickButton;
