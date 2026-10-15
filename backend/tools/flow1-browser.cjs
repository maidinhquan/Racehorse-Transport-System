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
const fixture = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${mapPort}`);
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/search') {
    const q = url.searchParams.get('q'); const pickup = q.startsWith('Điểm lấy');
    res.end(JSON.stringify([{ display_name: q + ' (fixture)', lat: pickup ? '10.8' : '11.5', lon: '106.6', address: { country_code: 'vn' } }]));
  } else if (url.pathname === '/reverse') res.end(JSON.stringify({ address: { country_code: 'vn' } }));
  else if (url.pathname.startsWith('/route/v1/driving/')) res.end(JSON.stringify({ code: 'Ok', routes: [{ distance: 300000, duration: 18000 }] }));
  else { res.statusCode = 404; res.end('{}'); }
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(url) { for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await delay(200); } throw new Error('Local server did not start: ' + url); }
async function main() {
  await new Promise(resolve => fixture.listen(Number(mapPort), '127.0.0.1', resolve));
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
  page.on('pageerror', e => errors.push(e.message));
  const departure = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const deadline = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);
  await page.goto(base + '/customer/requests/new');
  await page.getByLabel('Ngày khởi hành mong muốn').fill(departure);
  await page.getByLabel('Hạn giao ngựa').fill(deadline);
  for (const [legend, address] of [['Điểm lấy ngựa (Việt Nam)', 'Điểm lấy demo'], ['Điểm giao ngựa', 'Điểm giao demo']]) {
    const group = page.getByRole('group', { name: legend, exact: true });
    await group.getByLabel('Địa chỉ', { exact: true }).fill(address);
    await group.getByRole('button', { name: 'Tìm địa điểm', exact: true }).click();
    await group.getByRole('button', { name: address + ' (fixture)', exact: true }).click();
  }
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
  await page.getByText('Trạng thái: PENDING', { exact: true }).waitFor();
  await page.reload(); await page.getByText('Trạng thái: PENDING', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'request-reloaded.png'), fullPage: true });
  await page.goto(base + '/customer/requests');
  await page.getByRole('link', { name: /Điểm lấy demo.*Điểm giao demo/ }).waitFor();
  await page.goto(base + '/customer/horses');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Tải hộ chiếu', exact: true }).click();
  await (await download).saveAs(path.join(output, 'downloaded-passport.pdf'));
  if (errors.length) throw new Error('Browser runtime errors: ' + errors.join('; '));
  const result = { status: 'PASS', provider: 'LOCAL HTTP FIXTURE - NOT LIVE', requestId: saved.requestId,
    assertions: ['real multipart horse upload', 'wizard keeps dates/contacts while adding horse', 'server-calculated estimate', 'PENDING before Contract/Trip',
      'proxy receiver not falsely verified', 'detail survives reload', 'list from SQL', 'private authenticated passport download'], pageErrors: errors };
  fs.writeFileSync(path.join(output, 'browser-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
main().catch(e => { console.error(e.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (vite) vite.kill(); fixture.close();
});
