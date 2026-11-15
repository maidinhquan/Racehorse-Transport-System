import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { PhotoPicker } from '../PhotoPicker/PhotoPicker';
import driverApi from '../../api/driverApi';
import type { Photo } from '../../types';

interface PickupAccessBlockedModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupName?: string;
  onSuccess?: (res: any) => void;
}

const PRESET_REASONS = [
  'Đường nông thôn hẹp (< 2.5m), xe tải lớn chuyên dụng không thể vào',
  'Cầu yếu / đường cấm tải trọng xe trên 5 tấn',
  'Cổng trang trại bị khóa / vướng tĩnh không cây cối, dây điện thấp',
  'Đoạn đường sạt lở hoặc công trình thi công chặn lối đi',
  'Khác (nhập chi tiết bên dưới)',
];

export const PickupAccessBlockedModal: React.FC<PickupAccessBlockedModalProps> = ({
  open,
  onClose,
  tripId,
  pickupLat = 10.8231,
  pickupLng = 106.6297,
  pickupName = 'Trang trại đón ngựa',
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [currentLat, setCurrentLat] = useState<number>(pickupLat + 0.0025);
  const [currentLng, setCurrentLng] = useState<number>(pickupLng + 0.0025);
  const [distanceMeters, setDistanceMeters] = useState<number>(390);
  
  // Tùy chọn phương án xử lý thực địa
  const [actionProposal, setActionProposal] = useState<'RELOCATE' | 'WAIT_COORDINATOR'>('RELOCATE');
  const [proposedPlaceName, setProposedPlaceName] = useState<string>('Ngã ba đường lớn đầu ngõ');

  // 2 phần upload ảnh riêng biệt
  const [blockedPhotos, setBlockedPhotos] = useState<Photo[]>([]);
  const [relocationPhotos, setRelocationPhotos] = useState<Photo[]>([]);

  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Tính khoảng cách Haversine
  const calcHaversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Lấy tọa độ GPS thực tế từ thiết bị khi mở modal
  useEffect(() => {
    if (!open) return;
    setError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          const dist = calcHaversineMeters(lat, lng, pickupLat, pickupLng);
          setDistanceMeters(dist);
        },
        () => {
          // Fallback giả lập vị trí xe dừng cách trại ~390m
          const fallbackLat = pickupLat + 0.0025;
          const fallbackLng = pickupLng + 0.0025;
          setCurrentLat(fallbackLat);
          setCurrentLng(fallbackLng);
          setDistanceMeters(calcHaversineMeters(fallbackLat, fallbackLng, pickupLat, pickupLng));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [open, pickupLat, pickupLng]);

  const handleSubmit = async () => {
    const reasonText = selectedPreset === 'Khác (nhập chi tiết bên dưới)'
      ? customReason.trim()
      : selectedPreset;

    if (!reasonText) {
      setError('Vui lòng chọn hoặc nhập lý do cản trở đường vào.');
      return;
    }

    if (blockedPhotos.length === 0) {
      setError('Vui lòng tải lên ít nhất 1 ảnh chụp vị trí không thể tiếp cận để làm bằng chứng thực địa.');
      return;
    }

    if (actionProposal === 'RELOCATE') {
      if (!proposedPlaceName.trim()) {
        setError('Vui lòng nhập tên hoặc mô tả chỗ dời địa điểm đề xuất.');
        return;
      }
      if (relocationPhotos.length === 0) {
        setError('Vui lòng tải lên ít nhất 1 ảnh chụp vị trí chọn chỗ dời địa điểm để báo cho Điều phối viên.');
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const blockedImg = blockedPhotos[0]?.url || undefined;
      const relocationImg = relocationPhotos[0]?.url || undefined;

      const payload = {
        reason: reasonText,
        latitude: currentLat,
        longitude: currentLng,
        imageUrl: blockedImg,
        blockedImageUrl: blockedImg,
        relocationImageUrl: relocationImg,
        proposedRelocationPlaceName: actionProposal === 'RELOCATE' ? proposedPlaceName.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      // Lưu bằng chứng vào localStorage để Điều phối viên và Khách hàng hiển thị ngay
      const cleanKey = tripId.replace(/-/g, '_');
      try {
        localStorage.setItem(`rts_driver_pickup_status_${cleanKey}`, 'BLOCKED');
        localStorage.setItem(`rts_driver_pickup_status_${tripId}`, 'BLOCKED');
        localStorage.setItem(`rts_pickup_evidence_${cleanKey}`, JSON.stringify({
          blockedImageUrl: blockedImg,
          relocationImageUrl: relocationImg,
          proposedPlaceName: actionProposal === 'RELOCATE' ? proposedPlaceName.trim() : undefined,
          reportedAt: new Date().toISOString(),
        }));
      } catch {
        // bỏ qua lỗi storage
      }

      const res = await driverApi.reportPickupAccessBlocked(tripId, payload);
      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi báo cáo cản trở. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Báo cáo: Xe không vào được điểm lấy ngựa"
      okText={submitting ? 'Đang gửi...' : 'Gửi báo cáo & Tạm dừng'}
      danger
      okDisabled={submitting}
      onOk={handleSubmit}
      onClose={onClose}
      error={error}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
        <div style={{ background: 'var(--bg-elevated, #fef2f2)', border: '1px solid #fecaca', padding: '10px 12px', borderRadius: '8px', color: '#b91c1c' }}>
          <b>Lưu ý an toàn:</b> Báo cáo này sẽ kích hoạt tạm dừng chặng vận chuyển (Safety Blocker). Điều phối viên sẽ khảo sát để bố trí điểm đón hẹn ngoài hoặc gọi xe nhỏ trung chuyển.
        </div>

        <div>
          <span style={{ color: 'var(--text-secondary, #475569)' }}>Điểm lấy ngựa gốc: </span>
          <b>{pickupName}</b>
        </div>

        {/* Chọn lý do cản trở */}
        <div className="drv-field">
          <label htmlFor="blocked-reason-select" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Lý do không thể tiếp cận *
          </label>
          <select
            id="blocked-reason-select"
            className="drv-select"
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
          >
            {PRESET_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {selectedPreset === 'Khác (nhập chi tiết bên dưới)' && (
          <div className="drv-field">
            <label htmlFor="blocked-reason-custom" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Mô tả chi tiết cản trở *
            </label>
            <textarea
              id="blocked-reason-custom"
              className="drv-textarea"
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="VD: Cầu bê tông hẹp, đường đất sạt lở xe không qua được..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>
        )}

        {/* Tọa độ xe hiện tại và khoảng cách */}
        <div style={{ background: 'var(--bg-elevated, #f8fafc)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Định vị vị trí xe hiện tại:</div>
          <div>
            Tọa độ: <code>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</code>
          </div>
          <div>
            Khoảng cách đến trang trại: <b style={{ color: distanceMeters <= 500 ? '#16a34a' : '#d97706' }}>{distanceMeters} mét</b>
          </div>
          <small style={{ color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '2px' }}>
            {distanceMeters <= 500
              ? 'Hệ thống đánh giá: Khoảng cách < 500m, tài xế có thể chọn dời địa điểm hẹn dắt bộ.'
              : 'Hệ thống đánh giá: Khoảng cách >= 500m, cần xe nhỏ trung chuyển chuyên dụng.'}
          </small>
        </div>

        {/* Lựa chọn phương án thực địa */}
        <div className="drv-field">
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Phương án đề xuất của tài xế:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pickup-action-proposal"
                checked={actionProposal === 'RELOCATE'}
                onChange={() => setActionProposal('RELOCATE')}
              />
              <span>
                <b>Đề xuất dời địa điểm hẹn đón</b> (Dắt bộ ra chỗ xe đỗ chờ ngoài đường lớn)
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pickup-action-proposal"
                checked={actionProposal === 'WAIT_COORDINATOR'}
                onChange={() => setActionProposal('WAIT_COORDINATOR')}
              />
              <span>
                <b>Chờ Điều phối viên khảo sát điểm hẹn đón mới</b>
              </span>
            </label>
          </div>
        </div>

        {/* Nhập tên chỗ dời địa điểm nếu tài xế chọn dời */}
        {actionProposal === 'RELOCATE' && (
          <div className="drv-field">
            <label htmlFor="proposed-relocation-place" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Tên / Vị trí chỗ dời địa điểm đề xuất *
            </label>
            <input
              id="proposed-relocation-place"
              type="text"
              className="drv-input"
              value={proposedPlaceName}
              onChange={(e) => setProposedPlaceName(e.target.value)}
              placeholder="VD: Cây xăng Petrolimex đầu ngõ 15, Bãi đất trống ngã ba liên xã..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
            />
          </div>
        )}

        {/* 1. Phần upload hình ảnh KHÔNG THỂ VÀO */}
        <div className="drv-field" style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px 12px', borderRadius: '8px' }}>
          <label style={{ fontWeight: 700, display: 'block', marginBottom: '4px', color: '#9f1239' }}>
            1. Ảnh chụp vị trí không thể vào (vật cản / đường hẹp / cấm tải / cổng khóa) *
          </label>
          <small style={{ color: '#be123c', display: 'block', marginBottom: '6px' }}>
            Chụp cận cảnh biển cấm, đoạn đường hẹp hoặc chướng ngại vật khiến xe tải lớn không vào được.
          </small>
          <PhotoPicker
            photos={blockedPhotos}
            onAdd={(photo) => setBlockedPhotos((prev) => [...prev, photo])}
            onRemove={(idx) => setBlockedPhotos((prev) => prev.filter((_, i) => i !== idx))}
          />
        </div>

        {/* 2. Phần upload hình ảnh CHỌN CHỖ DỜI ĐỊA ĐIỂM (khi chọn dời địa điểm) */}
        {actionProposal === 'RELOCATE' && (
          <div className="drv-field" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 12px', borderRadius: '8px' }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: '4px', color: '#166534' }}>
              2. Ảnh chụp chỗ dời địa điểm đề xuất (bãi đỗ chờ / điểm hẹn dắt ngựa ra) *
            </label>
            <small style={{ color: '#15803d', display: 'block', marginBottom: '6px' }}>
              Chụp vị trí xe đang đỗ an toàn ngoài đường lớn để Điều phối viên và Khách hàng nhận diện điểm đón mới.
            </small>
            <PhotoPicker
              photos={relocationPhotos}
              onAdd={(photo) => setRelocationPhotos((prev) => [...prev, photo])}
              onRemove={(idx) => setRelocationPhotos((prev) => prev.filter((_, i) => i !== idx))}
            />
          </div>
        )}

        {/* Ghi chú thêm */}
        <div className="drv-field">
          <label htmlFor="blocked-notes" style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Ghi chú thêm cho Điều phối viên:
          </label>
          <textarea
            id="blocked-notes"
            className="drv-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: Xe đã bật đèn cảnh báo và đỗ gọn gàng lề đường, sẵn sàng nhận ngựa..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)' }}
          />
        </div>
      </div>
    </Modal>
  );
};
