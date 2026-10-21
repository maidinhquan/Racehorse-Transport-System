import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TransportRequest } from '../../../types';
import { useCustomer } from '../../../hooks/useCustomer';
import {
  balanceDue,
  balanceState,
  canAcceptTerms,
  canCancel,
  canPayDeposit,
  canRequestContractChange,
  canSign,
  curVersion,
  depositState,
  docsNeedingAction,
  fmtMoney,
  hasDepositMoney,
  signBlock,
  versionState,
} from '../../../hooks/customerRules';
import { Icon } from '../../../components/CustomerLayout';
import { ReasonModal } from '../../../components/Modals';
import { Note } from '../../../components/Common/Common';

/** Nút hành động tiếp theo của khách hàng theo trạng thái yêu cầu (kèm nút hủy khi còn được hủy) */
export const NextAction: React.FC<{ request: TransportRequest }> = ({ request: r }) => {
  const navigate = useNavigate();
  const { actions } = useCustomer();
  const [cancelOpen, setCancelOpen] = useState(false);
  const go = (sub: string) => navigate(`/customer/requests/${r.id}${sub}`);
  const v = curVersion(r), vs = v ? versionState(v) : undefined;
  const btn = (label: string, onClick: () => void, solid = true, icon?: string) => (
    <button type="button" className={`cus-btn cus-btn--block ${solid ? 'cus-btn--solid' : ''}`} onClick={onClick}>{icon && <Icon name={icon} />}{label}</button>
  );

  let main: React.ReactNode = <p className="cus-subtitle" style={{ margin: 0 }}>Hiện không cần bạn thao tác.</p>;
  if (r.status === 'DRAFT') main = btn('Tiếp tục khai báo', () => navigate(r.wizardStep >= 1 ? `/customer/requests/${r.id}/wizard/${Math.min(3, r.wizardStep)}` : `/customer/requests/${r.id}/edit`));
  else if (r.status === 'CHANGES_REQUESTED') main = btn('Sửa & gửi lại', () => go('/edit'));
  else if (canAcceptTerms(r)) main = btn('Xem & đồng ý hợp đồng', () => go('/contract'));
  else if (canPayDeposit(r)) main = btn(depositState(r) === 'FAILED' ? 'Thanh toán lại tiền cọc' : 'Thanh toán tiền cọc', () => go('/deposit'), true, 'card');
  else if (r.status === 'CONTRACT_READY' && depositState(r) === 'PENDING') main = btn('Xem trạng thái thanh toán', () => go('/payment'), false);
  else if (r.status === 'CONTRACT_READY' && vs === 'EXPIRED' && canRequestContractChange(r)) main = btn('Yêu cầu phiên bản cập nhật', () => go('/contract?change=1'));
  else if (canSign(r)) main = btn('Xem lại & ký hợp đồng bằng OTP', () => go('/sign'));
  else if (r.status === 'DEPOSIT_VERIFIED') main = <p className="cus-subtitle" style={{ margin: 0 }}>{signBlock(r)}</p>;
  else if (r.status === 'CANCELLATION_REQUESTED') main = <p className="cus-subtitle" style={{ margin: 0 }}>CBN Transport đang xem xét yêu cầu hủy cùng khoản thanh toán của bạn.</p>;
  else if (['ACTIVATED', 'SCHEDULED'].includes(r.status) && docsNeedingAction(r)) {
    main = <><Note tone="red" title={`${docsNeedingAction(r)} giấy tờ cần xử lý`}>Xem lý do và tải lại giấy tờ.</Note>{btn('Xem & tải lại giấy tờ', () => go('/documents'))}</>;
  } else if (r.status === 'IN_TRANSIT' || r.status === 'SCHEDULED') main = btn('Xem theo dõi chuyến', () => navigate(`/customer/tracking/${r.id}`), r.status === 'IN_TRANSIT', 'pin');
  else if (r.status === 'DELIVERED' && r.acceptance?.status === 'PENDING') main = btn('Xác nhận nghiệm thu', () => go('/handover'));
  else if (r.status === 'DELIVERED' && balanceState(r) === 'PROCESSING') main = <p className="cus-subtitle" style={{ margin: 0 }}>Thanh toán VNPay đang được xác minh.</p>;
  else if (r.status === 'DELIVERED' && balanceDue(r) > 0) main = btn(`Thanh toán ${fmtMoney(balanceDue(r))} qua VNPay`, () => go('/handover'), true, 'card');
  else if (!['DELIVERED'].includes(r.status) && ['CLOSED', 'CANCELLED', 'REJECTED'].includes(r.status)) main = <p className="cus-subtitle" style={{ margin: 0 }}>Yêu cầu đã kết thúc.</p>;

  return (
    <>
      {main}
      {canCancel(r) && (
        <button type="button" className="cus-btn cus-btn--danger cus-btn--block" onClick={() => setCancelOpen(true)}>Hủy yêu cầu</button>
      )}
      <ReasonModal open={cancelOpen} title={`Hủy ${r.id}?`} okText={hasDepositMoney(r) ? 'Gửi yêu cầu hủy' : 'Hủy yêu cầu'} danger
        intro={(
          <>
            <p>Hủy sẽ dừng yêu cầu vận chuyển này. Yêu cầu vẫn được lưu trong Lịch sử, không có gì bị xóa.</p>
            {hasDepositMoney(r) && <Note tone="yellow" title="Đã có thanh toán tiền cọc">Yêu cầu hủy được ghi nhận; CBN Transport đối soát khoản thanh toán và hoàn tiền trước khi hủy chính thức.</Note>}
          </>
        )}
        placeholder="VD: Giải đua bị hoãn" confirmText="Tôi muốn hủy yêu cầu này"
        onClose={() => setCancelOpen(false)} onSubmit={(reason) => actions.cancelRequest(r.id, reason).ok} />
    </>
  );
};

export default NextAction;
