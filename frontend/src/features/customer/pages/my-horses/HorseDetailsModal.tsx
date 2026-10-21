import { useEffect, useId, useRef } from 'react';
import { HORSE_FILE_LABELS } from '../../data/horseProfileStorage';
import type { HorseFileKind, HorseProfile, HorseUpload } from '../../data/horseProfileStorage';
import { useHorseFileUrl } from '../../hooks/useHorseFileUrl';
import '../../components/Modals/Modals.css';

interface Props { horse: HorseProfile | null; onClose: () => void; onEdit: () => void }

export function HorseDetailsModal({ horse, onClose, onEdit }: Props) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!horse) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous?.isConnected) previous.focus(); };
  }, [horse?.id]);
  if (!horse) return null;
  const detail = (label: string, value?: string | number) => <div><dt>{label}</dt><dd>{value === undefined || value === '' ? 'Chưa cập nhật' : value}</dd></div>;
  return <div className="cbn-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="cbn-modal-container horse-details-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="cbn-modal-header"><div className="cbn-modal-title-box"><h3 className="cbn-modal-title" id={titleId}>Hồ sơ ngựa • {horse.name}</h3><span className="horse-details-id">{horse.id}</span></div>
        <button type="button" className="cbn-modal-close-btn" onClick={onClose} aria-label="Đóng hồ sơ ngựa">×</button></div>
      <div className="cbn-modal-body">
        <dl className="horse-details-grid">
          {detail('Tên ngựa', horse.name)}{detail('Giống', horse.breed)}{detail('Giới tính', horse.gender)}
          {detail('Ngày sinh', horse.birthDate)}{detail('Tuổi', horse.birthDate || horse.age > 0 ? `${horse.age} tuổi` : undefined)}
          {detail('Màu lông', horse.coatColor)}{detail('Số Microchip', horse.microchip)}
          {detail('Số hộ chiếu', horse.passportNumber)}{detail('Cơ quan cấp', horse.passportAuthority)}
          {detail('Ngày cấp', horse.passportIssueDate)}{detail('Ngày hết hạn', horse.passportExpiryDate)}
          {detail('Giá trị khai báo', horse.declaredValue === undefined ? undefined : `${horse.declaredValue.toLocaleString('vi-VN')} ${horse.currency || 'USD'}`)}
          {detail('Ngày tiêm cúm gần nhất', horse.lastFluDate)}{detail('Ghi chú sức khỏe', horse.healthNotes)}
          {detail('Bác sĩ thú y', horse.vetName)}{detail('Số điện thoại bác sĩ', horse.vetPhone)}
          {detail('Trạng thái hồ sơ', horse.profileStatus)}{detail('Sử dụng', `${horse.usageCount} yêu cầu vận chuyển`)}
        </dl>
        <h4>Tệp đã lưu</h4>
        <p className="horse-details-note">Tải tệp lên không đồng nghĩa hồ sơ đã được chuyên viên duyệt.</p>
        {(Object.keys(HORSE_FILE_LABELS) as HorseFileKind[]).map(kind => <HorseDocument key={kind} label={HORSE_FILE_LABELS[kind]}
          file={horse.files[kind]} missingName={horse.legacyMissingFiles?.[kind]} />)}
      </div>
      <div className="cbn-modal-footer"><button type="button" className="btn-secondary" onClick={onClose}>Đóng</button>
        <button type="button" className="btn-primary-orange" onClick={onEdit}>Sửa hồ sơ</button></div>
    </div>
  </div>;
}

function HorseDocument({ label, file, missingName }: { label: string; file?: HorseUpload; missingName?: string }) {
  const url = useHorseFileUrl(file);
  return <div className="horse-details-file"><div><strong>{label}</strong><span>{file?.name || (missingName ? `${missingName} — cần tải lại nội dung tệp` : 'Chưa tải lên')}</span></div>
    {url && <a href={url} target="_blank" rel="noopener noreferrer">Xem tệp<span className="horse-visually-hidden"> {label}</span></a>}
  </div>;
}
