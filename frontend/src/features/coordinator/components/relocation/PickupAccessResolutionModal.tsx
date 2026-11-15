import React, { useState, useEffect } from 'react';
import { PickupAccessResolutionMap } from './PickupAccessResolutionMap';
import { pickupAccessApi, type PickupAccessResolutionRequest, type PickupAccessStatusResponse } from '../../api/pickupAccessApi';
import { db, commit, toast } from '../../store/coordinatorStore';
import { notifySync } from '../../../../shared/utils/syncChannel';

export interface PickupAccessResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  pickupStableName?: string;
  pickupLatitude: number;
  pickupLongitude: number;
  reportedLatitude?: number;
  reportedLongitude?: number;
  incidentReason?: string;
  proposedMeetingPointName?: string;
  blockedImageUrl?: string;
  relocationImageUrl?: string;
  onSuccess?: (result: PickupAccessStatusResponse) => void;
}

export const PickupAccessResolutionModal: React.FC<PickupAccessResolutionModalProps> = ({
  isOpen,
  onClose,
  tripId,
  pickupStableName = 'Trang trại đón ngựa',
  pickupLatitude,
  pickupLongitude,
  reportedLatitude,
  reportedLongitude,
  incidentReason = 'Đường vào trang trại bị giới hạn kích thước xe hoặc địa hình hẹp, xe tải lớn chuyên dụng không vào được.',
  proposedMeetingPointName,
  blockedImageUrl,
  relocationImageUrl,
  onSuccess,
}) => {
  // Tọa độ điểm hẹn mặc định
  const defaultMeetingLat = reportedLatitude ?? (pickupLatitude + 0.0015);
  const defaultMeetingLng = reportedLongitude ?? (pickupLongitude + 0.0015);

  // State phương án giải quyết (Dắt bộ ra điểm hẹn mới)
  const [meetingPointName, setMeetingPointName] = useState<string>('');
  const [meetingLat, setMeetingLat] = useState<number>(defaultMeetingLat);
  const [meetingLng, setMeetingLng] = useState<number>(defaultMeetingLng);
  const [distanceMeters, setDistanceMeters] = useState<number>(320);

  const isMock = (s?: string | null) => !s || s.toLowerCase().includes('ngã ba đường liên xã');
  const effectiveProposedName = !isMock(proposedMeetingPointName) ? proposedMeetingPointName : undefined;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMeetingPointName(''); // Để trống ban đầu để Điều phối viên chủ động nhập thay thế
      if (reportedLatitude && reportedLongitude) {
        setMeetingLat(reportedLatitude);
        setMeetingLng(reportedLongitude);
      }
      setErrorMessage(null);
    }
  }, [isOpen, reportedLatitude, reportedLongitude]);

  // Cập nhật khi chọn điểm hẹn mới trên bản đồ
  const handleMapLocationSelect = (lat: number, lng: number, dist: number) => {
    setMeetingLat(lat);
    setMeetingLng(lng);
    setDistanceMeters(dist);
  };

  // Submit API giải quyết cản trở điểm lấy ngựa
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    const finalMeetingPoint = meetingPointName.trim() || effectiveProposedName?.trim() || '';
    if (!finalMeetingPoint) {
      setErrorMessage('Vui lòng nhập tên điểm hẹn đón ngựa hoặc chọn vị trí tài xế đề xuất.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PickupAccessResolutionRequest = {
        resolutionType: 'RELOCATING',
        meetingPointName: finalMeetingPoint,
        meetingLatitude: meetingLat,
        meetingLongitude: meetingLng,
        shuttleCostVnd: 0,
      };

      const result = await pickupAccessApi.resolveAccess(tripId, payload);

      const cleanTripId = tripId.replace(/-/g, '_');
      const resolutionData = {
        tripId,
        resolutionType: result.pickupAccessStatus,
        meetingPointName: result.relocationMeetingPointName,
        meetingLatitude: result.relocationLatitude,
        meetingLongitude: result.relocationLongitude,
        distanceMeters: result.relocationDistanceMeters,
        customerApprovalStatus: result.customerApprovalStatus,
      };

      try {
        localStorage.setItem(`rts_pickup_resolution_${tripId}`, JSON.stringify(resolutionData));
        localStorage.setItem(`rts_pickup_resolution_${cleanTripId}`, JSON.stringify(resolutionData));
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rts_pickup_resolution_updated', { detail: resolutionData }));
      }

      // Cập nhật trạng thái chuyến đi trong store cục bộ
      const t = (db.trips || []).find(
        (trip: any) =>
          trip.id === tripId ||
          trip.tripId === tripId ||
          (trip.id && trip.id.replace(/[-_]/g, '') === tripId.replace(/[-_]/g, ''))
      );
      if (t) {
        t.pickupAccessStatus = result.pickupAccessStatus;
        t.relocationMeetingPointName = result.relocationMeetingPointName;
        t.relocationLatitude = result.relocationLatitude;
        t.relocationLongitude = result.relocationLongitude;
        t.relocationDistanceMeters = result.relocationDistanceMeters;
        t.customerApprovalStatus = result.customerApprovalStatus;
      }

      // Cập nhật sự cố liên quan trong store Điều phối
      const inc = (db.incidents || []).find(
        (i: any) =>
          (i.tripId === tripId || i.tripId?.replace(/[-_]/g, '') === tripId.replace(/[-_]/g, '')) &&
          (i.type === 'PICKUP_ACCESS_BLOCKED' || i.category === 'PICKUP_ACCESS_BLOCKED')
      );
      if (inc) {
        const planKind = 'PICKUP_RELOCATE';
        const planDesc = `Phương án dắt bộ ra điểm hẹn mới: ${result.relocationMeetingPointName || finalMeetingPoint} (Cự ly: ${result.relocationDistanceMeters || distanceMeters}m - 0 VNĐ)`;
        inc.approvedPlan = planDesc;
        inc.resolutionNotes = planDesc;
        inc.resolutionType = planKind;
        inc.status = 'EXECUTING';
        inc.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
        if (!inc.plans) inc.plans = [];
        inc.plans.unshift({
          v: (inc.plans.length || 0) + 1,
          kind: planKind,
          status: 'APPROVED',
          desc: planDesc,
          reason: payload.notes || incidentReason,
          approvedAt: inc.updatedAt,
          approvals: [],
        });
      }

      commit();
      notifySync('requests_updated');

      toast('Đã lập phương án giải quyết và phát lệnh điều động cho Tài xế.');
      onSuccess?.(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể gửi phương án giải quyết. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pickup-access-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--modal-overlay, rgba(15, 23, 42, 0.6))',
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          borderRadius: '12px',
          boxShadow: 'var(--card-shadow, 0 20px 40px rgba(0,0,0,0.2))',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated, #f8fafc)',
          }}
        >
          <div>
            <h3 id="pickup-access-modal-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Xử lý sự cố: Xe không thể vào điểm lấy ngựa
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Mã chuyến: <b>{tripId}</b> • Điểm đón: <b>{pickupStableName}</b>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body (2 Cột Responsive) */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Cột trái: Bản đồ & Báo cáo hiện trường */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'var(--bg-elevated, #f8fafc)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #e2e8f0)',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                Báo cáo từ hiện trường:
              </div>
              <div style={{ color: 'var(--text-primary, #0f172a)', lineHeight: 1.5 }}>
                {incidentReason}
              </div>
            </div>

            {/* Bằng chứng hình ảnh do tài xế cung cấp */}
            {(blockedImageUrl || relocationImageUrl) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {blockedImageUrl && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#9f1239', marginBottom: '4px' }}>
                      1. Vị trí không thể vào:
                    </div>
                    <img
                      src={blockedImageUrl}
                      alt="Ảnh vị trí không thể vào"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                )}
                {relocationImageUrl && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#166534', marginBottom: '4px' }}>
                      2. Chỗ dời đề xuất: {effectiveProposedName || 'Tài xế chưa nhập tên'}
                    </div>
                    <img
                      src={relocationImageUrl}
                      alt="Ảnh chỗ dời đề xuất"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Bản đồ khảo sát & chọn điểm hẹn:
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  (Click bản đồ hoặc kéo mốc ĐH để chọn điểm)
                </span>
              </div>

              <PickupAccessResolutionMap
                pickupLat={pickupLatitude}
                pickupLng={pickupLongitude}
                pickupName={pickupStableName}
                vehicleLat={reportedLatitude}
                vehicleLng={reportedLongitude}
                selectedLat={meetingLat}
                selectedLng={meetingLng}
                onSelectLocation={handleMapLocationSelect}
                height="320px"
              />
            </div>

            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted, #64748b)',
                lineHeight: 1.5,
                background: 'var(--bg-elevated, #f8fafc)',
                padding: '10px 12px',
                borderRadius: '6px',
              }}
            >
              <b>Quy tắc hệ thống:</b>
              <b>Quy tắc an toàn:</b>
              <div style={{ marginTop: '4px' }}>
                Chuyên viên dắt bộ ngựa ra điểm hẹn mới tiếp cận xe vận chuyển lớn (Hệ thống tự động miễn phí).
              </div>
            </div>
          </div>

          {/* Cột phải: Form thiết lập điểm hẹn dắt bộ */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px',
                borderRadius: '8px',
                background: 'var(--bg-elevated, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Tên điểm hẹn mới:
                  </label>
                </div>

                {/* Hiển thị vị trí tài xế đề xuất */}
                {effectiveProposedName ? (
                  <div
                    style={{
                      marginBottom: '10px',
                      padding: '8px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#166534', fontWeight: 600 }}>Vị trí tài xế đề xuất: </span>
                      <b style={{ color: '#15803d' }}>{effectiveProposedName}</b>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMeetingPointName(effectiveProposedName)}
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sử dụng đề xuất này
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    Tài xế chưa nhập vị trí đề xuất cụ thể.
                  </div>
                )}

                <input
                  type="text"
                  value={meetingPointName}
                  onChange={(e) => setMeetingPointName(e.target.value)}
                  placeholder={
                    effectiveProposedName
                      ? `Để trống sẽ dùng đề xuất "${effectiveProposedName}", hoặc nhập tên thay thế...`
                      : 'Nhập tên điểm hẹn đón ngoại vi thay thế...'
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--bg-input, #ffffff)',
                    color: 'var(--text-primary, #0f172a)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                    Vĩ độ (Lat):
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={meetingLat.toFixed(6)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-elevated, #f1f5f9)',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
                    Kinh độ (Lng):
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={meetingLng.toFixed(6)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: 'var(--bg-elevated, #f1f5f9)',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '13px' }}>
                <span>Khoảng cách đo được: </span>
                <b style={{ color: distanceMeters <= 500 ? '#16a34a' : '#d97706' }}>
                  {distanceMeters} mét
                </b>
                <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px' }}>
                  Chi phí phát sinh cho Khách hàng: <b>0 VNĐ</b> (Hệ thống tự động miễn phí)
                </div>
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Nút hành động */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'transparent',
                  color: 'var(--text-primary, #0f172a)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Đóng
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--accent-primary, #f57c00)',
                  color: '#ffffff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(245, 124, 0, 0.3)',
                }}
              >
                {isSubmitting ? 'Đang phát lệnh...' : 'Phát lệnh cho Tài xế'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
