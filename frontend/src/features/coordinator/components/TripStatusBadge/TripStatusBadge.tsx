import React from 'react';
import './TripStatusBadge.css';
import {
  DELAY_LABEL,
  DEPLOYMENT_LABEL,
  PLAN_STATUS_LABEL,
  FLIGHT_STATUS_LABEL,
  INCIDENT_STATUS_LABEL,
  ROUTE_STATUS_LABEL,
  TRIP_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
} from '../../hooks/coordinatorRules';

export type BadgeTone = 'ok' | 'info' | 'warn' | 'bad' | 'muted' | 'brand';

const TONE: Record<string, BadgeTone> = {
  // trip
  PLANNING: 'info', READY_TO_DEPART: 'ok', IN_TRANSIT: 'brand', COMPLETED: 'muted',
  // deployment
  NOT_CONFIRMED: 'warn', CONFIRMED: 'ok', ON_HOLD: 'bad',
  // route
  DRAFT: 'muted', PENDING_APPROVAL: 'warn', APPROVED: 'ok', RETURNED: 'bad',
  // flight
  BUDGET_PENDING: 'warn', BUDGET_APPROVED: 'info', BOOKED: 'ok', REJECTED: 'bad',
  // vehicle
  READY: 'ok', MAINTENANCE: 'warn', INACTIVE: 'muted',
  // incident
  NEW: 'bad', IN_PROGRESS: 'warn', RESOLVED: 'ok', CLOSED: 'muted',
  // rescue plan
  APPLIED: 'ok',
  // departure delay
  REPORTED: 'warn',
};

const LABEL: Record<string, string> = {
  ...TRIP_STATUS_LABEL, ...DEPLOYMENT_LABEL, ...ROUTE_STATUS_LABEL, ...FLIGHT_STATUS_LABEL,
  ...VEHICLE_STATUS_LABEL, ...INCIDENT_STATUS_LABEL, ...DELAY_LABEL, ...PLAN_STATUS_LABEL,
};

interface TripStatusBadgeProps {
  /** Mã trạng thái (TripStatus, RouteStatus, FlightStatus, …) */
  status?: string;
  /** Ghi đè nhãn hiển thị */
  label?: string;
  /** Ghi đè màu */
  tone?: BadgeTone;
  className?: string;
}

export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ status = '', label, tone, className = '' }) => (
  <span className={`crd-badge crd-badge--${tone ?? TONE[status] ?? 'muted'} ${className}`}>
    {label ?? LABEL[status] ?? status}
  </span>
);

export default TripStatusBadge;
