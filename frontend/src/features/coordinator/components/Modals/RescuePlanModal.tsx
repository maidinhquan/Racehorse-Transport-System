import React, { useState } from 'react';
import { Modal } from './Modal';
import type { ActionResult, Incident, PlanPayer, RescueKind, RescuePlanRequestDto, Trip, Vehicle } from '../../types';
import { INCIDENT_TYPE_LABEL, PAYER_LABEL, RESCUE_KIND_LABEL, planNeedsApproval, suggestKind, whereNow } from '../../hooks/coordinatorRules';

interface RescuePlanModalProps {
  incident: Incident;
  trip: Trip;
  backups: Vehicle[];
  onClose: () => void;
  onSubmit: (body: RescuePlanRequestDto) => Promise<ActionResult>;
}

/** Gợi ý nội dung, chi phí (USD) và số giờ trễ theo loại phương án */
const defaults = (kind: RescueKind, trip: Trip, v?: Vehicle): [string, number, number] => {
  const at = whereNow(trip).replace(/^Tại |^Trên tuyến /, '');
  if (kind === 'VEHICLE_CHANGE') return v ? [`Điều xe dự phòng ${v.plate} (${v.model}) từ ${v.base} tới ${at}, chuyển ngựa sang xe mới rồi tiếp tục hành trình.`, 180, 4] : ['', 0, 0];
  if (kind === 'EXTERNAL_RESCUE') return [`Thuê xe cẩu / cứu hộ lưu động tới ${at}; ngựa ở lại trong thùng xe có thông gió, bác sĩ thú y theo dõi trong lúc chờ.`, 250, 5];
  if (kind === 'ROUTE_ADJUSTMENT') return ['Đổi lộ trình tránh đoạn bị ảnh hưởng, thêm điểm dừng nghỉ cho ngựa; cập nhật tuyến mới cho tổ xe.', 0, 2];
  if (kind === 'EMERGENCY_VET') return [`Đưa ngựa tới trạm thú y cấp cứu gần ${at} để khám và điều trị; bác sĩ đi kèm báo kết quả trước khi đi tiếp.`, 150, 3];
  return ['Thay nhân sự cho tổ xe, người thay thế tới điểm hẹn gần nhất.', 0, 1];
};

export const RescuePlanModal: React.FC<RescuePlanModalProps> = ({ incident, trip, backups, onClose, onSubmit }) => {
  const initKind = suggestKind(incident.type);
  const initDef = defaults(initKind, trip, backups[0]);
  const [kind, setKind] = useState<RescueKind>(initKind);
  const [vehicleId, setVehicleId] = useState(backups[0]?.id ?? '');
  const [desc, setDesc] = useState(initDef[0]);
  const [cost, setCost] = useState(String(initDef[1]));
  const [etaHours, setEtaHours] = useState(String(initDef[2]));
  const [payer, setPayer] = useState<PlanPayer>('COMPANY');
  const [error, setError] = useState('');

  const fill = (k: RescueKind, vid: string) => {
    const [d, c, h] = defaults(k, trip, backups.find((v) => v.id === vid));
    if (d) { setDesc(d); setCost(String(c)); setEtaHours(String(h)); }
  };

  const body: RescuePlanRequestDto = {
    kind, desc, cost: Number(cost) || 0, etaHours: Number(etaHours) || 0, payer,
    backupVehicleId: kind === 'VEHICLE_CHANGE' && vehicleId ? vehicleId : undefined,
  };
  const submit = async () => {
    const r = await onSubmit(body);
    if (r.ok) onClose(); else setError(r.message);
  };

  return (
    <Modal open wide title={`Phương án giải cứu / thay thế – ${incident.id}`} okText="Gửi đề xuất" onOk={submit} onClose={onClose} okDisabled={desc.trim().length < 10}>
      <p className="crd-muted" style={{ marginTop: 0 }}>{INCIDENT_TYPE_LABEL[incident.type] ?? incident.type} • {incident.location ?? '—'} • {trip.id}. Vị trí ước tính: {whereNow(trip)}.</p>
      <div className="crd-field">
        <label htmlFor="rs-kind">Loại phương án *</label>
        <select id="rs-kind" className="crd-select" value={kind} onChange={(e) => { const k = e.target.value as RescueKind; setKind(k); fill(k, vehicleId); }}>
          {(Object.keys(RESCUE_KIND_LABEL) as RescueKind[]).map((k) => <option key={k} value={k}>{RESCUE_KIND_LABEL[k]}</option>)}
        </select>
      </div>
      {kind === 'VEHICLE_CHANGE' && (backups.length ? (
        <div className="crd-field">
          <label htmlFor="rs-veh">Xe dự phòng *</label>
          <select id="rs-veh" className="crd-select" value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); fill(kind, e.target.value); }}>
            {backups.map((v) => <option key={v.id} value={v.id}>{v.plate} • {v.model} • {v.stalls} ngăn • căn cứ {v.base}</option>)}
          </select>
          <small className="crd-muted">Chỉ hiện xe Sẵn sàng, đủ ngăn cho số ngựa và không trùng lịch chuyến khác.</small>
        </div>
      ) : <div className="crd-note crd-note--red"><div><b>Không có xe dự phòng hợp lệ</b>Cân nhắc thuê xe đối tác (ghi vào nội dung phương án).</div></div>)}
      <div className="crd-field">
        <label htmlFor="rs-desc">Nội dung phương án *</label>
        <textarea id="rs-desc" className="crd-textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Việc cần làm, ai làm, thời gian, ảnh hưởng tới ETA" />
      </div>
      <div className="crd-rescue-grid">
        <div className="crd-field">
          <label htmlFor="rs-cost">Chi phí phát sinh (USD) *</label>
          <input id="rs-cost" className="crd-input" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div className="crd-field">
          <label htmlFor="rs-payer">Bên chi trả *</label>
          <select id="rs-payer" className="crd-select" value={payer} onChange={(e) => setPayer(e.target.value as PlanPayer)}>
            {(Object.keys(PAYER_LABEL) as PlanPayer[]).map((k) => <option key={k} value={k}>{PAYER_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="crd-field">
          <label htmlFor="rs-eta">Trễ ETA (giờ) *</label>
          <input id="rs-eta" className="crd-input" type="number" min="0" max="72" step="0.5" value={etaHours} onChange={(e) => setEtaHours(e.target.value)} />
        </div>
      </div>
      <p className="crd-muted">
        {planNeedsApproval(body) ? 'Phương án này cần Logistics Manager phê duyệt trước khi thực hiện / thanh toán.' : 'Không phát sinh chi phí hay trễ ETA: phương án được áp dụng ngay.'} Cứu hộ khẩn cấp cho người và ngựa không cần chờ duyệt.
      </p>
      {error && <p className="crd-error" role="alert">{error}</p>}
    </Modal>
  );
};

export default RescuePlanModal;
