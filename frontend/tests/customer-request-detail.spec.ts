import { test, expect } from './helpers/isolated-test';
import {
  seedCustomerRequest,
  updateCustomerRequestStatus,
} from './helpers/storage';

test.describe('Customer Transport Request Detail Page', () => {
  const REQUEST_ID = 'TR-2026-0160';

  test('Demo Controls box no longer exists on detail page', async ({ page }) => {
    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Waiting for Manager Review',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);

    // Verify Demo Controls heading and container are gone
    await expect(page.getByRole('heading', { name: 'Demo Controls' })).not.toBeVisible();
    await expect(page.locator('.demo-control-card')).not.toBeVisible();
    await expect(page.locator('.demo-control-buttons')).not.toBeVisible();

    // Verify legitimate action card is present
    await expect(page.getByRole('heading', { name: 'Current Action' })).toBeVisible();
  });

  test('Pending request displays "Waiting for Manager Review" correctly', async ({ page }) => {
    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Waiting for Manager Review',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);

    // Verify title and status badge
    await expect(page.locator('.request-detail-title h1')).toHaveText(REQUEST_ID);
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Waiting for Manager Review');

    // Verify status banner
    await expect(page.locator('.request-banner strong')).toHaveText('Waiting for manager review');
    await expect(page.locator('.request-banner p')).toContainText('CBN Transport is reviewing your initial request');

    // No customer action needed yet
    await expect(page.locator('.request-action-empty')).toHaveText('No action is needed from you right now.');
  });

  test('Simulate Manager accepts request: UI displays Accepted status', async ({ page }) => {
    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Waiting for Manager Review',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);
    await expect(page.locator('.request-banner strong')).toHaveText('Waiting for manager review');

    // Simulate manager acceptance via localStorage mock data update
    await updateCustomerRequestStatus(page, REQUEST_ID, 'Accepted – Contract Preparation');
    await page.reload();

    // Verify updated status and banner
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Accepted – Contract Preparation');
    await expect(page.locator('.request-banner strong')).toHaveText('Request accepted');
    await expect(page.locator('.request-banner p')).toContainText('CBN Transport is preparing your service contract');
  });

  test('Simulate Changes Requested and Rejected states', async ({ page }) => {
    // 1. Changes Requested
    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Changes Requested',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Changes Requested');
    await expect(page.locator('.request-banner strong')).toHaveText('Changes requested');

    // 2. Simulate Manager Rejection via localStorage mock data update
    await updateCustomerRequestStatus(page, REQUEST_ID, 'Rejected');
    await page.reload();

    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Rejected');
    await expect(page.locator('.request-banner strong')).toHaveText('Request rejected');
  });

  test('[LEGACY] Simulate Contract Ready: shows View Contract and allows signing via legacy checkbox UI', async ({ page }) => {
    test.skip(
      true,
      'Tạm skip do mâu thuẫn Flow 1 mới: Flow 1 quy định ký hợp đồng bằng mã OTP (POST /customer/contracts/{contractId}/sign-otp) thay vì tick checkbox trên UI React cũ.'
    );

    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Contract Ready',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);

    // Verify status banner and action button
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Contract Ready');
    await expect(page.locator('.request-banner strong')).toHaveText('Your service contract is ready');

    const actionButton = page.locator('.request-action-button');
    await expect(actionButton).toBeVisible();
    await expect(actionButton).toHaveText('View Contract');

    // UI navigation: open contract page
    await actionButton.click();
    await expect(page).toHaveURL(new RegExp(`/customer/requests/${REQUEST_ID}/contract`));

    // Sign contract via legacy checkbox interface
    const agreeCheckbox = page.locator('.contract-agreement input[type="checkbox"]');
    await expect(agreeCheckbox).toBeVisible();
    await agreeCheckbox.check();

    const signButton = page.getByRole('button', { name: 'Sign Contract' });
    await expect(signButton).toBeEnabled();
    await signButton.click();

    // After legacy signing, next action "Continue to Payment" becomes visible
    await expect(page.getByRole('button', { name: 'Continue to Payment' })).toBeVisible();

    // Return to detail page: status is now Awaiting Deposit
    await page.goto(`/customer/requests/${REQUEST_ID}`);
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Awaiting Deposit');
    await expect(page.locator('.request-banner strong')).toHaveText('Contract signed');
    await expect(page.locator('.request-action-button')).toHaveText('Pay Deposit');
  });

  test('[LEGACY] Deposit payment via payOS mock advances request to Information Required', async ({ page }) => {
    test.skip(
      true,
      'Tạm skip do mâu thuẫn Flow 1 mới: Flow 1 thanh toán cọc qua VNPay/Bank Transfer và sau cọc chuyển sang ACTIVATED thay vì payOS và Information Required (thông tin vận chuyển đã nộp ở Wizard trước Submit).'
    );

    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Awaiting Deposit',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);
    await expect(page.locator('.request-action-button')).toHaveText('Pay Deposit');

    // UI navigation: open payment page
    await page.locator('.request-action-button').click();
    await expect(page).toHaveURL(new RegExp(`/customer/requests/${REQUEST_ID}/payment`));

    // Trigger demo payOS sandbox flow
    const payButton = page.getByRole('button', { name: /Pay with payOS/i });
    await expect(payButton).toBeVisible();
    await payButton.click();

    // Reached payment success page
    await expect(page).toHaveURL(new RegExp(`/customer/payment/success`));
    await expect(page.getByRole('heading', { name: /Payment Successful/i })).toBeVisible();

    // Click Continue Now to return to detail
    const continueBtn = page.getByRole('button', { name: 'Continue Now' });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // Detail page in legacy code is Information Required
    await expect(page).toHaveURL(new RegExp(`/customer/requests/${REQUEST_ID}`));
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Information Required');
    await expect(page.locator('.request-banner strong')).toHaveText('Transport information required');
    await expect(page.locator('.request-action-button')).toHaveText('Complete Transport Information');
  });

  test('Simulated status persists across page reload', async ({ page }) => {
    await seedCustomerRequest(page, {
      id: REQUEST_ID,
      status: 'Waiting for Manager Review',
    });

    await page.goto(`/customer/requests/${REQUEST_ID}`);
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Waiting for Manager Review');

    // Simulate update to Scheduled via localStorage mock data update
    await updateCustomerRequestStatus(page, REQUEST_ID, 'Scheduled');
    await page.reload();

    // Should stay Scheduled
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Scheduled');
    await expect(page.locator('.request-banner strong')).toHaveText('Transport scheduled');

    // Reload again to confirm reload guard does not overwrite
    await page.reload();
    await expect(page.locator('.request-detail-title .detail-status')).toHaveText('Scheduled');
  });
});
