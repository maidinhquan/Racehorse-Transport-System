"""Build the Flow 1 wire schema and validate example coverage. No DB/backend writes.
Run: python contracts/API-Flow/Flow1/build_openapi.py
"""
from pathlib import Path
import json, re, copy
ROOT = Path(__file__).resolve().parent
source = (ROOT / 'FLOW1-API-JSON.md').read_text(encoding='utf-8')
blocks = re.findall(r'^### (F1-J\d+) — (\w+) ([^\n]+)\n(.*?)(?=^### F1-J|^## |\Z)', source, re.M | re.S)
assert len(blocks) == 65
assert not any(op[0] in ['F1-J47','F1-J48'] for op in blocks)

def schema(values, key='', request=False):
    kinds = {('null' if v is None else 'boolean' if isinstance(v,bool) else 'integer' if isinstance(v,int) else 'number' if isinstance(v,float) else 'string' if isinstance(v,str) else 'array' if isinstance(v,list) else 'object') for v in values}
    if len(kinds)>1:
        return {'anyOf':[schema([v for v in values if ('null' if v is None else 'boolean' if isinstance(v,bool) else 'integer' if isinstance(v,int) else 'number' if isinstance(v,float) else 'string' if isinstance(v,str) else 'array' if isinstance(v,list) else 'object')==t],key,request) for t in sorted(kinds)]}
    kind=next(iter(kinds)); out={'type':kind}
    if kind=='object':
        keys=set().union(*(v.keys() for v in values)); required=set(values[0]).intersection(*(v.keys() for v in values))
        if key in ['horseNotes','errors']:
            out['additionalProperties']={'type':'string'} if key=='horseNotes' else {'type':'array','items':{'type':'string'}}
            return out
        out['properties']={k:schema([v[k] for v in values if k in v],k,request) for k in sorted(keys)}
        out['required']=sorted(required); out['additionalProperties']=False
        if 'id' in keys:
            prefixes={re.match(r'^([A-Z_]+)_\d{3,}$', v['id'])[1] for v in values if isinstance(v.get('id'),str) and re.match(r'^([A-Z_]+)_\d{3,}$',v['id'])}
            if prefixes:out['properties']['id']={'type':'string','maxLength':50,'pattern':'^(?:'+'|'.join(sorted(prefixes))+r')_\d{3,}$'}
    elif kind=='array':
        entries=[x for v in values for x in v]
        out['items']=schema(entries,key+'[]',request) if entries else {}
        if key=='horses': out['uniqueItems']=True
        if key=='horses' and all(isinstance(x,str) for x in entries): out['maxItems']=6;out['items']={'type':'string','pattern':r'^HORSE_\d{3,}$'}
        if key=='unsupportedFields': out['items']={'type':'string','enum':['color','fluDate','vetName','vetPhone']};out['uniqueItems']=True
    elif kind in ['integer','number']:
        if key not in ['latitude','longitude']:
            out.update(minimum=0,maximum=9007199254740991)
        if key in ['v','versionNo']: out.update(minimum=1)
        if key=='depositPct' or key=='defaultDepositPct':out.update(minimum=1,maximum=100)
        if key=='latitude':out.update(minimum=-90,maximum=90)
        if key=='longitude':out.update(minimum=-180,maximum=180)
    elif kind=='string':
        if key=='currency':out['const']='VND'
        elif key=='sex':out['enum']=['STALLION','MARE','GELDING']
        elif key in ['mode','transportMode']:out['enum']=['ROAD','AIR']
        elif key in ['originCountry','destinationCountry','countryCode']:out['enum']=['VN','JP']
        elif key=='role':out['enum']=['CUSTOMER','LOGISTICS_MANAGER','TRANSPORT_SPECIALIST','FLEET_ROUTE_COORDINATOR','DRIVER_ESCORT','ADMIN','SYSTEM']
        elif key=='microchip':out['pattern']=r'^\d{15}$'
        elif key=='value':out.update(pattern=r'^[1-9]\d{0,9}$',maxLength=10)
        elif key=='otp':out['pattern']=r'^\d{6}$'
        elif key in ['date','dob','issueDate','expiryDate','fluDate']:out['pattern']=r'^(\d{4}-\d{2}-\d{2})?$'
        elif key.endswith('At') or key.endswith('Until') or key in ['at','from','to','plannedDepart','eta','readAt']:out['pattern']=r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})?$'
        elif key=='expiresAt':out['pattern']=r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
        if key in ['contractId','requestId','horseId','invoiceId','paymentId','tripId','notificationId','customerId','coordinatorId','specialistId']:
            prefix={'customerId':'USER','coordinatorId':'USER','specialistId':'USER'}.get(key,key[:-2].upper())
            out.update(pattern='^'+prefix+r'_\d{3,}$',maxLength=50)
        if key in ['name','breed']:out['maxLength']=100
        if key in ['text','feedback','reason','note','conditions','careNotes','exception','commercial','proposedNotes','other']:out['maxLength']=2000
        if key in ['reference','transactionCode']:out.update(minLength=1,maxLength=100)
        if key=='address':out['maxLength']=255
        if key in ['phone','vetPhone']:out['maxLength']=50
    return out

# These definitions supply item shapes absent from empty collections in individual examples.
components={}
operations=[]
for opid,method,path,body in blocks:
    samples=[]
    for match in re.finditer(r'```json\n(.*?)\n```',body,re.S):
        preceding=body[:match.start()]
        label=re.findall(r'\*\*([^*]+)\*\*',preceding)[-1] if '**' in preceding else ''
        value=json.loads(match[1]);samples.append((label,value))
    req=[v for label,v in samples if label.startswith('Request JSON')]
    successes=[v for label,v in samples if v.get('success') is True]
    responses={}
    for label,v in samples:
        if not label.startswith('Response'):continue
        code=re.search(r'\d{3}',label)[0]
        responses.setdefault(code,[]).append(v)
    operations.append((opid,method,path,body,req,responses))
    if req:components[opid+'Request']=schema(req,request=True)
    for code,vals in responses.items():components[opid+'Response'+code]=schema(vals)

# Collect reusable response item types so [] doesn't mean untyped business data.
horse=components['F1-J02Response200']['properties']['data']['items']
version=components['F1-J35Response200']['properties']['data']
manager_version=components['F1-J33Response200']['properties']['data']
payment=components['F1-J44Response200']['properties']['data']
payment['properties']['confirmedAmount']={'type':'integer','minimum':0}
reusable={'versions':version,'payments':payment,'transactions':payment,'horses':horse}
# Omitted optional files are allowed on a Horse; unsupported fields are explicitly null in this baseline.
for key in ['photo','ownership','valueProof','flu','health']:
    horse['properties'][key]={'type':'object','properties':{'name':{'type':'string'},'url':{'type':'string'}},'required':['name','url'],'additionalProperties':False}
horse['required']=[x for x in horse['required'] if x not in ['photo','ownership','valueProof','flu','health']]
# Required string core fields are validated when saving, as distinct from a draft.
for n in [12,13]:
    sc=components[f'F1-J{n:02d}Request']
    for k in ['name','breed','dob']:sc['properties'][k]['minLength']=1
    sc['properties']['passport']['properties']['number']['minLength']=1
    sc['properties']['passport']['properties']['authority']['minLength']=1
    for k in ['issueDate','expiryDate']:sc['properties']['passport']['properties'][k]['minLength']=10

# Canonical DTO status enums; meanings belong to FLOW1.md, not SQL CHECK guesses.
request_states=['DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','CONTRACT_PREPARATION','CONTRACT_READY','CONTRACT_CHANGES_REQUESTED','DEPOSIT_VERIFIED','CANCELLATION_REQUESTED','ACTIVATED','SCHEDULED','IN_PROGRESS','DELIVERED','CLOSED','CANCELLED']
contract_states=['ISSUED','CHANGES_REQUESTED','EXPIRED','SUPERSEDED','EFFECTIVE','FULFILLED','VOID']
def enrich(node,path=''):
    if not isinstance(node,dict):return
    props=node.get('properties',{})
    if 'status' in props:
        if 'wizardStep' in props or 'dossier' in props:props['status']={'type':'string','enum':request_states}
        elif 'type' in props and 'amount' in props:
            props['status']={'type':'string','enum':['PROCESSING','SUCCESS','FAILED','PENDING_CONFIRMATION']}
            node['allOf']=[{'if':{'properties':{'method':{'const':'VNPAY'}},'required':['method']},'then':{'properties':{'status':{'enum':['PROCESSING','SUCCESS','FAILED']}}}}]
            props.update(confirmedAmount={'type':'integer','minimum':0},transactionCode={'type':'string'},receivedAt={'type':'string'},note={'type':'string'},receipt={'type':['string','null']})
            if 'method' in props: props['method']={'const':'VNPAY'}
        elif 'plannedDepart' in props:props['status']={'type':'string','enum':['PLANNING','READY_TO_DEPART','IN_TRANSIT','COMPLETED']}
    if 'state' in props:props['state']={'type':'string','enum':contract_states}
    if 'requestStatus' in props:props['requestStatus']={'type':'string','enum':request_states}
    if 'budget' in props:
        props['budget']={'type':'object','properties':{k:{'type':'integer','minimum':0,'maximum':9007199254740991} for k in ['TRANSPORT','PROCEDURE','VET','INSURANCE','STAFF']},'required':['TRANSPORT','PROCEDURE','VET','INSURANCE','STAFF'],'additionalProperties':False}
    for k,v in props.items():
        if v.get('type')=='array' and v.get('items')=={}:
            if k in ['versions']:v['items']=copy.deepcopy(manager_version if 'dossier' in props else version)
            elif k in ['payments','transactions']:v['items']=copy.deepcopy(payment)
            else:
                # Flow 1 currently returns these later-flow collections empty. No invented records.
                v['items']={'type':'object','description':'Collection used by later flows; no persistence is introduced by Flow 1.'}
    for v in props.values():enrich(v,path)
    if 'items' in node:enrich(node['items'],path)
    for v in node.get('anyOf',[]):enrich(v,path)
for key,node in components.items():enrich(node)

# Optional lifecycle data and nonempty collections are part of the DTO, even if a list example is empty.
string={'type':'string'}
stamp={'type':['string','null'],'pattern':r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'}
def object_schema(props,required=None):
    return {'type':'object','properties':props,'required':required or list(props),'additionalProperties':False}
def nullable(sc):return {'anyOf':[copy.deepcopy(sc),{'type':'null'}]}
file_ref=object_schema({'name':string,'url':string})
change=object_schema({'at':stamp,'text':string,'proposedDate':string,'proposedNotes':string,'commercial':string,'other':string,'response':object_schema({'at':stamp,'text':string,'decision':{'type':'string','enum':['ACCEPTED','REJECTED','REVISED','KEPT','RETURNED']}},['at','text'])},['at','text'])
for v in [version,manager_version]:
    v['properties'].update(change=nullable(change),termsAcceptedAt=stamp,signedAt=stamp,
        deadlineHistory={'type':'array','items':object_schema({'at':stamp,'from':stamp,'to':stamp,'by':string,'reason':string})},
        extensions={'type':'array','items':object_schema({'at':stamp,'from':stamp,'to':stamp})})
    v['required']=[k for k in v['required'] if k not in ['signedAt','termsAcceptedAt','deadlineHistory','extensions']]
draft=copy.deepcopy(components['F1-J30Request'])
draft['properties']['savedAt']=stamp
refund=object_schema({'amount':{'type':'integer','minimum':0},'status':{'type':'string','enum':['REQUESTED','PROCESSING','REFUNDED']},'at':stamp,'refundedAt':stamp,'reference':string},['status'])
trip=components['F1-J57Response200']['properties']['data']
customer_trip=object_schema({'id':string,'status':{'type':'string','enum':['PLANNING','READY_TO_DEPART','IN_TRANSIT','COMPLETED']},'mode':{'type':'string','enum':['ROAD','AIR']},'plannedDepart':stamp,'eta':stamp,'routeApproved':{'type':'boolean'},'stops':{'type':'array','items':object_schema({'name':string,'type':string,'plannedAt':stamp})},'milestones':{'type':'array','items':{'type':'object'}},'etaHistory':{'type':'array','items':{'type':'object'}}})
def lifecycle(sc):
    props=sc.get('properties',{})
    if 'currentContract' in props:props['currentContract']=nullable(manager_version)
    if 'currentVersion' in props:props['currentVersion']=nullable(version)
    if 'draft' in props:props['draft']=nullable(draft)
    if 'wizardStep' in props or 'dossier' in props:
        props.update(feedback=string,reason=string,refund=nullable(refund))
        if 'wizardStep' in props:
            props['trip']=nullable(customer_trip)
            props['cancelRequest']=nullable(object_schema({'at':stamp,'reason':string,'prevStatus':{'type':'string','enum':request_states}}))
        else:
            props['tripId']=string;props['contractId']=string
            props['cancellation']=nullable(object_schema({'reason':string,'at':stamp,'status':{'type':'string','enum':['REQUESTED','APPROVED','REFUSED']},'decidedAt':stamp,'decisionNote':string,'prevStatus':{'type':'string','enum':request_states}},['reason','at','status']))
        props['versions']={'type':'array','items':copy.deepcopy(manager_version if 'dossier' in props else version)}
    for key,item in list(props.items()):
        if key not in ['versions','currentContract','currentVersion','draft','trip','refund','cancelRequest','cancellation']:lifecycle(item)
    if isinstance(sc.get('items'),dict):lifecycle(sc['items'])
    for v in sc.get('anyOf',[]):lifecycle(v)
for key,sc in components.items():lifecycle(sc)

# Formal nullable lifecycle fields may arrive before they exist.
for name,node in list(components.items()):
    def timestamps(sc):
        for k,v in sc.get('properties',{}).items():
            if k in ['termsAcceptedAt','signedAt']:
                sc['properties'][k]={'type':['string','null'],'pattern':r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'}
            else: timestamps(v)
        if isinstance(sc.get('items'),dict):timestamps(sc['items'])
        for v in sc.get('anyOf',[]):timestamps(v)
    timestamps(node)

# Deployment lifecycle is independent of Trip.Status.
def deployment_enums(sc):
    props=sc.get('properties',{})
    if 'deployment' in props:
        d=props['deployment']
        for branch in [d]+d.get('anyOf',[]):
            if 'status' in branch.get('properties',{}):
                branch['properties']['status']={'type':'string','enum':['NOT_CONFIRMED','CONFIRMED','ON_HOLD']}
    for value in props.values(): deployment_enums(value)
    if isinstance(sc.get('items'),dict): deployment_enums(sc['items'])
    for value in sc.get('anyOf',[]): deployment_enums(value)
for sc in components.values(): deployment_enums(sc)

# Explicit enums for mutating commands, beyond illustrative values.
for op,key,enum in [('F1-J39','decision',['ACCEPTED','REJECTED']),('F1-J54','decision',['APPROVED','REJECTED']),('F1-J43','method',['VNPAY'])]:
    components[op+'Request']['properties'][key]={'type':'string','enum':enum}
components['F1-J43Request']['description']='Only VNPAY is supported; no manual confirmation or rejection.'
components['F1-J55Response200']['properties']['data']['properties']['refundStatus']={'const':'COMPLETED'}
for op in ['F1-J38']:
    components[op+'Request']['properties']['text']['minLength']=10
components['F1-J27Request']['properties']['feedback'].update(minLength=10,maxLength=2000)
for op in ['F1-J52','F1-J53','F1-J54']:
    components[op+'Request']['properties']['reason'].update(minLength=1,maxLength=1000)
components['F1-J28Request']['properties']['reason']['minLength']=10


# SQL-aligned field limits and optional paired coordinates.
for op in ['F1-J40','F1-J59']:
    components[op+'Request']['properties']['reason'].update(minLength=1,maxLength=1000)
def normalize(sc):
    props=sc.get('properties',{})
    for key in ['history','revisions','deadlineHistory','extensions','etaHistory']:
        props.pop(key,None)
        if 'required' in sc:sc['required']=[k for k in sc['required'] if k!=key]
    if 'phone' in props:props['phone']['maxLength']=20
    if 'latitude' in props and 'longitude' in props:
        sc['required']=[k for k in sc.get('required',[]) if k not in ['latitude','longitude']]
        sc['allOf']=[{'if':{'required':['latitude']},'then':{'required':['longitude']}},{'if':{'required':['longitude']},'then':{'required':['latitude']}}]
    for v in props.values():normalize(v)
    if isinstance(sc.get('items'),dict):normalize(sc['items'])
    for v in sc.get('anyOf',[]):normalize(v)
for sc in components.values():normalize(sc)

# Empty collection unions should not prohibit populated canonical collections (e.g. issues).
# Checklist response defines both empty/filled issues; inference handles the item union.
spec={'openapi':'3.1.0','info':{'title':'Flow 1 — frontend contract','version':'1.1.0','description':'Target interface; SQL Reviewed deployment CHECK supports ON_HOLD; live database and backend not updated. See x-implementation-status on operations. Examples are illustrative; schemas are normative.'},'servers':[{'url':'/api'}],'security':[{'bearerAuth':[]}],'paths':{},'components':{'securitySchemes':{'bearerAuth':{'type':'http','scheme':'bearer'}},'schemas':components}}
error={'type':'object','required':['success','message','errorCode','data'],'properties':{'success':{'const':False},'message':{'type':'string'},'errorCode':{'type':'string'},'data':{'type':'null'},'errors':{'type':'object','additionalProperties':{'type':'array','items':{'type':'string'}}}},'additionalProperties':False}
components['Error']=error
for opid,method,path,body,req,responses in operations:
    op={'operationId':opid,'summary':body.strip().splitlines()[0],'x-implementation-status':'requires-backend-verification','responses':{},'parameters':[]}
    if opid in ['F1-J14','F1-J20','F1-J27','F1-J37','F1-J52','F1-J53','F1-J54','F1-J55']:
        rules=re.search(r'\*\*Quy tắc:\*\* ([^\n]+)',body)
        if rules: op['description']=rules[1]
    for param in re.findall(r'{(\w+)}',path):
        sch={'type':'integer','minimum':1} if param=='versionNo' else {'type':'string','maxLength':50,'pattern':r'^[A-Z_]+_\d{3,}$'}
        if param=='fileType':sch={'type':'string','enum':['photo','passport','ownership','value-proof']}
        if param=='documentType':sch={'type':'string','enum':['PASSPORT','OWNERSHIP','VALUATION','VACCINATION','HEALTH_CERTIFICATE']}
        op['parameters'].append({'name':param,'in':'path','required':True,'schema':sch})
    if opid in ['F1-J09','F1-J10','F1-J14','F1-J29']:
        query={'F1-J09':['originCountry','destinationCountry','mode'],'F1-J10':['q','country'],'F1-J14':['date','excludeRequestId'],'F1-J29':['mode']}[opid]
        for name in query:
            sch={'type':'string'}
            if name=='mode':sch['enum']=['ROAD','AIR']
            if name in ['originCountry','destinationCountry','country']:sch['enum']=['VN','JP']
            if name=='q':sch.update(minLength=2,maxLength=200)
            if name=='date':sch['pattern']=r'^\d{4}-\d{2}-\d{2}$'
            op['parameters'].append({'name':name,'in':'query','required':opid=='F1-J10' or (opid=='F1-J14' and name=='date'),'schema':sch})
    if opid=='F1-J18':op['parameters'].append({'name':'Idempotency-Key','in':'header','required':True,'schema':{'type':'string','format':'uuid'}})
    if req:
        op['requestBody']={'required':True,'content':{'application/json':{'schema':{'$ref':'#/components/schemas/'+opid+'Request'},'example':req[0]}}}
    if opid in ['F1-J15','F1-J17']:
        props={'file':{'type':'string','format':'binary','description':'Real bytes, <=10 MiB. PDF/JPEG/PNG; photo JPEG/PNG only.'}}
        if opid=='F1-J17':props.update(documentType={'type':'string','enum':['PASSPORT','OWNERSHIP','VALUATION','VACCINATION','HEALTH_CERTIFICATE']},expiryDate={'type':'string','format':'date'})
        op['requestBody']={'required':True,'content':{'multipart/form-data':{'schema':{'type':'object','properties':props,'required':['file']+(['documentType'] if opid=='F1-J17' else []),'additionalProperties':False}}}}
        if opid=='F1-J15':op['parameters'][-1]['schema']={'type':'string','enum':['photo','passport','ownership','value-proof']}
    for code,vals in responses.items():
        op['responses'][code]={'description':'Success' if int(code)<400 else 'Business error','content':{'application/json':{'schema':{'$ref':'#/components/schemas/'+opid+'Response'+code},'examples':{f'case{i+1}':{'value':v} for i,v in enumerate(vals)}}}}
    if opid in ['F1-J16','F1-J36','F1-J49','F1-J66']:
        op['responses']['200']={'description':'Authorized binary; errors remain JSON','content':{mime:{'schema':{'type':'string','format':'binary'}} for mime in (['application/pdf','image/jpeg','image/png'] if opid in ['F1-J16','F1-J66'] else ['application/pdf'])}}
    for code in ['400','401','403','404','409','429','500','501']:
        op['responses'].setdefault(code,{'description':'Shared error; 501 means capability not available','content':{'application/json':{'schema':{'$ref':'#/components/schemas/Error'}}}})
    if opid=='F1-J67':
        op['security']=[]
        op['description']=body.strip()
        op['parameters']=[{'name':name,'in':'query','required':True,'schema':{'type':'string'}} for name in ['vnp_TmnCode','vnp_TxnRef','vnp_Amount','vnp_ResponseCode','vnp_TransactionStatus','vnp_SecureHash']]
        op['responses']={'200':{'description':'Provider acknowledgement; not application envelope','content':{'application/json':{'schema':{'type':'object','required':['RspCode','Message'],'properties':{'RspCode':{'type':'string','enum':['00','01','02','04','97','99']},'Message':{'type':'string'}},'additionalProperties':False},'example':{'RspCode':'00','Message':'Confirm Success'}}}}}
    spec['paths'].setdefault(path,{})[method.lower()]=op
out=ROOT/'flow1.openapi.json';out.write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(f'Built {len(operations)} operations, {len(components)} schemas at {out.name}')
