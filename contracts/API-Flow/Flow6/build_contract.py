"""Generate the reviewable Flow 6 contract, examples and typed frontend API.

No server, database or live payment operations are performed by this script.
"""
from pathlib import Path
import copy
import json
import re

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
FRONTEND = REPO / 'frontend/src'


def string(**kwargs):
    return {'type': 'string', **kwargs}


def enum(*values):
    return string(enum=list(values))


def integer(minimum=0, maximum=9007199254740991):
    return {'type': 'integer', 'minimum': minimum, 'maximum': maximum}


def obj(properties, optional=()):
    return {'type': 'object', 'properties': properties,
            'required': [k for k in properties if k not in optional], 'additionalProperties': False}


def array(items, minimum=0, maximum=100):
    return {'type': 'array', 'items': items, 'minItems': minimum, 'maxItems': maximum}


def ref(name):
    return {'$ref': '#/components/schemas/' + name}


def nullable(schema):
    return {'anyOf': [schema, {'type': 'null'}]}


def ident(prefix):
    return string(pattern='^' + prefix + r'_\d{3,}$', maxLength=50)


opaque = string(pattern=r'^[A-Za-z0-9_-]{1,80}$')
stamp = string(pattern=r'^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d$')
text = string(minLength=5, maxLength=4000, pattern=r'\S')
short = string(minLength=1, maxLength=255, pattern=r'\S')
boolean = {'type': 'boolean'}
yes = {'type': 'boolean', 'const': True}
money = integer()
version = integer(1)
uuid = string(pattern=r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')
file_ids = {**array(opaque, 0, 10), 'uniqueItems': True}
phase = enum('AWAITING_HANDOVER', 'AWAITING_ACCEPTANCE', 'COMPLAINT_OPEN',
             'DISPUTE_IN_PROGRESS', 'AWAITING_PAYMENT', 'READY_TO_CLOSE', 'CLOSED')
S = {}


def schema(name, properties, optional=()):
    S[name] = obj(properties, optional)
    return ref(name)


schema('Actor', {'userId': ident('USER'), 'name': short})
schema('Policy', {
    'version': version, 'defaultAcceptanceHours': enum('24', '48'),
    'allowedAcceptanceHours': {**array(enum('24', '48'), 1, 2), 'uniqueItems': True},
    'paymentHours': integer(1, 168), 'maxExtensionHours': integer(1, 720),
    'acceptanceStatementVersion': version, 'acceptanceStatement': text,
    'timezone': {'const': 'Asia/Ho_Chi_Minh', 'type': 'string'},
})
schema('Window', {
    'status': enum('NOT_STARTED', 'RUNNING', 'PAUSED', 'OVERDUE', 'COMPLETED'),
    'openedAt': nullable(stamp), 'dueAt': nullable(stamp), 'remainingSeconds': integer(),
    'overdueAt': nullable(stamp),
})
schema('DeadlineEvent', {
    'id': opaque, 'kind': enum('OPENED', 'PAUSED', 'RESUMED', 'EXTENDED', 'OVERDUE', 'COMPLETED'),
    'window': enum('ACCEPTANCE', 'PAYMENT'), 'previousDueAt': nullable(stamp),
    'newDueAt': nullable(stamp), 'reason': short, 'at': stamp, 'actor': nullable(ref('Actor')),
})
schema('Evidence', {
    'id': opaque, 'requestId': ident('REQUEST'), 'name': short,
    'mimeType': enum('application/pdf', 'image/jpeg', 'image/png'),
    'sizeBytes': integer(1, 10 * 1024 * 1024), 'uploadedAt': stamp, 'uploadedBy': ref('Actor'),
})
schema('HorseHandover', {
    'horseId': ident('HORSE'), 'microchipVerified': yes,
    'condition': enum('NORMAL', 'MONITOR', 'ABNORMAL'), 'note': string(maxLength=2000),
    'photoFileIds': {**array(opaque, 1, 10), 'uniqueItems': True},
})
schema('Receiver', {
    'name': short, 'phone': string(pattern=r'^\+?[0-9 ()-]{8,20}$'),
    'authorization': enum('REGISTERED', 'MANAGER_APPROVED'),
    'authorizationReference': nullable(opaque),
})
schema('HandoverInput', {
    'expectedVersion': version, 'receiverName': short, 'identityChecked': yes,
    'authorizationChecked': yes, 'horses': array(ref('HorseHandover'), 1, 100),
    'signatureFileId': opaque, 'note': string(maxLength=2000),
})
schema('Handover', {
    'id': opaque, 'tripId': ident('TRIP'), 'requestId': ident('REQUEST'),
    'completedAt': stamp, 'recordedBy': ref('Actor'), 'receiver': ref('Receiver'),
    'horses': array(ref('HorseHandover'), 1, 100), 'signatureFileId': opaque,
    'note': string(maxLength=2000),
})
schema('HandoverAttempt', {
    'id': opaque, 'at': stamp, 'actor': ref('Actor'),
    'reason': enum('RECEIVER_ABSENT', 'UNAUTHORIZED_RECEIVER', 'RECEIVER_REFUSED', 'OTHER'),
    'description': text, 'evidenceFileIds': file_ids,
})
schema('HandoverContext', {
    'requestId': ident('REQUEST'), 'tripId': ident('TRIP'), 'version': version,
    'arrivedAtDestination': boolean, 'receiver': ref('Receiver'),
    'horseIds': {**array(ident('HORSE'), 1, 100), 'uniqueItems': True},
    'handover': nullable(ref('Handover')), 'attempts': array(ref('HandoverAttempt')),
    'canComplete': boolean, 'blockers': array(short),
})
schema('Message', {
    'id': opaque, 'at': stamp, 'actor': ref('Actor'), 'text': text, 'evidenceFileIds': file_ids,
})
schema('Proposal', {
    'id': opaque, 'version': version, 'complaintId': opaque,
    'status': enum('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'),
    'description': text, 'reductionAmount': money, 'evidenceFileIds': file_ids,
    'createdAt': stamp, 'createdBy': ref('Actor'),
    'customerDecidedAt': nullable(stamp), 'customerDecisionNote': nullable(text),
})
schema('Complaint', {
    'id': opaque, 'requestId': ident('REQUEST'),
    'kind': enum('ISSUE', 'REFUSAL'),
    'category': enum('HORSE_CONDITION', 'DELIVERY', 'SERVICE', 'BILLING', 'OTHER'),
    'title': short, 'description': text, 'horseId': nullable(ident('HORSE')),
    'evidenceFileIds': file_ids, 'status': enum('OPEN', 'PROPOSED', 'AGREED', 'RESOLVED'),
    'createdAt': stamp, 'messages': array(ref('Message')), 'proposals': array(ref('Proposal')),
})
schema('Adjustment', {
    'id': opaque, 'sourceId': opaque, 'kind': enum('REDUCTION', 'WAIVER'),
    'amount': money, 'appliedAt': stamp, 'reason': text,
})
schema('Refund', {
    'id': opaque, 'amount': money, 'status': enum('PENDING', 'PROCESSING', 'VERIFIED', 'FAILED'),
    'verifiedAt': nullable(stamp), 'reference': nullable(short),
})
schema('Settlement', {
    'invoiceId': ident('INVOICE'), 'invoiceVersion': version, 'currency': {'type': 'string', 'const': 'VND'},
    'originalTotal': money, 'reductionTotal': money, 'waiverTotal': money, 'netPayable': money,
    'verifiedDeposit': money, 'verifiedBalance': money, 'outstanding': money,
    'refundDue': money, 'verifiedRefund': money, 'adjustments': array(ref('Adjustment')),
    'pendingAdjustmentIds': array(opaque), 'refunds': array(ref('Refund')),
    'pendingPaymentIds': array(ident('PAYMENT')), 'canPay': boolean, 'paymentBlockers': array(short),
})
schema('DisputeDecision', {
    'id': opaque, 'status': enum('RECORDED', 'APPLIED'),
    'outcome': enum('RESUME_ACCEPTANCE', 'CLOSE_AFTER_DISPUTE'),
    'basis': enum('CUSTOMER_AGREEMENT', 'EXTERNAL_DECISION', 'COMPANY_WAIVER'),
    'customerAgreementProposalIds': array(opaque), 'reference': short,
    'summary': text, 'evidenceFileIds': {**file_ids, 'minItems': 1},
    'reductionAmount': money, 'waiverAmount': money, 'recordedAt': stamp, 'recordedBy': ref('Actor'),
})
schema('Dispute', {
    'id': opaque, 'status': enum('OPEN', 'DECISION_RECORDED', 'RESOLVED'),
    'reason': enum('NO_RESPONSE', 'REFUSAL', 'UNRESOLVED_COMPLAINT', 'PAYMENT_DISAGREEMENT', 'OTHER'),
    'description': text, 'openedAt': stamp, 'evidenceFileIds': file_ids,
    'updates': array(ref('Message')), 'decision': nullable(ref('DisputeDecision')),
})
schema('Acceptance', {
    'status': enum('PENDING', 'ACCEPTED', 'NOT_REQUIRED_BY_DISPUTE'),
    'acceptedAt': nullable(stamp), 'acceptedBy': nullable(ref('Actor')),
    'statementVersion': nullable(version),
})
schema('ActionAvailability', {
    'action': enum('ACCEPT', 'REPORT_ISSUE', 'PAY', 'EXTEND_ACCEPTANCE', 'OPEN_DISPUTE',
                   'PROPOSE_RESOLUTION', 'APPLY_RESOLUTION', 'RECORD_DECISION', 'CLOSE'),
    'allowed': boolean, 'blockers': array(short),
})
schema('Closure', {
    'mode': enum('NORMAL', 'AFTER_DISPUTE'), 'closedAt': stamp, 'closedBy': ref('Actor'),
    'reason': text, 'decisionId': nullable(opaque),
})
schema('Aftercare', {
    'requestId': ident('REQUEST'), 'tripId': ident('TRIP'), 'version': version,
    'requestStatus': enum('DELIVERED', 'UNDER_RESOLUTION', 'CLOSED'),
    'tripStatus': {'type': 'string', 'const': 'COMPLETED'}, 'phase': phase,
    'serverTime': stamp, 'policy': ref('Policy'), 'handover': ref('Handover'),
    'acceptance': ref('Acceptance'), 'acceptanceWindow': ref('Window'), 'paymentWindow': ref('Window'),
    'deadlineHistory': array(ref('DeadlineEvent'), 0, 1000),
    'complaints': array(ref('Complaint')), 'dispute': nullable(ref('Dispute')),
    'settlement': ref('Settlement'), 'actions': array(ref('ActionAvailability')),
    'closure': nullable(ref('Closure')),
})
schema('CoordinatorSummary', {
    'requestId': ident('REQUEST'), 'tripId': ident('TRIP'), 'phase': phase,
    'handover': nullable(ref('Handover')), 'attempts': array(ref('HandoverAttempt')),
    'issueSummary': string(maxLength=2000),
})
schema('QueueItem', {
    'requestId': ident('REQUEST'), 'tripId': ident('TRIP'), 'customerName': short,
    'phase': phase, 'version': version, 'acceptanceDueAt': nullable(stamp),
    'paymentDueAt': nullable(stamp), 'overdue': boolean, 'openComplaints': integer(),
    'hasOpenDispute': boolean, 'outstanding': money, 'refundDue': money,
})
schema('PaymentSession', {
    'paymentId': ident('PAYMENT'), 'requestId': ident('REQUEST'), 'invoiceId': ident('INVOICE'),
    'invoiceVersion': version, 'amount': integer(1), 'currency': {'type': 'string', 'const': 'VND'},
    'status': {'type': 'string', 'const': 'PROCESSING'},
    'paymentUrl': string(pattern=r'^https://[^\s]+$', maxLength=4096), 'expiresAt': stamp,
})
schema('PaymentStatus', {
    'paymentId': ident('PAYMENT'), 'requestId': ident('REQUEST'), 'invoiceId': ident('INVOICE'),
    'amount': integer(1), 'status': enum('PROCESSING', 'VERIFIED', 'FAILED', 'EXPIRED', 'RECONCILIATION_REQUIRED'),
    'verifiedAt': nullable(stamp),
})
schema('Error', {
    'success': {'type': 'boolean', 'const': False}, 'message': short, 'errorCode': short,
    'data': {'type': 'null'}, 'errors': {'type': 'object', 'additionalProperties': array(short)},
}, ('errors',))

# Requests explicitly exclude server-owned amount/status/actor/timestamps.
schema('VersionInput', {'expectedVersion': version})
schema('AttemptInput', {'expectedVersion': version, 'reason': S['HandoverAttempt']['properties']['reason'],
                       'description': text, 'evidenceFileIds': file_ids})
schema('ReceiverInput', {'expectedVersion': version, 'name': short,
                        'phone': S['Receiver']['properties']['phone'], 'reason': text,
                        'evidenceFileIds': {**file_ids, 'minItems': 1}})
schema('AcceptanceInput', {'expectedVersion': version, 'statementVersion': version, 'confirmed': yes})
schema('ComplaintInput', {'expectedVersion': version, 'kind': S['Complaint']['properties']['kind'],
                         'category': S['Complaint']['properties']['category'], 'title': short,
                         'description': text, 'horseId': nullable(ident('HORSE')), 'evidenceFileIds': file_ids})
schema('MessageInput', {'expectedVersion': version, 'text': text, 'evidenceFileIds': file_ids})
schema('ProposalInput', {'expectedVersion': version, 'description': text,
                        'reductionAmount': money, 'evidenceFileIds': file_ids})
schema('ProposalDecisionInput', {'expectedVersion': version, 'proposalVersion': version,
                                'decision': enum('ACCEPTED', 'REJECTED'), 'note': text})
schema('ExtensionInput', {'expectedVersion': version, 'newDueAt': stamp, 'reason': text})
schema('DisputeInput', {'expectedVersion': version, 'reason': S['Dispute']['properties']['reason'],
                       'description': text, 'evidenceFileIds': file_ids})
schema('DisputeDecisionInput', {'expectedVersion': version,
    **{k: S['DisputeDecision']['properties'][k] for k in [
        'outcome', 'basis', 'customerAgreementProposalIds', 'reference', 'summary',
        'evidenceFileIds', 'reductionAmount', 'waiverAmount']}})
schema('PaymentInput', {'expectedVersion': version, 'invoiceVersion': version,
                       'method': {'type': 'string', 'const': 'VNPAY'}})
schema('RefundConfirmationInput', {'expectedVersion': version, 'reference': short,
                                  'evidenceFileIds': {**file_ids, 'minItems': 1}, 'note': text})
schema('CloseInput', {'expectedVersion': version, 'mode': enum('NORMAL', 'AFTER_DISPUTE'), 'reason': text})

ROLES = {'customer': 'CUSTOMER', 'driver': 'DRIVER_ESCORT', 'manager': 'LOGISTICS_MANAGER',
         'coordinator': 'FLEET_ROUTE_COORDINATOR'}
paths = {}
operations = []


def add(name, method, path, role, title, response, body=None, guards='', status=200, kind='json'):
    code = f'F6-J{len(operations) + 1:02}'
    params = []
    for key in re.findall(r'{(\w+)}', path):
        parameter_schema = {'requestId': ident('REQUEST'), 'tripId': ident('TRIP'),
                            'paymentId': ident('PAYMENT')}.get(key, opaque)
        params.append({'name': key, 'in': 'path', 'required': True, 'schema': parameter_schema})
    if method != 'get':
        params.append({'name': 'Idempotency-Key', 'in': 'header', 'required': True, 'schema': uuid})
    if kind == 'download':
        content = {mime: {'schema': string(format='binary')} for mime in ['application/pdf', 'image/jpeg', 'image/png']}
    else:
        content = {'application/json': {'schema': obj({'success': yes, 'message': short, 'data': response})}}
    op = {'operationId': code, 'summary': title, 'description': guards,
          'tags': [role], 'x-role': role, 'x-client-name': name, 'x-kind': kind,
          'x-implementation-status': 'DESIGNED_NOT_IMPLEMENTED', 'parameters': params,
          'responses': {str(status): {'description': title, 'content': content}}}
    if body:
        op['requestBody'] = {'required': True, 'content': {'application/json': {'schema': body}}}
    if kind == 'upload':
        op['requestBody'] = {'required': True, 'content': {'multipart/form-data': {
            'schema': obj({'file': string(format='binary')}),
            'encoding': {'file': {'contentType': 'application/pdf, image/jpeg, image/png'}}}}}
    for http in [400, 401, 403, 404, 409, 413, 415, 429, 500, 501]:
        op['responses'][str(http)] = {'description': 'Không đổi trạng thái; xem errorCode.',
                                     'content': {'application/json': {'schema': ref('Error')}}}
    paths.setdefault(path, {})[method] = op
    operations.append((path, method, op, response, body, status))


base = '/{role}/requests/{requestId}/aftercare'
customer = base.replace('{role}', 'customer')
manager = base.replace('{role}', 'manager')
add('getPolicy', 'get', '/master/flow6-policy', 'AUTHENTICATED', 'Đọc policy nghiệm thu và thanh toán', ref('Policy'),
    guards='Server trả cấu hình đang bật. Snapshot policy khi bàn giao; cấu hình thay đổi không sửa deadline đã mở.')
add('getManagerQueue', 'get', '/manager/aftercare', ROLES['manager'], 'Danh sách bàn giao, quá hạn và tranh chấp', array(ref('QueueItem'), 0, 10000),
    guards='Chỉ phạm vi quản lý được cấp quyền. Danh sách rỗng vẫn trả []; không fallback demo.')
add('getDriverHandover', 'get', '/driver/trips/{tripId}/handover', ROLES['driver'], 'Hồ sơ bàn giao của chặng được phân công', ref('HandoverContext'),
    guards='Chỉ tổ xe được giao chặng giao cuối. arrivedAtDestination lấy từ FINAL_ARRIVED đã xác nhận của Flow4, không từ GPS/ETA/giờ dự kiến. canComplete kiểm blocker hiện hành của mọi incident Flow5 liên quan bàn giao. Không trả tài chính, hồ sơ tranh chấp hoặc khách của chuyến khác.')
add('recordHandoverAttempt', 'post', '/driver/trips/{tripId}/handover-attempts', ROLES['driver'], 'Ghi nhận bàn giao chưa thành công', ref('HandoverContext'), ref('AttemptInput'),
    guards='Chưa có bàn giao thành công, đã tới điểm giao. Giữ Trip chưa COMPLETED; chưa mở thời hạn nghiệm thu. Thông báo Coordinator và Manager.', status=201)
add('completeHandover', 'post', '/driver/trips/{tripId}/handover', ROLES['driver'], 'Hoàn thành bàn giao và mở thời hạn nghiệm thu', ref('HandoverContext'), ref('HandoverInput'),
    guards='Server recheck FINAL_ARRIVED Flow4 và toàn bộ blocker Flow5 liên quan bàn giao dưới cùng transaction boundary, kể cả context trước đó canComplete=true. Kiểm phân công chặng cuối, người nhận đã đăng ký/được duyệt, đủ đúng mỗi ngựa một lần, microchip, ảnh, chữ ký và file cùng request. Chữ ký gắn snapshot đầy đủ nội dung receiver/horses/condition/note/version đã cho người nhận xem; đổi nội dung phải ký lại, không tái dùng signature file cho biên bản khác. Atomic: Trip COMPLETED, Request DELIVERED, phase AWAITING_ACCEPTANCE, một deadline theo policy. Không phải nghiệm thu Customer.', status=201)
add('authorizeReceiver', 'post', '/manager/trips/{tripId}/receiver-authorizations', ROLES['manager'], 'Duyệt người nhận thay thế trước bàn giao', ref('HandoverContext'), ref('ReceiverInput'),
    guards='Chỉ trước bàn giao thành công; ghi bằng chứng ủy quyền và actor. Không sửa hợp đồng đã ký. version lấy từ HandoverContext.', status=201)
for role in ['customer', 'manager']:
    add('get' + role.title() + 'Aftercare', 'get', base.replace('{role}', role), ROLES[role], 'Đọc hồ sơ Flow 6 và hành động được phép', ref('Aftercare'),
        guards='Sau bàn giao thành công. Chỉ chủ yêu cầu/phạm vi quản lý. Customer chỉ nhận bằng chứng và thông tin được chia sẻ, không có ghi chú hay chi phí nội bộ. actions chỉ hỗ trợ UI; mutation luôn recheck.')
add('getCoordinatorSummary', 'get', '/coordinator/requests/{requestId}/aftercare', ROLES['coordinator'], 'Theo dõi kết quả bàn giao', ref('CoordinatorSummary'),
    guards='Coordinator được phân công chỉ đọc kết quả và lần bàn giao thất bại; không có quyền nghiệm thu, xác minh tiền hoặc đóng đơn.')
add('acceptDelivery', 'post', customer + '/acceptance', ROLES['customer'], 'Customer xác nhận nghiệm thu cuối cùng', ref('Aftercare'), ref('AcceptanceInput'),
    guards='Chỉ chủ yêu cầu, trong hạn RUNNING, chưa ACCEPTED, không khiếu nại/tranh chấp/điều chỉnh chờ. Kiểm đúng statementVersion. Atomic: ACCEPTED, khóa khiếu nại mới, mở paymentWindow riêng. Nếu không còn nợ thì READY_TO_CLOSE khi không nghĩa vụ treo. Không chờ hết 24/48h.')
add('reportIssue', 'post', customer + '/complaints', ROLES['customer'], 'Báo vấn đề hoặc từ chối nghiệm thu', ref('Aftercare'), ref('ComplaintInput'),
    guards='Bàn giao xong, chưa ACCEPTED, trong hạn RUNNING hoặc đang PAUSED vì khiếu nại/tranh chấp trước nghiệm thu; quá hạn phải được gia hạn. Khóa nghiệm thu/thanh toán, pause thời hạn một lần; REFUSAL không đóng đơn. horseId nếu có phải thuộc chuyến.', status=201)
for role in ['customer', 'manager']:
    add('add' + role.title() + 'ComplaintMessage', 'post', base.replace('{role}', role) + '/complaints/{complaintId}/messages', ROLES[role], 'Trao đổi và bổ sung bằng chứng khiếu nại', ref('Aftercare'), ref('MessageInput'),
        guards='Khiếu nại thuộc đúng request và chưa RESOLVED; CLOSED không cho ghi mới. Message hiển thị cho Customer; không dùng để lưu ghi chú nội bộ.', status=201)
add('proposeResolution', 'post', manager + '/complaints/{complaintId}/proposals', ROLES['manager'], 'Đề xuất giải quyết và khoản giảm', ref('Aftercare'), ref('ProposalInput'),
    guards='Khiếu nại OPEN/PROPOSED; đề xuất mới supersede bản PENDING cũ. Không sửa bản ACCEPTED. Khoản giảm chưa trừ hóa đơn; không cộng thêm tiền khách. Không dùng trong tranh chấp đã có quyết định cuối.', status=201)
add('decideProposal', 'post', customer + '/complaints/{complaintId}/proposals/{proposalId}/decision', ROLES['customer'], 'Customer đồng ý hoặc từ chối đúng bản đề xuất', ref('Aftercare'), ref('ProposalDecisionInput'),
    guards='Đúng proposalVersion hiện hành PENDING. ACCEPTED => AGREED và pendingAdjustment; REJECTED => OPEN, giữ khóa. Đồng ý phương án không phải nghiệm thu bàn giao.')
add('applyComplaintResolution', 'post', manager + '/complaints/{complaintId}/resolution/apply', ROLES['manager'], 'Áp dụng kết quả đã được khách đồng ý', ref('Aftercare'), ref('VersionInput'),
    guards='Chỉ proposal ACCEPTED. Atomic áp dụng khoản giảm một lần, tạo nghĩa vụ hoàn nếu thừa tiền, chuyển complaint RESOLVED. Không gửi số tiền lại. Khi hết khiếu nại, không tranh chấp và hết pendingAdjustment: mở lại đủ acceptanceHours từ server now; còn vụ mở giữ PAUSED.')
add('extendAcceptance', 'post', manager + '/acceptance-window/extensions', ROLES['manager'], 'Gia hạn kiểm tra và nghiệm thu', ref('Aftercare'), ref('ExtensionInput'),
    guards='Chưa ACCEPTED, không tranh chấp/complaint/pendingAdjustment. newDueAt > now và > hạn hiện tại, trong maxExtensionHours. Giữ lịch sử; không xóa bộ đếm cũ. Chỉ cửa sổ nghiệm thu, không sửa paymentWindow.', status=201)
add('openDispute', 'post', manager + '/dispute', ROLES['manager'], 'Chuyển đơn sang đang giải quyết', ref('Aftercare'), ref('DisputeInput'),
    guards='Đơn đã bàn giao, chưa CLOSED, chưa có dispute mở. NO_RESPONSE chỉ sau quá hạn; PAYMENT_DISAGREEMENT có thể sau ACCEPTED. Request UNDER_RESOLUTION, chặn nghiệm thu/khởi tạo tiền/đóng. Hủy phiên đang chờ theo khả năng provider; tiền về muộn vẫn phải đối soát.', status=201)
add('addDisputeUpdate', 'post', manager + '/dispute/updates', ROLES['manager'], 'Ghi diễn biến giải quyết có thể chia sẻ với khách', ref('Aftercare'), ref('MessageInput'),
    guards='Dispute OPEN/DECISION_RECORDED. Chỉ bằng chứng được phép chia sẻ. Không tự đánh dấu khách đồng ý.', status=201)
add('recordDisputeDecision', 'post', manager + '/dispute/decisions', ROLES['manager'], 'Ghi nhận kết quả cuối cùng của tranh chấp', ref('Aftercare'), ref('DisputeDecisionInput'),
    guards='Dispute OPEN. CUSTOMER_AGREEMENT phải tham chiếu các proposal đã được chính Customer chấp nhận, bao phủ mọi complaint chưa giải quyết. EXTERNAL_DECISION cần reference và bằng chứng hợp lệ, Manager xác nhận đã kiểm chứng. COMPANY_WAIVER chỉ miễn nghĩa vụ khách còn nợ, không khẳng định khách đồng ý, không phủ nhận yêu cầu bồi thường chưa xử lý. RESUME_ACCEPTANCE chỉ khi chưa ACCEPTED, waiverAmount=0. Không ghi đè quyết định đã lưu; lỗi cần quy trình hiệu chỉnh riêng, chưa hỗ trợ.', status=201)
add('applyDisputeDecision', 'post', manager + '/dispute/decisions/{decisionId}/apply', ROLES['manager'], 'Áp dụng quyết định và hóa đơn trong một transaction', ref('Aftercare'), ref('VersionInput'),
    guards='Quyết định RECORDED, đúng request. Đối soát payment đang xử lý trước. reduction không vượt giá còn lại, waiver không vượt nợ sau reduction; khoản đã áp dụng không tính hai lần. Giải quyết các complaint trong phạm vi quyết định. RESUME_ACCEPTANCE => mở thời hạn mới. CLOSE_AFTER_DISPUTE => bỏ yêu cầu nghiệm thu bằng NOT_REQUIRED_BY_DISPUTE nếu chưa ký nghiệm thu, không tạo acceptedAt. Nợ/hoàn còn treo vẫn chặn đóng.')
add('createBalancePayment', 'post', customer + '/payment-sessions', ROLES['customer'], 'Khởi tạo thanh toán số dư VNPay', ref('PaymentSession'), ref('PaymentInput'),
    guards='Server tính amount=outstanding theo invoiceVersion, không nhận amount/returnUrl từ client. Bình thường phải ACCEPTED; ngoại lệ quyết định CLOSE_AFTER_DISPUTE đã APPLIED và cho phép thu nợ. Không vụ mở, pendingAdjustment/refund, pendingPayment; nợ >0. Quá hạn thanh toán vẫn được trả và ghi nhận trễ. Return trình duyệt không xác minh tiền.', status=201)
add('getBalancePayment', 'get', customer + '/payments/{paymentId}', ROLES['customer'], 'Đọc kết quả thanh toán đã xác minh trên server', ref('PaymentStatus'),
    guards='PAYMENT phải thuộc Request và Customer. Chỉ đọc; không xác minh từ query browser, không tự xử lý IPN.')
add('confirmRefund', 'post', manager + '/refunds/{refundId}/confirmation', ROLES['manager'], 'Ghi nhận bằng chứng khoản hoàn đã chuyển thực tế', ref('Aftercare'), ref('RefundConfirmationInput'),
    guards='Nghĩa vụ refund có sẵn PENDING/PROCESSING/FAILED. Người có quyền tài chính được cấu hình kiểm tra reference, số tiền đúng nghĩa vụ, bằng chứng thanh toán. Không phải API chuyển tiền hoặc duyệt hoàn = đã hoàn. Chỉ ghi verifiedAt sau kiểm chứng; chống reference trùng.', status=200)
add('closeRequest', 'post', manager + '/closure', ROLES['manager'], 'Manager đóng đơn sau kiểm tra toàn bộ nghĩa vụ', ref('Aftercare'), ref('CloseInput'),
    guards='Atomic recheck đủ bàn giao, không vụ mở, không pendingAdjustment/payment/reconciliation/refund, outstanding=0, refundDue=0. NORMAL cần ACCEPTED. AFTER_DISPUTE cần quyết định CLOSE_AFTER_DISPUTE đã APPLIED. Không chờ hết acceptanceWindow sau đã ACCEPTED. Không tự đóng, không tự nghiệm thu, không đánh dấu nợ đã thanh toán.', status=200)
for role in ['driver', 'customer', 'manager']:
    add('upload' + role.title() + 'Evidence', 'post', base.replace('{role}', role) + '/files', ROLES[role], 'Tải bằng chứng thật cho đúng yêu cầu', ref('Evidence'),
        guards='PDF/JPEG/PNG 1 byte–10 MiB, kiểm bytes/MIME, malware và quyền. Driver chỉ chặng giao được phân công; cho upload trước handover. Client gửi đúng một file multipart, không URL/base64. Không tăng aftercare.version chỉ vì upload file chưa gắn.', status=201, kind='upload')
    add('download' + role.title() + 'Evidence', 'get', base.replace('{role}', role) + '/files/{fileId}', ROLES[role], 'Tải bằng chứng có kiểm quyền', None,
        guards='File thuộc đúng Request và được chia sẻ với role. Token Bearer, binary đúng MIME. Driver chỉ file bàn giao mình có quyền; không thấy tài liệu tranh chấp. Không dùng URL công khai.', kind='download')

# Readable, deterministic success examples. They are fixtures, never live operations.
actor = {'userId': 'USER_001', 'name': 'Nguyễn Minh An'}
now = '2026-11-20 10:00'
policy = {'version': 1, 'defaultAcceptanceHours': '48', 'allowedAcceptanceHours': ['24', '48'],
          'paymentHours': 24, 'maxExtensionHours': 168, 'acceptanceStatementVersion': 1,
          'acceptanceStatement': 'Tôi đã kiểm tra bàn giao, đồng ý kết quả xử lý nếu có và không còn yêu cầu khiếu nại đối với lần bàn giao này.',
          'timezone': 'Asia/Ho_Chi_Minh'}
receiver = {'name': 'Trần Văn Bình', 'phone': '0901234567', 'authorization': 'REGISTERED', 'authorizationReference': None}
horse = {'horseId': 'HORSE_001', 'microchipVerified': True, 'condition': 'NORMAL', 'note': 'Tình trạng ổn định.', 'photoFileIds': ['evidence_photo_001']}
handover = {'id': 'handover_001', 'tripId': 'TRIP_001', 'requestId': 'REQUEST_001', 'completedAt': now,
            'recordedBy': actor, 'receiver': receiver, 'horses': [horse], 'signatureFileId': 'evidence_signature_001', 'note': 'Đã bàn giao đủ ngựa.'}
window = {'status': 'RUNNING', 'openedAt': now, 'dueAt': '2026-11-22 10:00', 'remainingSeconds': 172800, 'overdueAt': None}
not_started = {'status': 'NOT_STARTED', 'openedAt': None, 'dueAt': None, 'remainingSeconds': 0, 'overdueAt': None}
settlement = {'invoiceId': 'INVOICE_001', 'invoiceVersion': 1, 'currency': 'VND', 'originalTotal': 20000000,
              'reductionTotal': 0, 'waiverTotal': 0, 'netPayable': 20000000, 'verifiedDeposit': 8000000,
              'verifiedBalance': 0, 'outstanding': 12000000, 'refundDue': 0, 'verifiedRefund': 0,
              'adjustments': [], 'pendingAdjustmentIds': [], 'refunds': [], 'pendingPaymentIds': [],
              'canPay': False, 'paymentBlockers': ['Chưa nghiệm thu.']}
aftercare = {'requestId': 'REQUEST_001', 'tripId': 'TRIP_001', 'version': 1, 'requestStatus': 'DELIVERED',
             'tripStatus': 'COMPLETED', 'phase': 'AWAITING_ACCEPTANCE', 'serverTime': now, 'policy': policy,
             'handover': handover, 'acceptance': {'status': 'PENDING', 'acceptedAt': None, 'acceptedBy': None, 'statementVersion': None},
             'acceptanceWindow': window, 'paymentWindow': not_started, 'deadlineHistory': [
                 {'id': 'deadline_001', 'kind': 'OPENED', 'window': 'ACCEPTANCE', 'previousDueAt': None,
                  'newDueAt': window['dueAt'], 'reason': 'Bàn giao thành công.', 'at': now, 'actor': None}],
             'complaints': [], 'dispute': None, 'settlement': settlement,
             'actions': [{'action': 'ACCEPT', 'allowed': True, 'blockers': []},
                         {'action': 'REPORT_ISSUE', 'allowed': True, 'blockers': []},
                         {'action': 'PAY', 'allowed': False, 'blockers': ['Chưa nghiệm thu.']}], 'closure': None}
context = {'requestId': 'REQUEST_001', 'tripId': 'TRIP_001', 'version': 1, 'arrivedAtDestination': True,
           'receiver': receiver, 'horseIds': ['HORSE_001'], 'handover': None, 'attempts': [], 'canComplete': True, 'blockers': []}
proposal = {'id': 'proposal_001', 'version': 1, 'complaintId': 'complaint_001', 'status': 'PENDING',
            'description': 'Đề xuất giảm tiền theo phản ánh của khách.', 'reductionAmount': 1000000,
            'evidenceFileIds': [], 'createdAt': now, 'createdBy': actor, 'customerDecidedAt': None, 'customerDecisionNote': None}
complaint = {'id': 'complaint_001', 'requestId': 'REQUEST_001', 'kind': 'ISSUE', 'category': 'HORSE_CONDITION',
             'title': 'Đề nghị kiểm tra tình trạng ngựa', 'description': 'Ngựa có vết trầy cần xác minh nguyên nhân.',
             'horseId': 'HORSE_001', 'evidenceFileIds': ['evidence_photo_001'], 'status': 'OPEN',
             'createdAt': now, 'messages': [], 'proposals': []}
decision = {'id': 'decision_001', 'status': 'RECORDED', 'outcome': 'CLOSE_AFTER_DISPUTE', 'basis': 'EXTERNAL_DECISION',
            'customerAgreementProposalIds': [], 'reference': 'EXAMPLE-RESOLUTION-01', 'summary': 'Kết quả giải quyết được kiểm chứng và ghi nhận.',
            'evidenceFileIds': ['evidence_decision_001'], 'reductionAmount': 1000000, 'waiverAmount': 0,
            'recordedAt': now, 'recordedBy': actor}
dispute = {'id': 'dispute_001', 'status': 'OPEN', 'reason': 'NO_RESPONSE',
           'description': 'Khách chưa phản hồi sau thời hạn nghiệm thu.', 'openedAt': now,
           'evidenceFileIds': [], 'updates': [], 'decision': None}
examples = {
    'Policy': policy, 'Aftercare': aftercare, 'HandoverContext': context,
    'CoordinatorSummary': {'requestId': 'REQUEST_001', 'tripId': 'TRIP_001', 'phase': 'AWAITING_ACCEPTANCE', 'handover': handover, 'attempts': [], 'issueSummary': ''},
    'QueueItem': {'requestId': 'REQUEST_001', 'tripId': 'TRIP_001', 'customerName': 'CLB Ngựa Đua', 'phase': 'AWAITING_ACCEPTANCE', 'version': 1, 'acceptanceDueAt': window['dueAt'], 'paymentDueAt': None, 'overdue': False, 'openComplaints': 0, 'hasOpenDispute': False, 'outstanding': 12000000, 'refundDue': 0},
    'Evidence': {'id': 'evidence_photo_001', 'requestId': 'REQUEST_001', 'name': 'ban-giao.png', 'mimeType': 'image/png', 'sizeBytes': 1024, 'uploadedAt': now, 'uploadedBy': actor},
    'PaymentSession': {'paymentId': 'PAYMENT_002', 'requestId': 'REQUEST_001', 'invoiceId': 'INVOICE_001', 'invoiceVersion': 1, 'amount': 12000000, 'currency': 'VND', 'status': 'PROCESSING', 'paymentUrl': 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=PAYMENT_002', 'expiresAt': '2026-11-20 10:15'},
    'PaymentStatus': {'paymentId': 'PAYMENT_002', 'requestId': 'REQUEST_001', 'invoiceId': 'INVOICE_001', 'amount': 12000000, 'status': 'VERIFIED', 'verifiedAt': now},
    'VersionInput': {'expectedVersion': 1},
    'HandoverInput': {'expectedVersion': 1, 'receiverName': receiver['name'], 'identityChecked': True, 'authorizationChecked': True, 'horses': [horse], 'signatureFileId': 'evidence_signature_001', 'note': 'Đã kiểm tra người nhận và ngựa.'},
    'AttemptInput': {'expectedVersion': 1, 'reason': 'RECEIVER_ABSENT', 'description': 'Người nhận chưa có mặt tại địa điểm giao.', 'evidenceFileIds': []},
    'ReceiverInput': {'expectedVersion': 1, 'name': 'Trần Văn Hùng', 'phone': '0901234568', 'reason': 'Khách ủy quyền người nhận thay thế.', 'evidenceFileIds': ['evidence_authorization_001']},
    'AcceptanceInput': {'expectedVersion': 1, 'statementVersion': 1, 'confirmed': True},
    'ComplaintInput': {'expectedVersion': 1, **{k: complaint[k] for k in ['kind', 'category', 'title', 'description', 'horseId', 'evidenceFileIds']}},
    'MessageInput': {'expectedVersion': 1, 'text': 'Đã bổ sung bằng chứng để hai bên kiểm tra.', 'evidenceFileIds': []},
    'ProposalInput': {'expectedVersion': 1, 'description': proposal['description'], 'reductionAmount': 1000000, 'evidenceFileIds': []},
    'ProposalDecisionInput': {'expectedVersion': 1, 'proposalVersion': 1, 'decision': 'ACCEPTED', 'note': 'Tôi đồng ý phương án giải quyết này.'},
    'ExtensionInput': {'expectedVersion': 1, 'newDueAt': '2026-11-24 10:00', 'reason': 'Gia hạn theo trao đổi với khách hàng.'},
    'DisputeInput': {'expectedVersion': 1, 'reason': 'NO_RESPONSE', 'description': dispute['description'], 'evidenceFileIds': []},
    'DisputeDecisionInput': {'expectedVersion': 1, **{k: decision[k] for k in ['outcome', 'basis', 'customerAgreementProposalIds', 'reference', 'summary', 'evidenceFileIds', 'reductionAmount', 'waiverAmount']}},
    'PaymentInput': {'expectedVersion': 1, 'invoiceVersion': 1, 'method': 'VNPAY'},
    'RefundConfirmationInput': {'expectedVersion': 1, 'reference': 'BANK-EXAMPLE-REFUND-01', 'evidenceFileIds': ['evidence_refund_001'], 'note': 'Đã đối chiếu chứng từ chuyển khoản thực tế.'},
    'CloseInput': {'expectedVersion': 1, 'mode': 'NORMAL', 'reason': 'Đã nghiệm thu và hoàn tất các nghĩa vụ.'},
}


def example_for(schema_value):
    if '$ref' in schema_value:
        return copy.deepcopy(examples[schema_value['$ref'].split('/')[-1]])
    if schema_value.get('type') == 'array':
        return [example_for(schema_value['items'])]
    raise ValueError(schema_value)


def response_example(name, response):
    value = example_for(response)
    if response == ref('HandoverContext'):
        if name == 'completeHandover':
            value.update(version=2, handover=handover, canComplete=False, blockers=['Đã bàn giao.'])
        elif name == 'recordHandoverAttempt':
            value['version'] = 2
            value['attempts'] = [{'id': 'attempt_001', 'at': now, 'actor': actor,
                                  **{k: examples['AttemptInput'][k] for k in ['reason', 'description', 'evidenceFileIds']}}]
        elif name == 'authorizeReceiver':
            value.update(version=2, receiver={**receiver, 'name': 'Trần Văn Hùng', 'phone': '0901234568', 'authorization': 'MANAGER_APPROVED', 'authorizationReference': 'authorization_001'})
    if response != ref('Aftercare') or name.startswith('get'):
        return value
    value['version'] = 2
    value['actions'] = []  # below regenerated from the scenario
    if name == 'acceptDelivery':
        value.update(phase='AWAITING_PAYMENT', acceptance={'status': 'ACCEPTED', 'acceptedAt': now, 'acceptedBy': actor, 'statementVersion': 1})
        value['acceptanceWindow']['status'] = 'COMPLETED'
        value['acceptanceWindow']['remainingSeconds'] = 0
        value['paymentWindow'] = {**window, 'dueAt': '2026-11-21 10:00', 'remainingSeconds': 86400}
        value['settlement'].update(canPay=True, paymentBlockers=[])
    elif name in ['reportIssue', 'addCustomerComplaintMessage', 'addManagerComplaintMessage', 'proposeResolution', 'decideProposal']:
        value['phase'] = 'COMPLAINT_OPEN'
        value['acceptanceWindow']['status'] = 'PAUSED'
        value['complaints'] = [copy.deepcopy(complaint)]
        value['settlement']['paymentBlockers'] = ['Khiếu nại chưa giải quyết.']
        c = value['complaints'][0]
        if name.startswith('add'):
            c['messages'] = [{'id': 'message_001', 'at': now, 'actor': actor, 'text': examples['MessageInput']['text'], 'evidenceFileIds': []}]
        if name in ['proposeResolution', 'decideProposal']:
            c['status'] = 'PROPOSED'; c['proposals'] = [copy.deepcopy(proposal)]
        if name == 'decideProposal':
            c['status'] = 'AGREED'; c['proposals'][0].update(status='ACCEPTED', customerDecidedAt=now, customerDecisionNote=examples['ProposalDecisionInput']['note'])
            value['settlement']['pendingAdjustmentIds'] = ['proposal_001']
    elif name == 'applyComplaintResolution':
        c = copy.deepcopy(complaint); p = copy.deepcopy(proposal)
        p.update(status='ACCEPTED', customerDecidedAt=now, customerDecisionNote=examples['ProposalDecisionInput']['note'])
        c.update(status='RESOLVED', proposals=[p]); value['complaints'] = [c]
        value['settlement'].update(invoiceVersion=2, reductionTotal=1000000, netPayable=19000000, outstanding=11000000,
                                   adjustments=[{'id': 'adjustment_001', 'sourceId': p['id'], 'kind': 'REDUCTION', 'amount': 1000000, 'appliedAt': now, 'reason': p['description']}])
    elif name == 'extendAcceptance':
        value['acceptanceWindow'].update(dueAt=examples['ExtensionInput']['newDueAt'], remainingSeconds=345600)
        value['deadlineHistory'].append({'id': 'deadline_002', 'kind': 'EXTENDED', 'window': 'ACCEPTANCE', 'previousDueAt': window['dueAt'], 'newDueAt': examples['ExtensionInput']['newDueAt'], 'reason': examples['ExtensionInput']['reason'], 'at': now, 'actor': actor})
    elif name in ['openDispute', 'addDisputeUpdate', 'recordDisputeDecision', 'applyDisputeDecision']:
        value.update(phase='DISPUTE_IN_PROGRESS', requestStatus='UNDER_RESOLUTION', dispute=copy.deepcopy(dispute))
        value['acceptanceWindow']['status'] = 'PAUSED'
        value['settlement']['paymentBlockers'] = ['Đang giải quyết tranh chấp.']
        # This sample starts after a real expiry, rather than inventing NO_RESPONSE before dueAt.
        value['serverTime'] = '2026-11-23 10:00'
        value['dispute']['openedAt'] = value['serverTime']
        value['acceptanceWindow'].update(remainingSeconds=0, overdueAt='2026-11-22 10:00')
        if name == 'addDisputeUpdate':
            value['dispute']['updates'] = [{'id': 'message_001', 'at': value['serverTime'], 'actor': actor, 'text': examples['MessageInput']['text'], 'evidenceFileIds': []}]
        if name in ['recordDisputeDecision', 'applyDisputeDecision']:
            value['dispute'].update(status='DECISION_RECORDED', decision=copy.deepcopy(decision))
            value['dispute']['decision']['recordedAt'] = value['serverTime']
            value['settlement']['pendingAdjustmentIds'] = ['decision_001']
        if name == 'applyDisputeDecision':
            value['dispute']['status'] = 'RESOLVED'; value['dispute']['decision']['status'] = 'APPLIED'
            value.update(phase='AWAITING_PAYMENT')
            value['acceptance'].update(status='NOT_REQUIRED_BY_DISPUTE')
            value['acceptanceWindow']['status'] = 'COMPLETED'
            value['paymentWindow'] = {**window, 'openedAt': value['serverTime'], 'dueAt': '2026-11-24 10:00', 'remainingSeconds': 86400}
            value['settlement'].update(invoiceVersion=2, reductionTotal=1000000, netPayable=19000000, outstanding=11000000,
                pendingAdjustmentIds=[], canPay=True, paymentBlockers=[], adjustments=[{'id': 'adjustment_001', 'sourceId': 'decision_001', 'kind': 'REDUCTION', 'amount': 1000000, 'appliedAt': value['serverTime'], 'reason': decision['summary']}])
    elif name in ['confirmRefund', 'closeRequest']:
        value['acceptance'] = {'status': 'ACCEPTED', 'acceptedAt': now, 'acceptedBy': actor, 'statementVersion': 1}
        value['acceptanceWindow'].update(status='COMPLETED', remainingSeconds=0)
        value['paymentWindow'] = {**window, 'status': 'COMPLETED', 'dueAt': '2026-11-21 10:00', 'remainingSeconds': 0}
        value['settlement'].update(verifiedBalance=12000000, outstanding=0, paymentBlockers=['Đã đủ tiền.'])
        value['phase'] = 'READY_TO_CLOSE'
        if name == 'confirmRefund':
            # Financial correction supported by an external dispute decision, never a new Customer complaint after acceptance.
            value.update(requestStatus='UNDER_RESOLUTION', dispute={**copy.deepcopy(dispute), 'status': 'RESOLVED', 'reason': 'PAYMENT_DISAGREEMENT', 'decision': {**decision, 'status': 'APPLIED'}})
            value['settlement'].update(invoiceVersion=2, reductionTotal=1000000, netPayable=19000000, verifiedRefund=1000000,
                adjustments=[{'id': 'adjustment_001', 'sourceId': 'decision_001', 'kind': 'REDUCTION', 'amount': 1000000, 'appliedAt': now, 'reason': decision['summary']}],
                refunds=[{'id': 'refund_001', 'amount': 1000000, 'status': 'VERIFIED', 'verifiedAt': now, 'reference': examples['RefundConfirmationInput']['reference']}])
        else:
            value.update(phase='CLOSED', requestStatus='CLOSED', closure={'mode': 'NORMAL', 'closedAt': now, 'closedBy': actor, 'reason': examples['CloseInput']['reason'], 'decisionId': None})
    return value


for path, method, op, response, body, status in operations:
    if body:
        op['requestBody']['content']['application/json']['example'] = example_for(body)
    if op['x-kind'] != 'download':
        op['responses'][str(status)]['content']['application/json']['examples'] = {
            'success': {'summary': 'Dữ liệu minh họa, không phải kết quả live',
                        'value': {'success': True, 'message': 'Thành công', 'data': response_example(op['x-client-name'], response)}}}
    for code, res in op['responses'].items():
        if int(code) >= 400:
            error = {400: 'VALIDATION_ERROR', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'RESOURCE_NOT_FOUND',
                     409: 'STATE_CONFLICT', 413: 'FILE_TOO_LARGE', 415: 'UNSUPPORTED_FILE_TYPE',
                     429: 'RATE_LIMITED', 500: 'INTERNAL_ERROR', 501: 'FEATURE_NOT_SUPPORTED'}[int(code)]
            res['content']['application/json']['example'] = {'success': False, 'message': 'Thao tác chưa được thực hiện.', 'errorCode': error, 'data': None}
            if code == '409':
                business_codes = {
                    'completeHandover': ['HANDOVER_NOT_READY', 'HANDOVER_ALREADY_COMPLETED'],
                    'recordHandoverAttempt': ['HANDOVER_ALREADY_COMPLETED', 'HANDOVER_NOT_READY'],
                    'acceptDelivery': ['ACCEPTANCE_WINDOW_EXPIRED', 'ALREADY_ACCEPTED', 'OPEN_COMPLAINT', 'OPEN_DISPUTE', 'PENDING_ADJUSTMENT'],
                    'reportIssue': ['ALREADY_ACCEPTED', 'ACCEPTANCE_WINDOW_EXPIRED', 'REQUEST_CLOSED'],
                    'decideProposal': ['STALE_PROPOSAL', 'REQUEST_CLOSED'],
                    'applyComplaintResolution': ['PROPOSAL_NOT_ACCEPTED', 'RECONCILIATION_REQUIRED'],
                    'recordDisputeDecision': ['INVALID_DECISION_BASIS', 'OPEN_COMPLAINT'],
                    'applyDisputeDecision': ['INVALID_DECISION_BASIS', 'UNSETTLED_PAYMENT'],
                    'createBalancePayment': ['STALE_INVOICE', 'OPEN_COMPLAINT', 'OPEN_DISPUTE', 'PENDING_ADJUSTMENT', 'UNSETTLED_PAYMENT', 'PENDING_REFUND'],
                    'confirmRefund': ['PENDING_REFUND', 'RECONCILIATION_REQUIRED'],
                    'closeRequest': ['CLOSURE_BLOCKED', 'OUTSTANDING_BALANCE', 'PENDING_REFUND', 'UNSETTLED_PAYMENT', 'OPEN_COMPLAINT', 'OPEN_DISPUTE'],
                }.get(op['x-client-name'], ['STATE_CONFLICT'])
                names = list(dict.fromkeys(business_codes + ['STALE_VERSION', 'IDEMPOTENCY_CONFLICT', 'REQUEST_IN_PROGRESS']))
                res['content']['application/json'].pop('example', None)
                res['content']['application/json']['examples'] = {name: {'value': {
                    'success': False, 'message': 'Thao tác bị chặn: ' + name, 'errorCode': name, 'data': None}} for name in names}

spec = {'openapi': '3.1.0', 'info': {'title': 'CBN Transport — Flow 6', 'version': '1.1.0',
        'description': 'Contract mục tiêu, đồng bộ Flow4/5 ngày 29/10/2026; giữ quy tắc Flow6 ngày 26/10. Backend/DB và UI hiện tại chưa triển khai đầy đủ.'},
        'servers': [{'url': '/api'}], 'security': [{'bearerAuth': []}],
        'paths': paths, 'components': {'securitySchemes': {'bearerAuth': {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}}, 'schemas': S},
        'x-payment-verification': {'transport': 'GET /payments/vnpay/ipn', 'owner': 'existing payment gateway backend',
            'extensionRequired': True, 'browserCallable': False,
            'rules': ['Verify checksum/merchant/provider result and VND amount against stored BALANCE payment.',
                      'Idempotently record money once and update aftercare + invoice versions under lock.',
                      'Late/expired/stale-invoice/disputed/closed payments must be reconciled, never discarded or auto-close.',
                      'Browser return is navigation only. Keep provider acknowledgement protocol, not Flow6 JSON envelope.']}}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


dump(ROOT / 'flow6.openapi.json', spec)
dump(FRONTEND / 'contracts/flow6.openapi.json', spec)


def ts_type(s):
    if '$ref' in s:
        return s['$ref'].split('/')[-1]
    if 'anyOf' in s:
        return '(' + ' | '.join(ts_type(x) for x in s['anyOf']) + ')'
    if 'const' in s:
        return json.dumps(s['const'], ensure_ascii=False)
    if 'enum' in s:
        return ' | '.join(json.dumps(x, ensure_ascii=False) for x in s['enum'])
    t = s['type']
    if t == 'array':
        return 'Array<' + ts_type(s['items']) + '>'
    if t == 'object':
        if 'properties' not in s:
            return 'Record<string, ' + ts_type(s['additionalProperties']) + '>'
        return '{ ' + '; '.join(k + ('' if k in s['required'] else '?') + ': ' + ts_type(v) for k, v in s['properties'].items()) + ' }'
    return {'integer': 'number', 'number': 'number', 'string': 'string', 'boolean': 'boolean', 'null': 'null'}[t]


types = '// Generated by contracts/API-Flow/Flow6/build_contract.py. Do not edit by hand.\n'
types += '// These DTOs describe a target API, not implemented backend/database entities.\n'
types += '\n'.join('export type ' + name + ' = ' + ts_type(s) + ';' for name, s in S.items()) + '\n'
target = FRONTEND / 'features/aftercare/types/flow6.types.ts'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(types, encoding='utf-8')
api = '// Generated by contracts/API-Flow/Flow6/build_contract.py.\n'
api += "import { flow6Request } from './flow6Client';\nimport type * as T from '../types/flow6.types';\n\n"
api += '// Keep the same idempotencyKey for a retry of an unchanged command. Refetch on STALE_VERSION.\nexport const flow6Api = {\n'
for path, method, op, response, body, status in operations:
    params = re.findall(r'{(\w+)}', path)
    args = [key + ': string' for key in params]
    if body:
        args.append('body: T.' + body['$ref'].split('/')[-1])
    if op['x-kind'] == 'upload':
        args.append('file: File')
    if method != 'get':
        args.append('idempotencyKey: string')
    result = 'Blob' if op['x-kind'] == 'download' else ('Array<T.' + response['items']['$ref'].split('/')[-1] + '>' if response.get('type') == 'array' else 'T.' + response['$ref'].split('/')[-1])
    opts = ['path: { ' + ', '.join(params) + ' }']
    if body:
        opts.append('body')
    if op['x-kind'] == 'upload':
        opts.append('file')
    if method != 'get':
        opts.append('idempotencyKey')
    api += f"  {op['x-client-name']}: ({', '.join(args)}) => flow6Request<{result}>('{op['operationId']}', {{ {', '.join(opts)} }}),\n"
api += '};\n'
target = FRONTEND / 'features/aftercare/api/flow6Api.ts'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(api, encoding='utf-8')

md = '# Flow 6 — Request/response từng API\n\n'
md += '**1.1.0 — 29/10/2026. Contract đích; chưa triển khai backend/DB, chưa nối các màn hình cũ.**\n\n'
md += '> Sinh từ `build_contract.py`. Đọc [FLOW6.md](FLOW6.md) trước khi triển khai. Ví dụ là các snapshot độc lập, không phải chuỗi lệnh chạy liên tiếp; lấy lại version thật từ GET/response.\n\n'
md += '[OpenAPI](flow6.openapi.json) · [Kịch bản ROAD/AIR và nghiệm thu](flow6.examples.json) · [Review backend/frontend](REVIEW.md).\n\n'
md += 'Base `/api`; Bearer token theo role. Mọi POST cần `Idempotency-Key` UUID; cùng key cho retry cùng payload. JSON dùng envelope, download dùng binary.\n\n'
md += '| ID | Method | Path | Vai trò | Chức năng |\n|---|---|---|---|---|\n'
for path, method, op, response, body, status in operations:
    md += f"| {op['operationId']} | {method.upper()} | `{path}` | {op['x-role']} | {op['summary']} |\n"
for path, method, op, response, body, status in operations:
    md += f"\n## {op['operationId']} — {method.upper()} {path}\n\n{op['summary']}. Vai trò: **{op['x-role']}**.\n\n{op['description']}\n"
    if op['parameters']:
        md += '\n| Vị trí | Tên | Bắt buộc | Schema |\n|---|---|---|---|\n'
        for parameter in op['parameters']:
            md += f"| {parameter['in']} | `{parameter['name']}` | {parameter['required']} | `{json.dumps(parameter['schema'], ensure_ascii=False)}` |\n"
    if method != 'get':
        md += '\nHeader: `Idempotency-Key: 1c1cab53-8dd1-4fa0-9658-cd4b3dd328bd` (mỗi thao tác mới dùng key mới).\n'
    if body:
        md += '\nRequest JSON:\n\n```json\n' + json.dumps(example_for(body), ensure_ascii=False, indent=2) + '\n```\n'
    elif op['x-kind'] == 'upload':
        md += '\nRequest multipart: đúng một trường `file`, File thật PDF/JPEG/PNG, tối đa 10 MiB; không đặt boundary thủ công.\n'
    else:
        md += '\nKhông gửi request body.\n'
    if op['x-kind'] == 'download':
        md += '\nResponse 200: binary theo MIME file; `Content-Disposition: attachment`. Lỗi vẫn là JSON.\n'
    else:
        example = op['responses'][str(status)]['content']['application/json']['examples']['success']['value']
        md += f'\nResponse {status}:\n\n```json\n' + json.dumps(example, ensure_ascii=False, indent=2) + '\n```\n'
    md += '\nLỗi: 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 RESOURCE_NOT_FOUND; 409 theo guard/version; 429 RATE_LIMITED; 500 INTERNAL_ERROR; 501 FEATURE_NOT_SUPPORTED. Upload còn có 413 FILE_TOO_LARGE, 415 UNSUPPORTED_FILE_TYPE. Mẫu đầy đủ trong OpenAPI.\n'
    md += '\nMã 409: ' + ', '.join(op['responses']['409']['content']['application/json']['examples']) + '.\n'
    error_example = next(iter(op['responses']['409']['content']['application/json']['examples'].values()))['value']
    md += '\nMẫu lỗi 409 (không commit một phần):\n\n```json\n' + json.dumps(error_example, ensure_ascii=False, indent=2) + '\n```\n'
md += '\n## Lỗi chung\n\n401 chưa đăng nhập; 403 sai role; 404 không thuộc phạm vi; 409 version/trạng thái không còn hợp lệ; 413 file quá lớn; 415 sai định dạng; 429 giới hạn; 501 chưa triển khai. Mã nghiệp vụ chi tiết ở FLOW6.md.\n\n```json\n' + json.dumps({'success': False, 'message': 'Hồ sơ đã thay đổi, hãy tải lại trước khi xác nhận.', 'errorCode': 'STALE_VERSION', 'data': None}, ensure_ascii=False, indent=2) + '\n```\n'
(ROOT / 'FLOW6-API-JSON.md').write_text(md, encoding='utf-8')

scenario_rows = [
    ('road-arrival', 'ROAD FINAL_ARRIVED đã xác nhận, không blocker liên quan', 'Driver đọc context và bàn giao', 'COMPLETED/DELIVERED và đúng một acceptanceWindow'),
    ('air-final-leg', 'AIR đã tiếp nhận và inbound FINAL_ARRIVED', 'Tổ inbound bàn giao', 'Chỉ crew chặng cuối được ghi; outbound không được'),
    ('eta-not-arrival', 'ETA hoặc plannedArrival tới giờ, chưa FINAL_ARRIVED', 'POST handover', '409 HANDOVER_NOT_READY, không deadline'),
    ('incident-handover-race', 'GET canComplete=true rồi phát sinh incident chặn bàn giao', 'POST handover', '409 HANDOVER_NOT_READY, recheck Flow5 dưới transaction'),
    ('resolved-not-safe', 'Incident RESOLVED nhưng dependency khác vẫn chặn', 'POST handover', 'Không coi status incident là đủ điều kiện bàn giao'),
    ('wrong-owner', 'Customer A hoặc Driver khác assignment', 'GET/POST request/file ngoài scope', '404, không lộ dữ liệu'),
    ('wrong-role', 'Coordinator gửi acceptance/closure', 'Mutation', '403, không thay trạng thái'),
    ('receiver-not-authorized', 'Người nhận chưa được đăng ký/Manager duyệt', 'POST handover', '409 HANDOVER_NOT_READY'),
    ('horse-set', 'Trip có hai ngựa', 'Bàn giao thiếu/trùng/ngựa ngoài Trip', '400/409; không hoàn tất'),
    ('abnormal-condition', 'Ngựa có condition ABNORMAL', 'Ghi tình trạng đúng kèm note và bằng chứng', 'Không bắt khai NORMAL; các blocker an toàn liên quan vẫn phải xử lý'),
    ('signature-binding', 'Người nhận ký nội dung cũ', 'Đổi receiver/horses/condition/note hoặc tái dùng signature file', 'Yêu cầu ký lại, giữ snapshot gốc'),
    ('handover-failed', 'Người nhận vắng mặt/từ chối', 'recordHandoverAttempt', 'Lưu attempt, chưa COMPLETED/DELIVERED, chưa đồng hồ'),
    ('handover-race', 'Hai POST bàn giao đồng thời', 'Commit', 'Đúng một handover/deadline/outbox'),
    ('idempotent-replay', 'Mutation đã commit', 'Retry cùng key/body dù aggregate version tăng', 'Response cũ, không thêm side effect'),
    ('idempotency-conflict', 'Key đã dùng', 'Khác body', '409 IDEMPOTENCY_CONFLICT'),
    ('policy-snapshot', 'Policy thay sau bàn giao', 'GET aftercare', 'Không đổi dueAt đã mở; client dùng policy snapshot/serverTime'),
    ('acceptance-consent', 'Không complaint/dispute và trong hạn', 'Đúng statementVersion + confirmed=true', 'ACCEPTED và mở paymentWindow riêng; không chờ hết hạn'),
    ('acceptance-race', 'Acceptance và complaint cùng version', 'Hai POST đồng thời', 'Chỉ một thành công, không ACCEPTED cùng complaint mới'),
    ('late-acceptance', 'AcceptanceWindow OVERDUE', 'Customer accept', '409 ACCEPTANCE_WINDOW_EXPIRED, Manager cần gia hạn'),
    ('overdue-alert-only', 'Hết hạn, khách im lặng', 'Job', 'Cảnh báo một lần/lần mở hoặc gia hạn, không auto accept/close'),
    ('extension', 'Chưa nghiệm thu, không vụ mở', 'newDueAt tăng hợp lệ', 'Lưu old/new deadline + reason/actor, không reset mất lịch sử'),
    ('multiple-complaints', 'Hai complaint mở', 'Chỉ apply một kết quả', 'Vẫn PAUSED, chưa mở payment/acceptance'),
    ('proposal-not-acceptance', 'Customer đồng ý resolution proposal', 'Chưa Manager apply', 'AGREED + pendingAdjustment, chưa nghiệm thu hoặc giảm tiền'),
    ('proposal-rejected', 'Customer REJECT hoặc gửi proposalVersion cũ', 'Decision', 'Giữ/mở complaint; không giả đồng ý'),
    ('apply-once', 'Proposal/decision đã áp dụng', 'Apply key khác', 'Không cộng adjustment hoặc mở deadline hai lần'),
    ('dispute-basis', 'Manager ghi CUSTOMER_AGREEMENT nhưng không có consent/bằng chứng', 'Record decision', 'INVALID_DECISION_BASIS, không giả khách chấp thuận'),
    ('waiver-limits', 'Còn yêu cầu bồi thường chưa giải quyết', 'COMPANY_WAIVER', 'Không dùng miễn nợ để phủ nhận khiếu nại; không ghi tiền đã nhận'),
    ('close-after-dispute', 'Quyết định hợp lệ CLOSE_AFTER_DISPUTE đã APPLIED', 'Chưa ACCEPTED', 'NOT_REQUIRED_BY_DISPUTE, không acceptedAt giả; tài chính vẫn phải đủ'),
    ('zero-balance', 'Outstanding=0', 'Customer tạo payment session', 'Không tạo session tiền 0; kiểm nghĩa vụ khác để READY_TO_CLOSE'),
    ('client-amount', 'Client gửi amount hoặc browser Return success', 'Payment', 'Không nhận amount client, không ghi VERIFIED từ Return'),
    ('ipn-validation', 'Sai checksum/merchant/reference/amount/currency', 'Gateway IPN', 'Không ghi verified money; đối soát theo payment protocol'),
    ('ipn-repeated', 'Callback hợp lệ lặp/đồng thời', 'IPN', 'Ghi tiền một lần, cập nhật invoice/aftercare atomically'),
    ('late-payment', 'Phiên hết hạn/đổi invoice/dispute/closed', 'Tiền thật callback tới muộn', 'Ghi nhận một lần và tạo reconciliation/refund, không bỏ tiền hoặc tự reopen/close'),
    ('refund-proof', 'Có refund obligation', 'Manager ghi reference/bằng chứng', 'Chỉ VERIFIED sau kiểm chứng; không API chuyển tiền, không amount tùy ý'),
    ('close-normal', 'Bàn giao, ACCEPTED, hết nợ/hoàn/vụ mở/đối soát', 'Manager close NORMAL', 'CLOSED một lần; closure snapshot/history'),
    ('close-blocked', 'Pending payment/refund/adjustment hoặc complaint/dispute', 'Manager close', '409 CLOSURE_BLOCKED và blocker cụ thể'),
    ('termination-before-handover', 'Flow5 kết thúc sớm chưa có handover hợp lệ', 'Gọi aftercare normal để thanh toán/đóng', 'Không tạo handover giả; extension pre-handover settlement riêng phải có capability'),
    ('file-safety', 'File Trip khác/giả MIME/quá 10MiB', 'Upload/download/link', '404/400/415/413, không gắn file'),
    ('transaction-rollback', 'Lỗi ghi audit/outbox/ledger', 'Mutation commit', 'Rollback state và financial adjustment, retry an toàn'),
    ('unsupported', 'Backend/persistence/payment integration chưa triển khai', 'Mutation', '501 FEATURE_NOT_SUPPORTED, không mock success'),
]
dump(ROOT / 'flow6.examples.json', {
    'contractVersion': spec['info']['version'], 'status': 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS',
    'policyExampleIsNotFixedBusinessDecision': True,
    'handoverContext': example_for(ref('HandoverContext')), 'awaitingAcceptance': example_for(ref('Aftercare')),
    'acceptedAwaitingPayment': response_example('acceptDelivery', ref('Aftercare')),
    'normalClosure': response_example('closeRequest', ref('Aftercare')),
    'scenarios': [{'id': a, 'given': b, 'when': c, 'then': d} for a,b,c,d in scenario_rows],
})
print(f'Generated Flow 6: {len(operations)} operations, {len(S)} DTO schemas, examples, frontend mirror and typed API.')
