// Backend-only connected acceptance: real JWT, Kestrel, Swagger, SQL, PDF, RAM SMTP,
// local map HTTP fixtures and signed local VNPay callbacks. Never a real payment.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const [fixtureFile,moduleDir,out]=process.argv.slice(2);
const {chromium}=require(moduleDir);const fixture=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
if(!/^RaceHorseFlow1Swagger_[a-f0-9]{32}$/.test(fixture.database))throw Error('Refusing non-fixture database');
fs.mkdirSync(out,{recursive:true});const root=process.cwd(),results=[];let deliveredCode='',api,browser;const sockets=new Set();
const smtp=net.createServer(s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));s.on('error',()=>{});s.write('220 local RAM test sink\r\n');let buf='',data=false,msg='';s.on('data',chunk=>{buf+=chunk.toString();let i;while((i=buf.indexOf('\r\n'))>=0){const line=buf.slice(0,i);buf=buf.slice(i+2);if(data){if(line!=='.'){msg+=line+'\r\n';continue;}const plain=msg.replace(/=\r\n/g,'').replace(/=([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));deliveredCode=/Confirmation code: ([0-9]{6})/.exec(plain)?.[1]||'';msg='';data=false;s.write('250 OK\r\n');}else if(/^EHLO|^HELO|^MAIL FROM|^RCPT TO|^RSET/i.test(line))s.write('250 OK\r\n');else if(/^DATA$/i.test(line)){data=true;s.write('354 Continue\r\n');}else if(/^QUIT$/i.test(line))s.end('221 Bye\r\n');else s.write('502 unsupported\r\n');}});});
const maps=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(u.pathname==='/reverse'?{address:{country_code:'vn'}}:u.pathname.startsWith('/route/')?{code:'Ok',routes:[{distance:100000,duration:3600}]}:[{display_name:(u.searchParams.get('q')||'Address')+' (LOCAL FIXTURE)',lat:'10.8',lon:'106.6',address:{country_code:'vn'}}]));});
const delay=ms=>new Promise(r=>setTimeout(r,ms));async function listen(s){await new Promise(r=>s.listen(0,'127.0.0.1',r));return s.address().port;}
const tokens={};const traffic=new Map();
async function pace(role){const now=Date.now();const old=(traffic.get(role)||[]).filter(t=>t>now-61000);if(old.length>=24)await delay(old[0]+61000-now);old.push(Date.now());traffic.set(role,old);}
let base;
async function call(role,method,url,body,expect=200,key){await pace(role);const headers={};if(tokens[role])headers.Authorization='Bearer '+tokens[role];if(key)headers['Idempotency-Key']=key;if(body!==undefined && !(body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(base+url,{method,headers,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});const text=await response.text();results.push({method,url,status:response.status,expected:expect});if(response.status!==expect)throw Error(method+' '+url+' expected '+expect+', received '+response.status+': '+text.slice(0,700));if(!text)return;try{const j=JSON.parse(text);return j.data??j;}catch{return text;}}
const check=(c,m)=>{if(!c)throw Error(m);};
async function main(){
 const smtpPort=await listen(smtp),mapPort=await listen(maps);const reserve=net.createServer();const port=await listen(reserve);await new Promise(r=>reserve.close(r));base='http://127.0.0.1:'+port;
 const env={...process.env,ASPNETCORE_ENVIRONMENT:'Development',ASPNETCORE_URLS:base,ConnectionStrings__DefaultConnection:fixture.connection,
 Jwt__Key:'Swagger_Fixture_Only_JWT_Key_AtLeast32Bytes_2026',Jwt__Issuer:'SwaggerFixture',Jwt__Audience:'SwaggerFixture',
 Flow1__Maps__Provider:'OSM',Flow1__Maps__DataProvider:'OSM',Flow1__Maps__GeocodingBaseUrl:`http://127.0.0.1:${mapPort}`,Flow1__Maps__RoutingBaseUrl:`http://127.0.0.1:${mapPort}`,Flow1__Maps__MayPersistResults:'true',Flow1__Maps__UserAgent:'RaceHorse-Swagger-Fixture/1.0',Flow1__Estimate__StandardVehicleCapacityStalls:'1',
 Flow1__PrivateFiles__Root:path.join(out,'private'),Flow1__LegacyImport__SourceRoot:path.join(out,'empty-legacy'),Flow1__Contracts__WorkRoot:path.join(out,'pdf-work'),Flow1__Contracts__BrowserExecutablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
 Flow1__Contracts__OtpHmacKey:'Swagger_Fixture_Only_Contract_Otp_Key_2026_AtLeast32Bytes',Flow1__Contracts__Email__AllowDevelopmentLoopback:'true',Flow1__Contracts__Email__Smtp__Host:'127.0.0.1',Flow1__Contracts__Email__Smtp__Port:String(smtpPort),Flow1__Contracts__Email__Smtp__EnableSsl:'false',Flow1__Contracts__Email__Smtp__Username:'',Flow1__Contracts__Email__Smtp__Password:'',Flow1__Contracts__Email__Smtp__From:'noreply@example.invalid',
 Flow1__Vnpay__Enabled:'true',Flow1__Vnpay__TmnCode:'TEST2026',Flow1__Vnpay__HashSecret:'SwaggerFixture_Only_Vnpay_Secret',Flow1__Vnpay__PaymentUrl:'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',Flow1__Vnpay__ReturnUrl:base+'/swagger',RegistrationEmail__Mode:'Development'};
 for(const k of ['COMPANY_NAME','COMPANY_ADDRESS','COMPANY_EMAIL','COMPANY_HOTLINE','COMPANY_TAX_CODE','COMPANY_BANK_ACCOUNT','COMPANY_BANK_NAME','COMPANY_REPRESENTATIVE','COMPANY_REP_POSITION'])env['Flow1__Contracts__Issuer__'+k]='DEMO FIXTURE '+k;
 api=spawn('dotnet',[path.join(root,'backend/WebApi/bin/Debug/net8.0/WebApi.dll')],{cwd:path.join(root,'backend/WebApi'),env,windowsHide:true,stdio:['ignore','pipe','pipe']});const log=fs.createWriteStream(path.join(out,'api.log'));api.stdout.pipe(log);api.stderr.pipe(log);
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(base+'/swagger/v1/swagger.json')).ok){ready=true;break;}}catch{}await delay(200);}check(ready,'Swagger did not start');
 const spec=await (await fetch(base+'/swagger/v1/swagger.json')).json();check(Object.keys(spec.paths).length>20,'OpenAPI routes missing');
 for(const role of ['customer','other','manager','manager2','specialist','coordinator','specialist2','coordinator2'])tokens[role]=(await call(role,'POST','/api/Auth/login',{email:role+'@swagger.example.invalid',password:'SwaggerFixture123!'})).accessToken;
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await page.goto(base+'/swagger/index.html');await page.waitForSelector('.swagger-ui .opblock');
 await page.screenshot({path:path.join(out,'swagger-loaded.png'),fullPage:true});
 // Exercise the real Swagger Try-it-out widget, not just an HTTP client.
 await page.evaluate(token=>window.ui.preauthorizeApiKey('Bearer','Bearer '+token),tokens.manager);
 const clausesBlock=page.locator('.opblock-get').filter({has:page.locator('[data-path="/api/manager/clauses"]')});await clausesBlock.locator('.opblock-summary').click();await clausesBlock.getByRole('button',{name:'Try it out'}).click();await clausesBlock.getByRole('button',{name:'Execute',exact:true}).click();await clausesBlock.locator('.responses-inner .response-col_status').filter({hasText:'200'}).first().waitFor();await page.screenshot({path:path.join(out,'swagger-execute-clauses.png'),fullPage:true});
 await call('other','GET','/api/manager/clauses',undefined,403);await call('anonymous','GET','/api/customer/requests',undefined,401);
 const clause=await call('manager','POST','/api/manager/clauses',{title:'Điều kiện giao nhận',content:'Ngựa được vận chuyển theo lịch, địa điểm và giá hai bên đã thống nhất.',languageCode:'VI',isActive:true});
 await call('manager','PUT','/api/manager/clauses/'+clause.clauseId,{title:clause.title,content:clause.content,languageCode:'VI',isActive:true});
 const dep=new Date(Date.now()+35*86400000),delivery=new Date(+dep+86400000);const trip={pickup:{address:'Điểm đón thử nghiệm',lat:10.8,lng:106.6,country:'VN'},delivery:{address:'Điểm giao thử nghiệm',lat:11.2,lng:107,country:'VN'},preferredTransportMode:'ROAD',horseCount:1,desiredDepartureDate:dep.toISOString().slice(0,10)};
 await call('anonymous','GET','/api/public/estimates/transport-modes');await call('customer','GET','/api/customer/locations/search?address=Test&country=VN');await call('customer','POST','/api/customer/estimates',trip);
 const form=new FormData();form.set('payload',JSON.stringify({name:'Swagger Horse',microchipIso:'123456789012345',feiPassportNo:'SWAGGER-001',breed:'Thoroughbred',sex:'GELDING',weight:450,dob:'2020-01-01'}));form.set('photo',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'horse.png');form.set('passportScan',new Blob([Buffer.from('%PDF-1.4\nSwagger passport fixture\n%%EOF')],{type:'application/pdf'}),'passport.pdf');
 const horse=await call('customer','POST','/api/customer/horses',form,200,'swagger-horse-key');await call('customer','GET','/api/customer/horses/selectable');
 let r=await call('customer','POST','/api/customer/requests',{trip,departureAt:dep.toISOString(),deliveryAt:delivery.toISOString(),purpose:'Race',pickupContact:{name:'Sender',phone:'0900000000'},receiver:{name:'Receiver',phone:'0900000001'},horses:[{horseId:horse.horseId,version:horse.version}]},200,'swagger-request-key');
 await call('manager','GET','/api/manager/requests');r=await call('manager','POST',`/api/manager/requests/${r.requestId}/claim`,{version:r.version});await call('manager2','POST',`/api/manager/requests/${r.requestId}/claim`,{version:r.version},409);
 r=await call('manager','POST',`/api/manager/requests/${r.requestId}/accept`,{version:r.version,reason:'Reviewed complete request'});
 let c=await call('manager','POST',`/api/manager/requests/${r.requestId}/contracts`,{version:r.version,price:100000000,preparationDays:2},200,'swagger-contract-key');
 c=await call('manager','POST',`/api/manager/contracts/${c.contractId}/publish`,{version:c.version,clauseIds:[clause.clauseId]});
 const pdf=await fetch(base+`/api/customer/contracts/${c.contractId}/pdf`,{headers:{Authorization:'Bearer '+tokens.customer}});check(pdf.ok,'Issued PDF unavailable');const pdfBytes=Buffer.from(await pdf.arrayBuffer());check(crypto.createHash('sha256').update(pdfBytes).digest('hex')===c.pdfSha256,'PDF hash differs');fs.writeFileSync(path.join(out,'issued-contract.pdf'),pdfBytes);
 await call('customer','POST',`/api/customer/contracts/${c.contractId}/otp`,{version:c.version,pdfSha256:c.pdfSha256},409);
 c=await call('customer','POST',`/api/customer/contracts/${c.contractId}/feedback`,{version:c.version,feedbackMessage:'Đề nghị giảm giá và đổi ngày đón/giao',fields:['PRICE','DEPARTURE_AT','DELIVERY_AT']});
 await call('manager','GET','/api/flow1/notifications');c=await call('manager','POST',`/api/manager/contracts/${c.contractId}/reissue`,{version:c.version,price:95000000,preparationDays:2,departureAt:new Date(+dep+2*86400000).toISOString(),deliveryAt:new Date(+delivery+2*86400000).toISOString(),clauseIds:[clause.clauseId],reason:'Agreed feedback'});
 const session=await call('customer','POST',`/api/customer/contracts/${c.contractId}/vnpay`,{},200,'swagger-vnpay-key');
 const local=new Date(Date.now()+7*3600000).toISOString().replace(/[-:T]/g,'').slice(0,14);const values={vnp_TmnCode:'TEST2026',vnp_TxnRef:session.paymentId,vnp_TransactionNo:'12345678',vnp_ResponseCode:'00',vnp_TransactionStatus:'00',vnp_Amount:'3800000000',vnp_PayDate:local,vnp_BankCode:'NCB'};const qs=new URLSearchParams(Object.entries(values).sort(([a],[b])=>a.localeCompare(b))).toString();const hash=crypto.createHmac('sha512','SwaggerFixture_Only_Vnpay_Secret').update(qs).digest('hex');
 check((await call('anonymous','GET','/api/payments/vnpay/ipn?'+qs+'&vnp_SecureHash='+hash)).RspCode==='00','IPN rejected');check((await call('anonymous','GET','/api/payments/vnpay/ipn?'+qs+'&vnp_SecureHash='+hash)).RspCode==='02','Duplicate IPN not deduplicated');
 c=await call('customer','GET',`/api/customer/contracts/${c.contractId}`);check(c.status==='PENDING_SIGNATURE'&&!c.trip,'Payment activated before signing');await call('customer','POST',`/api/customer/contracts/${c.contractId}/otp`,{version:c.version,pdfSha256:c.pdfSha256});check(/^\d{6}$/.test(deliveredCode),'RAM SMTP did not receive OTP');c=await call('customer','GET',`/api/customer/contracts/${c.contractId}`);c=await call('customer','POST',`/api/customer/contracts/${c.contractId}/sign`,{version:c.version,pdfSha256:c.pdfSha256,otp:deliveredCode});deliveredCode='';check(c.status==='EFFECTIVE'&&c.trip,'Signing failed to activate');
 await call('manager','GET','/api/manager/staff/operational');c=await call('manager','POST',`/api/manager/contracts/${c.contractId}/deployment/confirm`,{version:c.trip.version,reason:'Ready for assigned staff',assignedSpecialistId:'specialist',assignedCoordinatorId:'coordinator'});
 check((await call('coordinator','GET','/api/operations/flow1/trips')).length===1,'Assigned queue missing');check((await call('coordinator2','GET','/api/operations/flow1/trips')).length===0,'Unassigned queue leaked');await call('specialist2','GET',`/api/operations/flow1/trips/${c.trip.tripId}/pdf?eventId=${c.trip.eventId}`,undefined,403);
 await call('coordinator','POST',`/api/operations/flow1/trips/${c.trip.tripId}/ack`,{version:c.trip.version,eventId:c.trip.eventId});await call('customer','GET','/api/flow1/notifications');await call('customer','GET',`/api/customer/payments/${session.paymentId}/status`);
 // Additional request/feedback/cancellation branches use the same horse on disjoint future dates.
 await call('customer','GET',`/api/customer/requests/${r.requestId}`);
 await call('manager','GET',`/api/manager/requests/${r.requestId}`);
 await call('manager','GET',`/api/manager/contracts/${c.contractId}`);
 await call('manager','GET',`/api/manager/contracts/${c.contractId}/pdf`);
 await call('customer','GET',`/api/customer/horses/${horse.horseId}/files/photo`);
 await call('manager','GET',`/api/manager/requests/${r.requestId}/horses/${horse.horseId}/files/passport`);
 await call('specialist','GET',`/api/operations/flow1/trips/${c.trip.tripId}/pdf?eventId=${c.trip.eventId}`);
 await call('specialist','GET',`/api/operations/flow1/trips/${c.trip.tripId}/horses/${horse.horseId}/files/passport?eventId=${c.trip.eventId}`);
 const handoff=(await call('specialist','GET','/api/operations/flow1/trips'))[0];
 await call('specialist','POST',`/api/operations/flow1/trips/${c.trip.tripId}/ack`,{version:handoff.trip.version,eventId:handoff.trip.eventId});
 const notices=await call('customer','GET','/api/flow1/notifications');check(notices.length>0,'No customer notices');
 await call('customer','POST',`/api/flow1/notifications/${notices[0].id}/read`);
 async function newRequest(offset,key){const d=new Date(+dep+offset*86400000),e=new Date(+d+86400000);return await call('customer','POST','/api/customer/requests',{trip:{...trip,desiredDepartureDate:d.toISOString().slice(0,10)},departureAt:d.toISOString(),deliveryAt:e.toISOString(),purpose:'Race',pickupContact:{name:'Sender',phone:'0900000000'},receiver:{name:'Receiver',phone:'0900000001'},horses:[{horseId:horse.horseId,version:horse.version}]},200,key);}
 let revision=await newRequest(90,'swagger-revision');
 revision=await call('manager','POST',`/api/manager/requests/${revision.requestId}/request-changes`,{version:revision.version,reason:'Confirm receiver phone'});
 const reviseInput={...revision.input,receiver:{...revision.input.receiver,phone:'0900000002'}};
 revision=await call('customer','POST',`/api/customer/requests/${revision.requestId}/revision`,{version:revision.version,input:reviseInput},200,'swagger-revision-save');
 await call('manager','POST',`/api/manager/requests/${revision.requestId}/reject`,{version:revision.version,reason:'Requested capacity unavailable'});
 let rr=await newRequest(180,'swagger-refund-request');rr=await call('manager','POST',`/api/manager/requests/${rr.requestId}/accept`,{version:rr.version});
 let refund=await call('manager','POST',`/api/manager/requests/${rr.requestId}/contracts`,{version:rr.version,price:100000000,preparationDays:2},200,'swagger-refund-contract');
 refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/publish`,{version:refund.version,clauseIds:[clause.clauseId]});
 refund=await call('customer','POST',`/api/customer/contracts/${refund.contractId}/feedback`,{version:refund.version,feedbackMessage:'Could the price be lower?',fields:['PRICE']});
 refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/feedback/reject`,{version:refund.version,reason:'Price includes all transport services'});
 refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/extend`,{version:refund.version,reason:'Customer needs more time',deadline:new Date(Date.now()+26*3600000).toISOString()});
 refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/withdraw`,{version:refund.version,reason:'Withdraw before a fresh publication'});
 refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/reissue`,{version:refund.version,price:100000000,preparationDays:2,departureAt:rr.departureAt,deliveryAt:rr.deliveryAt,clauseIds:[clause.clauseId],reason:'Confirm unchanged terms'});
 const pay=await call('customer','POST',`/api/customer/contracts/${refund.contractId}/vnpay`,{},200,'swagger-refund-payment');
 const rv={...values,vnp_TxnRef:pay.paymentId,vnp_TransactionNo:'87654321',vnp_Amount:'4000000000',vnp_PayDate:new Date(Date.now()+7*3600000).toISOString().replace(/[-:T]/g,'').slice(0,14)};
 const rq=new URLSearchParams(Object.entries(rv).sort(([a],[b])=>a.localeCompare(b))).toString();const rh=crypto.createHmac('sha512','SwaggerFixture_Only_Vnpay_Secret').update(rq).digest('hex');
 check((await call('anonymous','GET','/api/payments/vnpay/ipn?'+rq+'&vnp_SecureHash='+rh)).RspCode==='00','Refund fixture deposit rejected');
 refund=await call('customer','GET',`/api/customer/contracts/${refund.contractId}`);
 refund=await call('customer','POST',`/api/customer/contracts/${refund.contractId}/cancellation/request`,{version:refund.version,reason:'Cancel before signing'});
 for(const operation of ['approve','refund-start','refund-complete'])refund=await call('manager','POST',`/api/manager/contracts/${refund.contractId}/cancellation/${operation}`,{version:refund.version,cancellationId:refund.cancellationId,reason:'Local fixture refund confirmation',target:operation==='refund-complete'?'FIXTURE-REFUND-001':undefined});
 check(refund.status==='CANCELLED'&&refund.refundStatus==='COMPLETED'&&!refund.trip,'Refund incorrectly activated a trip');
 await call('manager','PUT','/api/manager/clauses/'+clause.clauseId,{title:clause.title,content:clause.content,languageCode:'VI',isActive:false});
 check((await call('manager','GET','/api/manager/clauses?includeInactive=true')).some(x=>x.clauseId===clause.clauseId&&!x.isActive),'Inactive clause missing');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,swagger:base+'/swagger/index.html',checks:results.length,results},null,2));console.log('PASS: '+results.length+' connected API checks and Swagger UI Try-it-out; fixtures only.');
}
main().catch(e=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:false,error:e.message,results},null,2));console.error(e.message);process.exitCode=1;}).finally(async()=>{await browser?.close();api?.kill();for(const s of sockets)s.destroy();smtp.close();maps.close();});
