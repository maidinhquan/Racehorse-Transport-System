import { test as base, expect } from '@playwright/test';

export interface IsolatedTestOptions {
  /**
   * List of API endpoints that were intercepted unexpectedly during the test.
   */
  unexpectedApiRequests: string[];
}

/**
 * Extended Playwright test fixture that isolates all frontend HTTP API requests.
 * It mocks expected endpoints (such as Coordinator Dashboard API) and detects/blocks
 * any unexpected network API calls.
 */
export const test = base.extend<{
  apiIsolation: void;
}>({
  apiIsolation: [
    async ({ page }, use) => {
      const unexpectedApiRequests: string[] = [];

      // Intercept all network traffic from the page
      await page.route('**/*', async (route) => {
        const req = route.request();
        const urlStr = req.url();
        const method = req.method();

        let pathname = '';
        try {
          pathname = new URL(urlStr).pathname;
        } catch {
          pathname = urlStr;
        }

        const resourceType = req.resourceType();

        // Identify HTTP API requests (XHR/fetch or requests hitting /api/ or backend endpoints)
        const isApiRequest =
          pathname.startsWith('/api/') ||
          ((resourceType === 'fetch' || resourceType === 'xhr') &&
            (pathname.startsWith('/coordinator/') ||
              pathname.startsWith('/admin/') ||
              pathname.startsWith('/auth/') ||
              pathname.startsWith('/customer/api/')));

        if (!isApiRequest) {
          // Allow static web assets (documents, js scripts, css, images, fonts)
          return route.continue();
        }

        // Mock known API calls used by frontend screens to keep them 100% offline & isolated
        if (
          pathname === '/coordinator/dashboard' ||
          pathname === '/api/coordinator/dashboard'
        ) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Mock Coordinator Dashboard (offline isolated mode)',
              data: {
                needRoute: 0,
                needAssignment: 0,
                availableVehicles: 0,
                totalVehicles: 0,
                activeTrips: 0,
                incidentsCount: 0,
                fleet: { ready: 0, maintenance: 0, inactive: 0, total: 0 },
                recentTrips: [],
              },
            }),
          });
        }

        if (pathname === '/api/payments/vnpay/return') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'PAY-RETURN-ISOLATED',
              amount: 10000,
              status: 'Pending',
              responseCode: '00',
            }),
          });
        }

        if (pathname === '/api/flow1/notifications') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }

        // Any other API call is unexpected in standalone frontend tests
        unexpectedApiRequests.push(`${method} ${pathname}`);
        return route.abort('blockedbyclient');
      });

      await use();

      // Assert that no unexpected API requests escaped during test execution
      expect(
        unexpectedApiRequests,
        `Unexpected HTTP API requests were made during the test: [${unexpectedApiRequests.join(', ')}]`
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
