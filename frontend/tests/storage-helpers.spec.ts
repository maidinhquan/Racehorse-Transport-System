import { test, expect } from './helpers/isolated-test';
import {
  seedCustomerRequest,
  updateCustomerRequestStatus,
  seedCoordinatorTrips,
  updateCoordinatorTrip,
} from './helpers/storage';
import { INITIAL_TRIPS } from '../src/features/coordinator/pages/dashboard/views/coordinator.types';

test.describe('Test Storage Helpers Error Handling', () => {
  test('updateCustomerRequestStatus throws when storage is empty', async ({ page }) => {
    await page.goto('/');
    // Clear storage to simulate missing key
    await page.evaluate(() => localStorage.clear());

    await expect(
      updateCustomerRequestStatus(page, 'TR-NON-EXISTENT', 'Scheduled')
    ).rejects.toThrow(/No localStorage data found/i);
  });

  test('updateCustomerRequestStatus throws when request ID does not exist', async ({ page }) => {
    await seedCustomerRequest(page, {
      id: 'TR-2026-0160',
      status: 'Waiting for Manager Review',
    });
    await page.goto('/customer/requests/TR-2026-0160');

    await expect(
      updateCustomerRequestStatus(page, 'TR-DOES-NOT-EXIST', 'Scheduled')
    ).rejects.toThrow(/Request with id "TR-DOES-NOT-EXIST" was not found/i);
  });

  test('updateCoordinatorTrip throws when storage is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    await expect(
      updateCoordinatorTrip(page, 'TRP-NON-EXISTENT', { routeStatus: 'APPROVED' })
    ).rejects.toThrow(/No localStorage data found/i);
  });

  test('updateCoordinatorTrip throws when trip ID does not exist', async ({ page }) => {
    await seedCoordinatorTrips(page, INITIAL_TRIPS);
    await page.goto('/coordinator/dashboard');

    await expect(
      updateCoordinatorTrip(page, 'TRP-DOES-NOT-EXIST', { routeStatus: 'APPROVED' })
    ).rejects.toThrow(/Trip with id "TRP-DOES-NOT-EXIST" was not found/i);
  });
});
