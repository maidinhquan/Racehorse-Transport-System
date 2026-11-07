// Chi tiết chuyến của Điều phối: Tổng quan • Tuyến đường (lập lộ trình) • Xe & nhân sự • Chuyến bay • Theo dõi hành trình
import { AirCard } from '../../../components/air/AirCard';
import { curRoute } from '../../../domain/coordinatorRules';
import type { Any } from '../../../store/coordinatorStore';
import { usd } from '../../../utils/format';
import { airportLabel, charterFlightModal, charterLockMsg, selectAirportsModal, submitAirPlan } from '../../../workflows/airOperations';

export function FlightTab({ t }: { t: Any }) {
  const f = t.flight;
  const rt = curRoute(t);
  const hasAirports = !!(f?.from && f?.to);
  const hasContract = !!(f?.contractNo || f?.bookingRef || f?.flightNo);
  const lock = charterLockMsg(t);

  const isPending = rt?.status === 'PENDING_APPROVAL' || f?.status === 'BUDGET_PENDING';
  const isApproved = rt?.status === 'APPROVED' || f?.status === 'APPROVED' || f?.status === 'BUDGET_APPROVED';
  const isRejected = rt?.status === 'CHANGES_REQUESTED' || rt?.status === 'RETURNED' || f?.status === 'REJECTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {isPending ? (
        <div className="note yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Đã gửi phương án chuyến bay &amp; tuyến lên Manager duyệt</b>
            <div style={{ color: '#78350f', marginTop: 2, fontSize: 12 }}>
              Hãng {f?.airline || 'Vietnam Airlines Cargo'} · Chuyến {f?.flightNo || f?.contractNo || 'VN-9310F'} · Ngân sách {f?.cost ? usd(f.cost) : usd(f?.budget || 6800)}
            </div>
          </div>
          <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600, padding: '4px 10px', borderRadius: 4, fontSize: 12, border: '1px solid #fde68a' }}>
            Chờ Manager duyệt
          </span>
        </div>
      ) : isApproved ? (
        <div className="note green" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Manager đã phê duyệt phương án chuyến bay &amp; tuyến</b>
            <div style={{ color: '#166534', marginTop: 2, fontSize: 12 }}>
              Ngân sách chuyến bay đã được phê duyệt. Điều phối viên có thể tiến hành liên hệ xác nhận đặt chỗ (Booking).
            </div>
          </div>
          <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600, padding: '4px 10px', borderRadius: 4, fontSize: 12, border: '1px solid #bbf7d0' }}>
            Đã duyệt
          </span>
        </div>
      ) : isRejected ? (
        <div className="note red" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Manager yêu cầu điều chỉnh phương án</b>
            <div style={{ color: '#991b1b', marginTop: 2, fontSize: 12 }}>
              {rt?.decisionNote || rt?.note || 'Vui lòng kiểm tra lại lộ trình hoặc dự toán ngân sách.'}
            </div>
          </div>
          <button type="button" className="btn solid sm" onClick={() => submitAirPlan(t.id)}>
            Gửi lại duyệt
          </button>
        </div>
      ) : hasAirports && hasContract ? (
        <div className="card pad" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, color: '#15803d', fontSize: 14 }}>Sẵn sàng gửi Manager phê duyệt chuyến bay</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#166534' }}>
              Thông tin sân bay ({airportLabel(f.from)} → {airportLabel(f.to)}) và hợp đồng charter đã đầy đủ. Gửi phương án tuyến và ngân sách bay để Quản lý xét duyệt.
            </p>
          </div>
          <button
            type="button"
            className="btn solid sm"
            style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}
            onClick={() => submitAirPlan(t.id)}
          >
            Gửi Manager duyệt phương án bay →
          </button>
        </div>
      ) : null}

      {hasAirports && !hasContract ? (
        <div className="note yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <b>Chưa nhập thông tin Hợp đồng Charter</b>
            <div style={{ color: '#78350f', marginTop: 2, fontSize: 12 }}>
              Sân bay: {airportLabel(f.from)} → {airportLabel(f.to)}.{lock ? ` ${lock}` : ' Hoàn tất số HĐ bay và mã số chuồng chuyên dụng (Jet Stall).'}
            </div>
          </div>
          {lock ? null : (
            <button
              type="button"
              className="btn solid sm"
              onClick={() => charterFlightModal(t.id)}
            >
              Nhập HĐ Charter
            </button>
          )}
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

      <AirCard t={t} />
    </div>
  );
}
