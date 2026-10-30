import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, Trip } from '../../types';
import { fmtDateTime } from '../../hooks/driverRules';

interface DelayModalProps {
  trip: Trip;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<ActionResult>;
}

/** Báo chậm khởi hành – Coordinator sẽ đề xuất lịch mới cho Manager duyệt */
export const DelayModal: React.FC<DelayModalProps> = ({ trip, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const r = await onSubmit(reason);
    if (r.ok) onClose(); else setError(r.message);
  };

  return (
    <Modal open title={`Báo chậm khởi hành • ${trip.id}`} okText="Gửi Coordinator" onOk={submit} onClose={onClose} okDisabled={reason.trim().length < 10} error={error}>
      <p>Lịch hiện tại: <b>{fmtDateTime(trip.plannedDepart)}</b>. Chuyến vẫn ở trạng thái Sẵn sàng khởi hành cho tới khi Manager duyệt lịch mới.</p>
      <div className="drv-field">
        <label htmlFor="drv-delay">Lý do *</label>
        <textarea id="drv-delay" className="drv-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Xe hỏng, thời tiết hoặc trở ngại khác (ít nhất 10 ký tự)" />
      </div>
    </Modal>
  );
};

export default DelayModal;
