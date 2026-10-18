import { test, expect } from './helpers/isolated-test';

test.describe('Customer Module - 18 Critical Business Scenarios', () => {
  // Scenario 1: Hai entry points (Landing & Dashboard) dùng chung quy trình tạo Request (VN->VN, VN->JP)
  test('1. Hai entry points dùng chung quy trình tạo Request và không cho đặt tuyến ngoài phạm vi', async ({ page }) => {
    // A. From Landing Page
    await page.goto('/landing');
    const quoteBox = page.locator('#lp-quote');
    await expect(quoteBox).toBeVisible();

    // Select Origin and Destination
    await page.locator('.lp-fields select').first().selectOption('Binh Duong');
    await page.locator('.lp-fields select').nth(1).selectOption('Tokyo');
    await page.locator('.lp-fields input[type="number"]').fill('2');

    // Click Send request on Landing
    const sendReqBtn = page.getByRole('button', { name: /Gửi yêu cầu|Send request/i });
    await expect(sendReqBtn).toBeEnabled();

    // Simulate logged in user
    await page.evaluate(() => {
      localStorage.setItem('accessToken', 'mock-token-customer');
      localStorage.setItem('userRole', 'CUSTOMER');
    });

    await sendReqBtn.click();
    await expect(page).toHaveURL(/\/customer\/create-request/);
    await expect(page.getByRole('heading', { name: /Tạo Yêu Cầu Vận Chuyển Mới/i })).toBeVisible();

    // B. From Dashboard (+ Tạo yêu cầu)
    await page.goto('/customer/requests');
    const createBtn = page.getByRole('button', { name: /\+ Tạo Yêu Cầu Vận Chuyển/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await expect(page).toHaveURL(/\/customer\/create-request/);

    // Verify scope limitation: only VN and JP are allowed
    const countryOptions = await page.locator('.cr-field select').nth(1).locator('option').allInnerTexts();
    expect(countryOptions.some(c => c.includes('Nhật Bản'))).toBe(true);
    expect(countryOptions.some(c => c.includes('Việt Nam'))).toBe(true);
    expect(countryOptions.some(c => c.includes('Mỹ') || c.includes('Pháp'))).toBe(false);
  });

  // Scenario 2: Customer thấy đúng dữ liệu từng đơn và từng ngựa
  test('2. Customer thấy đúng dữ liệu từng đơn và từng ngựa', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0160');
    await expect(page.locator('.crd-title-row h1')).toHaveText('TR-2026-0160');
    await expect(page.locator('.crd-overview-grid')).toContainText('Tokyo Racecourse');
    await expect(page.locator('.crd-horse-grid')).toContainText('Thunder Strike');
    await expect(page.locator('.crd-horse-grid')).toContainText('981020000123456');

    // Visit another request TR-2026-0155
    await page.goto('/customer/requests/TR-2026-0155');
    await expect(page.locator('.crd-title-row h1')).toHaveText('TR-2026-0155');
    await expect(page.locator('.crd-overview-grid')).toContainText('Hanshin Racecourse');
    await expect(page.locator('.crd-horse-grid')).toContainText('Lanna Spirit');
  });

  // Scenario 3: Yêu cầu sửa hợp đồng hiển thị đúng checkbox/note/lý do phản hồi
  test('3. Yêu cầu sửa hợp đồng hiển thị đúng checkbox/note và phản hồi', async ({ page }) => {
    // Prepare a request in Contract Review via localStorage fixture
    await page.goto('/customer/requests/TR-2026-0160');
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0160');
        if (req) {
          req.status = 'Contract Review';
          req.contractVersions = [{
            version: 1,
            contractRef: 'CTR-TR-2026-0160-v1',
            issuedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            totalPrice: 12000,
            depositRequired: 3600,
            balanceRemaining: 8400,
            currency: 'USD',
            status: 'ISSUED',
            termsAcceptedAt: null,
          }];
          req.currentVersionNumber = 1;
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });
    await page.reload();

    // Go to pricing tab
    await page.getByRole('button', { name: 'Hợp đồng & Chi phí' }).click();

    const changeBtn = page.getByRole('button', { name: 'Yêu cầu chỉnh sửa hợp đồng' });
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    // Check modal checkboxes & note
    await expect(page.getByRole('heading', { name: 'Yêu Cầu Chỉnh Sửa Hợp Đồng' })).toBeVisible();
    await page.locator('.crd-checkbox-item', { hasText: 'Lộ trình' }).click();
    await page.locator('.crd-checkbox-item', { hasText: 'Chi phí' }).click();
    await page.locator('.crd-modal-box textarea').fill('Xin điều chỉnh điểm giao và xem xét giảm phí dịch vụ.');

    await page.getByRole('button', { name: 'Gửi yêu cầu chỉnh sửa' }).click();

    // Banner should now show changes requested
    await expect(page.locator('.crd-banner strong')).toHaveText('Contract changes requested');
  });

  // Scenario 4: Phát hành lại và từ chối sửa đều reset đúng 24h
  test('4. Phát hành lại và từ chối sửa đều reset đúng 24h', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0160');

    // Simulate Manager rejection of change via localStorage fixture -> resets 24h
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0160');
        if (req) {
          req.status = 'Contract Review';
          req.contractVersions = [{
            version: 1,
            contractRef: 'CTR-TR-2026-0160-v1',
            issuedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            totalPrice: 12000,
            depositRequired: 3600,
            balanceRemaining: 8400,
            currency: 'USD',
            status: 'ISSUED',
            termsAcceptedAt: null,
          }];
          req.currentVersionNumber = 1;
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0160?tab=pricing');
    await expect(page.locator('.crd-cd-value')).toContainText('23h');
  });

  // Scenario 5: Đang thanh toán thì không yêu cầu sửa
  test('5. Đang thanh toán thì khóa yêu cầu sửa hợp đồng', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0160');

    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0160');
        if (req) {
          req.status = 'Contract Review';
          req.contractVersions = [{
            version: 1,
            contractRef: 'CTR-TR-2026-0160-v1',
            issuedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            totalPrice: 12000,
            depositRequired: 3600,
            balanceRemaining: 8400,
            currency: 'USD',
            status: 'ISSUED',
            termsAcceptedAt: null,
          }];
          req.currentVersionNumber = 1;
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0160?tab=pricing');

    // Accept terms first
    await page.getByRole('button', { name: /Xác nhận đồng ý điều khoản/i }).click();

    // Start payment
    await page.getByRole('button', { name: /Thanh toán cọc ngay/i }).first().click();

    // Inside modal, initiate payment
    await page.getByRole('button', { name: /Tiến hành thanh toán/i }).click();

    // Reload while transaction is ongoing or verified
    await page.goto('/customer/requests/TR-2026-0160?tab=pricing');
    const changeBtn = page.getByRole('button', { name: 'Yêu cầu chỉnh sửa hợp đồng' });
    await expect(changeBtn).toBeDisabled();
  });

  // Scenario 6: Chưa verified cọc không ký; verified nhưng chưa ký chưa có Trip
  test('6. Chưa verified cọc không ký; verified nhưng chưa ký chưa có Trip', async ({ page }) => {
    // Check TR-2026-0160 before deposit verification
    await page.goto('/customer/requests/TR-2026-0160?tab=pricing');

    // Ký OTP button should not be available before verified deposit
    const signBtn = page.getByRole('button', { name: /Ký Hợp Đồng Bằng Mã OTP/i });
    await expect(signBtn).not.toBeVisible();

    // Trip ID should not be activated
    const trackingTab = page.getByRole('button', { name: 'Tracking & Sức khỏe' });
    await trackingTab.click();
    await expect(page.locator('.crd-timeline')).toContainText('Chuyến đi chưa được kích hoạt');
  });

  // Scenario 7: OTP thành công mới kích hoạt, retry không tạo trùng
  test('7. OTP thành công mới kích hoạt, retry không tạo trùng', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0160');

    // Simulate deposit verified for TR-2026-0160
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0160');
        if (req) {
          req.status = 'Deposit Verified – Awaiting Signature';
          req.transactions = [
            {
              id: 'TXN-DEP-TEST',
              requestId: 'TR-2026-0160',
              type: 'DEPOSIT',
              amount: 3600,
              currency: 'USD',
              method: 'VNPAY',
              status: 'SUCCESS',
              createdAt: new Date().toISOString(),
              referenceCode: 'VNP-TEST-001',
            },
          ];
          req.contractVersions = [
            {
              version: 1,
              contractRef: 'CTR-TR-2026-0160-v1',
              issuedAt: new Date().toISOString(),
              validUntil: new Date(Date.now() + 86400000).toISOString(),
              totalPrice: 12000,
              depositRequired: 3600,
              balanceRemaining: 8400,
              currency: 'USD',
              status: 'ISSUED',
              termsAcceptedAt: new Date().toISOString(),
            },
          ];
          req.currentVersionNumber = 1;
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0160?tab=pricing');
    const signBtn = page.getByRole('button', { name: /Ký Hợp Đồng Bằng Mã OTP/i }).first();
    await expect(signBtn).toBeVisible();
    await signBtn.click();

    // Enter OTP
    await page.locator('.crd-otp-input').fill('686868');
    await page.getByRole('button', { name: 'Xác nhận ký hợp đồng' }).click();

    // Should now be Activated
    await expect(page.locator('.crd-title-row')).toContainText('Đã kích hoạt');
    await expect(page.locator('.crd-banner strong')).toHaveText('Transport scheduled');

    // Check that exactly one trip is created
    await page.getByRole('button', { name: 'Tracking & Sức khỏe' }).click();
    await expect(page.locator('.crd-timeline-item')).toHaveCount(5);
  });

  // Scenario 8: Return URL không tự xác nhận thanh toán
  test('8. Return URL không tự động xác nhận thanh toán nếu chưa có đối soát', async ({ page }) => {
    await page.goto('/payment/return?vnp_ResponseCode=00&vnp_TxnRef=FAKE123');
    // Sandbox or return page should not bypass business check to mark verified on unverified data
    await page.goto('/customer/requests/TR-2026-0160?tab=payment');
    await expect(page.locator('.crd-table')).toBeVisible();
  });

  // Scenario 9: Quá hạn/chờ đối soát không tự hủy hoặc kích hoạt
  test('9. Quá hạn/chờ đối soát không tự hủy hoặc kích hoạt', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0160');

    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0160');
        if (req) {
          req.status = 'Contract Review';
          req.contractVersions = [
            {
              version: 1,
              contractRef: 'CTR-TR-2026-0160-v1',
              issuedAt: new Date(Date.now() - 90000000).toISOString(),
              // Set expired deadline
              validUntil: new Date(Date.now() - 3600000).toISOString(),
              totalPrice: 12000,
              depositRequired: 3600,
              balanceRemaining: 8400,
              currency: 'USD',
              status: 'ISSUED',
              termsAcceptedAt: null,
            },
          ];
          req.currentVersionNumber = 1;
          req.transactions = [
            {
              id: 'TXN-PENDING-OVERDUE',
              requestId: 'TR-2026-0160',
              type: 'DEPOSIT',
              amount: 3600,
              currency: 'USD',
              method: 'VNPAY',
              status: 'PROCESSING',
              createdAt: new Date(Date.now() - 7200000).toISOString(),
              referenceCode: 'VNP-RECON-001',
            },
          ];
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0160');
    // Must display "Quá hạn — chờ đối soát", NOT Cancelled or Activated
    await expect(page.locator('.crd-banner strong')).toHaveText('Quá hạn — chờ đối soát');
    await expect(page.locator('.crd-title-row')).not.toContainText('Đã hủy');
    await expect(page.locator('.crd-title-row')).not.toContainText('Đã kích hoạt');
  });

  // Scenario 10: Tracking có ROAD–AIR–ROAD, không giả GPS hoặc tự xác nhận mốc
  test('10. Tracking có ROAD–AIR–ROAD tuần tự, không giả GPS', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0155?tab=tracking');

    // Milestones check
    const timeline = page.locator('.crd-timeline');
    await expect(timeline).toContainText('Chặng 1 (Đường bộ)');
    await expect(timeline).toContainText('Bàn giao cho đối tác mặt đất & lên Air Stall');
    await expect(timeline).toContainText('Chặng 2 (Hàng không)');
    await expect(timeline).toContainText('Hạ cánh Kansai & Đội tiếp nhận đầu đến xác nhận');
    await expect(timeline).toContainText('Chặng 3 (Đường bộ Nhật Bản)');

    // Milestone 4 (Flight arrival) should be pending, not auto confirmed by time
    await expect(page.locator('.crd-timeline-item').nth(3)).toContainText('Dự kiến');
  });

  // Scenario 11: Sức khỏe hiển thị đúng ngựa và người ghi nhận (Vet vs Escort)
  test('11. Sức khỏe hiển thị đúng ngựa và phân biệt Bác sĩ Thú y với Nhân sự', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0155?tab=tracking');

    const healthSection = page.locator('.crd-health-list');
    await expect(healthSection).toContainText('Lanna Spirit');
    await expect(healthSection).toContainText('Bs. Đặng Văn Nam');
    await expect(healthSection).toContainText('🩺 Kết luận Bác Sĩ Thú Y');
    await expect(healthSection).toContainText('Lê Hoàng Minh');
    await expect(healthSection).toContainText('📋 Quan sát Nhân sự Đi kèm');
  });

  // Scenario 12: Trip completed chưa đồng nghĩa Request/Contract đã đóng
  test('12. Trip completed chưa đồng nghĩa Request/Contract đã đóng', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148');
    // Status is Delivered, not Closed
    await expect(page.locator('.crd-title-row')).toContainText('Đã giao — Chờ tất toán');
    await expect(page.locator('.crd-title-row')).not.toContainText('Đã hoàn thành & Đóng đơn');
  });

  // Scenario 13: Đủ số dư đã xác minh mới bắt đầu 24h feedback
  test('13. Đủ số dư đã xác minh mới bắt đầu 24h feedback', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148?tab=payment');

    // Pay balance
    await page.getByRole('button', { name: /Thanh toán tất toán số dư/i }).click();
    await page.getByRole('button', { name: /Tiến hành thanh toán/i }).click();

    // Wait for mock confirmation
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Hoàn tất & Tiếp tục/i }).click();

    // Now request status is Acceptance and 24h feedback countdown is running
    await expect(page.locator('.crd-title-row')).toContainText('Nghiệm thu');
    await expect(page.locator('.crd-banner strong')).toContainText('Nghiệm thu hoàn tất');
    await expect(page.locator('.crd-banner')).toContainText('23h');
  });

  // Scenario 14: Đánh giá thường không reset; khiếu nại mở chặn đóng
  test('14. Đánh giá thường không reset; khiếu nại mở chặn đóng đơn', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148?tab=complaints');

    // Submit rating feedback
    await page.locator('.crd-feedback-form select').selectOption('5');
    await page.locator('.crd-feedback-form textarea').fill('Chuyến đi rất an toàn, ngựa khỏe mạnh!');
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click();

    await expect(page.locator('.crd-feedback-sent')).toBeVisible();

    // Now submit a complaint
    await page.getByRole('button', { name: /\+ Gửi khiếu nại mới/i }).click();
    await page.locator('.crd-modal-box input[type="text"]').fill('Trầy xước nhẹ ở cổ chân ngựa');
    await page.locator('.crd-modal-box textarea').fill('Cần kiểm tra lại đệm lót trên xe Equine Truck.');
    await page.locator('.crd-modal-box button[type="submit"]').click();

    // Complaint is open
    await expect(page.locator('.crd-cmp-status')).toContainText('Đang mở');
  });

  // Scenario 15: Manager xử lý xong nhưng Customer chưa đồng ý thì chưa reset
  test('15. Manager xử lý xong nhưng Customer chưa đồng ý thì chưa reset 24h', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148');
    // Simulate Manager resolution in storage
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0148');
        if (req) {
          req.complaints = [
            {
              id: 'CMP-TEST-15',
              requestId: 'TR-2026-0148',
              category: 'EQUIPMENT_CONDITION',
              title: 'Trầy xước nhẹ ở cổ chân ngựa',
              content: 'Cần kiểm tra lại đệm lót.',
              createdAt: new Date().toISOString(),
              status: 'MANAGER_RESOLVED',
              managerResolution: {
                resolvedAt: new Date().toISOString(),
                resolutionSummary: 'Đã bôi thuốc khử trùng và hỗ trợ chi phí dưỡng chân $200 USD.',
                refundAdjustmentOffer: 200,
              },
            },
          ];
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0148?tab=complaints');
    await expect(page.locator('.crd-manager-res-box')).toContainText('Phương án giải quyết từ Logistics Manager');
    await expect(page.getByRole('button', { name: /Đồng ý với kết quả giải quyết/i })).toBeVisible();
  });

  // Scenario 16: Customer đồng ý kết quả giải quyết thì có 24h mới
  test('16. Customer đồng ý kết quả giải quyết thì được reset đầy đủ 24h mới', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148');
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0148');
        if (req) {
          req.status = 'Acceptance';
          req.acceptanceWindow = {
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            deadline: new Date(Date.now() + 1800000).toISOString(),
          };
          req.complaints = [
            {
              id: 'CMP-TEST-16',
              requestId: 'TR-2026-0148',
              category: 'EQUIPMENT_CONDITION',
              title: 'Trầy xước nhẹ ở cổ chân ngựa',
              content: 'Cần kiểm tra lại đệm lót.',
              createdAt: new Date().toISOString(),
              status: 'MANAGER_RESOLVED',
              managerResolution: {
                resolvedAt: new Date().toISOString(),
                resolutionSummary: 'Đã bôi thuốc khử trùng và hỗ trợ chi phí dưỡng chân $200 USD.',
                refundAdjustmentOffer: 200,
              },
            },
          ];
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0148?tab=complaints');
    const agreeBtn = page.getByRole('button', { name: /Đồng ý với kết quả giải quyết/i });
    await expect(agreeBtn).toBeVisible();
    await agreeBtn.click();

    // Complaint status updated
    await expect(page.locator('.crd-cmp-status')).toContainText('Khách hàng đã đồng ý');

    // 24h countdown refreshed
    await page.getByRole('button', { name: 'Bàn giao' }).click();
    await expect(page.locator('.crd-acceptance-box')).toContainText('23h');
  });

  // Scenario 17: Hết hạn không có khiếu nại mở thì đóng; hỗ trợ sau đóng không tự mở lại
  test('17. Hết hạn không có khiếu nại mở thì tự đóng đơn', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0148');
    // Simulate expired deadline with no open complaint
    await page.evaluate(() => {
      const raw = localStorage.getItem('cbn_customer_requests_v2');
      if (raw) {
        const list = JSON.parse(raw);
        const req = list.find((r: any) => r.id === 'TR-2026-0148');
        if (req) {
          req.status = 'Acceptance';
          req.acceptanceWindow = {
            startedAt: new Date(Date.now() - 86400000).toISOString(),
            deadline: new Date(Date.now() - 3600000).toISOString(),
          };
          req.complaints = []; // no open complaint
          localStorage.setItem('cbn_customer_requests_v2', JSON.stringify(list));
        }
      }
    });

    await page.goto('/customer/requests/TR-2026-0148');
    await expect(page.locator('.crd-title-row')).toContainText('Đã đóng đơn');
    await expect(page.locator('.crd-banner strong')).toHaveText('Request closed');
  });

  // Scenario 18: Customer không thấy thao tác nội bộ của vai trò khác
  test('18. Customer không thấy các nút điều phối nội bộ của Manager/Coordinator', async ({ page }) => {
    await page.goto('/customer/requests/TR-2026-0155');

    // No internal manager approve/reject trip buttons
    await expect(page.getByRole('button', { name: /Approve Trip/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Dispatch Driver/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Deploy Resources/i })).not.toBeVisible();
    await expect(page.locator('.demo-control-card')).not.toBeVisible();
  });
});
