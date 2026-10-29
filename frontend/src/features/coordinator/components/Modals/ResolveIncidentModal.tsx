import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, Incident } from '../../types';

interface ResolveIncidentModalProps {
  incident: Incident;
  onClose: () => void;
  onSubmit: (note: string) => Promise<ActionResult>;
}

export const ResolveIncidentModal: React.FC<ResolveIncidentModalProps> = ({ incident, onClose, onSubmit }) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const r = await onSubmit(note);
    if (r.ok) onClose(); else setError(r.message);
  };
  return (
    <Modal open title={`Báo đã khắc phục • ${incident.id}`} okText="Báo đã khắc phục" onOk={submit} onClose={onClose} okDisabled={note.trim().length < 5}>
      <p>Manager sẽ kiểm tra và đóng sự cố.</p>
      <div className="crd-field">
        <label htmlFor="rs-note">Đã khắc phục thế nào *</label>
        <textarea id="rs-note" className="crd-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: đã đổi xe, ngựa ổn định, chuyến tiếp tục lúc 14:30" />
      </div>
      {error && <p className="crd-error" role="alert">{error}</p>}
    </Modal>
  );
};

export default ResolveIncidentModal;
