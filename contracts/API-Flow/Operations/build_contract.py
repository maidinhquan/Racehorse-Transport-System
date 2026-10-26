"""Contract additions extracted from the helo.html reference. Frontend/API contract only."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
S=lambda **kw:dict(type='string',**kw)
N=lambda **kw:dict(type='integer',minimum=0,maximum=9007199254740991,**kw)
def O(properties,required=None):return dict(type='object',properties=properties,required=list(properties) if required is None else required,additionalProperties=False)
def A(items):return dict(type='array',items=items)
def E(*values):return S(enum=list(values))
ref=lambda name:{'$ref':'#/components/schemas/'+name}
id=S(minLength=1,maxLength=50,pattern=r'^[A-Za-z0-9_-]+$')
stamp=S(pattern=r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$')
text=S(minLength=10,maxLength=2000)
item=O(dict(typeId=id,name=S(),horseId=S(),leadDays=N(),validityDays=N()))
timed=O(dict(tripId=id,version=N(),required=dict(type='boolean'),status=E('DRAFT','SENT','SCHEDULED'),items=A(item),earliestDeparture=stamp,plannedDepart=S(),sentAt=S(),scheduledAt=S()))
plan=O(dict(id=id,kind=S(),desc=text,cost=N(),payer=E('COMPANY','CUSTOMER','INSURANCE'),status=E('PENDING_APPROVAL','APPROVED','REJECTED'),at=stamp))
incident=O(dict(id=id,tripId=id,requestId=id,type=E('VEHICLE_BREAKDOWN','BORDER_DELAY','BAD_WEATHER','TRAFFIC_ACCIDENT','HORSE_HEALTH','CUSTOMS_HOLD','ROAD_CLOSURE','OTHER'),severity=E('LOW','MEDIUM','HIGH','CRITICAL'),status=E('NEW','IN_PROGRESS','PLAN_APPROVED','CLOSED'),at=stamp,by=S(),location=S(minLength=2,maxLength=255),description=text,safety=S(maxLength=2000),plans=A(plan)))
message=O(dict(from_=S()))
message=O({'from':E('CUSTOMER','MANAGER'),'name':S(),'at':stamp,'text':S()})
settlement=O(dict(status=E('PENDING','APPLIED'),amount=N(),note=S(),appliedAt=S()),['status','amount'])
complaint=O(dict(id=id,requestId=id,horseId=S(),type=E('HORSE_CONDITION','DELAY','SERVICE','BILLING'),title=S(minLength=5,maxLength=200),description=text,status=E('NEW','OPEN','IN_PROGRESS','PROPOSED','ESCALATED','PENDING_CUSTOMER_CONFIRMATION','RESOLVED','CLOSED'),createdAt=stamp,messages=A(message),resolution=O(dict(proposal=S(),amount=N())),settlement=settlement),['id','requestId','type','title','description','status','createdAt','messages'])
adjustment=O(dict(complaintId=id,amount=N(),note=S(),appliedAt=stamp))
summary=O(dict(requestId=id,invoiceId=S(),currency={'const':'VND'},contractTotal=N(),depositPaid=N(),balancePaid=N(),adjustments=A(adjustment),pendingAdjustments=A(O(dict(complaintId=id,amount=N()))),outstanding=N(),canPay=dict(type='boolean')))
acceptance=O(dict(status=E('PENDING','ACCEPTED'),openedAt=stamp,dueAt=stamp,decidedAt=S()),['status','openedAt','dueAt'])
report=O({k:v for k,v in incident['properties'].items() if k in ['tripId','type','severity','location','description','safety']}|{'safetyConfirmed':{'const':True}})
propose=O(dict(kind=S(minLength=1),desc=text,cost=N(),payer=E('COMPANY','CUSTOMER','INSURANCE')))
schemas=dict(TimedDocuments=timed,Incident=incident,IncidentPlan=plan,Complaint=complaint,Settlement=summary,Acceptance=acceptance,RequestCases=O(dict(requestId=id,incidents=A(ref('Incident')),complaints=A(ref('Complaint')))))
paths={};rows=[]
def add(code,method,path,role,response,body=None,description=''):
 params=[dict(name=x,in_='path',required=True,schema=id) for x in __import__('re').findall(r'{(\w+)}',path)]
 for p in params:p['in']=p.pop('in_')
 op=dict(operationId=code,summary=description or code,description=description,**{'x-role':role,'x-implementation-status':'requires-backend-implementation'},parameters=params,responses={'200':{'description':'Success','content':{'application/json':{'schema':O(dict(success={'const':True},message=S(),data=response))}}}})
 if body is not None:op['requestBody']=dict(required=True,content={'application/json':{'schema':body}})
 for status in ['400','401','403','404','409','429','500','501']:op['responses'][status]={'description':'Error; no success on rejected transitions','content':{'application/json':{'schema':ref('Error')}}}
 paths.setdefault(path,{})[method]=op;rows.append((code,method.upper(),path,role,description))
add('F2-J53','get','/specialist/trips/{tripId}/timed-documents','TRANSPORT_SPECIALIST',ref('TimedDocuments'),description='Resolve the short-validity document list from the assigned trip requirement set; do not issue documents yet.')
add('F2-J54','post','/specialist/trips/{tripId}/timed-documents/send','TRANSPORT_SPECIALIST',ref('TimedDocuments'),description='Freeze and send the requirement-derived list to the assigned Coordinator. No body; server resolves lead/validity days.')
add('F3-J21','get','/coordinator/trips/{tripId}/timed-documents','FLEET_ROUTE_COORDINATOR',ref('TimedDocuments'))
add('F3-J22','post','/coordinator/trips/{tripId}/timed-documents/schedule','FLEET_ROUTE_COORDINATOR',ref('TimedDocuments'),O(dict(version=N(),plannedDepart=stamp)), 'Schedule the SENT list version. Validate earliest departure, trip readiness, arrival commitment and document validity. SCHEDULED unlocks Specialist document preparation; stale version returns 409.')
for prefix,role,code in [('manager','LOGISTICS_MANAGER','M'),('specialist','TRANSPORT_SPECIALIST','S'),('coordinator','FLEET_ROUTE_COORDINATOR','C'),('driver','DRIVER_ESCORT','D')]:
 add('F5-'+code+'01','get',f'/{prefix}/incidents',role,A(ref('Incident')),description='List only visible/assigned incidents; Manager can see all.')
 add('F5-'+code+'02','post',f'/{prefix}/incidents',role,ref('Incident'),report,'Report an incident on an assigned, deployed active trip. Confirm safety; emergency care never waits for approval. Server owns actor/status/notifications.')
 add('F5-'+code+'03','get',f'/{prefix}/incidents/{{incidentId}}',role,ref('Incident'))
 if prefix!='driver':add('F5-'+code+'04','get',f'/{prefix}/complaints',role,A(ref('Complaint')),description='Manager handles complaints; assigned Specialist/Coordinator can only read related complaints.')
 if prefix in ['specialist','coordinator']:add('F5-'+code+'05','post',f'/{prefix}/incidents/{{incidentId}}/plans',role,ref('Incident'),propose,'Submit a proposal for Manager approval. No self-approval or execution before approval.')
add('F5-M05','post','/manager/incidents/{incidentId}/plans/{planId}/decision','LOGISTICS_MANAGER',ref('Incident'),O(dict(decision=E('APPROVED','REJECTED'),note=S(minLength=5,maxLength=2000))))
add('F5-M06','put','/manager/incidents/{incidentId}/status','LOGISTICS_MANAGER',ref('Incident'),O(dict(status=E('IN_PROGRESS','CLOSED'))),'Closing requires every approved action to be completed; rejected/pending plans do not count as executed.')
add('F5-M07','post','/manager/complaints/{complaintId}/reply','LOGISTICS_MANAGER',ref('Complaint'),O(dict(text=text,propose=dict(type='boolean'),amount=N())))
add('F5-M08','post','/manager/complaints/{complaintId}/resolution','LOGISTICS_MANAGER',ref('Complaint'),O(dict(text=text,amount=N(),reference=S(minLength=1,maxLength=200))),'Record an already-agreed result; compensation creates PENDING settlement, not an immediate balance write.')
add('F5-M09','post','/manager/complaints/{complaintId}/settlement','LOGISTICS_MANAGER',ref('Settlement'),O(dict(amount=N(),note=S(minLength=5,maxLength=2000))),'Apply an accepted complaint deduction once, transactionally to the final invoice. Bound by agreed compensation; never negative outstanding. Overpayment becomes refund status, never an automatic transfer. Repeat returns the same result.')
add('F5-U01','get','/customer/requests/{requestId}/cases','CUSTOMER',ref('RequestCases'),description='Customer can read incidents and complaints only within their own request. Cross-owner IDs return 404.')
add('F5-U02','post','/customer/complaints','CUSTOMER',ref('Complaint'),O(dict(requestId=id,horseId=S(),type=E('HORSE_CONDITION','DELAY','SERVICE','BILLING'),title=S(minLength=5,maxLength=200),description=text),['requestId','type','title','description']),'Only after verified handover, inside the complaint window. Backend determines request ownership and eligibility.')
add('F5-U03','post','/customer/complaints/{complaintId}/resolution','CUSTOMER',ref('Complaint'),O(dict(decision=E('ACCEPTED','REJECTED'))),'Acceptance of compensation creates PENDING settlement. Payment is blocked until Manager applies the final invoice adjustment.')
add('F4-U01','get','/customer/requests/{requestId}/settlement','CUSTOMER',ref('Settlement'),description='Authoritative final invoice: contract total, verified deposit/balance, applied deductions and pending adjustments. No computed client-side payment amount.')
add('F4-U02','post','/customer/requests/{requestId}/acceptance','CUSTOMER',ref('Acceptance'),description='Confirm verified handover/acceptance if no blocking complaint. Backend opens/updates the shared deadline. No client-written acceptance.')
schemas['Error']=O(dict(success={'const':False},message=S(),errorCode=S(),data={'type':'null'}))
spec=dict(openapi='3.1.0',info=dict(title='helo reference — planning, cases and settlement additions',version='1.0.0',description='Frontend target contract only; backend implementation and DB migrations are not included.'),servers=[dict(url='/api')],security=[{'bearerAuth':[]}],paths=paths,components=dict(securitySchemes=dict(bearerAuth=dict(type='http',scheme='bearer')),schemas=schemas))
text=json.dumps(spec,ensure_ascii=False,indent=2)+'\n';(ROOT/'operations.openapi.json').write_text(text,encoding='utf-8')
repo=ROOT.parents[2];(repo/'frontend/src/contracts/operations.openapi.json').write_text(text,encoding='utf-8')
md='''# helo.html — API additions (26/10/2026)

This contract defines the reference changes for frontend integration. It does not
claim that backend endpoints or the current database implement them. Existing
Flow 1 signing/payment rules are version 2.0.0 in that flow's canonical contract.
All money is integer VND, preserving the project's currency contract rather than
the HTML demo's illustrative USD amounts.

## Business rules

- Required pickup and desired-arrival dates are distinct. No guessed pickup dates.
- Accept terms → OTP signature → SIGNED / AWAITING_DEPOSIT → verified VNPAY IPN →
  EFFECTIVE / ACTIVATED and exactly one Trip. No Trip is created by frontend/sign API.
- Specialist sends the short-validity requirement list first. Coordinator schedules
  departure from that version and its earliest date. Specialist prepares official
  documents only when scheduling is confirmed (or server says no timed list is required).
- Every list, detail, file and mutation is authorized by resource ownership or staff
  assignment. Customer cases remain within their request; staff use a combined hub.
- Emergency care happens immediately; commercial/operational proposals require
  Manager approval. Specialist/Coordinator only read related customer complaints.
- Customer acceptance or an agreed resolution creates a pending compensation.
  Manager applies it once to the final invoice. Pending adjustment blocks payment.
  The frontend never subtracts a proposal from the balance, creates payment success,
  executes IPN, or declares money refunded without a server result.
- Binary files use the existing authenticated download mechanism.
- Do not write fixtures to a real API; tests use mocked transports.

## Endpoints

| ID | Method | Path | Role |
|---|---|---|---|
'''
md+=''.join(f'| {c} | {m} | `{p}` | {role} |\n' for c,m,p,role,_ in rows)
md+='\nMachine-readable payloads and guards: [operations.openapi.json](operations.openapi.json).\n'
(ROOT/'OPERATIONS.md').write_text(md,encoding='utf-8')
print(f'Generated {len(rows)} addition operations and their frontend mirror.')
