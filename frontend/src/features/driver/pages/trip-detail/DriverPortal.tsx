import { useState } from 'react';
import { BrandLogo } from '../../../../shared/components/brand-logo/BrandLogo';
import { DemoDataToggle } from '../../../../shared/components';
import { cleanDisplayName } from '../../../../shared/utils/textUtils';
import './DriverPortal.css';

export const DriverPortal = () => {
  const [activeTab, setActiveTab] = useState<'milestones' | 'health' | 'handover'>('milestones');

  const [segments, setSegments] = useState([
    { id: 'SEG-1', name: '1. Xuất phát: Trại Đại Nam', done: true, time: '06:00' },
    { id: 'SEG-2', name: '2. Trạm nghỉ & Kiểm tra y tế #1', done: false, time: '' },
    { id: 'SEG-3', name: '3. Thông quan Cửa khẩu / Sân bay', done: false, time: '' },
    { id: 'SEG-4', name: '4. Điểm đích & Bàn giao ngựa', done: false, time: '' },
  ]);

  const [healthLogs, setHealthLogs] = useState([
    { id: 'LOG-1', time: '06:15', temp: '37.8°C', status: 'Ổn định', note: 'Ngựa ăn cỏ tốt trước khi lên xe.' },
  ]);
  const [temp, setTemp] = useState('37.9°C');
  const [healthStatus, setHealthStatus] = useState('Ổn định');
  const [note, setNote] = useState('');

  const [microchipVerified, setMicrochipVerified] = useState(false);
  const [documentsReturned, setDocumentsReturned] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleCheckIn = (index: number) => {
    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setSegments((prev) =>
      prev.map((seg, idx) => (idx === index ? { ...seg, done: true, time: now } : seg))
    );
  };

  const handleAddHealthLog = () => {
    if (!note.trim()) return;
    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setHealthLogs((prev) => [
      { id: `LOG-${prev.length + 1}`, time: now, temp, status: healthStatus, note },
      ...prev,
    ]);
    setNote('');
  };

  return (
    <div className="driver-mobile-shell">
      <header className="driver-sticky-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrandLogo compact />
          <div>
            <h1 className="driver-trip-code">Chuyến: TRP-2026</h1>
            <p className="driver-trip-sub">Tài xế: {cleanDisplayName(localStorage.getItem('userFullName')) || 'Hoàng Hùng'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DemoDataToggle role="driver" compact />
          <button
            type="button"
            className="btn-sos"
            onClick={() => alert('Đã gửi cảnh báo SOS khẩn cấp kèm tọa độ về Trung tâm!')}
          >
            🚨 SOS
          </button>
        </div>
      </header>

      <div className="driver-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`driver-tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
        >
          Mốc chặng
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`driver-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
        >
          Y tế ngựa
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('handover')}
          className={`driver-tab-btn ${activeTab === 'handover' ? 'active' : ''}`}
        >
          Bàn giao
        </button>
      </div>

      <div className="driver-content">
        {activeTab === 'milestones' && (
          <div className="driver-card">
            <h2 className="manager-card-title">Điểm danh Chặng (ROUTE_SEGMENT)</h2>
            {segments.map((seg, idx) => {
              const prevDone = idx === 0 || segments[idx - 1].done;
              return (
                <div key={seg.id} className="segment-row">
                  <div>
                    <strong style={{ fontSize: '14px' }}>{seg.name}</strong>
                    <p className="driver-trip-sub">
                      {seg.done ? `Đã xác nhận lúc ${seg.time}` : 'Chưa xác nhận'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ height: '38px', padding: '0 12px', fontSize: '12px' }}
                    disabled={seg.done || !prevDone}
                    onClick={() => handleCheckIn(idx)}
                  >
                    {seg.done ? 'Đã tới ✓' : 'Check-in'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'health' && (
          <div className="driver-card">
            <h2 className="manager-card-title">Ghi Nhật ký Sức khỏe (HEALTH_LOG)</h2>
            <div className="form-grid-2" style={{ marginBottom: '12px' }}>
              <input
                type="text"
                className="form-input"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                placeholder="Thân nhiệt (37.8°C)"
              />
              <select
                className="form-select"
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
              >
                <option value="Ổn định">Ổn định</option>
                <option value="Căng thẳng">Căng thẳng</option>
                <option value="Sốt">Sốt</option>
              </select>
            </div>
            <input
              type="text"
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập mô tả tình trạng thực tế của ngựa..."
            />
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={handleAddHealthLog}
            >
              Lưu Nhật Ký Y Tế
            </button>

            {healthLogs.map((log) => (
              <div key={log.id} className="health-log-item">
                <strong>{log.time} — {log.status} ({log.temp})</strong>
                <p className="driver-trip-sub">{log.note}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'handover' && (
          <div className="driver-card">
            <h2 className="manager-card-title">Biên bản Bàn giao (HANDOVER_ITEM)</h2>
            <label className="lock-item">
              <span>Đã quét khớp Microchip ISO (981020000123456)</span>
              <input
                type="checkbox"
                checked={microchipVerified}
                onChange={(e) => setMicrochipVerified(e.target.checked)}
              />
            </label>
            <label className="lock-item">
              <span>Đã bàn giao bộ hồ sơ gốc cho người nhận</span>
              <input
                type="checkbox"
                checked={documentsReturned}
                onChange={(e) => setDocumentsReturned(e.target.checked)}
              />
            </label>
            <input
              type="text"
              className="form-input"
              style={{ marginTop: '8px' }}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Nhập mã OTP từ khách hàng..."
            />
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', marginTop: '16px' }}
              disabled={!microchipVerified || !documentsReturned || otpCode.length < 4}
              onClick={() => alert('Hoàn tất bàn giao ngựa tại điểm đích!')}
            >
              Xác Nhận Bàn Giao Hoàn Tất
            </button>
          </div>
        )}
      </div>
    </div>
  );
};