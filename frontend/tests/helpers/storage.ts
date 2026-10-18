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
  if (!request || !request.id || !request.status) {
    throw new Error(
      `[seedCustomerRequest] Invalid seed data: must provide both id and status. Received: ${JSON.stringify(request)}`
    );
  }

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
            const index = list.findIndex((item: any) => item && item.id === data.id);
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
 * Throws an explicit error if the storage key is missing or the request ID is not found.
 */
export async function updateCustomerRequestStatus(
  page: Page,
  requestId: string,
  newStatus: FakeRequestStatus
) {
  if (!requestId || !newStatus) {
    throw new Error(
      `[updateCustomerRequestStatus] Invalid parameters: requestId="${requestId}", newStatus="${newStatus}"`
    );
  }

  await page.evaluate(
    ({ key, id, status }) => {
      const raw = localStorage.getItem(key);
      if (!raw) {
        throw new Error(
          `[updateCustomerRequestStatus] No localStorage data found for key "${key}". Cannot update status for request "${id}".`
        );
      }

      let list: any[];
      try {
        list = JSON.parse(raw);
      } catch (err) {
        throw new Error(
          `[updateCustomerRequestStatus] Failed to parse JSON from localStorage key "${key}": ${err}`
        );
      }

      if (!Array.isArray(list)) {
        throw new Error(
          `[updateCustomerRequestStatus] Expected array in localStorage key "${key}", found: ${typeof list}`
        );
      }

      const item = list.find((req: any) => req && req.id === id);
      if (!item) {
        throw new Error(
          `[updateCustomerRequestStatus] Request with id "${id}" was not found in localStorage key "${key}". Available IDs: [${list.map((r: any) => r?.id).join(', ')}]`
        );
      }

      item.status = status;
      localStorage.setItem(key, JSON.stringify(list));
    },
    { key: CUSTOMER_STORAGE_KEY, id: requestId, status: newStatus }
  );
}

/**
 * Prepares coordinator trips in localStorage with a reload guard.
 */
export async function seedCoordinatorTrips(page: Page, customTrips: MockTrip[]) {
  if (!Array.isArray(customTrips) || customTrips.length === 0) {
    throw new Error(
      `[seedCoordinatorTrips] Invalid trips fixture: must provide non-empty array of trips.`
    );
  }

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
 * Throws an explicit error if the storage key is missing or the trip ID is not found.
 */
export async function updateCoordinatorTrip(
  page: Page,
  tripId: string,
  patch: Partial<MockTrip>
) {
  if (!tripId || !patch || Object.keys(patch).length === 0) {
    throw new Error(
      `[updateCoordinatorTrip] Invalid parameters: tripId="${tripId}", patch=${JSON.stringify(patch)}`
    );
  }

  await page.evaluate(
    ({ key, id, fields }) => {
      const raw = localStorage.getItem(key);
      if (!raw) {
        throw new Error(
          `[updateCoordinatorTrip] No localStorage data found for key "${key}". Cannot update trip "${id}".`
        );
      }

      let list: any[];
      try {
        list = JSON.parse(raw);
      } catch (err) {
        throw new Error(
          `[updateCoordinatorTrip] Failed to parse JSON from localStorage key "${key}": ${err}`
        );
      }

      if (!Array.isArray(list)) {
        throw new Error(
          `[updateCoordinatorTrip] Expected array in localStorage key "${key}", found: ${typeof list}`
        );
      }

      const item = list.find((trip: any) => trip && trip.id === id);
      if (!item) {
        throw new Error(
          `[updateCoordinatorTrip] Trip with id "${id}" was not found in localStorage key "${key}". Available IDs: [${list.map((t: any) => t?.id).join(', ')}]`
        );
      }

      Object.assign(item, fields);
      localStorage.setItem(key, JSON.stringify(list));
    },
    { key: COORDINATOR_STORAGE_KEY, id: tripId, fields: patch }
  );
}
