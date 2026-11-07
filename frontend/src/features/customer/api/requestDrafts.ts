import type { TransportRequest } from '../types';
const storageKey = () => `flow1-drafts:${sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail') || 'session'}`;
export function readRequestDrafts(): TransportRequest[] {
  try {
    const drafts = JSON.parse(sessionStorage.getItem(storageKey()) || '[]');
    return Array.isArray(drafts) ? drafts.filter(d => (d.status === 'DRAFT' && d.id?.startsWith('LOCAL_')) || (d.status === 'CHANGES_REQUESTED' && d.editingLocally)) : [];
  } catch { return []; }
}
export function writeRequestDrafts(requests: TransportRequest[]) {
  try { sessionStorage.setItem(storageKey(), JSON.stringify(requests.filter(r => (r.status === 'DRAFT' && r.id.startsWith('LOCAL_')) || (r.status === 'CHANGES_REQUESTED' && r.editingLocally)))); } catch { /* In-memory editing still works if browser storage is unavailable. */ }
}
export const mergeRequestDrafts = (server: TransportRequest[], current: TransportRequest[]) =>
  [...current.filter(r => r.status === 'DRAFT' && r.id.startsWith('LOCAL_')), ...server.map(r => {
    const previous = current.find(p => p.id === r.id);
    if (previous?.editingLocally && r.status === 'CHANGES_REQUESTED') return previous;
    return previous?.status === r.status ? { ...r, versions: previous.versions, docs: previous.docs, payments: previous.payments } : r;
  })];
