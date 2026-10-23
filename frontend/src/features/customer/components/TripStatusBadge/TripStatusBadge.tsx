import React from 'react';
import './TripStatusBadge.css';
import type { ContractState, DepositState, DocStatus, PaymentStatus, RequestStatus, TripStatus } from '../../types';
import {
  CONTRACT_STATE_LABEL,
  DEPOSIT_STATE_LABEL,
  DOC_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  TRIP_STATUS_LABEL,
} from '../../hooks/customerRules';

export type BadgeTone = 'ok' | 'info' | 'warn' | 'bad' | 'muted' | 'brand';

const REQUEST_TONE: Record<RequestStatus, BadgeTone> = {
  DRAFT: 'muted', PENDING_REVIEW: 'warn', CHANGES_REQUESTED: 'bad', REJECTED: 'bad', CONTRACT_PREPARATION: 'info',
  CONTRACT_READY: 'info', CONTRACT_CHANGES_REQUESTED: 'warn', DEPOSIT_VERIFIED: 'ok', CANCELLATION_REQUESTED: 'warn',
  ACTIVATED: 'brand', SCHEDULED: 'info', IN_TRANSIT: 'brand', DELIVERED: 'ok', CLOSED: 'muted', CANCELLED: 'muted',
};
const CONTRACT_TONE: Record<ContractState, BadgeTone> = {
  ISSUED: 'info', CHANGES_REQUESTED: 'warn', EXPIRED: 'bad', SUPERSEDED: 'muted', EFFECTIVE: 'ok', FULFILLED: 'muted',
};
const DOC_TONE: Record<DocStatus, BadgeTone> = {
  MISSING: 'bad', NEEDS_INPUT: 'bad', OPTIONAL: 'muted', NOT_REQUIRED_YET: 'muted', SUBMITTED: 'info',
  PENDING_REVIEW: 'warn', APPROVED: 'ok', ACTION_REQUIRED: 'bad',
};
const TRIP_TONE: Record<TripStatus, BadgeTone> = { PLANNING: 'info', READY_TO_DEPART: 'ok', IN_TRANSIT: 'brand', COMPLETED: 'muted' };
const PAY_TONE: Record<PaymentStatus, BadgeTone> = { PENDING_CONFIRMATION: 'warn', PROCESSING: 'warn', SUCCESS: 'ok', FAILED: 'bad', REJECTED: 'bad' };
const DEPOSIT_TONE: Record<DepositState, BadgeTone> = { NONE: 'muted', PENDING: 'warn', VERIFIED: 'ok', FAILED: 'bad' };

type BadgeKind = 'request' | 'contract' | 'doc' | 'trip' | 'payment' | 'deposit';
const MAPS: Record<BadgeKind, [Record<string, string>, Record<string, BadgeTone>]> = {
  request: [REQUEST_STATUS_LABEL, REQUEST_TONE],
  contract: [CONTRACT_STATE_LABEL, CONTRACT_TONE],
  doc: [DOC_STATUS_LABEL, DOC_TONE],
  trip: [TRIP_STATUS_LABEL, TRIP_TONE],
  payment: [PAYMENT_STATUS_LABEL, PAY_TONE],
  deposit: [DEPOSIT_STATE_LABEL, DEPOSIT_TONE],
};

interface TripStatusBadgeProps {
  /** Mã trạng thái */
  status?: string;
  /** Loại trạng thái (mặc định: yêu cầu vận chuyển) */
  kind?: BadgeKind;
  /** Ghi đè nhãn hiển thị */
  label?: string;
  /** Ghi đè màu */
  tone?: BadgeTone;
  className?: string;
}

/** Huy hiệu trạng thái dùng chung: yêu cầu, hợp đồng, giấy tờ, chuyến, thanh toán */
export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ status = '', kind = 'request', label, tone, className = '' }) => {
  const [labels, tones] = MAPS[kind];
  return (
    <span className={`cus-badge cus-badge--${tone ?? tones[status] ?? 'muted'} ${className}`}>
      {label ?? labels[status] ?? status}
    </span>
  );
};

export default TripStatusBadge;
