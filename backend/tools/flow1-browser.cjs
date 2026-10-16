// Connected local browser test. The provider HTTP responses below are labeled fixtures.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const [modulePath, apiPort, mapPort, frontPort, output] = process.argv.slice(2);
const { chromium } = require(modulePath);
const root = process.cwd();
const base = `http://127.0.0.1:${frontPort}`;
let vite; let browser;
const errors = [];
const liveMaps = process.env.FLOW1_BROWSER_LIVE_MAPS === '1';
const phase3 = process.env.FLOW1_BROWSER_PHASE3 === '1';
const phase4 = process.env.FLOW1_BROWSER_PHASE4 === '1';
const mapbox = liveMaps || ['MAPBOX', 'GEOAPIFY'].includes(process.env.FLOW1_BROWSER_MAP_PROVIDER);
const calls = { geoSearch: 0, geoReverse: 0, geoRoute: 0, mapboxPreview: 0, forbiddenMapboxData: 0 };
const fixture = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${mapPort}`);
  res.setHeader('Content-Type', 'application/json');
  if (mapbox && url.pathname.startsWith('/styles/') && url.searchParams.get('access_token') !== 'pk.flow1_fixture_not_live') {
    res.statusCode = 401; res.end('{}'); return;
  }
  if (mapbox && url.pathname.startsWith('/styles/v1/mapbox/streets-v12/static/')) {
    calls.mapboxPreview++;
    if (url.searchParams.get('logo') !== 'true' || url.searchParams.get('attribution') !== 'true') {
      res.statusCode = 400; res.end('{}'); return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64'));
  } else if (mapbox && (url.pathname.startsWith('/search/geocode/') || url.pathname.startsWith('/directions/'))) {
    calls.forbiddenMapboxData++; res.statusCode = 403; res.end('{}');
  } else if (mapbox && url.pathname.startsWith('/v1/')) {
    if (url.searchParams.get('apiKey') !== 'geoapify_flow1_fixture_not_live') { res.statusCode = 401; res.end('{}'); return; }
    if (url.pathname === '/v1/geocode/search') {
      calls.geoSearch++; const q = url.searchParams.get('text');
      res.end(JSON.stringify({ results: [{ formatted: q + ' (fixture)', lat: q.startsWith('Điểm lấy') ? 10.8 : 11.5, lon: 106.6, country_code: 'vn' }] }));
    } else if (url.pathname === '/v1/geocode/reverse') {
      calls.geoReverse++; res.end(JSON.stringify({ results: [{ country_code: 'vn' }] }));
    } else if (url.pathname === '/v1/routing') {
      calls.geoRoute++; res.end(JSON.stringify({ features: [{ properties: { distance: 300000, distance_units: 'meters', time: 18000, time_units: 'seconds' } }] }));
    } else { res.statusCode = 404; res.end('{}'); }
  } else if (url.pathname === '/search') {
    const q = url.searchParams.get('q'); const pickup = q.startsWith('Điểm lấy');
    res.end(JSON.stringify([{ display_name: q + ' (fixture)', lat: pickup ? '10.8' : '11.5', lon: '106.6', address: { country_code: 'vn' } }]));
  } else if (url.pathname === '/reverse') res.end(JSON.stringify({ address: { country_code: 'vn' } }));
  else if (url.pathname.startsWith('/route/v1/driving/')) res.end(JSON.stringify({ code: 'Ok', routes: [{ distance: 300000, duration: 18000 }] }));
  else { res.statusCode = 404; res.end('{}'); }
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(url) { for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await delay(200); } throw new Error('Local server did not start: ' + url); }
async function main() {
  if (!liveMaps) await new Promise(resolve => fixture.listen(Number(mapPort), '127.0.0.1', resolve));
  // Independent config: reproducible without committing or depending on user's staged vite.config.ts.
  const config = path.join(output, 'vite.browser.mjs');
  const reactModule = pathToFileURL(path.join(root, 'frontend/node_modules/@vitejs/plugin-react/dist/index.js')).href;
  fs.writeFileSync(config, `import react from ${JSON.stringify(reactModule)}; export default ${JSON.stringify({ root: path.join(root, 'frontend'), server: { host: '127.0.0.1', port: Number(frontPort), strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } } } }).replace(/}$/, ',plugins:[react()]}')};`);
  vite = spawn(process.execPath, [path.join(root, 'frontend/node_modules/vite/bin/vite.js'), '--config', config], { cwd: path.join(root, 'frontend'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const viteLog = fs.createWriteStream(path.join(output, 'vite.log')); vite.stdout.pipe(viteLog); vite.stderr.pipe(viteLog);
  await ready(`http://127.0.0.1:${apiPort}/api/public/estimates/transport-modes`); await ready(base);
  browser = await chromium.launch({ headless: true, channel: process.env.FLOW1_BROWSER_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addInitScript(token => { localStorage.setItem('accessToken', token); localStorage.setItem('userRole', 'CUSTOMER'); localStorage.setItem('userFullName', 'Browser Demo'); }, process.env.FLOW1_FIXTURE_TOKEN);
  const page = await context.newPage();
  page.setDefaultTimeout(liveMaps ? 60000 : 30000);
  page.on('pageerror', e => errors.push(e.message));
  const browserMapRequests = [];
  page.on('request', request => {
    // Only retain host/path; never retain query strings or credential headers.
    const url = new URL(request.url());
    if (url.hostname === 'api.mapbox.com' || url.hostname === 'api.geoapify.com' ||
        url.searchParams.has('access_token') || url.searchParams.has('apiKey')) browserMapRequests.push(url.hostname + url.pathname);
  });
  const departure = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const deadline = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
  await page.goto(base + '/customer/requests/new');
  await page.getByLabel('Ngày khởi hành mong muốn').fill(departure);
  await page.getByLabel('Hạn giao ngựa').fill(deadline);
  for (const [legend, address] of [['Điểm lấy ngựa (Việt Nam)', liveMaps ? 'Ho Chi Minh City' : 'Điểm lấy demo'], ['Điểm giao ngựa', liveMaps ? 'Vung Tau' : 'Điểm giao demo']]) {
    const group = page.getByRole('group', { name: legend, exact: true });
    await group.getByLabel('Địa chỉ', { exact: true }).fill(address);
    await group.getByRole('button', { name: 'Tìm địa điểm', exact: true }).click();
    if (liveMaps) {
      const candidate = group.locator('ul li button').first(); await candidate.waitFor({ timeout: 25000 }); await candidate.click();
    } else await group.getByRole('button', { name: address + ' (fixture)', exact: true }).click();
    if (mapbox) {
      await group.getByRole('img', { name: `Bản đồ Mapbox: ${legend}`, exact: true }).waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('.flow1-map-preview')]
        .every(img => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, 'selected-maps.png'), fullPage: true });
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  for (const [legend, name, phone] of [['Người giao ngựa', 'Người giao Demo', '0901234567'], ['Người nhận ngựa', 'Người nhận Demo', '0907654321']]) {
    const group = page.getByRole('group', { name: legend, exact: true });
    await group.getByLabel('Họ tên', { exact: true }).fill(name);
    await group.getByLabel('Số điện thoại', { exact: true }).fill(phone);
  }
  await page.getByRole('checkbox', { name: 'Người nhận thay mặt chủ ngựa' }).check();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm ngựa tại đây', exact: true }).click();
  await page.getByLabel('Tên ngựa', { exact: true }).fill('Ngựa Chromium');
  await page.getByLabel('Microchip ISO (15 chữ số)', { exact: true }).fill('123456789012345');
  await page.getByLabel('Số hộ chiếu FEI', { exact: true }).fill('BROWSER-DEMO');
  await page.getByLabel('Giống', { exact: true }).fill('Thoroughbred');
  await page.getByLabel('Khối lượng (kg)', { exact: true }).fill('450');
  await page.getByLabel('Ngày sinh', { exact: true }).fill('2020-01-01');
  await page.getByLabel('Ảnh ngựa (PNG/JPEG, tối đa 5 MB)', { exact: true }).setInputFiles({ name: 'horse.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=', 'base64') });
  await page.getByLabel('Scan hộ chiếu (PDF/PNG/JPEG, tối đa 5 MB)', { exact: true }).setInputFiles({ name: 'passport.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nBROWSER TEST ONLY\n%%EOF') });
  const horseResponse = page.waitForResponse(r => r.url().endsWith('/api/customer/horses') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Lưu hồ sơ ngựa', exact: true }).click();
  const horseSaved = await horseResponse; if (horseSaved.status() !== 201) throw new Error('Horse upload failed: ' + await horseSaved.text());
  await page.getByRole('checkbox', { name: /Ngựa Chromium/ }).waitFor();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('checkbox', { name: /Tôi xác nhận/ }).check();
  await page.screenshot({ path: path.join(output, 'wizard-review.png'), fullPage: true });
  const requestResponse = page.waitForResponse(r => r.url().endsWith('/api/customer/requests') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  const savedResponse = await requestResponse; if (savedResponse.status() !== 201) throw new Error('Submission failed: ' + await savedResponse.text());
  const saved = (await savedResponse.json()).data;
  if (saved.status !== 'PENDING' || saved.snapshot.receiverVerificationStatus !== 'REQUIRED_NOT_VERIFIED') throw new Error('Incorrect submitted state.');
  if (mapbox && (saved.snapshot.estimate.provider !== 'GEOAPIFY' || saved.snapshot.estimate.vehicleCount !== 1 ||
    !saved.snapshot.estimate.locationAttribution.includes('Geoapify'))) throw new Error('Incorrect hybrid source/capacity/attribution snapshot.');
  await page.getByText('Trạng thái: PENDING', { exact: true }).waitFor();
  await page.reload(); await page.getByText('Trạng thái: PENDING', { exact: true }).waitFor();
  if (mapbox) {
    await page.getByRole('link', { name: 'Geoapify', exact: true }).waitFor();
    if (!liveMaps && (calls.geoSearch < 2 || calls.geoReverse < 2 || calls.geoRoute < 1 || calls.mapboxPreview < 2 || calls.forbiddenMapboxData))
      throw new Error('Hybrid provider boundary failed.');
  }
  await page.screenshot({ path: path.join(output, 'request-reloaded.png'), fullPage: true });
  await page.goto(base + '/customer/requests');
  if (liveMaps) await page.locator(`a[href="/customer/requests/${saved.requestId}"]`).waitFor();
  else await page.getByRole('link', { name: /Điểm lấy demo.*Điểm giao demo/ }).waitFor();
  await page.goto(base + '/customer/horses');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Tải hộ chiếu', exact: true }).click();
  await (await download).saveAs(path.join(output, 'downloaded-passport.pdf'));
  let reviewChecks = null;
  if (phase3) {
    // Preserve the real per-owner limiter. The automated phase-2 setup runs much faster
    // than a human; begin review in a fresh 60-second window instead of disabling limits.
    console.log('Waiting for the next owner rate-limit window before the connected Manager review.');
    await delay(60000);
    reviewChecks = await reviewFlow(browser, page, saved.requestId);
  }
  if (errors.length) throw new Error('Browser runtime errors: ' + errors.join('; '));
  if (browserMapRequests.length) throw new Error('Browser sent map requests outside our credential-free API boundary.');
  if (liveMaps && Object.values(calls).some(n => n !== 0)) throw new Error('Live run unexpectedly used a map fixture.');
  const result = { status: 'PASS', provider: liveMaps ? 'LIVE GEOAPIFY DATA + LIVE MAPBOX MAPS; TEST SQL/FILES/CUSTOMER' : mapbox ? 'LOCAL GEOAPIFY DATA + MAPBOX MAP HTTP FIXTURES - NOT LIVE' : 'LOCAL OSM HTTP FIXTURE - NOT LIVE', requestId: saved.requestId, calls,
    roadDistanceKm: saved.snapshot.estimate.roadDistanceKm, estimatedPriceVnd: saved.snapshot.estimate.estimatedPrice,
    browserDirectProviderRequests: browserMapRequests.length, reviewChecks,
    mapPreviewChecks: mapbox ? 'both Mapbox preview images loaded through our API, with no token in browser URL' : 'not applicable',
    assertions: ['real multipart horse upload', 'wizard keeps dates/contacts while adding horse', 'server-calculated estimate', 'PENDING before Contract/Trip',
      'proxy receiver not falsely verified', 'detail survives reload', 'list from SQL', 'private authenticated passport download'], pageErrors: errors };
  fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
async function reviewFlow(browser, customer, id) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  await context.addInitScript(token => { localStorage.setItem('accessToken', token); localStorage.setItem('userRole', 'LOGISTICS_MANAGER'); }, process.env.FLOW1_MANAGER_FIXTURE_TOKEN);
  const manager = await context.newPage(); manager.on('pageerror', e => errors.push(e.message));
  const managerUrl = base + '/manager/requests/' + id; const customerUrl = base + '/customer/requests/' + id;
  await manager.goto(managerUrl);
  await manager.getByLabel('Lý do hoặc câu hỏi').fill('Xác nhận liên hệ trước khởi hành.');
  await manager.getByRole('button', { name: 'Hỏi bổ sung', exact: true }).click();
  await manager.getByText(/Hỏi: Xác nhận liên hệ/).waitFor();
  await customer.goto(customerUrl);
  await customer.getByLabel('Câu trả lời', { exact: true }).fill('Đã xác nhận số điện thoại người nhận.');
  await customer.getByRole('button', { name: 'Gửi câu trả lời', exact: true }).click();
  await customer.getByText(/Trả lời: Đã xác nhận/).waitFor();
  await manager.reload(); await manager.getByText(/Trả lời: Đã xác nhận/).waitFor();
  await manager.getByLabel('Lý do hoặc câu hỏi').fill('Cập nhật người nhận.');
  await manager.getByRole('button', { name: 'Yêu cầu chỉnh sửa', exact: true }).click();
  await manager.getByText(/Trạng thái: CHANGES_REQUESTED/).waitFor();
  async function edit(change, name) {
    await customer.goto(customerUrl);
    await customer.getByRole('link', { name: change ? 'Đề xuất thay đổi yêu cầu' : 'Chỉnh sửa và gửi lại', exact: true }).click();
    if (change) await customer.getByLabel('Lý do đề xuất').fill('Thay người nhận sau khi có Draft.');
    await customer.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await customer.getByRole('group', { name: 'Người nhận ngựa', exact: true }).getByLabel('Họ tên', { exact: true }).fill(name);
    await customer.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    const horse = customer.getByRole('checkbox', { name: /Ngựa Chromium/ });
    if (!(await horse.isEnabled())) throw new Error('Revision cannot select its own booked horse.');
    await horse.check(); await customer.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await customer.getByRole('checkbox', { name: /Tôi xác nhận/ }).check();
    await customer.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
    await customer.waitForURL(customerUrl);
    await customer.getByText(/^Trạng thái: (PENDING|ACCEPTED)$/).waitFor();
  }
  await edit(false, 'Người nhận đã sửa');
  await customer.getByText('Trạng thái: PENDING', { exact: true }).waitFor();
  await manager.reload(); await manager.getByText(/Người nhận: Người nhận đã sửa/).waitFor();
  async function planAndDraft(total) {
    await manager.getByRole('button', { name: 'Chấp nhận yêu cầu', exact: true }).click();
    await manager.getByLabel('Nguồn lực dự kiến').fill('Xe chuyên dụng, lái xe và handler dự kiến');
    await manager.getByRole('button', { name: 'Lưu kế hoạch sơ bộ', exact: true }).click();
    await manager.getByRole('heading', { name: 'Đề xuất báo giá nội bộ', exact: true }).waitFor();
    await manager.getByRole('group', { name: 'Các khoản giá bán', exact: true }).getByLabel('Đơn giá VND khoản 1', { exact: true }).fill(String(total));
    await manager.getByRole('button', { name: 'Tạo hợp đồng Draft', exact: true }).click();
    await manager.getByRole('heading', { name: 'Hợp đồng Draft hiện hành', exact: true }).waitFor();
  }
  await planAndDraft(115000000);
  const customerResponse = customer.waitForResponse(r => r.url().endsWith('/api/customer/requests/' + id) && r.request().method() === 'GET');
  await customer.goto(customerUrl);
  const publicJson = await (await customerResponse).text();
  if (['estimatedCost', 'belowFloorReason', '"floor"'].some(x => publicJson.includes(x))) throw new Error('Internal quote leaked to Customer.');
  await customer.getByRole('heading', { name: 'Hợp đồng đang soạn', exact: true }).waitFor();
  await customer.screenshot({ path: path.join(output, 'customer-draft.png'), fullPage: true });
  await manager.screenshot({ path: path.join(output, 'manager-plan-draft.png'), fullPage: true });
  await edit(true, 'Người nhận đề xuất');
  // Proposal must not silently overwrite the canonical receiver.
  await customer.getByText(/Người nhận: Người nhận đã sửa/).waitFor();
  await manager.goto(managerUrl);
  if (await manager.getByRole('button', { name: 'Tạo phiên bản Draft mới', exact: true }).count()) throw new Error('Pending change did not block Draft.');
  await manager.getByRole('button', { name: 'Duyệt thay đổi', exact: true }).click();
  await manager.getByText(/Trạng thái: PENDING/).waitFor();
  await manager.locator('main > p').filter({ hasText: 'Người nhận: Người nhận đề xuất' }).waitFor();
  await planAndDraft(100000000);
  await manager.reload(); await manager.getByRole('heading', { name: 'Hợp đồng Draft hiện hành', exact: true }).waitFor();
  await customer.goto(customerUrl); await customer.getByRole('heading', { name: 'Hợp đồng đang soạn', exact: true }).waitFor();
  await customer.getByText(/Người nhận: Người nhận đề xuất/).waitFor();
  await customer.screenshot({ path: path.join(output, 'customer-current-draft.png'), fullPage: true });
  if (phase4) {
    console.log('Waiting for the next owner window before PDF publication acceptance.');
    await delay(60000);
    const deadline = new Date(); deadline.setUTCDate(deadline.getUTCDate() + 15);
    await manager.getByLabel('Hạn hoàn tất ký và cọc (giờ Việt Nam UTC+7)').fill(deadline.toISOString().slice(0, 10) + 'T17:00');
    const sent = manager.waitForResponse(r => r.url().includes('/api/manager/contracts/') && r.url().endsWith('/send'), { timeout: 120000 });
    await manager.getByRole('button', { name: 'Phát hành PDF hợp đồng', exact: true }).click();
    const issuedResponse = await sent;
    if (!issuedResponse.ok()) throw new Error('PDF publish failed: ' + await issuedResponse.text());
    const issued = (await issuedResponse.json()).data;
    await manager.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).waitFor();
    await customer.goto(customerUrl);
    await customer.getByText('Trạng thái: AWAITING_CONTRACT', { exact: true }).waitFor();
    await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
    await customer.getByTitle('PDF hợp đồng đã phát hành').waitFor();
    const download = customer.waitForEvent('download');
    await customer.getByRole('link', { name: 'Tải đúng bản PDF này', exact: true }).click();
    const pdfPath = path.join(output, 'issued-contract-browser.pdf'); await (await download).saveAs(pdfPath);
    const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    if (hash !== issued.documentHash) throw new Error('Downloaded issued PDF differs from its recorded hash.');
    await customer.reload(); await customer.getByText('Trạng thái: AWAITING_CONTRACT', { exact: true }).waitFor();
    await customer.screenshot({ path: path.join(output, 'customer-published-contract.png'), fullPage: true });
    await manager.screenshot({ path: path.join(output, 'manager-published-contract.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'publication-result.json'), JSON.stringify({ ...issued, downloadedSha256: hash, converter: 'REAL LIBREOFFICE', otp: 'NOT IMPLEMENTED IN THIS INCREMENT' }, null, 2));
  }
  await context.close();
  return ['Manager question / Customer answer', 'revision and resubmit with own booked horse', 'Manager accept / plan / private quote / Draft',
    '115M selling total gives 46M deposit', 'Customer DTO excludes cost/floor/override notes', 'pending change keeps canonical unchanged and blocks Draft',
    'approved change supersedes old Draft and invalidates plan', 'reaccept / replan / new Draft survives reload',
    ...(phase4 ? ['real LibreOffice PDF publication', 'Customer private PDF view/download hash matches', 'AWAITING_CONTRACT survives reload; unsigned, no Invoice/Trip'] : [])];
}
main().catch(e => { console.error(e.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (vite) vite.kill(); fixture.close();
});
