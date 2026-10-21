import React from 'react';
import './TripStatusBadge.css';
import type { ChecklistStatus, CustomerDocStatus, DeploymentStatus, DocRequest, TripStatus } from '../../types';
import { CHECKLIST_LABEL, CUSTOMER_DOC_LABEL, DEPLOYMENT_LABEL, REQUEST_STATUS_LABEL, TRIP_STATUS_LABEL } from '../../hooks/specialistRules';

export type BadgeTone = 'ok' | 'info' | 'warn' | 'bad' | 'muted' | 'brand';
type BadgeKind = 'trip' | 'deployment' | 'check' | 'customer' | 'request';

const TONES: Record<BadgeKind, Record<string, BadgeTone>> = {
  trip: { PLANNING: 'info', READY_TO_DEPART: 'ok', IN_TRANSIT: 'brand', COMPLETED: 'muted' } satisfies Record<TripStatus, BadgeTone>,
  deployment: { NOT_CONFIRMED: 'warn', CONFIRMED: 'ok', ON_HOLD: 'bad' } satisfies Record<DeploymentStatus, BadgeTone>,
  check: { NOT_SUBMITTED: 'bad', SUBMITTED: 'warn', APPROVED: 'ok', REJECTED: 'bad', EXPIRED: 'bad', NOT_CONFIGURED: 'bad' } satisfies Record<ChecklistStatus, BadgeTone>,
  customer: { MISSING: 'bad', OPTIONAL: 'muted', SUBMITTED: 'warn', APPROVED: 'ok', ACTION_REQUIRED: 'bad' } satisfies Record<CustomerDocStatus, BadgeTone>,
  request: { OPEN: 'warn', SUBMITTED: 'info', FULFILLED: 'ok' } satisfies Record<DocRequest['status'], BadgeTone>,
};
const LABELS: Record<BadgeKind, Record<string, string>> = {
  trip: TRIP_STATUS_LABEL, deployment: DEPLOYMENT_LABEL, check: CHECKLIST_LABEL, customer: CUSTOMER_DOC_LABEL, request: REQUEST_STATUS_LABEL,
};

interface TripStatusBadgeProps {
  status?: string;
  kind?: BadgeKind;
  label?: string;
  tone?: BadgeTone;
  className?: string;
}

/** Huy hiệu trạng thái: chuyến, giao việc, checklist, giấy tờ khách hàng, yêu cầu bổ sung */
export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ status = '', kind = 'trip', label, tone, className = '' }) => (
  <span className={`spc-badge spc-badge--${tone ?? TONES[kind][status] ?? 'muted'} ${className}`}>{label ?? LABELS[kind][status] ?? status}</span>
);

export default TripStatusBadge;
