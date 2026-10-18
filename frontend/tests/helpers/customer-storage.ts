import type { Page } from '@playwright/test';
import type { CustomerTransportRequest } from '../../src/features/customer/types/customerTypes';

export const CUSTOMER_V2_STORAGE_KEY = 'cbn_customer_requests_v2';

/**
 * Seed requests into localStorage for Customer V2
 */
export async function seedCustomerV2Requests(page: Page, requests: CustomerTransportRequest[]) {
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: CUSTOMER_V2_STORAGE_KEY, data: requests }
  );
}

/**
 * Update request in localStorage for Customer V2
 */
export async function updateCustomerV2Request(
  page: Page,
  requestId: string,
  patch: Partial<CustomerTransportRequest>
) {
  await page.evaluate(
    ({ key, id, patchData }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list: CustomerTransportRequest[] = JSON.parse(raw);
      const req = list.find((r) => r.id === id);
      if (req) {
        Object.assign(req, patchData);
        localStorage.setItem(key, JSON.stringify(list));
      }
    },
    { key: CUSTOMER_V2_STORAGE_KEY, id: requestId, patchData: patch }
  );
}
