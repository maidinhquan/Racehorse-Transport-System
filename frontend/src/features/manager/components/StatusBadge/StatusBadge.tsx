import React from 'react';
import './StatusBadge.css';
import type {
  ComplaintStatus,
  ContractState,
  DeploymentStatus,
  DossierStatus,
  FlightStatus,
  IncidentStatus,
  PaymentStatus,
  PlanStatus,
  RequestStatus,
  RouteStatus,
  Severity,
  TripStatus,
} from '../../types';
import {
  COMPLAINT_STATUS_LABEL,
  CONTRACT_STATE_LABEL,
  DEPLOYMENT_LABEL,
  DOSSIER_LABEL,
  FLIGHT_STATUS_LABEL,
  INCIDENT_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PLAN_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  ROUTE_STATUS_LABEL,
  SEVERITY_LABEL,
  TRIP_STATUS_LABEL,
} from '../../hooks/managerRules';

export type BadgeTone = 'ok' | 'info' | 'warn' | 'bad' | 'muted' | 'brand';
export type BadgeKind = 'request' | 'contract' | 'payment' | 'trip' | 'deployment' | 'route' | 'flight' | 'incident' | 'severity' | 'plan' | 'complaint' | 'dossier';

const TONES: Record<BadgeKind, Record<string, BadgeTone>> = {
  request: {
    DRAFT: 'muted', PENDING_REVIEW: 'warn', CHANGES_REQUESTED: 'muted', REJECTED: 'bad', CONTRACT_PREPARATION: 'info', CONTRACT_READY: 'info',
    CONTRACT_CHANGES_REQUESTED: 'warn', DEPOSIT_VERIFIED: 'info', CANCELLATION_REQUESTED: 'bad', ACTIVATED: 'brand', SCHEDULED: 'ok',
    IN_TRANSIT: 'brand', DELIVERED: 'ok', CLOSED: 'muted', CANCELLED: 'muted',
  } satisfies Record<RequestStatus, BadgeTone>,
  contract: { ISSUED: 'info', CHANGES_REQUESTED: 'warn', EXPIRED: 'bad', SUPERSEDED: 'muted', EFFECTIVE: 'ok', FULFILLED: 'muted', VOID: 'muted' } satisfies Record<ContractState, BadgeTone>,
  payment: { PENDING_CONFIRMATION: 'warn', PROCESSING: 'info', SUCCESS: 'ok', FAILED: 'bad', REJECTED: 'bad' } satisfies Record<PaymentStatus, BadgeTone>,
  trip: { PLANNING: 'info', READY_TO_DEPART: 'ok', IN_TRANSIT: 'brand', COMPLETED: 'muted' } satisfies Record<TripStatus, BadgeTone>,
  deployment: { NOT_CONFIRMED: 'warn', CONFIRMED: 'ok', ON_HOLD: 'bad' } satisfies Record<DeploymentStatus, BadgeTone>,
  route: { PENDING_APPROVAL: 'warn', APPROVED: 'ok', CHANGES_REQUESTED: 'bad' } satisfies Record<RouteStatus, BadgeTone>,
  flight: { BUDGET_PENDING: 'warn', APPROVED: 'info', REJECTED: 'bad', BOOKED: 'ok' } satisfies Record<FlightStatus, BadgeTone>,
  incident: { NEW: 'bad', IN_PROGRESS: 'warn', CLOSED: 'muted' } satisfies Record<IncidentStatus, BadgeTone>,
  severity: { LOW: 'muted', MEDIUM: 'warn', HIGH: 'bad', CRITICAL: 'bad' } satisfies Record<Severity, BadgeTone>,
  plan: { PENDING_APPROVAL: 'warn', APPROVED: 'ok', REJECTED: 'bad' } satisfies Record<PlanStatus, BadgeTone>,
  complaint: { NEW: 'bad', IN_PROGRESS: 'warn', PROPOSED: 'info', ESCALATED: 'bad', RESOLVED: 'ok' } satisfies Record<ComplaintStatus, BadgeTone>,
  dossier: { APPROVED: 'ok', PENDING_REVIEW: 'warn', ACTION_REQUIRED: 'bad', MISSING: 'bad' } satisfies Record<DossierStatus, BadgeTone>,
};
const LABELS: Record<BadgeKind, Record<string, string>> = {
  request: REQUEST_STATUS_LABEL, contract: CONTRACT_STATE_LABEL, payment: PAYMENT_STATUS_LABEL, trip: TRIP_STATUS_LABEL, deployment: DEPLOYMENT_LABEL,
  route: ROUTE_STATUS_LABEL, flight: FLIGHT_STATUS_LABEL, incident: INCIDENT_STATUS_LABEL, severity: SEVERITY_LABEL, plan: PLAN_STATUS_LABEL,
  complaint: COMPLAINT_STATUS_LABEL, dossier: DOSSIER_LABEL,
};

interface StatusBadgeProps {
  status?: string;
  kind?: BadgeKind;
  label?: string;
  tone?: BadgeTone;
  className?: string;
}

/** Huy hiệu trạng thái cho mọi đối tượng trong trang Manager */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status = '', kind = 'request', label, tone, className = '' }) => (
  <span className={`mgr-badge mgr-badge--${tone ?? TONES[kind][status] ?? 'muted'} ${className}`}>{label ?? LABELS[kind][status] ?? status}</span>
);

export default StatusBadge;
