import { test, expect } from './helpers/isolated-test';
import {
  seedCoordinatorTrips,
} from './helpers/storage';
import { INITIAL_TRIPS } from '../src/features/coordinator/pages/dashboard/views/coordinator.types';

test.describe('Coordinator Portal & Trip Planning', () => {
  const TRIP_ID = 'TRP-20261120-0003';

  test('Demo Controls card no longer appears on Dashboard or Trip Studio', async ({ page }) => {
    await seedCoordinatorTrips(page, INITIAL_TRIPS);

    // 1. Check Dashboard
    await page.goto('/coordinator/dashboard');
    await expect(page.locator('.cbn-coordinator-app .card.demo')).not.toBeVisible();
    await expect(page.getByText('Demo Controls')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Manager duyệt triển khai/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Manager phê duyệt tuyến/i })).not.toBeVisible();

    // 2. Check Trip Studio
    await page.goto('/coordinator/trips');
    await expect(page.locator('.cbn-coordinator-app .card.demo')).not.toBeVisible();
    await expect(page.getByText('Demo Controls')).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Manager duyệt triển khai/i })).not.toBeVisible();
  });

  test('Trip not yet confirmed for deployment displays PENDING deployment status', async ({ page }) => {
    const unconfirmedTrips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID ? { ...t, deploymentStatus: 'PENDING' as const } : t
    );
    await seedCoordinatorTrips(page, unconfirmedTrips);

    await page.goto('/coordinator/trips');

    // Verify deployment status pill shows PENDING
    const titlePill = page.locator('.render-trip-studio-page .head .page-title .pill');
    await expect(titlePill).toBeVisible();
    await expect(titlePill).toHaveText('PENDING');
    await expect(titlePill).toHaveClass(/PENDING/);
  });

  test('Deployment confirmed trip displays CONFIRMED pill', async ({ page }) => {
    const confirmedTrips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID ? { ...t, deploymentStatus: 'CONFIRMED' as const } : t
    );
    await seedCoordinatorTrips(page, confirmedTrips);

    await page.goto('/coordinator/trips');

    const titlePill = page.locator('.render-trip-studio-page .head .page-title .pill');
    await expect(titlePill).toBeVisible();
    await expect(titlePill).toHaveText('CONFIRMED');
    await expect(titlePill).toHaveClass(/READY/);
  });

  test('Coordinator UI interaction: confirm resources and submit route via local state', async ({ page }) => {
    // Start with DRAFT and unconfirmed resources
    const draftTrips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID ? { ...t, routeStatus: 'DRAFT' as const, resourcesConfirmed: false } : t
    );
    await seedCoordinatorTrips(page, draftTrips);

    await page.goto('/coordinator/trips');

    // Overview indicates resources incomplete
    const planningPill = page.locator('.render-trip-studio-page .head .pill').nth(1);
    await expect(planningPill).toHaveText('Chưa hoàn tất nguồn lực');

    // Switch to resources tab
    await page.getByRole('button', { name: /Vehicle & crew/i }).click();

    // Confirm resources button is active, submit route button is disabled
    const confirmBtn = page.getByRole('button', { name: 'Xác nhận nguồn lực (Operations READY)' });
    const submitBtn = page.getByRole('button', { name: 'Gửi Kế Hoạch Cho Logistics Manager Phê Duyệt' });

    await expect(confirmBtn).toBeEnabled();
    await expect(submitBtn).toBeDisabled();

    // Click confirm resources via Coordinator UI
    await confirmBtn.click();

    // Resources now confirmed
    await expect(page.getByRole('button', { name: '✓ Đã xác nhận nguồn lực (Operations READY)' })).toBeDisabled();
    await expect(submitBtn).toBeEnabled();

    // Submit route via Coordinator UI
    await submitBtn.click();

    // Switched to PENDING_APPROVAL and shows toast
    await expect(page.locator('text=Đã gửi phương án tuyến đường cho Logistics Manager phê duyệt')).toBeVisible();

    // Switch to Route tab to verify status
    await page.getByRole('button', { name: /Route/i }).click();
    await expect(page.getByRole('button', { name: /Đang chờ Manager phê duyệt/i })).toBeDisabled();
  });

  test('Trip with route APPROVED displays approved pill and disabled action', async ({ page }) => {
    const approvedTrips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID
        ? { ...t, routeStatus: 'APPROVED' as const, resourcesConfirmed: true }
        : t
    );
    await seedCoordinatorTrips(page, approvedTrips);

    await page.goto('/coordinator/trips');

    // Switch to Overview tab to check trip overview status
    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.locator('.kv-item:has-text("Phê duyệt tuyến:") strong')).toHaveText('APPROVED');

    // Check Route tab
    await page.getByRole('button', { name: /Route/i }).click();
    const routePill = page.locator('.render-trip-studio-page .section-title .pill');
    await expect(routePill).toHaveText(/APPROVED/);

    const routeBtn = page.getByRole('button', { name: /Tuyến đã được phê duyệt/i });
    await expect(routeBtn).toBeVisible();
    await expect(routeBtn).toBeDisabled();
  });

  test('Trip with route RETURNED allows coordinator to adjust and resubmit', async ({ page }) => {
    const returnedTrips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID
        ? { ...t, routeStatus: 'RETURNED' as const, resourcesConfirmed: true }
        : t
    );
    await seedCoordinatorTrips(page, returnedTrips);

    // 1. Dashboard reflects returned trips
    await page.goto('/coordinator/dashboard');
    await expect(page.locator('.stat.card:has-text("Tuyến bị trả về") b')).toHaveText('1');

    // 2. Open trip planning and navigate to Route tab
    await page.goto('/coordinator/trips');
    await page.getByRole('button', { name: /Route/i }).click();

    // Route submit button is enabled for resubmission
    const submitBtn = page.getByRole('button', { name: 'Nộp tuyến cho Manager phê duyệt' });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // Resubmit route via Coordinator UI
    await submitBtn.click();
    await expect(page.getByRole('button', { name: /Đang chờ Manager phê duyệt/i })).toBeDisabled();
  });

  test('Simulated coordinator state persists across page reload', async ({ page }) => {
    const trips = INITIAL_TRIPS.map((t) =>
      t.id === TRIP_ID ? { ...t, routeStatus: 'APPROVED' as const } : t
    );
    await seedCoordinatorTrips(page, trips);

    await page.goto('/coordinator/trips');

    // Switch to Overview tab
    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.locator('.kv-item:has-text("Phê duyệt tuyến:") strong')).toHaveText('APPROVED');

    // Reload page
    await page.reload();

    // Persisted after reload
    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.locator('.kv-item:has-text("Phê duyệt tuyến:") strong')).toHaveText('APPROVED');
  });
});
