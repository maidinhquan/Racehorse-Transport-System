import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, RefuseCategory, RefuseHandoverRequestDto, RefuseNextStep } from '../../types';
import { REFUSE_CATEGORY_LABEL, REFUSE_NEXT_LABEL } from '../../hooks/driverRules';

interface RefuseHandoverModalProps {
  photoCount: number;
  onClose: () => void;
  onSubmit: (body: RefuseHandoverRequestDto) => Promise<ActionResult>;
}

/** Người nhận từ chối / vắng mặt / không xác minh được – chuyến KHÔNG hoàn tất */
export const RefuseHandoverModal: React.FC<RefuseHandoverModalProps> = ({ photoCount, onClose, onSubmit }) => {
  const [category, setCategory] = useState<RefuseCategory | ''>('');
  const [reason, setReason] = useState('');
  const [next, setNext] = useState<RefuseNextStep | ''>('');
  const [welfare, setWelfare] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!category) return setError('Chọn nhóm lý do.');
    if (!next) return setError('Chọn bước tiếp theo đề xuất.');
    const r = await onSubmit({ category, reason, next, welfare, note });
    if (r.ok) onClose(); else setError(r.message);
  };

  return (
    <Modal open danger title="Ghi nhận từ chối bàn giao" okText="Ghi nhận từ chối" onOk={submit} onClose={onClose} error={error}>
      <p>Chuyến chưa hoàn tất và hạn thanh toán chưa bắt đầu. Logistics Manager sẽ được thông báo.</p>
      <div className="drv-field">
        <label htmlFor="drv-rf-cat">Nhóm lý do *</label>
        <select id="drv-rf-cat" className="drv-select" value={category} onChange={(e) => setCategory(e.target.value as RefuseCategory)}>
          <option value="">Chọn</option>
          {(Object.keys(REFUSE_CATEGORY_LABEL) as RefuseCategory[]).map((k) => <option key={k} value={k}>{REFUSE_CATEGORY_LABEL[k]}</option>)}
        </select>
      </div>
      <div className="drv-field">
        <label htmlFor="drv-rf-reason">Lý do chi tiết *</label>
        <textarea id="drv-rf-reason" className="drv-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Người nhận nói gì, hoặc vì sao không xác minh được" />
      </div>
      <div className="drv-field">
        <label htmlFor="drv-rf-next">Bước tiếp theo đề xuất *</label>
        <select id="drv-rf-next" className="drv-select" value={next} onChange={(e) => setNext(e.target.value as RefuseNextStep)}>
          <option value="">Chọn</option>
          {(Object.keys(REFUSE_NEXT_LABEL) as RefuseNextStep[]).map((k) => <option key={k} value={k}>{REFUSE_NEXT_LABEL[k]}</option>)}
        </select>
      </div>
      <div className="drv-field">
        <label htmlFor="drv-rf-welfare">Tình trạng / phúc lợi ngựa</label>
        <textarea id="drv-rf-welfare" className="drv-textarea" value={welfare} onChange={(e) => setWelfare(e.target.value)} placeholder="Tình trạng từng con, nước, thức ăn, nơi đang giữ ngựa" />
      </div>
      <div className="drv-field">
        <label htmlFor="drv-rf-note">Ghi chú</label>
        <input id="drv-rf-note" className="drv-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Đã gọi ai (SĐT đã đăng ký), lúc mấy giờ" />
      </div>
      <p className="drv-hint">Bằng chứng: {photoCount ? `${photoCount} ảnh của lần bàn giao này sẽ được đính kèm.` : 'nên thêm ảnh ở bước 3 trước khi ghi nhận.'}</p>
    </Modal>
  );
};

export default RefuseHandoverModal;
