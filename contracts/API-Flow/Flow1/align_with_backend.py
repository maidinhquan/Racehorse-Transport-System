"""Align Flow 1 response schemas with what the backend actually returns.

build_openapi.py infers schemas from the JSON examples in FLOW1-API-JSON.md, which cannot express
nullable legacy columns or every backend field. This step runs automatically at the end of
build_openapi.py; it can also be run by hand:  python align_with_backend.py <flow1.openapi.json> [...]
Idempotent. Only response schemas (names not ending in 'Request') are changed.
Source of truth for each rule is the backend code named in the comments
(RequestMapper, PaymentService.View, NotificationService, GeocodeCandidate, ContractService, ...).
After rebuilding, copy flow1.openapi.json to frontend/src/contracts/flow1.openapi.json."""
import json, sys

def nullable(s):
    """Allow null on a leaf schema (keeps enum/pattern for non-null values)."""
    if 'anyOf' in s:
        if not any(x.get('type') == 'null' for x in s['anyOf']): s['anyOf'].append({'type': 'null'})
        return
    t = s.get('type')
    if isinstance(t, list):
        if 'null' not in t: t.append('null')
    elif t is not None and t != 'null':
        if 'enum' in s or 'pattern' in s or 'const' in s:
            inner = {k: v for k, v in s.items()}
            s.clear(); s['anyOf'] = [inner, {'type': 'null'}]
        else:
            s['type'] = [t, 'null']

def optional(obj, *keys):
    obj['required'] = [r for r in obj.get('required', []) if r not in keys]

def objects(node):
    """Yield every object schema with properties, recursively."""
    if isinstance(node, dict):
        if isinstance(node.get('properties'), dict): yield node
        for v in node.values(): yield from objects(v)
    elif isinstance(node, list):
        for v in node: yield from objects(v)

def data_of(S, name):
    for suffix in ('Response200', 'Response201'):
        if name + suffix in S: return S[name + suffix]['properties']['data']
    raise KeyError(name)

STR, NSTR, BOOL, INT, NUM = {'type': 'string'}, {'type': ['string', 'null']}, {'type': 'boolean'}, {'type': 'integer'}, {'type': 'number'}

def patch(d):
    # Work on an unshared deep copy: build_openapi.py reuses dicts between request and response schemas.
    fresh = json.loads(json.dumps(d)); d.clear(); d.update(fresh)
    S = d['components']['schemas']
    responses = {n: s for n, s in S.items() if not n.endswith('Request')}
    log = []
    for name, root in responses.items():
        for o in objects(root):
            p = o['properties']
            # Transport request view (RequestMapper): legacy rows may lack these columns.
            if {'pickup', 'delivery', 'origin', 'status'} <= p.keys():
                for k in ('originCountry', 'destinationCountry', 'mode'):
                    if k in p: nullable(p[k])
                for side in ('pickup', 'delivery'):
                    sp = p[side].get('properties', {})
                    for k in ('name', 'address', 'postal', 'contact', 'phone', 'notes', 'cityId', 'cityName', 'latitude', 'longitude'):
                        if k in sp: nullable(sp[k])
                # Manager's rejection reason (RequestMapper.rejectionReason).
                p.setdefault('rejectionReason', dict(NSTR))
                log.append(f'{name}: request view nullable fields')
            # Payment view (PaymentService.View / RequestDetailsService): contractId/versionNo not always sent; method nullable.
            if {'invoiceId', 'method', 'status', 'amount'} <= p.keys():
                optional(o, 'contractId', 'versionNo')
                for k in ('method', 'versionNo', 'currency'):
                    if k in p: nullable(p[k])
                p.setdefault('reviewReason', dict(NSTR))
                log.append(f'{name}: payment view')
            # Horse view: declared value can be "0".
            if {'microchip', 'passport', 'currency'} <= p.keys() and 'pattern' in p.get('value', {}).get('anyOf', [{}])[0]:
                p['value']['anyOf'][0]['pattern'] = r'^\d{1,12}$'
            elif {'microchip', 'passport', 'currency'} <= p.keys() and 'pattern' in p.get('value', {}):
                p['value']['pattern'] = r'^\d{1,12}$'

    # Notifications (NotificationService.ListAsync) — same shape for customer and manager.
    notification = {'type': 'object', 'additionalProperties': True,
        'properties': {'id': dict(STR), 'referenceId': dict(NSTR), 'type': dict(NSTR), 'title': dict(NSTR),
                       'body': dict(NSTR), 'at': dict(STR), 'read': dict(BOOL), 'link': dict(NSTR)},
        'required': ['id', 'at', 'read']}
    for n in ('F1-J03', 'F1-J07'):
        data_of(S, n)['items'] = json.loads(json.dumps(notification)); log.append(f'{n}: notification shape')

    # Location search (GeocodeCandidate): provider metadata is returned too.
    item = data_of(S, 'F1-J10')['items']
    item['additionalProperties'] = True; item['properties']['point']['additionalProperties'] = True
    for k, v in (('mayPersist', BOOL), ('attribution', NSTR), ('provider', NSTR), ('previewProvider', NSTR)):
        item['properties'].setdefault(k, dict(v))
    log.append('F1-J10: allow provider metadata')

    def replace(n, props, required):
        data = data_of(S, n); data.clear()
        data.update({'type': 'object', 'additionalProperties': True, 'properties': props, 'required': required}); log.append(f'{n}: backend shape')

    replace('F1-J31', {'requestId': dict(STR), 'deleted': dict(BOOL)}, ['requestId', 'deleted'])
    replace('F1-J38', {'requestId': dict(STR), 'contractId': dict(STR), 'versionNo': dict(INT), 'status': dict(STR), 'feedback': dict(NSTR)},
            ['requestId', 'contractId', 'versionNo', 'status'])
    replace('F1-J39', {'contractId': dict(STR), 'versionNo': dict(INT), 'decision': dict(STR), 'requestStatus': dict(STR)},
            ['contractId', 'versionNo', 'decision', 'requestStatus'])
    cancellation = {'requestId': dict(STR), 'status': dict(STR), 'reason': dict(NSTR), 'requestedAt': dict(NSTR), 'previousStatus': dict(NSTR)}
    for n in ('F1-J52', 'F1-J53', 'F1-J54'):
        replace(n, json.loads(json.dumps(cancellation)), ['requestId', 'status'])
    replace('F1-J55', {'contractId': dict(STR), 'refundStatus': dict(NSTR), 'statusOnly': dict(BOOL)}, ['contractId'])

    j40 = data_of(S, 'F1-J40')['properties']
    for k in ('reason', 'by', 'at'): nullable(j40[k])
    nullable(data_of(S, 'F1-J41')['properties']['versionNo'])
    j51 = data_of(S, 'F1-J51')['properties']
    j51['requestStatus'] = dict(STR); j51['versionStatus'] = dict(NSTR); nullable(j51['signedAt'])

    j61 = data_of(S, 'F1-J61')
    j61['additionalProperties'] = True
    costs = j61['properties']['costs']; costs['additionalProperties'] = True
    for k in costs['properties']: costs['properties'][k] = dict(NUM)
    j61['properties']['roadDistanceKm'] = dict(NUM)
    j61['properties']['insuredValueVnd'] = {'type': ['number', 'null']}
    log.append('F1-J61: decimal costs')
    # Contracts defer the operational transport mode until Flow 3. Historic versions can still contain a mode.
    request = S['F1-J30Request']
    request['properties']['mode'] = {'type': 'null'}
    optional(request, 'mode')
    for root in responses.values():
        for o in objects(root):
            p = o['properties']
            if {'versionNo', 'snapshot', 'contractId'} <= p.keys():
                if 'mode' in p: nullable(p['mode'])
                p['modeDeferred'] = dict(BOOL)
            if {'departureAtUtc', 'deliveryAtUtc', 'mode'} <= p.keys():
                nullable(p['mode'])
                p['transportModeDecision'] = dict(STR)
            if {'preparationDays', 'defaultDepositPct', 'contractDeadlineHours'} <= p.keys():
                optional(o, 'selectedRoute')
    editor = d['paths']['/manager/requests/{requestId}/contract-editor']['get']
    editor['parameters'] = [p for p in editor.get('parameters', []) if p.get('name') != 'mode']
    media = d['paths']['/manager/requests/{requestId}/contract-draft']['put']['requestBody']['content']['application/json']
    media.get('example', {}).pop('mode', None)
    for ex in media.get('examples', {}).values(): ex.get('value', {}).pop('mode', None)
    log.append('Contracts: transport mode deferred to Flow 3')

    # Program.cs serializes with JsonIgnoreCondition.WhenWritingNull: a null value is OMITTED, not sent as null.
    # So in responses every nullable property must also be optional.
    def allows_null(v):
        t = v.get('type')
        return t == 'null' or (isinstance(t, list) and 'null' in t) or any(x.get('type') == 'null' for x in v.get('anyOf', []))
    for name, root in responses.items():
        for o in objects(root):
            nullables = [k for k, v in o['properties'].items() if isinstance(v, dict) and allows_null(v)]
            if nullables and o.get('required'): optional(o, *nullables)
    # Error envelopes (ApiResponse.Fail): errorCode/errors/data are omitted when null.
    import re
    for name, sch in responses.items():
        if re.search(r'Response[45]\d\d$', name) and sch.get('type') == 'object':
            sch['required'] = [r for r in sch.get('required', []) if r in ('success', 'message')]
            sch['additionalProperties'] = True
            props = sch.setdefault('properties', {})
            for k in ('errorCode', 'data'):
                if k in props: nullable(props[k])
            log.append(f'{name}: error envelope')
    for k in ('errorCode',):
        if k in S.get('Error', {}).get('properties', {}): nullable(S['Error']['properties'][k])

    # Examples must show the backend shapes (they feed FLOW1-API-JSON.md docs and contract:check).
    examples = {
        'F1-J31': [{'requestId': 'REQUEST_002', 'deleted': True}],
        'F1-J38': [{'requestId': 'REQUEST_002', 'contractId': 'CONTRACT_002', 'versionNo': 1, 'status': 'CONTRACT_CHANGES_REQUESTED',
                    'feedback': 'Xin dời ngày vận chuyển sang 20/11.'}],
        'F1-J52': [{'requestId': 'REQUEST_002', 'status': 'CANCELLED', 'reason': 'Khách đổi kế hoạch.', 'requestedAt': None, 'previousStatus': 'PENDING_REVIEW'},
                   {'requestId': 'REQUEST_002', 'status': 'CANCELLATION_REQUESTED', 'reason': 'Khách đổi kế hoạch.',
                    'requestedAt': '2026-10-29T05:00:00Z', 'previousStatus': 'CONTRACT_READY'}],
        'F1-J53': [{'requestId': 'REQUEST_002', 'status': 'CANCELLED', 'reason': 'Không liên hệ được khách.', 'requestedAt': None, 'previousStatus': 'PENDING_REVIEW'}],
        'F1-J54': [{'requestId': 'REQUEST_002', 'status': 'CANCELLED', 'reason': 'Khách đổi kế hoạch.', 'requestedAt': '2026-10-29T05:00:00Z', 'previousStatus': 'CONTRACT_READY'},
                   {'requestId': 'REQUEST_002', 'status': 'CONTRACT_READY', 'reason': None, 'requestedAt': None, 'previousStatus': None}],
    }
    for path_item in d['paths'].values():
        for op in path_item.values():
            if not isinstance(op, dict) or op.get('operationId') not in examples: continue
            for status, resp in op['responses'].items():
                media = resp.get('content', {}).get('application/json')
                if not media or 'examples' not in media: continue
                if status not in ('200', '201'):
                    # Error responses carry data: null (repairs an earlier run that overwrote them).
                    for ex in media['examples'].values():
                        if isinstance(ex['value'].get('data'), dict) and ex['value'].get('success') is False: ex['value']['data'] = None
                    continue
                vals = examples[op['operationId']]
                for i, key in enumerate(list(media['examples'])):
                    media['examples'][key]['value']['data'] = vals[min(i, len(vals) - 1)]
                log.append(f"{op['operationId']}: examples updated")
    return log

if __name__ == '__main__':
  for path in sys.argv[1:]:
    d = json.load(open(path, encoding='utf-8'))
    log = patch(d)
    open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print(path, len(log), 'changes'); print('  ' + '\n  '.join(sorted(set(log))))
