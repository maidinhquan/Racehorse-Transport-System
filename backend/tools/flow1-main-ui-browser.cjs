// Original feature/quan screens only. Missing OTP/handoff UI is deliberately NOT simulated as UI acceptance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
module.exports = async function ({ browser, actor, base, output, air, pace }) {
  const step = name => { fs.appendFileSync(path.join(output, 'main-steps.log'), name + '\n'); console.log('Checked main ' + name); };
  const baseline = process.env.FLOW1_BROWSER_BASELINE === '1';
  const owner = await actor('CUSTOMER');
  await owner.goto(base + '/customer/home');
  await owner.locator('.welcome-card').waitFor();
  // Main has no create-horse form: seed exactly one owned profile through its genuine API.
  const horse = await owner.evaluate(async () => {
    const form = new FormData();
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='), c => c.charCodeAt(0));
    form.append('payload', JSON.stringify({ name: 'Main UI SQL Horse', microchipIso: '900000000000001', feiPassportNo: 'MAIN_UI', breed: 'Thoroughbred', sex: 'STALLION', weight: 450, dob: '2020-01-01' }));
    for (const kind of ['photo', 'passportScan']) form.append(kind, new Blob([png], { type: 'image/png' }), kind + '.png');
    const r = await fetch('/api/customer/horses', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken'), 'Idempotency-Key': 'main-ui-browser-horse' }, body: form });
    if (!r.ok) throw new Error('Profile fixture API failed ' + r.status); return (await r.json()).data;
  });
  const secondHorse = baseline ? await owner.evaluate(async () => {
    const form = new FormData();
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='), c => c.charCodeAt(0));
    form.append('payload', JSON.stringify({ name: 'Baseline Horse B', microchipIso: '900000000000002', feiPassportNo: 'BASELINE_B', breed: 'Thoroughbred', sex: 'STALLION', weight: 450, dob: '2020-01-01' }));
    for (const kind of ['photo', 'passportScan']) form.append(kind, new Blob([png], { type: 'image/png' }), kind + '.png');
    const r = await fetch('/api/customer/horses', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken'), 'Idempotency-Key': 'baseline-browser-horse-b' }, body: form });
    if (!r.ok) throw new Error('Second owned profile failed ' + r.status); return (await r.json()).data;
  }) : null;
  await owner.goto(base + '/customer/horses'); await owner.getByText('Main UI SQL Horse', { exact: true }).waitFor();
  assert.equal(await owner.locator('.horse-grid .horse-card').count(), baseline ? 2 : 1);
  await owner.screenshot({ path: path.join(output, 'main-horses.png'), fullPage: true });
  step('owned-horse');
  const guest = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await guest.newPage(); page.setDefaultTimeout(120000);
  await page.route(base + '/api/**', route => pace('CUSTOMER', route));
  await page.goto(base + '/customer/create-request'); await page.waitForURL('**/login?next=flow1');
  assert.equal(await page.locator('.customer-card .wizard-steps').count(), 0);
  step('guest-blocked');
  await page.goto(base + '/');
  assert.ok(await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).isDisabled());
  await page.locator('.lp-fields select').nth(0).selectOption('Ho Chi Minh City');
  await page.locator('.lp-fields select').nth(1).selectOption(air ? 'Tokyo' : 'Hanoi');
  await page.locator('.lp-fields input[type=number]').fill('1');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await page.waitForURL('**/login?next=flow1');
  await page.getByLabel('Email', { exact: true }).fill('browser-owner@example.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Flow1_Native_Fixture_Only_2026!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL('**/customer/create-request'); await page.locator('.wizard-steps').waitFor();
  step('login-and-guard');
  const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  await page.locator('input[type=date]').nth(0).fill(day(20)); await page.locator('input[type=date]').nth(1).fill(day(21));
  await page.getByRole('button', { name: '2. Địa chỉ Giao/Nhận', exact: true }).click();
  const fields = page.locator('.form-grid-2 input');
  for (const [i, value] of ['Điểm lấy demo', 'Điểm giao demo', 'Receiver', '0900000001'].entries()) await fields.nth(i).fill(value);
  await page.getByRole('button', { name: '3. Chọn Ngựa đua', exact: true }).click();
  await page.locator('.horse-item').filter({ hasText: 'Main UI SQL Horse' }).click();
  if (baseline) await page.locator('.horse-item').filter({ hasText: 'Baseline Horse B' }).click();
  await page.getByRole('button', { name: '4. Hồ sơ & Thương mại', exact: true }).click();
  assert.ok(await page.locator('.upload-box input').isEnabled());
  if (baseline) {
    await page.getByLabel('Định giá thương mại (USD) phục vụ bảo hiểm & hải quan', { exact: true }).fill('150000.25');
    await page.locator('.upload-box input[type=file]').setInputFiles([
      { name: 'baseline-a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 baseline A fixture') },
      { name: 'baseline-b.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 baseline B fixture') },
    ]);
    await page.getByRole('button', { name: 'Gửi Yêu Cầu Vận Chuyển', exact: true }).click();
    await page.getByText(/Chọn ngựa tương ứng cho từng hồ sơ/).waitFor();
    await page.getByLabel('Ngựa của hồ sơ baseline-a.pdf', { exact: true }).selectOption(horse.horseId);
    await page.getByLabel('Ngựa của hồ sơ baseline-b.pdf', { exact: true }).selectOption(secondHorse.horseId);
  }
  await page.screenshot({ path: path.join(output, 'main-wizard.png'), fullPage: true });
  const submitted = page.waitForResponse(r => new URL(r.url()).pathname === (baseline ? '/api/customer/requests/with-documents' : '/api/customer/requests') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi Yêu Cầu Vận Chuyển', exact: true }).click();
  const response = await Promise.race([submitted, page.locator('.wizard-error').waitFor({state:'visible'}).then(async () => { throw new Error('Wizard refused submit: ' + await page.locator('.wizard-error').innerText()); })]); assert.ok(response.ok(), await response.text()); const request = (await response.json()).data;
  await page.waitForURL('**/customer/requests/' + request.requestId);
  // feature/quan removes the demo controls; SQL status still comes from the API.
  page.on('dialog', d => { void d.accept().catch(() => {}); });
  assert.equal(await page.locator('.demo-control-card, .demo-control-buttons').count(), 0);
  assert.equal(await page.evaluate(async id => (await (await fetch('/api/customer/requests/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') } })).json()).data.status, request.requestId), 'PENDING');
  if (baseline) {
    assert.equal(request.declaredValueUsd, 150000.25); assert.equal(request.documents.length, 2);
    assert.ok(request.documents.every(d => d.status === 'UPLOADED'));
    await page.reload(); await page.getByText('Hồ sơ bổ sung', { exact: false }).first().waitFor();
    const attachment = page.waitForEvent('download');
    await page.locator('.request-document-item').filter({ hasText: 'Baseline Horse B' }).getByRole('button', { name: 'Tải hồ sơ', exact: true }).click();
    const saved = path.join(output, 'baseline-b-customer.pdf'); await (await attachment).saveAs(saved);
    assert.equal(fs.readFileSync(saved).toString(), '%PDF-1.4 baseline B fixture');
  }
  step('submit-no-demo-bypass');
  const manager = await actor('LOGISTICS_MANAGER'); manager.on('dialog', d => { void d.accept().catch(() => {}); });
  await manager.goto(base + '/manager/requests'); await manager.getByRole('button', { name: 'Xem & Duyệt', exact: true }).first().click();
  if (baseline) {
    const summary = manager.locator('[data-flow1-baseline-summary]'); await summary.getByText('150,000.25', { exact: true }).waitFor();
    const attachment = manager.waitForEvent('download');
    await summary.locator('.info-kv-row').filter({ hasText: 'Baseline Horse B' }).getByRole('button', { name: 'Tải hồ sơ', exact: true }).click();
    const saved = path.join(output, 'baseline-b-manager.pdf'); await (await attachment).saveAs(saved);
    assert.equal(fs.readFileSync(saved).toString(), '%PDF-1.4 baseline B fixture');
    await manager.screenshot({ path: path.join(output, 'baseline-manager-review.png'), fullPage: true });
    step('baseline-total-and-private-downloads');
  }
  await manager.getByRole('button', { name: /Chấp nhận \(Accept\)/ }).click();
  await manager.locator('.decision-subform input').fill('Đã thẩm định hồ sơ và tuyến theo dữ liệu yêu cầu.');
  const accepted = manager.waitForResponse(r => new URL(r.url()).pathname.endsWith('/accept') && r.request().method() === 'POST');
  await manager.getByRole('button', { name: 'Xác nhận Chấp thuận', exact: true }).click(); const acceptResponse = await accepted; assert.ok(acceptResponse.ok(), 'Accept: ' + acceptResponse.status() + ' ' + await acceptResponse.text());
  step('manager-accepted');
  await manager.getByRole('button', { name: 'Hợp đồng & chi phí', exact: true }).click();
  await manager.locator('.contract-req-card').first().waitFor();
  await manager.locator('.line-items-table input[type=number]').last().fill('100000000');
  await manager.locator('input[type=datetime-local]').fill(day(2) + 'T17:00');
  const draftResult = manager.waitForResponse(r => new URL(r.url()).pathname.endsWith('/contracts') && r.request().method() === 'POST');
  await manager.getByRole('button', { name: '💾 Lưu nháp', exact: true }).click(); const draftResponse = await draftResult; assert.ok(draftResponse.ok(), await draftResponse.text()); const c = (await draftResponse.json()).data;
  step('draft');
  const published = manager.waitForResponse(r => new URL(r.url()).pathname.endsWith('/publish') && r.request().method() === 'POST');
  await manager.getByRole('button', { name: '🚀 Phát hành & Gửi Hợp đồng', exact: true }).click(); const pub = await published; assert.ok(pub.ok(), await pub.text());
  step('published');
  const download = manager.waitForEvent('download'); await manager.getByRole('button', { name: '👁️ Xem trước Hợp đồng', exact: true }).click(); await (await download).saveAs(path.join(output, 'main-private-contract.pdf'));
  await manager.screenshot({ path: path.join(output, 'main-manager-contract.png'), fullPage: true });
  await page.goto(base + '/customer/requests/' + request.requestId + '/contract'); await page.getByText(c.contractId, { exact: true }).waitFor();
  await page.getByRole('checkbox').check(); assert.ok(await page.getByRole('button', { name: 'Sign Contract', exact: true }).isDisabled());
  assert.equal(await page.locator('input[autocomplete=one-time-code]').count(), 0);
  await page.screenshot({ path: path.join(output, 'main-customer-contract.png'), fullPage: true });
  await page.goto(base + '/customer/payment/success?requestId=' + request.requestId + '&orderCode=FAKE');
  await page.getByText(/ReturnURL không xác nhận tiền/).waitFor();
  const result = { requestId: request.requestId, horseId: horse.horseId, contractId: c.contractId, profile: baseline ? 'QUAN_REQUEST_BASELINE' : 'QUAN_SOURCE_ONLY', route: air ? 'AIR VN-JP' : 'ROAD VN-VN', checks: ['guest direct URL blocked', 'real login/me', 'owned horse API fixture (no create-horse UI claim)', 'original four-step wizard', 'demo status cannot change SQL', 'main Manager modal accept', 'real Draft/publish/private PDF', 'absent OTP UI remains blocked', 'ReturnURL cannot certify payment'], excluded: ['OTP signing UI', 'payment UI connected E2E', 'operational handoff UI', 'live maps/SMTP/VNPay'] };
  fs.writeFileSync(path.join(output, 'main-source-result.json'), JSON.stringify(result, null, 2));
  console.log('PASS original-feature/quan UI connected scope; OTP/payment/handoff UI intentionally not accepted.');
};
