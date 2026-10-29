/** Backend DTOs use these names. UI aliases stay inside the presentation layer. */
export interface WireFile { name?: string; url: string }
export interface WireHorse {
  id: string; name: string; breed?: string | null; sex?: string | null; dob?: string | null;
  microchip: string; value?: string | null; currency: string;
  healthNotes?: string | null; reproductiveStatus?: string | null; weight?: number | null;
  passport: { number?: string | null; authority?: string | null; issueDate?: string | null; expiryDate?: string | null; scan?: WireFile | null };
  photo?: WireFile | null; ownership?: WireFile | null; valueProof?: WireFile | null;
}
export interface WireContract {
  contractId: string; requestId: string; versionNo: number; requestStatus: string;
  contractStatus: string; versionStatus: string; currentDeadline?: string | null;
  issuedAt?: string | null; signedAt?: string | null; termsAcceptedAt?: string | null;
  items?: Array<{ desc: string; amount: number; required?: boolean }> | null;
  total?: number | null; depositPct?: number | null; depositAmount?: number | null;
  note?: string | null; terms?: Array<{ title: string; text: string }> | null;
  mode?: 'ROAD' | 'AIR' | null; departAt?: string | null; arriveAt?: string | null;
  modeDeferred?: boolean;
  snapshot?: Record<string, unknown>; pdfUrl?: string | null;
}
export interface WirePayment {
  id: string; contractId: string; invoiceId: string; versionNo: number; amount: number; method: string;
  status: string; databaseStatus?: string; receivedAmount?: number | null; paidAt?: string | null;
  reviewRequired?: boolean; reviewReason?: string | null; expiresAt?: string | null;
}
/** Customer's contract change request as returned on request details (`contractFeedback`). */
export interface WireContractFeedback {
  text?: string | null; status?: string | null; managerReply?: string | null; receivedAt?: string | null; handledAt?: string | null;
}
const anyUtcMs = (s?: string | null) => {
  if (!s) return 0;
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  return Date.parse(/(Z|[+-]\d\d:?\d\d)$/i.test(iso) ? iso : `${iso.length <= 16 ? `${iso}:00` : iso}Z`) || 0;
};
const minuteText = (s?: string | null) => (s ? s.replace('T', ' ').slice(0, 16) : '');
/**
 * The backend keeps one change request per contract without a version number. Attach it to the latest
 * version published before it was received; pending requests therefore land on the current version.
 */
export function attachContractFeedback<V extends { issuedAt?: string }>(versions: V[], feedback?: WireContractFeedback | null): V[] {
  if (!feedback?.text) return versions;
  const received = anyUtcMs(feedback.receivedAt);
  const published = versions.filter(v => v.issuedAt);
  const target = [...published].reverse().find(v => !received || anyUtcMs(v.issuedAt) <= received) ?? published[published.length - 1];
  if (!target) return versions;
  const handled = feedback.status && feedback.status !== 'PENDING' && feedback.managerReply;
  const change = {
    at: minuteText(feedback.receivedAt), text: feedback.text,
    ...(handled ? { response: { at: minuteText(feedback.handledAt), text: feedback.managerReply!, decision: feedback.status === 'ACCEPTED' ? 'RETURNED' as const : 'KEPT' as const } } : {}),
  };
  return versions.map(v => (v === target ? { ...v, change } : v));
}

/** Server timestamps are UTC "yyyy-MM-dd HH:mm". */
export const utcMs = (s?: string | null) => (s ? Date.parse(`${s.replace(' ', 'T')}:00Z`) || undefined : undefined);
export const paymentFromWire = (p: WirePayment) => ({
  ...p, qrExpiresAtMs: utcMs(p.expiresAt), type: 'DEPOSIT' as const, confirmedAmount: p.receivedAmount ?? 0,
  createdAt: '', confirmedAt: p.paidAt ?? undefined,
});

export const contractFromWire = (v: WireContract) => ({
  ...v, v: v.versionNo, number: v.contractId, validUntil: v.currentDeadline ?? '',
  state: v.versionStatus, issuedAt: v.issuedAt ?? '', signedAt: v.signedAt ?? undefined,
  termsAcceptedAt: v.termsAcceptedAt ?? undefined, items: v.items ?? [], terms: v.terms ?? [],
  total: v.total ?? 0, depositPct: v.depositPct ?? 0, depositAmount: v.depositAmount ?? undefined,
  note: v.note ?? '', mode: v.mode ?? undefined, departAt: v.departAt ?? '', arriveAt: v.arriveAt ?? '',
  deadlineHistory: [], extensions: [],
  snapshot: snapshotFromWire(v.snapshot),
});

function snapshotFromWire(raw?: Record<string, unknown>) {
  if (!raw) return undefined;
  const s = raw as Record<string, any>;
  if (!s.route || !s.pickup || !s.delivery) return undefined;
  return {
    ...s,
    origin: s.pickup.cityName ?? s.pickup.address ?? '', destination: s.delivery.cityName ?? s.delivery.address ?? '',
    pickupAt: s.route.departureAtUtc?.slice(0, 10) ?? '', date: s.route.deliveryAtUtc?.slice(0, 10) ?? '',
    // Dates the customer originally requested (the contract may propose different ones).
    requestedPickupAt: s.route.requestedTransportDate ?? undefined, requestedDate: s.route.requestedDeliveryDate ?? undefined,
    careNotes: s.careInstructions ?? '',
    pickup: { ...s.pickup, notes: s.pickup.instructions ?? '' }, delivery: { ...s.delivery, notes: s.delivery.instructions ?? '' },
    horses: (s.horses ?? []).map((h: any) => ({ ...h, microchip: h.microchip_ISO, passportNo: h.feI_Passport_No ?? h.fEI_Passport_No })),
    customer: { ...s.parties?.customer, company: '' },
  };
}

export const documentKey = (key: string) => ({
  'value-proof': 'valueProof', PHOTO: 'photo', PASSPORT: 'passport', OWNERSHIP: 'ownership',
  OWNERSHIP_CERTIFICATE: 'ownership', VALUATION: 'valueProof', VALUATION_EVIDENCE: 'valueProof',
  VACCINATION: 'flu', HEALTH_CERTIFICATE: 'health',
} as Record<string, string>)[key] ?? key;

export const fileFromWire = (file?: WireFile | null, fallback = 'Tài liệu') =>
  file ? { ...file, name: file.name || fallback } : undefined;
