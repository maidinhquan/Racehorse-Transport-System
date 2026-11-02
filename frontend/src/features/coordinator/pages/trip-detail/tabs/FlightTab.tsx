// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { AirCard } from '../../../components/air/AirCard';
import type { Any } from '../../../store/coordinatorStore';
import { airportLabel, charterFlightModal, selectAirportsModal } from '../../../workflows/airOperations';

export function FlightTab({ t }: { t: Any }) {
  const f = t.flight;
  const hasAirports = !!(f?.from && f?.to);
  const hasContract = !!(f?.contractNo || f?.bookingRef || f?.flightNo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hasAirports && !hasContract ? (
        <div className="note yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Chưa nhập thông tin Hợp đồng Charter</b>
            <div style={{ color: '#78350f', marginTop: 2, fontSize: 12 }}>
              Sân bay: {airportLabel(f.from)} → {airportLabel(f.to)}. Hoàn tất số HĐ bay và mã số chuồng chuyên dụng (Jet Stall).
            </div>
          </div>
          <button
            type="button"
            className="btn solid sm"
            onClick={() => charterFlightModal(t.id)}
          >
            Nhập HĐ Charter
          </button>
        </div>
      ) : !hasAirports ? (
        <div className="note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>Chưa chọn cặp sân bay cất / hạ cánh cho chuyến đi.</div>
          <button
            type="button"
            className="btn solid sm"
            onClick={() => selectAirportsModal(t.id)}
          >
            Chọn sân bay
          </button>
        </div>
      ) : null}

      <div className="grid2">
        <AirCard t={t} />
        <div className="card">
          <h3 className="card-title">Quy tắc chuyến bay</h3>
          <ul style={{ margin: '10px 0 0 16px', fontSize: 12, lineHeight: 1.8 }}>
            <li>Chỉ bay thẳng; không nối chuyến.</li>
            <li>Sân bay đi và sân bay đến phải thuộc đúng quốc gia của chặng.</li>
            <li>Quản lý duyệt ngân sách chuyến bay trước khi đặt chỗ.</li>
            <li>Giờ cất cánh và hạ cánh được ghi nhận thủ công theo thông tin của hãng bay.</li>
            <li>Đơn vị bay chuyên chở ngựa chăm sóc ngựa và hỗ trợ thú y trên chuyến bay. Bác sĩ thú y mặt đất phụ trách bàn giao tại mỗi sân bay.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
