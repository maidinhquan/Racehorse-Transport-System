import React, { useState } from 'react';
import './SpecialistPortal.css';
import { OperationsInbox } from '../../../flow1/relational/Pages';
import { Notifications } from '../../../flow1/relational/Notifications';
import type {
  SpecialistNav,
  SpecialistTrip,
  SpecialistDoc,
  DocRequest,
  CheckpointClearance,
  QuarantineBooking,
  DocumentPackage,
  RegulationItem,
  DocTypeItem,
  CheckpointItem,
  AuditItem
} from './views';
import {
  Icon,
  INITIAL_TRIPS,
  INITIAL_DOCUMENTS,
  INITIAL_DOC_REQUESTS,
  INITIAL_CLEARANCES,
  INITIAL_QUARANTINE_BOOKINGS,
  INITIAL_PACKAGES,
  INITIAL_REGULATIONS,
  INITIAL_DOC_TYPES,
  INITIAL_CHECKPOINTS,
  INITIAL_AUDIT_LOG,
  RenderDashboardPage,
  RenderAssignedTripsPage,
  RenderTripDetailPage,
  RenderReviewQueuePage,
  RenderDocumentReviewModal,
  RenderDocumentRequestsPage,
  RenderQuarantineCustomsPage,
  RenderDocumentPackagesPage,
  RenderRegulationsMasterPage,
  RenderAuditHistoryPage
} from './views';

interface SpecialistPortalProps {
  initialNav?: SpecialistNav;
  flow1?: boolean;
}

export const SpecialistPortal: React.FC<SpecialistPortalProps> = ({
  initialNav = 'dashboard', flow1 = false
}) => {
  // Navigation & selection state
  const [activeNav, setActiveNav] = useState<SpecialistNav>(initialNav);
  const [selectedTripId, setSelectedTripId] = useState<string>('TRP-902');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Global domain states
  const [trips, setTrips] = useState<SpecialistTrip[]>(INITIAL_TRIPS);
  const [docs, setDocs] = useState<SpecialistDoc[]>(INITIAL_DOCUMENTS);
  const [requests, setRequests] = useState<DocRequest[]>(INITIAL_DOC_REQUESTS);
  const [clearances, setClearances] = useState<CheckpointClearance[]>(INITIAL_CLEARANCES);
  const [bookings, setBookings] = useState<QuarantineBooking[]>(INITIAL_QUARANTINE_BOOKINGS);
  const [packages, setPackages] = useState<DocumentPackage[]>(INITIAL_PACKAGES);
  const [regulations] = useState<RegulationItem[]>(INITIAL_REGULATIONS);
  const [docTypes] = useState<DocTypeItem[]>(INITIAL_DOC_TYPES);
  const [checkpoints] = useState<CheckpointItem[]>(INITIAL_CHECKPOINTS);
  const [auditLog, setAuditLog] = useState<AuditItem[]>(INITIAL_AUDIT_LOG);

  // App UI state
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [toastMsg, setToastMsg] = useState<string | null>(null);


  // Modals state
  const [isCreateReqModalOpen, setIsCreateReqModalOpen] = useState(false);
  const [isRecordCBNDocModalOpen, setIsRecordCBNDocModalOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isNewPackageModalOpen, setIsNewPackageModalOpen] = useState(false);

  // Modal form fields
  const [modalTripId, setModalTripId] = useState<string>('TRP-902');
  const [modalTypeId, setModalTypeId] = useState<string>('DT-2');
  const [modalReason, setModalReason] = useState<string>('');
  const [modalDueAt, setModalDueAt] = useState<string>('2026-10-14');

  // CBN Record Doc form fields
  const [cbnDocName, setCbnDocName] = useState<string>('Giấy phép xuất khẩu (Export Permit)');
  const [cbnDocNumber, setCbnDocNumber] = useState<string>('EXP-VN-2026-0902');
  const [cbnFileName, setCbnFileName] = useState<string>('cbn-export-permit-han-sin.pdf');

  // New Booking form fields
  const [bookingCpId, setBookingCpId] = useState<string>('CP-32');
  const [bookingSlot, setBookingSlot] = useState<string>('2026-10-25');
  const [bookingNotes, setBookingNotes] = useState<string>('Đăng ký cách ly 14 ngày cho ngựa thi đấu.');

  // New Package form fields
  const [pkgTitle, setPkgTitle] = useState<string>('Gói hồ sơ đường bay HAN - SIN');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Log action helper
  const addAudit = (action: string, entity: string, detail: string) => {
    const newEntry: AuditItem = {
      id: `AUD-${Date.now()}`,
      at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actor: '{localStorage.getItem("userFullName")||"Specialist"}',
      role: 'Transport Specialist',
      action,
      entity,
      detail
    };
    setAuditLog((prev) => [newEntry, ...prev]);
  };

  // Re-calculate checklist progress for a trip
  const refreshTripChecklist = (tripId: string, currentDocs: SpecialistDoc[]) => {
    const tDocs = currentDocs.filter((d) => d.tripId === tripId);
    const approved = tDocs.filter((d) => d.status === 'APPROVED').length;
    const total = tDocs.length || 5;
    const isReady = approved === total && total > 0;

    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              checklist: {
                ready: approved,
                total,
                status: isReady ? 'READY' : 'NOT_READY'
              }
            }
          : t
      )
    );
  };

  // --------------------------------------------------------------------------
  // ACTIONS: APPROVE / REJECT & REQUEST SUPPLEMENT (The Core Specialist Flow)
  // --------------------------------------------------------------------------
  const handleApproveDoc = (docId: string, remark: string) => {
    const targetDoc = docs.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updatedDocs = docs.map((d) => {
      if (d.id !== docId) return d;
      const latestV = d.versions[d.versions.length - 1].v;
      return {
        ...d,
        status: 'APPROVED' as const,
        rejectReason: undefined,
        reviews: [
          ...d.reviews,
          {
            v: latestV,
            decision: 'APPROVED' as const,
            remark,
            at: new Date().toISOString().slice(0, 16).replace('T', ' '),
            by: '{localStorage.getItem("userFullName")||"Specialist"}'
          }
        ]
      };
    });

    setDocs(updatedDocs);
    refreshTripChecklist(targetDoc.tripId, updatedDocs);

    // If there was an open request for this doc, mark it fulfilled
    setRequests((prev) =>
      prev.map((r) =>
        r.tripId === targetDoc.tripId && r.typeId === targetDoc.typeId
          ? { ...r, status: 'FULFILLED' }
          : r
      )
    );

    addAudit(
      'Phê duyệt chứng từ',
      `${targetDoc.id} (${targetDoc.typeName})`,
      `Đã duyệt đạt chuẩn cho chuyến ${targetDoc.tripId}: ${remark}`
    );

    showToast(`✓ Đã duyệt chứng từ ${targetDoc.typeName}! Tiến độ chuyến ${targetDoc.tripId} đã được cập nhật.`);
    setSelectedDocId(null);
  };

  const handleRejectAndRequestSupplement = (docId: string, reason: string, dueDate: string) => {
    const targetDoc = docs.find((d) => d.id === docId);
    if (!targetDoc) return;

    const latestV = targetDoc.versions[targetDoc.versions.length - 1].v;

    // Update doc status to REJECTED
    const updatedDocs = docs.map((d) => {
      if (d.id !== docId) return d;
      return {
        ...d,
        status: 'REJECTED' as const,
        rejectReason: reason,
        reviews: [
          ...d.reviews,
          {
            v: latestV,
            decision: 'REJECTED' as const,
            remark: reason,
            at: new Date().toISOString().slice(0, 16).replace('T', ' '),
            by: '{localStorage.getItem("userFullName")||"Specialist"}'
          }
        ]
      };
    });

    setDocs(updatedDocs);
    refreshTripChecklist(targetDoc.tripId, updatedDocs);

    // Create or update Document Request sent to customer
    const newReqId = `DR-${Math.floor(10 + Math.random() * 90)}`;
    const newReq: DocRequest = {
      id: newReqId,
      tripId: targetDoc.tripId,
      typeId: targetDoc.typeId,
      typeName: targetDoc.typeName,
      horseId: targetDoc.horseId,
      horseName: targetDoc.horseName,
      reason,
      dueAt: dueDate,
      status: 'OPEN',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      history: [
        {
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          action: `Chuyên viên từ chối phiên bản v${latestV} và yêu cầu khách hàng bổ sung lại.`,
          by: '{localStorage.getItem("userFullName")||"Specialist"}'
        }
      ]
    };

    setRequests((prev) => [newReq, ...prev]);

    addAudit(
      'Từ chối & Cho khách bổ sung',
      `${targetDoc.id} • ${newReqId}`,
      `Từ chối bản v${latestV} do: ${reason}. Hạn bổ sung: ${dueDate}`
    );

    showToast(
      `❌ Đã từ chối chứng từ. Hệ thống đã gửi thông báo yêu cầu bổ sung ${newReqId} tới khách hàng!`
    );
    setSelectedDocId(null);
  };

  const handleTogglePhysicalCopy = (docId: string) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, physicalCopyReceived: !d.physicalCopyReceived } : d
      )
    );
    const d = docs.find((x) => x.id === docId);
    showToast(
      d?.physicalCopyReceived
        ? `Đã đánh dấu CHƯA nhận bản cứng gốc ${d.typeName}`
        : `✓ Đã xác nhận ĐÃ NHẬN bản cứng gốc ${d?.typeName} để bàn giao tổ xe!`
    );
  };

  const handleExportZip = (tripId: string) => {
    addAudit('Xuất gói chứng từ', tripId, 'Đã kết xuất bộ hồ sơ số nén ZIP/PDF phục vụ đoàn áp tải.');
    showToast(`⬇ Đang tải xuống gói tài liệu nén ZIP và PDF đi đường cho chuyến ${tripId}...`);
  };

  const handleCreateRequest = () => {
    if (!modalReason.trim()) {
      alert('Vui lòng nhập lý do cụ thể gửi khách hàng.');
      return;
    }
    const dType = docTypes.find((d) => d.id === modalTypeId);
    const trip = trips.find((t) => t.id === modalTripId);
    const newReq: DocRequest = {
      id: `DR-${Math.floor(10 + Math.random() * 90)}`,
      tripId: modalTripId,
      typeId: modalTypeId,
      typeName: dType ? dType.name : 'Chứng từ yêu cầu bổ sung',
      horseId: trip?.horses[0]?.id,
      horseName: trip?.horses[0]?.name,
      reason: modalReason,
      dueAt: modalDueAt,
      status: 'OPEN',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      history: [
        {
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          action: 'Tạo yêu cầu bổ sung mới',
          by: '{localStorage.getItem("userFullName")||"Specialist"}'
        }
      ]
    };
    setRequests((prev) => [newReq, ...prev]);
    setIsCreateReqModalOpen(false);
    setModalReason('');
    addAudit('Tạo yêu cầu bổ sung', newReq.id, `Gửi khách hàng chuyến ${modalTripId}: ${modalReason}`);
    showToast(`✓ Đã tạo thành công yêu cầu bổ sung ${newReq.id} gửi đến khách hàng!`);
  };

  const handleRecordCBNDoc = () => {
    const newDocId = `DOC-${Math.floor(111 + Math.random() * 888)}`;
    const newDoc: SpecialistDoc = {
      id: newDocId,
      tripId: modalTripId,
      typeId: 'DT-4',
      typeName: cbnDocName,
      category: 'OPERATIONAL',
      group: 'CUSTOMS',
      provider: 'CBN',
      status: 'APPROVED',
      number: cbnDocNumber,
      issuer: 'Cơ quan Nhà nước cấp cho CBN Transport',
      issuedAt: new Date().toISOString().slice(0, 10),
      expiry: '2026-11-20',
      physicalCopyReceived: true,
      versions: [
        {
          v: 1,
          file: cbnFileName,
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          by: '{localStorage.getItem("userFullName")||"Specialist"}'
        }
      ],
      reviews: [
        {
          v: 1,
          decision: 'APPROVED',
          remark: 'CBN đã nhận bản cấp phép chính thức từ cơ quan quản lý.',
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          by: '{localStorage.getItem("userFullName")||"Specialist"}'
        }
      ]
    };

    const updated = [newDoc, ...docs];
    setDocs(updated);
    refreshTripChecklist(modalTripId, updated);
    setIsRecordCBNDocModalOpen(false);
    addAudit('Ghi nhận tệp CBN', newDocId, `Ghi nhận ${cbnDocName} cho chuyến ${modalTripId}`);
    showToast(`✓ Đã ghi nhận tài liệu CBN ${newDocId} và tự động cập nhật phê duyệt!`);
  };

  const handleRecordClearance = (
    clrId: string,
    result: 'PASSED' | 'HELD' | 'FAILED',
    ref: string,
    remark: string
  ) => {
    setClearances((prev) =>
      prev.map((c) =>
        c.id === clrId
          ? {
              ...c,
              result,
              ref,
              remark,
              at: new Date().toISOString().slice(0, 16).replace('T', ' ')
            }
          : c
      )
    );
    addAudit('Ghi nhận thông quan', clrId, `Kết quả: ${result} • Số ref: ${ref}`);
    showToast(`✓ Đã cập nhật kết quả thông quan (${result}) thành công!`);
  };

  const handleConfirmBooking = (bookingId: string, ref: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              ref,
              status: 'BOOKED',
              confirmedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
            }
          : b
      )
    );
    addAudit('Xác nhận đặt chỗ kiểm dịch', bookingId, `Đã có mã xác nhận: ${ref}`);
    showToast(`✓ Đã xác nhận mã booking trạm kiểm dịch: ${ref}`);
  };

  const handleCreateNewBooking = () => {
    const cp = checkpoints.find((c) => c.id === bookingCpId);
    const newB: QuarantineBooking = {
      id: `QB-${Math.floor(10 + Math.random() * 90)}`,
      tripId: modalTripId,
      cpId: bookingCpId,
      cpName: cp ? cp.name : 'Trạm kiểm dịch',
      slot: bookingSlot,
      ref: '',
      status: 'REQUESTED',
      notes: bookingNotes
    };
    setBookings((prev) => [newB, ...prev]);
    setIsNewBookingModalOpen(false);
    addAudit('Đặt chỗ trạm kiểm dịch', newB.id, `Chuyến ${modalTripId} tại ${newB.cpName}`);
    showToast(`✓ Đã gửi yêu cầu đặt chỗ kiểm dịch ${newB.id}!`);
  };

  const handleMarkPackageReady = (pkgId: string) => {
    setPackages((prev) =>
      prev.map((p) => (p.id === pkgId ? { ...p, status: 'READY' } : p))
    );
    addAudit('Gói hồ sơ sẵn sàng', pkgId, 'Đã gom đủ các chứng từ gốc và đánh dấu READY.');
    showToast(`✓ Gói hồ sơ ${pkgId} đã sẵn sàng bàn giao cho tổ xe!`);
  };

  const handleHandoverPackage = (pkgId: string, recipientName: string) => {
    setPackages((prev) =>
      prev.map((p) =>
        p.id === pkgId
          ? {
              ...p,
              status: 'HANDED_OVER',
              releasedTo: recipientName,
              releasedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
            }
          : p
      )
    );
    addAudit('Bàn giao gói hồ sơ', pkgId, `Bàn giao bản cứng gốc cho: ${recipientName}`);
    showToast(`✓ Đã bàn giao túi chứng từ gốc cho ${recipientName}!`);
  };

  const handleCreatePackage = () => {
    const newPkg: DocumentPackage = {
      id: `PKG-${Math.floor(900 + Math.random() * 99)}`,
      tripId: modalTripId,
      title: pkgTitle,
      status: 'DRAFT_PACKAGE',
      docsCount: 4,
      docSummary: 'Hộ chiếu FEI, Giấy kiểm dịch xuất cảnh, Sổ tiêm phòng và Giấy phép quá cảnh',
      history: [
        {
          at: new Date().toISOString().slice(0, 16).replace('T', ' '),
          by: '{localStorage.getItem("userFullName")||"Specialist"}',
          text: 'Khởi tạo gói hồ sơ mới'
        }
      ]
    };
    setPackages((prev) => [newPkg, ...prev]);
    setIsNewPackageModalOpen(false);
    addAudit('Khởi tạo gói hồ sơ', newPkg.id, `Tạo gói hồ sơ ${pkgTitle} cho ${modalTripId}`);
    showToast(`✓ Đã tạo gói hồ sơ ${newPkg.id}!`);
  };

  // --------------------------------------------------------------------------
  // TOPBAR TITLE DYNAMIC
  // --------------------------------------------------------------------------
  const getPageTitle = () => {
    switch (activeNav) {
      case 'dashboard':
        return lang === 'vi' ? 'Tổng quan' : 'Overview';
      case 'trips':
        return lang === 'vi' ? 'Chuyến vận chuyển phân công' : 'Assigned Trips';
      case 'trip_detail':
        return `${lang === 'vi' ? 'Chi tiết chuyến' : 'Trip'} ${selectedTripId}`;
      case 'queue':
        return lang === 'vi' ? 'Hàng đợi thẩm định hồ sơ' : 'Review Queue';
      case 'requests':
        return lang === 'vi' ? 'Yêu cầu bổ sung hồ sơ' : 'Document Requests';
      case 'checkpoints':
        return lang === 'vi' ? 'Kiểm dịch & Thủ tục Hải quan' : 'Quarantine & Customs';
      case 'packages':
        return lang === 'vi' ? 'Gói hồ sơ đi đường' : 'Document Packages';
      case 'master':
        return lang === 'vi' ? 'Quy định & Thiết lập danh mục' : 'Regulations & Master';
      case 'audit':
        return lang === 'vi' ? 'Lịch sử thao tác & Thẩm định' : 'Audit History';
      default:
        return 'Specialist Portal';
    }
  };

  const curTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const curReviewDoc = docs.find((d) => d.id === selectedDocId);

  // Counter badges
  const awaitingCount = docs.filter((d) => d.status === 'SUBMITTED').length;
  const openReqCount = requests.filter((r) => r.status === 'OPEN' || r.status === 'SUBMITTED').length;

  return (
    <div className="cbn-specialist-app">
      {/* SIDEBAR (208px fixed width matching images) */}
      <aside className="specialist-sidebar">
        <div
          className="brand-row"
          onClick={() => {
            setActiveNav('dashboard');
          }}
        >
          <span className="brand-accent">CBN</span> Transport
        </div>

        <div className="role-chip-box">
          <b className="role-title">
            {lang === 'vi' ? 'Chuyên viên pháp lý & kiểm dịch' : 'Transport Specialist'}
          </b>
          <span className="role-sub">
            {lang === 'vi' ? 'Quản lý vận hành • Cổng chuyên viên' : 'Operations • Specialist Portal'}
          </span>
        </div>

        <nav className="sidebar-nav-menu">
          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <Icon name="home" />
            <span>{lang === 'vi' ? 'Tổng quan' : 'Dashboard'}</span>
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'trips' || activeNav === 'trip_detail' ? 'active' : ''}`}
            onClick={() => setActiveNav('trips')}
          >
            <Icon name="truck" />
            <span>{lang === 'vi' ? 'Chuyến phân công' : 'Assigned Trips'}</span>
            <span className="badge-count-pill">{trips.length}</span>
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveNav('queue')}
          >
            <Icon name="doc" />
            <span>{lang === 'vi' ? 'Hàng đợi thẩm định' : 'Review Queue'}</span>
            {awaitingCount > 0 && <span className="badge-count-pill badge-warn">{awaitingCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveNav('requests')}
          >
            <Icon name="file" />
            <span>{lang === 'vi' ? 'Yêu cầu bổ sung' : 'Doc Requests'}</span>
            {openReqCount > 0 && <span className="badge-count-pill">{openReqCount}</span>}
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'checkpoints' ? 'active' : ''}`}
            onClick={() => setActiveNav('checkpoints')}
          >
            <Icon name="flag" />
            <span>{lang === 'vi' ? 'Kiểm dịch & Hải quan' : 'Quarantine & Border'}</span>
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'packages' ? 'active' : ''}`}
            onClick={() => setActiveNav('packages')}
          >
            <Icon name="book" />
            <span>{lang === 'vi' ? 'Gói hồ sơ đi đường' : 'Doc Packages'}</span>
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'master' ? 'active' : ''}`}
            onClick={() => setActiveNav('master')}
          >
            <Icon name="list" />
            <span>{lang === 'vi' ? 'Quy định & Danh mục' : 'Regulations'}</span>
          </button>

          <button
            type="button"
            className={`nav-menu-btn ${activeNav === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveNav('audit')}
          >
            <Icon name="clock" />
            <span>{lang === 'vi' ? 'Lịch sử thao tác' : 'Audit Trail'}</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="specialist-main-wrap">
        {/* TOPBAR (64px sticky matching images) */}
        <header className="specialist-topbar">
          <h1 className="topbar-title-text">{getPageTitle()}</h1>

          <div className="topbar-right-controls">
            {/* LANGUAGE SWITCHER */}
            <div className="lang-toggle-wrap">
              <button
                type="button"
                className={`lang-btn ${lang === 'vi' ? 'active' : ''}`}
                onClick={() => setLang('vi')}
              >
                VI
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>

            <Notifications variant="manager"/>

            {/* USER PROFILE PILL */}
            <div className="user-profile-pill">
              <span className="user-avatar-circle">HH</span>
              <div className="user-info-text">
                <span className="user-real-name">{localStorage.getItem("userFullName")||"Specialist"}</span>
                <span className="user-role-label">Transport Specialist</span>
              </div>
              <Icon name="chev" />
            </div>
          </div>
        </header>

        {/* TOAST NOTIFICATION */}
        {toastMsg && (
          <div className="floating-toast-message fade-in">
            {toastMsg}
          </div>
        )}

        {/* VIEW AREA DELEGATED TO INDIVIDUAL RENDER PAGES */}
        <main className="specialist-content-canvas">
          {flow1&&activeNav==='dashboard'&&<OperationsInbox stream="DOCUMENTS" portal/>}
          {!flow1&&activeNav === 'dashboard' && (
            <RenderDashboardPage
              trips={trips}
              docs={docs}
              requests={requests}
              lang={lang}
              onNavigate={(nav) => setActiveNav(nav)}
              onSelectTrip={(id) => {
                setSelectedTripId(id);
                setActiveNav('trip_detail');
              }}
              onSelectDoc={(id) => setSelectedDocId(id)}
              onOpenDocReviewModal={(id) => setSelectedDocId(id)}
            />
          )}

          {activeNav === 'trips' && (
            <RenderAssignedTripsPage
              trips={trips}
              lang={lang}
              onSelectTrip={(id) => {
                setSelectedTripId(id);
                setActiveNav('trip_detail');
              }}
            />
          )}

          {activeNav === 'trip_detail' && (
            <RenderTripDetailPage
              trip={curTrip}
              docs={docs}
              requests={requests}
              clearances={clearances}
              bookings={bookings}
              packages={packages}
              regulations={regulations}
              lang={lang}
              onBack={() => setActiveNav('trips')}
              onOpenDocReview={(id) => setSelectedDocId(id)}
              onOpenCreateRequest={(tId, dTypeId) => {
                setModalTripId(tId);
                if (dTypeId) setModalTypeId(dTypeId);
                setIsCreateReqModalOpen(true);
              }}
              onOpenRecordCBNDoc={(tId) => {
                setModalTripId(tId);
                setIsRecordCBNDocModalOpen(true);
              }}
              onOpenNewBooking={(tId) => {
                setModalTripId(tId);
                setIsNewBookingModalOpen(true);
              }}
              onTogglePhysicalCopy={handleTogglePhysicalCopy}
              onExportZip={handleExportZip}
            />
          )}

          {activeNav === 'queue' && (
            <RenderReviewQueuePage
              docs={docs}
              trips={trips}
              lang={lang}
              onOpenDocReview={(id) => setSelectedDocId(id)}
              onOpenRecordCBNDoc={() => setIsRecordCBNDocModalOpen(true)}
            />
          )}

          {activeNav === 'requests' && (
            <RenderDocumentRequestsPage
              requests={requests}
              trips={trips}
              lang={lang}
              onOpenCreateRequestModal={() => setIsCreateReqModalOpen(true)}
              onOpenDocReview={(id) => setSelectedDocId(id)}
              onMarkFulfilled={(reqId) => {
                setRequests((prev) =>
                  prev.map((r) => (r.id === reqId ? { ...r, status: 'FULFILLED' } : r))
                );
                addAudit('Đóng yêu cầu bổ sung', reqId, 'Chuyên viên đánh dấu đã hoàn tất.');
                showToast(`✓ Đã hoàn tất yêu cầu bổ sung ${reqId}!`);
              }}
            />
          )}

          {activeNav === 'checkpoints' && (
            <RenderQuarantineCustomsPage
              clearances={clearances}
              bookings={bookings}
              trips={trips}
              lang={lang}
              onRecordClearance={handleRecordClearance}
              onConfirmBooking={handleConfirmBooking}
              onOpenNewBookingModal={() => setIsNewBookingModalOpen(true)}
            />
          )}

          {activeNav === 'packages' && (
            <RenderDocumentPackagesPage
              packages={packages}
              trips={trips}
              lang={lang}
              onMarkReady={handleMarkPackageReady}
              onHandOver={handleHandoverPackage}
              onOpenNewPackageModal={() => setIsNewPackageModalOpen(true)}
            />
          )}

          {activeNav === 'master' && (
            <RenderRegulationsMasterPage
              regulations={regulations}
              docTypes={docTypes}
              checkpoints={checkpoints}
              lang={lang}
            />
          )}

          {activeNav === 'audit' && (
            <RenderAuditHistoryPage
              auditLog={auditLog}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* DOCUMENT REVIEW MODAL (CORE FLOW) */}
      {selectedDocId && curReviewDoc && (
        <RenderDocumentReviewModal
          doc={curReviewDoc}
          trip={trips.find((t) => t.id === curReviewDoc.tripId)}
          lang={lang}
          onClose={() => setSelectedDocId(null)}
          onApprove={handleApproveDoc}
          onRejectAndRequestSupplement={handleRejectAndRequestSupplement}
          onTogglePhysicalCopy={handleTogglePhysicalCopy}
        />
      )}

      {/* CREATE REQUEST MODAL */}
      {isCreateReqModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setIsCreateReqModalOpen(false)}>
          <div className="modal-card pad" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '16px' }}>
              <h3 className="modal-title">Tạo yêu cầu bổ sung hồ sơ gửi khách hàng</h3>
              <button type="button" className="btn-close-sm" onClick={() => setIsCreateReqModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-lbl">Chọn chuyến vận chuyển:</label>
              <select
                className="custom-select"
                value={modalTripId}
                onChange={(e) => setModalTripId(e.target.value)}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} • {t.customerName} ({t.origin} → {t.destination})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Loại chứng từ yêu cầu bổ sung:</label>
              <select
                className="custom-select"
                value={modalTypeId}
                onChange={(e) => setModalTypeId(e.target.value)}
              >
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name} ({dt.group})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Lý do yêu cầu (Khách hàng sẽ nhìn thấy nội dung này):</label>
              <textarea
                rows={3}
                className="custom-textarea"
                placeholder="Ví dụ: Thiếu trang tiêm chủng cúm gần nhất, hoặc bản scan bị mờ con dấu..."
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Hạn chót bổ sung:</label>
              <input
                type="date"
                className="custom-input"
                value={modalDueAt}
                onChange={(e) => setModalDueAt(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '18px' }}>
              <button type="button" className="btn-ghost" onClick={() => setIsCreateReqModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-orange" onClick={handleCreateRequest}>
                Gửi yêu cầu bổ sung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD CBN DOC MODAL */}
      {isRecordCBNDocModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setIsRecordCBNDocModalOpen(false)}>
          <div className="modal-card pad" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '16px' }}>
              <h3 className="modal-title">Ghi nhận chứng từ do CBN Transport thực hiện</h3>
              <button type="button" className="btn-close-sm" onClick={() => setIsRecordCBNDocModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-lbl">Mã chuyến áp dụng:</label>
              <select
                className="custom-select"
                value={modalTripId}
                onChange={(e) => setModalTripId(e.target.value)}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} • {t.origin} → {t.destination}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Tên văn bản / giấy phép:</label>
              <input
                type="text"
                className="custom-input"
                value={cbnDocName}
                onChange={(e) => setCbnDocName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Số hiệu văn bản cấp phép:</label>
              <input
                type="text"
                className="custom-input"
                value={cbnDocNumber}
                onChange={(e) => setCbnDocNumber(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Tên tệp đính kèm lưu kho:</label>
              <input
                type="text"
                className="custom-input"
                value={cbnFileName}
                onChange={(e) => setCbnFileName(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '18px' }}>
              <button type="button" className="btn-ghost" onClick={() => setIsRecordCBNDocModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-green" onClick={handleRecordCBNDoc}>
                Lưu & Phê duyệt hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW QUARANTINE BOOKING MODAL */}
      {isNewBookingModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setIsNewBookingModalOpen(false)}>
          <div className="modal-card pad" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '14px' }}>
              <h3 className="modal-title">Đặt chỗ Trạm kiểm dịch cách ly mới</h3>
              <button type="button" className="btn-close-sm" onClick={() => setIsNewBookingModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-lbl">Chuyến áp dụng:</label>
              <select
                className="custom-select"
                value={modalTripId}
                onChange={(e) => setModalTripId(e.target.value)}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} • {t.origin} → {t.destination}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Chọn trạm kiểm dịch cách ly:</label>
              <select
                className="custom-select"
                value={bookingCpId}
                onChange={(e) => setBookingCpId(e.target.value)}
              >
                {checkpoints
                  .filter((c) => c.type === 'QUARANTINE_STATION')
                  .map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} ({cp.country})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Ngày bắt đầu cách ly dự kiến:</label>
              <input
                type="date"
                className="custom-input"
                value={bookingSlot}
                onChange={(e) => setBookingSlot(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Ghi chú yêu cầu chuồng trại:</label>
              <textarea
                rows={2}
                className="custom-textarea"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-ghost" onClick={() => setIsNewBookingModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-orange" onClick={handleCreateNewBooking}>
                Gửi yêu cầu đặt chỗ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PACKAGE MODAL */}
      {isNewPackageModalOpen && (
        <div className="modal-backdrop fade-in" onClick={() => setIsNewPackageModalOpen(false)}>
          <div className="modal-card pad" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: 0, marginBottom: '14px' }}>
              <h3 className="modal-title">Tạo gói hồ sơ đi đường mới</h3>
              <button type="button" className="btn-close-sm" onClick={() => setIsNewPackageModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="form-group">
              <label className="form-lbl">Chuyến áp dụng:</label>
              <select
                className="custom-select"
                value={modalTripId}
                onChange={(e) => setModalTripId(e.target.value)}
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} • {t.origin} → {t.destination}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-lbl">Tên gói hồ sơ niêm phong:</label>
              <input
                type="text"
                className="custom-input"
                value={pkgTitle}
                onChange={(e) => setPkgTitle(e.target.value)}
              />
            </div>

            <div className="reject-form-btn-row" style={{ marginTop: '16px' }}>
              <button type="button" className="btn-ghost" onClick={() => setIsNewPackageModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className="btn-solid-orange" onClick={handleCreatePackage}>
                Khởi tạo gói hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialistPortal;
