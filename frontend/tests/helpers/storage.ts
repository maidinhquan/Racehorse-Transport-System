import type { Page } from '@playwright/test';
import type { FakeTransportRequest, FakeRequestStatus } from '../../src/features/user-dashboard/data/transportRequestStorage';
import type { MockTrip } from '../../src/features/coordinator/pages/dashboard/views/coordinator.types';

export const CUSTOMER_STORAGE_KEY = 'cbn_transport_requests';
export const COORDINATOR_STORAGE_KEY = 'cbn_coordinator_trips';

/**
 * Prepares customer transport request data in localStorage.
 * Uses a guard so that page reloads or subsequent state updates are not overwritten.
 */
export async function seedCustomerRequest(
  page: Page,
  request: Partial<FakeTransportRequest> & { id: string; status: FakeRequestStatus }
) {
  const fullRequest: FakeTransportRequest = {
    id: request.id,
    origin: request.origin ?? 'Ho Chi Minh City',
    destination: request.destination ?? 'Phnom Penh',
    requestedDate: request.requestedDate ?? '2026-10-05',
    preferredDate: request.preferredDate ?? '2026-10-22',
    horseCount: request.horseCount ?? 2,
    estimatedPrice: request.estimatedPrice ?? 3100,
    status: request.status,
  };

  await page.addInitScript(
    ({ key, data }) => {
      const existing = localStorage.getItem(key);
      if (!existing) {
        localStorage.setItem(key, JSON.stringify([data]));
      } else {
        try {
          const list = JSON.parse(existing);
          if (Array.isArray(list)) {
            const index = list.findIndex((item: any) => item.id === data.id);
            if (index < 0) {
              list.unshift(data);
              localStorage.setItem(key, JSON.stringify(list));
            }
          }
        } catch {
          localStorage.setItem(key, JSON.stringify([data]));
        }
      }
    },
    { key: CUSTOMER_STORAGE_KEY, data: fullRequest }
  );
}

/**
 * Simulates role updates (e.g. Manager or Staff) by changing the status in localStorage.
 */
export async function updateCustomerRequestStatus(
  page: Page,
  requestId: string,
  newStatus: FakeRequestStatus
) {
  await page.evaluate(
    ({ key, id, status }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw);
      const updated = list.map((item: any) =>
        item.id === id ? { ...item, status } : item
      );
      localStorage.setItem(key, JSON.stringify(updated));
    },
    { key: CUSTOMER_STORAGE_KEY, id: requestId, status: newStatus }
  );
}

/**
 * Prepares coordinator trips in localStorage with a reload guard.
 */
export async function seedCoordinatorTrips(page: Page, customTrips: MockTrip[]) {
  await page.addInitScript(
    ({ key, data }) => {
      const existing = localStorage.getItem(key);
      if (!existing) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    },
    { key: COORDINATOR_STORAGE_KEY, data: customTrips }
  );
}

/**
 * Simulates role updates (e.g. Manager approval) on coordinator trips in localStorage.
 */
export async function updateCoordinatorTrip(
  page: Page,
  tripId: string,
  patch: Partial<MockTrip>
) {
  await page.evaluate(
    ({ key, id, fields }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw);
      const updated = list.map((item: any) =>
        item.id === id ? { ...item, ...fields } : item
      );
      localStorage.setItem(key, JSON.stringify(updated));
    },
    { key: COORDINATOR_STORAGE_KEY, id: tripId, fields: patch }
  );
}
