import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import type { ComplaintType } from '../../types';
import { useCustomer } from '../../hooks/useCustomer';

export const COMPLAINT_TYPE_LABEL: Record<ComplaintType, string> = {
  HORSE_CONDITION: 'Tình trạng ngựa khi nhận', DELAY: 'Trễ hẹn', BILLING: 'Chi phí / thanh toán', SERVICE: 'Chất lượng dịch vụ', OTHER: 'Khác',
};

interface ComplaintModalProps {
  open: boolean;
  requestId: string;
  onClose: () => void;
}

/** Gửi khiếu nại sau bàn giao (tạm dừng hạn nghiệm thu / thanh toán) */
export const ComplaintModal: React.FC<ComplaintModalProps> = ({ open, requestId, onClose }) => {
  const { actions } = useCustomer();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ComplaintType>('HORSE_CONDITION');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setTitle(''); setType('HORSE_CONDITION'); setDescription(''); setError(''); } }, [open]);

  const submit = () => {
    const res = actions.raiseComplaint(requestId, { title, type, description });
    if (!res.ok) return setError(res.message);
    onClose();
  };

  return (
    <Modal open={open} title={`Gửi khiếu nại • ${requestId}`} okText="Gửi khiếu nại" onClose={onClose} onOk={submit} error={error}>
      <p>Khiếu nại được ghi nhận và phản hồi bằng văn bản. Trong thời gian xử lý, hạn nghiệm thu / thanh toán số dư được tạm dừng.</p>
      <div className="cus-field">
        <label htmlFor="cmp-type">Loại khiếu nại</label>
        <select id="cmp-type" className="cus-select" value={type} onChange={(e) => setType(e.target.value as ComplaintType)}>
          {(Object.keys(COMPLAINT_TYPE_LABEL) as ComplaintType[]).map((k) => <option key={k} value={k}>{COMPLAINT_TYPE_LABEL[k]}</option>)}
        </select>
      </div>
      <div className="cus-field">
        <label htmlFor="cmp-title">Tiêu đề *</label>
        <input id="cmp-title" className="cus-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Ngựa có vết trầy ở chân sau" />
      </div>
      <div className="cus-field">
        <label htmlFor="cmp-desc">Mô tả chi tiết *</label>
        <textarea id="cmp-desc" className="cus-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </Modal>
  );
};

export default ComplaintModal;
