// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { AirCard } from '../../../components/air/AirCard';
import type { Any } from '../../../store/coordinatorStore';

export function FlightTab({ t }: { t: Any }) {
  return (
    <div className="grid2"><AirCard t={t} />
      <div className="card"><h3 className="card-title">Quy tắc chuyến bay</h3>
        <ul style={{ margin: '10px 0 0 16px', fontSize: 12, lineHeight: 1.8 }}>
          <li>Chỉ bay thẳng; không nối chuyến.</li><li>Sân bay đi và sân bay đến phải thuộc đúng quốc gia của chặng.</li><li>Quản lý duyệt ngân sách chuyến bay trước khi đặt chỗ.</li><li>Giờ cất cánh và hạ cánh được ghi nhận thủ công theo thông tin của hãng bay.</li>
          <li>Đơn vị bay chuyên chở ngựa chăm sóc ngựa và hỗ trợ thú y trên chuyến bay. Bác sĩ thú y mặt đất phụ trách bàn giao tại mỗi sân bay.</li>
        </ul>
      </div>
    </div>
  );
}
