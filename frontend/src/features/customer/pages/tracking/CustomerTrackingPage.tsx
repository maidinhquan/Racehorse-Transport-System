import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import {
  mockTrackingCheckpoints,
  mockTrackingEvents,
  mockDemoControlSteps,
} from '../../data';
import type { TrackingCheckpoint, DemoControlStep } from '../../types';
import './CustomerTrackingPage.css';

export const CustomerTrackingPage: React.FC = () => {
  const navigate = useNavigate();

  // Selected trip state
  const [selectedTrip, setSelectedTrip] = useState<string>('TRN-8923');
  const [activeStepNumber, setActiveStepNumber] = useState<number>(8);
  const [checkpoints, setCheckpoints] = useState<TrackingCheckpoint[]>(mockTrackingCheckpoints);
  const [controlSteps, setControlSteps] = useState<DemoControlStep[]>(mockDemoControlSteps);

  // Handle clicking a demo step to advance / test states
  const handleStepClick = (stepNum: number) => {
    setActiveStepNumber(stepNum);
    setControlSteps((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.stepNumber < stepNum ? 'completed' : s.stepNumber === stepNum ? 'active' : 'pending',
      }))
    );

    // If advanced past step 8, simulate updating next checkpoint
    if (stepNum > 8) {
      setCheckpoints((prev) =>
        prev.map((c) => {
          if (c.number <= 4) {
            return {
              ...c,
              status: c.number === 4 ? 'latest_confirmed' : 'confirmed',
              statusBadgeText: c.number === 4 ? 'Đã xác nhận gần nhất' : 'Đã xác nhận',
            };
          }
          if (c.number === 5) {
            return { ...c, status: 'next', statusBadgeText: 'Tiếp theo' };
          }
          return c;
        })
      );
    } else {
      setCheckpoints(mockTrackingCheckpoints);
    }
  };

  // Calculate confirmed count
  const confirmedCount = checkpoints.filter(
    (c) => c.status === 'confirmed' || c.status === 'latest_confirmed'
  ).length;

  const currentMilestone =
    checkpoints.find((c) => c.status === 'latest_confirmed') || checkpoints[2];

  return (
    <CustomerLayout pageTitle="Theo dõi chuyến đi" activeNav="tracking">
      <div className="customer-tracking-page">
        {/* ==================== PAGE HEADER ==================== */}
        <section className="tracking-header-row">
          <div className="tracking-header-titles">
            <h2 className="tracking-title">Theo dõi chuyến đi</h2>
            <p className="tracking-subtitle">
              Tiến độ dựa trên các mốc do đội vận chuyển xác nhận. Không có vị trí GPS trực tiếp.
            </p>
          </div>

          <div className="trip-selector-box">
            <label className="trip-selector-label">CHỌN CHUYẾN VẬN CHUYỂN</label>
            <select
              className="trip-selector-dropdown"
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
            >
              <option value="TRN-8923">
                TRN-8923 • TRP-901: Thunderbolt (Đang vận chuyển)
              </option>
              <option value="TRN-8924">
                TRN-8924 • TRP-902: Shadowfax (Đang xét duyệt hồ sơ)
              </option>
              <option value="TRN-8928">
                TRN-8928 • TRP-903: Thunderbolt (Hợp đồng sẵn sàng)
              </option>
              <option value="TRN-8930">
                TRN-8930 • TRP-904: Apollo (Chờ quản lý xét duyệt)
              </option>
            </select>
          </div>
        </section>

        {/* ==================== MAIN 2-COLUMN LAYOUT ==================== */}
        <div className="tracking-grid-layout">
          {/* ==================== LEFT COLUMN ==================== */}
          <div className="tracking-col">
            {/* Map Canvas Card */}
            <section className="route-map-card">
              <div className="route-card-header">
                <div className="route-header-left">
                  <h3 className="route-trip-id">TRP-901 • TRN-8923</h3>
                  <p className="route-trip-meta">
                    Ho Chi Minh City, VN → Bangkok, TH • Đường bộ • Thunderbolt
                  </p>
                </div>
                <TripStatusBadge status="in_transit" label="Đang vận chuyển" />
              </div>

              {/* Visual Route Canvas */}
              <div className="route-canvas-box">
                <svg
                  className="route-svg-canvas"
                  viewBox="0 0 1000 250"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Solid Completed Line (Stops 1 to 3) */}
                  <path
                    d="M 100 175 L 230 200 L 370 162"
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dashed Remaining Line (Stops 3 to 8) */}
                  <path
                    d="M 370 162 L 500 105 L 640 125 L 750 180 L 850 195 L 940 150"
                    fill="none"
                    stroke="#4b5563"
                    strokeWidth="2.5"
                    strokeDasharray="6,6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Node 1: Saigon Riding Club */}
                  <g transform="translate(100, 175)">
                    <circle r="7" fill="var(--bg-surface, #ffffff)" stroke="var(--text-secondary, #64748b)" strokeWidth="2.5" />
                    <text x="0" y="22" fill="var(--text-secondary, #64748b)" fontSize="10.5" textAnchor="middle">
                      Saigon Riding Club
                    </text>
                  </g>

                  {/* Node 2: Trang Bang */}
                  <g transform="translate(230, 200)">
                    <circle r="8" fill="#ea580c" stroke="var(--bg-surface, #ffffff)" strokeWidth="2.5" />
                    <text x="0" y="22" fill="var(--text-secondary, #64748b)" fontSize="10.5" textAnchor="middle">
                      Trang Bang rest area
                    </text>
                  </g>

                  {/* Node 3: Moc Bai Border Gate (Current Checkpoint - Glowing Pulse) */}
                  <g transform="translate(370, 162)">
                    <circle r="16" fill="rgba(234, 88, 12, 0.25)">
                      <animate
                        attributeName="r"
                        values="12;20;12"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.2;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle r="9" fill="#ea580c" stroke="var(--bg-surface, #ffffff)" strokeWidth="3" />
                    <text x="0" y="-16" fill="#ea580c" fontSize="11" fontWeight="700" textAnchor="middle">
                      Moc Bai Border Gate
                    </text>
                  </g>

                  {/* Node 4: Bavet Border Gate */}
                  <g transform="translate(500, 105)">
                    <circle r="7" fill="#ef4444" stroke="var(--bg-surface, #ffffff)" strokeWidth="2" />
                    <text x="0" y="-14" fill="var(--text-secondary, #64748b)" fontSize="10.5" textAnchor="middle">
                      Bavet Border Gate
                    </text>
                  </g>

                  {/* Node 5: Phnom Penh */}
                  <g transform="translate(640, 125)">
                    <circle r="7" fill="var(--bg-surface, #ffffff)" stroke="var(--accent-primary, #ea580c)" strokeWidth="2.5" />
                    <text x="0" y="-14" fill="var(--text-secondary, #64748b)" fontSize="10.5" textAnchor="middle">
                      Phnom Penh overnight
                    </text>
                  </g>

                  {/* Node 6: Poipet */}
                  <g transform="translate(750, 180)">
                    <circle r="7" fill="#ef4444" stroke="var(--bg-surface, #ffffff)" strokeWidth="2" />
                    <text x="0" y="22" fill="var(--text-secondary, #64748b)" fontSize="10.5" textAnchor="middle">
                      Poipet - Aranyaprathet
                    </text>
                  </g>

                  {/* Node 7: Sa Kaeo fuel station */}
                  <g transform="translate(850, 195)">
                    <circle r="7" fill="var(--bg-surface, #ffffff)" stroke="var(--text-muted, #94a3b8)" strokeWidth="2" />
                  </g>

                  {/* Node 8: Bangkok Polo Club */}
                  <g transform="translate(940, 150)">
                    <circle r="9" fill="var(--bg-surface, #ffffff)" stroke="#16a34a" strokeWidth="3" />
                    <text x="0" y="-16" fill="#16a34a" fontSize="11" fontWeight="700" textAnchor="middle">
                      Bangkok Polo Club
                    </text>
                  </g>
                </svg>
              </div>

              {/* Legend Row */}
              <div className="route-legend-row">
                <span className="legend-item">
                  <span className="legend-dot origin" /> Điểm đi
                </span>
                <span className="legend-item">
                  <span className="legend-dot destination" /> Điểm đến
                </span>
                <span className="legend-item">
                  <span className="legend-dot border" /> Cửa khẩu
                </span>
                <span className="legend-item">
                  <span className="legend-dot airport" /> Sân bay
                </span>
                <span className="legend-item">
                  <span className="legend-dot quarantine" /> Trạm kiểm dịch
                </span>
                <span className="legend-item">
                  <span className="legend-dot rest" /> Điểm nghỉ
                </span>
                <span className="legend-item">
                  <span className="legend-dot fuel" /> Điểm đổ nhiên liệu
                </span>
                <span className="legend-item">
                  <span className="legend-dot latest" /> Mốc xác nhận gần nhất
                </span>
              </div>

              <p className="route-map-note">
                Bản đồ hiển thị tuyến dự kiến và điểm kiểm soát gần nhất do đội vận chuyển xác nhận. Không có vị trí GPS trực tiếp giữa các mốc.
              </p>

              {/* Progress Bar */}
              <div className="route-progress-box">
                <div className="route-progress-header">
                  <span className="progress-header-title">Tiến trình hành trình</span>
                  <span className="progress-header-count">
                    Đã xác nhận {confirmedCount}/8 điểm dừng
                  </span>
                </div>
                <div className="route-progress-track">
                  <div
                    className="route-progress-fill"
                    style={{ width: `${(confirmedCount / 8) * 100}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Checkpoints and Stops List */}
            <section className="stops-list-card">
              <h3 className="stops-card-title">Các trạm và điểm dừng dự kiến</h3>

              <div className="stops-items-wrapper">
                {checkpoints.map((cp) => {
                  const circleColor =
                    cp.status === 'confirmed'
                      ? 'green'
                      : cp.status === 'latest_confirmed'
                        ? 'orange'
                        : 'gray';

                  const badgeClass =
                    cp.status === 'confirmed'
                      ? 'confirmed'
                      : cp.status === 'latest_confirmed'
                        ? 'latest-confirmed'
                        : cp.status === 'next'
                          ? 'next'
                          : 'planned';

                  return (
                    <div key={cp.id} className="stop-row-item">
                      <div className="stop-left-info">
                        <div className={`stop-index-circle ${circleColor}`}>
                          {cp.number}
                        </div>
                        <div className="stop-meta-text">
                          <span className="stop-name-title">{cp.name}</span>
                          <span className="stop-desc-sub">
                            {cp.typeText} • dự kiến {cp.scheduledTime}
                            {cp.confirmedTime && ` • xác nhận ${cp.confirmedTime}`}
                          </span>
                        </div>
                      </div>

                      <span className={`stop-status-pill ${badgeClass}`}>
                        {cp.statusBadgeText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ==================== RIGHT COLUMN ==================== */}
          <div className="tracking-col">
            {/* Card 1: Mốc xác nhận gần nhất */}
            <section className="latest-checkpoint-card">
              <div className="trip-selector-label">MỐC XÁC NHẬN GẦN NHẤT</div>

              <div className="latest-checkpoint-box">
                <div className="pin-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="latest-checkpoint-info">
                  <h4 className="latest-checkpoint-title">
                    Đã đến tại checkpoint – {currentMilestone.name}
                  </h4>
                  <span className="latest-checkpoint-author">
                    Xác nhận lúc {currentMilestone.confirmedTime || '4/10, 10:00'} bởi {currentMilestone.confirmedBy || 'Nguyen Van Hung'}
                  </span>
                </div>
              </div>

              <div className="timings-specs-list">
                <div className="timing-row">
                  <span className="timing-label">Khởi hành dự kiến</span>
                  <span className="timing-value">4/10, 06:00</span>
                </div>
                <div className="timing-row">
                  <span className="timing-label">Thời gian khởi hành thực tế</span>
                  <span className="timing-value">4/10, 07:00</span>
                </div>
                <div className="timing-row">
                  <span className="timing-label">Dự kiến đến</span>
                  <span className="timing-value highlight">6/10, 16:00</span>
                </div>
              </div>

              <p className="timings-notice-text">
                Thời gian đến dự kiến phụ thuộc vào thông quan và tình trạng đường.
              </p>

              <button
                className="btn-view-request-detail"
                onClick={() => navigate('/customer/requests/TRN-8923')}
              >
                Xem chi tiết yêu cầu
              </button>
            </section>

            {/* Card 2: Sự kiện vận chuyển */}
            <section className="timeline-events-card">
              <div className="trip-selector-label">SỰ KIỆN VẬN CHUYỂN</div>

              <div className="vertical-events-timeline">
                {mockTrackingEvents.map((evt) => (
                  <div key={evt.id} className="event-timeline-node">
                    <div className="event-dot-marker" />
                    <div className="event-content-box">
                      <span className="event-title-text">{evt.title}</span>
                      <span className="event-time-sub">
                        {evt.time} {evt.detail ? `• ${evt.detail}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Card 3: Điều khiển Demo từ lập kế hoạch đến nghiệm thu */}
            <section className="demo-controller-card">
              <div className="demo-controller-header">
                <h4>ĐIỀU KHIỂN DEMO • TỪ LẬP KẾ HOẠCH ĐẾN NGHIỆM THU</h4>
                <p>
                  Mô phỏng các bước của nhân viên, tổ lái và VNPay cho TRN-8923 và chuyến của yêu cầu. Không thuộc cổng khách hàng.
                </p>
              </div>

              <div className="demo-controller-meta">
                <span className="demo-meta-status">
                  Chuyến TRP-901: <b>Đang vận chuyển</b>
                </span>
                <span className="demo-meta-hint">
                  Bước gợi ý: Tài xế tới mốc tiếp theo
                </span>
              </div>

              <div className="demo-steps-grid">
                {controlSteps.map((step) => {
                  const isActive = step.stepNumber === activeStepNumber;

                  return (
                    <button
                      key={step.stepNumber}
                      className={`demo-step-button ${isActive ? 'active' : ''}`}
                      onClick={() => handleStepClick(step.stepNumber)}
                    >
                      <span className="step-num-badge">{step.stepNumber}</span>
                      <span>{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerTrackingPage;
