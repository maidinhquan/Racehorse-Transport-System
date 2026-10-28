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
  snapshot?: Record<string, unknown>; pdfUrl?: string | null;
}
export interface WirePayment {
  id: string; contractId: string; invoiceId: string; versionNo: number; amount: number; method: string;
  status: string; databaseStatus?: string; receivedAmount?: number | null; paidAt?: string | null;
  reviewRequired?: boolean; reviewReason?: string | null;
}
export const paymentFromWire = (p: WirePayment) => ({
  ...p, type: 'DEPOSIT' as const, confirmedAmount: p.receivedAmount ?? 0,
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
