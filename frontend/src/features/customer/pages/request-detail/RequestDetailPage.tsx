import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CustomerLayout, Icon } from '../../components/CustomerLayout';
import { TripStatusBadge } from '../../components/TripStatusBadge/TripStatusBadge';
import { RequestProgress } from '../../components/RequestProgress/RequestProgress';
import { Note } from '../../components/Common/Common';
import { useClock, useCustomer } from '../../hooks/useCustomer';
import type { RequestDetailTab, TransportRequest } from '../../types';
import {
  DETAIL_TABS,
  canAcceptTerms,
  canPayDeposit,
  cityLabel,
  ctRef,
  curVersion,
  depositState,
  docsNeedingAction,
  fmtDate,
  fmtDateTime,
  isActive,
  isSupportedRoute,
  tabVisible,
  timeLeft,
  versionState,
} from '../../hooks/customerRules';
import { OverviewTab } from './tabs/OverviewTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { ContractTab } from './tabs/ContractTab';
import { PaymentTab } from './tabs/PaymentTab';
import { TrackingTab } from './tabs/TrackingTab';
import { HandoverTab } from './tabs/HandoverTab';
import { ComplaintsTab } from './tabs/ComplaintsTab';
import { HistoryTab } from './tabs/HistoryTab';
import './RequestDetailPage.css';

type Tone = 'yellow' | 'blue' | 'red' | 'grey' | 'green';

/** Thông điệp trạng thái hiển thị đầu trang chi tiết */
function statusBanner(r: TransportRequest): [Tone, string, string] {
  const v = curVersion(r), vs = v ? versionState(v) : undefined, ds = depositState(r);
  switch (r.status) {
    case 'DRAFT': return ['grey', 'Bản nháp', 'Hoàn tất các bước còn lại và gửi yêu cầu để Manager xét duyệt.'];
    case 'PENDING_REVIEW': return ['yellow', 'Đang chờ Manager xét duyệt', 'CBN Transport đang xem xét yêu cầu. Bạn sẽ nhận thông báo khi có kết quả.'];
    case 'CHANGES_REQUESTED': return ['yellow', 'Manager yêu cầu chỉnh sửa', 'Xem góp ý của Manager và cập nhật yêu cầu.'];
    case 'REJECTED': return ['red', 'Yêu cầu bị từ chối', r.reason ?? ''];
    case 'CONTRACT_PREPARATION': return ['blue', 'Yêu cầu đã được chấp nhận', 'Logistics Manager đang soạn hợp đồng với giá chính thức.'];
    case 'CONTRACT_CHANGES_REQUESTED': return ['yellow', 'Đã gửi yêu cầu sửa hợp đồng', 'Logistics Manager đang xem xét nội dung bạn đề nghị sửa.'];
    case 'CONTRACT_READY':
      if (!v) return ['blue', 'Hợp đồng', ''];
      if (vs === 'EXPIRED') return ['grey', 'Phiên bản hợp đồng đã hết hạn', `${ctRef(v)} không thể ký nữa. Yêu cầu của bạn vẫn còn hiệu lực.`];
      if (v.termsAcceptedAt) return ['blue', 'Đã đồng ý điều khoản', `Thanh toán và xác minh tiền cọc, rồi ký ${ctRef(v)} trước ${fmtDateTime(v.validUntil)} (${timeLeft(v.validUntil)}).`];
      return ['blue', 'Hợp đồng đã sẵn sàng', `Xem ${ctRef(v)}, đồng ý điều khoản, thanh toán cọc và ký OTP trước ${fmtDateTime(v.validUntil)} (${timeLeft(v.validUntil)}).`];
    case 'AWAITING_DEPOSIT': return ['blue', 'Hợp đồng đã ký – chờ tiền cọc', ds === 'PENDING' ? 'VNPAY đang được backend xác minh. Chưa tạo chuyến.' : 'Thanh toán cọc của phiên bản đã ký. Xác minh đủ tiền mới kích hoạt yêu cầu và tạo chuyến.'];
    case 'DEPOSIT_VERIFIED':
      return v && vs === 'EXPIRED'
        ? ['yellow', 'Đã xác minh cọc – quá hạn ký', 'Khoản thanh toán được giữ. CBN Transport sẽ liên hệ để gia hạn hoặc hoàn tiền.']
        : ['green', 'Đã xác minh cọc – chờ ký', v ? `Ký ${ctRef(v)} bằng OTP trước ${fmtDateTime(v.validUntil)} (${timeLeft(v.validUntil)}) để kích hoạt yêu cầu.` : ''];
    case 'CANCELLATION_REQUESTED': return ['yellow', 'Đã gửi yêu cầu hủy', 'Yêu cầu đã có thanh toán nên CBN Transport đối soát khoản tiền và hoàn tiền (nếu có) trước khi hủy. Tiền của bạn không bị mất.'];
    case 'ACTIVATED':
      return docsNeedingAction(r)
        ? ['red', `${docsNeedingAction(r)} giấy tờ cần bạn xử lý`, 'Xem lý do và tải lại giấy tờ ở tab Giấy tờ.']
        : ['green', 'Yêu cầu đã được kích hoạt', 'Hợp đồng có hiệu lực. CBN Transport đang lập kế hoạch và chuẩn bị chuyến đi.'];
    case 'SCHEDULED': return ['green', 'Đã lên lịch vận chuyển', r.trip ? `Dự kiến xuất phát ${fmtDateTime(r.trip.plannedDepart)}.` : ''];
    case 'IN_TRANSIT': return ['blue', 'Ngựa của bạn đang trên đường', r.trip ? `Dự kiến đến ${fmtDateTime(r.trip.eta)}.` : ''];
    case 'DELIVERED': return ['green', 'Đã giao – yêu cầu chưa đóng', 'Nghiệm thu, thanh toán số dư và đóng yêu cầu được xử lý riêng.'];
    case 'CLOSED': return ['green', 'Yêu cầu đã đóng', `Đủ mọi điều kiện đóng${r.closedAt ? ` • ${fmtDateTime(r.closedAt)}` : ''}.`];
    case 'CANCELLED': return ['grey', 'Yêu cầu đã hủy', r.reason ?? ''];
  }
  return ['grey', '', ''];
}

/** Chi tiết yêu cầu vận chuyển với 8 tab */
export const RequestDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { requestId = '', tab = 'overview' } = useParams<{ requestId: string; tab: string }>();
  const { getRequest, actions } = useCustomer();
  useEffect(() => {
    void actions.loadRequest(requestId);
    const timer = setInterval(() => { void actions.loadRequest(requestId); }, 15000);
    return () => clearInterval(timer);
  }, [requestId, actions]);
  useClock(30000); // cập nhật thời gian còn lại của hạn ký
  const r = getRequest(requestId);

  if (!r) {
    return (
      <CustomerLayout title="Yêu cầu vận chuyển">
        <Note tone="grey" title="Không tìm thấy yêu cầu">Yêu cầu {requestId} không tồn tại hoặc không thuộc tài khoản của bạn.</Note>
        <button type="button" className="cus-btn" style={{ marginTop: 12 }} onClick={() => navigate('/customer/requests')}>Về danh sách yêu cầu</button>
      </CustomerLayout>
    );
  }

  const active = DETAIL_TABS.some(([k]) => k === tab) && tabVisible(r, tab as RequestDetailTab) ? (tab as RequestDetailTab) : 'overview';
  const [tone, title, text] = statusBanner(r);
  const v = curVersion(r);
  const badge = (k: RequestDetailTab) => {
    if (k === 'contract' && canAcceptTerms(r)) return <small className="cus-tab-badge">1</small>;
    if (k === 'payment' && canPayDeposit(r)) return <small className="cus-tab-badge">1</small>;
    if (k === 'documents' && docsNeedingAction(r)) return <small className="cus-tab-badge">{docsNeedingAction(r)}</small>;
    if (k === 'handover' && r.acceptance?.status === 'PENDING') return <small className="cus-tab-badge">1</small>;
    if (k === 'history') return <small className="cus-tab-count">{r.history.length}</small>;
    return null;
  };
  const backTo = isActive(r) ? '/customer/requests' : '/customer/history';

  return (
    <CustomerLayout title={isActive(r) ? 'Yêu cầu vận chuyển' : 'Lịch sử'}>
      <button type="button" className="cus-back" onClick={() => navigate(backTo)}>
        <Icon name="back" />{isActive(r) ? 'Yêu cầu vận chuyển' : 'Lịch sử'}
      </button>
      <div className="cus-head">
        <div>
          <h2 className="cus-title cus-detail__title">{r.id} <TripStatusBadge status={r.status} /></h2>
          <p className="cus-subtitle">
            Gửi {r.submittedAt ? fmtDateTime(r.submittedAt) : 'chưa gửi'} • {cityLabel(r.origin)} → {cityLabel(r.destination)} • Ngày vận chuyển {fmtDate(r.date)}
          </p>
          {!isSupportedRoute(r.origin, r.destination) && <span className="cus-legacy">Tuyến lịch sử – không nhận đơn mới</span>}
        </div>
      </div>

      {params.get('submitted') === '1' && r.status === 'PENDING_REVIEW' && (
        <Note tone="green" title="Đã gửi yêu cầu vận chuyển">Logistics Manager sẽ xét duyệt và thông báo kết quả cho bạn.</Note>
      )}
      <Note tone={tone} title={title}>{text}</Note>
      {r.status === 'CONTRACT_READY' && v && versionState(v) === 'ISSUED' && (
        <p className="cus-countdown"><Icon name="clock" />Hạn chung cọc + ký OTP: <b>{fmtDateTime(v.validUntil)}</b> • {timeLeft(v.validUntil)}</p>
      )}

      <RequestProgress request={r} />

      <div className="cus-tabs" role="tablist">
        {DETAIL_TABS.filter(([k]) => tabVisible(r, k)).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={k === active} className={k === active ? 'on' : ''}
            onClick={() => navigate(`/customer/requests/${r.id}${k === 'overview' ? '' : `/${k}`}`)}>
            {label}{badge(k)}
          </button>
        ))}
      </div>

      {active === 'overview' && <OverviewTab request={r} />}
      {active === 'documents' && <DocumentsTab request={r} />}
      {active === 'contract' && <ContractTab request={r} />}
      {active === 'payment' && <PaymentTab request={r} />}
      {active === 'tracking' && <TrackingTab request={r} />}
      {active === 'handover' && <HandoverTab request={r} />}
      {active === 'complaints' && <ComplaintsTab request={r} />}
      {active === 'history' && <HistoryTab request={r} />}
    </CustomerLayout>
  );
};

export default RequestDetailPage;
