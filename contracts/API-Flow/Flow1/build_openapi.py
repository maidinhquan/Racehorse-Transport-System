"""Build the Flow 1 wire schema and validate example coverage. No DB/backend writes.
Run: python contracts/API-Flow/Flow1/build_openapi.py
"""
from pathlib import Path
import json, re, copy

ROOT = Path(__file__).resolve().parent
source = (ROOT / 'FLOW1-API-JSON.md').read_text(encoding='utf-8')
blocks = re.findall(r'^### (F1-J\d+) — (\w+) ([^\n]+)\n(.*?)(?=^### F1-J|^## |\Z)', source, re.M | re.S)
assert len(blocks) == 64, f"Expected 64 blocks, got {len(blocks)}"
assert not any(op[0] in ['F1-J47', 'F1-J48', 'F1-J17', 'F1-J20'] for op in blocks)

str_type = {'type': 'string'}
num_type = {'type': 'number'}
int_type = {'type': 'integer'}
bool_type = {'type': 'boolean'}

def nullable(s):
    return {'anyOf': [copy.deepcopy(s), {'type': 'null'}]}

def obj(properties, required=None, additionalProperties=True):
    return {
        'type': 'object',
        'properties': properties,
        'required': required if required is not None else [],
        'additionalProperties': additionalProperties
    }

def arr(items):
    return {'type': 'array', 'items': items}

def schema(values, key='', request=False):
    kinds = {('null' if v is None else 'boolean' if isinstance(v,bool) else 'integer' if isinstance(v,int) else 'number' if isinstance(v,float) else 'string' if isinstance(v,str) else 'array' if isinstance(v,list) else 'object') for v in values}
    if len(kinds) > 1:
        return {'anyOf': [schema([v for v in values if ('null' if v is None else 'boolean' if isinstance(v,bool) else 'integer' if isinstance(v,int) else 'number' if isinstance(v,float) else 'string' if isinstance(v,str) else 'array' if isinstance(v,list) else 'object')==t], key, request) for t in sorted(kinds)]}
    kind = next(iter(kinds))
    out = {'type': kind}
    if kind == 'object':
        keys = set().union(*(v.keys() for v in values))
        required = set(values[0]).intersection(*(v.keys() for v in values))
        if key in ['horseNotes', 'errors']:
            out['additionalProperties'] = {'type': 'string'} if key == 'horseNotes' else {'type': 'array', 'items': {'type': 'string'}}
            return out
        out['properties'] = {k: schema([v[k] for v in values if k in v], k, request) for k in sorted(keys)}
        out['required'] = sorted(required)
        out['additionalProperties'] = False
        if 'id' in keys:
            prefixes = {re.match(r'^([A-Z_]+)_\d{3,}$', v['id'])[1] for v in values if isinstance(v.get('id'), str) and re.match(r'^([A-Z_]+)_\d{3,}$', v['id'])}
            if prefixes:
                out['properties']['id'] = {'type': 'string', 'maxLength': 50, 'pattern': '^(?:' + '|'.join(sorted(prefixes)) + r')_\d{3,}$'}
    elif kind == 'array':
        entries = [x for v in values for x in v]
        out['items'] = schema(entries, key + '[]', request) if entries else {}
        if key == 'horses': out['uniqueItems'] = True
        if key == 'horses' and all(isinstance(x, str) for x in entries):
            out['maxItems'] = 6
            out['items'] = {'type': 'string', 'pattern': r'^HORSE_\d{3,}$'}
        if key == 'unsupportedFields':
            out['items'] = {'type': 'string', 'enum': ['color', 'fluDate', 'vetName', 'vetPhone']}
            out['uniqueItems'] = True
    elif kind in ['integer', 'number']:
        if key not in ['latitude', 'longitude']:
            out.update(minimum=0, maximum=9007199254740991)
        if key in ['v', 'versionNo']: out.update(minimum=1)
        if key == 'depositPct' or key == 'defaultDepositPct': out.update(minimum=1, maximum=100)
        if key == 'latitude': out.update(minimum=-90, maximum=90)
        if key == 'longitude': out.update(minimum=-180, maximum=180)
    elif kind == 'string':
        if key == 'currency': out['const'] = 'VND'
        elif key == 'sex': out['enum'] = ['STALLION', 'MARE', 'GELDING']
        elif key in ['mode', 'transportMode']: out['enum'] = ['ROAD', 'AIR']
        elif key in ['originCountry', 'destinationCountry', 'countryCode']: out['enum'] = ['VN', 'JP']
        elif key == 'role': out['enum'] = ['CUSTOMER', 'LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_ROUTE_COORDINATOR', 'DRIVER_ESCORT', 'ADMIN', 'SYSTEM']
        elif key == 'microchip': out['pattern'] = r'^\d{15}$'
        elif key == 'value': out.update(pattern=r'^[1-9]\d{0,9}$', maxLength=10)
        elif key == 'otp': out['pattern'] = r'^\d{6}$'
        elif key in ['date', 'pickupAt', 'dob', 'issueDate', 'expiryDate', 'fluDate', 'expectedTransportDate', 'expectedDeliveryDate']:
            out['pattern'] = r'^(\d{4}-\d{2}-\d{2})?$'
        elif key.endswith('At') or key.endswith('Until') or key in ['at', 'from', 'to', 'plannedDepart', 'eta', 'readAt']:
            out['pattern'] = r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})?$'
        elif key == 'expiresAt': out['pattern'] = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
        if key in ['contractId', 'requestId', 'horseId', 'invoiceId', 'paymentId', 'tripId', 'notificationId', 'customerId', 'coordinatorId', 'specialistId']:
            prefix = {'customerId': 'USER', 'coordinatorId': 'USER', 'specialistId': 'USER'}.get(key, key[:-2].upper())
            out.update(pattern='^' + prefix + r'_\d{3,}$', maxLength=50)
        if key in ['name', 'breed']: out['maxLength'] = 100
        if key in ['text', 'feedback', 'reason', 'note', 'conditions', 'careNotes', 'careInstructions', 'exception', 'commercial', 'proposedNotes', 'other']:
            out['maxLength'] = 2000
        if key in ['reference', 'transactionCode']: out.update(minLength=1, maxLength=100)
        if key == 'address': out['maxLength'] = 255
        if key in ['phone', 'vetPhone']: out['maxLength'] = 50
    return out

components = {}
operations = []
for opid, method, path, body in blocks:
    samples = []
    for match in re.finditer(r'```json\n(.*?)\n```', body, re.S):
        preceding = body[:match.start()]
        label = re.findall(r'\*\*([^*]+)\*\*', preceding)[-1] if '**' in preceding else ''
        value = json.loads(match[1])
        samples.append((label, value))
    req = [v for label, v in samples if label.startswith('Request JSON')]
    responses = {}
    for label, v in samples:
        if not label.startswith('Response'): continue
        code = re.search(r'\d{3}', label)[0]
        responses.setdefault(code, []).append(v)
    operations.append((opid, method, path, body, req, responses))
    if req: components[opid + 'Request'] = schema(req, request=True)
    for code, vals in responses.items(): components[opid + 'Response' + code] = schema(vals)

file_schema = obj({'name': str_type, 'url': str_type}, ['url'])
passport_schema = obj({
    'number': nullable(str_type),
    'authority': nullable(str_type),
    'issueDate': nullable({'type': 'string', 'pattern': r'^(\d{4}-\d{2}-\d{2})?$'}),
    'expiryDate': nullable({'type': 'string', 'pattern': r'^(\d{4}-\d{2}-\d{2})?$'}),
    'scan': nullable(file_schema)
}, [], True)

horse_view = obj({
    'id': {'type': 'string', 'pattern': r'^HORSE_\d{3,}$', 'maxLength': 50},
    'name': {'type': 'string', 'maxLength': 100},
    'breed': nullable({'type': 'string', 'maxLength': 100}),
    'sex': nullable({'type': 'string', 'enum': ['STALLION', 'MARE', 'GELDING']}),
    'dob': nullable({'type': 'string', 'pattern': r'^(\d{4}-\d{2}-\d{2})?$'}),
    'microchip': {'type': 'string', 'pattern': r'^\d{15}$'},
    'value': nullable({'type': 'string', 'pattern': r'^[1-9]\d{0,9}$', 'maxLength': 10}),
    'currency': {'const': 'VND'},
    'healthNotes': nullable({'type': 'string', 'maxLength': 2000}),
    'reproductiveStatus': nullable(str_type),
    'weight': nullable({'type': 'number', 'minimum': 0}),
    'passport': passport_schema,
    'photo': nullable(file_schema),
    'ownership': nullable(file_schema),
    'valueProof': nullable(file_schema)
}, ['id', 'name', 'microchip', 'currency', 'passport'], True)

contact_view = obj({
    'name': str_type,
    'address': str_type,
    'postal': str_type,
    'contact': str_type,
    'phone': {'type': 'string', 'maxLength': 20},
    'notes': str_type,
    'cityId': str_type,
    'cityName': str_type,
    'latitude': {'type': 'number', 'minimum': -90, 'maximum': 90},
    'longitude': {'type': 'number', 'minimum': -180, 'maximum': 180}
}, [], True)

contract_item = obj({
    'desc': str_type,
    'amount': {'type': 'number', 'minimum': 0},
    'required': bool_type
}, ['desc', 'amount'], True)

contract_term = obj({'title': str_type, 'text': str_type}, ['title', 'text'], True)

contract_view = obj({
    'contractId': {'type': 'string', 'pattern': r'^CONTRACT_\d{3,}$', 'maxLength': 50},
    'requestId': {'type': 'string', 'pattern': r'^REQUEST_\d{3,}$', 'maxLength': 50},
    'versionNo': {'type': 'integer', 'minimum': 1},
    'requestStatus': str_type,
    'contractStatus': str_type,
    'versionStatus': str_type,
    'currentDeadline': nullable(str_type),
    'issuedAt': nullable(str_type),
    'signedAt': nullable(str_type),
    'termsAcceptedAt': nullable(str_type),
    'items': nullable(arr(contract_item)),
    'total': nullable({'type': 'number', 'minimum': 0}),
    'depositPct': nullable({'type': 'number', 'minimum': 1, 'maximum': 100}),
    'depositAmount': nullable({'type': 'number', 'minimum': 0}),
    'terms': nullable(arr(contract_term)),
    'mode': nullable({'type': 'string', 'enum': ['ROAD', 'AIR']}),
    'departAt': nullable(str_type),
    'arriveAt': nullable(str_type),
    'snapshot': {'type': 'object'},
    'pdfUrl': nullable(str_type),
    'note': nullable(str_type)
}, ['contractId', 'requestId', 'versionNo', 'contractStatus', 'versionStatus'], True)

payment_view = obj({
    'id': str_type,
    'paymentId': str_type,
    'invoiceId': str_type,
    'contractId': str_type,
    'versionNo': {'type': 'integer', 'minimum': 1},
    'amount': {'type': 'number', 'minimum': 0},
    'currency': str_type,
    'method': str_type,
    'status': str_type,
    'databaseStatus': str_type,
    'receivedAmount': nullable({'type': 'number', 'minimum': 0}),
    'paidAt': nullable(str_type),
    'reviewRequired': bool_type
}, ['id', 'invoiceId', 'contractId', 'versionNo', 'amount', 'method', 'status'], True)

request_view = obj({
    'id': {'type': 'string', 'pattern': r'^REQUEST_\d{3,}$', 'maxLength': 50},
    'customerId': {'type': 'string', 'pattern': r'^USER_\d{3,}$', 'maxLength': 50},
    'origin': str_type,
    'destination': str_type,
    'originCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'destinationCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'mode': {'type': 'string', 'enum': ['ROAD', 'AIR']},
    'expectedTransportDate': nullable({'type': 'string', 'pattern': r'^(\d{4}-\d{2}-\d{2})?$'}),
    'expectedDeliveryDate': nullable({'type': 'string', 'pattern': r'^(\d{4}-\d{2}-\d{2})?$'}),
    'status': str_type,
    'careInstructions': nullable(str_type),
    'horses': arr({'type': 'string', 'pattern': r'^HORSE_\d{3,}$'}),
    'horseCount': {'type': 'integer', 'minimum': 1},
    'horseNotes': {'type': 'object', 'additionalProperties': str_type},
    'pickup': contact_view,
    'delivery': contact_view,
    'versions': arr(contract_view),
    'payments': arr(payment_view),
    'docs': arr({'type': 'object'}),
    'dossier': arr({'type': 'object'}),
    'revisionFeedback': nullable(str_type),
    'createdAt': nullable(str_type)
}, ['id', 'customerId', 'origin', 'destination', 'status', 'horses', 'pickup', 'delivery'], True)

profile_view = obj({
    'id': {'type': 'string', 'pattern': r'^USER_\d{3,}$', 'maxLength': 50},
    'fullName': str_type,
    'email': nullable(str_type),
    'phone': nullable({'type': 'string', 'maxLength': 20}),
    'role': {'type': 'string', 'enum': ['CUSTOMER', 'LOGISTICS_MANAGER', 'TRANSPORT_SPECIALIST', 'FLEET_ROUTE_COORDINATOR', 'DRIVER_ESCORT', 'ADMIN', 'SYSTEM']},
    'username': nullable(str_type)
}, ['id', 'fullName'], True)

trip_view = obj({
    'id': str_type,
    'requestId': str_type,
    'status': str_type,
    'tripStatus': str_type,
    'mode': nullable({'type': 'string', 'enum': ['ROAD', 'AIR']}),
    'plannedDepart': nullable(str_type),
    'eta': nullable(str_type),
    'specialistId': nullable(str_type),
    'coordinatorId': nullable(str_type),
    'deployment': obj({
        'status': str_type,
        'eventId': nullable(str_type),
        'reason': nullable(str_type),
        'at': nullable(str_type)
    }, ['status'], True)
}, ['id', 'requestId', 'status', 'deployment'], True)

# Inputs
date_sch = {'type': 'string', 'pattern': r'^\d{4}-\d{2}-\d{2}$'}
passport_input = obj({
    'number': {'type': 'string', 'minLength': 1, 'maxLength': 50},
    'authority': {'type': 'string', 'minLength': 1, 'maxLength': 200},
    'issueDate': date_sch,
    'expiryDate': date_sch
}, ['number', 'authority', 'issueDate', 'expiryDate'], False)

horse_input = obj({
    'name': {'type': 'string', 'minLength': 1, 'maxLength': 100},
    'breed': {'type': 'string', 'minLength': 1, 'maxLength': 100},
    'sex': {'type': 'string', 'enum': ['STALLION', 'MARE', 'GELDING']},
    'dob': date_sch,
    'microchip': {'type': 'string', 'pattern': r'^\d{15}$'},
    'value': {'type': 'string', 'pattern': r'^[1-9]\d{0,9}$'},
    'currency': {'const': 'VND'},
    'passport': passport_input,
    'healthNotes': {'type': 'string', 'maxLength': 2000},
    'reproductiveStatus': nullable({'type': 'string', 'enum': ['INTACT', 'NOT_PREGNANT', 'PREGNANT', 'GELDED']}),
    'weight': nullable({'type': 'number', 'exclusiveMinimum': 0, 'maximum': 99999999.99})
}, ['name', 'breed', 'sex', 'dob', 'microchip', 'value', 'currency', 'passport', 'healthNotes'], False)

request_contact = obj({
    'name': str_type,
    'address': str_type,
    'postal': str_type,
    'contact': str_type,
    'phone': {'type': 'string', 'maxLength': 20},
    'notes': str_type,
    'cityId': str_type,
    'latitude': {'type': 'number', 'minimum': -90, 'maximum': 90},
    'longitude': {'type': 'number', 'minimum': -180, 'maximum': 180}
}, ['name', 'address', 'postal', 'contact', 'phone', 'notes', 'cityId'], False)
request_contact['allOf'] = [
    {'if': {'required': ['latitude']}, 'then': {'required': ['longitude']}},
    {'if': {'required': ['longitude']}, 'then': {'required': ['latitude']}}
]

request_input = obj({
    'origin': str_type,
    'destination': str_type,
    'originCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'destinationCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'mode': {'type': 'string', 'enum': ['ROAD', 'AIR']},
    'expectedTransportDate': date_sch,
    'expectedDeliveryDate': date_sch,
    'careInstructions': {'type': 'string', 'maxLength': 2000},
    'pickup': request_contact,
    'delivery': request_contact,
    'horses': {'type': 'array', 'items': {'type': 'string', 'pattern': r'^HORSE_\d{3,}$'}, 'minItems': 1, 'maxItems': 6, 'uniqueItems': True},
    'horseNotes': {'type': 'object', 'additionalProperties': {'type': 'string', 'maxLength': 2000}},
    'purpose': nullable({'type': 'string', 'maxLength': 1000})
}, ['origin', 'destination', 'originCountry', 'destinationCountry', 'mode', 'expectedTransportDate', 'expectedDeliveryDate', 'careInstructions', 'pickup', 'delivery', 'horses', 'horseNotes'], False)

components['F1-J12Request'] = horse_input
components['F1-J13Request'] = horse_input
components['F1-J18Request'] = request_input
components['F1-J19Request'] = request_input

def envelope(data_schema):
    return obj({
        'success': {'const': True},
        'message': str_type,
        'data': data_schema
    }, ['success', 'message', 'data'], True)

targets = {}
def use(ids, sc):
    for i in ids:
        targets[f"F1-J{i:02d}"] = sc

use([1], profile_view)
use([4], arr(profile_view))
use([2, 5], arr(horse_view))
use([11, 12, 13], horse_view)
use([18, 19, 22, 25, 26, 27, 28], request_view)
use([21, 24], arr(request_view))
use([33, 35], contract_view)
use([34], obj({'requestId': str_type, 'currentVersion': nullable(contract_view)}, ['requestId'], True))
use([6], arr(obj({'id': str_type, 'name': str_type, 'role': str_type, 'isActive': bool_type}, ['id', 'name', 'role', 'isActive'], True)))
use([14], arr(obj({
    'id': str_type,
    'name': str_type,
    'horse': horse_view,
    'selectable': bool_type,
    'conflict': nullable({'type': 'object'}),
    'documentWarnings': arr(str_type)
}, ['id', 'name', 'selectable', 'documentWarnings'], True)))
use([23], obj({
    'requestId': str_type,
    'horses': arr(obj({
        'horseId': str_type,
        'documents': arr({'type': 'object'}),
        'medical': arr({'type': 'object'})
    }, ['horseId', 'documents', 'medical'], True))
}, ['requestId', 'horses'], True))
use([29], obj({
    'request': request_view,
    'customer': {'type': 'object'},
    'horses': arr(horse_view),
    'draft': nullable(contract_view),
    'currentContract': nullable(contract_view),
    'versions': arr(contract_view),
    'defaults': {'type': 'object'},
    'internalCosts': arr({'type': 'object'})
}, ['request', 'customer', 'horses', 'versions', 'defaults'], True))
use([30], obj({
    'requestId': str_type,
    'contractId': str_type,
    'versionNo': int_type,
    'status': str_type,
    'savedAt': str_type
}, ['requestId', 'contractId', 'versionNo', 'status', 'savedAt'], True))
use([51], obj({
    'requestId': str_type,
    'contractId': str_type,
    'versionNo': int_type,
    'requestStatus': {'const': 'ACTIVATED'},
    'versionStatus': {'const': 'SIGNED'},
    'tripId': str_type,
    'tripStatus': {'const': 'PLANNING'},
    'signedAt': str_type
}, ['requestId', 'requestStatus', 'tripId', 'tripStatus', 'signedAt'], True))
use([56], arr(trip_view))
use([57, 58, 59, 60], trip_view)
use([44, 46], payment_view)
use([45], arr(payment_view))
use([42], obj({
    'requestId': str_type,
    'contractId': str_type,
    'versionNo': int_type,
    'invoiceId': str_type,
    'currency': str_type,
    'requiredAmount': num_type,
    'paidAmount': num_type,
    'remainingAmount': num_type,
    'canPay': bool_type,
    'validUntil': str_type,
    'transactions': arr(payment_view)
}, ['requestId', 'contractId', 'versionNo', 'invoiceId', 'canPay', 'transactions'], True))
use([40], obj({
    'contractId': str_type,
    'versionNo': int_type,
    'newDeadline': str_type,
    'reason': str_type,
    'by': str_type,
    'at': str_type
}, ['contractId', 'versionNo', 'newDeadline'], True))
use([41], obj({
    'contractId': str_type,
    'versionNo': int_type,
    'notificationId': str_type,
    'queued': bool_type
}, ['contractId', 'queued'], True))
use([63, 65], obj({'updated': int_type}, ['updated'], True))

for opid, target_schema in targets.items():
    if f"{opid}Response200" in components:
        components[f"{opid}Response200"] = envelope(target_schema)
    if f"{opid}Response201" in components:
        components[f"{opid}Response201"] = envelope(target_schema)

# F1-J09 Response 200 with oneOf
route_schema = obj({
    'id': str_type,
    'originCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'destinationCountry': {'type': 'string', 'enum': ['VN', 'JP']},
    'mode': {'type': 'string', 'enum': ['ROAD', 'AIR']}
}, ['id', 'originCountry', 'destinationCountry', 'mode'], True)

f1_j09_data = obj({
    'currency': {'const': 'VND'},
    'preparationDays': int_type,
    'defaultDepositPct': int_type,
    'contractDeadlineHours': int_type,
    'supportedRoutes': arr(route_schema),
    'selectedRoute': route_schema
}, ['currency', 'preparationDays', 'defaultDepositPct', 'contractDeadlineHours'], True)
f1_j09_data['oneOf'] = [
    {'required': ['supportedRoutes'], 'not': {'required': ['selectedRoute']}},
    {'required': ['selectedRoute'], 'not': {'required': ['supportedRoutes']}}
]
components['F1-J09Response200'] = envelope(f1_j09_data)

# F1-J68 (Locations-Cities)
components['F1-J68Response200'] = envelope(arr(obj({
    'cityId': str_type,
    'label': str_type,
    'countryCode': str_type
}, ['cityId', 'label', 'countryCode'], True)))

# Error schema
components['Error'] = obj({
    'success': {'const': False},
    'message': str_type,
    'errorCode': str_type,
    'data': {},
    'errors': {'type': 'object', 'additionalProperties': arr(str_type)}
}, ['success', 'message'], True)

# Mutations
for op, key, enum in [('F1-J39', 'decision', ['ACCEPTED', 'REJECTED']), ('F1-J54', 'decision', ['APPROVED', 'REJECTED']), ('F1-J43', 'method', ['VNPAY'])]:
    components[op + 'Request']['properties'][key] = {'type': 'string', 'enum': enum}
components['F1-J43Request']['description'] = 'Only VNPAY is supported; no manual confirmation or rejection.'
components['F1-J55Response200']['properties']['data']['properties']['refundStatus'] = {'const': 'COMPLETED'}
components['F1-J38Request']['properties']['text']['minLength'] = 10
components['F1-J27Request']['properties']['feedback'].update(minLength=10, maxLength=2000)
for op in ['F1-J52', 'F1-J53', 'F1-J54']:
    components[op + 'Request']['properties']['reason'].update(minLength=1, maxLength=1000)
components['F1-J28Request']['properties']['reason']['minLength'] = 10
for op in ['F1-J40', 'F1-J59']:
    components[op + 'Request']['properties']['reason'].update(minLength=1, maxLength=1000)

spec = {
    'openapi': '3.1.0',
    'info': {
        'title': 'Flow 1 — frontend contract',
        'version': '2.0.0',
        'description': 'Target interface aligned with backend.'
    },
    'servers': [{'url': '/api'}],
    'security': [{'bearerAuth': []}],
    'paths': {},
    'components': {
        'securitySchemes': {'bearerAuth': {'type': 'http', 'scheme': 'bearer'}},
        'schemas': components
    }
}

for opid, method, path, body, req, responses in operations:
    op = {'operationId': opid, 'summary': body.strip().splitlines()[0], 'x-implementation-status': 'aligned-with-backend', 'responses': {}, 'parameters': []}
    if opid in ['F1-J14', 'F1-J27', 'F1-J37', 'F1-J52', 'F1-J53', 'F1-J54', 'F1-J55']:
        rules = re.search(r'\*\*Quy tắc:\*\* ([^\n]+)', body)
        if rules: op['description'] = rules[1]
    for param in re.findall(r'{(\w+)}', path):
        sch = {'type': 'integer', 'minimum': 1} if param == 'versionNo' else {'type': 'string', 'maxLength': 50, 'pattern': r'^[A-Z_]+_\d{3,}$'}
        if param == 'fileType': sch = {'type': 'string', 'enum': ['photo', 'passport', 'ownership', 'value-proof']}
        if param == 'documentType': sch = {'type': 'string', 'enum': ['PASSPORT', 'OWNERSHIP', 'VALUATION', 'VACCINATION', 'HEALTH_CERTIFICATE']}
        op['parameters'].append({'name': param, 'in': 'path', 'required': True, 'schema': sch})
    if opid in ['F1-J09', 'F1-J10', 'F1-J14', 'F1-J29', 'F1-J68']:
        query = {
            'F1-J09': ['originCountry', 'destinationCountry', 'mode'],
            'F1-J10': ['q', 'country', 'cityId'],
            'F1-J14': ['expectedTransportDate', 'expectedDeliveryDate'],
            'F1-J29': ['mode'],
            'F1-J68': ['q', 'country']
        }[opid]
        for name in query:
            sch = {'type': 'string'}
            if name == 'mode': sch['enum'] = ['ROAD', 'AIR']
            if name in ['originCountry', 'destinationCountry', 'country']: sch['enum'] = ['VN', 'JP']
            if name == 'q': sch.update(minLength=2, maxLength=200)
            if name in ['expectedTransportDate', 'expectedDeliveryDate']: sch['pattern'] = r'^\d{4}-\d{2}-\d{2}$'
            req_param = (opid == 'F1-J10' and name == 'cityId') or (opid == 'F1-J14') or (opid == 'F1-J68')
            op['parameters'].append({'name': name, 'in': 'query', 'required': req_param, 'schema': sch})
    if opid == 'F1-J18':
        op['parameters'].append({'name': 'Idempotency-Key', 'in': 'header', 'required': True, 'schema': {'type': 'string', 'format': 'uuid'}})
    if req:
        op['requestBody'] = {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/' + opid + 'Request'}, 'example': req[0]}}}
    if opid == 'F1-J15':
        props = {'file': {'type': 'string', 'format': 'binary', 'description': 'Real bytes, <=10 MiB. PDF/JPEG/PNG; photo JPEG/PNG only.'}}
        op['requestBody'] = {'required': True, 'content': {'multipart/form-data': {'schema': {'type': 'object', 'properties': props, 'required': ['file'], 'additionalProperties': False}}}}
        op['parameters'][-1]['schema'] = {'type': 'string', 'enum': ['photo', 'passport', 'ownership', 'value-proof']}
    for code, vals in responses.items():
        op['responses'][code] = {'description': 'Success' if int(code) < 400 else 'Business error', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/' + opid + 'Response' + code}, 'examples': {f'case{i+1}': {'value': v} for i, v in enumerate(vals)}}}}
    if opid in ['F1-J16', 'F1-J36', 'F1-J49', 'F1-J66']:
        op['responses']['200'] = {'description': 'Authorized binary; errors remain JSON', 'content': {mime: {'schema': {'type': 'string', 'format': 'binary'}} for mime in (['application/pdf', 'image/jpeg', 'image/png'] if opid in ['F1-J16', 'F1-J66'] else ['application/pdf'])}}
    for code in ['400', '401', '403', '404', '409', '429', '500', '501']:
        op['responses'].setdefault(code, {'description': 'Shared error; 501 means capability not available', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/Error'}}}})
    if opid == 'F1-J67':
        op['security'] = []
        op['description'] = body.strip()
        op['parameters'] = [{'name': name, 'in': 'query', 'required': True, 'schema': {'type': 'string'}} for name in ['vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_ResponseCode', 'vnp_TransactionStatus', 'vnp_SecureHash']]
        op['responses'] = {'200': {'description': 'Provider acknowledgement; not application envelope', 'content': {'application/json': {'schema': {'type': 'object', 'required': ['RspCode', 'Message'], 'properties': {'RspCode': {'type': 'string', 'enum': ['00', '01', '02', '04', '97', '99']}, 'Message': {'type': 'string'}}, 'additionalProperties': False}, 'example': {'RspCode': '00', 'Message': 'Confirm Success'}}}}}
    spec['paths'].setdefault(path, {})[method.lower()] = op

# Response schemas inferred from examples are then aligned with the real backend responses.
from align_with_backend import patch as align_with_backend
align_with_backend(spec)

out = ROOT / 'flow1.openapi.json'
out.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'Built {len(operations)} operations, {len(components)} schemas at {out.name}')
