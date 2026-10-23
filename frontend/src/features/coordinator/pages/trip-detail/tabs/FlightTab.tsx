import React, { useState } from 'react';
import type { Trip } from '../../../types';
import { useCoordinator } from '../../../hooks/useCoordinator';
import { canPlan, fmtDateTime } from '../../../hooks/coordinatorRules';
import { TripStatusBadge } from '../../../components/TripStatusBadge/TripStatusBadge';
import { FlightModal } from '../../../components/Modals';

export const FlightTab: React.FC<{ trip: Trip }> = ({ trip }) => {
  const { actions } = useCoordinator();
  const [modal, setModal] = useState<'propose' | 'book' | null>(null);
  const f = trip.flight, editable = canPlan(trip);

  return (
    <div className="crd-grid2">
      <div className="crd-card">
        <h3 className="crd-card__title"><span>Phương án bay</span>{f ? <TripStatusBadge status={f.status} /> : <TripStatusBadge tone="muted" label="Chưa lập" />}</h3>
        {f ? (
          <div className="crd-kv">
            <div><span>Hãng bay</span><b>{f.airline}</b></div>
            <div><span>Số hiệu</span><b>{f.flightNo}</b></div>
            <div><span>Sân bay đi</span><b>{f.fromAirport}</b></div>
            <div><span>Sân bay đến</span><b>{f.toAirport}</b></div>
            <div><span>Cất cánh</span><b>{fmtDateTime(f.departAt)}</b></div>
            <div><span>Hạ cánh</span><b>{fmtDateTime(f.arriveAt)}</b></div>
            <div><span>Ngân sách</span><b>{f.cost.toLocaleString('en-US')} USD</b></div>
            <div><span>Mã đặt chỗ</span><b>{f.bookingRef ?? 'Chưa có'}</b></div>
          </div>
        ) : <p className="crd-muted">Chưa có phương án bay. Chỉ bay thẳng, không quá cảnh.</p>}

        <div className="crd-btn-row">
          {editable && (!f || ['DRAFT', 'REJECTED'].includes(f.status)) && (
            <button type="button" className="crd-btn crd-btn--solid" onClick={() => setModal('propose')}>{f ? 'Sửa phương án bay' : 'Đề xuất chuyến bay'}</button>
          )}
          {editable && f?.status === 'BUDGET_APPROVED' && (
            <button type="button" className="crd-btn crd-btn--solid" onClick={() => setModal('book')}>Nhập xác nhận đặt chỗ</button>
          )}
        </div>

        {f?.status === 'BUDGET_PENDING' && (
          <div className="crd-demo">
            <div className="crd-demo__title">Điều khiển demo</div>
            <p>Giả lập Manager duyệt ngân sách thuê bay.</p>
            <button type="button" className="crd-btn crd-btn--sm" onClick={() => actions.demoApproveFlightBudget(trip.id)}>Demo: Manager duyệt ngân sách</button>
          </div>
        )}
      </div>

      <div className="crd-card">
        <h3 className="crd-card__title">Quy định chuyến bay</h3>
        <ul className="crd-gap-list crd-gap-list--plain">
          <li>Chỉ bay thẳng, không quá cảnh.</li>
          <li>Sân bay đi/đến phải đúng quốc gia của chặng.</li>
          <li>Manager duyệt ngân sách trước khi đặt chỗ.</li>
          <li>Giờ cất cánh/hạ cánh thực tế do tổ xe ghi nhận.</li>
          <li>Hãng bay chuyên chở ngựa lo chăm sóc và hỗ trợ thú y trên máy bay; bác sĩ mặt đất bàn giao tại mỗi sân bay.</li>
        </ul>
      </div>

      {modal && (
        <FlightModal
          trip={trip}
          mode={modal}
          open
          onClose={() => setModal(null)}
          onPropose={async (body) => (await actions.proposeFlight(trip.id, body)).ok}
          onBook={async (ref) => (await actions.bookFlight(trip.id, ref)).ok}
        />
      )}
    </div>
  );
};

export default FlightTab;
