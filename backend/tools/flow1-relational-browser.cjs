// Connected local browser test. The provider HTTP responses below are labeled fixtures.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const [modulePath, apiPort, mapPort, frontPort, output, smtpPort] = process.argv.slice(2);
const { chromium } = require(modulePath);
const root = process.cwd();
const air = process.env.FLOW1_RELATIONAL_AIR === "1";
const base = `http://127.0.0.1:${frontPort}`;
let vite; let browser; let diagnosticPage;
const errors = [];
const liveMaps = false;
const localDemo = process.env.FLOW1_LOCAL_DEMO === '1';
const demoCheck = localDemo && process.env.FLOW1_LOCAL_DEMO_AUTOCHECK === '1';
const phase3 = process.env.FLOW1_BROWSER_PHASE3 === '1';
const phase4 = process.env.FLOW1_BROWSER_PHASE4 === '1';
const signing = process.env.FLOW1_BROWSER_SIGNING === '1';
const lifecycle = process.env.FLOW1_BROWSER_LIFECYCLE === '1';
const deadlines = process.env.FLOW1_BROWSER_DEADLINES === '1';
const bank = process.env.FLOW1_BROWSER_BANK === '1';
const gateway = process.env.FLOW1_BROWSER_GATEWAY === '1';
const deployment = process.env.FLOW1_BROWSER_DEPLOYMENT === '1';
const cancellation = process.env.FLOW1_BROWSER_CANCELLATION === '1';
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
const mapbox = false;
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
    const q = url.searchParams.get('q'); const pickup = q.startsWith('Điểm lấy'); const jp=url.searchParams.get('countrycodes')==='jp';
    res.end(JSON.stringify([{ display_name: q + ' (fixture)', lat: jp?'35.5':pickup?'10.8':'11.5', lon:jp?'139.7':'106.6', address:{country_code:jp?'jp':'vn'} }]));
  } else if (url.pathname === '/reverse') res.end(JSON.stringify({ address: { country_code: Number(url.searchParams.get('lat'))>30?'jp':'vn' } }));
  else if (url.pathname.startsWith('/route/v1/driving/')) res.end(JSON.stringify({ code: 'Ok', routes: [{ distance: 300000, duration: 18000 }] }));
  else { res.statusCode = 404; res.end('{}'); }
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function ready(url) { for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return; } catch {} await delay(200); } throw new Error('Local server did not start: ' + url); }
let demoInstall;
async function installDemo(ctx){return demoInstall(ctx);}
async function main() {
  if (signing) await new Promise(resolve => smtp.listen(Number(smtpPort), '127.0.0.1', resolve));
  if (!liveMaps) await new Promise(resolve => fixture.listen(Number(mapPort), '127.0.0.1', resolve));
  // Independent config: reproducible without committing or depending on user's staged vite.config.ts.
  const config = path.join(output, 'vite.browser.mjs');
  const reactModule = pathToFileURL(path.join(root, 'frontend/node_modules/@vitejs/plugin-react/dist/index.js')).href;
  fs.writeFileSync(config, `import react from ${JSON.stringify(reactModule)}; export default ${JSON.stringify({ root: path.join(root, 'frontend'), server: { host: '127.0.0.1', port: Number(frontPort), strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } } } }).replace(/}$/, ',plugins:[react()]}')};`);
  vite = spawn(process.execPath, [path.join(root, 'frontend/node_modules/vite/bin/vite.js'), '--config', config], { cwd: path.join(root, 'frontend'), windowsHide: true, env: {...process.env,VITE_API_URL:'/api'}, stdio: ['ignore', 'pipe', 'pipe'] });
  const viteLog = fs.createWriteStream(path.join(output, 'vite.log')); vite.stdout.pipe(viteLog); vite.stderr.pipe(viteLog);
  await ready(`http://127.0.0.1:${apiPort}/api/public/estimates/transport-modes`); await ready(base);
  browser = await chromium.launch({ headless: !localDemo || demoCheck, channel: process.env.FLOW1_BROWSER_CHANNEL || 'chrome' });
  async function actor(role) {
    const accounts={CUSTOMER:'browser-owner',LOGISTICS_MANAGER:'browser-manager',FLEET_ROUTE_COORDINATOR:'browser-route',TRANSPORT_SPECIALIST:'browser-docs'};
    const email=accounts[role]+'@example.invalid';
    const wrong=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Password123!'})});if(wrong.status!==401)throw new Error('Development password bypass was accepted');
    const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Flow1_Native_Fixture_Only_2026!'})});if(!auth.ok)throw new Error('Fixture hashed-password login failed '+auth.status);const login=(await auth.json()).data;if(login.role!==role||!login.accessToken)throw new Error('Fixture login role/token mismatch');const token=login.accessToken;
    const ctx = await browser.newContext({viewport:{width:1440,height:1100}});
    await ctx.addInitScript(({role,token,base})=>{if(location.origin===base){localStorage.setItem('accessToken',token);localStorage.setItem('userRole',role);localStorage.setItem('userFullName','Local Fixture');}},{role,token,base});
    if(localDemo)await installDemo(ctx);
    const p=await ctx.newPage();let slots=[];
    // Keep the real limiter. Development StrictMode duplicates some reads; pace fixture traffic below 30/min.
    await p.route(base+'/api/**',async route=>{const now=Date.now();slots=slots.filter(t=>t>now-61000);const at=slots.length>=26?Math.max(now,slots[slots.length-26]+61000):now;slots.push(at);if(at>now)await delay(at-now);await route.continue();});
    p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base+'/api/'))fs.appendFileSync(path.join(output,'http-errors.log'),r.status()+' '+new URL(r.url()).pathname+'\n');});p.setDefaultTimeout(120000);return p;
  }
  if(localDemo){
    const { installDemo:install, waitForClose }=require('./flow1-local-demo.cjs').createDemo({browser,base,apiPort,output,actor,getOtp:()=>deliveredCode});
    demoInstall=install;
    const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await installDemo(ctx);const panel=await ctx.newPage();await panel.goto(base+'/__flow1_demo/');await panel.screenshot({path:path.join(output,'demo-panel.png'),fullPage:true});
    fs.writeFileSync(path.join(output,'demo-running.json'),JSON.stringify({url:base+'/__flow1_demo/',mode:'LOCAL FIXTURE ONLY',ready:true}));
    if(!demoCheck){await waitForClose();return;}
  }
  let customer=await actor('CUSTOMER');diagnosticPage=customer;
  const manager=await actor('LOGISTICS_MANAGER');
  async function mutate(p,label,ends) {const response=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith(ends),{timeout:120000});await p.getByRole('button',{name:label,exact:true}).click();const r=await response;if(!r.ok())throw new Error('Mutation '+ends+': '+await r.text());await p.waitForTimeout(250);console.log('Checked '+ends);fs.appendFileSync(path.join(output,'steps.log'),ends+'\n');return (await r.json()).data;}
  const days=(n)=>new Date(Date.now()+n*86400000+7*3600000).toISOString().slice(0,16);
  await customer.goto(base+'/customer/horses');
  const add=customer.locator('form').last();
  await add.locator('[name=name]').fill('Relational Browser Horse');await add.locator('[name=chip]').fill('900000000000001');await add.locator('[name=passport]').fill('FEI_BROWSER');await add.locator('[name=breed]').fill('Thoroughbred');await add.locator('[name=weight]').fill('450');await add.locator('[name=dob]').fill('2020-01-01');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64');
  for(const name of ['photo','passportScan'])await add.locator('[name='+name+']').setInputFiles({name:name+'.png',mimeType:'image/png',buffer:png});
  await mutate(customer,'Lưu hồ sơ ngựa','/customer/horses');await customer.getByText(/Relational Browser Horse ·/).first().waitFor();
  // Start the new booking journey as a guest, retaining the landing route through real UI login.
  const booking=await browser.newContext({viewport:{width:1440,height:1100}});
  if(localDemo)await installDemo(booking);
  customer=await booking.newPage();diagnosticPage=customer;customer.setDefaultTimeout(120000);
  let bookingSlots=[];await customer.route(base+'/api/**',async route=>{const now=Date.now();bookingSlots=bookingSlots.filter(t=>t>now-61000);const at=bookingSlots.length>=24?Math.max(now,bookingSlots[bookingSlots.length-24]+61000):now;bookingSlots.push(at);if(at>now)await delay(at-now);await route.continue();});
  customer.on('pageerror',e=>errors.push(e.message));
  await customer.goto(base+'/');await customer.getByLabel('Điểm đi',{exact:true}).selectOption('Ho Chi Minh City');await customer.getByLabel('Điểm đến',{exact:true}).selectOption(air?'Tokyo':'Hanoi');
  await customer.getByText('VND · giá demo tham khảo',{exact:true}).waitFor();await customer.screenshot({path:path.join(output,'integrated-landing.png'),fullPage:true});
  await customer.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await customer.waitForURL('**/login?next=flow1');
  await customer.getByLabel('Email',{exact:true}).fill('browser-owner@example.invalid');await customer.getByLabel('Mật khẩu',{exact:true}).fill('Flow1_Native_Fixture_Only_2026!');await customer.getByRole('button',{name:'Đăng nhập',exact:true}).click();await customer.waitForURL('**/customer/create-request');
  await customer.getByText('Ho Chi Minh City → '+(air?'Tokyo':'Hanoi'),{exact:true}).waitFor();
  await customer.getByLabel('Khởi hành (giờ Việt Nam)',{exact:true}).fill(days(20));await customer.getByLabel('Hạn giao (giờ Việt Nam)',{exact:true}).fill(days(21));await customer.getByLabel('Mục đích',{exact:true}).fill('Browser demo');await customer.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  for(const [legend,address] of [[air?'Sân bay đi (Việt Nam)':'Điểm lấy ngựa (Việt Nam)','Điểm lấy demo'],[air?'Sân bay đến (Nhật Bản)':'Điểm giao ngựa','Điểm giao demo']]){const f=customer.getByRole('group',{name:legend,exact:true});await f.getByLabel('Địa chỉ',{exact:true}).fill(address);await f.getByRole('button',{name:'Tìm địa điểm',exact:true}).click();await f.getByRole('button',{name:address+' (fixture)',exact:true}).click();}
  for(const [label,value]of Object.entries({'Người bàn giao':'Sender','SĐT bàn giao':'0900000000','Người nhận':'Receiver','SĐT người nhận':'0900000001'}))await customer.getByLabel(label,{exact:true}).fill(value);
  await customer.getByRole('button',{name:'Tiếp tục',exact:true}).click();await customer.getByRole('checkbox',{name:/Relational Browser Horse/}).check();await customer.getByRole('button',{name:'Tiếp tục',exact:true}).click();
  await customer.getByRole('checkbox',{name:'Tôi xác nhận thông tin và hồ sơ đã chọn.',exact:true}).check();await customer.screenshot({path:path.join(output,'integrated-wizard-step4.png'),fullPage:true});
  const created=await mutate(customer,'Gửi yêu cầu','/customer/requests');const id=created.requestId;await customer.waitForURL('**/customer/requests/'+id);
  await manager.goto(base+'/manager/requests');await manager.getByRole('link',{name:'Xem / xử lý',exact:true}).first().waitFor();await manager.screenshot({path:path.join(output,'integrated-manager-inbox.png'),fullPage:true});
  await manager.goto(base+'/manager/requests/'+id);await manager.locator('[name=reviewReason]').fill('Please clarify purpose');await mutate(manager,'Yêu cầu sửa','/request-changes');
  await customer.reload();await customer.getByRole('link',{name:'Sửa rồi gửi lại',exact:true}).click();await customer.locator('[name=purpose]').fill('Updated browser demo');await mutate(customer,'Gửi yêu cầu','/revision');await customer.waitForURL('**/customer/requests/'+id);
  await manager.reload();await manager.locator('[name=reviewReason]').fill('Accepted');await mutate(manager,'Chấp nhận','/accept');
  await manager.locator('[name=price]').fill('100000000');await manager.locator('[name=prep]').fill(air?'7':'2');await manager.locator('[name=deadline]').fill(days(2));const draft=await mutate(manager,'Tạo Draft','/contracts');
  const published=await mutate(manager,'Phát hành PDF','/publish');const hash=published.pdfSha256;
  // Extension keeps original immutable PDF. No SMTP yet, so the real cooldown is unaffected.
  const extend=manager.locator('form').filter({has:manager.locator('[name=deadline]')}).last();await extend.locator('[name=deadline]').fill(days(3));await extend.locator('[name=reason]').fill('Signing extension fixture');await mutate(manager,'Gia hạn ký','/extend');
  await customer.reload();const pdfEvent=customer.waitForEvent('download');await customer.getByRole('button',{name:'Xem / tải đúng PDF',exact:true}).click();const pdf=path.join(output,'typed-contract.pdf');await(await pdfEvent).saveAs(pdf);
  const crypto=require('node:crypto');if(crypto.createHash('sha256').update(fs.readFileSync(pdf)).digest('hex')!==hash)throw new Error('PDF mismatch');
  await mutate(customer,'Gửi OTP qua email','/otp');for(let i=0;i<50&&!deliveredCode;i++)await delay(100);if(!deliveredCode)throw new Error('Loopback SMTP did not receive OTP');
  await customer.getByLabel('OTP xác nhận',{exact:true}).fill(deliveredCode);const signed=await mutate(customer,'Xác nhận hợp đồng','/sign');await customer.getByRole('status').filter({hasText:'Biên nhận xác nhận OTP'}).waitFor();
  await manager.reload();const ext=manager.locator('form').filter({has:manager.locator('[name=deadline]')}).last();await ext.locator('[name=deadline]').fill(days(2));await ext.locator('[name=reason]').fill('Deposit extension fixture');await mutate(manager,'Gia hạn cọc','/extend');
  // Retain customer cancellation/rejection in browser before money is received.
  await customer.reload();
  const cancel=customer.locator('form').filter({has:customer.getByRole('button',{name:'Đề nghị hủy',exact:true})});await cancel.locator('[name=reason]').fill('Customer asks to cancel');await mutate(customer,'Đề nghị hủy','/cancellation/request');
  await manager.reload();const reject=manager.locator('form').filter({has:manager.getByRole('button',{name:'Từ chối đề nghị hủy',exact:true})});await reject.locator('[name=reason]').fill('Continue after customer agreement');await mutate(manager,'Từ chối đề nghị hủy','/cancellation/reject');
  await customer.reload();let gatewayUrl='';let demoAction='';if(demoCheck)customer.on('request',r=>{if(r.url().startsWith('https://sandbox.vnpayment.vn/'))gatewayUrl=r.url();});else await customer.route('https://sandbox.vnpayment.vn/**',route=>{gatewayUrl=route.request().url();return route.fulfill({status:200,contentType:'text/html',body:'<h1>Intercepted local sandbox redirect; no provider request sent</h1>'});});
  await customer.getByRole('button',{name:'Thanh toán qua VNPay',exact:true}).waitFor({timeout:15000});await customer.screenshot({path:path.join(output,'before-vnpay.png'),fullPage:true});const sessionResponse=customer.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/vnpay'));await customer.getByRole('button',{name:'Thanh toán qua VNPay',exact:true}).click();const response=await sessionResponse;if(!response.ok())throw new Error('VNPay session rejected '+response.status());for(let i=0;i<50&&!gatewayUrl;i++)await delay(100);if(!gatewayUrl)throw new Error('VNPay redirect missing');const pid=new URL(gatewayUrl).searchParams.get('vnp_TxnRef');if(!pid)throw new Error('VNPay reference missing');if(demoCheck){await customer.getByRole('heading',{name:'Thanh toán mô phỏng',exact:true}).waitFor({timeout:15000});demoAction=await customer.locator('form').filter({has:customer.getByRole('button',{name:'Gửi IPN thành công',exact:true})}).getAttribute('action');}
  // ReturnURL alone cannot allocate or create Trip.
  await customer.goto(base+'/customer/payments/return?vnp_TxnRef='+pid+'&vnp_ResponseCode=00');await customer.getByText(/Đã xác minh 0/).waitFor();
  const values={vnp_TmnCode:'TEST2026',vnp_TxnRef:pid,vnp_TransactionNo:'987654321',vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_Amount:'4000000000',vnp_PayDate:new Date(Date.now()+7*3600000).toISOString().slice(0,19).replace(/[-T:]/g,''),vnp_BankCode:'NCB'};
  const canonical=new URLSearchParams(Object.entries(values).sort(([a],[b])=>a.localeCompare(b))).toString();const signature=crypto.createHmac('sha512','Sandbox_Unit_Test_Key_Not_A_Provider_Credential').update(canonical).digest('hex');const ipnUrl=`http://127.0.0.1:${apiPort}/api/payments/vnpay/ipn?${canonical}&vnp_SecureHash=${signature}`;
  if(demoCheck){
    await customer.goto(base+'/__flow1_demo/otp');await customer.getByText('Mã mới nhất:',{exact:false}).waitFor();
    await customer.evaluate(action=>{const f=document.createElement('form');f.method='post';f.action=action;document.body.append(f);f.submit();},demoAction);
    await customer.getByRole('heading',{name:'Backend đã nhận IPN mô phỏng',exact:true}).waitFor();await customer.getByText(/RspCode: 00/).waitFor();
    await customer.getByRole('button',{name:'Gửi lại cùng IPN để kiểm tra chống trùng',exact:true}).click();await customer.getByText(/RspCode: 02/).waitFor();
    await customer.getByRole('link',{name:'Quay về ứng dụng',exact:true}).click();await customer.getByText(/Đã xác minh 40.000.000/).waitFor();
  }else{const first=await(await fetch(ipnUrl)).json();const retry=await(await fetch(ipnUrl)).json();if(first.RspCode!=='00'||retry.RspCode!=='02')throw new Error('IPN allocation/retry failed');}
  await customer.goto(base+'/customer/requests/'+id);await customer.getByRole('button',{name:/Thông báo/}).click();await customer.getByRole('heading',{name:'Yêu cầu đã được kích hoạt',exact:true}).waitFor();
  await manager.reload();await manager.locator('[name=reason]').last().fill('Ready for operation');let confirmed=await mutate(manager,'confirm','/deployment/confirm');const oldEvent=confirmed.trip.eventId;
  const routing=await actor('FLEET_ROUTE_COORDINATOR');await routing.goto(base+'/coordinator/flow1-work');await mutate(routing,'Xác nhận nhận bàn giao','/ack');
  await manager.reload();await manager.locator('[name=reason]').last().fill('Hold for readiness');await mutate(manager,'hold','/deployment/hold');await routing.getByRole('button',{name:'Tải lại bàn giao',exact:true}).click();await routing.getByRole('button',{name:'Xác nhận nhận bàn giao',exact:true}).waitFor({state:'detached'});
  await manager.locator('[name=reason]').last().fill('Resume checks');await mutate(manager,'resume','/deployment/resume');await manager.locator('[name=reason]').last().fill('Reconfirmed readiness');confirmed=await mutate(manager,'confirm','/deployment/confirm');if(confirmed.trip.eventId===oldEvent)throw new Error('Old handoff event reused');
  await routing.getByRole('button',{name:'Tải lại bàn giao',exact:true}).click();await mutate(routing,'Xác nhận nhận bàn giao','/ack');
  const specialist=await actor('TRANSPORT_SPECIALIST');await specialist.goto(base+'/specialist/flow1-work');await mutate(specialist,'Xác nhận nhận bàn giao','/ack');const opsPdf=specialist.waitForEvent('download');await specialist.getByRole('button',{name:'PDF hợp đồng · '+hash,exact:true}).click();const pdf2=path.join(output,'typed-ops-contract.pdf');await(await opsPdf).saveAs(pdf2);if(crypto.createHash('sha256').update(fs.readFileSync(pdf2)).digest('hex')!==hash)throw new Error('Ops PDF differs');
  await manager.reload();await manager.getByRole('heading',{name:'Chuyến '+confirmed.trip.tripId,exact:true}).waitFor();await manager.getByText('Coordinator: browser-route · Specialist: browser-docs',{exact:true}).waitFor();await manager.screenshot({path:path.join(output,'typed-manager.png'),fullPage:true});await specialist.screenshot({path:path.join(output,'typed-handoff.png'),fullPage:true});await customer.goto(base+'/customer/requests/'+id);await customer.getByRole('heading',{name:'Chuyến '+confirmed.trip.tripId,exact:true}).waitFor();await customer.screenshot({path:path.join(output,'typed-customer.png'),fullPage:true});
  if(errors.length)throw new Error('Browser errors: '+errors.join('; '));
  fs.writeFileSync(path.join(output,'typed-result.json'),JSON.stringify({requestId:id,contractId:draft.contractId,paymentId:pid,tripId:confirmed.trip.tripId,pdfSha256:hash,signedAt:signed.signedAt,route:air?'AIR VN-JP airport-to-airport; ground legs excluded':'ROAD VN-VN',mode:'native003+006; loopback maps/SMTP; locally signed IPN fixture; no live provider',checks:['landing demo VND40%; guest UI login preserves route; real four-step wizard; manager list; activation notification','real hashed-password login; dev bypass rejected','A1 request-changes/resubmit','direct quote','real PDF','sign/deposit extension','OTP/sign/invoice','cancel/reject','ReturnURL read only','IPN retry','one Trip','hold/resume/reconfirm','both current acknowledgements','ops PDF hash']},null,2));
  console.log('PASS typed connected Chrome use cases; original PDF '+hash);
  if(demoCheck)fs.writeFileSync(path.join(output,'demo-smoke.json'),JSON.stringify({passed:true,simulatorSignatureVerified:true,otpRamPanel:true,returnAloneUnpaid:true,ipnSuccessAndRetry:true,noLiveProvider:true}));
}
main().catch(async e=>{if(diagnosticPage&&!diagnosticPage.isClosed())try{await diagnosticPage.screenshot({path:path.join(output,'failed-masked.png'),fullPage:true,mask:[diagnosticPage.locator('input'),diagnosticPage.locator('code')]});}catch{}let message=e.stack||String(e);for(const s of sensitiveValues)message=message.split(s).join('[REDACTED OTP]');console.error(message);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(vite)vite.kill();fixture.close();for(const s of smtpSockets)s.destroy();smtp.close();});
