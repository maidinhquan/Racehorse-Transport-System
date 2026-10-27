import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, DelayProposalRequestDto, Trip } from '../../types';
import { fmtDateTime } from '../../hooks/coordinatorRules';

interface DelayProposalModalProps {
  trip: Trip;
  onClose: () => void;
  onSubmit: (body: DelayProposalRequestDto) => Promise<ActionResult>;
}

/** Coordinator đề xuất lịch khởi hành mới sau khi tài xế báo chậm */
export const DelayProposalModal: React.FC<DelayProposalModalProps> = ({ trip, onClose, onSubmit }) => {
  const [depart, setDepart] = useState(trip.plannedDepart.replace(' ', 'T'));
  const [eta, setEta] = useState(trip.eta.replace(' ', 'T'));
  const [proposal, setProposal] = useState(trip.departureDelay?.reason ?? '');
  const [error, setError] = useState('');

  const submit = async () => {
    const r = await onSubmit({ plannedDepart: depart.replace('T', ' '), eta: eta.replace('T', ' '), proposal });
    if (r.ok) onClose(); else setError(r.message);
  };

  return (
    <Modal open title={`Đề xuất lịch mới • ${trip.id}`} okText="Gửi Manager" onOk={submit} onClose={onClose} okDisabled={!depart || !eta || proposal.trim().length < 10}>
      <p>Lịch cũ: khởi hành <b>{fmtDateTime(trip.departureDelay?.oldDepart ?? trip.plannedDepart)}</b>, đến <b>{fmtDateTime(trip.departureDelay?.oldEta ?? trip.eta)}</b>.</p>
      <div className="crd-field">
        <label htmlFor="dl-depart">Ngày giờ đi mới *</label>
        <input id="dl-depart" className="crd-input" type="datetime-local" value={depart} onChange={(e) => setDepart(e.target.value)} />
      </div>
      <div className="crd-field">
        <label htmlFor="dl-eta">Dự kiến đến mới *</label>
        <input id="dl-eta" className="crd-input" type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
      </div>
      <div className="crd-field">
        <label htmlFor="dl-note">Lý do và phương án *</label>
        <textarea id="dl-note" className="crd-textarea" value={proposal} onChange={(e) => setProposal(e.target.value)} />
      </div>
      {error && <p className="crd-error" role="alert">{error}</p>}
    </Modal>
  );
};

export default DelayProposalModal;
