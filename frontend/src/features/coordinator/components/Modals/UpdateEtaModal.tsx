import React, { useState } from 'react';
import { Modal } from './Modal';
import type { Trip } from '../../types';
import { fmtDateTime } from '../../hooks/coordinatorRules';

interface UpdateEtaModalProps {
  trip: Trip;
  open: boolean;
  onClose: () => void;
  onSubmit: (eta: string, reason: string) => Promise<boolean>;
}

export const UpdateEtaModal: React.FC<UpdateEtaModalProps> = ({ trip, open, onClose, onSubmit }) => {
  const [eta, setEta] = useState(trip.eta.replace(' ', 'T'));
  const [reason, setReason] = useState('');

  const submit = async () => {
    if (await onSubmit(eta.replace('T', ' '), reason)) { setReason(''); onClose(); }
  };

  return (
    <Modal open={open} title={`Cập nhật ETA • ${trip.id}`} okText="Lưu ETA" onOk={submit} onClose={onClose} okDisabled={!eta || reason.trim().length < 5}>
      <p>ETA hiện tại: <b>{fmtDateTime(trip.eta)}</b>. Khách hàng và Manager sẽ nhận thông báo khi ETA thay đổi.</p>
      <div className="crd-field">
        <label htmlFor="crd-eta">ETA mới *</label>
        <input id="crd-eta" className="crd-input" type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
      </div>
      <div className="crd-field">
        <label htmlFor="crd-eta-reason">Lý do *</label>
        <textarea id="crd-eta-reason" className="crd-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Chờ kiểm tra hồ sơ tại cửa khẩu lâu hơn dự kiến" />
      </div>
    </Modal>
  );
};

export default UpdateEtaModal;
