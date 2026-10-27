import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult } from '../../types';

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  okText: string;
  onClose: () => void;
  onConfirm: () => Promise<ActionResult>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, okText, onClose, onConfirm }) => {
  const [error, setError] = useState('');
  const submit = async () => {
    const r = await onConfirm();
    if (r.ok) onClose(); else setError(r.message);
  };
  return (
    <Modal open title={title} okText={okText} onOk={submit} onClose={onClose} error={error}>
      <p>{message}</p>
    </Modal>
  );
};

export default ConfirmModal;
