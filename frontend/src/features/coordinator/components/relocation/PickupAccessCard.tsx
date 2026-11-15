import React, { useState } from 'react';
import type { Any } from '../../store/coordinatorStore';
import { reqOfTrip, vehicle as getVehicle, emp } from '../../domain/coordinatorRules';
import { PickupAccessResolutionModal } from './PickupAccessResolutionModal';
import { type PickupAccessStatusResponse } from '../../api/pickupAccessApi';

interface PickupAccessCardProps {
  t: Any;
  incident?: Any;
  onUpdated?: () => void;
}

export const PickupAccessCard: React.FC<PickupAccessCardProps> = ({ t, incident, onUpdated }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const r = reqOfTrip(t);

  const status = t?.pickupAccessStatus || incident?.pickupAccessStatus || 'NORMAL';
  const approvalStatus = t?.customerApprovalStatus || 'NONE';

  // Tọa độ điểm đón ban đầu
  const pickupLat = Number(r?.pickup?.lat || r?.pickupLatitude || t?.pickupLatitude || 10.8231);
  const pickupLng = Number(r?.pickup?.lng || r?.pickupLongitude || t?.pickupLongitude || 106.6297);
  const pickupName = r?.pickup?.name || r?.pickupStableName || r?.origin || 'Trang trại điểm đón';

  // Tọa độ xe hiện trường báo về
  const reportedLat = incident?.reportedLatitude ? Number(incident.reportedLatitude) : undefined;
  const reportedLng = incident?.reportedLongitude ? Number(incident.reportedLongitude) : undefined;

  // Lấy thông tin xe trung chuyển và tài xế nếu có
  const shuttleVeh = t?.shuttleVehicleId ? getVehicle(t.shuttleVehicleId) : null;
  const shuttleDriver = t?.shuttleDriverId ? emp(t.shuttleDriverId) : null;

  const cleanTripKey = (t?.id || t?.tripId || incident?.tripId || '').replace(/-/g, '_');
  const isDriverAcked = typeof localStorage !== 'undefined' && Boolean(
    localStorage.getItem(`rts_driver_pickup_ack_${cleanTripKey}`) ||
    localStorage.getItem(`rts_driver_pickup_ack_${t?.id}`)
  );

  // Lấy ảnh bằng chứng do tài xế báo cáo thực địa
  let cachedEvidence: any = null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`rts_pickup_evidence_${cleanTripKey}`) : null;
    if (raw) cachedEvidence = JSON.parse(raw);
  } catch {
    // ignore
  }

  const rawImg = incident?.imageUrl || t?.imageUrl || '';
  const parts = rawImg.includes('||') ? rawImg.split('||') : [rawImg];
  const blockedImg = t?.blockedImageUrl || incident?.blockedImageUrl || cachedEvidence?.blockedImageUrl || (parts[0]?.trim() || null);
  const relocationImg = t?.relocationImageUrl || incident?.relocationImageUrl || cachedEvidence?.relocationImageUrl || (parts.length > 1 ? parts[1]?.trim() : null);
  const descMatch = incident?.description?.match(/Vị trí dời đề xuất:\s*([^.]+)/i);
  const extractedPlace = descMatch ? descMatch[1].trim() : undefined;
  const isMockPlace = (val?: string | null) => !val || val.toLowerCase().includes('ngã ba đường liên xã');
  const proposedPlace =
    (!isMockPlace(incident?.proposedRelocationPlaceName) ? incident?.proposedRelocationPlaceName : undefined) ||
    (!isMockPlace(cachedEvidence?.proposedPlaceName) ? cachedEvidence?.proposedPlaceName : undefined) ||
    (!isMockPlace(extractedPlace) ? extractedPlace : undefined) ||
    (!isMockPlace(t?.relocationMeetingPointName) ? t?.relocationMeetingPointName : undefined);

  const handleModalSuccess = (_result: PickupAccessStatusResponse) => {
    onUpdated?.();
  };

  return (
    <>
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '10px',
          padding: '16px',
          marginTop: '12px',
          boxShadow: 'var(--card-shadow, 0 1px 3px rgba(0,0,0,0.05))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary, #0f172a)' }}>
              Tiếp cận điểm lấy ngựa
            </span>
            {status === 'NORMAL' && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                Bình thường
              </span>
            )}
            {status === 'BLOCKED' && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                Xe không vào được
              </span>
            )}
            {status === 'RELOCATING' && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                Dắt bộ ra điểm hẹn
              </span>
            )}
            {status === 'SHUTTLING' && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                Xe trung chuyển
              </span>
            )}
            {status === 'RESOLVED' && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                Đã giải quyết
              </span>
            )}
          </div>

          {/* Huy hiệu trạng thái khách hàng duyệt & tài xế tiếp nhận */}
          {status !== 'NORMAL' && status !== 'BLOCKED' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {isDriverAcked ? (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Tài xế: Đã tiếp nhận
                </span>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                  Tài xế: Đã phát lệnh
                </span>
              )}
              {approvalStatus === 'PENDING' && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                  Chờ Khách hàng duyệt
                </span>
              )}
              {approvalStatus === 'APPROVED' && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Khách hàng đã duyệt
                </span>
              )}
              {approvalStatus === 'REJECTED' && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                  Khách hàng từ chối
                </span>
              )}
            </div>
          )}
        </div>

        {/* Nội dung chi tiết theo trạng thái */}
        {status === 'NORMAL' && (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
            Điểm đón tiếp cận bình thường cho xe chở ngựa chuyên dụng. Trong trường hợp tài xế báo cản trở đường vào, Điều phối viên có thể kích hoạt phương án tiếp cận thay thế.
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-primary, #0f172a)',
                }}
              >
                Khảo sát điểm đón &amp; Lập phương án
              </button>
            </div>
          </div>
        )}

        {status === 'BLOCKED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#b91c1c', background: '#fef2f2', padding: '10px 12px', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <b>Cảnh báo an toàn:</b> Xe tải lớn đang bị chặn cách trại ngựa. Chuyến đi đang tạm dừng (Safety Blocker kích hoạt). Cần khảo sát bản đồ và lập phương án giải quyết ngay.
            </div>

            {/* Bằng chứng hình ảnh do tài xế gửi lên */}
            {(blockedImg || relocationImg) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '4px' }}>
                {blockedImg && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#9f1239', marginBottom: '4px' }}>
                      1. Ảnh vị trí không thể vào (Tài xế báo):
                    </div>
                    <img
                      src={blockedImg}
                      alt="Ảnh vị trí không thể vào"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                )}
                {relocationImg && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#166534', marginBottom: '4px' }}>
                      2. Ảnh chỗ dời đề xuất: {proposedPlace || 'Điểm hẹn đón mới'}
                    </div>
                    <img
                      src={relocationImg}
                      alt="Ảnh chỗ dời đề xuất"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: 'var(--accent-primary, #f57c00)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(245, 124, 0, 0.3)',
                }}
              >
                Lập phương án tiếp cận điểm đón (Bản đồ &amp; Điều xe)
              </button>
            </div>
          </div>
        )}

        {status === 'RELOCATING' && (
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Điểm hẹn dắt bộ mới: </span>
              <b>{t?.relocationMeetingPointName || 'Bãi tập kết ngã ba'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Khoảng cách đo đạc: </span>
              <b>{t?.relocationDistanceMeters || 320} mét</b> (&lt; 500m • Không tính phí)
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Chi phí phát sinh: </span>
              <b style={{ color: '#16a34a' }}>0 VNĐ (Miễn phí)</b>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-primary, #0f172a)',
                }}
              >
                Điều chỉnh điểm hẹn trên bản đồ
              </button>
            </div>
          </div>
        )}

        {status === 'SHUTTLING' && (
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Xe trung chuyển 2 chỗ: </span>
              <b>{shuttleVeh ? `${shuttleVeh.plate} (${shuttleVeh.model})` : t?.shuttleVehicleId || 'Đang phân công'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Tài xế trung chuyển: </span>
              <b>{shuttleDriver ? `${shuttleDriver.name} (SĐT: ${shuttleDriver.phone})` : t?.shuttleDriverId || 'Đang phân công'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary, #475569)' }}>Chi phí trung chuyển: </span>
              <b style={{ color: '#d97706' }}>
                {(Number(t?.shuttleCostVnd || 0)).toLocaleString('vi-VN')} VNĐ
              </b>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--text-primary, #0f172a)',
                }}
              >
                Điều chỉnh xe trung chuyển
              </button>
            </div>
          </div>
        )}

        {status === 'RESOLVED' && (
          <div style={{ fontSize: '13px', color: '#16a34a' }}>
            Phương án tiếp cận điểm lấy ngựa đã được Khách hàng phê duyệt. Chặn an toàn đã gỡ bỏ, xe được phép tiếp tục hành trình.
          </div>
        )}
      </div>

      <PickupAccessResolutionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tripId={t?.id || t?.tripId || incident?.tripId || ''}
        pickupStableName={pickupName}
        pickupLatitude={pickupLat}
        pickupLongitude={pickupLng}
        reportedLatitude={reportedLat}
        reportedLongitude={reportedLng}
        incidentReason={incident?.description || incident?.reason}
        proposedMeetingPointName={proposedPlace}
        blockedImageUrl={blockedImg || undefined}
        relocationImageUrl={relocationImg || undefined}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};
