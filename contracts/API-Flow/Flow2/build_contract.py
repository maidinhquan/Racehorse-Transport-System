"""Generate Flow 2 target contracts; never writes database/backend or application source."""
from pathlib import Path
from copy import deepcopy as cp
import json,re
ROOT=Path(__file__).resolve().parent
MODELS={}; EX={}
def S(value='', limit=2000, minimum=0, enum=None, pattern=None):
 d={'type':'string','maxLength':limit,'minLength':minimum}
 if enum:d['enum']=enum
 if pattern:d['pattern']=pattern
 return d,value
def N(value=1,minimum=0,maximum=9007199254740991):return {'type':'integer','minimum':minimum,'maximum':maximum},value
def B(value=False):return {'type':'boolean'},value
def E(value,*values):return S(value,enum=list(values))
def DATE(value='2026-11-20'):return S(value,10,10,pattern=r'^\d{4}-\d{2}-\d{2}$')
def TIME(value='2026-10-24 09:00'):return S(value,16,16,pattern=r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$')
def ID(prefix,n=1):return S(f'{prefix}_{n:03}',50,1,pattern='^'+prefix+r'_\d{3,}$')
def A(item,values=None,minItems=0):return {'type':'array','items':item[0],'minItems':minItems},[cp(item[1])] if values is None else cp(values)
def O(fields,optional=()):return {'type':'object','properties':{k:v[0] for k,v in fields.items()},'required':[k for k in fields if k not in optional],'additionalProperties':False},{k:cp(v[1]) for k,v in fields.items()}
def NULL(x):return {'anyOf':[x[0],{'type':'null'}]},None
def R(name):return {'$ref':'#/components/schemas/'+name},cp(EX[name])
def model(name,value):MODELS[name]=value[0];EX[name]=value[1];return R(name)
def fields(name):return {k:(v,EX[name][k]) for k,v in MODELS[name]['properties'].items()}
mode=lambda:E('AIR','ROAD','AIR')
country=lambda:E('VN','VN','JP')
tripStatus=lambda:E('PLANNING','PLANNING','READY_TO_DEPART','IN_TRANSIT','COMPLETED')
direction=lambda:E('EXPORT','EXPORT','IMPORT','DOMESTIC')
scope=lambda:E('PER_HORSE','PER_HORSE','PER_TRIP')
docScope=lambda:S('HORSE_001',50,1,pattern=r'^(?:request|HORSE_\d{3,})$')
provider=lambda:E('CUSTOMER','CUSTOMER','CBN')
key=lambda:E('passport','invite','raceReg','ataCarnet','passport','ownership','bio','valueProof','flu','health','conditions','vet')
model('Horse',O({'id':ID('HORSE'),'name':S('Thunderbolt',100,1),'microchip':S('985112004571029',15,15,pattern=r'^\d{15}$'),'passportNo':S('VN-EQ-2020-1029',100)}))
model('RequirementLine',O({'typeId':S('PASSPORT',50,1),'provider':provider(),'scope':scope(),'level':E('REQUIRED','REQUIRED','CONDITIONAL','OPTIONAL'),'stage':E('BEFORE_DEPART','BEFORE_SUBMIT','BEFORE_DEPART','AT_CHECKPOINT'),'condition':S('')}))
model('DocTypeWrite',O({'name':S('Hộ chiếu ngựa',100,1),'group':E('IDENTITY','IDENTITY','MEDICAL','QUARANTINE','CUSTOMS','OTHER'),'scope':scope(),'provider':provider(),'validityDays':NULL(N(365,1,36500)),'status':E('ACTIVE','ACTIVE','RETIRED'),'customerKey':NULL(key())},['customerKey']))
EX['DocTypeWrite']['customerKey']='passport'
model('DocType',O({'id':S('PASSPORT',50,1),**fields('DocTypeWrite')}))
model('RegulationWrite',O({'country':country(),'direction':direction(),'lines':A(R('RequirementLine'),minItems=1),'note':S('Quy định demo nội bộ, chưa xác minh pháp lý'),'status':E('ACTIVE','ACTIVE','RETIRED')}))
model('Regulation',O({'id':S('VN_EXPORT',50,1),'v':N(1,1),'effectiveFrom':DATE('2026-10-24'),**fields('RegulationWrite')}))
pair=({'type':'array','minItems':2,'maxItems':2,'prefixItems':[country()[0],direction()[0]],'items':{}},['VN','EXPORT'])
model('PackageWrite',O({'name':S('Việt Nam → Nhật Bản',200,1),'items':A(pair,[['VN','EXPORT'],['JP','IMPORT']],1),'origin':country(),'dest':E('JP','VN','JP'),'modes':A(mode(),['AIR'],1),'note':S(''),'status':E('ACTIVE','ACTIVE','RETIRED')}))
model('Package',O({'id':S('VN_JP_AIR',50,1),'v':N(1,1),'effectiveFrom':DATE('2026-10-24'),**fields('PackageWrite')}))
model('ReqRule',O({'country':country(),'direction':direction(),'regId':NULL(S('VN_EXPORT',50)),'regV':N(1,1),'lines':A(R('RequirementLine'))},['regV']))
EX['ReqRule']['regId']='VN_EXPORT'
model('ReqSet',O({'pkgId':S('VN_JP_AIR',50,1),'pkgV':N(1,1),'name':S('Việt Nam → Nhật Bản',200),'at':TIME(),'by':ID('USER',5),'rules':A(R('ReqRule'))}))
model('InsuranceWrite',O({'insurer':S('Đơn vị bảo hiểm A',200,1),'policy':S('POL-2026-001',100,1),'validFrom':DATE(),'validTo':DATE('2026-11-22'),'coverage':N(120000000,1),'currency':E('VND','VND')}))
model('Insurance',O({'v':N(1,1),**fields('InsuranceWrite'),'status':E('PENDING','PENDING','VERIFIED'),'checkedBy':NULL(ID('USER',5)),'checkedAt':NULL(TIME())}))
model('ReadyStamp',O({'at':TIME(),'by':ID('USER',5)}))
model('Checkpoint',O({'name':S('Sân bay Narita',200),'type':E('AIRPORT','LAND_BORDER','AIRPORT','QUARANTINE_STATION'),'country':E('JP','VN','JP'),'plannedAt':TIME('2026-11-21 14:00'),'arrivedAt':NULL(TIME()),'clearance':NULL(O({'result':E('PASSED','PASSED','HELD','FAILED'),'at':TIME(),'ref':S('DECISION-001',100),'by':ID('USER',5)}))},['arrivedAt','clearance']))
model('SpecialistTrip',O({'id':ID('TRIP'),'requestId':ID('REQUEST'),'customerName':S('Nguyen Van A',100),'origin':S('Ho Chi Minh City',100),'destination':S('Tokyo',100),'originCountry':country(),'destCountry':E('JP','VN','JP'),'mode':mode(),'status':tripStatus(),'deployment':E('CONFIRMED','NOT_CONFIRMED','CONFIRMED','ON_HOLD'),'plannedDepart':TIME('2026-11-20 08:00'),'eta':TIME('2026-11-21 18:00'),'horses':A(R('Horse'),minItems=1),'reqSet':NULL(R('ReqSet')),'docsReady':NULL(R('ReadyStamp')),'insurance':NULL(R('Insurance')),'checkpoints':A(R('Checkpoint')),'documentSetVersion':N(3)}))
model('CustomerDoc',O({'tripId':ID('TRIP'),'key':key(),'scope':docScope(),'documentVersion':N(1,1),'status':E('SUBMITTED','MISSING','OPTIONAL','SUBMITTED','APPROVED','ACTION_REQUIRED'),'optional':B(False),'file':S('/api/specialist/trips/TRIP_001/customer-documents/HORSE_001/passport/file',500),'note':S('Chờ Specialist kiểm tra'),'issue':NULL(S('')),'expiry':NULL(DATE('2028-04-09')),'reviewedAt':NULL(TIME()),'reviewedBy':NULL(ID('USER',5))},['file']))
model('Supplement',O({'id':S('SUP:TRIP_001:HORSE_001:passport:1',200,1),'tripId':ID('TRIP'),'key':key(),'scope':docScope(),'reason':S('Vui lòng nộp bản hộ chiếu còn hiệu lực',2000,5),'dueAt':NULL(DATE('2026-11-18')),'status':E('OPEN','OPEN','SUBMITTED','FULFILLED'),'createdAt':TIME(),'history':A(({'type':'array','items':{'type':'string'},'minItems':2,'maxItems':2},['2026-10-24 09:00','Gửi yêu cầu bổ sung']))}))
model('DocVersion',O({'v':N(1,1),'file':S('/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/1/file',500),'at':TIME(),'by':ID('USER',5)}))
model('DocReview',O({'v':N(1,1),'decision':E('APPROVED','APPROVED','REJECTED'),'at':TIME(),'by':ID('USER',5),'remark':S('Đã kiểm tra bản nộp')}))
model('Document',O({'id':ID('LEGAL_MEDICAL_RECORD',2),'tripId':ID('TRIP'),'typeId':S('EXPORT_HEALTH',50,1),'horseId':NULL(ID('HORSE')),'status':E('SUBMITTED','SUBMITTED','APPROVED','REJECTED'),'number':S('CERT-001',100,1),'issuer':S('Đơn vị cấp giấy A',200,1),'issuedAt':DATE('2026-11-15'),'expiry':DATE('2026-12-01'),'versions':A(R('DocVersion'),minItems=1),'reviews':A(R('DocReview'),[]),'rejectReason':NULL(S('')),'physicalCopy':B(False)}))
EX['Document']['horseId']='HORSE_001'
model('ChecklistItem',O({'typeId':S('PASSPORT',50),'horseId':NULL(ID('HORSE')),'provider':provider(),'level':E('REQUIRED','REQUIRED','CONDITIONAL','OPTIONAL'),'stage':E('BEFORE_DEPART','BEFORE_SUBMIT','BEFORE_DEPART','AT_CHECKPOINT'),'condition':S(''),'conditionMet':NULL(B()),'counted':B(True),'status':E('SUBMITTED','NOT_SUBMITTED','SUBMITTED','APPROVED','REJECTED','EXPIRED','NOT_CONFIGURED'),'doc':NULL(R('Document')),'missingRule':NULL(S(''))}))
EX['ChecklistItem']['horseId']='HORSE_001'
model('Checklist',O({'items':A(R('ChecklistItem')),'ready':N(0),'total':N(1),'pending':N(1),'needs':N(0),'status':E('NOT_READY','READY','NOT_READY'),'documentSetVersion':N(3)}))
model('BookingWrite',O({'tripId':ID('TRIP'),'station':S('Trạm kiểm dịch A',200,1),'slot':DATE(),'notes':S('')}))
model('Booking',O({'id':ID('QUARANTINE_BOOKING'),'tripId':ID('TRIP'),'station':S('Trạm kiểm dịch A',200),'slot':DATE(),'ref':S(''),'status':E('REQUESTED','REQUESTED','BOOKED'),'notes':S(''),'confirmedAt':NULL(TIME())}))
model('Audit',O({'at':TIME(),'actor':S('Specialist A',100),'role':E('TRANSPORT_SPECIALIST','TRANSPORT_SPECIALIST','LOGISTICS_MANAGER','CUSTOMER','SYSTEM'),'action':S('REVIEW_CUSTOMER_DOCUMENT',100),'entity':S('TRIP_001',200),'detail':S('Đã kiểm tra hồ sơ')}))

model('StopWrite',O({'id':ID('ROUTE_SEGMENT'),'name':S('Trại ngựa A',255,1),'type':E('ORIGIN','ORIGIN','REST_STOP','FUEL_STOP','CHECKPOINT','AIRPORT','QUARANTINE_STATION','DESTINATION'),'country':country(),'plannedAt':TIME('2026-11-20 08:00'),'lat':({'type':'number','minimum':-90,'maximum':90},10.8231),'lng':({'type':'number','minimum':-180,'maximum':180},106.6297),'checkpointId':NULL(N(101,1))},['id','checkpointId']))
model('Stop',R('StopWrite'));MODELS['Stop']=cp(MODELS['StopWrite']);MODELS['Stop']['required']=list(MODELS['Stop']['properties'])
model('Route',O({'version':N(1,0),'status':E('DRAFT','DRAFT','PENDING_APPROVAL','APPROVED','RETURNED'),'stops':A(R('Stop')),'submittedAt':NULL(TIME()),'reviewedAt':NULL(TIME()),'returnReason':NULL(S(''))}))
model('Crew',O({'MAIN_DRIVER':ID('USER',8),'CO_DRIVER':ID('USER',9),'VETERINARIAN':ID('USER',10)},['MAIN_DRIVER','CO_DRIVER','VETERINARIAN']))
model('Leg',O({'key':E('outbound','outbound','inbound'),'title':S('Chặng VN',100),'country':country(),'from':S('Trại ngựa A',255),'to':S('SGN',255),'vehicleId':NULL(ID('VEHICLE')),'crew':R('Crew')}))
model('FlightWrite',O({'airline':S('Hãng bay A',100,1),'flightNo':S('AIR001',50,1),'fromAirport':S('SGN',200,1),'toAirport':S('NRT',200,1),'departAt':TIME('2026-11-20 12:00'),'arriveAt':TIME('2026-11-21 14:00'),'cost':N(25000000,1),'currency':E('VND','VND'),'departureAirportCheckpointId':N(101,1),'arrivalAirportCheckpointId':N(201,1)}))
model('Flight',O({'version':N(1,1),**fields('FlightWrite'),'status':E('BUDGET_PENDING','DRAFT','BUDGET_PENDING','BUDGET_APPROVED','BOOKED','REJECTED'),'bookingRef':NULL(S('BOOK-001',100)),'bookingId':NULL(N(300,1))}))
model('CoordinatorTrip',O({'id':ID('TRIP'),'requestId':ID('REQUEST'),'customer':S('Nguyen Van A',100),'origin':S('Ho Chi Minh City',100),'destination':S('Tokyo',100),'originCountry':country(),'destinationCountry':E('JP','VN','JP'),'mode':mode(),'horses':A(ID('HORSE'),minItems=1),'plannedDepart':TIME('2026-11-20 08:00'),'eta':TIME('2026-11-21 18:00'),'status':tripStatus(),'deploymentStatus':E('CONFIRMED','NOT_CONFIRMED','CONFIRMED','ON_HOLD'),'route':R('Route'),'vehicleId':NULL(ID('VEHICLE')),'crew':R('Crew'),'legs':NULL(O({'outbound':R('Leg'),'inbound':R('Leg')})),'flight':NULL(R('Flight')),'resourcesConfirmed':NULL(R('ReadyStamp')),'resourceVersion':N(0),'milestones':A(O({'type':S('DEPARTED'),'stopIndex':N(0),'at':TIME(),'by':S('Driver A')}),[]),'etaHistory':A(O({'from':TIME(),'to':TIME(),'at':TIME(),'by':S('Coordinator A'),'reason':S('')}),[])}))
model('Vehicle',O({'id':ID('VEHICLE'),'plate':S('51C-12345',50),'model':S('Xe vận chuyển ngựa',100),'stalls':N(4,1),'country':country(),'base':S('Ho Chi Minh City',100),'status':E('READY','READY','MAINTENANCE','INACTIVE'),'nextService':DATE('2026-12-01'),'features':S('Thông gió, vách ngăn')}))
model('Staff',O({'id':ID('USER',8),'name':S('Driver A',100),'role':E('DRIVER','DRIVER','ESCORT','VETERINARIAN'),'country':country(),'phone':S('+84901234567',50),'licence':NULL(S('LICENSE-001',100)),'certExpiry':NULL(DATE('2027-12-31'))}))
model('CatalogCheckpoint',O({'checkpointId':N(101,1),'name':S('Sân bay SGN',255),'country':country(),'type':E('AIRPORT','AIRPORT','LAND_BORDER','QUARANTINE_STATION','REST_STOP','FUEL_STOP','DESTINATION'),'lat':NULL(({'type':'number','minimum':-90,'maximum':90},10.8188)),'lng':NULL(({'type':'number','minimum':-180,'maximum':180},106.6520)),'active':B(True)}))
EX['CatalogCheckpoint'].update(lat=10.8188,lng=106.6520)
model('Readiness',O({'tripId':ID('TRIP'),'routeVersion':N(1),'resourceVersion':N(0),'flightVersion':NULL(N(1,1)),'canApprove':B(False),'checks':A(O({'key':E('docs','deploy','docs','insurance','quarantine','route','resources','flight'),'ok':B(False),'code':S('DOCS_NOT_READY',100),'message':S('Hồ sơ chưa được xác nhận')}),minItems=1),'evaluatedAt':TIME()}))
model('ManagerTrip',O({'id':ID('TRIP'),'requestId':ID('REQUEST'),'mode':mode(),'status':tripStatus(),'deployment':O({'status':E('CONFIRMED','NOT_CONFIRMED','CONFIRMED','ON_HOLD'),'specialistId':ID('USER',5),'coordinatorId':ID('USER',6),'at':TIME()}),'plannedDepart':TIME('2026-11-20 08:00'),'eta':TIME('2026-11-21 18:00'),'readiness':O({'docsReady':N(0),'docsTotal':N(1),'docsReadyAt':NULL(TIME()),'insurance':E('MISSING','MISSING','PENDING','VERIFIED'),'quarantineOk':B(False)}),'route':NULL(O({'v':N(1,1),'status':E('PENDING_APPROVAL','PENDING_APPROVAL','APPROVED','CHANGES_REQUESTED'),'submittedAt':TIME(),'stops':A(R('Stop')),'vehicle':NULL(S('51C-12345',100)),'crew':A(({'type':'array','items':{'type':'string'},'minItems':2,'maxItems':2},['MAIN_DRIVER','Driver A'])),'resourcesConfirmed':B(False),'note':S(''),'decisionNote':NULL(S('')),'decidedAt':NULL(TIME())})),'flight':NULL(O({'airline':S('Hãng bay A'),'flightNo':S('AIR001'),'budget':N(25000000),'status':E('BUDGET_PENDING','BUDGET_PENDING','APPROVED','REJECTED','BOOKED'),'decidedAt':NULL(TIME())})),'departureApprovedAt':NULL(TIME()),'routeVersion':N(1),'resourceVersion':N(0),'flightVersion':NULL(N(1,1)),'milestones':A(O({'type':S('DEPARTED'),'at':TIME()}),[]),'etaHistory':A(O({'at':TIME()}),[])}))
model('Error',O({'success':({'const':False},False),'message':S('Thao tác chưa thể thực hiện'),'errorCode':S('FEATURE_NOT_SUPPORTED',100),'data':({'type':'null'},None),'errors':({'type':'object','additionalProperties':{'type':'array','items':{'type':'string'}}},{'routeVersion':['Tải lại phiên bản hiện hành']})},['errors']))
OPS=[]
def op(method,path,title,role,response,request=None,rule='',feature='core',status=200,multipart=False,binary=False):
 oid=f'F2-J{len(OPS)+1:02}'
 if request is not None:model(oid+'Request',request)
 if not binary:model(oid+'Response',O({'success':({'const':True},True),'message':S('OK'),'data':response}))
 OPS.append(dict(id=oid,method=method,path=path,title=title,role=role,request=request,response=response,rule=rule,feature=feature,status=status,multipart=multipart,binary=binary))
SP='TRANSPORT_SPECIALIST';CO='FLEET_ROUTE_COORDINATOR';MA='LOGISTICS_MANAGER'
op('GET','/master/flow2-capabilities','Khả năng Flow 2 được triển khai','AUTHENTICATED',O({'features':A(O({'key':S('requirements'),'enabled':B(False),'reason':S('Chưa xác nhận nơi lưu bền vững')})),'checkpointSuggestionRadiusMeters':N(5000,1)}))
for path,title,dto in [('trips','Chuyến Specialist được giao','SpecialistTrip'),('customer-documents','Hồ sơ khách đã nộp','CustomerDoc'),('documents','Chứng từ CBN','Document'),('document-requests','Yêu cầu bổ sung','Supplement'),('quarantine-bookings','Lịch kiểm dịch','Booking'),('document-types','Loại giấy tờ','DocType'),('regulations','Quy định nội bộ','Regulation'),('requirement-sets','Bộ yêu cầu','Package'),('audit','Nhật ký thao tác','Audit')]:
 op('GET','/specialist/'+path,title,SP,A(R(dto)),rule='Chỉ trả phạm vi được phân công; query tripId tùy chọn ở danh sách theo chuyến. Trống trả [].',feature='configuration' if path in ['document-types','regulations','requirement-sets'] else 'core')
op('GET','/specialist/trips/{tripId}','Chi tiết chuyến cho Specialist',SP,R('SpecialistTrip'))
op('GET','/specialist/trips/{tripId}/checklist','Checklist do backend đánh giá',SP,R('Checklist'),feature='requirements')
op('POST','/specialist/trips/{tripId}/requirement-set-preview','Xem trước thay đổi checklist',SP,O({'snapshot':R('ReqSet'),'checklist':R('Checklist'),'changes':A(O({'action':E('ADD','ADD','REMOVE','CHANGE'),'typeId':S('PASSPORT'),'horseId':NULL(ID('HORSE'))}))}),O({'pkgId':S('VN_JP_AIR',50,1),'pkgV':N(1,1)}),feature='requirements',rule='Chỉ đọc, không áp dụng/sửa dữ liệu; điều kiện phải được BE xác định.')
op('PUT','/specialist/trips/{tripId}/requirement-set','Áp dụng snapshot bộ yêu cầu',SP,O({'trip':R('SpecialistTrip'),'snapshot':R('ReqSet'),'checklist':R('Checklist'),'docsReady':NULL(R('ReadyStamp'))}),R('F2-J13Request'),feature='requirements',rule='Snapshot do BE dựng từ đúng pkgV và regV; giữ bản chuyến cũ. Invalidate Docs READY.')
op('POST','/specialist/trips/{tripId}/customer-documents/review','Duyệt bản khách nộp',SP,O({'document':R('CustomerDoc'),'documentSetVersion':N(4),'docsReady':NULL(R('ReadyStamp'))}),O({'key':key(),'scope':docScope(),'documentVersion':N(1,1),'decision':E('APPROVED','APPROVED','REJECTED'),'remark':S('Đã kiểm tra')}),rule='Kiểm tra đúng bản đã xem, hiệu lực tới ETA; REJECTED cần remark >=5. Scope=request là nhánh chưa đủ persistence.',feature='document-review')
op('POST','/specialist/document-requests','Gửi yêu cầu bổ sung cho khách',SP,R('Supplement'),O({'tripId':ID('TRIP'),'key':key(),'scope':docScope(),'reason':S('Vui lòng nộp bản còn hiệu lực',2000,5),'dueAt':NULL(DATE('2026-11-18'))}),status=201,feature='supplements',rule='Một OPEN/SUBMITTED trên trip/key/scope; gửi thông báo, mất Docs READY; upload lại chỉ SUBMITTED, duyệt xong mới FULFILLED.')
op('POST','/specialist/document-requests/{supplementRef}/fulfill','Hoàn tất yêu cầu đã được duyệt',SP,R('Supplement'),feature='supplements',rule='Chỉ sau đúng bản được APPROVED; idempotent nếu FULFILLED, không bỏ qua duyệt.')
op('GET','/specialist/trips/{tripId}/customer-documents/{scope}/{key}/file','Đọc file khách có quyền',SP,None,binary=True)
op('POST','/specialist/documents','Ghi nhận chứng từ CBN với file thật',SP,O({'document':R('Document'),'docsReady':NULL(R('ReadyStamp'))}),O({'tripId':ID('TRIP'),'typeId':S('EXPORT_HEALTH',50,1),'horseId':NULL(ID('HORSE')),'number':S('CERT-001',100,1),'issuer':S('Đơn vị cấp giấy A',200,1),'issuedAt':DATE('2026-11-15'),'expiry':DATE('2026-12-01')}),multipart=True,status=201,feature='document-versions',rule='FormData metadata JSON và file bytes <=10 MiB. PER_HORSE bắt buộc horseId thuộc chuyến; PER_TRIP chỉ bật khi có lưu bền vững.')
op('POST','/specialist/documents/{documentRef}/versions','Nộp bản mới cùng chứng từ',SP,O({'document':R('Document'),'docsReady':NULL(R('ReadyStamp'))}),O({'expectedVersion':N(1,1),'number':S('CERT-002',100,1),'issuer':S('Đơn vị cấp giấy A',200,1),'issuedAt':DATE('2026-11-16'),'expiry':DATE('2026-12-02')}),multipart=True,status=201,feature='document-versions',rule='BE cấp version mới, reset SUBMITTED, giữ file/review cũ, mất Docs READY.')
op('GET','/specialist/documents/{documentRef}/versions/{versionNo}/file','Đọc file đúng bản chứng từ',SP,None,binary=True)
op('POST','/specialist/documents/{documentRef}/review','Duyệt phiên bản chứng từ',SP,O({'document':R('Document'),'docsReady':NULL(R('ReadyStamp'))}),O({'version':N(1,1),'decision':E('APPROVED','APPROVED','REJECTED'),'remark':S('Đã kiểm tra')}),feature='document-versions',rule='Chỉ bản SUBMITTED mới nhất; không suy version từ array.length. REJECTED cần remark >=5; hết hạn trước ETA không duyệt.')
op('PUT','/specialist/documents/{documentRef}/physical-copy','Ghi nhận bản cứng',SP,R('Document'),O({'version':N(1,1),'physicalCopy':B(True)}),feature='document-versions',rule='PUT giá trị tuyệt đối, không toggle mù; có audit. Không tự biến scan thành APPROVED.')
op('PUT','/specialist/trips/{tripId}/insurance','Ghi nhận bảo hiểm',SP,O({'insurance':R('Insurance'),'docsReady':NULL(R('ReadyStamp'))}),R('InsuranceWrite'),feature='insurance')
op('POST','/specialist/trips/{tripId}/insurance/verify','Xác minh bảo hiểm',SP,R('Insurance'),O({'insuranceVersion':N(1,1),'allHorsesCovered':({'const':True},True),'wholeJourneyCovered':({'const':True},True),'scopeChecked':({'const':True},True)}),feature='insurance',rule='BE kiểm tra ngựa và khoảng departure–ETA; checkbox không thay dữ liệu thực.')
op('POST','/specialist/quarantine-bookings','Đề nghị lịch kiểm dịch',SP,R('Booking'),R('BookingWrite'),status=201)
op('POST','/specialist/quarantine-bookings/{bookingId}/confirm','Ghi nhận xác nhận từ trạm',SP,R('Booking'),O({'ref':S('Q-CONF-001',100,3)}),rule='Chỉ REQUESTED -> BOOKED với xác nhận thật; không đồng nghĩa kiểm dịch đạt hoặc đặt lịch tự động.')
op('POST','/specialist/trips/{tripId}/docs-ready','Xác nhận Docs READY',SP,O({'docsReady':R('ReadyStamp'),'documentSetVersion':N(3),'insuranceVersion':N(1,1)}),O({'documentSetVersion':N(3),'insuranceVersion':N(1,1)}),feature='readiness',rule='BE tính lại checklist, hồ sơ khách, supplement, bảo hiểm; thiếu config/stale ->409, không nhận booleans ready do FE gửi.')

for name,dto in [('document-types','DocType'),('regulations','Regulation'),('requirement-sets','Package')]:
 write={'DocType':'DocTypeWrite','Regulation':'RegulationWrite','Package':'PackageWrite'}[dto]
 op('POST','/specialist/'+name,'Tạo '+name,SP,R(dto),R(write),status=201,feature='configuration',rule='Khóa ứng dụng do BE cấp, không phải PK bảng SQL mới. Tắt khi chưa có nơi lưu/quyền quản trị danh mục.')
 op('PUT','/specialist/'+name+'/{configKey}','Sửa '+name,SP,R(dto),R(write),feature='configuration',rule='Bộ/quy định đã áp dụng tăng v, giữ snapshot chuyến; currentVersion query cho entity có v, server chống sửa đồng thời.')
for path,title,dto in [('trips','Chuyến Coordinator được giao','CoordinatorTrip'),('vehicles','Xe để phân công','Vehicle'),('staff','Nhân sự theo năng lực','Staff'),('checkpoints','Danh mục điểm dừng cho bản đồ','CatalogCheckpoint')]:
 op('GET','/coordinator/'+path,title,CO,A(R(dto)),rule='Metadata thiếu trong SQL phải lấy từ nguồn đã xác nhận, không bịa biển số/quốc gia/chứng chỉ.')
op('GET','/coordinator/trips/{tripId}','Chi tiết chuyến Coordinator',CO,R('CoordinatorTrip'))
op('PUT','/coordinator/trips/{tripId}/route-draft','Lưu thứ tự và tọa độ điểm dừng',CO,R('Route'),O({'expectedRouteVersion':N(0),'stops':A(R('StopWrite'),minItems=2)}),feature='route-versioning',rule='Thêm/xóa/sắp xếp là staging trước PUT. Điểm mới không gửi ID tạm; BE cấp ROUTE_SEGMENT_*. Đổi cấu trúc mất xác nhận resources và duyệt tuyến cũ.')
op('POST','/coordinator/trips/{tripId}/route/submit','Gửi tuyến chờ duyệt',CO,R('Route'),O({'routeVersion':N(1,1),'resourceVersion':N(3)}),feature='route-versioning',rule='Cần resourcesConfirmed; AIR BOOKED và đủ hai chặng xe. DRAFT/RETURNED -> PENDING_APPROVAL. Không đợi route APPROVED mới confirm resources.')
op('PUT','/coordinator/trips/{tripId}/resources','Lưu phân công chặng đang sửa',CO,R('CoordinatorTrip'),O({'expectedResourceVersion':N(0),'leg':NULL(E('outbound','outbound','inbound')),'vehicleId':NULL(ID('VEHICLE')),'crew':R('Crew')}),feature='resources',rule='ROAD leg=null; AIR phải outbound/inbound. PUT full xe/crew của chặng; slot thiếu là chưa phân công. Không sửa PENDING_APPROVAL/APPROVED, phải reopen.')
op('POST','/coordinator/trips/{tripId}/resources/confirm','Xác nhận nguồn lực',CO,R('CoordinatorTrip'),O({'routeVersion':N(1,1),'resourceVersion':N(3),'flightVersion':NULL(N(1,1))}),feature='resources',rule='BE kiểm tra xung đột/chứng chỉ, 3 người khác nhau, đủ stalls, đúng quốc gia; AIR đủ hai chặng + BOOKED. Không đòi route APPROVED.')
op('POST','/coordinator/trips/{tripId}/flight/proposals','Đề xuất ngân sách bay',CO,R('Flight'),O({'expectedFlightVersion':N(0),**fields('FlightWrite')}),feature='flight-budget',rule='AIR bay thẳng, sân bay đúng quốc gia/thứ tự tuyến, VND. Không insert FLIGHT_BOOKING BookingConfirmed=1 khi mới đề xuất.')
op('POST','/coordinator/trips/{tripId}/flight/booking','Ghi nhận mã đặt chỗ',CO,R('Flight'),O({'flightVersion':N(1,1),'bookingRef':S('BOOK-001',100,4)}),feature='flight-budget',rule='Chỉ BUDGET_APPROVED đúng bản với mã thật. bookingId INT, không FLIGHT_BOOKING_001.')
op('POST','/coordinator/trips/{tripId}/route/reopen','Mở bản mới khi đổi kế hoạch',CO,R('CoordinatorTrip'),O({'routeVersion':N(1,1),'reason':S('Cần đổi trạm nghỉ và bố trí lại xe',2000,10)}),feature='route-versioning',rule='Chỉ PLANNING, tăng routeVersion, hủy duyệt/xác nhận liên quan. READY_TO_DEPART cần quy trình thu hồi duyệt riêng ngoài contract này.')
op('GET','/manager/trips/{tripId}/preparation','Tổng hợp chuẩn bị cho Manager',MA,R('ManagerTrip'))
op('GET','/manager/trips/{tripId}/readiness','Điều kiện khởi hành',MA,R('Readiness'),rule='Tính dữ liệu mới nhất; 0/0 hoặc missing config không phải đủ hồ sơ. ROAD/AIR có checks khác nhau.')
op('POST','/manager/trips/{tripId}/route/decision','Duyệt hoặc trả tuyến',MA,R('ManagerTrip'),O({'routeVersion':N(1,1),'resourceVersion':N(3),'decision':E('APPROVED','APPROVED','RETURNED'),'reason':S('Đã kiểm tra phương án')}),feature='route-versioning',rule='Chỉ PENDING_APPROVAL; RETURNED reason>=10. Duyệt đúng bundle tuyến/xe/crew, không duyệt nhân sự riêng.')
op('POST','/manager/trips/{tripId}/flight/decision','Quyết định ngân sách bay',MA,R('ManagerTrip'),O({'flightVersion':N(1,1),'decision':E('APPROVED','APPROVED','REJECTED'),'note':S('Đồng ý ngân sách')}),feature='flight-budget',rule='Chỉ BUDGET_PENDING; REJECTED note>=10. Manager APPROVED = Coordinator BUDGET_APPROVED, chưa BOOKED.')
op('POST','/manager/trips/{tripId}/departure/approve','Duyệt sẵn sàng khởi hành',MA,O({'tripId':ID('TRIP'),'tripStatus':E('READY_TO_DEPART','READY_TO_DEPART'),'requestId':ID('REQUEST'),'requestStatus':E('SCHEDULED','SCHEDULED'),'departureApprovedAt':TIME(),'approvedBy':ID('USER',4),'routeVersion':N(1,1),'resourceVersion':N(3),'flightVersion':NULL(N(1,1))}),O({'routeVersion':N(1,1),'resourceVersion':N(3),'flightVersion':NULL(N(1,1))}),feature='readiness',rule='Transaction kiểm tra tất cả bằng chứng/reservations; Trip READY_TO_DEPART + Request SCHEDULED, actor/time. Không tạo DEPARTED/IN_TRANSIT.')
op('GET','/customer/requests/{requestId}/supplements','Yêu cầu bổ sung khách phải xử lý','CUSTOMER',A(R('Supplement')),feature='supplements',rule='Cùng DocRequest của Specialist; upload dùng Flow 1 J17, không tạo hồ sơ độc lập. Upload chưa APPROVED/FULFILLED.')
# Populate valid route examples and explicit AIR legs; every endpoint scenario is independent.
stops=[]
for n,name,kind,cc,at,checkpoint in [(1,'Trại ngựa A','ORIGIN','VN','2026-11-20 08:00',None),(2,'SGN','AIRPORT','VN','2026-11-20 10:00',101),(3,'NRT','AIRPORT','JP','2026-11-21 14:00',201),(4,'Trạm kiểm dịch A','QUARANTINE_STATION','JP','2026-11-21 16:00',203),(5,'Trại ngựa B','DESTINATION','JP','2026-11-21 18:00',None)]:
 stops.append({**EX['Stop'],'id':f'ROUTE_SEGMENT_{n:03}','name':name,'type':kind,'country':cc,'plannedAt':at,'checkpointId':checkpoint,'lat':35.77 if cc=='JP' else 10.82,'lng':140.39 if cc=='JP' else 106.65})
EX['Route']['stops']=cp(stops)
EX['CoordinatorTrip'].update(route=cp(EX['Route']),crew={},legs={'outbound':{**EX['Leg'],'crew':{},'vehicleId':None},'inbound':{**EX['Leg'],'key':'inbound','title':'Chặng JP','country':'JP','from':'NRT','to':'Trại ngựa B','crew':{},'vehicleId':None}},flight=cp(EX['Flight']))
EX['ReqSet']['rules'].append({**cp(EX['ReqRule']),'country':'JP','direction':'IMPORT','regId':'JP_IMPORT'})
for x in OPS:
 path=x['path'];data=x['response'][1] if not x['binary'] else None
 if x['request'] and path.endswith('/route-draft'):x['request'][1]['stops']=cp(stops)
 if x['request'] and path.endswith(('/resources/confirm','/departure/approve')):x['request'][1]['flightVersion']=1
 if x['request'] and path=='/specialist/documents':x['request'][1]['horseId']='HORSE_001'
 if isinstance(data,dict):
  if 'deploymentStatus' in data:data.update(cp(EX['CoordinatorTrip']))
  if 'snapshot' in data:data['snapshot']=cp(EX['ReqSet'])
  if path.endswith('/requirement-set'):data['trip']['reqSet']=cp(EX['ReqSet'])
  if path.endswith('/fulfill'):data['status']='FULFILLED';data['history'].append(['2026-10-24 10:00','Đã duyệt bản bổ sung'])
  if path.endswith('/customer-documents/review'):data['document'].update(status='APPROVED',reviewedAt='2026-10-24 09:00',reviewedBy='USER_005')
  if path.endswith('/documents/{documentRef}/review'):data['document'].update(status='APPROVED',reviews=[cp(EX['DocReview'])])
  if path.endswith('/documents/{documentRef}/physical-copy'):data['physicalCopy']=True
  if path.endswith('/insurance/verify'):data.update(status='VERIFIED',checkedAt='2026-10-24 09:00',checkedBy='USER_005')
  if path.endswith('/quarantine-bookings/{bookingId}/confirm'):data.update(status='BOOKED',ref='Q-CONF-001',confirmedAt='2026-10-24 09:00')
  if path.endswith('/route-draft'):data.update(cp(EX['Route']))
  if path.endswith('/route/submit'):data.update(cp(EX['Route']));data.update(status='PENDING_APPROVAL',submittedAt='2026-10-24 09:00')
  if path.endswith('/route/reopen'):data['route'].update(version=2,status='DRAFT');data['resourcesConfirmed']=None
  if path.endswith('/flight/booking'):data.update(status='BOOKED',bookingRef='BOOK-001',bookingId=300)
  if path.endswith('/departure/approve'):data['flightVersion']=1
  if path.endswith('/resources/confirm'):
   for i,leg in enumerate(['outbound','inbound']):data['legs'][leg].update(vehicleId=f'VEHICLE_{i+1:03}',crew={k:f'USER_{8+i*3+j:03}' for j,k in enumerate(['MAIN_DRIVER','CO_DRIVER','VETERINARIAN'])})
  if path.endswith('/resources/confirm'):data.update(resourceVersion=3,resourcesConfirmed={'at':'2026-10-24 09:00','by':'USER_006'});data['flight'].update(status='BOOKED',bookingRef='BOOK-001',bookingId=300)
  if path.endswith('/resources') and x['method']=='PUT':data['resourceVersion']=1;data['legs']['outbound'].update(vehicleId=x['request'][1]['vehicleId'],crew=cp(x['request'][1]['crew']));x['request'][1]['leg']='outbound'
  if path=='/master/flow2-capabilities':data['features']=[{'key':k,'enabled':False,'reason':'Chưa nghiệm thu backend và nguồn lưu bền vững'} for k in sorted({o['feature'] for o in OPS})]
  if path.endswith('/versions'):
   data['document']['versions'].append({**EX['DocVersion'],'v':2,'file':'/api/specialist/documents/LEGAL_MEDICAL_RECORD_002/versions/2/file'})
   data['document'].update(number='CERT-002',issuedAt='2026-11-16',expiry='2026-12-02')
  if path.endswith('/route/decision'):data.update(resourceVersion=3,flightVersion=1,flight={'airline':'Hãng bay A','flightNo':'AIR001','budget':25000000,'status':'BOOKED','decidedAt':'2026-10-24 08:00'})
  if path.endswith('/flight/decision'):data['flightVersion']=1
  if path.endswith('/route/decision'):data['route']={'v':1,'status':'APPROVED','submittedAt':'2026-10-24 08:30','stops':cp(stops),'vehicle':'51C-12345 / JP-001','crew':[['MAIN_DRIVER','Driver VN A'],['CO_DRIVER','Driver VN B'],['VETERINARIAN','Vet VN'],['MAIN_DRIVER','Driver JP A'],['CO_DRIVER','Driver JP B'],['VETERINARIAN','Vet JP']],'resourcesConfirmed':True,'note':'','decisionNote':'Đã kiểm tra phương án','decidedAt':'2026-10-24 09:00'}
  if path.endswith('/flight/decision'):data['flight']={'airline':'Hãng bay A','flightNo':'AIR001','budget':25000000,'status':'APPROVED','decidedAt':'2026-10-24 09:00'}
 if isinstance(data,list) and path=='/coordinator/trips':data[:]=[cp(EX['CoordinatorTrip'])]
 if not x['binary']:EX[x['id']+'Response']['data']=cp(data)
 if x['request'] is not None:EX[x['id']+'Request']=cp(x['request'][1])

def dump(x):return json.dumps(x,ensure_ascii=False,indent=2)
def success(x):return {'success':True,'message':'OK','data':cp(x)}
error={'success':False,'message':'Chức năng chưa có nơi lưu bền vững được xác nhận','errorCode':'FEATURE_NOT_SUPPORTED','data':None}
spec={'openapi':'3.1.0','info':{'title':'Flow 2 — preparation to departure approval','version':'1.0.0','description':'Target frontend contract. No DB/backend edits or live compatibility claims.'},'servers':[{'url':'/api'}],'security':[{'bearerAuth':[]}],'paths':{},'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer'}},'schemas':MODELS}}
chapters=[]
for x in OPS:
 oid=x['id'];operation={'operationId':oid,'summary':x['title'],'x-role':x['role'],'x-feature':x['feature'],'x-implementation-status':'unverified; return 501 if persistence missing','parameters':[],'responses':{}}
 for param in re.findall(r'{(\w+)}',x['path']):
  sch={'type':'integer','minimum':1} if param=='versionNo' else {'type':'string','minLength':1,'maxLength':200}
  if param=='tripId':sch=ID('TRIP')[0]
  if param=='requestId':sch=ID('REQUEST')[0]
  if param=='bookingId':sch=ID('QUARANTINE_BOOKING')[0]
  operation['parameters'].append({'name':param,'in':'path','required':True,'schema':sch})
 if x['method']=='GET' and '{' not in x['path'] and x['role']==SP and x['path'].split('/')[-1] in ['customer-documents','documents','document-requests','quarantine-bookings','audit']:
  operation['parameters'].append({'name':'tripId','in':'query','required':False,'schema':ID('TRIP')[0]})
 if x['method']=='PUT' and x['feature']=='configuration' and not x['path'].startswith('/specialist/document-types'):
  operation['parameters'].append({'name':'currentVersion','in':'query','required':True,'schema':N(1,1)[0]})
 if x['method']=='POST' and not x['path'].endswith('/requirement-set-preview'):
  operation['parameters'].append({'name':'Idempotency-Key','in':'header','required':True,'schema':{'type':'string','format':'uuid'},'description':'UUID, retry same actor/method/path/payload with same key for at least 24h.'})
 if x['request'] is not None:
  if x['multipart']:
   ms=O({'metadata':S(dump(x['request'][1])),'file':({'type':'string','format':'binary'},'real-document.pdf')})[0]
   operation['requestBody']={'required':True,'content':{'multipart/form-data':{'schema':ms,'encoding':{'metadata':{'contentType':'application/json'}}}},'x-metadata-schema':{'$ref':'#/components/schemas/'+oid+'Request'},'x-metadata-example':cp(x['request'][1])}
  else:operation['requestBody']={'required':True,'content':{'application/json':{'schema':{'$ref':'#/components/schemas/'+oid+'Request'},'example':x['request'][1]}}}
 if x['binary']:operation['responses']['200']={'description':'Actual authorized bytes','content':{m:{'schema':{'type':'string','format':'binary'}} for m in ['application/pdf','image/jpeg','image/png']}}
 else:operation['responses'][str(x['status'])]={'description':'Target success when implemented','content':{'application/json':{'schema':{'$ref':'#/components/schemas/'+oid+'Response'},'examples':{'success':{'value':success(x['response'][1])}}}}}
 for code in ['400','401','403','404','409','429','500','501']:
  codeName={'400':'VALIDATION_ERROR','401':'UNAUTHORIZED','403':'FORBIDDEN_ROLE','404':'NOT_FOUND','409':'INVALID_STATE','429':'RATE_LIMITED','500':'INTERNAL_ERROR','501':'FEATURE_NOT_SUPPORTED'}[code]
  e={**error,'message':'Thao tác chưa thể thực hiện' if code!='501' else error['message'],'errorCode':codeName}
  operation['responses'][code]={'description':codeName,'content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'},'examples':{'error':{'value':e}}}}}
 spec['paths'].setdefault(x['path'],{})[x['method'].lower()]=operation
 chapter=f"### {oid} — {x['method']} {x['path']}\n\n{x['title']}. Role: **{x['role']}**. Feature: `{x['feature']}`.\n\n"
 if operation['parameters']:
  chapter+='| Tham số | Nơi gửi | Bắt buộc | Kiểu |\n|---|---|---|---|\n'
  for q in operation['parameters']:chapter+=f"| {q['name']} | {q['in']} | {'Có' if q['required'] else 'Không'} | {q['schema']['type']} |\n"
  chapter+='\n'
 if x['request'] is None:chapter+='**Request body:** Không gửi body.\n\n'
 else:chapter+=('**Multipart:** metadata JSON dưới đây và file thật PDF/JPEG/PNG <=10 MiB.\n\n' if x['multipart'] else '**Request JSON**\n\n')+'```json\n'+dump(x['request'][1])+'\n```\n\n'
 if x['binary']:chapter+='**Response 200:** Binary đúng MIME, có quyền; không bọc JSON thành công. Lỗi vẫn JSON.\n\n'
 else:chapter+=f"**Response {x['status']} — mẫu mục tiêu khi đã triển khai**\n\n```json\n"+dump(success(x['response'][1]))+'\n```\n\n'
 chapter+='**Response 501 — khi chưa hỗ trợ**\n\n```json\n'+dump(error)+'\n```\n\n'
 if x['rule']:chapter+='**Điều kiện/ảnh hưởng:** '+x['rule']+'\n\n'
 refs=[]
 if x['request']:refs.append(oid+'Request')
 if not x['binary']:refs.append(oid+'Response')
 chapter+='**Schema:** '+', '.join('`#/components/schemas/'+s+'`' for s in refs)+', trong [flow2.openapi.json](flow2.openapi.json). Các lỗi chung 400/401/403/404/409/429/500 có schema và mẫu riêng trong OpenAPI.\n\n'
 chapters.append(chapter)
ready=cp(EX['Readiness']);ready.update(canApprove=True,routeVersion=2,resourceVersion=3,flightVersion=1)
ready['checks']=[{'key':k,'ok':True,'code':'READY','message':k+' đã đạt'} for k in ['deploy','docs','insurance','quarantine','route','resources','flight']]
road=cp(EX['CoordinatorTrip']);road.update(mode='ROAD',destination='Hanoi',destinationCountry='VN',legs=None,flight=None)
road['route']['stops']=[cp(stops[0]),{**stops[-1],'id':'ROUTE_SEGMENT_002','country':'VN','plannedAt':'2026-11-20 20:00','lat':21.02,'lng':105.83}]
extras={'readiness-air-ready':('Readiness',ready),'coordinator-road':('CoordinatorTrip',road),'empty-checklist-blocked':('Checklist',{**EX['Checklist'],'items':[],'ready':0,'total':0,'pending':0,'needs':1,'status':'NOT_READY'})}
(ROOT/'flow2.openapi.json').write_text(dump(spec)+'\n',encoding='utf-8')
(ROOT/'flow2.examples.json').write_text(dump({k:{'schema':n,'data':v} for k,(n,v) in extras.items()})+'\n',encoding='utf-8')
catalog='| Mã | Method | Endpoint | Chức năng |\n|---|---|---|---|\n'+''.join(f"| {x['id']} | {x['method']} | {x['path']} | {x['title']} |\n" for x in OPS)
header='''# Flow 2 — toàn bộ JSON API

Ngày 24/10/2026. Giao thức mục tiêu dựa trên frontend; chưa nối caller hiện có hoặc kiểm thử backend thật. Không sửa DB/backend. Mẫu thành công chỉ dùng khi backend đã lưu đầy đủ và trả được dữ liệu đúng schema; nếu chưa có khả năng này phải trả 501, không giả mẫu thành dữ liệu thật.

Đọc [FLOW2.md](FLOW2.md) cho flow/quyền/quy tắc và khoảng trống frontend. [flow2.openapi.json](flow2.openapi.json) quy định required/nullable/enum/giới hạn. [flow2.examples.json](flow2.examples.json) có nhánh ROAD/AIR và 0/0 bị chặn.

- Base /api, Bearer token. List trả data array trực tiếp. Actor/time/status/ID/version do BE xác nhận.
- Required bắt buộc; optional được bỏ, nullable nhận null. Không dùng chuỗi rỗng thay object chưa có.
- type/reg/package là khóa ứng dụng (PASSPORT/VN_EXPORT/VN_JP_AIR), không khẳng định có bảng tương ứng. Supplement.id là opaque reference, không tự tạo bảng SUPPLEMENT. ID thật giữ ID_NAME_RULE; FlightBookingID là integer.
- File là bytes; binary success không envelope. Lỗi JSON có success/message/errorCode/data và errors theo field nếu cần.
- routeVersion/resourceVersion/flightVersion/documentSetVersion là revision nghiệp vụ từ server, không RowVersion/base64 giả. Không có nơi lưu ->501.
- VND cho coverage/cost/budget; không tự đổi số USD trong demo chỉ bằng thay nhãn.
- Mẫu là các tình huống độc lập, không phải chuỗi chạy thẳng. Lấy ID/revision từ response thật cùng môi trường.

## Danh mục

'''
(ROOT/'FLOW2-API-JSON.md').write_text((header+catalog+'\n## Payload theo endpoint\n\n'+''.join(chapters)).rstrip()+'\n',encoding='utf-8')
print(f'Generated {len(OPS)} operations, {len(MODELS)} explicit schemas, endpoint examples, and 3 branch fixtures.')

main=ROOT/'FLOW2.md'
if main.exists():
 text=main.read_text(encoding='utf-8')
 text,n=re.subn(r'(<!-- FLOW2_ENDPOINTS_START -->).*?(<!-- FLOW2_ENDPOINTS_END -->)',lambda m:m[1]+'\n\n'+''.join(chapters).rstrip()+'\n\n'+m[2],text,flags=re.S)
 assert n==1
 main.write_text(text.rstrip()+'\n',encoding='utf-8')
