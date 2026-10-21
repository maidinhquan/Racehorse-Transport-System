import React, { useState } from 'react';
import { Modal } from './Modal';
import type { FlightProposalRequestDto, Trip } from '../../types';

interface FlightModalProps {
  trip: Trip;
  /** 'propose' = đề xuất phương án bay; 'book' = nhập mã đặt chỗ */
  mode: 'propose' | 'book';
  open: boolean;
  onClose: () => void;
  onPropose: (body: FlightProposalRequestDto) => Promise<boolean>;
  onBook: (bookingRef: string) => Promise<boolean>;
}

export const FlightModal: React.FC<FlightModalProps> = ({ trip, mode, open, onClose, onPropose, onBook }) => {
  const f = trip.flight;
  const airports = trip.route.stops.filter((s) => s.type === 'AIRPORT').map((s) => s.name);
  const [form, setForm] = useState<FlightProposalRequestDto>({
    airline: f?.airline ?? '',
    flightNo: f?.flightNo ?? '',
    fromAirport: f?.fromAirport ?? airports[0] ?? '',
    toAirport: f?.toAirport ?? airports[airports.length - 1] ?? '',
    departAt: (f?.departAt ?? trip.plannedDepart).replace(' ', 'T'),
    arriveAt: (f?.arriveAt ?? trip.eta).replace(' ', 'T'),
    cost: f?.cost ?? 0,
  });
  const [bookingRef, setBookingRef] = useState('');
  const set = (k: keyof FlightProposalRequestDto, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  if (mode === 'book') {
    return (
      <Modal open={open} title={`Nhập xác nhận đặt chỗ • ${trip.id}`} okText="Lưu mã đặt chỗ" onClose={onClose}
        onOk={async () => { if (await onBook(bookingRef)) onClose(); }} okDisabled={bookingRef.trim().length < 4}>
        <p>{f?.airline} • {f?.flightNo}. Nhập mã đặt chỗ hãng bay đã xác nhận.</p>
        <div className="crd-field">
          <label htmlFor="crd-booking">Mã đặt chỗ *</label>
          <input id="crd-booking" className="crd-input" value={bookingRef} onChange={(e) => setBookingRef(e.target.value)} placeholder="VD: VNC-EQ-55210" />
        </div>
      </Modal>
    );
  }

  const submit = async () => {
    const ok = await onPropose({ ...form, departAt: form.departAt.replace('T', ' '), arriveAt: form.arriveAt.replace('T', ' '), cost: Number(form.cost) });
    if (ok) onClose();
  };

  return (
    <Modal open={open} title={`${f ? 'Sửa' : 'Đề xuất'} phương án bay • ${trip.id}`} okText="Gửi Manager duyệt ngân sách" onOk={submit} onClose={onClose} wide>
      <p>Chỉ bay thẳng, không quá cảnh. Hãng hàng không thuê ngoài bố trí nhân sự chăm sóc ngựa trên máy bay.</p>
      <div className="crd-modal__grid">
        <div className="crd-field"><label>Hãng bay *</label><input className="crd-input" value={form.airline} onChange={(e) => set('airline', e.target.value)} /></div>
        <div className="crd-field"><label>Số hiệu chuyến bay *</label><input className="crd-input" value={form.flightNo} onChange={(e) => set('flightNo', e.target.value)} /></div>
        <div className="crd-field"><label>Sân bay đi *</label><input className="crd-input" value={form.fromAirport} onChange={(e) => set('fromAirport', e.target.value)} /></div>
        <div className="crd-field"><label>Sân bay đến *</label><input className="crd-input" value={form.toAirport} onChange={(e) => set('toAirport', e.target.value)} /></div>
        <div className="crd-field"><label>Giờ cất cánh *</label><input className="crd-input" type="datetime-local" value={form.departAt} onChange={(e) => set('departAt', e.target.value)} /></div>
        <div className="crd-field"><label>Giờ hạ cánh *</label><input className="crd-input" type="datetime-local" value={form.arriveAt} onChange={(e) => set('arriveAt', e.target.value)} /></div>
        <div className="crd-field"><label>Ngân sách thuê bay (USD) *</label><input className="crd-input" type="number" min={1} value={form.cost} onChange={(e) => set('cost', Number(e.target.value))} /></div>
      </div>
    </Modal>
  );
};

export default FlightModal;
