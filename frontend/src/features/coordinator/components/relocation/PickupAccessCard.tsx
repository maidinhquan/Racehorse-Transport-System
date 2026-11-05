import React, { useEffect, useState } from 'react';
import type { Any } from '../../store/coordinatorStore';
import { commit, db, me, nowStamp, toast } from '../../store/coordinatorStore';
import { flow3Api } from '../../api/flow3Api';
import { dt } from '../../utils/format';
import type { PickupCandidate } from '../../types/flow3.types';
import { saveSharedRequest, getSharedRequests } from '../../../../shared/utils/sharedRequests';

interface PickupAccessCardProps {
  t: Any;
  onUpdated?: () => void;
}

export const PickupAccessCard: React.FC<PickupAccessCardProps> = ({ t, onUpdated }) => {
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showRelocateModal, setShowRelocateModal] = useState(false);

  // Access evaluation form state
  const [accessResult, setAccessResult] = useState<'ACCESSIBLE' | 'INACCESSIBLE'>(
    t.pickupAccess?.result || 'ACCESSIBLE'
  );
  const [accessProof, setAccessProof] = useState<string>(
    t.pickupAccess?.proof || 'Đường nông thôn vào trang trại hẹp 2.2m, xe thùng chuyên dụng chở ngựa cao 3.8m không vào được.'
  );
  const [accessSubmitting, setAccessSubmitting] = useState(false);

  // Relocation proposal form state
  const [candidates, setCandidates] = useState<PickupCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [relocReason, setRelocReason] = useState<string>(
    'Đoạn đường vào trang trại quá hẹp xe tải 10 tấn không vào được, đề xuất chuyển ra bãi đỗ rộng gần nhất để bốc dỡ an toàn.'
  );
  const [relocHandoverAt, setRelocHandoverAt] = useState<string>(
    t.plannedDepart || nowStamp()
  );
  const [relocCustomerNote, setRelocCustomerNote] = useState<string>(
    'Chuyên viên RTS và xe trung chuyển nhỏ sẽ đón và hộ tống ngựa từ trang trại ra bãi tập kết an toàn.'
  );
  const [facilityConfirmed, setFacilityConfirmed] = useState(true);
  const [relocSubmitting, setRelocSubmitting] = useState(false);

  // Load candidates when opening relocation modal
  useEffect(() => {
    if (!showRelocateModal) return;
    async function loadCandidates() {
      setLoadingCandidates(true);
      try {
        const res = await flow3Api.getPickupRelocationCandidates(t.id);
        const list = Array.isArray(res) ? res : (res as Any)?.data || [];
        if (list.length > 0) {
          setCandidates(list);
          if (!selectedPlaceId) setSelectedPlaceId(list[0].place.id);
          return;
        }
      } catch (e) {
        console.warn('[PickupAccessCard] API candidates fallback to db.places', e);
      }

      // Fallback from db.places
      const matchingPlaces = (db.places || []).filter(
        (p: Any) =>
          p.status === 'ACTIVE' &&
          (p.functions?.includes('REST') ||
            p.functions?.includes('QUARANTINE') ||
            p.functions?.includes('MEETING_POINT') ||
            p.functions?.includes('FUEL'))
      );

      const mapped: PickupCandidate[] = (matchingPlaces.length ? matchingPlaces : db.places || []).slice(0, 6).map(
        (p: Any, idx: number) => ({
          place: {
            id: p.id,
            version: p.version || 1,
            name: p.name,
            country: p.country || 'VN',
            province: p.province || 'Bình Dương',
            address: p.address || 'Địa chỉ cơ sở',
            geo: { lat: p.lat ?? 10.7769, lng: p.lng ?? 106.7009 },
            functions: p.functions || ['REST'],
            hours: p.hours || '24/7',
            contact: p.contact || 'Phụ trách cơ sở',
            phone: p.phone || '+84901234567',
            notes: '',
            rest: null,
            fuel: null,
            airport: null,
            service: null,
            status: 'ACTIVE',
            sample: true,
            updatedAt: nowStamp(),
          } as Any,
          straightLineKm: +(idx * 4.2 + 2.5).toFixed(1),
          eligible: true,
          blockers: [],
        } as PickupCandidate)
      );

      setCandidates(mapped);
      if (mapped.length > 0 && !selectedPlaceId) {
        setSelectedPlaceId(mapped[0].place.id);
      }
      setLoadingCandidates(false);
    }

    void loadCandidates();
  }, [showRelocateModal, t.id]);

  // Handle Save Access Evaluation (F3-J28)
  const handleSaveAccess = async () => {
    if (!accessProof.trim() || accessProof.trim().length < 8) {
      toast('Vui lòng nhập lý do/bằng chứng khảo sát tối thiểu 8 ký tự.');
      return;
    }
    setAccessSubmitting(true);
    try {
      const payload = {
        expectedVersion: t.version || 1,
        result: accessResult,
        proof: accessProof.trim(),
        acknowledged: true as const,
      };

      try {
        await flow3Api.recordPickupAccess(t.id, payload, `acc-${t.id}-${Date.now()}`);
      } catch (err) {
        console.warn('[PickupAccessCard] recordPickupAccess API sync error (proceeding locally)', err);
      }

      t.pickupAccess = {
        result: accessResult,
        proof: accessProof.trim(),
        valid: true,
        by: { userId: me().name || 'COORDINATOR', name: 'Điều phối viên' },
        at: nowStamp(),
      };

      // Also persist to sharedRequests
      const sharedList = getSharedRequests();
      const sReq = sharedList.find((r: Any) => r.id === t.requestId || r.id === t.id);
      if (sReq) {
        sReq.pickupAccess = t.pickupAccess;
        saveSharedRequest(sReq);
      }

      commit();
      toast(
        accessResult === 'INACCESSIBLE'
          ? 'Đã xác nhận: Điểm đón xe lớn không vào được. Vui lòng lập đề xuất đổi điểm tập kết!'
          : 'Đã xác nhận: Điểm đón tiếp cận bình thường cho xe chở ngựa.'
      );
      setShowAccessModal(false);
      onUpdated?.();
    } finally {
      setAccessSubmitting(false);
    }
  };

  // Handle Submit Relocation Proposal (F3-J30)
  const handleSubmitRelocation = async () => {
    if (!selectedPlaceId) {
      toast('Vui lòng chọn 1 điểm tập kết thay thế.');
      return;
    }
    if (!relocReason.trim() || relocReason.trim().length < 10) {
      toast('Lý do dời điểm phải có ít nhất 10 ký tự.');
      return;
    }
    if (!facilityConfirmed) {
      toast('Cần xác nhận cơ sở đã sẵn sàng tiếp nhận.');
      return;
    }

    setRelocSubmitting(true);
    try {
      const cand = candidates.find((c) => c.place.id === selectedPlaceId);
      const placeSnap = cand?.place || (db.places || []).find((p: Any) => p.id === selectedPlaceId) || {
        id: selectedPlaceId,
        name: 'Điểm tập kết thay thế',
        address: 'Địa chỉ tập kết',
      };

      const relocId = `RELOC_${Date.now()}`;
      const payload = {
        expectedVersion: t.version || 1,
        placeId: selectedPlaceId,
        placeVersion: placeSnap.version || 1,
        reason: relocReason.trim(),
        handoverAt: relocHandoverAt,
        facilityConfirmed: true as const,
      };

      try {
        await flow3Api.proposePickupRelocation(t.id, payload, `reloc-${t.id}-${Date.now()}`);
      } catch (err) {
        console.warn('[PickupAccessCard] proposePickupRelocation API sync error (proceeding locally)', err);
      }

      const proposalData = {
        relocationId: relocId,
        proposalVersion: (t.pickupRelocation?.proposalVersion || 0) + 1,
        status: 'PROPOSED',
        candidatePlaceId: selectedPlaceId,
        placeName: placeSnap.name,
        placeAddress: placeSnap.address,
        placeSnapshot: placeSnap,
        reason: relocReason.trim(),
        handoverAt: relocHandoverAt,
        scheduleImpact: 'Không ảnh hưởng lịch bay',
        customerResponsibilities: relocCustomerNote.trim(),
        at: nowStamp(),
        by: { userId: me().name || 'COORDINATOR', name: 'Điều phối viên' },
      };

      t.pickupRelocation = proposalData;

      // Sync to sharedRequests so Manager and Customer see it immediately
      const sharedList = getSharedRequests();
      const sReq = sharedList.find((r: Any) => r.id === t.requestId || r.id === t.id);
      if (sReq) {
        sReq.pickupRelocation = proposalData;
        saveSharedRequest(sReq);
      }

      commit();
      toast('Đã gửi đề xuất đổi điểm đón lên Quản lý vận hành phê duyệt (F3-J30)!');
      setShowRelocateModal(false);
      onUpdated?.();
    } finally {
      setRelocSubmitting(false);
    }
  };

  // Reopen proposal if customer rejected (F3-J33)
  const handleReopen = async () => {
    try {
      try {
        await flow3Api.reopenPickupRelocation(t.id, { expectedVersion: t.version || 1 }, `reopen-${t.id}-${Date.now()}`);
      } catch (err) {
        console.warn('[PickupAccessCard] reopen API sync error', err);
      }

      if (t.pickupRelocation) {
        t.pickupRelocation.status = 'PROPOSED';
        t.pickupRelocation.proposalVersion = (t.pickupRelocation.proposalVersion || 1) + 1;
        t.pickupRelocation.customerReply = null;
      }
      commit();
      toast('Đã mở lại đề xuất dời điểm đón (v2). Hãy chọn điểm tập kết mới phù hợp hơn!');
      setShowRelocateModal(true);
      onUpdated?.();
    } catch {
      toast('Có lỗi khi mở lại đề xuất.');
    }
  };

  // Quick Demo Simulator actions
  const simulateManagerApproveAndSend = () => {
    if (!t.pickupRelocation) return;
    t.pickupRelocation.status = 'AWAITING_CUSTOMER';
    t.pickupRelocation.sentAt = nowStamp();
    const sharedList = getSharedRequests();
    const sReq = sharedList.find((r: Any) => r.id === t.requestId || r.id === t.id);
    if (sReq) {
      sReq.pickupRelocation = t.pickupRelocation;
      saveSharedRequest(sReq);
    }
    commit();
    toast('Đã mô phỏng: Quản lý đã duyệt và gửi đề xuất cho Khách hàng qua Cổng thông tin (F3-J56)!');
    onUpdated?.();
  };

  const simulateCustomerDecision = (decision: 'ACCEPT' | 'REJECT') => {
    if (!t.pickupRelocation) return;
    if (decision === 'ACCEPT') {
      t.pickupRelocation.status = 'CUSTOMER_CONFIRMED';
      t.pickupRelocation.customerReply = {
        decision: 'ACCEPT',
        note: 'Khách hàng đồng ý chuyển điểm đón ngựa ra bãi tập kết mới',
        at: nowStamp(),
      };
      // Update effective origin in route
      t.effectiveOriginPlaceId = t.pickupRelocation.candidatePlaceId;
      if (t.routes && t.routes.length > 0) {
        const cur = t.routes[t.routes.length - 1];
        if (cur?.stops && cur.stops.length > 0) {
          const originStop = cur.stops.find((s: Any) => s.type === 'ORIGIN') || cur.stops[0];
          originStop.name = t.pickupRelocation.placeName || originStop.name;
          originStop.address = t.pickupRelocation.placeAddress || originStop.address;
          if (t.pickupRelocation.placeSnapshot?.geo) {
            originStop.lat = t.pickupRelocation.placeSnapshot.geo.lat;
            originStop.lng = t.pickupRelocation.placeSnapshot.geo.lng;
          }
        }
      }
      toast('Đã mô phỏng: Khách hàng ĐỒNG Ý đổi điểm đón! Lộ trình đã được cập nhật sang điểm mới.');
    } else {
      t.pickupRelocation.status = 'CUSTOMER_REJECTED';
      t.pickupRelocation.customerReply = {
        decision: 'REJECT',
        note: 'Điểm đề xuất quá xa trang trại (12km), không tiện di chuyển ngựa.',
        at: nowStamp(),
      };
      toast('Đã mô phỏng: Khách hàng TỪ CHỐI đổi điểm đón. Giữ nguyên điểm cũ và báo Điều phối viên đề xuất lại.');
    }

    const sharedList = getSharedRequests();
    const sReq = sharedList.find((r: Any) => r.id === t.requestId || r.id === t.id);
    if (sReq) {
      sReq.pickupRelocation = t.pickupRelocation;
      saveSharedRequest(sReq);
    }
    commit();
    onUpdated?.();
  };

  const pa = t.pickupAccess;
  const pr = t.pickupRelocation;
  const isInaccessible = pa?.result === 'INACCESSIBLE';
  const isAccessLocked = !!pr && ['PROPOSED', 'MANAGER_APPROVED', 'AWAITING_CUSTOMER', 'CUSTOMER_CONFIRMED'].includes(pr.status);
  const isConfirmedAndLocked = pr?.status === 'CUSTOMER_CONFIRMED';
  const isPendingApprovalOrCustomer = !!pr && ['PROPOSED', 'MANAGER_APPROVED', 'AWAITING_CUSTOMER'].includes(pr.status);

  return (
    <div
      style={{
        marginTop: 14,
        background: '#fff',
        borderRadius: 10,
        border: isInaccessible ? '1.5px solid #f97316' : '1px solid #e2e8f0',
        padding: '14px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🚚</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            Khảo sát đường vào &amp; Đổi điểm đón (F3-J28 .. J33)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pa?.result === 'ACCESSIBLE' ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '3px 9px', borderRadius: 6 }}>
              ✓ Xe tải vào tận nơi được
            </span>
          ) : pa?.result === 'INACCESSIBLE' ? (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#c2410c', background: '#ffedd5', padding: '3px 9px', borderRadius: 6 }}>
              ⚠️ Xe lớn không vào được
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 9px', borderRadius: 6 }}>
              ⚪ Chưa khảo sát đường vào
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (isAccessLocked) {
                toast('Không thể sửa khảo sát đường vào: Đề xuất đổi điểm đang được xử lý hoặc đã chốt với khách hàng.');
                return;
              }
              setShowAccessModal(true);
            }}
            disabled={isAccessLocked}
            title={isAccessLocked ? 'Khóa sửa: Đề xuất đổi điểm đón đang xử lý hoặc đã chốt' : ''}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: isAccessLocked ? '#f1f5f9' : '#f8fafc',
              border: `1px solid ${isAccessLocked ? '#e2e8f0' : '#cbd5e1'}`,
              color: isAccessLocked ? '#94a3b8' : '#334155',
              cursor: isAccessLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isAccessLocked ? '🔒 Đã khóa khảo sát' : pa ? 'Đánh giá lại' : 'Xác minh đường vào'}
          </button>
        </div>
      </div>

      {/* Access Proof Note */}
      {pa?.proof && (
        <div style={{ fontSize: 12, color: '#475569', marginTop: 8, fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
          Ghi chú khảo sát: {pa.proof} ({pa.at || 'vừa xong'})
        </div>
      )}

      {/* Relocation Section if Inaccessible */}
      {isInaccessible && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #fdba74' }}>
          {!pr ? (
            <div style={{ background: '#fff7ed', padding: '10px 14px', borderRadius: 8, border: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412' }}>
                  ⚠️ Cần đổi điểm đón: Xe chuyên dụng không thể tiếp cận địa chỉ này!
                </div>
                <div style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>
                  Tạo đề xuất chọn bãi tập kết thay thế gần nhất để gửi Quản lý duyệt và xin ý kiến khách hàng.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRelocateModal(true)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + Lập đề xuất dời điểm đón
              </button>
            </div>
          ) : (
            <div style={{ background: pr.status === 'CUSTOMER_CONFIRMED' ? '#f0fdf4' : pr.status === 'CUSTOMER_REJECTED' ? '#fef2f2' : '#f8fafc', padding: '12px 14px', borderRadius: 8, border: `1px solid ${pr.status === 'CUSTOMER_CONFIRMED' ? '#86efac' : pr.status === 'CUSTOMER_REJECTED' ? '#fca5a5' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                  Đề xuất dời điểm đón (v{pr.proposalVersion || 1}) • {pr.relocationId}
                </span>

                {pr.status === 'PROPOSED' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>
                    ⏳ Chờ Quản lý duyệt (F3-J31)
                  </span>
                )}
                {pr.status === 'MANAGER_APPROVED' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 4 }}>
                    Quản lý đã duyệt • Chờ gửi khách
                  </span>
                )}
                {pr.status === 'AWAITING_CUSTOMER' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#ea580c', background: '#ffedd5', padding: '2px 8px', borderRadius: 4 }}>
                    📬 Đã gửi khách • Chờ phản hồi (F3-J32)
                  </span>
                )}
                {pr.status === 'CUSTOMER_CONFIRMED' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>
                    ✅ Khách đã đồng ý
                  </span>
                )}
                {pr.status === 'CUSTOMER_REJECTED' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 8px', borderRadius: 4 }}>
                    ❌ Khách đã từ chối
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                <div><b>Điểm đón đề xuất:</b> {pr.placeName} ({pr.placeAddress})</div>
                <div><b>Lý do:</b> {pr.reason}</div>
                {pr.handoverAt && <div><b>Hẹn đón lúc:</b> {dt(pr.handoverAt)}</div>}
                {pr.customerResponsibilities && <div><b>Phương án trung chuyển:</b> {pr.customerResponsibilities}</div>}
              </div>

              {/* Status specific alerts */}
              {isConfirmedAndLocked && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#166534', background: '#dcfce7', padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: 13 }}>🔒</span>
                  <span><b>ĐÃ CHỐT VỚI KHÁCH HÀNG:</b> Điểm đón mới đã chính thức có hiệu lực tại <b>{pr.placeName}</b>. Thỏa thuận đã chốt và không thể chỉnh sửa. Lộ trình xe đã cập nhật sang điểm này.</span>
                </div>
              )}

              {isPendingApprovalOrCustomer && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#0369a1', background: '#e0f2fe', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>🔒</span>
                  <span><b>Biểu mẫu đề xuất đã được khóa:</b> Đang trong quy trình phê duyệt &amp; chờ khách quyết định. Không cho phép sửa đổi đè.</span>
                </div>
              )}

              {pr.status === 'CUSTOMER_REJECTED' && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#fee2e2', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#991b1b' }}>
                    <b>Lý do khách từ chối:</b> {pr.customerReply?.note || 'Không phù hợp'}
                  </div>
                  <button
                    type="button"
                    onClick={handleReopen}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Mở lại đề xuất (v{ (pr.proposalVersion || 1) + 1 })
                  </button>
                </div>
              )}

              {/* Quick simulation bar for testing & demo */}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #cbd5e1', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Demo test:</span>
                {pr.status === 'PROPOSED' && (
                  <button
                    type="button"
                    onClick={simulateManagerApproveAndSend}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', cursor: 'pointer' }}
                  >
                    Mô phỏng Quản lý duyệt &amp; gửi khách
                  </button>
                )}
                {pr.status === 'AWAITING_CUSTOMER' && (
                  <>
                    <button
                      type="button"
                      onClick={() => simulateCustomerDecision('ACCEPT')}
                      style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', cursor: 'pointer' }}
                    >
                      Mô phỏng Khách Đồng ý (ACCEPT)
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateCustomerDecision('REJECT')}
                      style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', cursor: 'pointer' }}
                    >
                      Mô phỏng Khách Từ chối (REJECT)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ACCESS EVALUATION */}
      {showAccessModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '90%', maxWidth: 500, borderRadius: 12, padding: 20, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#0f172a' }}>
              Xác minh điều kiện tiếp cận điểm đón (F3-J28)
            </h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
              Kiểm tra thực tế bề rộng đường, tải trọng cầu, tĩnh không hầm xem xe tải chở ngựa chuyên dụng (10 tấn, cao 3.8m) có thể vào tận nơi hay không.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: accessResult === 'ACCESSIBLE' ? '#f0fdf4' : '#f8fafc', border: `1px solid ${accessResult === 'ACCESSIBLE' ? '#22c55e' : '#e2e8f0'}` }}>
                <input
                  type="radio"
                  name="accessResult"
                  checked={accessResult === 'ACCESSIBLE'}
                  onChange={() => setAccessResult('ACCESSIBLE')}
                />
                <div>
                  <b style={{ color: '#16a34a' }}>Đường vào đảm bảo (ACCESSIBLE)</b>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Đường rộng &gt; 3.5m, tĩnh không &gt; 4m, cầu không hạn chế tải.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: accessResult === 'INACCESSIBLE' ? '#fff7ed' : '#f8fafc', border: `1px solid ${accessResult === 'INACCESSIBLE' ? '#ea580c' : '#e2e8f0'}` }}>
                <input
                  type="radio"
                  name="accessResult"
                  checked={accessResult === 'INACCESSIBLE'}
                  onChange={() => setAccessResult('INACCESSIBLE')}
                />
                <div>
                  <b style={{ color: '#ea580c' }}>Xe lớn KHÔNG THỂ vào được (INACCESSIBLE)</b>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Hẻm nhỏ, đường nông thôn hẹp, cầu yếu hoặc tĩnh không thấp.</div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Bằng chứng / Lý do khảo sát thực tế (tối thiểu 8 ký tự):
              </label>
              <textarea
                rows={3}
                value={accessProof}
                onChange={(e) => setAccessProof(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                placeholder="Ví dụ: Đường bê tông nông thôn rộng 2.2m, xe thùng 3.8m không qua được cổng làng..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAccessModal(false)}
                disabled={accessSubmitting}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAccess}
                disabled={accessSubmitting}
                style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0284c7', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {accessSubmitting ? 'Đang lưu...' : 'Lưu xác minh (F3-J28)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PROPOSE RELOCATION */}
      {showRelocateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '92%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', borderRadius: 12, padding: 22, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, color: '#0f172a' }}>
              Lập đề xuất đổi điểm tập kết / đón ngựa thay thế (F3-J30)
            </h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>
              Chọn điểm tập kết an toàn (bãi đỗ rộng, có nguồn nước và dốc hạ tải) gần địa chỉ đón gốc để trình Quản lý duyệt trước khi gửi khách.
            </p>

            {/* Candidate List */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Chọn điểm tập kết thay thế (Candidates):
              </label>

              {loadingCandidates ? (
                <div style={{ fontSize: 12, color: '#64748b', padding: 12, textAlign: 'center' }}>Đang tìm các cơ sở phù hợp gần điểm đón...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
                  {candidates.map((cand) => (
                    <label
                      key={cand.place.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: selectedPlaceId === cand.place.id ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${selectedPlaceId === cand.place.id ? '#3b82f6' : '#e2e8f0'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="candidatePlace"
                        checked={selectedPlaceId === cand.place.id}
                        onChange={() => setSelectedPlaceId(cand.place.id)}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{cand.place.name}</span>
                          <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>~{cand.straightLineKm} km</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>📍 {cand.place.address}</div>
                        <div style={{ fontSize: 10, color: '#0f766e', marginTop: 4, display: 'flex', gap: 8 }}>
                          <span>✓ Bãi đỗ rộng</span>
                          <span>✓ Nguồn nước</span>
                          <span>✓ Chuồng đệm tạm</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Handover datetime */}
            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Thời gian đón ngựa tại điểm mới:
                </label>
                <input
                  type="text"
                  value={relocHandoverAt}
                  onChange={(e) => setRelocHandoverAt(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Ảnh hưởng lịch trình:
                </label>
                <input
                  type="text"
                  defaultValue="Không ảnh hưởng lịch bay"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                  readOnly
                />
              </div>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Lý do đề xuất dời điểm (tối thiểu 10 ký tự):
              </label>
              <textarea
                rows={2}
                value={relocReason}
                onChange={(e) => setRelocReason(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                placeholder="Nêu rõ tình trạng đường vào ngõ hẹp, cầu yếu..."
              />
            </div>

            {/* Customer Responsibility / Transfer note */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                Phương án hỗ trợ đưa ngựa ra điểm tập kết:
              </label>
              <textarea
                rows={2}
                value={relocCustomerNote}
                onChange={(e) => setRelocCustomerNote(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, boxSizing: 'border-box' }}
                placeholder="Ghi rõ RTS hỗ trợ xe trung chuyển hoặc dắt bộ có chuyên viên đi kèm..."
              />
            </div>

            {/* Confirmation checkbox */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#1e293b', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={facilityConfirmed}
                  onChange={(e) => setFacilityConfirmed(e.target.checked)}
                />
                <b>Xác nhận cơ sở tiếp nhận đã sẵn sàng phục vụ việc hạ tải và trung chuyển ngựa (facilityConfirmed)</b>
              </label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowRelocateModal(false)}
                disabled={relocSubmitting}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitRelocation}
                disabled={relocSubmitting}
                style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#ea580c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {relocSubmitting ? 'Đang gửi...' : 'Gửi đề xuất lên Quản lý duyệt (F3-J30)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickupAccessCard;
