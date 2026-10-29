"""Generate target documentation only. Never calls a backend or changes a database."""
from pathlib import Path
import copy
import json
import re

ROOT = Path(__file__).resolve().parent
S, OPS = {}, []

def st(example='Thông tin', **kw): return dict(type='string', example=example, **kw)
def integer(example=1, minimum=0, maximum=9007199254740991): return dict(type='integer', minimum=minimum, maximum=maximum, example=example)
def num(example, minimum, maximum): return dict(type='number', minimum=minimum, maximum=maximum, example=example)
def en(*values): return st(values[0], enum=list(values))
def obj(props, optional=()): return dict(type='object', properties=props, required=[k for k in props if k not in optional], additionalProperties=False)
def arr(items, minimum=0, maximum=1000): return dict(type='array', items=items, minItems=minimum, maxItems=maximum)
def ref(name): return {'$ref': '#/components/schemas/' + name}
def null(schema): return {'anyOf': [schema, {'type': 'null'}]}
def define(name, props, optional=()): S[name] = obj(props, optional); return ref(name)
def ident(prefix, n=1): return st(f'{prefix}_{n:03}', pattern=f'^{prefix}_\\d{{3,}}$', maxLength=50)
def key(example): return st(example, minLength=1, maxLength=100, pattern=r'^[A-Za-z0-9_-]+$')
def unique(schema, minimum=0): return dict(arr(schema, minimum, 100), uniqueItems=True)

stamp = st('2026-11-10 06:00', pattern=r'^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$')
text = st('Đã kiểm tra tại hiện trường', minLength=1, maxLength=2000, pattern=r'\S')
reason = st('Giờ thực tế khác thời điểm nhập ban đầu', minLength=5, maxLength=2000, pattern=r'\S')
note = st('', maxLength=2000)
v = integer(10, 1)
boolean = {'type': 'boolean', 'example': False}
yes = {'type': 'boolean', 'const': True, 'example': True}
leg = en('road', 'outbound', 'air', 'inbound')
files = unique(key('EVIDENCE_001'))
C, M, D, T, U = 'FLEET_ROUTE_COORDINATOR', 'LOGISTICS_MANAGER', 'DRIVER_ESCORT', 'TRANSPORT_SPECIALIST', 'CUSTOMER'
STAFF = [D, C, M, T]
define('Actor', {'userId': ident('USER', 11), 'name': st('Nguyễn Văn An'), 'role': en(D, C, M, T),
                 'crewDuty': null(en('MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'))})
define('Blocker', {'code': st('CHECKPOINT_NOT_CLEARED'), 'field': st('milestoneId'), 'message': text})
define('Error', {'success': {'type': 'boolean', 'const': False}, 'message': text, 'errorCode': st('STALE_VERSION'),
                 'data': {'type': 'null'}, 'blockers': arr(ref('Blocker')),
                 'errors': {'type': 'object', 'additionalProperties': arr(text)}}, ('blockers', 'errors'))
define('Binding', {'executionVersion': v, 'approvedPlanVersion': integer(1, 1), 'assignmentVersion': integer(1, 1)})
define('Command', {'expectedVersion': v})
define('Geo', {'lat': num(10.7769, -90, 90), 'lng': num(106.7009, -180, 180)})
define('HorseSnapshot', {'horseId': ident('HORSE'), 'name': st('Bạch Long'),
                          'microchip': st('704123456789012', pattern=r'^\d{15}$'), 'careInstructions': note})
define('Endpoint', {'name': text, 'address': text, 'country': st('VN', pattern=r'^[A-Z]{2}$'), 'geo': null(ref('Geo'))})
define('CrewAssignment', {'userId': ident('USER', 11), 'name': st('Nguyễn Văn An'),
                           'duty': en('MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN')})
define('FlightSnapshot', {'bookingId': key('BOOKING_001'), 'partnerName': text, 'flightCode': st('EQ123'),
                          'originAirport': st('SGN', pattern=r'^[A-Z]{3}$'), 'destinationAirport': st('NRT', pattern=r'^[A-Z]{3}$'),
                          'plannedDepartureAt': stamp, 'plannedArrivalAt': stamp})
define('Policy', {'version': integer(1, 1), 'lateMilestoneMinutes': null(integer(30, 1, 10080)),
                  'healthIntervalMinutes': null(integer(120, 1, 10080)), 'minimumHealthPhotos': null(integer(1, 0, 100)),
                  'configured': boolean, 'note': st('Chưa chốt ngưỡng; không tự gán mặc định')})
define('Capabilities', {'version': {'type': 'string', 'const': '1.0.0'}, 'implementationStatus': en('DESIGNED_NOT_IMPLEMENTED', 'AVAILABLE'),
                        'persistenceAvailable': boolean, 'filesAvailable': boolean, 'notificationsAvailable': boolean,
                        'incidentIntegrationAvailable': boolean, 'gpsRealtime': {'type': 'boolean', 'const': False},
                        'timezone': {'type': 'string', 'const': 'Asia/Ho_Chi_Minh'}, 'policy': ref('Policy')})
define('Actions', {'canComplete': boolean, 'canRequestCorrection': boolean, 'canRecordHealth': boolean,
                   'canProposeEta': boolean, 'blockers': arr(ref('Blocker'))})
kind = en('DEPARTED', 'STOP_ARRIVED', 'STOP_DEPARTED', 'CHECKPOINT_ARRIVED', 'CHECKPOINT_DEPARTED',
          'AIRPORT_ORIGIN_ARRIVED', 'AIR_HANDOVER', 'AIR_DEPARTED', 'AIR_ARRIVED', 'AIR_RECEIVED', 'FINAL_ARRIVED')
define('Milestone', {'id': key('MILESTONE_001'), 'leg': leg, 'kind': kind, 'sequence': integer(1, 1),
                     'label': st('Xuất phát đường bộ'), 'status': en('PENDING', 'COMPLETED'), 'plannedAt': stamp,
                     'occurredAt': null(stamp), 'recordedAt': null(stamp), 'recordedBy': null(ref('Actor')),
                     'revision': integer(1, 1), 'note': note, 'evidenceFileIds': files, 'geo': null(ref('Geo')),
                     'actions': ref('Actions')})
define('Leg', {'key': leg, 'mode': en('ROAD', 'AIR'), 'status': en('PENDING', 'ACTIVE', 'FINISHED'),
               'assignedUserIds': unique(ident('USER')), 'crew': arr(ref('CrewAssignment'), 0, 3), 'vehicleId': null(ident('VEHICLE')),
               'from': st('Điểm nhận ngựa'), 'to': st('Điểm giao cuối'), 'milestoneIds': unique(key('MILESTONE_001'), 1)})
define('EtaSummary', {'currentEta': stamp, 'deliveryDeadline': stamp, 'pendingProposalId': null(key('ETA_001')),
                      'proposedEta': null(stamp), 'version': integer(1, 1)})
define('TripSummary', {'tripId': ident('TRIP'), 'requestId': ident('REQUEST'), 'mode': en('ROAD', 'AIR'),
                       'tripStatus': en('READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'),
                       'requestStatus': en('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'UNDER_RESOLUTION', 'CLOSED'),
                       'phase': en('AWAITING_DEPARTURE', 'IN_PROGRESS', 'AWAITING_HANDOVER', 'HANDED_OVER'),
                       'lastMilestoneId': null(key('MILESTONE_001')), 'eta': ref('EtaSummary')})
define('Map', {'routeSource': en('APPROVED_PLAN'), 'locationSource': en('CONFIRMED_MILESTONE'),
               'lastConfirmedMilestoneId': null(key('MILESTONE_001')), 'markerGeo': null(ref('Geo')),
               'isGps': {'type': 'boolean', 'const': False}, 'routePoints': arr(ref('Geo'))})
define('Tracking', {'binding': ref('Binding'), 'serverTime': stamp, 'trip': ref('TripSummary'),
                    'horses': arr(ref('HorseSnapshot'), 1, 4), 'pickup': ref('Endpoint'), 'delivery': ref('Endpoint'),
                    'flight': null(ref('FlightSnapshot')),
                    'legs': arr(ref('Leg'), 1, 3), 'milestones': arr(ref('Milestone'), 1),
                    'map': ref('Map'), 'policy': ref('Policy'), 'blockers': arr(ref('Blocker')),
                    'handoverAvailable': boolean})
define('MilestoneInput', {'expectedVersion': v, 'occurredAt': stamp, 'note': note, 'evidenceFileIds': files})
define('Mutation', {'binding': ref('Binding'), 'recordId': key('MILESTONE_001'), 'trip': ref('TripSummary'),
                    'blockers': arr(ref('Blocker'))})
define('Preflight', {'binding': ref('Binding'), 'approvalValid': boolean, 'checks': arr(ref('Blocker')),
                     'canDepart': boolean, 'requiredAcknowledgements': unique(key('HORSES_CHECKED'))})
define('DepartureInput', {'expectedVersion': v, 'approvedPlanVersion': integer(1, 1), 'assignmentVersion': integer(1, 1),
                          'occurredAt': stamp, 'acknowledgements': unique(key('HORSES_CHECKED'), 1),
                          'note': note, 'evidenceFileIds': files})
define('Checkpoint', {'id': key('CHECKPOINT_001'), 'milestoneId': key('MILESTONE_003'), 'version': integer(1, 1),
                      'status': en('PENDING', 'HELD', 'SUPPLEMENT_REQUIRED', 'CLEARED'), 'reason': note,
                      'evidenceFileIds': files, 'recordedBy': null(ref('Actor')), 'recordedAt': null(stamp)})
define('CheckpointInput', {'expectedVersion': v, 'checkpointVersion': integer(1, 1),
                           'decision': en('CLEARED', 'HELD', 'SUPPLEMENT_REQUIRED'), 'occurredAt': stamp,
                           'reason': reason, 'evidenceFileIds': unique(key('EVIDENCE_001'), 1)})
define('CorrectionInput', {'expectedVersion': v, 'milestoneRevision': integer(1, 1), 'reason': reason,
                           'proposedOccurredAt': stamp, 'proposedNote': note, 'proposedEvidenceFileIds': files})
define('Correction', {'id': key('CORRECTION_001'), 'milestoneId': key('MILESTONE_001'), 'version': integer(1, 1),
                      'status': en('PENDING', 'APPROVED', 'REJECTED'), 'reason': reason,
                      'requestedBy': ref('Actor'), 'requestedAt': stamp, 'original': ref('MilestoneInput'),
                      'proposed': ref('MilestoneInput'), 'decidedBy': null(ref('Actor')), 'decidedAt': null(stamp)})
define('CorrectionDecision', {'expectedVersion': v, 'correctionVersion': integer(1, 1),
                              'milestoneRevision': integer(1, 1), 'decision': en('APPROVE', 'REJECT'), 'reason': reason})
define('EtaInput', {'expectedVersion': v, 'proposedEta': stamp, 'reason': reason, 'milestoneId': key('MILESTONE_001'),
                    'incidentId': null(ident('INCIDENT'))})
define('EtaProposal', {'id': key('ETA_001'), 'version': integer(1, 1), 'currentEta': stamp, 'proposedEta': stamp,
                       'status': en('PENDING_COORDINATOR', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'WITHDRAWN'),
                       'requiresManager': boolean, 'escalationReasons': arr(text), 'reason': reason,
                       'incidentId': null(ident('INCIDENT')), 'proposedBy': ref('Actor'), 'proposedAt': stamp,
                       'decidedAt': null(stamp), 'decisionReason': null(reason)})
define('EtaDecision', {'expectedVersion': v, 'proposalVersion': integer(1, 1), 'decision': en('APPROVE', 'REJECT'), 'reason': reason})
define('AirNoticeInput', {'expectedVersion': v, 'bookingId': key('BOOKING_001'),
                          'kind': en('ESTIMATED_SCHEDULE', 'ACTUAL_DEPARTURE', 'ACTUAL_ARRIVAL'),
                          'departureAt': stamp, 'arrivalAt': stamp, 'receivedAt': stamp,
                          'sourceReference': st('Thông báo đối tác AIR số 123', minLength=1, maxLength=255),
                          'reason': reason, 'evidenceFileIds': unique(key('EVIDENCE_001'), 1), 'incidentId': null(ident('INCIDENT'))})
define('AirNotice', {'id': key('AIRNOTICE_001'), 'input': ref('AirNoticeInput'), 'recordedBy': ref('Actor'),
                     'recordedAt': stamp, 'requiresPlanChange': boolean, 'milestoneApplied': boolean})
define('AirHandoverInput', {'expectedVersion': v, 'occurredAt': stamp, 'horseIds': unique(ident('HORSE'), 1),
                           'bookingId': key('BOOKING_001'), 'partnerReference': st('Biên nhận đối tác AIR', minLength=1, maxLength=255),
                           'allHorsesChecked': yes, 'note': note, 'evidenceFileIds': unique(key('EVIDENCE_001'), 1)})
define('HealthInput', {'expectedVersion': v, 'horseId': ident('HORSE'), 'leg': leg,
                       'milestoneId': null(key('MILESTONE_001')), 'observedAt': stamp,
                       'condition': en('NORMAL', 'ABNORMAL'), 'observation': text,
                       'feeding': note, 'water': note, 'rest': note, 'care': note,
                       'temperatureC': null(num(38, 20, 50)), 'heartRateBpm': null(integer(40, 1, 300)),
                       'respiratoryRatePerMin': null(integer(16, 1, 200)), 'photoFileIds': files,
                       'incidentId': null(ident('INCIDENT'))})
define('HealthLog', {'id': key('HEALTH_001'), 'entry': ref('HealthInput'), 'recordedBy': ref('Actor'), 'recordedAt': stamp,
                     'supersedesId': null(key('HEALTH_001')), 'amendmentReason': null(reason),
                     'incidentRequired': boolean})
define('HealthAmendment', {'expectedVersion': v, 'reason': reason, 'replacement': ref('HealthInput')})
define('VetInput', {'expectedVersion': v, 'healthLogId': key('HEALTH_001'), 'examinedAt': stamp,
                    'conclusion': text, 'transportFitness': en('FIT', 'NOT_FIT', 'NEEDS_REVIEW'),
                    'instructions': text, 'evidenceFileIds': files, 'incidentId': null(ident('INCIDENT'))})
define('VetAssessment', {'id': key('ASSESSMENT_001'), 'entry': ref('VetInput'), 'recordedBy': ref('Actor'), 'recordedAt': stamp})
# Public DTOs deliberately omit internal revision/assignment data and incident work notes.
define('PublicHealth', {'id': key('HEALTH_001'), 'horseId': ident('HORSE'), 'observedAt': stamp, 'recordedAt': stamp,
                        'recordedBy': ref('Actor'), 'condition': en('NORMAL', 'ABNORMAL'), 'observation': text,
                        'feeding': note, 'water': note, 'rest': note, 'care': note,
                        'temperatureC': null(num(38, 20, 50)), 'heartRateBpm': null(integer(40, 1, 300)),
                        'respiratoryRatePerMin': null(integer(16, 1, 200)), 'photoFileIds': files,
                        'vetConclusion': null(text), 'vetInstructions': null(text), 'transportFitness': null(en('FIT', 'NOT_FIT', 'NEEDS_REVIEW')),
                        'vetRecordedBy': null(ref('Actor')), 'vetRecordedAt': null(stamp),
                        'amendmentReason': null(reason), 'supersedesId': null(key('HEALTH_001'))})
define('PublicMilestone', {'id': key('MILESTONE_001'), 'leg': leg, 'kind': kind, 'label': text, 'plannedAt': stamp,
                           'occurredAt': null(stamp), 'recordedAt': null(stamp), 'recordedBy': null(ref('Actor')),
                           'status': en('PENDING', 'COMPLETED'), 'note': note, 'revision': integer(1, 1)})
define('PublicTracking', {'serverTime': stamp, 'trip': ref('TripSummary'), 'milestones': arr(ref('PublicMilestone'), 1),
                          'horses': arr(ref('HorseSnapshot'), 1, 4), 'pickup': ref('Endpoint'), 'delivery': ref('Endpoint'),
                          'map': ref('Map'), 'health': arr(ref('PublicHealth')), 'customerNotice': note})
define('Alert', {'id': key('ALERT_001'), 'kind': en('MILESTONE_OVERDUE', 'HEALTH_CHECK_DUE', 'ETA_CHANGE'),
                 'tripId': ident('TRIP'), 'milestoneId': null(key('MILESTONE_001')), 'createdAt': stamp,
                 'status': en('OPEN', 'ACKNOWLEDGED', 'RESOLVED'), 'message': text,
                 'assigneeUserIds': unique(ident('USER')), 'acknowledgedBy': null(ref('Actor'))})
define('ContactInput', {'expectedVersion': v, 'contactedUserId': ident('USER'), 'contactedAt': stamp,
                        'channel': en('PHONE', 'IN_PERSON', 'OTHER'), 'result': text})
define('History', {'id': key('EVENT_001'), 'type': st('MILESTONE_COMPLETED'), 'actor': null(ref('Actor')),
                   'systemActor': boolean, 'recordedAt': stamp, 'reason': note, 'targetId': key('MILESTONE_001'),
                   'beforeRevision': null(integer(1, 1)), 'afterRevision': null(integer(2, 1))})
define('File', {'id': key('EVIDENCE_001'), 'tripId': ident('TRIP'), 'filename': st('anh-kiem-tra.jpg'),
                'mimeType': en('image/jpeg', 'image/png', 'application/pdf'), 'sizeBytes': integer(2048, 1, 10485760),
                'purpose': en('MILESTONE', 'AIR', 'CHECKPOINT', 'HEALTH'), 'uploadedAt': stamp})
define('Upload', {'purpose': en('MILESTONE', 'AIR', 'CHECKPOINT', 'HEALTH'), 'horseId': ident('HORSE'),
                  'file': {'type': 'string', 'format': 'binary'}}, ('horseId',))

def sample(schema):
    if '$ref' in schema: return sample(S[schema['$ref'].rsplit('/', 1)[-1]])
    if 'example' in schema: return copy.deepcopy(schema['example'])
    if 'const' in schema: return schema['const']
    if 'anyOf' in schema: return None
    if schema.get('type') == 'object': return {k: sample(x) for k, x in schema['properties'].items() if k in schema['required']}
    if schema.get('type') == 'array': return [sample(schema['items']) for _ in range(schema.get('minItems', 0))]
    if schema.get('type') == 'boolean': return False
    return None

COMMON = ['STALE_VERSION', 'IDEMPOTENCY_CONFLICT', 'TRIP_STATE_INVALID']
def op(code, method, path, roles, title, response, body=None, rules='', conflicts=(), created=False, multipart=False, binary=False, queries=(), result=None):
    if isinstance(roles, str): roles = [roles]
    params = []
    for name in re.findall(r'{(\w+)}', path):
        schema = ident('TRIP') if name == 'tripId' else ident('REQUEST') if name == 'requestId' else key(name.upper() + '_001')
        params.append(dict(name=name, **{'in': 'path'}, required=True, schema=schema))
    for name, schema in queries: params.append(dict(name=name, **{'in': 'query'}, required=False, schema=schema))
    if method != 'get': params.append(dict(name='Idempotency-Key', **{'in': 'header'}, required=True,
        schema=st('f141a4d2-3221-4a68-9b0e-1bac88cc1f0a', pattern=r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')))
    status = '201' if created else '200'
    responses = {}
    if binary:
        responses[status] = {'description': 'Bytes thật từ file đã lưu, kiểm scope và visibility trước tải.',
            'headers': {'Content-Disposition': {'schema': st('attachment; filename="evidence.jpg"')},
                        'Cache-Control': {'schema': st('private, no-store')}},
            'content': {mime: {'schema': {'type': 'string', 'format': 'binary'}} for mime in ['image/jpeg', 'image/png', 'application/pdf']}}
    else:
        responses[status] = {'description': 'Mẫu contract mục tiêu, không xác nhận API đã triển khai.', 'content': {'application/json': {
            'schema': obj({'success': {'type': 'boolean', 'const': True}, 'message': st('OK'), 'data': response}),
            'example': {'success': True, 'message': 'OK', 'data': sample(response) if result is None else result}}}}
    codes = {'400': ['VALIDATION_ERROR'], '401': ['UNAUTHENTICATED'], '403': ['FORBIDDEN'], '404': ['NOT_FOUND'],
             '409': list(dict.fromkeys(COMMON + list(conflicts))), '429': ['RATE_LIMITED'],
             '500': ['INTERNAL_ERROR'], '501': ['FEATURE_NOT_SUPPORTED']}
    if multipart: codes.update({'413': ['FILE_TOO_LARGE'], '415': ['UNSUPPORTED_MEDIA_TYPE']})
    for error_status, names in codes.items():
        responses[error_status] = {'description': 'Không commit một phần nghiệp vụ.', 'content': {'application/json': {
            'schema': ref('Error'), 'examples': {name: {'value': {'success': False, 'message': 'Không thể thực hiện: ' + name,
                'errorCode': name, 'data': None, 'blockers': [{'code': name, 'field': 'execution', 'message': 'Tải lại và kiểm tra điều kiện liên quan'}]}} for name in names}}}}
    operation = {'operationId': code, 'summary': title, 'description': rules, 'tags': [roles[0]], 'x-roles': roles,
                 'x-implementation-status': 'DESIGNED_NOT_IMPLEMENTED', 'parameters': params, 'responses': responses}
    if body: operation['requestBody'] = {'required': True, 'content': {'multipart/form-data' if multipart else 'application/json': {
        'schema': body, **({} if multipart else {'example': sample(body)})}}}
    OPS.append((code, method, path, operation))

trip = '/trips/{tripId}/execution'
driver = '/driver/trips/{tripId}'
coord = '/coordinator/trips/{tripId}'
customer = '/customer/requests/{requestId}'
op('F4-J01', 'get', '/master/flow4-capabilities', STAFF + [U], 'Capability và policy theo dõi hành trình', ref('Capabilities'),
   rules='Metadata đăng nhập; flags chỉ bật sau triển khai. Policy chưa cấu hình trả null, không fallback số phút/ảnh ở client.')
op('F4-J02', 'get', '/driver/trips', D, 'Nhiệm vụ vận chuyển được phân công', arr(ref('TripSummary')),
   rules='Chỉ chuyến có assignment của JWT, gồm lịch sử trong scope. Không trả mọi chuyến cho mọi tài xế.', queries=[('status', en('READY_TO_DEPART', 'IN_TRANSIT', 'COMPLETED'))])
op('F4-J03', 'get', trip, STAFF, 'Context hành trình và thao tác theo phân công', ref('Tracking'),
   rules='Driver chỉ có action ở chặng được giao; Specialist chỉ tác vụ checkpoint. Mốc/route từ approved snapshot, không sinh mốc dựa lịch giờ máy khách.')
op('F4-J04', 'get', driver + '/departure-check', D, 'Kiểm tra trước xuất phát thực tế', ref('Preflight'),
   rules='Kiểm lại approval, nguồn lực, hồ sơ, bảo hiểm, tình trạng ngựa và blocker hiện hành. GET không xuất phát. Inbound cũng dùng check theo chặng.', queries=[('leg', leg)])
op('F4-J05', 'post', driver + '/departure', D, 'Xác nhận xuất phát thực tế', ref('Mutation'), ref('DepartureInput'),
   rules='Chỉ MAIN_DRIVER/CO_DRIVER được giao ở ROAD đầu; recheck transaction với phiên bản plan/assignment hiện hành và acknowledgement server yêu cầu. Hoàn tất DEPARTED đầu tiên: Trip và Request IN_TRANSIT nguyên tử; không tạo Trip mới.', conflicts=['DEPARTURE_NOT_APPROVED', 'READINESS_CHANGED', 'NOT_ASSIGNED_LEG', 'INCIDENT_BLOCKING'])
op('F4-J06', 'post', driver + '/milestones/{milestoneId}/complete', D, 'Xác nhận mốc kế tiếp của chặng', ref('Mutation'), ref('MilestoneInput'),
   rules='Chỉ mốc generic STOP/CHECKPOINT/AIRPORT_ORIGIN/FINAL_ARRIVED và DEPARTED của inbound đã đủ tiếp nhận. DEPARTED đầu dùng J05, AIR dùng J13–J15. Kiểm thứ tự, thời gian, checklist và blocker. FINAL_ARRIVED chỉ mở Flow 6; Trip/Request vẫn IN_TRANSIT.',
   conflicts=['MILESTONE_NOT_NEXT', 'MILESTONE_ALREADY_COMPLETED', 'NOT_ASSIGNED_LEG', 'CHECKPOINT_NOT_CLEARED', 'INCIDENT_BLOCKING', 'USE_SPECIALIZED_COMMAND', 'INVALID_EVENT_TIME', 'HEALTH_CHECK_REQUIRED'])
op('F4-J07', 'get', trip + '/history', STAFF, 'Lịch sử hành trình, đính chính và quyết định', arr(ref('History')),
   rules='Append-only, thứ tự recordedAt rồi ID; chỉ lịch sử trong scope, giữ cả revision cũ, actor hệ thống có systemActor=true.')
op('F4-J08', 'post', driver + '/milestones/{milestoneId}/correction-requests', D, 'Yêu cầu đính chính mốc đã hoàn tất', ref('Correction'), ref('CorrectionInput'),
   rules='Chỉ mốc trong chặng được giao và COMPLETED; lưu original/proposed, không cập nhật mốc ngay; một yêu cầu pending mỗi mốc.', conflicts=['CORRECTION_ALREADY_PENDING', 'MILESTONE_NOT_COMPLETED'], created=True)
op('F4-J09', 'get', coord + '/milestone-corrections', C, 'Danh sách yêu cầu đính chính', arr(ref('Correction')), rules='Chỉ Trip điều phối viên được giao; giữ cả pending và lịch sử quyết định.')
op('F4-J10', 'post', coord + '/milestone-corrections/{correctionId}/decision', C, 'Duyệt hoặc từ chối đính chính', ref('Mutation'), ref('CorrectionDecision'),
   rules='Đúng revision mốc và yêu cầu; chỉ thay time/note/evidence đã đề nghị, không đổi actor ghi gốc, loại/chặng/thứ tự mốc. Kiểm toàn chuỗi thời gian và dependency; giữ revision cũ. Không xóa mốc hay đảo Trip đã bàn giao.', conflicts=['CORRECTION_DECIDED', 'INVALID_EVENT_TIME', 'CORRECTION_REQUIRES_INCIDENT'])
op('F4-J11', 'get', trip + '/checkpoints', STAFF, 'Kết quả cho phép đi tiếp tại checkpoint', arr(ref('Checkpoint')), rules='PENDING/HELD/SUPPLEMENT_REQUIRED đều chặn rời checkpoint, chăm sóc vẫn được ghi.')
op('F4-J12', 'post', '/specialist/trips/{tripId}/checkpoints/{checkpointId}/decisions', T, 'Ghi kết quả kiểm tra pháp lý thực tế', ref('Mutation'), ref('CheckpointInput'),
   rules='Specialist được giao ghi kết quả từ cơ quan/bên kiểm tra cùng bằng chứng sau CHECKPOINT_ARRIVED. CLEARED không gỡ blocker sức khỏe/nguồn lực. Không tự cấp giấy phép; đây là kết quả thực tế của Flow 2 trong hành trình, không checklist pre-departure thứ hai.', conflicts=['CHECKPOINT_NOT_ARRIVED', 'EVIDENCE_INVALID'])
op('F4-J13', 'post', driver + '/air/handover', D, 'Bàn giao ngựa cho đối tác AIR đầu đi', ref('Mutation'), ref('AirHandoverInput'),
   rules='MAIN_DRIVER/CO_DRIVER outbound, đúng mốc AIR_HANDOVER sau tới sân bay; đủ toàn bộ ngựa và booking hiện hành, bằng chứng đối tác. Không bàn giao cho người nhận cuối. Thông báo Manager/Customer/Coordinator sau commit.', conflicts=['MILESTONE_NOT_NEXT', 'HORSE_SET_MISMATCH', 'BOOKING_CHANGED', 'NOT_ASSIGNED_LEG'])
op('F4-J14', 'post', coord + '/air/notices', C, 'Ghi thông tin lịch hoặc sự kiện AIR từ đối tác', ref('AirNotice'), ref('AirNoticeInput'),
   rules='ESTIMATED_SCHEDULE chỉ ghi notice và mở đề xuất thay đổi khi cần, không đổi mốc thực tế/approved plan/ETA. ACTUAL_DEPARTURE/ARRIVAL chỉ áp dụng mốc kế tiếp AIR từ nguồn có bằng chứng; không giả làm actor hãng. Giờ thực tế không tương lai, arrival >= departure, đúng booking. Thay lịch chính thức phải qua Flow 5/Manager trước áp dụng.',
   conflicts=['BOOKING_CHANGED', 'MILESTONE_NOT_NEXT', 'INVALID_EVENT_TIME', 'INCIDENT_REQUIRED'], created=True)
op('F4-J15', 'post', driver + '/air/receive', D, 'Kiểm tra và tiếp nhận ngựa đầu đến', ref('Mutation'), ref('AirHandoverInput'),
   rules='MAIN_DRIVER/CO_DRIVER inbound sau AIR_ARRIVED có bằng chứng; đủ ngựa và tình trạng nhận. Bất thường ghi health/Flow 5, không khai bình thường giả. Mở inbound khi tất cả gate đủ; thông báo Manager/Customer/Coordinator.', conflicts=['MILESTONE_NOT_NEXT', 'HORSE_SET_MISMATCH', 'NOT_ASSIGNED_LEG', 'BOOKING_CHANGED'])
op('F4-J16', 'get', trip + '/air/notices', STAFF, 'Lịch sử thông tin hãng và lịch dự kiến riêng', arr(ref('AirNotice')), rules='Chỉ AIR; hiển thị nguồn, giờ nhận tin và giờ nhập; không coi giờ dự kiến là thực tế.')
op('F4-J17', 'post', driver + '/eta-proposals', D, 'Đề xuất ETA kèm lý do', ref('EtaProposal'), ref('EtaInput'),
   rules='Nhân sự chặng được giao, Trip IN_TRANSIT; chỉ một proposal mở. ETA hiện hành không đổi. Chậm do sự cố phải liên kết incident có thật.', conflicts=['ETA_PROPOSAL_OPEN', 'INCIDENT_REQUIRED', 'INVALID_EVENT_TIME'], created=True)
op('F4-J18', 'post', coord + '/eta-proposals', C, 'Điều phối viên lập đề xuất ETA', ref('EtaProposal'), ref('EtaInput'),
   rules='Cùng guard J17; ảnh hưởng hạn giao, tuyến, bay hoặc lịch chính thức thì server requiresManager=true. Không đổi địa chỉ giao hoặc giá khách.', conflicts=['ETA_PROPOSAL_OPEN', 'INCIDENT_REQUIRED'], created=True)
op('F4-J19', 'get', trip + '/eta-proposals', STAFF, 'Đọc ETA hiện hành và lịch sử đề xuất', arr(ref('EtaProposal')), rules='Trả cả proposal chờ và quyết định cũ. currentEta trong Tracking là nguồn hiện hành; proposedEta không thay nó.')
op('F4-J20', 'post', coord + '/eta-proposals/{proposalId}/decision', C, 'Xác nhận ETA hoặc trình Manager', ref('Mutation'), ref('EtaDecision'),
   rules='APPROVE trong phạm vi được phép cập nhật currentEta; nếu requiresManager thì chuyển PENDING_MANAGER và giữ ETA cũ. Server recheck tác động theo approved plan/deadline; ghi quyết định, không tự đổi lịch chính thức.', conflicts=['MANAGER_REVIEW_PENDING', 'PROPOSAL_DECIDED', 'INCIDENT_REQUIRED'])
op('F4-J21', 'post', '/manager/trips/{tripId}/eta-proposals/{proposalId}/decision', M, 'Manager quyết định đề xuất ETA vượt phạm vi', ref('Mutation'), ref('EtaDecision'),
   rules='Chỉ PENDING_MANAGER. Nếu phải đổi route/booking/resources/lịch chính thức, xử lý và phê duyệt phương án Flow 5 trước; ETA command chỉ công bố ETA tương ứng sau recheck, không tự sửa phương án hoặc hợp đồng.', conflicts=['CHANGE_PLAN_REQUIRED', 'PROPOSAL_NOT_ESCALATED', 'PROPOSAL_DECIDED'])
op('F4-J22', 'get', trip + '/health-logs', STAFF, 'Nhật ký chăm sóc và chỉ số từng ngựa', arr(ref('HealthLog')),
   rules='Ngựa thuộc Trip, không chẩn đoán bằng ngưỡng schema. Trả history amendment, người ghi và thời điểm quan sát/nhập riêng.', queries=[('horseId', ident('HORSE'))])
op('F4-J23', 'post', driver + '/health-logs', D, 'Ghi chăm sóc và quan sát sức khỏe', ref('HealthLog'), ref('HealthInput'),
   rules='Mọi nhân sự được giao ở chặng, gồm bác sĩ, được ghi; khi blocker hành trình còn mở vẫn cho chăm sóc. Checklist máy chủ quyết định ảnh/chỉ số cần có. ABNORMAL lưu ngay và trả incidentRequired=true nếu chưa liên kết incident; không tự mở mốc hay coi báo cáo là sự cố đã xử lý.', conflicts=['NOT_ASSIGNED_LEG', 'HEALTH_CHECK_REQUIRED', 'EVIDENCE_INVALID'], created=True)
op('F4-J24', 'post', driver + '/health-logs/{healthLogId}/amendments', D, 'Bổ sung bản đính chính nhật ký sức khỏe', ref('HealthLog'), ref('HealthAmendment'),
   rules='Chỉ tác giả đang có assignment, lưu bản mới supersedesId và lý do, giữ bản cũ; replacement.expectedVersion phải bằng outer expectedVersion. Không sửa kết luận bác sĩ bằng nhật ký chăm sóc.', conflicts=['NOT_LOG_AUTHOR', 'HEALTH_LOG_SUPERSEDED'], created=True)
op('F4-J25', 'post', driver + '/vet-assessments', D, 'Bác sĩ ghi kết luận và khả năng tiếp tục', ref('VetAssessment'), ref('VetInput'),
   rules='JWT DRIVER_ESCORT và assignment crewDuty=VETERINARIAN với chứng chỉ/qualification hợp lệ; không tạo role VET mới. NOT_FIT/NEEDS_REVIEW chặn phần liên quan. FIT chỉ giải quyết gate chuyên môn, không tự resume/đóng incident; kết luận mới append-only.', conflicts=['VETERINARIAN_REQUIRED', 'NOT_ASSIGNED_LEG', 'EVIDENCE_INVALID'], created=True)
op('F4-J26', 'get', trip + '/vet-assessments', STAFF, 'Đọc kết luận chuyên môn và hướng dẫn', arr(ref('VetAssessment')), rules='Chỉ ngựa/chuyến trong scope; giữ mọi lần đánh giá.')
op('F4-J27', 'get', trip + '/alerts', STAFF, 'Cảnh báo trễ mốc và chăm sóc đến hạn', arr(ref('Alert')),
   rules='Ngưỡng theo policy snapshot; chưa cấu hình thì không sinh cảnh báo định kỳ giả. Cảnh báo mốc cho Driver phụ trách và Coordinator, không tự complete hoặc escalate mọi cảnh báo lên Manager.')
op('F4-J28', 'post', coord + '/alerts/{alertId}/acknowledge', C, 'Ghi đã tiếp nhận cảnh báo', ref('Mutation'), ref('Command'), rules='Acknowledged không bằng resolved và không hoàn thành mốc.')
op('F4-J29', 'post', coord + '/contact-logs', C, 'Ghi kết quả liên hệ nhân sự không phản hồi', ref('Mutation'), ref('ContactInput'),
   rules='Người được liên hệ thuộc assignment Trip. Chỉ ghi kết quả đã liên hệ ngoài hệ thống; không tự gọi điện/gửi tin nhắn và không hoàn tất mốc.', created=True)
op('F4-J30', 'post', trip + '/files', [D, C, T], 'Upload bằng chứng hành trình thật', ref('File'), ref('Upload'),
   rules='FormData file bytes + purpose, horseId bắt buộc với HEALTH. HEALTH chỉ JPEG/PNG, mục khác PDF/JPEG/PNG <=10 MiB. Kiểm nội dung/MIME/quét và scope; chưa gắn file không tự hoàn tất mốc. Upload độc lập không đổi executionVersion.', created=True, multipart=True)
op('F4-J31', 'get', trip + '/files/{fileId}', STAFF, 'Tải file vận hành có kiểm quyền', None,
   rules='Kiểm Trip, assignment, file thực và metadata; không nhận URL tùy ý. Binary thật, JSON lỗi khi thất bại.', binary=True)
op('F4-J32', 'get', customer + '/tracking', U, 'Khách xem hành trình đơn của mình', ref('PublicTracking'),
   rules='Projection đã lọc nội dung nội bộ, chỉ ngựa/đơn của JWT. Có ETA hiện hành/đề xuất riêng và bản đồ mốc đã xác nhận; không lộ booking nội bộ, cost hoặc hồ sơ nhân sự.')
op('F4-J33', 'get', customer + '/health-logs', U, 'Khách xem chăm sóc, chỉ số, ảnh và nhận xét', arr(ref('PublicHealth')),
   rules='Chỉ ngựa thuộc đơn, gồm kết luận/hướng dẫn và người ghi/thời điểm được chia sẻ; giữ amendment. Không mutation.', queries=[('horseId', ident('HORSE'))])
op('F4-J34', 'get', customer + '/tracking-files/{fileId}', U, 'Khách tải ảnh/bằng chứng được chia sẻ', None,
   rules='Kiểm ownership Request, ngựa và visibility của từng file; không suy quyền từ biết fileId hoặc URL. Không tự chia sẻ file AIR/checkpoint nội bộ.', binary=True)
op('F4-J35', 'get', '/manager/trips/{tripId}/execution', M, 'Manager giám sát vận hành', ref('Tracking'),
   rules='Cùng read model J03 trong scope quản lý, không có quyền hoàn tất mốc thay tài xế.')

# Meaningful independent fixtures, rather than a fabricated end-to-end API run.
tracking = sample(ref('Tracking'))
tracking['trip']['eta'].update(currentEta='2026-11-10 18:00', deliveryDeadline='2026-11-11 18:00')
tracking['legs'][0].update(assignedUserIds=['USER_011', 'USER_012', 'USER_013'], vehicleId='VEHICLE_001', milestoneIds=['MILESTONE_001', 'MILESTONE_002'])
tracking['legs'][0]['crew'] = [{'userId': f'USER_{n:03}', 'name': name, 'duty': duty} for n, name, duty in
                              [(11, 'Nguyễn Văn An', 'MAIN_DRIVER'), (12, 'Trần Văn Bình', 'CO_DRIVER'), (13, 'Lê Văn Cường', 'VETERINARIAN')]]
first = tracking['milestones'][0]
first['actions']['canComplete'] = True
last = copy.deepcopy(first)
last.update(id='MILESTONE_002', kind='FINAL_ARRIVED', sequence=2, label='Đến điểm giao cuối', plannedAt='2026-11-10 18:00')
last['actions']['canComplete'] = False
tracking['milestones'].append(last)
for code, method, path, operation in OPS:
    response = operation['responses'].get('201', operation['responses']['200'] if '200' in operation['responses'] else None)
    if code in ('F4-J03', 'F4-J35'): response['content']['application/json']['example']['data'] = copy.deepcopy(tracking)
    if code == 'F4-J01': response['content']['application/json']['example']['data']['policy'].update(configured=False)
    if code == 'F4-J14':
        data = response['content']['application/json']['example']['data']
        data['input'].update(departureAt='2026-11-10 12:00', arrivalAt='2026-11-10 16:00')
        operation['requestBody']['content']['application/json']['example'].update(departureAt='2026-11-10 12:00', arrivalAt='2026-11-10 16:00')
    if method != 'get' and code not in ('F4-J30',):
        data = response['content']['application/json']['example']['data']
        if 'binding' in data: data['binding']['executionVersion'] = 11
        if 'trip' in data: data['trip'].update(tripStatus='IN_TRANSIT', requestStatus='IN_TRANSIT', phase='IN_PROGRESS')
    if code == 'F4-J05':
        data = response['content']['application/json']['example']['data']
        data['trip'].update(tripStatus='IN_TRANSIT', requestStatus='IN_TRANSIT', phase='IN_PROGRESS', lastMilestoneId='MILESTONE_001')
    if code in ('F4-J17', 'F4-J18'):
        operation['requestBody']['content']['application/json']['example']['proposedEta'] = '2026-11-10 19:00'
        response['content']['application/json']['example']['data'].update(currentEta='2026-11-10 18:00', proposedEta='2026-11-10 19:00')
    if code == 'F4-J25':
        response['content']['application/json']['example']['data']['recordedBy']['crewDuty'] = 'VETERINARIAN'

# AIR fixture includes only confirmed source locations, never a moving GPS marker.
air_tracking = copy.deepcopy(tracking)
air_tracking['trip'].update(mode='AIR')
air_tracking['flight'] = sample(ref('FlightSnapshot'))
air_tracking['flight'].update(plannedDepartureAt='2026-11-10 12:00', plannedArrivalAt='2026-11-10 16:00')
air_tracking['legs'] = []
air_tracking['milestones'] = []
air_sequence = [
    ('outbound', 'DEPARTED', '2026-11-10 06:00'),
    ('outbound', 'AIRPORT_ORIGIN_ARRIVED', '2026-11-10 09:00'),
    ('outbound', 'AIR_HANDOVER', '2026-11-10 10:00'),
    ('air', 'AIR_DEPARTED', '2026-11-10 12:00'),
    ('air', 'AIR_ARRIVED', '2026-11-10 16:00'),
    ('inbound', 'AIR_RECEIVED', '2026-11-10 17:00'),
    ('inbound', 'DEPARTED', '2026-11-10 17:30'),
    ('inbound', 'FINAL_ARRIVED', '2026-11-10 18:00'),
]
for i, (leg_key, event_kind, planned_at) in enumerate(air_sequence, 1):
    event = copy.deepcopy(first)
    event.update(id=f'MILESTONE_{i:03}', leg=leg_key, kind=event_kind, sequence=i, plannedAt=planned_at, label=event_kind)
    event['actions']['canComplete'] = i == 1
    air_tracking['milestones'].append(event)
for j, leg_key in enumerate(('outbound', 'air', 'inbound')):
    item = copy.deepcopy(tracking['legs'][0])
    item.update(key=leg_key, mode='AIR' if leg_key == 'air' else 'ROAD',
                milestoneIds=[m['id'] for m in air_tracking['milestones'] if m['leg'] == leg_key])
    if leg_key == 'air': item.update(assignedUserIds=[], crew=[], vehicleId=None)
    if leg_key == 'inbound':
        item.update(assignedUserIds=['USER_014', 'USER_015', 'USER_016'], vehicleId='VEHICLE_002')
        for crew_index, crew in enumerate(item['crew'], 14): crew.update(userId=f'USER_{crew_index:03}', name=f'Nhân sự đầu đến {crew_index}')
    air_tracking['legs'].append(item)

def dump(value): return json.dumps(value, ensure_ascii=False, indent=2) + '\n'
paths = {}
for _, method, path, operation in OPS: paths.setdefault(path, {})[method] = operation
spec = {'openapi': '3.1.0', 'info': {'title': 'Racehorse Transport — Flow 4: thực hiện và theo dõi hành trình', 'version': '1.0.0',
        'description': 'Contract đích 29/10/2026; chưa triển khai backend/DB. Thời gian Asia/Ho_Chi_Minh. Không GPS realtime.'},
        'servers': [{'url': '/api'}], 'security': [{'bearerAuth': []}], 'paths': paths,
        'components': {'securitySchemes': {'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}}, 'schemas': S},
        'x-id-policy': 'IDs for new execution records are opaque backend-issued keys, not assertions about SQL tables.',
        'x-contract-source': 'FLOW4.md; Flow3 v2; Flow6 v1; agreed Flow4 business baseline 18/10/2026'}
(ROOT / 'flow4.openapi.json').write_text(dump(spec), encoding='utf-8')
index = ['| Mã | Method | Endpoint | Chức năng |', '|---|---|---|---|'] + [f'| {c} | {m.upper()} | `{p}` | {o["summary"]} |' for c, m, p, o in OPS]
md = ['# Flow 4 — JSON từng API', '', '**1.0.0 — 29/10/2026. Contract mục tiêu; chưa triển khai backend/database hoặc tích hợp frontend.**', '',
      '[Nghiệp vụ](FLOW4.md) · [OpenAPI](flow4.openapi.json) · [Kịch bản](flow4.examples.json).', '',
      'Base `/api`, Bearer JWT, Accept application/json. JSON dùng Content-Type application/json. GET không body. Mutation có Idempotency-Key UUID; payload và status/actor được kiểm máy chủ. Mẫu độc lập, không phải script chạy nối tiếp. Timestamp địa phương Asia/Ho_Chi_Minh. Lists trả data array.', '', *index, '']
for code, method, path, operation in OPS:
    md += [f'## {code} — {method.upper()} {path}', '', operation['summary'], '', '**Role:** ' + ', '.join(operation['x-roles']), '',
           '**Điều kiện và ảnh hưởng:** ' + operation['description'], '', '| Vị trí | Tên | Bắt buộc | Schema |', '|---|---|---|---|']
    md += [f'| {p["in"]} | `{p["name"]}` | {p["required"]} | `{json.dumps(p["schema"], ensure_ascii=False)}` |' for p in operation['parameters']]
    body = operation.get('requestBody', {}).get('content', {})
    if 'application/json' in body: md += ['', '**Request JSON**', '', '```json', dump(body['application/json']['example']).rstrip(), '```']
    elif body: md += ['', '**Multipart:** `file` bytes thật, `purpose`, `horseId` nếu HEALTH; tối đa 10 MiB. HEALTH chỉ JPEG/PNG. Không đặt Content-Type thủ công, trình duyệt tạo boundary. Không gửi JSON/base64/object URL.']
    else: md += ['', '**Request body:** Không gửi.']
    for status, response in operation['responses'].items():
        content = response['content'].get('application/json')
        if not content: md += ['', f'**Response {status}:** binary với MIME file đã lưu; Content-Disposition an toàn, Cache-Control private, no-store. Lỗi trả JSON theo status.']
        elif status.startswith('2'): md += ['', f'**Response {status} — mẫu mục tiêu**', '', '```json', dump(content['example']).rstrip(), '```']
        else: md += ['', f'**Response {status}:** ' + ', '.join(content['examples']) + '; schema Error và JSON đầy đủ trong OpenAPI.']
    err = operation['responses']['409']['content']['application/json']['examples']
    error = list(err.values())[min(3, len(err) - 1)]['value']
    md += ['', '**Mẫu lỗi nghiệp vụ**', '', '```json', dump(error).rstrip(), '```', '']
(ROOT / 'FLOW4-API-JSON.md').write_text('\n'.join(md), encoding='utf-8')

scenarios = [
 ('road-departure', 'Manager đã duyệt, precheck đạt', 'J05 với version vừa đọc', 'Trip/Request IN_TRANSIT, chỉ một DEPARTED, thông báo sau commit'),
 ('approval-is-not-departure', 'Trip READY_TO_DEPART', 'GET J03/J04, thời gian plannedDepart tới', 'Không tự DEPARTED'),
 ('readiness-race', 'J04 canDepart=true rồi xe bị hỏng', 'J05', '409 READINESS_CHANGED hoặc INCIDENT_BLOCKING, không commit'),
 ('next-only', 'Mốc 1 chưa hoàn tất', 'J06 mốc 2', '409 MILESTONE_NOT_NEXT'),
 ('completed-locked', 'Mốc đã COMPLETED', 'Gửi key mới cho cùng mốc', '409 MILESTONE_ALREADY_COMPLETED'),
 ('idempotent-retry', 'J05 đã commit', 'Retry cùng principal/key/body', 'Response gốc; không thêm history/outbox/mốc'),
 ('idempotency-conflict', 'Key đã dùng', 'Cùng key nhưng khác body/path', '409 IDEMPOTENCY_CONFLICT'),
 ('different-leg', 'Tài xế outbound', 'Hoàn tất inbound hoặc dùng file Trip khác', '404 tài nguyên ngoài scope hoặc 409 NOT_ASSIGNED_LEG khi có quyền xem Trip'),
 ('checkpoint-held', 'CHECKPOINT_ARRIVED, kết quả HELD', 'J06 CHECKPOINT_DEPARTED', '409 CHECKPOINT_NOT_CLEARED; J23 chăm sóc vẫn được'),
 ('checkpoint-clearance', 'Specialist CLEARED có bằng chứng', 'Còn sự cố sức khỏe chặn', 'Vẫn chặn đi tiếp; không coi CLEARED gỡ mọi blocker'),
 ('air-sequence', 'AIR plan đã duyệt và booking thật', 'Outbound DEPARTED → airport → J13 → J14 actual departure → actual arrival → J15 → inbound DEPARTED → FINAL_ARRIVED', 'Kiểm next/scope/bằng chứng; AIR_HANDOVER và AIR_RECEIVED thông báo ba bên'),
 ('air-estimate', 'Đã tới giờ bay dự kiến', 'J14 ESTIMATED_SCHEDULE hoặc GET', 'Không AIR_DEPARTED/AIR_ARRIVED tự động, không đổi approved snapshot'),
 ('air-missing-horse', 'Có hai ngựa', 'J13/J15 chỉ gửi một ngựa', '409 HORSE_SET_MISMATCH'),
 ('correction-pending', 'Mốc đã hoàn tất', 'J08', 'Giữ nguyên mốc, lưu original/proposed'),
 ('correction-order', 'Giờ sửa vượt giờ mốc kế tiếp', 'J10 APPROVE', '409 INVALID_EVENT_TIME, giữ cả yêu cầu và dữ liệu gốc'),
 ('correction-history', 'Yêu cầu hợp lệ đúng revision', 'J10 APPROVE', 'Tăng revision, lưu cả before/after/actor/reason, không lùi Trip state'),
 ('eta-proposal', 'ETA hiện hành 18:00', 'J17 đề xuất 19:00', 'Hiển thị hai ETA, current vẫn 18:00'),
 ('eta-manager', 'ETA vượt hạn giao hoặc đổi lịch chính thức', 'J20 APPROVE', 'PENDING_MANAGER, chưa đổi currentEta; J21 cần phương án Flow5 hợp lệ'),
 ('incident-link', 'Chậm do xe hỏng', 'Đề xuất chỉ ghi lý do, không incident', '409 INCIDENT_REQUIRED; không dùng ETA thay xử lý sự cố'),
 ('health-abnormal', 'Ngựa có dấu hiệu bất thường', 'J23 ABNORMAL không incident', 'Lưu quan sát ngay, incidentRequired=true, không coi gate vận chuyển đạt'),
 ('vet-permission', 'Driver không phải bác sĩ được phân công', 'J25 FIT', '403 hoặc 409 VETERINARIAN_REQUIRED; không ghi kết luận'),
 ('vet-not-fit', 'Bác sĩ kết luận NOT_FIT', 'J06 đi tiếp', '409 INCIDENT_BLOCKING; chăm sóc tiếp tục'),
 ('customer-scope', 'Customer A', 'Đọc request/file/horse của B', '404, không lộ sự tồn tại hoặc nội dung nội bộ'),
 ('file-validation', 'Upload giả JPEG hoặc HEALTH PDF hoặc >10MiB', 'J30', '400/415/413; không file được gắn nghiệp vụ'),
 ('alerts-policy', 'Ngưỡng policy null', 'Chạy job cảnh báo', 'Không tự đặt 30 phút/ảnh; UI hiện chưa cấu hình'),
 ('alert-ack', 'Cảnh báo OPEN', 'J28/J29', 'Chỉ ack/contact, không tự hoàn tất mốc'),
 ('last-location', 'Chưa có mốc geo xác nhận', 'J32 map', 'markerGeo=null; không nội suy vị trí GPS'),
 ('final-arrival', 'FINAL_ARRIVED hoàn tất', 'Đọc J03 và chuyển Flow6', 'AWAITING_HANDOVER, Trip/Request IN_TRANSIT; chưa COMPLETED/DELIVERED/acceptanceWindow'),
 ('handover-contract', 'Đã đến điểm giao cuối', 'Bàn giao hợp lệ bằng Flow6', 'Trip COMPLETED, Request DELIVERED theo Flow6; không tự đóng'),
 ('transaction-rollback', 'Lỗi ghi history/outbox trong mutation', 'Commit', 'Rollback trạng thái, retry an toàn'),
 ('capability-off', 'persistenceAvailable=false', 'Gọi mutation', '501 FEATURE_NOT_SUPPORTED, không fallback mock'),
 ('health-amendment', 'Nhật ký đã ghi', 'J24 với lý do', 'Append supersedesId, bản cũ còn; không sửa kết luận bác sĩ'),
]
examples = {'contractVersion': '1.0.0', 'status': 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS',
            'road': tracking, 'air': air_tracking, 'scenarios': [{'id': a, 'given': b, 'when': c, 'then': d} for a,b,c,d in scenarios]}
(ROOT / 'flow4.examples.json').write_text(dump(examples), encoding='utf-8')
print(f'Generated {len(OPS)} operations, {len(S)} schemas, {len(scenarios)} acceptance scenarios.')
