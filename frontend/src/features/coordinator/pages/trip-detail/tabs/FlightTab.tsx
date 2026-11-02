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
        <div
          style={{
            padding: '12px 16px',
            background: '#fffbeb',
            border: '1.5px solid #f59e0b',
            borderRadius: 8,
            fontSize: 13,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <b>📋 Bước 2: Hoàn tất thông tin Hợp đồng Charter & Chuồng Jet Stall</b>
            <div style={{ color: '#78350f', marginTop: 3, fontSize: 12 }}>
              Cặp sân bay (<b>{airportLabel(f.from)}</b> ➔ <b>{airportLabel(f.to)}</b>) đã được ghim từ tab Tuyến đường. Hãy bấm nút bên phải để nhập Số HĐ Charter, Hãng bay và Mã số chuồng chuyên dụng (Jet Stall).
            </div>
          </div>
          <button
            type="button"
            className="btn solid"
            style={{ background: '#d97706', color: '#fff', fontWeight: 700 }}
            onClick={() => charterFlightModal(t.id)}
          >
            📋 Nhập HĐ Charter ngay
          </button>
        </div>
      ) : !hasAirports ? (
        <div
          style={{
            padding: '12px 16px',
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: 8,
            fontSize: 13,
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <b>✈️ Bước 1: Chưa chọn cặp sân bay cất / hạ cánh</b>
            <div style={{ color: '#1d4ed8', marginTop: 3, fontSize: 12 }}>
              Bạn có thể chọn nhanh 2 sân bay để hệ thống tự động chia chặng đón tại VN và chặng giao tại nước ngoài.
            </div>
          </div>
          <button
            type="button"
            className="btn solid"
            style={{ background: '#2563eb', color: '#fff', fontWeight: 700 }}
            onClick={() => selectAirportsModal(t.id)}
          >
            ✈️ Chọn sân bay (Cất / Hạ cánh)
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
