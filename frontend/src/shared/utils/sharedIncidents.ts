// Đồng bộ dữ liệu Sự cố giữa Tài xế (Driver), Chuyên viên (Specialist), Quản lý (Manager) và Điều phối (Coordinator)

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rts_shared_incidents';
const EVENT = 'rts_shared_incidents_changed';
const MAX_INCIDENTS = 100;
const cleanId = (id?: string) => (id || '').replace(/-/g, '_');

export interface SharedIncident {
  id: string;
  tripId: string;
  type: string;
  severity: string;
  status: string;
  at: string;
  by: string;
  location: string;
  lat?: number;
  lng?: number;
  description: string;
  photos: string[];
  approvedPlan?: string;
  plans?: Array<{
    id: string;
    kind: string;
    desc: string;
    cost: number;
    payer: string;
    status: string;
    decisionNote?: string;
    at: string;
  }>;
  complianceReview?: {
    reviewedAt: string;
    reviewedBy: string;
    note: string;
    impact: 'NONE' | 'DOCS_DELAY' | 'INSURANCE_CLAIM' | 'CANCELLED';
  };
  safetyConfirmed?: boolean;
}

function readAll(): SharedIncident[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getSharedIncidents(tripId?: string): SharedIncident[] {
  const all = readAll();
  if (!tripId) return all;
  const id = cleanId(tripId);
  return all.filter((i) => cleanId(i.tripId) === id);
}

export function saveSharedIncident(incident: SharedIncident): void {
  if (!incident?.id) return;
  try {
    const all = readAll();
    const existingIndex = all.findIndex((i) => cleanId(i.id) === cleanId(incident.id));
    let next: SharedIncident[];
    if (existingIndex >= 0) {
      next = [...all];
      next[existingIndex] = { ...next[existingIndex], ...incident };
    } else {
      next = [incident, ...all].slice(0, MAX_INCIDENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Local storage full or blocked
  }
}

export function updateSharedIncidentReview(
  incidentId: string,
  review: NonNullable<SharedIncident['complianceReview']>
): boolean {
  try {
    const all = readAll();
    const cId = cleanId(incidentId);
    const idx = all.findIndex((i) => cleanId(i.id) === cId);
    if (idx < 0) return false;
    all[idx] = {
      ...all[idx],
      complianceReview: review,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function useSharedIncidents(tripId?: string): SharedIncident[] {
  const [incidents, setIncidents] = useState<SharedIncident[]>(() => getSharedIncidents(tripId));
  useEffect(() => {
    const refresh = () => setIncidents(getSharedIncidents(tripId));
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) refresh();
    };
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, [tripId]);
  return incidents;
}
