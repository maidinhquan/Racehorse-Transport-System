import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import CustomerLayout from '../../../../shared/layouts/CustomerLayout/CustomerLayout';
import { customerMockStore } from '../../services/customerMockStore';
import type {
  CustomerTransportRequest,
  ContractVersion,
  PaymentTransaction,
  CustomerComplaint,
} from '../../types/customerTypes';
import './CustomerRequestDetailPage.css';

type TabKey = 'overview' | 'documents' | 'pricing' | 'payment' | 'tracking' | 'handover' | 'complaints' | 'history';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'documents', label: 'Giấy tờ' },
  { key: 'pricing', label: 'Hợp đồng & Chi phí' },
  { key: 'payment', label: 'Thanh toán' },
  { key: 'tracking', label: 'Tracking & Sức khỏe' },
  { key: 'handover', label: 'Bàn giao' },
  { key: 'complaints', label: 'Khiếu nại & Feedback' },
  { key: 'history', label: 'Lịch sử' },
];

export const CustomerRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentTab = (searchParams.get('tab') as TabKey) || 'overview';
  const setTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  const [request, setRequest] = useState<CustomerTransportRequest | null>(() => {
    if (!requestId) return null;
    customerMockStore.evaluateAcceptanceClosure(requestId);
    return customerMockStore.getRequestById(requestId) || null;
  });
  const [prevRequestId, setPrevRequestId] = useState(requestId);
  if (requestId !== prevRequestId) {
    setPrevRequestId(requestId);
    if (requestId) {
      customerMockStore.evaluateAcceptanceClosure(requestId);
      setRequest(customerMockStore.getRequestById(requestId) || null);
    } else {
      setRequest(null);
    }
  }

  const [nowStamp, setNowStamp] = useState<number>(() => Date.now());

  // Modal states
  const [showOtpSignModal, setShowOtpSignModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  // Contract Change Request Modal
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeSections, setChangeSections] = useState<string[]>([]);
  const [changeNotes, setChangeNotes] = useState('');
  const [changeError, setChangeError] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'DEPOSIT' | 'BALANCE'>('DEPOSIT');
  const [paymentMethod, setPaymentMethod] = useState<'VNPAY' | 'BANK_TRANSFER'>('VNPAY');
  const [paymentStep, setPaymentStep] = useState<'SELECT' | 'CONFIRMING' | 'DONE'>('SELECT');
  const [activeTx, setActiveTx] = useState<PaymentTransaction | null>(null);

  // Receiver Handover OTP Modal
  const [showHandoverOtpModal, setShowHandoverOtpModal] = useState(false);
  const [handoverOtp, setHandoverOtp] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverError, setHandoverError] = useState('');

  // Complaint Form Modal
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState<CustomerComplaint['category']>('EQUIPMENT_CONDITION');
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintContent, setComplaintContent] = useState('');

  // Rating Feedback
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Load and refresh request
  const refreshRequest = () => {
    if (!requestId) return;
    const data = customerMockStore.getRequestById(requestId);
    if (data) {
      // Evaluate acceptance window expiry
      customerMockStore.evaluateAcceptanceClosure(requestId);
      const updated = customerMockStore.getRequestById(requestId);
      setRequest(updated || null);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setNowStamp(Date.now());
      if (requestId) {
        customerMockStore.evaluateAcceptanceClosure(requestId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [requestId]);

  const contractVersions = request?.contractVersions || [];
  const curVersion: ContractVersion | undefined = contractVersions.find(
    (v) => v.version === request?.currentVersionNumber
  );

  // Calculate 24h deadline countdown for contract
  const contractTimeLeft = useMemo(() => {
    if (!curVersion?.validUntil) return null;
    const due = new Date(curVersion.validUntil).getTime();
    if (isNaN(due)) return null;
    const diff = due - nowStamp;
    if (diff <= 0) return 'Đã hết hạn';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hrs}h ${mins}m ${secs}s`;
  }, [curVersion, nowStamp]);

  // Calculate 24h feedback window countdown
  const feedbackTimeLeft = useMemo(() => {
    if (!request?.acceptanceWindow?.deadline) return null;
    const due = new Date(request.acceptanceWindow.deadline).getTime();
    if (isNaN(due)) return null;
    const diff = due - nowStamp;
    if (diff <= 0) return '00:00:00 (Cửa sổ đóng)';
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hrs}h ${mins}m ${secs}s`;
  }, [request, nowStamp]);

  if (!request) {
    return (
      <CustomerLayout pageTitle="Chi tiết yêu cầu">
        <div className="crd-empty">
          <h3>Không tìm thấy yêu cầu {requestId}</h3>
          <button className="crd-btn crd-btn-primary" onClick={() => navigate('/customer/requests')}>
            Về danh sách yêu cầu
          </button>
        </div>
      </CustomerLayout>
    );
  }

  // Check deposit status
  const verifiedDepositTx = request.transactions.find((tx) => tx.type === 'DEPOSIT' && tx.status === 'SUCCESS');
  const pendingDepositTx = request.transactions.find(
    (tx) => tx.type === 'DEPOSIT' && (tx.status === 'PROCESSING' || tx.status === 'INITIATED')
  );
  const isDepositVerified = Boolean(verifiedDepositTx);

  // Check balance status
  const verifiedBalanceTx = request.transactions.find((tx) => tx.type === 'BALANCE' && tx.status === 'SUCCESS');
  const isBalanceVerified = Boolean(verifiedBalanceTx);

  // Check if contract is expired while payment was in reconciliation
  const isDepositOverdueWithPending = Boolean(
    curVersion &&
      curVersion.validUntil &&
      new Date(curVersion.validUntil).getTime() <= nowStamp &&
      pendingDepositTx &&
      !isDepositVerified
  );

  // Status Badge Helper
  const renderStatusBadge = (status: CustomerTransportRequest['status']) => {
    switch (status) {
      case 'Pending':
        return <span className="crd-status-badge yellow detail-status">Waiting for Manager Review</span>;
      case 'Changes Requested':
        return <span className="crd-status-badge orange detail-status">Changes Requested</span>;
      case 'Rejected':
        return <span className="crd-status-badge red detail-status">Rejected</span>;
      case 'Accepted – Contract Preparation':
        return <span className="crd-status-badge blue detail-status">Accepted – Contract Preparation</span>;
      case 'Contract Review':
        return <span className="crd-status-badge blue detail-status">Contract Ready</span>;
      case 'Deposit Verified – Awaiting Signature':
        return <span className="crd-status-badge green detail-status">Deposit Verified – Awaiting Signature</span>;
      case 'Activated':
        return <span className="crd-status-badge green detail-status">Đã kích hoạt Scheduled</span>;
      case 'In Transit':
        return <span className="crd-status-badge transit detail-status">Đang vận chuyển In Transit</span>;
      case 'Delivered':
        return <span className="crd-status-badge orange detail-status">Đã giao — Chờ tất toán Delivered</span>;
      case 'Acceptance':
        return <span className="crd-status-badge purple detail-status">Nghiệm thu Acceptance</span>;
      case 'Closed':
        return <span className="crd-status-badge green detail-status">Đã đóng đơn Completed</span>;
      case 'Cancelled':
        return <span className="crd-status-badge grey detail-status">Đã hủy Cancelled</span>;
      default:
        return <span className="crd-status-badge grey detail-status">{status}</span>;
    }
  };

  // Status Banner Content
  const renderBanner = () => {
    switch (request.status) {
      case 'Pending':
        return {
          theme: 'yellow',
          title: 'Waiting for manager review',
          desc: 'CBN Transport is reviewing your initial request. You will be notified of the result.',
        };
      case 'Changes Requested':
        return {
          theme: 'orange',
          title: 'Changes requested',
          desc: request.changeRequestReason
            ? `Quản lý phản hồi: "${request.changeRequestReason}". Vui lòng cập nhật lại thông tin.`
            : 'Vui lòng kiểm tra góp ý từ quản lý và cập nhật lại yêu cầu vận chuyển.',
          action: (
            <button
              className="crd-banner-btn"
              onClick={() => navigate(`/customer/create-request?edit=${request.id}`)}
            >
              Chỉnh sửa và gửi lại
            </button>
          ),
        };
      case 'Rejected':
        return {
          theme: 'red',
          title: 'Request rejected',
          desc: request.rejectionReason
            ? `Lý do từ chối: "${request.rejectionReason}".`
            : 'Yêu cầu không được phê duyệt. Vui lòng liên hệ hỗ trợ nếu cần thêm chi tiết.',
        };
      case 'Accepted – Contract Preparation':
        return {
          theme: 'blue',
          title: 'Request accepted',
          desc: 'CBN Transport is preparing your service contract. Hợp đồng chính thức sẽ sớm được phát hành.',
        };
      case 'Contract Review':
        if (isDepositOverdueWithPending) {
          return {
            theme: 'yellow',
            title: 'Quá hạn — chờ đối soát',
            desc: 'Đã hết hạn 24h nhưng giao dịch cọc của bạn đang trong tiến trình đối soát. Vui lòng chờ CBN Transport xác minh tiền.',
          };
        }
        if (curVersion?.status === 'CHANGES_REQUESTED') {
          return {
            theme: 'yellow',
            title: 'Contract changes requested',
            desc: 'Logistics Manager đang xem xét yêu cầu chỉnh sửa hợp đồng của bạn. Thời hạn thanh toán đang tạm khóa.',
          };
        }
        if (curVersion?.termsAcceptedAt) {
          return {
            theme: 'blue',
            title: 'Contract terms accepted',
            desc: `Bạn đã đồng ý nội dung hợp đồng. Vui lòng thanh toán cọc $${curVersion.depositRequired.toLocaleString()} USD trước ${new Date(
              curVersion.validUntil
            ).toLocaleTimeString()} (${contractTimeLeft}) để nhận mã OTP ký hợp đồng.`,
            action: (
              <button
                className="crd-banner-btn"
                onClick={() => {
                  setTab('payment');
                  setPaymentType('DEPOSIT');
                  setShowPaymentModal(true);
                }}
              >
                Thanh toán cọc ngay
              </button>
            ),
          };
        }
        return {
          theme: 'blue',
          title: 'Your draft contract is ready',
          desc: `Hợp đồng ${curVersion?.contractRef} đã sẵn sàng. Vui lòng đọc điều khoản và xác nhận trong vòng ${contractTimeLeft}.`,
          action: (
            <button className="crd-banner-btn" onClick={() => setTab('pricing')}>
              Xem & Ký hợp đồng
            </button>
          ),
        };
      case 'Deposit Verified – Awaiting Signature':
        return {
          theme: 'green',
          title: 'Deposit Verified — Awaiting Signature',
          desc: `Đã xác minh đủ tiền cọc! Hãy ký hợp đồng ${curVersion?.contractRef} bằng mã OTP để kích hoạt chuyến vận chuyển.`,
          action: (
            <button
              className="crd-banner-btn primary"
              onClick={() => {
                setTab('pricing');
                handleOpenSignModal();
              }}
            >
              Ký hợp đồng bằng mã OTP ➔
            </button>
          ),
        };
      case 'Activated':
        return {
          theme: 'green',
          title: 'Transport scheduled',
          desc: `Hợp đồng đã có hiệu lực chính thức! CBN Transport đang điều phối tài xế và lên kế hoạch chuyến ${request.tripId || ''}.`,
          action: (
            <button className="crd-banner-btn" onClick={() => setTab('tracking')}>
              Xem hành trình chuyến đi
            </button>
          ),
        };
      case 'In Transit':
        return {
          theme: 'blue',
          title: 'Your horse is on the way',
          desc: `Ngựa đang trong hành trình vận chuyển (${request.originCity} ➔ ${request.destinationCity}). Theo dõi các mốc xác nhận thực tế và nhật ký sức khỏe bên dưới.`,
          action: (
            <button className="crd-banner-btn" onClick={() => setTab('tracking')}>
              Theo dõi lộ trình & Sức khỏe
            </button>
          ),
        };
      case 'Delivered':
        return {
          theme: 'orange',
          title: 'Delivered – Awaiting Final Balance Payment',
          desc: `Người nhận ${request.receiverName} đã xác nhận bàn giao ngựa qua OTP email. Vui lòng thanh toán số dư còn lại $${curVersion?.balanceRemaining.toLocaleString()} USD để nghiệm thu tất toán.`,
          action: (
            <button
              className="crd-banner-btn primary"
              onClick={() => {
                setTab('payment');
                setPaymentType('BALANCE');
                setShowPaymentModal(true);
              }}
            >
              Thanh toán số dư tất toán
            </button>
          ),
        };
      case 'Acceptance':
        return {
          theme: 'purple',
          title: 'Nghiệm thu hoàn tất — Mở cửa sổ 24h Đánh giá & Khiếu nại',
          desc: `Đã thanh toán đủ toàn bộ hợp đồng. Cửa sổ phản hồi/khiếu nại đang đếm ngược: ${feedbackTimeLeft}. Nếu không có khiếu nại mở, đơn và hợp đồng sẽ tự động đóng sau khi hết hạn.`,
          action: (
            <button className="crd-banner-btn" onClick={() => setTab('complaints')}>
              Gửi đánh giá hoặc khiếu nại
            </button>
          ),
        };
      case 'Closed':
        return {
          theme: 'green',
          title: 'Request closed',
          desc: 'Đơn vận chuyển và hợp đồng đã đóng thành công. Nếu cần hỗ trợ thêm về hồ sơ, bạn có thể gửi yêu cầu hỗ trợ.',
        };
      case 'Cancelled':
        return {
          theme: 'grey',
          title: 'Request cancelled',
          desc: 'Yêu cầu vận chuyển đã được hủy trước khi ký hợp đồng có hiệu lực. Bất kỳ khoản cọc thực tế đã xác minh đều được hoàn lại đầy đủ.',
        };
      default:
        return null;
    }
  };

  const banner = renderBanner();

  // Handle Terms Acceptance
  const handleAcceptTerms = () => {
    if (!curVersion) return;
    const ok = customerMockStore.acceptContractTerms(request.id, curVersion.version);
    if (ok) {
      refreshRequest();
    }
  };

  // Handle OTP Sign Trigger
  const handleOpenSignModal = () => {
    setOtpError('');
    setOtpInput('');
    const res = customerMockStore.requestSignatureOtp(request.id);
    if (!res.success) {
      setOtpError(res.message || 'Chưa đủ điều kiện ký OTP.');
    } else {
      setOtpSuccessMsg(res.message || 'Mã OTP đã được cấp.');
    }
    setShowOtpSignModal(true);
  };

  const handleConfirmOtpSign = () => {
    setOtpError('');
    const res = customerMockStore.signContractWithOtp(request.id, otpInput.trim());
    if (!res.success) {
      setOtpError(res.message || 'Mã OTP ký không đúng.');
      return;
    }
    setShowOtpSignModal(false);
    refreshRequest();
  };

  // Handle Contract Change Request
  const handleOpenChangeModal = () => {
    setChangeError('');
    setChangeSections([]);
    setChangeNotes('');
    setShowChangeModal(true);
  };

  const handleToggleChangeSection = (sec: string) => {
    setChangeSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]
    );
  };

  const handleSubmitContractChange = () => {
    if (changeSections.length === 0) {
      setChangeError('Vui lòng chọn ít nhất một nội dung cần chỉnh sửa.');
      return;
    }
    if (!changeNotes.trim()) {
      setChangeError('Vui lòng nhập ghi chú chi tiết mong muốn sửa đổi.');
      return;
    }
    if (!curVersion) return;

    const res = customerMockStore.requestContractChange(
      request.id,
      curVersion.version,
      changeSections,
      changeNotes
    );
    if (!res.success) {
      setChangeError(res.message || 'Không thể yêu cầu sửa đổi.');
      return;
    }
    setShowChangeModal(false);
    refreshRequest();
  };

  // Handle Payment Execution (Mock Sandbox)
  const handleStartPayment = (type: 'DEPOSIT' | 'BALANCE') => {
    setPaymentType(type);
    setPaymentStep('SELECT');
    setShowPaymentModal(true);
  };

  const handleConfirmPaymentGateway = () => {
    setPaymentStep('CONFIRMING');
    let tx: PaymentTransaction | null = null;
    if (paymentType === 'DEPOSIT') {
      tx = customerMockStore.initiateDepositPayment(request.id, paymentMethod);
    } else {
      tx = customerMockStore.initiateBalancePayment(request.id, paymentMethod);
    }
    setActiveTx(tx);

    // Simulate verification callback
    setTimeout(() => {
      if (tx) {
        if (paymentType === 'DEPOSIT') {
          customerMockStore.verifyDepositPayment(request.id, tx.id, true);
        } else {
          customerMockStore.verifyBalancePayment(request.id, tx.id, true);
        }
      }
      setPaymentStep('DONE');
      refreshRequest();
    }, 1500);
  };

  // Handle Handover OTP Verification (Receiver)
  const handleVerifyHandoverOtp = () => {
    setHandoverError('');
    const res = customerMockStore.completeReceiverHandover(request.id, handoverOtp.trim(), handoverNotes);
    if (!res.success) {
      setHandoverError(res.message || 'Mã OTP không hợp lệ.');
      return;
    }
    setShowHandoverOtpModal(false);
    refreshRequest();
  };

  // Handle Complaint Submission
  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintTitle.trim() || !complaintContent.trim()) return;
    customerMockStore.submitComplaint(request.id, complaintCategory, complaintTitle, complaintContent);
    setShowComplaintModal(false);
    setComplaintTitle('');
    setComplaintContent('');
    refreshRequest();
  };

  // Handle Complaint Acceptance by Customer (Resets 24h window!)
  const handleAgreeComplaint = (cmpId: string) => {
    customerMockStore.customerAgreeComplaintResolution(request.id, cmpId);
    refreshRequest();
  };

  // Handle Feedback Submission
  const handleSubmitRatingFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    customerMockStore.submitFeedback(request.id, ratingScore, ratingComment);
    setFeedbackSent(true);
    refreshRequest();
  };

  // Handle Pre-signing cancellation
  const handlePreSigningCancel = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này? Tiền cọc thực tế đã xác minh (nếu có) sẽ được hoàn trả đầy đủ.')) {
      customerMockStore.requestPreSigningCancellation(request.id);
      refreshRequest();
    }
  };

  return (
    <CustomerLayout pageTitle={`Yêu cầu ${request.id}`}>
      <div className="crd-container">
        {/* Top Header */}
        <div className="crd-header">
          <div>
            <button className="crd-back-btn" onClick={() => navigate('/customer/requests')}>
              ← Quay lại danh sách yêu cầu
            </button>
            <div className="crd-title-row request-detail-title">
              <h1>{request.id}</h1>
              {renderStatusBadge(request.status)}
            </div>
            <p className="crd-sub">
              Tuyến: <b>{request.originCity} ({request.originCountry}) ➔ {request.destinationCity} ({request.destinationCountry})</b> • Phương thức: <b>{request.transportType}</b>
            </p>
          </div>

          <div className="crd-top-actions">
            {/* Show Pre-signing cancel button if contract not effective yet */}
            {request.status !== 'Activated' &&
              request.status !== 'In Transit' &&
              request.status !== 'Delivered' &&
              request.status !== 'Acceptance' &&
              request.status !== 'Closed' &&
              request.status !== 'Cancelled' && (
                <button className="crd-btn crd-btn-danger-outline" onClick={handlePreSigningCancel}>
                  Hủy yêu cầu
                </button>
              )}
          </div>
        </div>

        {/* Dynamic Status Banner */}
        {banner && (
          <div className={`crd-banner banner-${banner.theme} request-banner`}>
            <div className="crd-banner-content">
              <strong>{banner.title}</strong>
              <p>{banner.desc}</p>
            </div>
            {banner.action && <div className="crd-banner-action">{banner.action}</div>}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="crd-nav-tabs">
          {TABS.map((t) => {
            // Count badges
            let badge = '';
            if (t.key === 'pricing' && curVersion && curVersion.status === 'ISSUED' && !curVersion.termsAcceptedAt) {
              badge = '1';
            } else if (t.key === 'payment' && curVersion?.termsAcceptedAt && !isDepositVerified) {
              badge = '1';
            } else if (t.key === 'handover' && request.status === 'Delivered') {
              badge = '!';
            } else if (t.key === 'complaints' && request.complaints.some((c) => c.status === 'OPEN')) {
              badge = `${request.complaints.filter((c) => c.status === 'OPEN').length}`;
            }

            return (
              <button
                key={t.key}
                className={`crd-tab-btn ${currentTab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {badge && <span className="crd-tab-badge">{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="crd-body">
          {/* 1. OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="crd-overview-grid">
              <div className="crd-card crd-col-full current-action-card">
                <h2>Current Action</h2>
                {request.status === 'Pending' ? (
                  <p className="request-action-empty">No action is needed from you right now.</p>
                ) : (
                  <p className="request-action-desc">{banner?.desc}</p>
                )}
              </div>

              <div className="crd-card">
                <h3>Chi tiết Hành trình & Địa điểm</h3>
                <div className="crd-kv-list">
                  <div className="crd-kv">
                    <span>Điểm lấy ngựa:</span>
                    <strong>{request.pickupAddress}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Điểm giao ngựa:</span>
                    <strong>{request.deliveryAddress}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Ngày xuất phát dự kiến:</span>
                    <strong>{request.expectedDate}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Hạn chót bàn giao cam kết (OTD):</span>
                    <strong>{request.committedDeadline}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Tổng định giá thương mại:</span>
                    <strong>${request.commercialValueUsd.toLocaleString()} USD</strong>
                  </div>
                  {request.specialCareNotes && (
                    <div className="crd-kv">
                      <span>Ghi chú chăm sóc đặc biệt:</span>
                      <p>{request.specialCareNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="crd-card">
                <h3>Người Nhận Chỉ Định (Designated Receiver)</h3>
                <p className="crd-card-sub">
                  Người nhận chịu trách nhiệm kiểm tra ngựa tại điểm giao cuối và nhận mã OTP email để hoàn tất bàn giao.
                </p>
                <div className="crd-kv-list">
                  <div className="crd-kv">
                    <span>Họ và tên:</span>
                    <strong>{request.receiverName}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Số điện thoại:</span>
                    <strong>{request.receiverPhone}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Email nhận mã OTP:</span>
                    <strong>{request.receiverEmail}</strong>
                  </div>
                  <div className="crd-kv">
                    <span>Trạng thái bàn giao:</span>
                    <strong>
                      {request.handover ? (
                        <span className="crd-text-success">Đã xác nhận nhận ngựa (OTP verified)</span>
                      ) : (
                        <span className="crd-text-muted">Chưa đến điểm giao cuối</span>
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="crd-card crd-col-full">
                <h3>Danh Sách Ngựa Vận Chuyển ({request.horses.length} cá thể)</h3>
                <div className="crd-horse-grid">
                  {request.horses.map((horse) => (
                    <div key={horse.id} className="crd-horse-card">
                      <div className="crd-horse-header">
                        <h4>{horse.name}</h4>
                        <span className="crd-tag">{horse.breed}</span>
                      </div>
                      <div className="crd-horse-details">
                        <div>Vi mạch ISO: <b>{horse.microchipIso}</b></div>
                        <div>Hộ chiếu FEI: <b>{horse.feiPassportNo}</b></div>
                        <div>Giới tính: {horse.gender} | Cân nặng: {horse.weightKg} kg</div>
                        <div>Màu sắc: {horse.color || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. DOCUMENTS */}
          {currentTab === 'documents' && (
            <div className="crd-card">
              <h3>Hồ Sơ Baseline & Giấy Tờ Thú Y</h3>
              <p className="crd-card-sub">
                Tất cả giấy tờ baseline bắt buộc đã được thu thập và thẩm định cho tuyến vận chuyển này.
              </p>
              <div className="crd-table-wrapper">
                <table className="crd-table">
                  <thead>
                    <tr>
                      <th>Tên Giấy Tờ</th>
                      <th>Cá Thể Áp Dụng</th>
                      <th>Tệp Đính Kèm</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.documents.map((doc, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{doc.name}</strong>
                        </td>
                        <td>
                          {doc.horseId ? (
                            <span>{request.horses.find((h) => h.id === doc.horseId)?.name || doc.horseId}</span>
                          ) : (
                            <span className="crd-text-muted">Chung toàn đơn</span>
                          )}
                        </td>
                        <td>
                          <span className="crd-file-badge">📄 {doc.fileName || 'document.pdf'}</span>
                        </td>
                        <td>
                          <span className={`crd-doc-pill ${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PRICING & CONTRACT */}
          {currentTab === 'pricing' && (
            <div className="crd-card">
              <div className="crd-split-head">
                <div>
                  <h3>Hợp Đồng Vận Chuyển & Chi Phí</h3>
                  <p className="crd-card-sub">
                    Quản lý các version hợp đồng. Hợp đồng phát hành lần đầu hoặc version sửa đều có deadline 24h chung.
                  </p>
                </div>
                {curVersion && (
                  <div className="crd-countdown-box">
                    <span className="crd-cd-label">Thời hạn thanh toán & ký OTP:</span>
                    <strong className="crd-cd-value">{contractTimeLeft}</strong>
                  </div>
                )}
              </div>

              {!curVersion ? (
                <div className="crd-empty-section">
                  <p>Logistics Manager đang tiến hành lập dự toán chi phí và soạn thảo hợp đồng cho yêu cầu này.</p>
                </div>
              ) : (
                <div className="crd-contract-view">
                  {/* Version Picker */}
                  <div className="crd-version-picker">
                    <span>Phiên bản hợp đồng:</span>
                    {request.contractVersions.map((v) => (
                      <span
                        key={v.version}
                        className={`crd-ver-tag ${v.version === request.currentVersionNumber ? 'active' : ''}`}
                      >
                        v{v.version} ({v.status})
                      </span>
                    ))}
                  </div>

                  {/* Summary Pricing Box */}
                  <div className="crd-pricing-summary">
                    <div className="crd-price-box">
                      <span>Tổng chi phí dịch vụ</span>
                      <strong>${curVersion.totalPrice.toLocaleString()} {curVersion.currency}</strong>
                    </div>
                    <div className="crd-price-box highlight">
                      <span>Tiền cọc bắt buộc (30%)</span>
                      <strong>${curVersion.depositRequired.toLocaleString()} {curVersion.currency}</strong>
                      <small>{isDepositVerified ? '✓ Đã thanh toán & xác minh' : 'Chưa thanh toán'}</small>
                    </div>
                    <div className="crd-price-box">
                      <span>Số dư còn lại (70%)</span>
                      <strong>${curVersion.balanceRemaining.toLocaleString()} {curVersion.currency}</strong>
                      <small>Thanh toán sau khi bàn giao hoàn tất</small>
                    </div>
                  </div>

                  {/* Full Contract Document Body */}
                  <div className="crd-contract-document">
                    <h4>HỢP ĐỒNG DỊCH VỤ VẬN CHUYỂN NGỰA ĐUA CHUYÊN DỤNG</h4>
                    <p className="crd-contract-ref">Mã tham chiếu: <b>{curVersion.contractRef}</b> | Phát hành: {new Date(curVersion.issuedAt).toLocaleString()}</p>
                    <div className="crd-contract-text">
                      <p><b>BÊN VẬN CHUYỂN (BÊN A):</b> CBN Transport Co., Ltd.</p>
                      <p><b>BÊN THUÊ VẬN CHUYỂN (BÊN B):</b> {request.customerName} - {request.customerPhone} ({request.customerEmail})</p>
                      <p><b>ĐIỀU 1. ĐỐI TƯỢNG VÀ PHẠM VI DỊCH VỤ:</b></p>
                      <p>Bên A nhận vận chuyển an toàn {request.horses.length} cá thể ngựa ({request.horses.map((h) => h.name).join(', ')}) từ {request.pickupAddress} đến {request.deliveryAddress}.</p>
                      <p><b>ĐIỀU 2. TIẾN ĐỘ VÀ PHƯƠNG THỨC:</b></p>
                      <p>Phương thức: {request.transportType}. Ngày xuất phát dự kiến: {request.expectedDate}. Hạn chót cam kết bàn giao (OTD): {request.committedDeadline}.</p>
                      <p><b>ĐIỀU 3. GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN:</b></p>
                      <p>1. Tổng giá trị dịch vụ: <b>${curVersion.totalPrice.toLocaleString()} USD</b>.</p>
                      <p>2. Đợt 1 (Cọc ký kết): Bên B thanh toán 30% tương đương <b>${curVersion.depositRequired.toLocaleString()} USD</b> trước khi thực hiện ký kết hợp đồng bằng mã OTP.</p>
                      <p>3. Đợt 2 (Tất toán số dư): Bên B thanh toán 70% còn lại tương đương <b>${curVersion.balanceRemaining.toLocaleString()} USD</b> ngay sau khi Người nhận chỉ định hoàn tất tiếp nhận tại điểm giao cuối.</p>
                      <p><b>ĐIỀU 4. ĐIỀU KHOẢN KÝ KẾT ĐIỆN TỬ:</b></p>
                      <p>Hợp đồng này được giao kết điện tử. Mã OTP xác thực gửi về email của Bên B chỉ được cấp sau khi hệ thống xác minh đủ tiền cọc thực tế.</p>
                    </div>
                  </div>

                  {/* Action Bar for Contract */}
                  <div className="crd-contract-actions">
                    {/* If contract is already effective */}
                    {curVersion.status === 'EFFECTIVE' ? (
                      <div className="crd-effective-note">
                        ✅ Hợp đồng đã được ký điện tử bằng mã OTP và đang có hiệu lực pháp lý đầy đủ.
                      </div>
                    ) : (
                      <>
                        {/* Step 1: Accept terms */}
                        {!curVersion.termsAcceptedAt && (
                          <div className="crd-terms-accept-box">
                            <label>
                              <input type="checkbox" id="chk-accept-terms" onChange={() => {}} />
                              <span>Tôi đã đọc kỹ toàn bộ nội dung và đồng ý với các điều khoản của hợp đồng {curVersion.contractRef}.</span>
                            </label>
                            <div className="crd-action-btns">
                              <button
                                className="crd-btn crd-btn-secondary"
                                onClick={handleOpenChangeModal}
                                disabled={Boolean(pendingDepositTx || isDepositVerified)}
                              >
                                Yêu cầu chỉnh sửa hợp đồng
                              </button>
                              <button
                                className="crd-btn crd-btn-primary"
                                onClick={handleAcceptTerms}
                              >
                                Xác nhận đồng ý điều khoản ➔
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 2: Pay Deposit */}
                        {curVersion.termsAcceptedAt && !isDepositVerified && (
                          <div className="crd-deposit-prompt">
                            <p>
                              Đã đồng ý điều khoản. Bước tiếp theo: <b>Thanh toán cọc 30% (${curVersion.depositRequired.toLocaleString()} USD)</b>.
                            </p>
                            <div className="crd-action-btns">
                              <button
                                className="crd-btn crd-btn-secondary"
                                onClick={handleOpenChangeModal}
                                disabled={Boolean(pendingDepositTx)}
                              >
                                Yêu cầu chỉnh sửa hợp đồng
                              </button>
                              <button
                                className="crd-btn crd-btn-success"
                                onClick={() => handleStartPayment('DEPOSIT')}
                              >
                                Thanh toán cọc ngay (${curVersion.depositRequired.toLocaleString()} USD)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Sign OTP (Only when deposit verified!) */}
                        {isDepositVerified && (
                          <div className="crd-sign-otp-prompt">
                            <p>
                              ✅ Tiền cọc đã được xác minh thành công! Bạn có thể thực hiện ký hợp đồng bằng mã OTP.
                            </p>
                            <div className="crd-action-btns">
                              <button
                                className="crd-btn crd-btn-secondary"
                                onClick={handleOpenChangeModal}
                                disabled={true}
                                title="Không thể yêu cầu sửa đổi khi đã thanh toán cọc thành công."
                              >
                                Yêu cầu chỉnh sửa hợp đồng
                              </button>
                              <button className="crd-btn crd-btn-primary crd-btn-lg" onClick={handleOpenSignModal}>
                                Ký Hợp Đồng Bằng Mã OTP ➔
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. PAYMENT */}
          {currentTab === 'payment' && (
            <div className="crd-card">
              <h3>Lịch Sử Giao Dịch & Đối Soát Thanh Toán</h3>
              <p className="crd-card-sub">
                Ngôn ngữ và trạng thái theo chuẩn VNPAY và Chuyển khoản ngân hàng. Giao dịch được xác minh độc lập qua hệ thống.
              </p>

              {/* Outstanding actions */}
              {curVersion && (
                <div className="crd-payment-status-cards">
                  <div className={`crd-pay-card ${isDepositVerified ? 'paid' : 'due'}`}>
                    <div>
                      <strong>Đợt 1: Tiền cọc dịch vụ (30%)</strong>
                      <p>${curVersion.depositRequired.toLocaleString()} USD</p>
                    </div>
                    {isDepositVerified ? (
                      <span className="crd-badge-success">Đã thanh toán đủ</span>
                    ) : (
                      <button
                        className="crd-btn crd-btn-primary"
                        onClick={() => handleStartPayment('DEPOSIT')}
                        disabled={!curVersion.termsAcceptedAt}
                      >
                        {curVersion.termsAcceptedAt ? 'Thanh toán cọc' : 'Đồng ý HĐ trước khi cọc'}
                      </button>
                    )}
                  </div>

                  <div className={`crd-pay-card ${isBalanceVerified ? 'paid' : 'due'}`}>
                    <div>
                      <strong>Đợt 2: Số dư tất toán (70%)</strong>
                      <p>${curVersion.balanceRemaining.toLocaleString()} USD</p>
                    </div>
                    {isBalanceVerified ? (
                      <span className="crd-badge-success">Đã tất toán</span>
                    ) : request.status === 'Delivered' ? (
                      <button
                        className="crd-btn crd-btn-success"
                        onClick={() => handleStartPayment('BALANCE')}
                      >
                        Thanh toán tất toán số dư
                      </button>
                    ) : (
                      <span className="crd-badge-muted">Mở sau khi bàn giao</span>
                    )}
                  </div>
                </div>
              )}

              {/* Transactions Table */}
              <div className="crd-table-wrapper crd-mt-4">
                <table className="crd-table">
                  <thead>
                    <tr>
                      <th>Mã Giao Dịch</th>
                      <th>Khoản Mục</th>
                      <th>Số Tiền</th>
                      <th>Phương Thức</th>
                      <th>Thời Gian</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                          Chưa có giao dịch thanh toán nào được tạo.
                        </td>
                      </tr>
                    ) : (
                      request.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td><b>{tx.referenceCode}</b></td>
                          <td>{tx.type === 'DEPOSIT' ? 'Tiền cọc 30%' : tx.type === 'BALANCE' ? 'Số dư tất toán 70%' : 'Hoàn tiền cọc'}</td>
                          <td><b>${tx.amount.toLocaleString()} {tx.currency}</b></td>
                          <td>{tx.method === 'VNPAY' ? 'Cổng VNPAY QR' : 'Chuyển khoản Ngân hàng'}</td>
                          <td>{new Date(tx.createdAt).toLocaleString()}</td>
                          <td>
                            <span className={`crd-tx-status ${tx.status.toLowerCase()}`}>
                              {tx.status === 'SUCCESS' ? 'Thành công' : tx.status === 'PROCESSING' ? 'Đang đối soát' : tx.status === 'INITIATED' ? 'Đang thanh toán' : tx.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. TRACKING & SỨC KHỎE */}
          {currentTab === 'tracking' && (
            <div className="crd-tracking-container">
              {/* Sequential Leg Milestones */}
              <div className="crd-card">
                <h3>Lộ Trình Các Chặng Vận Chuyển Xác Nhận</h3>
                <p className="crd-card-sub">
                  Các mốc hành trình được xác nhận thủ công, tuần tự bởi nhân sự phụ trách và hãng hàng không.
                </p>

                <div className="crd-timeline">
                  {(!request.legs || request.legs.length === 0) ? (
                    <p className="crd-text-muted">Chuyến đi chưa được kích hoạt lộ trình cụ thể.</p>
                  ) : (
                    request.legs.map((leg, index) => {
                      const isDone = leg.status === 'CONFIRMED';
                      return (
                        <div key={leg.id} className={`crd-timeline-item ${isDone ? 'confirmed' : 'pending'}`}>
                          <div className="crd-timeline-marker">
                            {isDone ? '✓' : index + 1}
                          </div>
                          <div className="crd-timeline-body">
                            <div className="crd-timeline-title">
                              <strong>{leg.title}</strong>
                              <span className={`crd-pill ${isDone ? 'green' : 'grey'}`}>
                                {isDone ? 'Đã xác nhận' : 'Dự kiến'}
                              </span>
                            </div>
                            <p className="crd-timeline-loc">📍 {leg.location}</p>
                            {leg.notes && <p className="crd-timeline-notes">📝 {leg.notes}</p>}
                            <div className="crd-timeline-meta">
                              {leg.confirmedTime ? (
                                <span>Xác nhận lúc: {new Date(leg.confirmedTime).toLocaleString()} bởi <b>{leg.actorName} ({leg.actorRole})</b></span>
                              ) : (
                                <span>Kế hoạch: {new Date(leg.scheduledTime).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Health Logs */}
              <div className="crd-card">
                <h3>Nhật Ký Chăm Sóc & Sức Khỏe Ngựa</h3>
                <p className="crd-card-sub">
                  Chỉ số sinh tồn, ăn uống và kết luận chuyên môn của bác sĩ thú y / nhân sự đi kèm.
                </p>

                {(!request.healthLogs || request.healthLogs.length === 0) ? (
                  <p className="crd-text-muted">Chưa có nhật ký thú y được ghi nhận trong chuyến này.</p>
                ) : (
                  <div className="crd-health-list">
                    {request.healthLogs.map((log) => (
                      <div key={log.id} className="crd-health-item">
                        <div className="crd-health-head">
                          <strong>{log.horseName}</strong>
                          <span className={`crd-doctor-badge ${log.isDoctorConclusion ? 'doc' : 'staff'}`}>
                            {log.isDoctorConclusion ? '🩺 Kết luận Bác Sĩ Thú Y' : '📋 Quan sát Nhân sự Đi kèm'}
                          </span>
                        </div>
                        <div className="crd-health-stats">
                          {log.temperature && <span>Thân nhiệt: <b>{log.temperature}°C</b></span>}
                          {log.heartRate && <span>Nhịp tim: <b>{log.heartRate} bpm</b></span>}
                          {log.waterIntakeLiters && <span>Nước uống: <b>{log.waterIntakeLiters} L</b></span>}
                          {log.foodIntakeKg && <span>Thức ăn: <b>{log.foodIntakeKg} kg</b></span>}
                        </div>
                        <p className="crd-health-notes">{log.observationNotes}</p>
                        <div className="crd-health-footer">
                          Ghi nhận bởi: <b>{log.recordedBy}</b> ({log.role}) • {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Incidents (Sự cố) */}
              <div className="crd-card crd-col-full">
                <h3>Sự Cố & Biến Động Chuyến Đi</h3>
                <p className="crd-card-sub">
                  Theo dõi các sự cố liên quan đến phương tiện, sức khỏe hoặc lịch bay. Không bao gồm chi phí phát sinh nội bộ.
                </p>

                {(!request.incidents || request.incidents.length === 0) ? (
                  <p className="crd-text-muted">Không có sự cố nào được ghi nhận cho chuyến vận chuyển này.</p>
                ) : (
                  <div className="crd-incident-list">
                    {request.incidents.map((inc) => (
                      <div key={inc.id} className="crd-incident-item">
                        <div className="crd-incident-head">
                          <strong>⚠️ {inc.title}</strong>
                          <span className="crd-incident-type">Loại: {inc.type}</span>
                          <span className={`crd-pill ${inc.status === 'RESOLVED' ? 'green' : 'orange'}`}>
                            {inc.status === 'RESOLVED' ? 'Đã xử lý' : 'Đang xử lý'}
                          </span>
                        </div>
                        <p className="crd-incident-desc">{inc.description}</p>
                        {inc.impactOnEta && (
                          <div className="crd-incident-impact">
                            Ảnh hưởng lịch trình/ETA: <b>{inc.impactOnEta}</b>
                          </div>
                        )}
                        {inc.resolutionNotes && (
                          <div className="crd-incident-res">
                            Kết quả xử lý: {inc.resolutionNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. HANDOVER */}
          {currentTab === 'handover' && (
            <div className="crd-card">
              <h3>Bàn Giao & Nghiệm Thu</h3>
              <p className="crd-card-sub">
                Người nhận tại điểm giao cuối xác nhận nhận bàn giao bằng mã OTP email. Sau đó, Customer thanh toán số dư để mở cửa sổ 24h feedback.
              </p>

              <div className="crd-handover-box">
                <div className="crd-handover-status">
                  <h4>Trạng thái Bàn giao Ngựa</h4>
                  {request.handover ? (
                    <div className="crd-verified-box">
                      <span className="crd-check-big">✓</span>
                      <div>
                        <strong>Bàn giao đã hoàn tất! (Trip COMPLETED)</strong>
                        <p>Xác nhận bởi: {request.handover.receiverName} ({request.handover.receiverEmail})</p>
                        <p>Ghi chú: {request.handover.receiverSignatureNotes}</p>
                        <small>Thời gian: {new Date(request.handover.completedAt || '').toLocaleString()}</small>
                      </div>
                    </div>
                  ) : (
                    <div className="crd-pending-handover">
                      <p>Người nhận <b>{request.receiverName}</b> ({request.receiverEmail}) sẽ nhận mã OTP gửi qua email khi đội xe tới điểm giao cuối.</p>
                      <button
                        className="crd-btn crd-btn-primary"
                        onClick={() => setShowHandoverOtpModal(true)}
                      >
                        Mô phỏng Người nhận nhập mã OTP bàn giao
                      </button>
                    </div>
                  )}
                </div>

                {/* Acceptance Window Information */}
                {request.acceptanceWindow && (
                  <div className="crd-acceptance-box">
                    <h4>Cửa Sổ 24 Giờ Đánh Giá & Khiếu Nại (Acceptance Window)</h4>
                    <p>
                      Thời gian còn lại: <b>{feedbackTimeLeft}</b>
                    </p>
                    <p className="crd-sub">
                      Khi hết thời gian này và không có khiếu nại mở, đơn và hợp đồng sẽ tự động đóng lại.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. COMPLAINTS & FEEDBACK */}
          {currentTab === 'complaints' && (
            <div className="crd-complaints-view">
              {/* Rating Feedback Card */}
              <div className="crd-card">
                <h3>Đánh Giá Dịch Vụ (Feedback)</h3>
                <p className="crd-card-sub">
                  Gửi nhận xét đánh giá chất lượng chuyến đi. Đánh giá thông thường không chặn việc đóng đơn tự động.
                </p>

                {request.feedback || feedbackSent ? (
                  <div className="crd-feedback-sent">
                    <p>⭐ Đã gửi đánh giá: <b>{request.feedback?.rating || ratingScore}/5 sao</b></p>
                    <p>"{request.feedback?.comment || ratingComment}"</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitRatingFeedback} className="crd-feedback-form">
                    <div className="crd-field">
                      <label>Số sao đánh giá (1 - 5 sao)</label>
                      <select
                        className="crd-select"
                        value={ratingScore}
                        onChange={(e) => setRatingScore(Number(e.target.value))}
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 sao - Xuất sắc</option>
                        <option value={4}>⭐⭐⭐⭐ 4 sao - Tốt</option>
                        <option value={3}>⭐⭐⭐ 3 sao - Bình thường</option>
                        <option value={2}>⭐⭐ 2 sao - Chưa hài lòng</option>
                        <option value={1}>⭐ 1 sao - Kém</option>
                      </select>
                    </div>
                    <div className="crd-field">
                      <label>Ý kiến đóng góp của bạn</label>
                      <textarea
                        className="crd-textarea"
                        rows={3}
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Chia sẻ trải nghiệm vận chuyển của bạn..."
                      />
                    </div>
                    <button type="submit" className="crd-btn crd-btn-primary">
                      Gửi đánh giá
                    </button>
                  </form>
                )}
              </div>

              {/* Complaints List & Submit */}
              <div className="crd-card">
                <div className="crd-split-head">
                  <div>
                    <h3>Khiếu Nại Vận Chuyển (Complaints)</h3>
                    <p className="crd-card-sub">
                      Khiếu nại đang mở sẽ giữ đơn không bị đóng tự động cho đến khi được giải quyết xong và được Customer đồng ý.
                    </p>
                  </div>
                  <button className="crd-btn crd-btn-danger" onClick={() => setShowComplaintModal(true)}>
                    + Gửi khiếu nại mới
                  </button>
                </div>

                {request.complaints.length === 0 ? (
                  <p className="crd-text-muted">Chưa có khiếu nại nào cho đơn vận chuyển này.</p>
                ) : (
                  <div className="crd-complaints-list">
                    {request.complaints.map((c) => (
                      <div key={c.id} className="crd-complaint-item">
                        <div className="crd-complaint-header">
                          <strong>{c.title}</strong>
                          <span className={`crd-cmp-status ${c.status.toLowerCase()}`}>
                            {c.status === 'OPEN' ? 'Đang mở (Chờ xử lý)' : c.status === 'MANAGER_RESOLVED' ? 'Quản lý đã giải quyết' : 'Khách hàng đã đồng ý'}
                          </span>
                        </div>
                        <p className="crd-cmp-content">{c.content}</p>
                        <small>Gửi lúc: {new Date(c.createdAt).toLocaleString()} | Phân loại: {c.category}</small>

                        {/* Manager Resolution Box */}
                        {c.managerResolution && (
                          <div className="crd-manager-res-box">
                            <strong>Phương án giải quyết từ Logistics Manager:</strong>
                            <p>{c.managerResolution.resolutionSummary}</p>
                            {c.managerResolution.refundAdjustmentOffer && (
                              <p>Đề xuất hoàn trả/điều chỉnh chi phí: <b>${c.managerResolution.refundAdjustmentOffer.toLocaleString()} USD</b></p>
                            )}
                            <small>Giải quyết lúc: {new Date(c.managerResolution.resolvedAt).toLocaleString()}</small>

                            {c.status === 'MANAGER_RESOLVED' && (
                              <div className="crd-mt-2">
                                <button
                                  className="crd-btn crd-btn-success"
                                  onClick={() => handleAgreeComplaint(c.id)}
                                >
                                  Đồng ý với kết quả giải quyết (Kích hoạt 24h mới) ➔
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. HISTORY */}
          {currentTab === 'history' && (
            <div className="crd-card">
              <h3>Toàn Bộ Mốc Thời Gian (Audit History)</h3>
              <ul className="crd-history-list">
                <li>
                  <span className="crd-hist-time">{new Date(request.createdAt).toLocaleString()}</span>
                  <span>Tạo yêu cầu vận chuyển mới: <b>{request.id}</b></span>
                </li>
                {request.contractVersions.map((v) => (
                  <li key={v.version}>
                    <span className="crd-hist-time">{new Date(v.issuedAt).toLocaleString()}</span>
                    <span>Phát hành hợp đồng phiên bản <b>v{v.version}</b> (${v.totalPrice.toLocaleString()} USD, cọc ${v.depositRequired.toLocaleString()} USD)</span>
                  </li>
                ))}
                {request.transactions.map((tx) => (
                  <li key={tx.id}>
                    <span className="crd-hist-time">{new Date(tx.createdAt).toLocaleString()}</span>
                    <span>Giao dịch {tx.type === 'DEPOSIT' ? 'tiền cọc' : 'số dư'}: <b>{tx.referenceCode}</b> - Trạng thái: {tx.status}</span>
                  </li>
                ))}
                {request.handover && (
                  <li>
                    <span className="crd-hist-time">{new Date(request.handover.completedAt || '').toLocaleString()}</span>
                    <span>Hoàn tất bàn giao ngựa tại điểm giao cuối qua xác thực OTP người nhận.</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* MODAL: OTP Sign Contract */}
        {showOtpSignModal && (
          <div className="crd-modal-overlay">
            <div className="crd-modal-box">
              <h3>Ký Hợp Đồng Bằng Mã OTP</h3>
              <p className="crd-modal-sub">
                Mã xác thực OTP đã được gửi về email của bạn ({request.customerEmail}).
                Mã mẫu thử nghiệm: <b>686868</b>.
              </p>
              {otpSuccessMsg && <div className="crd-alert-success">{otpSuccessMsg}</div>}
              {otpError && <div className="crd-alert-error">{otpError}</div>}

              <div className="crd-field crd-mt-4">
                <label>Nhập mã OTP 6 số</label>
                <input
                  type="text"
                  maxLength={6}
                  className="crd-input crd-otp-input"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="686868"
                />
              </div>

              <div className="crd-modal-footer">
                <button className="crd-btn crd-btn-secondary" onClick={() => setShowOtpSignModal(false)}>
                  Hủy
                </button>
                <button className="crd-btn crd-btn-primary" onClick={handleConfirmOtpSign}>
                  Xác nhận ký hợp đồng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Contract Change Request */}
        {showChangeModal && (
          <div className="crd-modal-overlay">
            <div className="crd-modal-box">
              <h3>Yêu Cầu Chỉnh Sửa Hợp Đồng</h3>
              <p className="crd-modal-sub">
                Chọn các nội dung cần sửa đổi và ghi chú cụ thể để Logistics Manager xem xét và lập bản nháp mới.
              </p>
              {changeError && <div className="crd-alert-error">{changeError}</div>}

              <div className="crd-checkbox-group">
                {[
                  { id: 'route', label: 'Lộ trình / Điểm giao nhận' },
                  { id: 'dates', label: 'Thời gian xuất phát / Hạn chót' },
                  { id: 'pricing', label: 'Chi phí dịch vụ / Tỷ lệ cọc' },
                  { id: 'terms', label: 'Điều khoản trách nhiệm & Bảo hiểm' },
                  { id: 'other', label: 'Nội dung khác' },
                ].map((item) => (
                  <label key={item.id} className="crd-checkbox-item">
                    <input
                      type="checkbox"
                      checked={changeSections.includes(item.id)}
                      onChange={() => handleToggleChangeSection(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="crd-field crd-mt-4">
                <label>Ghi chú chi tiết yêu cầu sửa đổi *</label>
                <textarea
                  className="crd-textarea"
                  rows={4}
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="Ghi rõ lý do và đề xuất điều chỉnh..."
                />
              </div>

              <div className="crd-modal-footer">
                <button className="crd-btn crd-btn-secondary" onClick={() => setShowChangeModal(false)}>
                  Đóng
                </button>
                <button className="crd-btn crd-btn-primary" onClick={handleSubmitContractChange}>
                  Gửi yêu cầu chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Payment Gateway Sandbox */}
        {showPaymentModal && curVersion && (
          <div className="crd-modal-overlay">
            <div className="crd-modal-box">
              <h3>
                {paymentType === 'DEPOSIT'
                  ? `Thanh Toán Cọc 30% (${curVersion.depositRequired.toLocaleString()} USD)`
                  : `Thanh Toán Số Dư 70% (${curVersion.balanceRemaining.toLocaleString()} USD)`}
              </h3>
              <p className="crd-modal-sub">
                Mô phỏng cổng thanh toán trực tuyến. Không phát sinh giao dịch tiền tệ thật.
              </p>

              {paymentStep === 'SELECT' && (
                <div>
                  <div className="crd-field">
                    <label>Chọn phương thức thanh toán</label>
                    <select
                      className="crd-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'VNPAY' | 'BANK_TRANSFER')}
                    >
                      <option value="VNPAY">Cổng VNPAY (Thẻ nội địa / QR Code)</option>
                      <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (Ủy nhiệm chi)</option>
                    </select>
                  </div>

                  <div className="crd-payment-preview">
                    <div>Mã hợp đồng: <b>{curVersion.contractRef}</b></div>
                    <div>Số tiền cần thanh toán: <b>${(paymentType === 'DEPOSIT' ? curVersion.depositRequired : curVersion.balanceRemaining).toLocaleString()} USD</b></div>
                  </div>

                  <div className="crd-modal-footer">
                    <button className="crd-btn crd-btn-secondary" onClick={() => setShowPaymentModal(false)}>
                      Hủy
                    </button>
                    <button className="crd-btn crd-btn-success" onClick={handleConfirmPaymentGateway}>
                      Tiến hành thanh toán ➔
                    </button>
                  </div>
                </div>
              )}

              {paymentStep === 'CONFIRMING' && (
                <div className="crd-payment-confirming">
                  <div className="crd-spinner"></div>
                  <p>Đang gửi lệnh thanh toán và chờ hệ thống đối soát giao dịch...</p>
                </div>
              )}

              {paymentStep === 'DONE' && (
                <div className="crd-payment-done">
                  <span className="crd-check-big">✓</span>
                  <h4>Thanh toán thành công & Đã xác minh!</h4>
                  <p>Mã giao dịch: <b>{activeTx?.referenceCode}</b></p>
                  <button
                    className="crd-btn crd-btn-primary"
                    onClick={() => {
                      setShowPaymentModal(false);
                      refreshRequest();
                    }}
                  >
                    Hoàn tất & Tiếp tục
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Receiver Handover OTP */}
        {showHandoverOtpModal && (
          <div className="crd-modal-overlay">
            <div className="crd-modal-box">
              <h3>Xác Nhận Nhận Ngựa (Người Nhận Chỉ Định)</h3>
              <p className="crd-modal-sub">
                Người nhận <b>{request.receiverName}</b> ({request.receiverEmail}) nhập mã OTP gửi qua email để tiếp nhận ngựa. Mã mẫu demo: <b>999888</b>.
              </p>
              {handoverError && <div className="crd-alert-error">{handoverError}</div>}

              <div className="crd-field crd-mt-4">
                <label>Nhập mã OTP 6 số người nhận</label>
                <input
                  type="text"
                  maxLength={6}
                  className="crd-input crd-otp-input"
                  value={handoverOtp}
                  onChange={(e) => setHandoverOtp(e.target.value)}
                  placeholder="999888"
                />
              </div>

              <div className="crd-field">
                <label>Ghi chú biên bản bàn giao</label>
                <textarea
                  className="crd-textarea"
                  rows={2}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Tình trạng ngựa khi tiếp nhận..."
                />
              </div>

              <div className="crd-modal-footer">
                <button className="crd-btn crd-btn-secondary" onClick={() => setShowHandoverOtpModal(false)}>
                  Đóng
                </button>
                <button className="crd-btn crd-btn-success" onClick={handleVerifyHandoverOtp}>
                  Xác nhận nhận ngựa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Submit Complaint */}
        {showComplaintModal && (
          <div className="crd-modal-overlay">
            <div className="crd-modal-box">
              <h3>Gửi Khiếu Nại Dịch Vụ</h3>
              <p className="crd-modal-sub">
                Khiếu nại về các vấn đề phát sinh từ vận chuyển. Khiếu nại sẽ được Logistics Manager tiếp nhận xử lý.
              </p>
              <form onSubmit={handleSubmitComplaint}>
                <div className="crd-field">
                  <label>Nhóm khiếu nại *</label>
                  <select
                    className="crd-select"
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value as CustomerComplaint['category'])}
                  >
                    <option value="EQUIPMENT_CONDITION">Phương tiện / Trang thiết bị</option>
                    <option value="HORSE_HEALTH_IMPACT">Sức khỏe ngựa sau chặng</option>
                    <option value="DELAY_DELIVERY">Chậm trễ hành trình bàn giao</option>
                    <option value="BILLING">Chi phí / Thanh toán</option>
                    <option value="OTHER">Vấn đề khác</option>
                  </select>
                </div>
                <div className="crd-field">
                  <label>Tiêu đề khiếu nại *</label>
                  <input
                    type="text"
                    className="crd-input"
                    value={complaintTitle}
                    onChange={(e) => setComplaintTitle(e.target.value)}
                    placeholder="Tóm tắt ngắn gọn vấn đề..."
                    required
                  />
                </div>
                <div className="crd-field">
                  <label>Mô tả chi tiết *</label>
                  <textarea
                    className="crd-textarea"
                    rows={4}
                    value={complaintContent}
                    onChange={(e) => setComplaintContent(e.target.value)}
                    placeholder="Mô tả sự việc, thời điểm và yêu cầu giải quyết..."
                    required
                  />
                </div>
                <div className="crd-modal-footer">
                  <button type="button" className="crd-btn crd-btn-secondary" onClick={() => setShowComplaintModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="crd-btn crd-btn-danger">
                    Gửi khiếu nại
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};
