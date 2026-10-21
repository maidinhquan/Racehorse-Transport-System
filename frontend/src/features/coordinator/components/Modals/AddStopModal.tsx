import React, { useState } from 'react';
import { Modal } from './Modal';
import type { RouteStop, StopType } from '../../types';
import { STOP_LABEL } from '../../hooks/coordinatorRules';
import { COUNTRY_NAME } from '../../data/mockData';

interface AddStopModalProps {
  open: boolean;
  defaultCountry: string;
  defaultTime: string;
  hasOrigin: boolean;
  hasDestination: boolean;
  onClose: () => void;
  onSubmit: (stop: Omit<RouteStop, 'id'>) => boolean;
}

export const AddStopModal: React.FC<AddStopModalProps> = ({ open, defaultCountry, defaultTime, hasOrigin, hasDestination, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<StopType>(hasOrigin ? 'REST_STOP' : 'ORIGIN');
  const [country, setCountry] = useState(defaultCountry);
  const [plannedAt, setPlannedAt] = useState(defaultTime.replace(' ', 'T'));

  const types = (Object.keys(STOP_LABEL) as StopType[]).filter(
    (t) => !(t === 'ORIGIN' && hasOrigin) && !(t === 'DESTINATION' && hasDestination),
  );

  const submit = () => {
    if (onSubmit({ name: name.trim(), type, country, plannedAt: plannedAt.replace('T', ' ') })) { setName(''); onClose(); }
  };

  return (
    <Modal open={open} title="Thêm điểm dừng" okText="Thêm vào tuyến" onOk={submit} onClose={onClose} okDisabled={name.trim().length < 3 || !plannedAt}>
      <div className="crd-field">
        <label htmlFor="crd-stop-name">Tên điểm dừng *</label>
        <input id="crd-stop-name" className="crd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Trạm nghỉ Trảng Bàng" />
      </div>
      <div className="crd-modal__grid">
        <div className="crd-field">
          <label htmlFor="crd-stop-type">Loại điểm *</label>
          <select id="crd-stop-type" className="crd-select" value={type} onChange={(e) => setType(e.target.value as StopType)}>
            {types.map((t) => <option key={t} value={t}>{STOP_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="crd-field">
          <label htmlFor="crd-stop-country">Quốc gia *</label>
          <select id="crd-stop-country" className="crd-select" value={country} onChange={(e) => setCountry(e.target.value)}>
            {Object.entries(COUNTRY_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="crd-field">
        <label htmlFor="crd-stop-time">Thời gian dự kiến *</label>
        <input id="crd-stop-time" className="crd-input" type="datetime-local" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
      </div>
    </Modal>
  );
};

export default AddStopModal;
