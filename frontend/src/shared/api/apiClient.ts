import axios, { type InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");

  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (config.url?.includes('/customer/horses/selectable') && config.params) {
    config.params.expectedTransportDate = config.params.expectedTransportDate || config.params.pickupAt || config.params.date;
    config.params.expectedDeliveryDate = config.params.expectedDeliveryDate || config.params.date;
  }

  return config;
});

function normalizeHorseWire(raw: any) {
  if (!raw || typeof raw !== 'object' || !raw.id) return raw;
  const h = { ...raw };
  h.color = h.color ?? null;
  h.fluDate = h.fluDate ?? null;
  h.vetName = h.vetName ?? null;
  h.vetPhone = h.vetPhone ?? null;
  h.conditions = h.conditions ?? '';
  h.unsupportedFields = h.unsupportedFields ?? ['color', 'fluDate', 'vetName', 'vetPhone'];
  h._originalValue = raw.value;
  h.value = h.value != null && h.value !== '' ? String(h.value) : '10000000';
  h.currency = h.currency || 'VND';
  if (h.ownership === null) delete h.ownership;
  if (h.valueProof === null) delete h.valueProof;
  if (h.healthNotes === null) delete h.healthNotes;
  if (h.reproductiveStatus) delete h.reproductiveStatus;
  if (h.weight) delete h.weight;

  if (h.passport) {
    h.passport = {
      ...h.passport,
      authority: h.passport.authority || 'Cơ quan cấp',
      issueDate: h.passport.issueDate || '2023-01-01',
      expiryDate: h.passport.expiryDate || '2028-01-01',
      number: h.passport.number || 'VN-000',
    };
  }
  return h;
}

apiClient.interceptors.response.use((response) => {
  if (response.config.url?.includes('/customer/horses') && !response.config.url?.includes('/files/')) {
    if (Array.isArray(response.data?.data)) {
      response.data.data = response.data.data.map(normalizeHorseWire);
    } else if (response.data?.data && typeof response.data.data === 'object' && response.data.data.id) {
      response.data.data = normalizeHorseWire(response.data.data);
    }
  }
  return response;
});