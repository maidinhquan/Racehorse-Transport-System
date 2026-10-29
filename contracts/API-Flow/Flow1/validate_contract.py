"""Read-only validation: python contracts/API-Flow/Flow1/validate_contract.py"""
import json, re
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT = Path(__file__).resolve().parent
spec = json.loads((ROOT / 'flow1.openapi.json').read_text(encoding='utf-8'))
main = (ROOT / 'FLOW1.md').read_text(encoding='utf-8')
companion = (ROOT / 'FLOW1-API-JSON.md').read_text(encoding='utf-8')
schemas = spec['components']['schemas']
ops = {v['operationId']: v for p in spec['paths'].values() for k,v in p.items() if k in ['get','post','put','delete','patch']}
assert len(ops) == 65 and 'F1-J47' not in ops and 'F1-J48' not in ops and 'F1-J17' not in ops and 'F1-J20' not in ops
assert 'F1-J67' in ops and ops['F1-J67']['security'] == []
checked = 0
for path, methods in spec['paths'].items():
    for method, op in methods.items():
        heading = f"### {op['operationId']} — {method.upper()} {path}"
        assert heading in main and heading in companion, heading
        content = [op.get('requestBody', {}).get('content', {})] + [v.get('content', {}) for v in op['responses'].values()]
        for media in content:
            for obj in media.values():
                schema = obj.get('schema', {})
                if '$ref' in schema: schema = schemas[schema['$ref'].split('/')[-1]]
                Draft202012Validator.check_schema(schema)
                samples = ([obj['example']] if 'example' in obj else []) + [v['value'] for v in obj.get('examples', {}).values()]
                for sample in samples:
                    Draft202012Validator(schema).validate(sample)
                    checked += 1
pattern = r'^### (F1-J\d+) — [^\n]+\n.*?(?=^### F1-J|^## |^<!-- FLOW1_JSON_\d+_END -->|\Z)'
blocks = lambda t: {m[1]: m[0].strip() for m in re.finditer(pattern, t, re.M | re.S)}
assert blocks(main) == blocks(companion), 'Markdown endpoint drift'
for text in [main, companion]:
    assert 'BANK_TRANSFER' not in text and '{kind}' not in text
for verb in ['post','get']:
    op = spec['paths']['/customer/horses/{horseId}/files/{fileType}'][verb]
    param = next(p for p in op['parameters'] if p['name'] == 'fileType')
    assert param['schema']['enum'] == ['photo','passport','ownership','value-proof']
assert all(not p['required'] for p in ops['F1-J09']['parameters'])
assert any(p['name']=='Idempotency-Key' and p['required'] for p in ops['F1-J18']['parameters'])
place = schemas['F1-J19Request']['properties']['pickup']
assert place['properties']['phone']['maxLength'] == 20
v = Draft202012Validator(place)
base = {k: '' for k in place['required']}
assert v.is_valid(base)
assert not v.is_valid(dict(base, latitude=10))
assert v.is_valid(dict(base, latitude=10, longitude=106))
for name in ['F1-J40','F1-J52','F1-J53','F1-J54','F1-J59']:
    assert schemas[name+'Request']['properties']['reason']['maxLength'] == 1000
assert not ops['F1-J55'].get('requestBody')
assert schemas['F1-J43Request']['properties']['method']['enum'] == ['VNPAY']
sql_path = ROOT.parents[2] / 'data/HorseTransportDB_Reviewed.sql'
if not sql_path.exists():
    sql_path = ROOT.parents[2] / 'HorseTransportDB/HorseTransportDB_Reviewed.sql'
sql = sql_path.read_text(encoding='utf-8')
assert 'BANK_TRANSFER' not in sql
for marker in ['CK_Payment_Method','CK_Payment_Status','CancellationPreviousStatus','RevisionFeedback','TermsAcceptedAtUtc','ContentSnapshot NVARCHAR(MAX) NOT NULL']:
    assert marker in sql, marker
assert sql.count("N'DEMO_VNPAY_") == 4
print(f'PASS: {len(ops)} operations, {checked} examples; Markdown parity, negative parameters, SQL scope and lifecycle metadata.')
