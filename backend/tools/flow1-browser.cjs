// Connected local browser test. The provider HTTP responses below are labeled fixtures.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const [modulePath, apiPort, mapPort, frontPort, output, smtpPort] = process.argv.slice(2);
const { chromium } = require(modulePath);
const root = process.cwd();
const base = `http://127.0.0.1:${frontPort}`;
let vite; let browser; let diagnosticPage;
const errors = [];
const liveMaps = process.env.FLOW1_BROWSER_LIVE_MAPS === '1';
const phase3 = process.env.FLOW1_BROWSER_PHASE3 === '1';
const phase4 = process.env.FLOW1_BROWSER_PHASE4 === '1';
const signing = process.env.FLOW1_BROWSER_SIGNING === '1';
const lifecycle = process.env.FLOW1_BROWSER_LIFECYCLE === '1';
const deadlines = process.env.FLOW1_BROWSER_DEADLINES === '1';
const bank = process.env.FLOW1_BROWSER_BANK === '1';
const gateway = process.env.FLOW1_BROWSER_GATEWAY === '1';
const deployment = process.env.FLOW1_BROWSER_DEPLOYMENT === '1';
// A RAM-only, non-forwarding SMTP sink. No message, code, request body or trace is written to disk.
let deliveredCode = ''; const smtpSockets = new Set(); const sensitiveValues = new Set();
const smtp = require('node:net').createServer(socket => {
  smtpSockets.add(socket); socket.on('close', () => smtpSockets.delete(socket)); socket.on('error', () => {});
  socket.write('220 localhost test SMTP\r\n'); let buffer = ''; let data = false; let message = '';
  socket.on('data', chunk => {
    buffer += chunk.toString('utf8'); let end;
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data) {
        if (line !== '.') { message += line + '\r\n'; continue; }
        const plain = message.replace(/=\r\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
        const match = /Confirmation code: ([0-9]{6})/.exec(plain);
        if (match) { deliveredCode = match[1]; sensitiveValues.add(deliveredCode); }
        message = ''; data = false; socket.write('250 Accepted into RAM only\r\n');
      } else if (/^EHLO|^HELO/i.test(line)) socket.write('250 localhost\r\n');
      else if (/^MAIL FROM|^RCPT TO|^RSET/i.test(line)) socket.write('250 OK\r\n');
      else if (/^DATA$/i.test(line)) { data = true; socket.write('354 End with dot\r\n'); }
      else if (/^QUIT$/i.test(line)) { socket.end('221 Bye\r\n'); }
      else socket.write('502 Not implemented\r\n');
    }
  });
});
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
  if (signing) await new Promise(resolve => smtp.listen(Number(smtpPort), '127.0.0.1', resolve));
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
  await context.addInitScript(({ token, origin }) => {
    if (location.origin !== origin || !window.localStorage) return; // Exclude Chrome PDF viewer/opaque frames.
    localStorage.setItem('accessToken', token); localStorage.setItem('userRole', 'CUSTOMER'); localStorage.setItem('userFullName', 'Browser Demo');
  }, { token: process.env.FLOW1_FIXTURE_TOKEN, origin: base });
  const page = await context.newPage();
  page.setDefaultTimeout(liveMaps ? 60000 : 30000);
  page.on('pageerror', e => errors.push(e.message));
  if (process.env.FLOW1_BROWSER_VERIFY_IMPORT === '1') {
    const saved = JSON.parse(fs.readFileSync(path.join(output, 'browser-result.json'), 'utf8'));
    const original = JSON.parse(fs.readFileSync(path.join(output, 'acceptance-result.json'), 'utf8'));
    await page.goto(base + '/customer/requests/' + saved.requestId);
    await page.getByText('Trạng thái: AWAITING_DEPOSIT', { exact: true }).waitFor();
    await page.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
    await page.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Tải đúng bản PDF này', exact: true }).click();
    const pdf = path.join(output, 'original-pdf-after-import.pdf'); await (await download).saveAs(pdf);
    const sha256 = require('node:crypto').createHash('sha256').update(fs.readFileSync(pdf)).digest('hex');
    if (sha256 !== original.originalPdfSha256) throw new Error('Imported PDF hash differs from original.');
    await page.reload(); await page.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
    await page.screenshot({ path: path.join(output, 'customer-after-import.png'), fullPage: true });
    const managerContext = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
    await managerContext.addInitScript(({ token, origin }) => {
      if (location.origin !== origin || !window.localStorage) return;
      localStorage.setItem('accessToken', token); localStorage.setItem('userRole', 'LOGISTICS_MANAGER');
    }, { token: process.env.FLOW1_MANAGER_FIXTURE_TOKEN, origin: base });
    const manager = await managerContext.newPage(); manager.on('pageerror', e => errors.push(e.message));
    await manager.goto(base + '/manager/requests/' + saved.requestId);
    await manager.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
    await manager.getByRole('heading', { name: 'Đề xuất báo giá nội bộ', exact: true }).waitFor();
    await manager.screenshot({ path: path.join(output, 'manager-after-import.png'), fullPage: true });
    if (errors.length) throw new Error('Imported runtime browser errors: ' + errors.join('; '));
    const result = { status: 'PASS', sha256, assertions: ['fresh API host reads imported SQL with retained legacy sources', 'Customer signed receipt and deposit survive reload', 'Manager quote and receipt preserved', 'original PDF download hash unchanged'], pageErrors: errors };
    fs.writeFileSync(path.join(output, 'import-browser-result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result)); await managerContext.close(); return;
  }
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
  diagnosticPage = customer;
  const context = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  await context.addInitScript(({ token, origin }) => {
    if (location.origin !== origin || !window.localStorage) return;
    localStorage.setItem('accessToken', token); localStorage.setItem('userRole', 'LOGISTICS_MANAGER');
  }, { token: process.env.FLOW1_MANAGER_FIXTURE_TOKEN, origin: base });
  const manager = await context.newPage(); manager.on('pageerror', e => errors.push(e.message));
  manager.on('response', r => { if (r.status() === 429) console.log('Native Manager rate limit: ' + new URL(r.url()).pathname); });
  const managerUrl = base + '/manager/requests/' + id; const customerUrl = base + '/customer/requests/' + id;
  async function extendDeadline(original, days) {
    const next = new Date(original); next.setUTCDate(next.getUTCDate() + days);
    const details = manager.locator('details').filter({ has: manager.getByText('Gia hạn hoàn tất ký và cọc', { exact: true }) });
    await details.waitFor(); if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
    await manager.getByLabel('Hạn mới (giờ Việt Nam UTC+7)', { exact: true }).fill(next.toISOString().slice(0, 10) + 'T17:00');
    await manager.getByLabel('Lý do gia hạn (nội bộ)', { exact: true }).fill('Gia hạn kiểm thử, giữ nguyên điều khoản và chữ ký.');
    const reply = manager.waitForResponse(r => r.url().endsWith('/extensions') && r.request().method() === 'POST');
    await manager.getByRole('button', { name: 'Xác nhận gia hạn', exact: true }).click();
    const response = await reply; if (!response.ok()) throw new Error('Deadline extension failed: ' + await response.text());
    const value = (await response.json()).data;
    await manager.getByRole('button', { name: 'Xác nhận gia hạn', exact: true }).waitFor();
    await manager.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some(b => b.textContent === 'Xác nhận gia hạn' && !b.disabled));
    return value;
  }
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
    let issued = (await issuedResponse.json()).data;
    await manager.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).waitFor();
    await customer.goto(customerUrl);
    await customer.getByText('Trạng thái: AWAITING_CONTRACT', { exact: true }).waitFor();
    await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
    await customer.getByTitle('PDF hợp đồng đã phát hành').waitFor();
    const download = customer.waitForEvent('download');
    await customer.getByRole('link', { name: 'Tải đúng bản PDF này', exact: true }).click();
    const pdfPath = path.join(output, 'issued-contract-browser.pdf'); await (await download).saveAs(pdfPath);
    let hash = require('node:crypto').createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex');
    if (hash !== issued.documentHash) throw new Error('Downloaded issued PDF differs from its recorded hash.');
    if (lifecycle) {
      const oldId = issued.contractId; const oldHash = hash;
      await customer.getByText('Từ chối phiên bản hợp đồng', { exact: true }).click();
      await customer.getByLabel('Lý do từ chối hợp đồng', { exact: true }).fill('Cần làm rõ điều khoản trước khi ký.');
      const declinedReply = customer.waitForResponse(r => r.url().endsWith('/decline'));
      await customer.getByRole('button', { name: 'Xác nhận từ chối hợp đồng', exact: true }).click();
      if (!(await declinedReply).ok()) throw new Error('Customer decline failed.');
      await customer.getByText('Trạng thái: ACCEPTED', { exact: true }).waitFor();
      await customer.screenshot({ path: path.join(output, 'customer-declined-contract.png'), fullPage: true });
      await manager.reload(); await manager.getByLabel('Lý do hoặc câu hỏi').fill('Phát hành lại theo phản hồi của khách.');
      const reissueReply = manager.waitForResponse(r => r.url().endsWith('/reissue'));
      await manager.getByRole('button', { name: 'Tạo Draft để phát hành lại', exact: true }).click();
      const reissuedResponse = await reissueReply;
      if (!reissuedResponse.ok()) throw new Error('Manager reissue failed: ' + await reissuedResponse.text());
      const next = (await reissuedResponse.json()).data;
      if (next.contract.contractId === oldId || next.contract.status !== 'DRAFT') throw new Error('Reissue did not create a new Draft.');
      await customer.reload(); await customer.getByRole('heading', { name: 'Hợp đồng đang soạn', exact: true }).waitFor();
      if (await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).count()) throw new Error('New unissued Draft reused the old PDF.');
      // Exercise the lazy historical preview and authenticated download through the real UI.
      await customer.getByRole('button', { name: 'Xem lại PDF ' + oldId, exact: true }).click();
      await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
      const oldDownload = customer.waitForEvent('download');
      await customer.getByRole('link', { name: 'Tải đúng bản PDF này', exact: true }).click();
      const oldPath = path.join(output, 'declined-original-after-reissue.pdf'); await (await oldDownload).saveAs(oldPath);
      if (require('node:crypto').createHash('sha256').update(fs.readFileSync(oldPath)).digest('hex') !== oldHash) throw new Error('Historical PDF changed.');
      await customer.screenshot({ path: path.join(output, 'customer-historical-pdf.png'), fullPage: true });
      console.log('Waiting for the next owner window before publishing the replacement.');
      await delay(60000);
      await manager.getByLabel('Hạn hoàn tất ký và cọc (giờ Việt Nam UTC+7)').fill(deadline.toISOString().slice(0, 10) + 'T17:00');
      const replacementReply = manager.waitForResponse(r => r.url().endsWith('/send'), { timeout: 120000 });
      await manager.getByRole('button', { name: 'Phát hành PDF hợp đồng', exact: true }).click();
      const replacement = await replacementReply;
      if (!replacement.ok()) throw new Error('Replacement publication failed: ' + await replacement.text());
      issued = (await replacement.json()).data; hash = issued.documentHash;
      if (issued.contractId !== next.contract.contractId || hash === oldHash) throw new Error('Replacement PDF binding failed.');
      fs.writeFileSync(path.join(output, 'lifecycle-result.json'), JSON.stringify({ oldId, oldSha256: oldHash, replacementId: issued.contractId,
        replacementSha256: hash, assertions: ['decline returns request to ACCEPTED', 'new Draft ID', 'unissued Draft shows no stale PDF', 'historical PDF unchanged', 'native SQL receipts'] }, null, 2));
    }
    let firstExtension = null;
    if (deadlines) {
      await manager.reload(); firstExtension = await extendDeadline(issued.originalCompletionDeadline, 1);
      const currentPublication = customer.waitForResponse(r => r.url().endsWith(`/contracts/${issued.contractId}/publication`));
      await customer.goto(customerUrl + '/contract'); await customer.getByRole('heading', { name: 'Hợp đồng yêu cầu vận chuyển', exact: true }).waitFor();
      const current = (await (await currentPublication).json()).data;
      if (current.deadlineVersion !== 1 || current.originalCompletionDeadline !== issued.originalCompletionDeadline || current.documentHash !== hash || current.overdue)
        throw new Error('Legacy Contract route/effective deadline binding failed.');
      issued = current;
    } else await customer.reload();
    await customer.getByText('Trạng thái: AWAITING_CONTRACT', { exact: true }).waitFor();
    await customer.screenshot({ path: path.join(output, 'customer-published-contract.png'), fullPage: true });
    await manager.screenshot({ path: path.join(output, 'manager-published-contract.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'publication-result.json'), JSON.stringify({ ...issued, downloadedSha256: hash, converter: 'REAL LIBREOFFICE' }, null, 2));
    if (signing) {
      if (bank) { console.log('Waiting for a fresh owner window before OTP and receipt reload.'); await delay(60000); }
      await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
      await customer.getByLabel('Tôi đã đọc và đồng ý với đúng bản PDF này').check();
      const [otpReply] = await Promise.all([customer.waitForResponse(r => r.url().endsWith('/otp')),
        customer.getByRole('button', { name: 'Gửi mã OTP', exact: true }).click()]);
      if (!otpReply.ok() || !deliveredCode) throw new Error('Loopback SMTP OTP delivery failed.');
      const code = deliveredCode; deliveredCode = '';
      // Exercise the error flow without retaining any OTP request/response body or taking a filled-code screenshot.
      await customer.getByLabel('Mã OTP', { exact: true }).fill(code === '000000' ? '111111' : '000000');
      const wrong = customer.waitForResponse(r => r.url().endsWith('/sign'));
      await customer.getByRole('button', { name: 'Xác nhận ký hợp đồng', exact: true }).click();
      if ((await wrong).status() !== 409) throw new Error('Incorrect code unexpectedly accepted.');
      await customer.getByLabel('Mã OTP', { exact: true }).fill(code);
      const signedReply = customer.waitForResponse(r => r.url().endsWith('/sign'));
      await customer.getByRole('button', { name: 'Xác nhận ký hợp đồng', exact: true }).click();
      const signedResponse = await signedReply;
      if (!signedResponse.ok()) throw new Error('Contract confirmation failed (body deliberately omitted).');
      let acceptance = (await signedResponse.json()).data;
      await customer.getByText('Trạng thái: AWAITING_DEPOSIT', { exact: true }).waitFor();
      await customer.reload(); await customer.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
      await customer.getByRole('button', { name: 'Xem PDF đã phát hành', exact: true }).click();
      const signedDownload = customer.waitForEvent('download');
      await customer.getByRole('link', { name: 'Tải đúng bản PDF này', exact: true }).click();
      const signedPath = path.join(output, 'original-pdf-after-confirmation.pdf'); await (await signedDownload).saveAs(signedPath);
      const signedHash = require('node:crypto').createHash('sha256').update(fs.readFileSync(signedPath)).digest('hex');
      if (signedHash !== hash || acceptance.receipt.documentHash !== hash || acceptance.invoice.amount !== 40000000) throw new Error('Confirmation evidence/invoice/PDF mismatch.');
      if (deadlines) {
        // Dev StrictMode mounts plus two publications/lifecycle/extension reads exceed a human's request pace.
        // Keep the real limiter and start the post-sign extension in a fresh owner window.
        console.log('Waiting for the next owner window before signed deadline extension.');
        await delay(60000);
      }
      diagnosticPage = manager;
      const managerReceipt = manager.waitForResponse(r => r.url().endsWith(`/contracts/${issued.contractId}/acceptance`));
      await manager.reload();
      const managerReceiptResponse = await managerReceipt;
      if (!managerReceiptResponse.ok()) throw new Error('Manager acceptance GET failed with HTTP ' + managerReceiptResponse.status());
      await manager.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
      if (deadlines) {
        if (acceptance.receipt.deadlineVersion !== 1 || new Date(acceptance.invoice.dueAtUtc).getTime() !== new Date(firstExtension.effectiveCompletionDeadline).getTime())
          throw new Error('Signing did not use the effective deadline.');
        const originalReceipt = JSON.stringify(acceptance.receipt);
        const second = await extendDeadline(issued.originalCompletionDeadline, 2);
        diagnosticPage = customer;
        const refreshedAcceptance = customer.waitForResponse(r => r.url().endsWith(`/contracts/${issued.contractId}/acceptance`));
        await customer.getByRole('button', { name: 'Tải lại hạn hiệu lực', exact: true }).click();
        acceptance = (await (await refreshedAcceptance).json()).data;
        if (JSON.stringify(acceptance.receipt) !== originalReceipt || acceptance.deadlineVersion !== 2 ||
          new Date(acceptance.invoice.dueAtUtc).getTime() !== new Date(second.effectiveCompletionDeadline).getTime())
          throw new Error('Signed extension changed the original receipt or failed to update invoice due.');
        await customer.getByRole('list', { name: 'Lịch sử gia hạn', exact: true }).waitFor();
        await customer.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
        await manager.getByText(/Đã xác nhận bằng OTP email lúc/).waitFor();
        fs.writeFileSync(path.join(output, 'deadline-result.json'), JSON.stringify({ firstExtension, secondExtension: second,
          originalReceiptPreserved: true, pdfSha256: signedHash, route: '/customer/requests/:id/contract', finalInvoiceDueAtUtc: acceptance.invoice.dueAtUtc }, null, 2));
      }
      await customer.screenshot({ path: path.join(output, 'customer-confirmed-contract.png'), fullPage: true });
      await manager.screenshot({ path: path.join(output, 'manager-confirmed-contract.png'), fullPage: true });
      fs.writeFileSync(path.join(output, 'acceptance-result.json'), JSON.stringify({ ...acceptance, originalPdfSha256: signedHash, smtp: 'LOOPBACK RAM SINK, NOT LIVE DELIVERY' }, null, 2));
      if (bank) {
        console.log('Waiting for a fresh owner window before bank proof acceptance.'); await delay(60000);
        await customer.goto(base + `/customer/requests/${id}/payment`);
        await customer.getByRole('heading', { name: 'Thanh toán cọc 40%', exact: true }).waitFor();
        for (let i = 1; i <= 2; i++) {
          await customer.getByLabel('Số tiền đã chuyển (VND)', { exact: true }).fill('20000000');
          await customer.getByLabel('Chứng từ ngân hàng (PDF, JPG, PNG; tối đa 5 MB)', { exact: true }).setInputFiles({ name: `proof-${i}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4\nBANK FIXTURE PROOF ${i} ONLY\n%%EOF`) });
          const submitted = customer.waitForResponse(r => r.url().endsWith('/bank-proofs'));
          await customer.getByRole('button', { name: 'Gửi chứng từ để xác minh', exact: true }).click();
          const response = await submitted; if (!response.ok()) throw new Error('Bank proof submit failed: ' + await response.text());
          const v = (await response.json()).data; if (v.verifiedAmount !== 0 || v.activation) throw new Error('Pending proof counted as money.');
        }
        diagnosticPage = manager; await manager.reload();
        const panel = manager.getByRole('region', { name: 'Thanh toán cọc', exact: true }); await panel.waitFor();
        await panel.getByRole('group', { name: /Đối chiếu sao kê/ }).first().waitFor();
        const pendingIds = await panel.getByRole('list', { name: 'Giao dịch cọc' }).locator(':scope > li').evaluateAll(nodes => nodes.map(n => n.querySelector('p').textContent.split(' · ')[0]));
        if (pendingIds.length !== 2) throw new Error('Bank review did not load both submitted proofs.');
        for (let i = 0; i < pendingIds.length; i++) {
          if (gateway && i === 1) {
            diagnosticPage = customer; await customer.reload();
            const sessionResponse = customer.waitForResponse(r => r.url().endsWith('/vnpay-sessions'));
            await customer.getByRole('button', { name: 'Chuẩn bị thanh toán VNPay Sandbox', exact: true }).click();
            const reply = await sessionResponse; if (!reply.ok()) throw new Error('Session creation failed: ' + await reply.text());
            const session = (await reply.json()).data; if (session.requestedAmount !== 20000000) throw new Error('Session did not use current outstanding amount.');
            const posted = new Date(Date.now() + 7 * 3600000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
            const values = { vnp_TmnCode: 'TEST2026', vnp_TxnRef: session.paymentId, vnp_Amount: '2000000000', vnp_TransactionNo: '202610161234',
              vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_PayDate: posted };
            const canonical = Object.keys(values).sort().map(k => `${k}=${values[k]}`).join('&');
            const signature = require('node:crypto').createHmac('sha512', 'Sandbox_Unit_Test_Key_Not_A_Provider_Credential').update(canonical).digest('hex');
            const callback = `http://127.0.0.1:${apiPort}/api/payments/vnpay/ipn?${canonical}&vnp_SecureHash=${signature}`;
            const first = await (await fetch(callback)).json(); const retry = await (await fetch(callback)).json();
            if (first.RspCode !== '00' || retry.RspCode !== '02') throw new Error('Local signed IPN commit/retry failed.');
            await customer.goto(base + `/customer/payments/return?vnp_TxnRef=${session.paymentId}&vnp_ResponseCode=99`);
            await customer.getByText('Trạng thái giao dịch: SUCCESS', { exact: true }).waitFor();
            await customer.getByRole('link', { name: 'Xem số tiền đã xác minh và tải lại kết quả', exact: true }).click();
            await customer.getByText(/Đã kích hoạt chuyến/).waitFor();
            console.log('Waiting for a fresh Manager window after gateway activation and nested review reloads.'); await delay(60000);
            diagnosticPage = manager; await manager.reload();
            const fieldset = manager.getByRole('group', { name: `Đối chiếu sao kê ${pendingIds[i]}`, exact: true });
            await fieldset.getByLabel('Lý do từ chối chứng từ (khách xem được)', { exact: true }).fill('Fixture: chưa có khoản ngân hàng này; đã đủ cọc qua VNPay thử nghiệm.');
            const rejected = manager.waitForResponse(r => r.url().endsWith(`/${pendingIds[i]}/reject`));
            await fieldset.getByRole('button', { name: 'Từ chối chứng từ', exact: true }).click();
            const rejectedReply = await rejected; if (!rejectedReply.ok()) throw new Error('Unused bank proof rejection failed: ' + await rejectedReply.text());
            fs.writeFileSync(path.join(output, 'gateway-fixture-result.json'), JSON.stringify({ paymentId: session.paymentId, requestedAmount: session.requestedAmount,
              ipnCommit: first.RspCode, ipnRetry: retry.RspCode, provider: 'LOCAL SIGNED CALLBACK ONLY - NOT A LIVE VNPAY TRANSACTION', returnUrlCannotCredit: true }, null, 2));
            continue;
          }
          const fieldset = panel.getByRole('group', { name: `Đối chiếu sao kê ${pendingIds[i]}`, exact: true });
          await fieldset.getByLabel('Số thực nhận (VND)', { exact: true }).fill('20000000');
          await fieldset.getByLabel('Mã giao dịch ngân hàng', { exact: true }).fill(`BROWSER-BANK-${i + 1}`);
          const local = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16);
          await fieldset.getByLabel('Thời điểm nhận (giờ Việt Nam UTC+7)', { exact: true }).fill(local);
          const confirmed = manager.waitForResponse(r => r.url().endsWith(`/${pendingIds[i]}/confirm`));
          await fieldset.getByRole('button', { name: 'Xác nhận tiền thực nhận', exact: true }).click();
          const reply = await confirmed; if (!reply.ok()) throw new Error('Bank confirmation failed: ' + await reply.text());
          const v = (await reply.json()).data;
          if (v.verifiedAmount !== (i + 1) * 20000000 || (i === 0 ? !!v.activation : !v.activation)) throw new Error('Partial/exactly-once activation failed.');
          await manager.getByRole('region', { name: 'Thanh toán cọc' }).getByText(`Trạng thái thanh toán: ${i === 0 ? 'PARTIALLY_PAID' : 'PAID'}`, { exact: true }).waitFor();
          fs.writeFileSync(path.join(output, `bank-result-${i + 1}.json`), JSON.stringify(v, null, 2));
        }
        diagnosticPage = customer; await customer.reload(); await customer.getByText(/Đã kích hoạt chuyến/).waitFor();
        const proofDownload = customer.waitForEvent('download'); await customer.getByRole('button', { name: `Tải chứng từ ${pendingIds[0]}`, exact: true }).click();
        await (await proofDownload).saveAs(path.join(output, 'downloaded-bank-proof.pdf'));
        await customer.screenshot({ path: path.join(output, 'customer-payment-activated.png'), fullPage: true });
        await manager.screenshot({ path: path.join(output, 'manager-payment-activated.png'), fullPage: true });
        const finalReceiptResponse = await customer.request.get(base + `/api/customer/contracts/${issued.contractId}/acceptance`, { headers: { Authorization: `Bearer ${process.env.FLOW1_FIXTURE_TOKEN}` } });
        if (!finalReceiptResponse.ok()) throw new Error('Activated signature receipt could not be read.');
        const finalReceipt = (await finalReceiptResponse.json()).data;
        if (JSON.stringify(finalReceipt.receipt) !== JSON.stringify(acceptance.receipt)) throw new Error('Payment changed signature receipt.');
        if (deployment) {
          console.log('Waiting for a fresh Manager window before deployment/handoff acceptance.'); await delay(60000);
          diagnosticPage = manager; await manager.reload();
          const section = manager.getByRole('region', { name: 'Bàn giao vận hành', exact: true });
          async function decide(label, reason) {
            await section.getByLabel('Lý do quyết định triển khai (nội bộ)', { exact: true }).fill(reason);
            const result = manager.waitForResponse(r => /\/deployment\/(confirm|hold|resume)$/.test(r.url()));
            await section.getByRole('button', { name: label, exact: true }).click();
            const response = await result; if (!response.ok()) throw new Error('Deployment decision failed: ' + await response.text()); return (await response.json()).data;
          }
          let d = await decide('Xác nhận bàn giao vận hành', 'Fixture: signed plan and verified deposit ready for operational release.');
          async function operatorPage(role, token, url) {
            const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
            await ctx.addInitScript(({ token, role, origin }) => { if (location.origin !== origin) return; localStorage.setItem('accessToken', token); localStorage.setItem('userRole', role); }, { token, role, origin: base });
            const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(base + url); return { ctx, p };
          }
          const route = await operatorPage('FLEET_ROUTE_COORDINATOR', process.env.FLOW1_ROUTE_FIXTURE_TOKEN, '/coordinator/flow1-work');
          diagnosticPage = route.p;
          await route.p.getByRole('button', { name: `Xem bàn giao ${d.tripId}`, exact: true }).click();
          await route.p.getByRole('region', { name: 'Gói bàn giao', exact: true }).waitFor();
          diagnosticPage = manager; d = await decide('Tạm giữ triển khai', 'Fixture: operational hold invalidates the previous event.');
          diagnosticPage = route.p;
          const denied = route.p.waitForResponse(r => r.url().endsWith('/acknowledgements'));
          await route.p.getByRole('button', { name: 'Xác nhận tiếp nhận ROUTING', exact: true }).click();
          if ((await denied).status() !== 409) throw new Error('Operational write bypassed hold.');
          diagnosticPage = manager; d = await decide('Tiếp tục chờ xác nhận', 'Fixture: resume keeps Trip planning and requires explicit confirmation.');
          if (d.status !== 'PENDING' || d.tripStatus !== 'PLANNING') throw new Error('Resume automatically released readiness.');
          d = await decide('Xác nhận bàn giao vận hành', 'Fixture: rechecked unchanged signed plan after hold.');
          diagnosticPage = route.p; await route.p.getByRole('button', { name: 'Tải lại hàng đợi bàn giao', exact: true }).click();
          await route.p.getByRole('button', { name: `Xem bàn giao ${d.tripId}`, exact: true }).click();
          await route.p.getByRole('button', { name: 'Xác nhận tiếp nhận ROUTING', exact: true }).click(); await route.p.getByText('Đã tiếp nhận bàn giao ROUTING.', { exact: true }).waitFor();
          const docs = await operatorPage('TRANSPORT_SPECIALIST', process.env.FLOW1_DOCS_FIXTURE_TOKEN, '/specialist/flow1-work'); diagnosticPage = docs.p;
          await docs.p.getByRole('button', { name: `Xem bàn giao ${d.tripId}`, exact: true }).click();
          const documentDownload = docs.p.waitForEvent('download'); await docs.p.getByRole('button', { name: /^Tải hộ chiếu / }).click();
          await (await documentDownload).saveAs(path.join(output, 'specialist-frozen-passport.pdf'));
          await docs.p.getByRole('button', { name: 'Xác nhận tiếp nhận DOCUMENTS', exact: true }).click(); await docs.p.getByText('Đã tiếp nhận bàn giao DOCUMENTS.', { exact: true }).waitFor();
          await route.p.screenshot({ path: path.join(output, 'route-handoff-received.png'), fullPage: true }); await docs.p.screenshot({ path: path.join(output, 'specialist-handoff-received.png'), fullPage: true });
          diagnosticPage = manager; await section.getByRole('button', { name: 'Tải lại triển khai', exact: true }).click();
          await section.getByText(/Đã nhận bàn giao: ROUTING, DOCUMENTS/).waitFor(); await manager.screenshot({ path: path.join(output, 'manager-deployment-confirmed.png'), fullPage: true });
          fs.writeFileSync(path.join(output, 'deployment-result.json'), JSON.stringify({ tripId: d.tripId, finalStatus: 'CONFIRMED', tripStatus: 'PLANNING',
            heldWriteRejected: true, resumeDidNotMarkReady: true, streams: ['ROUTING', 'DOCUMENTS'], downstreamScope: 'Persisted handoff acceptance, not the complete Flow 2/3 workflows' }, null, 2));
          await route.ctx.close(); await docs.ctx.close();
        }
      }
      // Ensure this run's code did not escape into any persisted test evidence, including API logs/metadata.
      function inspect(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name); if (e.isDirectory()) inspect(p);
        else if (/\.(json|log)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes(code)) throw new Error('OTP escaped into persisted test evidence.');
      } }
      inspect(output);
    }
  }
  await context.close();
  return ['Manager question / Customer answer', 'revision and resubmit with own booked horse', 'Manager accept / plan / private quote / Draft',
    '115M selling total gives 46M deposit', 'Customer DTO excludes cost/floor/override notes', 'pending change keeps canonical unchanged and blocks Draft',
    'approved change supersedes old Draft and invalidates plan', 'reaccept / replan / new Draft survives reload',
    ...(phase4 ? ['real LibreOffice PDF publication', 'Customer private PDF view/download hash matches',
      signing ? bank ? 'OTP then verified deposit / one invoice / one Trip PLANNING / original PDF and signature receipt unchanged'
        : 'loopback SMTP / incorrect OTP rejected / correct OTP confirms once / reload preserves receipt and original PDF / one 40% Invoice, no Trip'
        : 'AWAITING_CONTRACT survives reload; unsigned, no Invoice/Trip'] : []),
    ...(lifecycle ? ['Customer declines / Manager reissues new Draft / historical PDF retained / replacement PDF signed with one invoice'] : []),
    ...(deadlines ? ['legacy Contract route loads real API / extend before signing / sign uses effective deadline / extend after signing preserves receipt and updates invoice due'] : []),
    ...(bank ? ['private bank proofs count zero until verified / actual partial receipts / exactly-one activation Trip'] : []),
    ...(gateway ? ['local signed gateway IPN fixture commits once / retry deduped / Return reads SQL only / live VNPay NOT tested'] : []),
    ...(deployment ? ['Manager confirm / hold blocks downstream write / resume requires reconfirmation / Coordinator and Specialist acknowledge current handoff and download frozen documents'] : [])];
}
main().catch(async e => {
  if (diagnosticPage && !diagnosticPage.isClosed()) {
    try { await diagnosticPage.screenshot({ path: path.join(output, 'failed-customer-masked.png'), fullPage: true, mask: [diagnosticPage.locator('input')] }); } catch {}
  }
  let diagnostic = e.stack || String(e);
  for (const value of sensitiveValues) diagnostic = diagnostic.split(value).join('[REDACTED OTP]');
  console.error(diagnostic); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close(); if (vite) vite.kill(); fixture.close(); for (const socket of smtpSockets) socket.destroy(); smtp.close();
});
