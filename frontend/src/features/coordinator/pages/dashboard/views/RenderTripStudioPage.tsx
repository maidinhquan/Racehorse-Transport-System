import React from 'react';
import type { MockTrip } from './coordinator.types';
import { RenderGroundLegCard } from './RenderGroundLegCard';

interface RenderTripStudioPageProps {
  curTrip: MockTrip;
  tripTab: 'overview' | 'route' | 'resources' | 'flight' | 'milestones';
  setTripTab: (tab: 'overview' | 'route' | 'resources' | 'flight' | 'milestones') => void;
  lang: 'vi' | 'en';
  truckPos: { lat: number; lng: number };
  onBack: () => void;
  onSetGroundVehicle: (leg: 'outbound' | 'inbound', vehicleId: string) => void;
  onSetGroundCrew: (leg: 'outbound' | 'inbound', role: 'mainDriver' | 'coDriver' | 'vet', staffId: string) => void;
  onConfirmResources: () => void;
  onSubmitRoute: () => void;
  onDemoDeploy: () => void;
  onDemoApprove: () => void;
  onDemoReturn: () => void;
}

export const RenderTripStudioPage: React.FC<RenderTripStudioPageProps> = ({
  curTrip,
  tripTab,
  setTripTab,
  lang,
  truckPos,
  onBack,
  onSetGroundVehicle,
  onSetGroundCrew,
  onConfirmResources,
  onSubmitRoute,
  onDemoDeploy,
  onDemoApprove,
  onDemoReturn,
}) => {
  return (
    <div className="render-trip-studio-page">
      <button className="link back" onClick={onBack}>
        ← {lang === 'vi' ? 'Quay lại danh sách Trip Planning' : 'Back to Trip Planning'}
      </button>

      <div className="head">
        <div>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {curTrip.id}
            <span className={`pill ${curTrip.deploymentStatus === 'CONFIRMED' ? 'READY' : 'PENDING'}`}>
              {curTrip.deploymentStatus}
            </span>
          </h2>
          <p className="subtitle">
            {curTrip.requestId} • {curTrip.origin} ➔ {curTrip.destination} • {curTrip.mode} • Khởi hành: {curTrip.plannedDepart}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className={`pill ${curTrip.resourcesConfirmed ? 'READY' : 'NOT_READY'}`}>
            {curTrip.resourcesConfirmed ? '✓ Planning complete' : 'Chưa hoàn tất nguồn lực'}
          </span>
        </div>
      </div>

      {/* Tab switcher: Overview, Route, Vehicle & crew, Flight, Milestones */}
      <div className="rtabs">
        <button className={tripTab === 'overview' ? 'on' : ''} onClick={() => setTripTab('overview')}>
          Overview
        </button>
        <button className={tripTab === 'route' ? 'on' : ''} onClick={() => setTripTab('route')}>
          Route ({curTrip.stops.length} stops)
        </button>
        <button className={tripTab === 'resources' ? 'on' : ''} onClick={() => setTripTab('resources')}>
          Vehicle & crew (2 Chặng Độc Lập)
        </button>
        {curTrip.mode === 'AIR' && (
          <button className={tripTab === 'flight' ? 'on' : ''} onClick={() => setTripTab('flight')}>
            Flight Charter
          </button>
        )}
        <button className={tripTab === 'milestones' ? 'on' : ''} onClick={() => setTripTab('milestones')}>
          Milestones & Bản đồ
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {tripTab === 'overview' && (
        <div className="grid-main">
          <div className="stack">
            <div className="card pad">
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Trip overview</h3>
              <div className="kv2">
                <div className="kv-item"><span>Mã chuyến đi:</span><strong>{curTrip.id}</strong></div>
                <div className="kv-item"><span>Yêu cầu vận chuyển:</span><strong>{curTrip.requestId}</strong></div>
                <div className="kv-item"><span>Khách hàng:</span><strong>{curTrip.customer}</strong></div>
                <div className="kv-item"><span>Phương thức:</span><strong>{curTrip.mode}</strong></div>
                <div className="kv-item"><span>Số lượng ngựa:</span><strong>{curTrip.horses} cá thể</strong></div>
                <div className="kv-item"><span>Ngày khởi hành:</span><strong>{curTrip.plannedDepart}</strong></div>
                <div className="kv-item"><span>Dự kiến đến (ETA):</span><strong>{curTrip.eta}</strong></div>
                <div className="kv-item"><span>Phê duyệt tuyến:</span><strong>{curTrip.routeStatus}</strong></div>
              </div>
            </div>

            <div className="card pad">
              <h3 className="card-title">Bước xử lý tiếp theo</h3>
              <p className="subtitle" style={{ margin: '8px 0 16px' }}>
                {!curTrip.resourcesConfirmed
                  ? 'Coordinator cần kiểm tra xe và 3 nhân sự độc lập cho từng chặng, sau đó bấm Xác nhận nguồn lực.'
                  : curTrip.routeStatus === 'DRAFT'
                  ? 'Nguồn lực đã sẵn sàng. Hãy nộp tuyến đường cho Logistics Manager phê duyệt.'
                  : curTrip.routeStatus === 'PENDING_APPROVAL'
                  ? 'Tuyến đang chờ Logistics Manager phê duyệt.'
                  : 'Tuyến đã được phê duyệt! Sẵn sàng xuất phát khi đến ngày.'}
              </p>
              <div className="btn-row">
                <button className="btn solid" onClick={() => setTripTab('resources')}>Mở tab Xe & Nhân sự</button>
                <button className="btn ghost" onClick={() => setTripTab('route')}>Xem Lộ trình</button>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card pad">
              <div className="eyebrow">Điểm nhận & Bàn giao</div>
              <div style={{ marginTop: '12px' }}>
                <b style={{ color: 'var(--ink)' }}>Nơi xuất phát:</b>
                <p style={{ margin: '4px 0 12px', color: 'var(--text)' }}>{curTrip.origin}</p>
                <b style={{ color: 'var(--ink)' }}>Điểm đến:</b>
                <p style={{ margin: '4px 0', color: 'var(--text)' }}>{curTrip.destination}</p>
              </div>
            </div>

            {/* Demo Controls Card */}
            <div className="card demo">
              <div className="eyebrow">Demo Controls</div>
              <div className="btn-row">
                <button className="btn ghost sm" onClick={onDemoDeploy}>Manager duyệt triển khai</button>
                <button className="btn ghost sm" onClick={onDemoApprove}>Manager duyệt tuyến</button>
                <button className="btn ghost sm" onClick={onDemoReturn}>Manager trả về sửa</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROUTE */}
      {tripTab === 'route' && (
        <div className="grid-main">
          <div className="stack">
            <div className="card pad">
              <div className="section-title">
                <h3 className="card-title">Lộ trình & Các trạm dừng (Route stops)</h3>
                <span className={`pill ${curTrip.routeStatus === 'APPROVED' ? 'APPROVED' : 'DRAFT'}`}>
                  v1 • {curTrip.routeStatus}
                </span>
              </div>

              <ul className="stop-list">
                {curTrip.stops.map((stop, index) => (
                  <li key={stop.id}>
                    <span
                      className="stop-badge"
                      style={{
                        background:
                          index === 0
                            ? '#16a34a'
                            : index === curTrip.stops.length - 1
                            ? '#dc2626'
                            : '#2563eb',
                      }}
                    >
                      {index + 1}
                    </span>
                    <div className="stop-edit">
                      <input value={stop.name} readOnly />
                      <select value={stop.type} disabled>
                        <option value="ORIGIN">Origin</option>
                        <option value="REST_STOP">Rest Stop</option>
                        <option value="CHECKPOINT">Checkpoint</option>
                        <option value="AIRPORT">Airport</option>
                        <option value="DESTINATION">Destination</option>
                      </select>
                      <input type="datetime-local" value={stop.plannedAt} readOnly />
                      <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center' }}>
                        {stop.cp || 'Trạm thường'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="btn-row" style={{ marginTop: '16px' }}>
                <button
                  className="btn solid"
                  disabled={curTrip.routeStatus === 'PENDING_APPROVAL' || curTrip.routeStatus === 'APPROVED'}
                  onClick={onSubmitRoute}
                >
                  {curTrip.routeStatus === 'PENDING_APPROVAL'
                    ? '⏳ Đang chờ Manager phê duyệt'
                    : curTrip.routeStatus === 'APPROVED'
                    ? '✓ Tuyến đã được phê duyệt'
                    : 'Nộp tuyến cho Manager phê duyệt'}
                </button>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card pad">
              <div className="eyebrow">Quy tắc lập lộ trình</div>
              <ul style={{ margin: '10px 0 0 16px', fontSize: '12px', lineHeight: '1.8', color: 'var(--muted)' }}>
                <li>Điểm đầu tiên là Nơi nhận và điểm cuối là Điểm giao ngựa.</li>
                <li>Thời gian các trạm dừng phải tăng dần theo chiều tiến của chuyến đi.</li>
                <li>Đường hàng không: một chuyến bay thẳng, gồm đúng 2 trạm sân bay kết nối.</li>
                <li>Mỗi chặng đường bộ dài trên 4 tiếng phải có trạm dừng nghỉ ngơi & tiếp nước.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VEHICLE & CREW (Hai chặng đường bộ độc lập) */}
      {tripTab === 'resources' && (
        <div>
          {curTrip.mode === 'AIR' && (
            <div className="cbn-air-strip">
              <b>Phương án B – Đường bộ trước/sau chuyến bay:</b> Mỗi chặng có một xe, tài xế chính, phụ lái kiêm Escort và bác sĩ thú y riêng. Bác sĩ A bàn giao tại sân bay đi; bác sĩ B nhận bàn giao tại sân bay đến. <b>Hãng hàng không thuê ngoài</b> bố trí nhân sự chăm sóc ngựa và phương án hỗ trợ thú y trên máy bay, không yêu cầu bác sĩ CBN bay cùng.
            </div>
          )}

          <div className="cbn-road-stack">
            <RenderGroundLegCard
              leg="outbound"
              curTrip={curTrip}
              onSetGroundVehicle={onSetGroundVehicle}
              onSetGroundCrew={onSetGroundCrew}
            />
            {curTrip.mode === 'AIR' && (
              <RenderGroundLegCard
                leg="inbound"
                curTrip={curTrip}
                onSetGroundVehicle={onSetGroundVehicle}
                onSetGroundCrew={onSetGroundCrew}
              />
            )}
          </div>

          {/* Khối Xác nhận điều phối Operations READY */}
          <div className="card pad" style={{ marginTop: '20px' }}>
            <div className="section-title">
              <h3 className="card-title">Xác nhận bố trí phương tiện & nhân sự</h3>
              <span className={`pill ${curTrip.resourcesConfirmed ? 'READY' : 'PENDING'}`}>
                {curTrip.resourcesConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
              </span>
            </div>
            <p className="subtitle">
              Coordinator chịu trách nhiệm chọn xe đủ chỗ và đủ 3 vị trí nhân sự cho mỗi chặng đường bộ. Logistics Manager sẽ kiểm tra chứng chỉ trước khi phê duyệt khởi hành.
            </p>

            <div className="btn-row" style={{ marginTop: '16px' }}>
              <button
                className={`btn ${curTrip.resourcesConfirmed ? 'soft' : 'solid'}`}
                disabled={curTrip.resourcesConfirmed}
                onClick={onConfirmResources}
              >
                {curTrip.resourcesConfirmed
                  ? '✓ Đã xác nhận nguồn lực (Operations READY)'
                  : 'Xác nhận nguồn lực (Operations READY)'}
              </button>

              <button
                className="btn solid"
                disabled={!curTrip.resourcesConfirmed || curTrip.routeStatus !== 'DRAFT'}
                onClick={onSubmitRoute}
              >
                Gửi Kế Hoạch Cho Logistics Manager Phê Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FLIGHT CHARTER */}
      {tripTab === 'flight' && curTrip.flight && (
        <div className="grid-main">
          <div className="stack">
            <div className="card pad">
              <div className="section-title">
                <h3 className="card-title">Chi tiết chuyến bay thuê chuyến (Charter Flight)</h3>
                <span className="pill READY">BOOKED</span>
              </div>
              <div className="kv2" style={{ marginTop: '12px' }}>
                <div className="kv-item"><span>Hãng hàng không:</span><strong>{curTrip.flight.airline}</strong></div>
                <div className="kv-item"><span>Số hiệu chuyến bay:</span><strong>{curTrip.flight.flightNo}</strong></div>
                <div className="kv-item"><span>Sân bay đi:</span><strong>{curTrip.flight.fromAirport}</strong></div>
                <div className="kv-item"><span>Sân bay đến:</span><strong>{curTrip.flight.toAirport}</strong></div>
                <div className="kv-item"><span>Giờ cất cánh:</span><strong>{curTrip.flight.departAt}</strong></div>
                <div className="kv-item"><span>Giờ hạ cánh:</span><strong>{curTrip.flight.arriveAt}</strong></div>
                <div className="kv-item"><span>Chi phí thuê:</span><strong style={{ color: 'var(--orange-text)' }}>${curTrip.flight.cost.toLocaleString()} USD</strong></div>
                <div className="kv-item"><span>Mã đặt chỗ:</span><strong>{curTrip.flight.bookingRef}</strong></div>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card pad">
              <div className="eyebrow">Quy tắc hàng không</div>
              <p className="subtitle" style={{ fontSize: '12px', lineHeight: '1.7' }}>
                Bay thẳng, không quá cảnh. Dịch vụ chuyên dụng của hãng bay bố trí chuồng bay (jet stalls) có điều áp, quạt thông gió và nhân viên chăm sóc đi cùng trên khoang hàng.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MILESTONES & LIVE MAP MONITORING */}
      {tripTab === 'milestones' && (
        <div className="card pad">
          <div className="section-title">
            <h3 className="card-title">Giám sát vị trí thời gian thực & Lộ trình (Live Map)</h3>
            <span className="pill IN_TRANSIT">● Live Telemetry</span>
          </div>
          <p className="subtitle">Mô phỏng dữ liệu tọa độ GPS phương tiện và trạm dừng từ Backend API.</p>

          <div className="map-layout">
            <div className="map-view">
              <div className="map-polyline"></div>

              {curTrip.stops.map((s, idx) => {
                const leftPercent = 12 + (idx * 76) / (curTrip.stops.length - 1 || 1);
                return (
                  <div key={s.id} className="map-marker" style={{ left: `${leftPercent}%` }}>
                    <div
                      className="marker-icon"
                      style={{
                        borderColor:
                          idx === 0
                            ? '#16a34a'
                            : idx === curTrip.stops.length - 1
                            ? '#dc2626'
                            : '#2563eb',
                      }}
                    >
                      {idx === 0 ? '📍' : idx === curTrip.stops.length - 1 ? '🏁' : s.type === 'AIRPORT' ? '✈️' : '🅿️'}
                    </div>
                    <span className="marker-label">{s.name.split('(')[0].trim()}</span>
                  </div>
                );
              })}

              <div className="map-truck" title="Xe đang di chuyển">
                🚛
              </div>
            </div>

            <div className="map-data-panel">
              <div style={{ color: '#93c5fd', marginBottom: '8px', fontWeight: 600 }}>🛰️ GPS DATA STREAM</div>
              <pre style={{ margin: 0 }}>
{`vehiclePosition = {
  lat: ${truckPos.lat.toFixed(4)},
  lng: ${truckPos.lng.toFixed(4)},
  status: "Moving • 65 km/h",
  temp: "19.5°C (Chấn động êm)",
  tripId: "${curTrip.id}"
}`}
              </pre>
              <div style={{ color: '#fcd34d', margin: '14px 0 6px', fontWeight: 600 }}>MỐC HÀNH TRÌNH:</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6' }}>
                {curTrip.stops.map((s, i) => (
                  <div key={s.id}>
                    [{i + 1}] {s.plannedAt.replace('T', ' ')} • {s.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
