// Run from any directory after frontend dependencies have been installed.
// Generates source-derived schemas, an endpoint inventory and immutable DTO snapshots.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'frontend/node_modules/typescript'));
const out = path.join(root, 'contracts/API-Flow/Flow1/frontend-first');
fs.mkdirSync(out, { recursive: true });
const file = role => path.join(root, `frontend/src/features/${role}/types/${role}.types.ts`);
const program = ts.createProgram([file('customer'), file('manager')], {strict:true, noEmit:true, skipLibCheck:true, types:[]});
const checker = program.getTypeChecker();
const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCanonicalFileName:f=>f,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
const schemas = {};
function schema(type, trail = new Set()) {
  if (type.flags & ts.TypeFlags.StringLiteral) return {type:'string',const:type.value};
  if (type.flags & ts.TypeFlags.NumberLiteral) return {type:'number',const:type.value};
  if (type.flags & ts.TypeFlags.BooleanLiteral) return {type:'boolean',const:type.intrinsicName === 'true'};
  if (type.flags & ts.TypeFlags.String) return {type:'string'};
  if (type.flags & ts.TypeFlags.Number) return {type:'number'};
  if (type.flags & ts.TypeFlags.Boolean) return {type:'boolean'};
  if (type.flags & ts.TypeFlags.Null) return {type:'null'};
  if (type.isUnion()) {
    const members = type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined));
    if (members.every(t=>t.flags & ts.TypeFlags.StringLiteral)) return {type:'string',enum:members.map(t=>t.value)};
    if (members.length === 1) return schema(members[0],trail);
    return {anyOf:members.map(t=>schema(t,trail))};
  }
  if (checker.isTupleType(type)) {
    const args=checker.getTypeArguments(type);
    return {type:'array',prefixItems:args.map(t=>schema(t,trail)),minItems:args.length,maxItems:args.length};
  }
  if (checker.isArrayType(type)) return {type:'array',items:schema(checker.getTypeArguments(type)[0],trail)};
  if (type.flags & ts.TypeFlags.Object) {
    if (trail.has(type.id)) throw new Error('Recursive type needs named reference: '+checker.typeToString(type));
    const next=new Set(trail).add(type.id);
    const properties={}, required=[];
    for(const prop of checker.getPropertiesOfType(type)) {
      const decl=prop.valueDeclaration || prop.declarations?.[0] || program.getSourceFile(file('manager'));
      try { properties[prop.name]=schema(checker.getTypeOfSymbolAtLocation(prop,decl),next); }
      catch(e) { throw new Error(prop.name+': '+e.message); }
      if (!(prop.flags & ts.SymbolFlags.Optional)) required.push(prop.name);
    }
    const result={type:'object',properties};
    if(required.length) result.required=required;
    const index=checker.getIndexTypeOfType(type,ts.IndexKind.String);
    result.additionalProperties=index ? schema(index,next) : false;
    return result;
  }
  throw new Error('Unsupported type: '+checker.typeToString(type));
}
for(const role of ['customer','manager']) {
  const source=program.getSourceFile(file(role));
  let snapshot=`// Source snapshot, 2026-10-22. Regenerate with contracts/tools/generate_frontend_flow1.cjs\n// Source: frontend/src/features/${role}/types/${role}.types.ts\n`;
  snapshot+=fs.readFileSync(file(role),'utf8');
  fs.writeFileSync(path.join(out,`${role}.types.snapshot.ts`),snapshot);
  for(const stmt of source.statements) {
    if((ts.isInterfaceDeclaration(stmt)||ts.isTypeAliasDeclaration(stmt)) && stmt.name.text !== 'ApiResponse') {
    let value;
    try { value=schema(checker.getTypeAtLocation(stmt)); }
    catch(e) { throw new Error(role+'.'+stmt.name.text+': '+e.message); }
      value['x-typescript-source']=`frontend/src/features/${role}/types/${role}.types.ts#${stmt.name.text}`;
      schemas[`${role}.${stmt.name.text}`]=value;
    }
  }
}
function endpoints(role) {
  const source=fs.readFileSync(path.join(root,`frontend/src/features/${role}/api/${role}Endpoints.ts`),'utf8');
  const exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
  return exports[role==='customer'?'CUSTOMER_ENDPOINTS':'MANAGER_ENDPOINTS'];
}
const E={customer:endpoints('customer'),manager:endpoints('manager')};
const ref=name=>({'$ref':'#/components/schemas/'+name});
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const str={type:'string'}, bool={type:'boolean'};
schemas.ReasonInput=obj({reason:str});
schemas.DocumentMetadataInput=obj({key:ref('customer.DocKey'),scope:str,fileName:str});
schemas.ContractChangeInput=ref('customer.ContractChangeInput');
schemas.SignInput=obj({otp:str});
schemas.RevisionInput=obj({feedback:str,fields:{type:'array',items:ref('manager.RevisionField')}});
schemas.CancellationDecisionInput=obj({approve:bool,note:str});
schemas.ContractResponseInput=obj({decision:{type:'string',enum:['KEPT','RETURNED']},text:str});
schemas.DeploymentInput=obj({specialistId:str,coordinatorId:str});
schemas.NoteInput=obj({note:str});
const operations=[];
function add(role,fn,method,key,input,result,description,group='Flow 1') {
  const endpoint=E[role][key];
  const route=typeof endpoint==='function'?endpoint('{id}'):endpoint;
  operations.push({role,fn,method,path:route,input:input||null,result:result||null,description,group});
}
add('customer','getProfile','get','PROFILE',null,'customer.CustomerProfile','Thông tin để prefill liên hệ.','Bootstrap');
add('customer','getNotifications','get','NOTIFICATIONS',null,'customer.CustomerNotification[]','Thông báo trong layout.','Bootstrap');
add('customer','getHorses','get','HORSES',null,'customer.Horse[]','Ngựa đầy đủ, gồm file metadata và thông tin hộ chiếu.','Bootstrap');
add('customer','createHorse','post','HORSES','customer.HorseInput','customer.Horse','FE gửi HorseInput JSON, chưa upload bytes. Backend trả ID được cấp; FE hiện bỏ response data.');
add('customer','updateHorse','put','HORSE_DETAIL','customer.HorseInput','customer.Horse','Cập nhật hồ sơ theo id ngựa. Giữ kiểm tra quyền và field bị khóa.');
add('customer','getRequests','get','REQUESTS',null,'customer.TransportRequest[]','Trả mảng aggregate đầy đủ, không pagination wrapper.');
add('customer','getRequest','get','REQUEST_DETAIL',null,'customer.TransportRequest','Chi tiết theo request id; client có hàm, page hiện chủ yếu đọc list store.');
add('customer','createRequest','post','REQUESTS','customer.TransportRequest','customer.TransportRequest','Tạo DRAFT ngay từ bước thông tin chuyến; body chứa id tạm FE. Không coi trường trạng thái/tài chính do FE gửi là quyền cập nhật.');
add('customer','saveRequest','put','REQUEST_DETAIL','customer.TransportRequest','customer.TransportRequest','FE gửi toàn bộ aggregate sau nhiều thao tác. BE chỉ áp field thuộc Customer được phép sửa, không ghi đè versions/payments/trip/history/status/owner.');
add('customer','submitRequest','post','SUBMIT_REQUEST',null,'customer.TransportRequest','DRAFT hoặc CHANGES_REQUESTED → PENDING_REVIEW sau validate; body không có.');
add('customer','cancelRequest','post','CANCEL_REQUEST','ReasonInput','customer.TransportRequest','Trước kích hoạt: chưa có tiền → CANCELLED; có tiền chờ/đã xác minh → CANCELLATION_REQUESTED để Manager đối soát.');
add('customer','uploadDocument','post','REQUEST_DOCUMENTS','DocumentMetadataInput',null,'Chỉ đăng ký metadata key/scope/fileName, không phải upload file. Không đánh dấu tài liệu hợp lệ nếu chưa có bytes.');
add('customer','acceptTerms','post','ACCEPT_TERMS',null,'customer.TransportRequest','Phiên bản ISSUED còn hạn → lưu termsAcceptedAt. FE tiếp tục sang đặt cọc.');
add('customer','requestContractChange','post','CONTRACT_CHANGE','customer.ContractChangeInput','customer.TransportRequest','Chưa ký/chưa có tiền; lưu change, Contract CHANGES_REQUESTED, Request CONTRACT_CHANGES_REQUESTED.');
add('customer','sendSignOtp','post','SEND_SIGN_OTP',null,null,'Chỉ sau DEPOSIT_VERIFIED. BE phát OTP thật; không lấy mã cố định demo làm secret hợp lệ. FE hiện chưa dùng TTL/sentTo response.');
add('customer','signContract','post','SIGN_CONTRACT','SignInput','customer.TransportRequest','Theo flow FE: sau cọc VERIFIED, OTP hợp lệ → Contract EFFECTIVE, Request ACTIVATED, một Trip PLANNING. BE thực hiện atomic; FE tự tạo Trip hiện chỉ là mô phỏng.');
add('customer','payDeposit','post','DEPOSIT_PAYMENT',null,'customer.Payment','Không body. BE lấy khoản cọc theo hợp đồng hiện hành đã accept terms; chỉ tạo PROCESSING, không tự SUCCESS. FE hiện chỉ có QR minh họa và không dùng paymentUrl.');
add('manager','getCustomers','get','CUSTOMERS',null,'manager.CustomerInfo[]','Tra Customer bằng customerId khi hiển thị Request.','Bootstrap');
add('manager','getHorses','get','HORSES',null,'manager.HorseRef[]','Tên, breed, microchip, passportNo.','Bootstrap');
add('manager','getStaff','get','STAFF',null,'manager.Staff[]','Danh mục Specialist/Coordinator với load để modal phân công.','Bootstrap');
add('manager','getRequests','get','REQUESTS',null,'manager.TransportRequest[]','Aggregate Manager có customerId/draft/dossier/versions/history. Khác projection Customer.');
add('manager','getTrips','get','TRIPS',null,'manager.Trip[]','Cần cho trang chuyến và liên kết Request→Trip; trường Flow sau trả đúng kiểu khi chưa có dữ liệu.','Bootstrap');
add('manager','getTransactions','get','TRANSACTIONS',null,'manager.Transaction[]','FE lọc cọc/số dư/hoàn tiền ở client. Trả mảng; không chỉ pending.');
add('manager','getNotifications','get','NOTIFICATIONS',null,'manager.ManagerNotification[]','Thông báo layout Manager.','Bootstrap');
add('manager','getIncidents','get','INCIDENTS',null,'manager.Incident[]','loadAll hiện luôn gọi, dù chưa vào màn hình sự cố. Có thể trả mảng rỗng thật khi chưa có dữ liệu.','Bootstrap ngoài Flow 1');
add('manager','getComplaints','get','COMPLAINTS',null,'manager.Complaint[]','Dependency loadAll và tab/detail; hành vi giải quyết thuộc flow sau.','Bootstrap ngoài Flow 1');
add('manager','getActualCosts','get','ACTUAL_COST_LIST',null,'manager.ActualCost[]','Dependency loadAll; CRUD chi phí không thuộc contract Flow 1 này.','Bootstrap ngoài Flow 1');
add('manager','acceptRequest','post','ACCEPT_REQUEST',null,'manager.TransportRequest','PENDING_REVIEW → CONTRACT_PREPARATION.');
add('manager','requestRevision','post','REQUEST_REVISION','RevisionInput','manager.TransportRequest','PENDING_REVIEW → CHANGES_REQUESTED. Body feedback/fields theo FE.');
add('manager','rejectRequest','post','REJECT_REQUEST','ReasonInput','manager.TransportRequest','PENDING_REVIEW hoặc CHANGES_REQUESTED → REJECTED; không đòi reasonGroup vì FE không gửi.');
add('manager','cancelRequest','post','CANCEL_REQUEST','ReasonInput','manager.TransportRequest','Hủy trước ký/activation theo guard; đối soát giao dịch và nghĩa vụ hoàn tiền nếu có, không xóa audit.');
add('manager','decideCancellation','post','CANCELLATION_DECISION','CancellationDecisionInput','manager.TransportRequest','CANCELLATION_REQUESTED; approve hoặc trả prevStatus khi từ chối.');
add('manager','saveContractDraft','put','CONTRACT_DRAFT','manager.ContractDraft','manager.ContractDraft','Lưu draft gộp kế hoạch/giá/điều khoản theo editor FE, chưa phát hành.');
add('manager','issueContract','post','ISSUE_CONTRACT','manager.ContractDraft','manager.ContractVersion','Phát hành version mới ISSUED, Request CONTRACT_READY; BE tính lại total, floor policy; theo FE hạn minh họa +24 giờ.');
add('manager','respondContractChange','post','CONTRACT_CHANGE_RESPONSE','ContractResponseInput','manager.TransportRequest','KEPT: giữ version và gia hạn theo FE; RETURNED: CHANGES_REQUESTED. REVISED đi qua issueContract, không gửi trong endpoint này.');
add('manager','extendContract','post','EXTEND_CONTRACT',null,'manager.ContractVersion','Không body; theo FE gia hạn thêm 24 giờ trên max(hạn hiện tại,now), chỉ chưa ký.');
add('manager','remindSign','post','REMIND_SIGN',null,null,'Gửi nhắc cọc/ký, có audit và giới hạn tần suất; FE không gửi địa chỉ email tùy ý.');
add('manager','verifyTransaction','post','VERIFY_TRANSACTION',null,'manager.Transaction','Không body. Chỉ BANK_TRANSFER pending, sau đối soát thực nhận từ nguồn tin cậy. Đủ cọc: Request DEPOSIT_VERIFIED, chưa tạo Trip. UI hiện chưa thu reference/amount/time đối soát.');
add('manager','rejectTransaction','post','REJECT_TRANSACTION','ReasonInput','manager.Transaction','Từ chối giao dịch chờ, lưu rejectReason; không tự xóa tiền đã xác minh.');
add('manager','confirmRefund','post','CONFIRM_REFUND',null,'manager.Transaction','Phụ thuộc nhánh hủy; không body. Chỉ ghi SUCCESS sau đã kiểm tra hoàn tiền thực tế.');
add('manager','deployTrip','post','DEPLOY_TRIP','DeploymentInput','manager.Trip','Trip PLANNING + NOT_CONFIRMED; lưu Specialist/Coordinator, trạng thái CONFIRMED, tăng workload và tạo task.');
add('manager','holdTrip','post','HOLD_TRIP','ReasonInput','manager.Trip','Theo guard FE chỉ PLANNING; deployment ON_HOLD, lưu holdReason.');
add('manager','resumeTrip','post','RESUME_TRIP',null,'manager.Trip','ON_HOLD → CONFIRMED nếu đủ hai người phụ trách, ngược lại NOT_CONFIRMED.');

const spec={openapi:'3.1.0',info:{title:'Flow 1 — frontend-first compatibility contract',version:'1.0.0-draft',description:'Observed frontend wire requests and TypeScript-derived data schemas, 2026-10-22. Separate compatibility profile from FLOW1 v2.5: frontend takes deposit before OTP signing. NOT implemented backend. Mutation result data is proposed (current FE consumes only success). No claim that current frontend state synchronization works.'},servers:[{url:'http://localhost:5129/api',description:'Target WebApi, endpoints not implemented'}],security:[{bearerAuth:[]}],paths:{},components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}},schemas},'x-profile':'frontend-first','x-date':'2026-10-22'};
schemas.Error=obj({success:{const:false},message:str,data:{type:'null'}},['success','message','data']);
for(const op of operations) {
  const props={success:{type:'boolean',const:true},message:{type:'string'},data:op.result?(op.result.endsWith('[]')?{type:'array',items:ref(op.result.slice(0,-2))}:ref(op.result)):{type:'null'}};
  const dataSchema=obj(props,['success','data']);
  const response={'200':{description:'Success; GET data is observed FE expectation; mutation data is proposed.',content:{'application/json':{schema:dataSchema}}}};
  for(const code of ['400','401','403','404','409','429','500']) response[code]={description:({'400':'Validation failed','401':'JWT missing/invalid','403':'Wrong role','404':'Not found or not owned','409':'State conflict','429':'Rate limit','500':'Internal error'})[code],content:{'application/json':{schema:ref('Error')}}};
  const item={operationId:op.role+'_'+op.fn,tags:[op.role],summary:op.fn,description:op.description,parameters:op.path.includes('{id}')?[{name:'id',in:'path',required:true,schema:{type:'string'}}]:[],responses:response,'x-client-function':`${op.role}Api.${op.fn}`,'x-source-group':op.group,'x-observed-response':op.method==='get','x-implementation-status':'NOT_IMPLEMENTED'};
  if(op.input) item.requestBody={required:true,content:{'application/json':{schema:ref(op.input)}}};
  spec.paths[op.path]??={};
  spec.paths[op.path][op.method]=item;
}
fs.writeFileSync(path.join(out,'flow1.frontend.openapi.json'),JSON.stringify(spec,null,2)+'\n');
let inventory='# Flow 1 — endpoint theo frontend\n\n> `frontend-first` 1.0.0-draft, 22/10/2026. Base `/api`. Request lấy từ API client và hook; schema GET lấy từ types hiện tại. Response data của mutation là đề xuất vì FE chỉ đọc success. Xem [contract](FLOW1-FRONTEND-CONTRACT.md).\n\n| Hàm frontend | Method | Endpoint | Body | data | Nhóm |\n|---|---|---|---|---|---|\n';
for(const op of operations) inventory+=`| ${op.role}Api.${op.fn} | ${op.method.toUpperCase()} | \`${op.path}\` | ${op.input||'Không body'} | ${op.result||'null (đề xuất)'} | ${op.group} |\n`;
fs.writeFileSync(path.join(out,'ENDPOINTS.md'),inventory);
fs.writeFileSync(path.join(out,'operations.json'),JSON.stringify(operations,null,2)+'\n');
// Check source-derived method/path coverage and local refs.
let refs=0;
function validate(value) {
  if(!value||typeof value!=='object')return;
  if(value.$ref) {refs++; if(!schemas[value.$ref.replace('#/components/schemas/','')]) throw new Error('Broken ref '+value.$ref);}
  for(const child of Object.values(value)) validate(child);
}
validate(spec);
const seen=new Set();
for(const op of operations) {
  const key=op.method+' '+op.path;
  if(seen.has(key)) throw new Error('Duplicate operation '+key);
  seen.add(key);
  const api=fs.readFileSync(path.join(root,`frontend/src/features/${op.role}/api/${op.role}Api.ts`),'utf8');
  const ast=ts.createSourceFile('api.ts',api,ts.ScriptTarget.Latest,true);
  let expression;
  function find(node) {
    if(ts.isPropertyAssignment(node)&&node.name.getText(ast)===op.fn) expression=node.initializer.getText(ast);
    ts.forEachChild(node,find);
  }
  find(ast);
  if(!expression) throw new Error('Missing frontend function '+op.fn);
  if(op.method!=='get'&&!expression.includes(`send('${op.method}'`)) throw new Error('Method mismatch '+op.fn);
}
function conforms(value,s) {
  if(s.$ref) return conforms(value,schemas[s.$ref.replace('#/components/schemas/','')]);
  if(s.anyOf) return s.anyOf.some(t=>conforms(value,t));
  if('const' in s&&value!==s.const)return false;
  if(s.enum&&!s.enum.includes(value))return false;
  if(s.type==='null')return value===null;
  if(s.type==='string')return typeof value==='string';
  if(s.type==='number')return typeof value==='number'&&Number.isFinite(value);
  if(s.type==='boolean')return typeof value==='boolean';
  if(s.type==='array') {
    if(!Array.isArray(value))return false;
    if(value.length<(s.minItems||0)||value.length>(s.maxItems??Infinity))return false;
    return value.every((v,i)=>conforms(v,s.prefixItems?s.prefixItems[i]:s.items));
  }
  if(s.type==='object') {
    if(!value||typeof value!=='object'||Array.isArray(value))return false;
    if((s.required||[]).some(k=>!(k in value)))return false;
    return Object.entries(value).every(([k,v])=>k in s.properties?conforms(v,s.properties[k]):s.additionalProperties===false?false:typeof s.additionalProperties==='object'?conforms(v,s.additionalProperties):true);
  }
  return true;
}
let exampleCount=0;
const docPath=path.join(out,'FLOW1-FRONTEND-CONTRACT.md');
if(fs.existsSync(docPath)) {
  const doc=fs.readFileSync(docPath,'utf8');
  for(const match of doc.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    const value=JSON.parse(match[1]);
    const name='success' in value?(value.success?null:'Error'):'wizardStep' in value?'customer.TransportRequest':'budget' in value?'manager.ContractDraft':'proposedDate' in value?'customer.ContractChangeInput':'feedback' in value?'RevisionInput':null;
    if(name&&!conforms(value,schemas[name]))throw new Error('Invalid documented example: '+name);
    exampleCount++;
  }
  for(const match of doc.matchAll(/\]\(([^)]+)\)/g)) {
    const target=match[1].split('#')[0];
    if(target&&!target.includes('://')&&!fs.existsSync(path.resolve(out,target)))throw new Error('Broken doc link '+target);
  }
  const request=JSON.parse([...doc.matchAll(/```json\n([\s\S]*?)\n```/g)].find(m=>m[1].includes('"wizardStep"'))[1]);
  if(conforms({...request,horseCount:'1'},schemas['customer.TransportRequest']))throw new Error('Numeric horseCount type regression');
  if(conforms({...request,status:'PENDING'},schemas['customer.TransportRequest']))throw new Error('Baseline enum leaked into frontend profile');
  if(conforms({specialistId:'SP'},schemas.DeploymentInput))throw new Error('Missing coordinator accepted');
}
console.log(`PASS: ${operations.length} operations, ${Object.keys(spec.paths).length} paths, ${Object.keys(schemas).length} source-derived/manual schemas, ${refs} resolved refs, ${exampleCount} JSON examples. TypeScript DTO diagnostics: 0.`);
console.log('Source/wire validation only. Not a full OpenAPI validator or backend integration test.');
