"""Read-only checks: schemas/examples/parity/negative cases/SQL mapping/source drift.
Requires Python package jsonschema. Does not execute SQL or call a provider.
"""
from pathlib import Path
import copy, hashlib, importlib.util, json, re, sys
sys.dont_write_bytecode=True
from jsonschema import Draft202012Validator, FormatChecker
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
def no_duplicates(pairs):
    out={}
    for k,v in pairs:
        assert k not in out, 'Duplicate JSON key: '+k
        out[k]=v
    return out
def read_json(path):return json.loads(path.read_text(encoding='utf-8'),object_pairs_hook=no_duplicates)
spec=read_json(ROOT/'flow6.openapi.json')
loader=importlib.util.spec_from_file_location('flow6_builder',ROOT/'build_openapi.py')
builder=importlib.util.module_from_spec(loader)
loader.loader.exec_module(builder)
assert builder.build()==spec, 'Generated OpenAPI drift; review source then regenerate.'
schemas=spec['components']['schemas']
def valid(schema,value):
    document=dict(schema,components={'schemas':schemas})
    return Draft202012Validator(document,format_checker=FormatChecker()).is_valid(value)
def check(schema,value):
    document=dict(schema,components={'schemas':schemas})
    Draft202012Validator(document,format_checker=FormatChecker()).validate(value)
def schema(n):return {'$ref':'#/components/schemas/'+n}
ops={}
examples=0
for path,methods in spec['paths'].items():
    for method,op in methods.items():
        assert method in ['get','post','put','delete','patch']
        assert op['operationId'] not in ops
        ops[op['operationId']]=op
        assert op['x-role'] and op['x-implementation-status']=='target-unverified'
        assert {p['name'] for p in op['parameters'] if p['in']=='path'}==set(re.findall(r'{(\w+)}',path))
        for p in op['parameters']:
            if p['in']=='path':assert p['required'] and p['schema']['pattern']
        if method=='get':assert 'requestBody' not in op
        assert op['responses']['401'] and op['responses']['404']
        contents=[op.get('requestBody',{}).get('content',{})]+[r.get('content',{}) for r in op['responses'].values()]
        for content in contents:
            for obj in content.values():
                if 'example' in obj:
                    check(obj['schema'],obj['example']);examples+=1
        if 'requestBody' in op:
            body=op['requestBody']['content']['application/json']
            for key in ['status','actorId','customerId','rowVersion','confirmedAmount']:
                assert not valid(body['schema'],dict(body['example'],**{key:'fake'})), (op['operationId'],key)
assert len(ops)==47
for n in ['F6-J11','F6-J19','F6-J29','F6-J34']:
    assert any(p['name']=='Idempotency-Key' and p['required'] for p in ops[n]['parameters'])
assert not any('confirm' in p and 'payment' in p for p in spec['paths'])
assert not any('accept-result' in p for p in spec['paths'])
for n,s in schemas.items():Draft202012Validator.check_schema(s)
for n,s in schemas.items():
    if n.startswith('F6-'):continue
    assert s['additionalProperties'] is False
    for k,v in s['properties'].items():
        assert v.get('description') and v.get('x-source'), (n,k,'undocumented field')
        assert k not in ['history','audit','rowVersion','contentHash','contractCode']
# Every generated Markdown block has exactly the request/success/error from explicit source.
md=(ROOT/'FLOW6-API-JSON.md').read_text(encoding='utf-8')
blocks={m[1]:m[2] for m in re.finditer(r'^## (F6-J\d+) — [^\n]+\n(.*?)(?=^## F6-J|\Z)',md,re.M|re.S)}
assert len(blocks)==len(ops)
for o in builder.OPS:
    b=blocks[o['id']]
    samples=[json.loads(m,object_pairs_hook=no_duplicates) for m in re.findall(r'```json\n(.*?)\n```',b,re.S)]
    if o['request']:assert samples.pop(0)==builder.example(builder.R(o['request']))
    if o['response']=='Binary':assert 'Content-Type: application/pdf' in b
    else:assert samples.pop(0)==builder.result(o)
    assert len(samples)==1 and samples[0]['errorCode']==o['error']
    check(schema('Error'),samples[0]);examples+=1
# Targeted negative checks beyond validating happy-path examples.
negative=0
def reject(n,v):
    global negative
    assert not valid(schema(n),v),(n,v)
    negative+=1
reject('OtpInput',{'otp':'12345X'})
reject('OtpInput',{'otp':'123456','revisionId':'HANDOVER_REVISION_001'})
reject('AdjustmentInput',dict(builder.example(builder.R('AdjustmentInput')),amountVnd=-1))
reject('AdjustmentInput',dict(builder.example(builder.R('AdjustmentInput')),amountVnd=1.5))
reject('AdjustmentInput',dict(builder.example(builder.R('AdjustmentInput')),type='APPROVED'))
reject('AdjustmentInput',dict(builder.example(builder.R('AdjustmentInput')),Bearer='CUSTOMER'))
reject('FeedbackInput',{'rating':0})
reject('FeedbackInput',{'rating':6})
reject('Receiver',dict(builder.example(builder.R('Receiver')),phone='1'*21))
reject('Receiver',dict(builder.example(builder.R('Receiver')),otpEmail='not-an-email'))
reject('Revision',dict(builder.example(builder.R('Revision')),status='CONFIRMED'))
reject('Settlement',dict(builder.example(builder.R('Settlement')),status='SETTLED'))
reject('Settlement',dict(builder.example(builder.R('Settlement')),status='CLOSED'))
reject('Case',dict(builder.example(builder.R('Case')),status='RESOLVED'))
reject('Refund',dict(builder.example(builder.R('Refund')),status='COMPLETED'))
reject('InvoiceInput',{'dueAtUtc':'2026-11-20 10:00'})
reject('CaseInput',{'type':'AWAITING_CUSTOMER_CONFIRMATION','subject':'x','description':'x'})
reject('DeliveryContent',dict(builder.example(builder.R('DeliveryContent')),tripId='TRIP_001'))
for code in ['PENDING_GATEWAY','SUCCESS','FAILED','REVIEW_REQUIRED']:
    check(schema('Payment'),dict(builder.example(builder.R('Payment')),status=code))
# Verify actual SQL field references; JSON member paths only map their first SQL column.
sql=(REPO/'HorseTransportDB/HorseTransportDB_Reviewed.sql').read_text(encoding='utf-8')
tables={}
for m in re.finditer(r'CREATE TABLE\s+\[?(\w+)\]?\s*\((.*?)\n\);',sql,re.S|re.I):
    tables[m[1]]={c[1] for c in re.finditer(r'^\s*\[?(\w+)\]?\s+(?:VARCHAR|NVARCHAR|DECIMAL|DATETIME2?|DATE|INT|BIT|TINYINT)\b',m[2],re.M|re.I)}
mapped=0
for n,s in schemas.items():
    if n.startswith('F6-'):continue
    for k,v in s['properties'].items():
        for table,col in re.findall(r'\b([A-Z][A-Z_]+)\.([A-Za-z][A-Za-z0-9_]*)',v.get('x-source','')):
            assert table in tables and col in tables[table],(n,k,table,col)
            mapped+=1
manifest=read_json(ROOT/'source-manifest.json')
for p,h in manifest.items():assert hashlib.sha256((REPO/p).read_bytes()).hexdigest()==h,'Source drift: '+p
print(f'PASS: {len(ops)} APIs; {examples} JSON examples; {negative} negative cases; {mapped} SQL mappings; Markdown parity and {len(manifest)} source hashes.')
print('Not tested: backend authorization/transactions, email/OTP delivery, real VNPAY, SQL runtime, PDF rendering or UAT.')
