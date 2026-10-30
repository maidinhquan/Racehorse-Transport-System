import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, NextMilestone, Trip } from '../../types';
import { MILESTONE_LABEL, nowStamp, toInputValue } from '../../hooks/driverRules';

interface MilestoneModalProps {
  trip: Trip;
  next: NextMilestone;
  onClose: () => void;
  onSubmit: (at: string, note: string) => Promise<ActionResult>;
}

/** Ghi nhận mốc hành trình – tài xế tự nhập, không gửi toạ độ GPS */
export const MilestoneModal: React.FC<MilestoneModalProps> = ({ trip, next, onClose, onSubmit }) => {
  const [at, setAt] = useState(toInputValue(nowStamp()));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const stop = trip.stops[next.stopIndex];

  const submit = async () => {
    const r = await onSubmit(at, note);
    if (r.ok) onClose(); else setError(r.message);
  };

  return (
    <Modal open title={MILESTONE_LABEL[next.type]} okText="Ghi nhận mốc" onOk={submit} onClose={onClose} okDisabled={!at} error={error}>
      <p><b>{stop?.name}</b>. Bạn ghi nhận thủ công; hệ thống không gửi vị trí GPS.</p>
      <div className="drv-field">
        <label htmlFor="drv-ms-at">Thời điểm *</label>
        <input id="drv-ms-at" className="drv-input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </div>
      <div className="drv-field">
        <label htmlFor="drv-ms-note">Ghi chú</label>
        <input id="drv-ms-note" className="drv-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc, VD: ngựa bình tĩnh, xếp hàng ngắn" />
      </div>
    </Modal>
  );
};

export default MilestoneModal;
