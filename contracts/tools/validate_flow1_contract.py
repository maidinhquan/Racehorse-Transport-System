"""Offline structural and example checks. Not a complete OpenAPI conformance validator."""
import json
import re
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / 'API-Flow/flow1.openapi.json').read_text(encoding='utf-8'))
errors = []

def check(condition, message):
    if not condition:
        errors.append(message)

def resolve(pointer):
    check(pointer.startswith('#/'), f'Nonlocal ref: {pointer}')
    value = spec
    for key in pointer[2:].split('/'):
        value = value[key.replace('~1', '/').replace('~0', '~')]
    return value

def walk(value, path='$'):
    if isinstance(value, dict):
        if '$ref' in value:
            try:
                resolve(value['$ref'])
            except (KeyError, TypeError):
                errors.append(f'{path}: unresolved {value["$ref"]}')
            check(len(value) == 1, f'{path}: OAS 3.0 ignores $ref siblings')
        if value.get('type') == 'object' and 'properties' in value:
            check(set(value.get('required', [])) <= value['properties'].keys(), f'{path}: required property missing')
        for k, v in value.items():
            walk(v, f'{path}.{k}')
    elif isinstance(value, list):
        for i, v in enumerate(value):
            walk(v, f'{path}[{i}]')

def matches(value, schema, path):
    if '$ref' in schema:
        return matches(value, resolve(schema['$ref']), path)
    if value is None and schema.get('nullable'):
        return
    for item in schema.get('allOf', []):
        matches(value, item, path)
    typ = schema.get('type')
    valid_type = {
        'object': isinstance(value, dict), 'array': isinstance(value, list),
        'string': isinstance(value, str), 'boolean': isinstance(value, bool),
        'integer': isinstance(value, int) and not isinstance(value, bool),
        'number': isinstance(value, (float, int)) and not isinstance(value, bool),
    }.get(typ, True)
    check(valid_type, f'{path}: expected {typ}, got {type(value).__name__}')
    if not valid_type:
        return
    if 'enum' in schema:
        check(value in schema['enum'], f'{path}: outside enum')
    if isinstance(value, dict):
        check(set(schema.get('required', [])) <= value.keys(), f'{path}: missing required fields')
        check(len(value) >= schema.get('minProperties', 0), f'{path}: too few properties')
        if schema.get('additionalProperties') is False:
            check(value.keys() <= schema.get('properties', {}).keys(), f'{path}: extra fields')
        for key, field in schema.get('properties', {}).items():
            if key in value:
                matches(value[key], field, f'{path}.{key}')
    elif isinstance(value, list):
        check(len(value) >= schema.get('minItems', 0), f'{path}: too few items')
        check(len(value) <= schema.get('maxItems', float('inf')), f'{path}: too many items')
        if schema.get('uniqueItems'):
            check(len({json.dumps(v, sort_keys=True) for v in value}) == len(value), f'{path}: duplicate items')
        for i, item in enumerate(value):
            matches(item, schema['items'], f'{path}[{i}]')
    elif isinstance(value, str):
        check(len(value) >= schema.get('minLength', 0), f'{path}: too short')
        if 'pattern' in schema:
            check(re.search(schema['pattern'], value) is not None, f'{path}: pattern mismatch')
        try:
            if schema.get('format') == 'date':
                check(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', value)), f'{path}: date format')
                date.fromisoformat(value)
            elif schema.get('format') == 'date-time':
                check(datetime.fromisoformat(value.replace('Z', '+00:00')).utcoffset() is not None, f'{path}: timezone required')
        except ValueError:
            errors.append(f'{path}: invalid {schema.get("format")}')
    elif isinstance(value, (float, int)) and not isinstance(value, bool):
        if 'minimum' in schema:
            check(value > schema['minimum'] if schema.get('exclusiveMinimum') else value >= schema['minimum'], f'{path}: below minimum')
        if 'maximum' in schema:
            check(value <= schema['maximum'], f'{path}: above maximum')

check(spec.get('openapi') == '3.0.3', 'Expected OpenAPI 3.0.3')
walk(spec)
ids = set()
operations = 0
examples = 0
for path, methods in spec['paths'].items():
    check(path.startswith('/') and not path.startswith('/api/'), f'Duplicate base URL: {path}')
    for method, operation in methods.items():
        operations += 1
        label = f'{method.upper()} {path}'
        check(operation['operationId'] not in ids, f'{label}: duplicate operationId')
        ids.add(operation['operationId'])
        params = operation.get('parameters', [])
        actual = {p['name'] for p in params if p['in'] == 'path' and p.get('required')}
        check(actual == set(re.findall(r'\{(\w+)\}', path)), f'{label}: path parameters mismatch')
        check(len({(p['in'],p['name']) for p in params}) == len(params), f'{label}: duplicate parameters')
        is_public = path.startswith('/public/')
        check(operation['security'] == ([] if is_public else [{'bearerAuth': []}]), f'{label}: security mismatch')
        check(any(k in operation['responses'] for k in ('200','201')), f'{label}: success response missing')
        check(operation.get('x-source-id'), f'{label}: source ID missing')
        check(operation.get('x-implementation-status') == 'NOT_IMPLEMENTED', f'{label}: review implementation evidence')
        contents = [operation.get('requestBody', {})]
        contents.extend(operation['responses'].values())
        for content in contents:
            for mime, media in content.get('content', {}).items():
                if 'example' in media:
                    examples += 1
                    matches(media['example'], media['schema'], label + ':' + mime)

inventory = (ROOT / 'API-Flow/flow1-endpoints.md').read_text(encoding='utf-8')
check(len([line for line in inventory.splitlines() if line.startswith('| F01-')]) == operations, 'Inventory operation count mismatch')
for path, methods in spec['paths'].items():
    for method in methods:
        check(f'| {method.upper()} | `{path}` |' in inventory, f'Missing inventory entry {method} {path}')

# Schema invariants and negative fixtures check type/trust boundaries.
create_schema = resolve(spec['paths']['/customer/requests']['post']['requestBody']['content']['application/json']['schema']['$ref'])
check(create_schema['additionalProperties'] is False, 'Create request must reject customerId/status/price injection')
check(create_schema['properties']['horseIds']['items']['type'] == 'string', 'Horse IDs must stay strings')
online_schema = spec['components']['schemas']['OnlinePaymentInput']
check(set(online_schema['properties']) == {'receivableId'} and online_schema['additionalProperties'] is False, 'Online payment must not trust FE amount/currency/return URL')
check('CONFIRMED' in spec['components']['schemas']['DeploymentStatus']['enum'], 'Deployment state missing')
check('ON_HOLD' not in spec['components']['schemas']['TripStatus']['enum'], 'Deployment must not invent TripStatus.ON_HOLD')
check(not any('/quotes/' in path or path.endswith('/activate') for path in spec['paths']), 'Legacy Quote acceptance or FE activation endpoint present')

negative_fixtures = 0
def must_reject(value, schema, label):
    global negative_fixtures
    start = len(errors)
    matches(value, schema, label)
    rejected = len(errors) > start
    del errors[start:]
    check(rejected, f'Negative fixture accepted: {label}')
    negative_fixtures += 1

valid_request = spec['paths']['/customer/requests']['post']['requestBody']['content']['application/json']['example']
for field, value in [('customerId','OTHER_USER'), ('status','ACTIVATED'), ('totalAmount',1)]:
    invalid = dict(valid_request, **{field:value})
    must_reject(invalid, create_schema, 'untrusted ' + field)
for value in [[], [31], ['HORSE_031','HORSE_031']]:
    must_reject(dict(valid_request, horseIds=value), create_schema, 'invalid horseIds')
missing_contact = deepcopy(valid_request)
del missing_contact['pickupContact']['phone']
must_reject(missing_contact, create_schema, 'missing pickup phone')
must_reject({'receivableId':'RCV_201','amount':1}, online_schema, 'untrusted payment amount')
must_reject({'otp':'123'}, spec['components']['schemas']['SignInput'], 'short OTP')

# Local Markdown links in the new entry documents must resolve in the repo.
for filename in ['FLOW1-INTEGRATION.md','flow1-endpoints.md']:
    doc_path = ROOT / 'API-Flow' / filename
    for target in re.findall(r'\]\(([^)]+)\)', doc_path.read_text(encoding='utf-8')):
        if '://' not in target and not target.startswith('#'):
            check((doc_path.parent / target.split('#',1)[0]).exists(), f'{filename}: broken link {target}')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(spec["paths"])} paths, {operations} operations, {len(spec["components"]["schemas"])} schemas, {examples} inline examples, {negative_fixtures} negative fixtures; refs, IDs, params, auth, inventory, local links and key invariants checked.')
print('Scope: offline structural checks only; no full OpenAPI validator, running API, DB, provider or UAT verification.')
