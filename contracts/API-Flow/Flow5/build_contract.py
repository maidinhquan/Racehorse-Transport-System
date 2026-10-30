"""Generate Flow 5 target contracts only; no backend, database or provider calls."""
from pathlib import Path
import copy
import json
import re

ROOT = Path(__file__).resolve().parent
S, OPS = {}, []
def st(example='Thông tin', **kw): return dict(type='string', example=example, **kw)
def integer(example=1, minimum=0, maximum=9007199254740991): return dict(type='integer', minimum=minimum, maximum=maximum, example=example)
def en(*values): return st(values[0], enum=list(values))
def obj(props, optional=()): return dict(type='object', properties=props, required=[k for k in props if k not in optional], additionalProperties=False)
def arr(items, minimum=0, maximum=1000): return dict(type='array', items=items, minItems=minimum, maxItems=maximum)
def ref(name): return {'$ref': '#/components/schemas/' + name}
def null(schema): return {'anyOf': [schema, {'type': 'null'}]}
def define(name, props, optional=()): S[name] = obj(props, optional); return ref(name)
def ident(prefix, n=1): return st(f'{prefix}_{n:03}', pattern=f'^{prefix}_\\d{{3,}}$', maxLength=50)
def key(example): return st(example, minLength=1, maxLength=100, pattern=r'^[A-Za-z0-9_-]+$')
def unique(schema, minimum=0): return dict(arr(schema, minimum, 100), uniqueItems=True)
stamp = st('2026-11-10 08:00', pattern=r'^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$')
text = st('Xe không thể tiếp tục, tổ xe đang chăm sóc ngựa an toàn', minLength=1, maxLength=2000, pattern=r'\S')
reason = st('Cần bố trí nguồn lực thay thế phù hợp phần hành trình còn lại', minLength=5, maxLength=2000, pattern=r'\S')
note = st('', maxLength=2000)
v = integer(10, 1)
boolean = {'type': 'boolean', 'example': False}
yes = {'type': 'boolean', 'const': True, 'example': True}
leg = en('road', 'outbound', 'air', 'inbound')
files = unique(key('EVIDENCE_001'))
money = integer(1000000)
C, M, D, T, U = 'FLEET_ROUTE_COORDINATOR', 'LOGISTICS_MANAGER', 'DRIVER_ESCORT', 'TRANSPORT_SPECIALIST', 'CUSTOMER'
STAFF = [D, C, M, T]
define('Actor', {'userId': ident('USER', 6), 'name': st('Phạm Hải'), 'role': en(C, M, D, T, U),
                 'crewDuty': null(en('MAIN_DRIVER', 'CO_DRIVER', 'VETERINARIAN'))})
define('Blocker', {'code': st('RESOURCE_CONFIRMATION_REQUIRED'), 'field': st('recovery.resources'), 'message': text})
define('Error', {'success': {'type': 'boolean', 'const': False}, 'message': text, 'errorCode': st('STALE_VERSION'),
                 'data': {'type': 'null'}, 'blockers': arr(ref('Blocker')),
                 'errors': {'type': 'object', 'additionalProperties': arr(text)}}, ('blockers', 'errors'))
define('Binding', {'incidentVersion': v, 'recoveryVersion': null(integer(1, 1)), 'approvedPlanVersion': integer(1, 1),
                   'executionVersion': integer(11, 1), 'assignmentVersion': integer(1, 1)})
define('Command', {'expectedVersion': v, 'reason': reason})
define('Capabilities', {'version': {'type': 'string', 'const': '1.0.0'}, 'implementationStatus': en('DESIGNED_NOT_IMPLEMENTED', 'AVAILABLE'),
                        'persistenceAvailable': boolean, 'filesAvailable': boolean, 'notificationsAvailable': boolean,
                        'recoveryApplyAvailable': boolean, 'terminationSettlementAvailable': boolean,
                        'currency': {'type': 'string', 'const': 'VND'}, 'timezone': {'type': 'string', 'const': 'Asia/Ho_Chi_Minh'}})
category = en('VEHICLE_RESOURCE', 'HORSE_HEALTH', 'DELAY_AIR', 'OTHER')
area = en('RESOURCES', 'SCHEDULE', 'BOOKING', 'DOCUMENTS', 'INSURANCE', 'HEALTH', 'DELIVERY_DEADLINE', 'INTERNAL_COST')
define('Scope', {'leg': leg, 'horseIds': unique(ident('HORSE')), 'milestoneIds': unique(key('MILESTONE_002'))})
define('ReportInput', {'tripId': ident('TRIP'), 'expectedExecutionVersion': integer(11, 1), 'category': category,
                       'scope': ref('Scope'), 'occurredAt': stamp, 'description': text, 'immediateCare': note,
                       'evidenceFileIds': files, 'healthLogIds': unique(key('HEALTH_001'))})
define('IncidentSummary', {'id': ident('INCIDENT'), 'tripId': ident('TRIP'), 'requestId': ident('REQUEST'), 'category': category,
                           'status': en('REPORTED', 'IN_PROGRESS', 'RESOLVED'), 'scope': ref('Scope'), 'description': text,
                           'occurredAt': stamp, 'reportedAt': stamp, 'reportedBy': ref('Actor'),
                           'coordinatorId': ident('USER', 6), 'hasBlockingScope': boolean,
                           'resolutionOutcome': null(en('RECOVERED', 'TERMINATION_REFERRED')), 'resolvedAt': null(stamp)})
define('ActionFlags', {'canAccept': boolean, 'canAssessImpact': boolean, 'canSubmitRecovery': boolean,
                       'canDecideRecovery': boolean, 'canApplyRecovery': boolean, 'canContinue': boolean,
                       'canResolve': boolean, 'blockers': arr(ref('Blocker'))})
define('Impact', {'area': area, 'status': en('AFFECTED', 'NOT_AFFECTED', 'UNASSESSED'), 'reason': reason,
                  'blockedMilestoneIds': unique(key('MILESTONE_002')), 'blockedHorseIds': unique(ident('HORSE'))})
define('AssessmentInput', {'expectedVersion': v, 'impacts': arr(ref('Impact'), 8, 8), 'reason': reason})
define('Task', {'id': key('TASK_001'), 'area': area, 'assignee': ref('Actor'), 'status': en('OPEN', 'IN_PROGRESS', 'DONE'),
                'instruction': text, 'result': null(text), 'evidenceFileIds': files, 'updatedAt': stamp})
define('TaskInput', {'expectedVersion': v, 'area': area, 'assigneeUserId': ident('USER', 8), 'instruction': text})
define('TaskProgress', {'expectedVersion': v, 'status': en('IN_PROGRESS', 'DONE'), 'result': text, 'evidenceFileIds': files})
define('UpdateInput', {'expectedVersion': v, 'occurredAt': stamp, 'kind': en('FIELD_REPORT', 'EMERGENCY_CARE', 'WORK_PROGRESS'),
                       'message': text, 'evidenceFileIds': files})
define('Update', {'id': key('UPDATE_001'), 'kind': en('FIELD_REPORT', 'EMERGENCY_CARE', 'WORK_PROGRESS'),
                  'occurredAt': stamp, 'recordedAt': stamp, 'actor': ref('Actor'), 'message': text, 'evidenceFileIds': files})
define('Crew', {'mainDriverId': ident('USER', 11), 'coDriverId': ident('USER', 12), 'veterinarianId': ident('USER', 13)})
define('ResourceChange', {'leg': leg, 'oldVehicleId': null(ident('VEHICLE')), 'vehicleId': ident('VEHICLE', 2),
                          'crew': ref('Crew'), 'availableFrom': stamp, 'availableUntil': stamp, 'reason': reason})
define('ScheduleChange', {'milestoneId': key('MILESTONE_002'), 'plannedAt': stamp})
define('FlightChange', {'oldBookingId': key('BOOKING_001'), 'partnerId': key('PARTNER_001'), 'serviceId': key('SERVICE_002'),
                        'catalogVersion': integer(1, 1), 'flightCode': st('EQ124'), 'plannedDepartureAt': stamp,
                        'plannedArrivalAt': stamp, 'quotedCostVnd': money})
define('RecoveryContent', {'reason': reason, 'scope': ref('Scope'), 'resources': arr(ref('ResourceChange'), 0, 2),
                           'schedule': arr(ref('ScheduleChange')), 'flight': null(ref('FlightChange')),
                           'proposedEta': null(stamp), 'internalCostVnd': integer(0),
                           'customerAdditionalChargeVnd': {'type': 'integer', 'const': 0},
                           'careInstructions': text, 'evidenceFileIds': files})
define('RecoveryInput', {'expectedVersion': v, 'baseApprovedPlanVersion': integer(1, 1),
                         'baseExecutionVersion': integer(11, 1), 'baseAssignmentVersion': integer(1, 1),
                         'content': ref('RecoveryContent')})
define('Recovery', {'id': key('RECOVERY_001'), 'version': integer(1, 1),
                    'status': en('DRAFT', 'PENDING_APPROVAL', 'RETURNED', 'APPROVED', 'APPLIED', 'SUPERSEDED'),
                    'content': ref('RecoveryContent'), 'requiresManager': boolean, 'approvalReasons': arr(text),
                    'baseApprovedPlanVersion': integer(1, 1), 'baseExecutionVersion': integer(11, 1),
                    'baseAssignmentVersion': integer(1, 1), 'approvedBy': null(ref('Actor')), 'approvedAt': null(stamp)})
define('PlanCommand', {'expectedVersion': v, 'recoveryVersion': integer(1, 1)})
define('RecoveryDecision', {'expectedVersion': v, 'recoveryVersion': integer(1, 1),
                            'decision': en('APPROVE', 'RETURN'), 'reason': reason})
define('Check', {'code': key('RESOURCES_VALID'), 'area': area, 'required': boolean, 'ok': boolean, 'detail': text})
define('Readiness', {'binding': ref('Binding'), 'readinessVersion': key('CHECK_001'), 'serverTime': stamp,
                     'checks': arr(ref('Check')), 'blockers': arr(ref('Blocker')), 'canApplyRecovery': boolean,
                     'canContinue': boolean, 'canResolve': boolean, 'blockedScopes': arr(ref('Scope'))})
define('ContinuationInput', {'expectedVersion': v, 'recoveryVersion': null(integer(1, 1)),
                             'readinessVersion': key('CHECK_001'), 'scope': ref('Scope'), 'reason': reason})
define('ComplianceInput', {'expectedVersion': v, 'recoveryVersion': integer(1, 1),
                           'area': en('DOCUMENTS', 'INSURANCE'), 'result': en('SATISFIED', 'BLOCKED', 'NOT_AFFECTED'),
                           'reason': reason, 'sourceRecordIds': unique(key('DOCUMENT_001')),
                           'evidenceFileIds': files})
define('VetInput', {'expectedVersion': v, 'horseId': ident('HORSE'), 'examinedAt': stamp,
                    'transportFitness': en('FIT', 'NOT_FIT', 'NEEDS_REVIEW'), 'conclusion': text,
                    'careInstructions': text, 'healthLogIds': unique(key('HEALTH_001')), 'evidenceFileIds': files})
define('ExternalActionInput', {'expectedVersion': v, 'recoveryVersion': integer(1, 1),
                               'kind': en('PARTNER_CONTACT', 'OLD_BOOKING_CANCELLED', 'NEW_BOOKING_CONFIRMED', 'RESOURCE_CONFIRMED'),
                               'reference': st('Đối tác xác nhận số 123', minLength=1, maxLength=255),
                               'bookingId': null(key('BOOKING_001')), 'leg': null(leg), 'completedAt': stamp,
                               'reason': reason, 'evidenceFileIds': unique(key('EVIDENCE_001'), 1)})
for record_name, input_name in [('ComplianceReview', 'ComplianceInput'), ('VetAssessment', 'VetInput'), ('ExternalAction', 'ExternalActionInput')]:
    define(record_name, {'id': key('RECORD_001'), 'actor': ref('Actor'), 'recordedAt': stamp,
                        'content': obj({k: copy.deepcopy(s) for k,s in S[input_name]['properties'].items() if k != 'expectedVersion'}),
                        'valid': boolean, 'invalidatedReason': null(reason)})
define('ResourceOption', {'vehicleId': ident('VEHICLE', 2), 'leg': leg, 'capacity': integer(4, 1, 4),
                          'eligible': boolean, 'blockers': arr(ref('Blocker')), 'availableUserIds': unique(ident('USER'))})
define('Mutation', {'binding': ref('Binding'), 'incident': ref('IncidentSummary'), 'recordId': key('RECORD_001'),
                    'blockers': arr(ref('Blocker'))})
define('IncidentDetail', {'binding': ref('Binding'), 'incident': ref('IncidentSummary'), 'impacts': arr(ref('Impact')),
                          'tasks': arr(ref('Task')), 'recovery': null(ref('Recovery')), 'readiness': ref('Readiness'),
                          'complianceReviews': arr(ref('ComplianceReview')), 'vetAssessments': arr(ref('VetAssessment')),
                          'externalActions': arr(ref('ExternalAction')), 'actions': ref('ActionFlags'), 'evidenceFileIds': files})
define('History', {'id': key('EVENT_001'), 'action': st('INCIDENT_REPORTED'), 'actor': null(ref('Actor')),
                   'systemActor': boolean, 'recordedAt': stamp, 'reason': note,
                   'beforeVersion': null(integer(9, 1)), 'afterVersion': integer(10, 1), 'targetId': key('RECOVERY_001')})
define('CommunicationInput', {'expectedVersion': v, 'type': en('NOTICE', 'AGREEMENT_REQUEST'),
                             'recoveryVersion': null(integer(1, 1)), 'message': text,
                             'proposedDeliveryAt': null(stamp), 'evidenceFileIds': files})
define('Communication', {'id': key('MESSAGE_001'), 'version': integer(1, 1), 'type': en('NOTICE', 'AGREEMENT_REQUEST'),
                         'message': text, 'proposedDeliveryAt': null(stamp), 'status': en('SENT', 'ACCEPTED', 'REJECTED'),
                         'sentBy': ref('Actor'), 'sentAt': stamp, 'replyBy': null(ref('Actor')), 'repliedAt': null(stamp)})
define('CustomerReply', {'expectedVersion': v, 'messageVersion': integer(1, 1),
                         'decision': en('ACCEPT', 'REJECT'), 'message': note})
define('ExternalAgreementInput', {'expectedVersion': v, 'messageId': key('MESSAGE_001'), 'messageVersion': integer(1, 1),
                                 'reference': text, 'agreedAt': stamp, 'reason': reason,
                                 'evidenceFileIds': unique(key('EVIDENCE_001'), 1)})
define('PublicIncident', {'id': ident('INCIDENT'), 'tripId': ident('TRIP'), 'category': category,
                          'status': en('REPORTED', 'IN_PROGRESS', 'RESOLVED'), 'horseIds': unique(ident('HORSE')),
                          'customerSummary': text, 'customerImpact': note, 'latestDeliveryAt': null(stamp),
                          'reportedAt': stamp, 'resolvedAt': null(stamp), 'evidenceFileIds': files,
                          'communications': arr(ref('Communication'))})
define('PublicContext', {'incidentVersion': v, 'incident': ref('PublicIncident')})
define('TerminationInput', {'expectedVersion': v, 'reason': reason, 'careAndCustodyPlan': text,
                           'proposedRefundVnd': money, 'basis': text, 'evidenceFileIds': files})
define('TerminationProposal', {'id': key('TERMINATION_001'), 'version': integer(1, 1),
                              'status': en('PROPOSED', 'ACCEPTED', 'REJECTED', 'REFERRED'), 'reason': reason,
                              'careAndCustodyPlan': text, 'proposedRefundVnd': money, 'basis': text,
                              'proposedBy': ref('Actor'), 'proposedAt': stamp,
                              'respondedBy': null(ref('Actor')), 'respondedAt': null(stamp),
                              'settlementCaseId': null(key('SETTLEMENT_001')), 'financiallySettled': boolean})
define('TerminationReply', {'expectedVersion': v, 'proposalVersion': integer(1, 1), 'decision': en('ACCEPT', 'REJECT'), 'message': note})
define('TerminationReferInput', {'expectedVersion': v, 'proposalVersion': integer(1, 1), 'readinessVersion': key('CHECK_001'),
                                'custodyEvidenceFileIds': unique(key('EVIDENCE_001'), 1), 'reason': reason})
define('File', {'id': key('EVIDENCE_001'), 'tripId': ident('TRIP'), 'incidentId': null(ident('INCIDENT')),
                'filename': st('bien-ban-su-co.pdf'), 'mimeType': en('application/pdf', 'image/jpeg', 'image/png'),
                'sizeBytes': integer(2048, 1, 10485760), 'visibility': en('INTERNAL', 'CUSTOMER'), 'uploadedAt': stamp})
define('Upload', {'file': {'type': 'string', 'format': 'binary'}, 'purpose': en('INCIDENT', 'HEALTH', 'PARTNER', 'CUSTODY', 'AGREEMENT')})
define('ShareFileInput', {'expectedVersion': v, 'reason': reason})

def sample(schema):
    if '$ref' in schema: return sample(S[schema['$ref'].rsplit('/', 1)[-1]])
    if 'example' in schema: return copy.deepcopy(schema['example'])
    if 'const' in schema: return schema['const']
    if 'anyOf' in schema: return None
    if schema.get('type') == 'object': return {k: sample(x) for k,x in schema['properties'].items() if k in schema['required']}
    if schema.get('type') == 'array': return [sample(schema['items']) for _ in range(schema.get('minItems', 0))]
    if schema.get('type') == 'boolean': return False
    return None

COMMON = ['STALE_VERSION', 'IDEMPOTENCY_CONFLICT', 'INCIDENT_STATE_INVALID']
def op(code, method, path, roles, title, response, body=None, rules='', conflicts=(), created=False, multipart=False, binary=False, queries=(), read_only=False):
    if isinstance(roles, str): roles = [roles]
    params = []
    for name in re.findall(r'{(\w+)}', path):
        schema = ident('TRIP') if name == 'tripId' else ident('REQUEST') if name == 'requestId' else ident('INCIDENT') if name == 'incidentId' else key(name.upper() + '_001')
        params.append(dict(name=name, **{'in': 'path'}, required=True, schema=schema))
    for name, schema in queries: params.append(dict(name=name, **{'in': 'query'}, required=False, schema=schema))
    if method != 'get' and not read_only: params.append(dict(name='Idempotency-Key', **{'in': 'header'}, required=True,
        schema=st('5141a4d2-3221-4a68-9b0e-1bac88cc1f0a', pattern=r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')))
    status = '201' if created else '200'
    if binary:
        responses = {status: {'description': 'Bytes thật, kiểm quyền theo Trip/Incident/visibility.', 'content': {
            mime: {'schema': {'type': 'string', 'format': 'binary'}} for mime in ['application/pdf', 'image/jpeg', 'image/png']},
            'headers': {'Content-Disposition': {'schema': st('attachment; filename="evidence.pdf"')}, 'Cache-Control': {'schema': st('private, no-store')}}}}
    else:
        data = sample(response)
        if method != 'get' and not read_only and isinstance(data, dict) and 'binding' in data: data['binding']['incidentVersion'] = 11
        responses = {status: {'description': 'Mẫu mục tiêu sau lưu thành công, chưa xác nhận API đã triển khai.', 'content': {'application/json': {
            'schema': obj({'success': {'type': 'boolean', 'const': True}, 'message': st('OK'), 'data': response}),
            'example': {'success': True, 'message': 'OK', 'data': data}}}}}
    codes = {'400': ['VALIDATION_ERROR'], '401': ['UNAUTHENTICATED'], '403': ['FORBIDDEN'], '404': ['NOT_FOUND'],
             '409': list(dict.fromkeys(COMMON + list(conflicts))), '429': ['RATE_LIMITED'], '500': ['INTERNAL_ERROR'], '501': ['FEATURE_NOT_SUPPORTED']}
    if multipart: codes.update({'413': ['FILE_TOO_LARGE'], '415': ['UNSUPPORTED_MEDIA_TYPE']})
    for error_status, names in codes.items():
        responses[error_status] = {'description': 'Không commit một phần nghiệp vụ.', 'content': {'application/json': {'schema': ref('Error'),
            'examples': {name: {'value': {'success': False, 'message': 'Không thể thực hiện: ' + name, 'errorCode': name,
                'data': None, 'blockers': [{'code': name, 'field': 'incident', 'message': 'Tải lại và xử lý điều kiện liên quan'}]}} for name in names}}}}
    operation = {'operationId': code, 'summary': title, 'description': rules, 'tags': [roles[0]], 'x-roles': roles,
                 'x-implementation-status': 'DESIGNED_NOT_IMPLEMENTED', 'x-read-only': method == 'get' or read_only,
                 'parameters': params, 'responses': responses}
    if body: operation['requestBody'] = {'required': True, 'content': {'multipart/form-data' if multipart else 'application/json': {
        'schema': body, **({} if multipart else {'example': sample(body)})}}}
    OPS.append((code, method, path, operation))

base = '/incidents/{incidentId}'
c = '/coordinator/incidents/{incidentId}'
m = '/manager/incidents/{incidentId}'
u = '/customer/requests/{requestId}/incidents/{incidentId}'
op('F5-J01', 'get', '/master/flow5-capabilities', STAFF + [U], 'Capability xử lý sự cố', ref('Capabilities'), rules='Flags thật do server; chưa persistence/integration không báo đã hỗ trợ. Không lộ cấu hình nội bộ.')
op('F5-J02', 'get', '/incidents', STAFF, 'Danh sách sự cố theo quyền', arr(ref('IncidentSummary')),
   rules='Manager scope quản lý, Coordinator/Specialist chuyến được giao, Driver assignment liên quan. data array, lọc tại server trước trả.', queries=[('status', en('REPORTED', 'IN_PROGRESS', 'RESOLVED')), ('tripId', ident('TRIP'))])
op('F5-J03', 'post', '/incidents', STAFF, 'Báo sự cố và ghi nhận chăm sóc ban đầu', ref('Mutation'), ref('ReportInput'),
   rules='Trip thật đã kích hoạt/được giao, chặng/ngựa/mốc trong Trip. REPORTED và safety blocker tối thiểu do server đặt ngay, không đợi Coordinator tiếp nhận. Cho báo thiếu ảnh/incident file khi khẩn; file có thể upload theo Trip trước rồi liên kết. Không nhận severity/actor/tripStatus từ client.', conflicts=['TRIP_NOT_ACTIVE', 'SCOPE_MISMATCH'], created=True)
op('F5-J04', 'get', base, STAFF, 'Chi tiết sự cố, nhiệm vụ và hành động', ref('IncidentDetail'), rules='Cùng aggregate dùng chung, actions theo actor; không copy một sự cố cho từng role.')
op('F5-J05', 'get', '/trips/{tripId}/incidents', STAFF, 'Sự cố trong chi tiết chuyến', arr(ref('IncidentSummary')), rules='Cùng nguồn J02/J04; không lẫn complaint Flow 6.')
op('F5-J06', 'post', c + '/accept', C, 'Coordinator tiếp nhận sự cố', ref('Mutation'), ref('Command'), rules='REPORTED → IN_PROGRESS; ghi đầu mối và kế hoạch xử lý ban đầu. Không xóa blocker hoặc hoàn thành Trip.')
op('F5-J07', 'put', c + '/impact-assessment', C, 'Xác định chính xác phần bị ảnh hưởng', ref('Mutation'), ref('AssessmentInput'),
   rules='Mỗi area xuất hiện đúng một lần, đủ 8 mục; UNASSESSED vẫn chặn phần liên quan. NOT_AFFECTED có lý do, không thay xác nhận bác sĩ/Specialist. Thay assessment tăng dependency revision, vô hiệu phần kết quả bị ảnh hưởng.', conflicts=['IMPACT_ASSESSMENT_INCOMPLETE', 'SPECIALIST_REVIEW_REQUIRED'])
op('F5-J08', 'post', base + '/updates', STAFF, 'Ghi hiện trường, tiến độ hoặc chăm sóc khẩn', ref('Update'), ref('UpdateInput'),
   rules='Nhân sự đúng nhiệm vụ/chuyến, append-only. EMERGENCY_CARE không chờ duyệt plan/cost; không tự xác nhận FIT hoặc gỡ safety gate. Nội dung nội bộ, khách chỉ nhận thông tin đã chia sẻ qua Manager.', created=True)
op('F5-J09', 'get', base + '/updates', STAFF, 'Đọc diễn biến sự cố', arr(ref('Update')), rules='Giữ thứ tự recordedAt/ID, không sửa đè bản gốc.')
op('F5-J10', 'post', c + '/tasks', C, 'Giao công việc khắc phục song song', ref('Task'), ref('TaskInput'),
   rules='Assignee từ nhân sự hợp lệ được giao Trip hoặc task xử lý được ủy quyền có thời hạn. Vai trò phù hợp area; task sức khỏe cần bác sĩ, hồ sơ/bảo hiểm cần Specialist. Không giao công việc cho ID ngoài scope.', conflicts=['INVALID_ASSIGNEE'], created=True)
op('F5-J11', 'get', base + '/tasks', STAFF, 'Danh sách công việc và người phụ trách', arr(ref('Task')), rules='Chỉ task trong scope; người được giao task không mặc nhiên có quyền vận chuyển hoặc hoàn tất milestone.')
op('F5-J12', 'post', base + '/tasks/{taskId}/progress', [D, C, T], 'Người được giao cập nhật kết quả công việc', ref('Mutation'), ref('TaskProgress'),
   rules='Chỉ assignee cập nhật, DONE cần kết quả/bằng chứng theo checklist. DONE không thay clearance/vet approval/resource confirmation. Nhận nhiệm vụ khắc phục không tự đổi tổ xe.', conflicts=['NOT_TASK_ASSIGNEE', 'EVIDENCE_REQUIRED'])
op('F5-J13', 'get', c + '/recovery-context', [C, M, T], 'Context phương án khôi phục và dependency', ref('IncidentDetail'), rules='Snapshot approved plan/execution/assignment, assessment và kết quả còn hợp lệ; không bắt làm lại mọi hồ sơ.')
op('F5-J14', 'put', c + '/recovery-draft', C, 'Lưu nháp phương án khôi phục', ref('Recovery'), ref('RecoveryInput'),
   rules='Chỉ DRAFT/RETURNED, baseline phải hiện hành. Draft không giữ nguồn lực, không thay approved plan/ETA/booking. Không đổi địa chỉ giao; customerAdditionalChargeVnd luôn 0.', conflicts=['BASELINE_CHANGED', 'RECOVERY_LOCKED'])
op('F5-J15', 'post', c + '/recovery/validate', C, 'Kiểm tra phương án không ghi trạng thái', ref('Readiness'), ref('PlanCommand'),
   rules='Read-only, không giữ xe/người, không gửi duyệt. Recheck dependency ngoài hệ thống/capability; không giả success khi provider chưa hỗ trợ.', read_only=True)
op('F5-J16', 'post', c + '/recovery/submit', C, 'Gửi phương án và giữ nguồn lực nguyên tử', ref('Recovery'), ref('PlanCommand'),
   rules='Server tính requiresManager: thay approved resources/route/schedule/flight, chi phí nội bộ hoặc thỏa thuận khách đều cần Manager. Chỉ chăm sóc trong approved plan, không tác động thì tự APPROVED với approvedBy=null và history SYSTEM. Giữ nguồn lực thay thế đủ bộ, không nhả nguồn cũ trước thực hiện.', conflicts=['RESOURCE_CONFLICT', 'INVALID_CREW', 'BASELINE_CHANGED', 'COMPLIANCE_PRECHECK_REQUIRED'])
op('F5-J17', 'post', m + '/recovery/decision', M, 'Manager duyệt hoặc trả phương án', ref('Recovery'), ref('RecoveryDecision'),
   rules='Chỉ PENDING_APPROVAL, đúng version/budget/scope; APPROVE chưa áp dụng thực tế hoặc resume. RETURN giải phóng hold draft, giữ nguồn cũ; lưu lý do. Chi phí sự cố không thu thêm Customer.', conflicts=['RECOVERY_NOT_PENDING', 'RESOURCE_CONFLICT', 'BASELINE_CHANGED'])
op('F5-J18', 'post', c + '/recovery/revisions', C, 'Mở bản sửa phương án, giữ lịch sử approved', ref('Recovery'), ref('Command'),
   rules='Giữ approved cũ, tạo DRAFT version mới; không overwrite booking/cost/consent đã duyệt. Submission pending phải được rút qua endpoint withdraw; recheck phần dependency thay đổi.', conflicts=['RECOVERY_PENDING'], created=True)
op('F5-J19', 'get', base + '/history', STAFF, 'Lịch sử quyết định, phiên bản và áp dụng', arr(ref('History')), rules='Append-only trước/sau, actor/time/reason; systemActor=true khi tự xử lý, không giả Manager.')
op('F5-J20', 'get', c + '/resource-options', C, 'Tìm xe và nhân sự thay thế phù hợp', arr(ref('ResourceOption')),
   rules='Đọc từ nguồn Flow 3: sức chứa, quốc gia, đường xe tải/access, qualification, thời gian còn lại. AIR không dùng lại người/xe giữa hai ROAD. Danh sách không phải hold.', queries=[('leg', leg)])
op('F5-J21', 'post', '/specialist/incidents/{incidentId}/compliance-reviews', T, 'Xác nhận hồ sơ hoặc bảo hiểm bị ảnh hưởng', ref('ComplianceReview'), ref('ComplianceInput'),
   rules='Specialist được giao; gắn recoveryVersion và dependency document/insurance hiện hành. Không tự đòi gia hạn mọi giấy: giả định Flow3 giấy còn hiệu lực suốt chuyến, chỉ kiểm applicability khi thay điều kiện. SATISFIED cần nguồn/bằng chứng thật; NOT_AFFECTED có lý do.', conflicts=['RECOVERY_CHANGED', 'COMPLIANCE_EVIDENCE_REQUIRED'], created=True)
op('F5-J22', 'post', '/driver/incidents/{incidentId}/vet-assessments', D, 'Bác sĩ xác nhận sức khỏe và khả năng tiếp tục', ref('VetAssessment'), ref('VetInput'),
   rules='DRIVER_ESCORT với crewDuty VETERINARIAN và qualification hợp lệ; một nguồn kết luận với Flow4 J25, lưu một record và liên kết incident/health. FIT không tự resume; NOT_FIT/NEEDS_REVIEW giữ block. Không cho Driver thường tự chẩn đoán.', conflicts=['VETERINARIAN_REQUIRED', 'HORSE_OUT_OF_SCOPE'], created=True)
op('F5-J23', 'post', c + '/external-actions', C, 'Ghi xác nhận đối tác, booking và nguồn lực thật', ref('ExternalAction'), ref('ExternalActionInput'),
   rules='PARTNER_CONTACT chỉ tiến độ. OLD_BOOKING_CANCELLED cần đối tác xác nhận; NEW_BOOKING_CONFIRMED chỉ sau Manager approved và compliance precheck khả thi, xử lý booking cũ khi bị ảnh hưởng. RESOURCE_CONFIRMED phải đúng bộ đã duyệt. Không gọi hãng hoặc chuyển tiền; reference unique theo đối tác/loại, file thật.', conflicts=['RECOVERY_NOT_APPROVED', 'OLD_BOOKING_ACTIVE', 'BOOKING_REFERENCE_DUPLICATE', 'RESOURCE_CONFLICT', 'COMPLIANCE_PRECHECK_REQUIRED'], created=True)
op('F5-J24', 'post', c + '/recovery/apply', C, 'Áp dụng phương án khôi phục đã đủ bằng chứng', ref('Mutation'), ref('ContinuationInput'),
   rules='Đúng recovery approved + readiness hiện hành. Transaction cập nhật phần tương lai của approved plan/execution, chuyển resource assignments, giữ mốc đã hoàn tất và giá/địa chỉ giao. Không complete mốc, không tự resume. Hủy/cancel booking bên ngoài chỉ là evidence, không rollback cuộc gọi hãng bằng SQL.', conflicts=['RECOVERY_NOT_APPROVED', 'READINESS_CHANGED', 'RESOURCE_CONFIRMATION_REQUIRED', 'COMPLIANCE_REVIEW_REQUIRED', 'CUSTOMER_AGREEMENT_REQUIRED', 'OLD_BOOKING_ACTIVE'])
op('F5-J25', 'get', base + '/continuation-readiness', STAFF, 'Kiểm tra điều kiện tiếp tục và điều kiện đóng', ref('Readiness'),
   rules='Server tính riêng canApplyRecovery/canContinue/canResolve từ dependency hiện hành; nhiều incident cùng chặn một phần thì không tự mở sau một incident. Không dùng 0/0 là đạt.')
op('F5-J26', 'post', c + '/continue', C, 'Cho phép tiếp tục đúng phần đủ điều kiện', ref('Mutation'), ref('ContinuationInput'),
   rules='Recheck readiness, affected scope, phê duyệt, bằng chứng, health/compliance/booking/assignment và incident khác trong transaction. Chỉ gỡ block của incident này ở scope đã đủ; không DEPARTED/complete milestone, Driver vẫn ghi Flow4. Trip giữ trạng thái gốc.', conflicts=['READINESS_CHANGED', 'OTHER_INCIDENT_BLOCKING', 'VET_CLEARANCE_REQUIRED', 'COMPLIANCE_REVIEW_REQUIRED', 'RECOVERY_NOT_APPLIED'])
op('F5-J27', 'post', c + '/resolve', C, 'Coordinator ghi kết quả và đóng sự cố', ref('Mutation'), ref('Command'),
   rules='IN_PROGRESS → RESOLVED chỉ khi không còn blocker/work/financial handoff bắt buộc của incident; tiếp tục đã xác nhận nếu đang vận chuyển. Nhánh kết thúc sớm chỉ TERMINATION_REFERRED sau hồ sơ được hệ thống tất toán tiếp nhận và trách nhiệm chăm sóc được xác nhận. Không tự hoàn tất Trip/Request, không tự hoàn tiền.', conflicts=['UNRESOLVED_TASKS', 'INCIDENT_STILL_BLOCKING', 'SETTLEMENT_HANDOFF_REQUIRED'])
op('F5-J28', 'post', c + '/reopen', C, 'Mở lại sự cố có vấn đề chưa xử lý', ref('Mutation'), ref('Command'),
   rules='RESOLVED → IN_PROGRESS, giữ kết quả cũ, recheck và đặt lại blocker liên quan; không mở lại Request/Trip đã đóng/bàn giao. Khi sau bàn giao dùng Flow6 và liên kết lịch sử.', conflicts=['AFTERCARE_REQUIRED'])
op('F5-J29', 'get', '/customer/requests/{requestId}/incidents', U, 'Khách xem sự cố và ảnh hưởng được thông báo', arr(ref('PublicIncident')),
   rules='Chỉ Request của JWT, thông tin đã chia sẻ, không cost nội bộ hoặc ghi chú nghiệp vụ; complaint Flow6 riêng.')
op('F5-J30', 'get', u, U, 'Khách đọc chi tiết sự cố được chia sẻ', ref('PublicContext'),
   rules='Projection riêng gồm communication/ETA/ảnh hưởng đến ngựa và thông tin xử lý công bố; không trả toàn IncidentDetail rồi ẩn trên UI.')
op('F5-J31', 'post', m + '/communications', M, 'Manager thông báo hoặc đề nghị thống nhất với khách', ref('Communication'), ref('CommunicationInput'),
   rules='Manager đầu mối thay lịch/thỏa thuận. NOTICE không phải đồng ý. AGREEMENT_REQUEST gắn recoveryVersion và nội dung bất biến; có thay đổi phải tạo đề nghị mới, không đổi địa chỉ giao.', created=True)
op('F5-J32', 'post', u + '/communications/{messageId}/reply', U, 'Khách đồng ý hoặc từ chối nội dung cụ thể', ref('Mutation'), ref('CustomerReply'),
   rules='Chỉ AGREEMENT_REQUEST hiện hành và messageVersion đúng; actor chính Customer. ACCEPT không nghiệm thu, không đổi ETA/plan hay tạo tiền đã nhận; từ chối giữ blocker yêu cầu thỏa thuận.', conflicts=['MESSAGE_NOT_ACTIONABLE', 'AGREEMENT_SUPERSEDED'])
op('F5-J33', 'post', m + '/customer-agreements/external', M, 'Ghi thỏa thuận ngoài hệ thống có bằng chứng', ref('Mutation'), ref('ExternalAgreementInput'),
   rules='Đúng message/version hiện hành, reference và tài liệu xác minh theo quy trình; không checkbox giả Customer hay giả user đã bấm. Lưu actor Manager, source EXTERNAL_DOCUMENT. Nếu chưa có quy trình kiểm chứng thì 501.', conflicts=['AGREEMENT_SUPERSEDED', 'EVIDENCE_REQUIRED'])
op('F5-J34', 'post', '/trips/{tripId}/incident-files', STAFF, 'Upload bằng chứng trước hoặc sau báo sự cố', ref('File'), ref('Upload'),
   rules='Trip/assignment có thật, file PDF/JPEG/PNG <=10 MiB; HEALTH chỉ JPEG/PNG. Metadata/file không tăng incidentVersion, mặc định INTERNAL. Có thể upload trước J03 và gắn sau kiểm scope.', created=True, multipart=True)
op('F5-J35', 'get', base + '/files/{fileId}', STAFF, 'Tải bằng chứng sự cố có kiểm quyền', None, rules='Trip/Incident đúng scope và file thật đã gắn; binary thật, không URL tùy ý.', binary=True)
op('F5-J36', 'get', u + '/files/{fileId}', U, 'Khách tải bằng chứng được chia sẻ', None, rules='Request của khách và file CUSTOMER được gắn đúng incident; internal luôn 404.', binary=True)
op('F5-J37', 'post', m + '/termination-proposals', M, 'Đề xuất hướng kết thúc khi không thể tiếp tục', ref('TerminationProposal'), ref('TerminationInput'),
   rules='Không tự hủy/hoàn tất, không đưa ngựa quay về hoặc đổi nơi giao. Manager thương lượng hướng xử lý/custody và khoản hoàn; không tự đặt công thức. Một đề xuất mở; có thay đổi phải version mới. proposedRefund không vượt khoản có thể hoàn từ ledger thật.', conflicts=['TERMINATION_PROPOSAL_OPEN', 'INVALID_REFUND_AMOUNT'], created=True)
op('F5-J38', 'post', u + '/termination-proposals/{proposalId}/reply', U, 'Khách phản hồi hướng kết thúc được đề xuất', ref('Mutation'), ref('TerminationReply'),
   rules='Chính Customer, đúng proposal/version và nội dung; ACCEPT chỉ ghi thỏa thuận, không nghiệm thu/nhận ngựa/hoàn tiền. Không phản hồi hoặc REJECT không coi đồng ý.', conflicts=['PROPOSAL_DECIDED', 'TERMINATION_SUPERSEDED'])
op('F5-J39', 'post', m + '/termination-proposals/{proposalId}/refer', M, 'Chuyển hồ sơ kết thúc sớm sang xử lý nghĩa vụ', ref('TerminationProposal'), ref('TerminationReferInput'),
   rules='Chỉ ACCEPTED, custody có bằng chứng và readiness hiện hành; tích hợp settlement phải tiếp nhận hồ sơ duy nhất và server trả settlementCaseId. Không coi REFERRED là đã hoàn tiền/đóng Trip. Nếu chưa có pre-handover settlement extension thì 501, giữ chặn; không ép Flow6 normal handover giả.', conflicts=['CUSTOMER_AGREEMENT_REQUIRED', 'CUSTODY_UNCONFIRMED', 'READINESS_CHANGED'])
op('F5-J40', 'get', base + '/termination-proposals', STAFF, 'Đọc lịch sử đề xuất kết thúc và handoff', arr(ref('TerminationProposal')), rules='Nội bộ, các khoản hoàn đề xuất và trạng thái chuyển hồ sơ; không tự tính đã trả tiền.')
op('F5-J41', 'get', u + '/termination-proposals', U, 'Khách đọc nội dung kết thúc cần phản hồi', arr(ref('TerminationProposal')), rules='Chỉ proposal đã gửi khách, không có chi phí nội bộ; không lộ ghi chú riêng trong reason/basis/custody text.')
op('F5-J42', 'post', m + '/files/{fileId}/share', M, 'Cho phép chia sẻ bằng chứng với khách', ref('Mutation'), ref('ShareFileInput'),
   rules='Manager kiểm nội dung được công bố, file đúng incident/Request. Không sửa file bytes; ghi visibility/history. File nhạy cảm cần bản đã loại nội dung riêng, upload mới thay vì đánh dấu tất cả công khai.')
op('F5-J43', 'post', c + '/recovery/withdraw', C, 'Rút phương án đang chờ duyệt', ref('Recovery'), ref('PlanCommand'),
   rules='PENDING_APPROVAL → DRAFT, nhả hold draft, giữ nguồn lực/booking approved cũ, không tự hủy booking ngoài hệ thống.', conflicts=['RECOVERY_NOT_PENDING'])

def response_data(code):
    operation = next(o for c,_,_,o in OPS if c == code)
    response = next(r for s,r in operation['responses'].items() if s.startswith('2'))
    return response['content']['application/json']['example']['data']

# Per-operation examples are independent review fixtures, not a replayable workflow.
impact_example = []
for name in S['Impact']['properties']['area']['enum']:
    item = sample(ref('Impact')); item.update(area=name, status='AFFECTED' if name == 'RESOURCES' else 'NOT_AFFECTED')
    if name == 'RESOURCES': item['blockedMilestoneIds'] = ['MILESTONE_002']
    impact_example.append(item)
for code,method,path,operation in OPS:
    body = operation.get('requestBody', {}).get('content', {}).get('application/json')
    if code == 'F5-J07': body['example']['impacts'] = copy.deepcopy(impact_example)
    if code in ('F5-J04','F5-J13'):
        data = response_data(code); data['impacts'] = copy.deepcopy(impact_example)
        data['incident'].update(status='IN_PROGRESS', hasBlockingScope=True)
        data['readiness']['blockedScopes'] = [sample(ref('Scope'))]
    if code == 'F5-J03': response_data(code)['incident']['hasBlockingScope'] = True
    if code in ('F5-J06','F5-J07','F5-J12','F5-J24','F5-J26','F5-J28'): response_data(code)['incident']['status'] = 'IN_PROGRESS'
    if code == 'F5-J27': response_data(code)['incident'].update(status='RESOLVED', resolutionOutcome='RECOVERED', resolvedAt='2026-11-10 10:00')
    if code == 'F5-J16': response_data(code).update(status='PENDING_APPROVAL', requiresManager=True, approvalReasons=['Thay nguồn lực đã duyệt'])
    if code == 'F5-J17': response_data(code).update(status='APPROVED', requiresManager=True, approvedBy=sample(ref('Actor')), approvedAt='2026-11-10 09:00')
    if code in ('F5-J16', 'F5-J17'):
        resource = sample(ref('ResourceChange'))
        resource.update(oldVehicleId='VEHICLE_001', availableFrom='2026-11-10 09:00', availableUntil='2026-11-10 20:00')
        response_data(code)['content']['resources'] = [resource]
        response_data(code)['version'] = 2 if code == 'F5-J16' else 3
    if code == 'F5-J17': response_data(code)['approvedBy']['role'] = M
    if code == 'F5-J21': response_data(code)['actor']['role'] = T
    if code == 'F5-J22': response_data(code)['actor'].update(role=D, crewDuty='VETERINARIAN')
    if code == 'F5-J39': response_data(code).update(status='REFERRED', settlementCaseId='SETTLEMENT_001')
    if code in ('F5-J37', 'F5-J39'): response_data(code)['proposedBy']['role'] = M
    if code == 'F5-J10': response_data(code)['assignee']['userId'] = 'USER_008'

def dump(value): return json.dumps(value, ensure_ascii=False, indent=2) + '\n'
paths = {}
for _, method, path, operation in OPS: paths.setdefault(path, {})[method] = operation
spec = {'openapi': '3.1.0', 'info': {'title': 'Racehorse Transport — Flow 5: xử lý sự cố', 'version': '1.0.0',
        'description': 'Contract đích 29/10/2026; chưa triển khai backend/DB. Coordinator đóng sự cố, Manager duyệt thay đổi cần thiết. Không thu thêm phí sự cố từ khách.'},
        'servers': [{'url': '/api'}], 'security': [{'bearerAuth': []}], 'paths': paths,
        'components': {'securitySchemes': {'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}}, 'schemas': S},
        'x-retired-operations': [{'method': 'PUT', 'path': '/manager/incidents/{incidentId}/status', 'errorCode': 'CONTRACT_SUPERSEDED', 'replacement': 'F5-J06/J27/J28; no arbitrary status update'}]}
(ROOT / 'flow5.openapi.json').write_text(dump(spec), encoding='utf-8')
index = ['| Mã | Method | Endpoint | Chức năng |', '|---|---|---|---|'] + [f'| {c} | {m.upper()} | `{p}` | {o["summary"]} |' for c,m,p,o in OPS]
md = ['# Flow 5 — JSON từng API', '', '**1.0.0 — 29/10/2026. Contract đích; chưa triển khai backend/database hoặc nối frontend.**', '',
      '[Nghiệp vụ](FLOW5.md) · [OpenAPI](flow5.openapi.json) · [Kịch bản](flow5.examples.json).', '',
      'Base `/api`; Bearer JWT, Accept application/json. JSON có Content-Type application/json; GET không body. Mutation có Idempotency-Key UUID, riêng J15 validate read-only không cần. List data array. Timestamp địa phương Asia/Ho_Chi_Minh, tiền nguyên VND. Mẫu độc lập, không chạy nối tiếp với cùng version; lấy ID/version từ server thật.', '', *index, '']
for code,method,path,operation in OPS:
    md += [f'## {code} — {method.upper()} {path}', '', operation['summary'], '', '**Role:** ' + ', '.join(operation['x-roles']), '',
           '**Điều kiện và ảnh hưởng:** ' + operation['description'], '', '| Vị trí | Tên | Bắt buộc | Schema |', '|---|---|---|---|']
    md += [f'| {p["in"]} | `{p["name"]}` | {p["required"]} | `{json.dumps(p["schema"], ensure_ascii=False)}` |' for p in operation['parameters']]
    body = operation.get('requestBody', {}).get('content', {})
    if 'application/json' in body: md += ['', '**Request JSON**', '', '```json', dump(body['application/json']['example']).rstrip(), '```']
    elif body: md += ['', '**Multipart:** file bytes thật và purpose, PDF/JPEG/PNG <=10 MiB; HEALTH chỉ JPEG/PNG. Không gửi JSON/base64/object URL. Trình duyệt sinh Content-Type boundary.']
    else: md += ['', '**Request body:** Không gửi.']
    for status,response in operation['responses'].items():
        content = response['content'].get('application/json')
        if not content: md += ['', f'**Response {status}:** binary đúng MIME đã lưu, Content-Disposition an toàn, Cache-Control private, no-store; lỗi vẫn JSON.']
        elif status.startswith('2'): md += ['', f'**Response {status} — mẫu mục tiêu**', '', '```json', dump(content['example']).rstrip(), '```']
        else: md += ['', f'**Response {status}:** ' + ', '.join(content['examples']) + '; schema Error và mẫu đầy đủ trong OpenAPI.']
    errors = list(operation['responses']['409']['content']['application/json']['examples'].values())
    md += ['', '**Mẫu lỗi nghiệp vụ**', '', '```json', dump(errors[min(3,len(errors)-1)]['value']).rstrip(), '```', '']
(ROOT / 'FLOW5-API-JSON.md').write_text('\n'.join(md), encoding='utf-8')

scenarios = [
 ('report-immediate-block', 'Xe hỏng, Trip IN_TRANSIT', 'J03 chưa có ảnh', 'REPORTED được lưu, block liên quan ngay; chăm sóc tiếp tục'),
 ('idempotent-report', 'J03 commit', 'Retry cùng key/body', 'Một incident/history/outbox, response gốc'),
 ('different-body', 'Đã dùng key', 'Retry khác body/path', '409 IDEMPOTENCY_CONFLICT'),
 ('foreign-scope', 'Driver chỉ outbound Trip A', 'Báo Trip B/ngựa lạ', '404 hoặc 409 SCOPE_MISMATCH trong Trip có quyền xem'),
 ('accept-no-resume', 'Sự cố mới báo', 'J06', 'IN_PROGRESS, không gỡ block'),
 ('impact-subset', 'Xe hỏng, không ảnh hưởng bay/hồ sơ', 'J07 đủ 8 area có lý do', 'Chỉ nguồn lực bị đánh giá lại, giữ kết quả còn đúng'),
 ('impact-duplicate', 'Có 8 entry nhưng trùng area', 'J07', '400 hoặc 409 IMPACT_ASSESSMENT_INCOMPLETE'),
 ('parallel-work', 'Resources và insurance affected', 'J10 giao hai nhiệm vụ', 'Có thể xử lý song song, DONE không thay clearance'),
 ('task-scope', 'Assignee không thuộc phạm vi', 'J10/J12', '409 INVALID_ASSIGNEE/NOT_TASK_ASSIGNEE'),
 ('emergency-care', 'Chưa duyệt chi phí', 'J08 EMERGENCY_CARE', 'Lưu ngay; không phải FIT/approval'),
 ('vet-required', 'Driver không là bác sĩ', 'J22 FIT', '409 VETERINARIAN_REQUIRED; không ghi kết luận'),
 ('vet-block', 'Bác sĩ NOT_FIT', 'J26', '409 VET_CLEARANCE_REQUIRED; vẫn ghi chăm sóc'),
 ('replace-vehicle', 'Xe hỏng nhưng lịch giữ nguyên', 'Draft thay xe, J16', 'Cần Manager do thay approved resources, không bắt đổi flight'),
 ('resource-race', 'Hai recovery chọn cùng xe/người', 'Concurrent J16', 'Chỉ một hold thành công, bên kia RESOURCE_CONFLICT'),
 ('air-separation', 'AIR hai ROAD', 'Chọn lại xe/người outbound cho inbound', '409 INVALID_CREW/RESOURCE_CONFLICT'),
 ('approval-not-apply', 'Manager APPROVE', 'Đọc Flow4', 'Chưa đổi plan/execution/booking hoặc mở mốc'),
 ('changed-baseline', 'Approved plan/dependency thay sau draft', 'J16/J17/J24', '409 BASELINE_CHANGED/READINESS_CHANGED, không overwrite'),
 ('flight-delayed', 'Đối tác hoãn bay', 'Recovery schedule+booking+inbound', 'Specialist kiểm applicability liên quan; Manager duyệt lịch/cost, khách nhận thông tin'),
 ('no-recheck-every-document', 'Giấy tờ giả định valid suốt chuyến', 'Chỉ đổi xe không đổi điều kiện hồ sơ', 'Không tự yêu cầu làm lại/gia hạn mọi giấy'),
 ('booking-old-active', 'Đổi flight còn booking cũ', 'J23 confirm new/J24', '409 OLD_BOOKING_ACTIVE khi ảnh hưởng, giữ evidence cũ'),
 ('booking-confirmation', 'Draft chưa duyệt hoặc compliance chưa khả thi', 'J23 NEW_BOOKING_CONFIRMED', '409 RECOVERY_NOT_APPROVED/COMPLIANCE_PRECHECK_REQUIRED'),
 ('partner-reference', 'PARTNER_CONTACT đã ghi', 'J25', 'Liên hệ không phải booking confirmed'),
 ('customer-charge', 'Chi phí sự cố nội bộ 1 triệu', 'Gửi customerAdditionalChargeVnd >0', '400; giữ giá/contract/ledger khách'),
 ('customer-agreement', 'Đổi cam kết lịch giao', 'Manager NOTICE, khách im lặng', 'Chưa có consent; J24 chặn CUSTOMER_AGREEMENT_REQUIRED'),
 ('customer-refusal', 'Khách REJECT đề nghị lịch', 'J32', 'Giữ blocker, Manager thương lượng, không sửa địa chỉ giao'),
 ('external-consent', 'Khách đồng ý ngoài app', 'J33 không bằng chứng hoặc sai version', '400/409; không giả actor Customer'),
 ('apply-future-only', 'Một số mốc đã COMPLETED', 'J24', 'Chỉ thay phần tương lai, mapping lịch sử, giá/địa chỉ giao giữ nguyên'),
 ('continue-race', 'J25 xanh rồi qualification/insurance đổi', 'J26 token cũ', '409 READINESS_CHANGED; không mở gate'),
 ('multiple-incidents', 'Hai incident cùng block chặng', 'J26 một incident', 'Không mở chặng còn blocker từ incident khác'),
 ('resolve-not-trip-complete', 'Khôi phục hợp lệ, không pending work', 'J27', 'Incident RESOLVED; Trip vẫn IN_TRANSIT, Driver ghi mốc Flow4'),
 ('manager-status-retired', 'Manager gọi PUT status cũ', 'status=RESOLVED', '409 CONTRACT_SUPERSEDED; dùng Coordinator J27 có guard'),
 ('termination-negotiate', 'Không thể tiếp tục', 'J37 và J38 ACCEPT', 'Lưu thỏa thuận/custody/refund đề xuất, không Trip COMPLETED hoặc tiền đã hoàn'),
 ('termination-extension-off', 'Chưa pre-handover settlement extension', 'J39', '501, không settlementCaseId giả; chưa được resolve bằng handoff giả'),
 ('termination-handoff', 'Extension thật tiếp nhận, custody đủ', 'J39', 'REFERRED + caseId thật; Flow5 không trả financiallySettled=true chỉ từ refer'),
 ('privacy', 'Khách A', 'Đọc incident/file của B hoặc internal file', '404, không lộ dữ liệu hoặc chi phí nội bộ'),
 ('malformed-file', 'File giả PDF hoặc quá 10MiB', 'J34', '400/415/413; không gắn vào incident'),
 ('reopen-after-handover', 'Trip COMPLETED theo Flow6', 'J28', '409 AFTERCARE_REQUIRED, không mở lại Trip'),
 ('rollback', 'Lỗi history/outbox hoặc swap assignments', 'J24/J26 commit', 'Rollback DB state, retry không duplicate; không giả rollback sự kiện đối tác ngoài hệ thống'),
 ('post-handover-complaint', 'Khách phản ánh sau bàn giao', 'Vào khiếu nại', 'Flow6 complaint/dispute, liên kết incident để tra cứu, không hai workflow bồi thường'),
 ('capability-off', 'persistenceAvailable=false', 'Mutation', '501 FEATURE_NOT_SUPPORTED; không mock success'),
]
road = sample(ref('IncidentDetail'))
road['incident'].update(status='IN_PROGRESS', hasBlockingScope=True)
road['impacts'] = copy.deepcopy(impact_example)
road['recovery'] = sample(ref('Recovery'))
road['recovery']['content']['resources'] = [sample(ref('ResourceChange'))]
road['recovery']['content']['resources'][0].update(availableFrom='2026-11-10 09:00', availableUntil='2026-11-10 20:00')
road['recovery']['requiresManager'] = True
air = copy.deepcopy(road)
air['incident'].update(category='DELAY_AIR')
air['incident']['scope']['leg'] = 'air'
air['recovery']['content']['scope']['leg'] = 'air'
air['recovery']['content']['resources'][0].update(leg='inbound', oldVehicleId='VEHICLE_002', vehicleId='VEHICLE_003',
    crew={'mainDriverId': 'USER_021', 'coDriverId': 'USER_022', 'veterinarianId': 'USER_023'})
air['recovery']['content']['flight'] = sample(ref('FlightChange'))
air['recovery']['content']['flight'].update(plannedDepartureAt='2026-11-10 14:00', plannedArrivalAt='2026-11-10 18:00')
air['impacts'] = []
for name in S['Impact']['properties']['area']['enum']:
    item = sample(ref('Impact')); item.update(area=name, status='AFFECTED' if name in ('SCHEDULE','BOOKING','RESOURCES','DELIVERY_DEADLINE','INTERNAL_COST') else 'UNASSESSED')
    air['impacts'].append(item)
examples = {'contractVersion': '1.0.0', 'status': 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS',
            'roadResourceFailure': road, 'airDelay': air,
            'scenarios': [{'id': a, 'given': b, 'when': c, 'then': d} for a,b,c,d in scenarios]}
(ROOT / 'flow5.examples.json').write_text(dump(examples), encoding='utf-8')
print(f'Generated {len(OPS)} operations, {len(S)} schemas, {len(scenarios)} acceptance scenarios.')
