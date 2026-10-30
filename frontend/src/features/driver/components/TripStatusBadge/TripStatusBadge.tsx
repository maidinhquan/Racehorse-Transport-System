import React from 'react';
import './TripStatusBadge.css';
import {
  CLEARANCE_LABEL,
  CONDITION_LABEL,
  DELAY_LABEL,
  INCIDENT_STATUS_LABEL,
  SEVERITY_LABEL,
  TRIP_STATUS_LABEL,
} from '../../hooks/driverRules';

export type BadgeTone = 'ok' | 'info' | 'warn' | 'bad' | 'muted' | 'brand';

const TONE: Record<string, BadgeTone> = {
  // trip
  PLANNING: 'info', READY_TO_DEPART: 'ok', IN_TRANSIT: 'brand', COMPLETED: 'muted',
  // clearance
  PASSED: 'ok', HELD: 'warn', REJECTED: 'bad',
  // horse condition
  NORMAL: 'ok', MONITOR: 'warn', ABNORMAL: 'bad',
  // incident
  NEW: 'bad', IN_PROGRESS: 'warn', RESOLVED: 'ok', CLOSED: 'muted',
  LOW: 'muted', MEDIUM: 'warn', HIGH: 'bad', CRITICAL: 'bad',
  // departure delay
  REPORTED: 'warn', PENDING_APPROVAL: 'warn', APPROVED: 'ok',
};

const LABEL: Record<string, string> = {
  ...TRIP_STATUS_LABEL, ...CLEARANCE_LABEL, ...CONDITION_LABEL, ...INCIDENT_STATUS_LABEL, ...SEVERITY_LABEL, ...DELAY_LABEL,
};

interface TripStatusBadgeProps {
  /** Mã trạng thái (TripStatus, ClearanceResult, HorseCondition, …) */
  status?: string;
  /** Ghi đè nhãn hiển thị */
  label?: string;
  /** Ghi đè màu */
  tone?: BadgeTone;
  className?: string;
}

export const TripStatusBadge: React.FC<TripStatusBadgeProps> = ({ status = '', label, tone, className = '' }) => (
  <span className={`drv-badge drv-badge--${tone ?? TONE[status] ?? 'muted'} ${className}`}>
    {label ?? LABEL[status] ?? status}
  </span>
);

export default TripStatusBadge;
