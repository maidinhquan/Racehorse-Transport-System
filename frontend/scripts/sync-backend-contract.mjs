// Frontend-only schema alignment with WebApi/Controllers/Flow1 and Application/Flow1 DTOs/mappers.
// Does not write the backend or the design contracts outside frontend/.
import fs from 'node:fs';
const path = new URL('../src/contracts/flow1.openapi.json', import.meta.url);
const spec = JSON.parse(fs.readFileSync(path, 'utf8'));
const schemas = spec.components.schemas;
const str = { type: 'string' }, num = { type: 'number' }, nullable = s => ({ anyOf: [s, { type: 'null' }] });
const obj = (properties, required = [], additionalProperties = true) => ({ type: 'object', properties, required, additionalProperties });
const arr = items => ({ type: 'array', items });
const ref = name => ({ $ref: `#/components/schemas/Backend${name}` });
const envelope = data => obj({ success: { const: true }, message: str, data }, ['success', 'message', 'data']);
const file = obj({ name: str, url: str }, ['url']);
const passport = obj({ number: nullable(str), authority: nullable(str), issueDate: nullable(str), expiryDate: nullable(str), scan: nullable(file) });
schemas.BackendHorse = obj({ id: str, name: str, breed: nullable(str), sex: nullable({ enum: ['STALLION', 'MARE', 'GELDING'] }), dob: nullable(str),
  microchip: str, value: nullable(str), currency: { const: 'VND' }, healthNotes: nullable(str), reproductiveStatus: nullable(str), weight: nullable(num),
  passport, photo: nullable(file), ownership: nullable(file), valueProof: nullable(file) }, ['id', 'name', 'microchip', 'currency', 'passport']);
const contact = obj({ name: str, address: str, postal: str, contact: str, phone: str, notes: str, cityId: str, cityName: str, latitude: num, longitude: num });
schemas.BackendContract = obj({ contractId: str, requestId: str, versionNo: { type: 'integer' }, requestStatus: str,
  contractStatus: str, versionStatus: str, currentDeadline: nullable(str), issuedAt: nullable(str), signedAt: nullable(str), termsAcceptedAt: nullable(str),
  items: nullable(arr(obj({ desc: str, amount: num, required: { type: 'boolean' } }, ['desc', 'amount']))),
  total: nullable(num), depositPct: nullable(num), depositAmount: nullable(num), terms: nullable(arr(obj({ title: str, text: str }, ['title', 'text']))),
  mode: nullable(str), departAt: nullable(str), arriveAt: nullable(str), snapshot: { type: 'object' }, pdfUrl: nullable(str), note: nullable(str)
}, ['contractId', 'requestId', 'versionNo', 'contractStatus', 'versionStatus']);
schemas.BackendRequest = obj({ id: str, customerId: str, origin: str, destination: str, originCountry: str, destinationCountry: str, mode: str,
  expectedTransportDate: nullable(str), expectedDeliveryDate: nullable(str), status: str, careInstructions: nullable(str),
  horses: arr(str), horseCount: { type: 'integer' }, horseNotes: { type: 'object', additionalProperties: str }, pickup: contact, delivery: contact,
  versions: arr(ref('Contract')), payments: arr({ type: 'object' }), docs: arr({ type: 'object' }), dossier: arr({ type: 'object' }),
  revisionFeedback: nullable(str), createdAt: nullable(str)
}, ['id', 'customerId', 'origin', 'destination', 'status', 'horses', 'pickup', 'delivery']);
schemas.BackendProfile = obj({ id: str, fullName: str, email: nullable(str), phone: nullable(str), role: str, username: nullable(str) }, ['id', 'fullName']);
schemas.BackendTrip = obj({ id: str, requestId: str, status: str, tripStatus: str, mode: nullable(str), plannedDepart: nullable(str), eta: nullable(str),
  specialistId: nullable(str), coordinatorId: nullable(str), deployment: obj({ status: str, eventId: nullable(str), reason: nullable(str), at: nullable(str) }, ['status']) }, ['id', 'requestId', 'status', 'deployment']);
const requestContact = obj({ ...contact.properties, cityId: { type: 'string', minLength: 1 } }, ['name', 'address', 'postal', 'contact', 'phone', 'notes', 'cityId', 'latitude', 'longitude'], false);
delete requestContact.properties.cityName;
const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const requestInput = obj({ origin: str, destination: str, originCountry: str, destinationCountry: str, mode: { enum: ['ROAD', 'AIR'] },
  expectedTransportDate: date, expectedDeliveryDate: date, careInstructions: { type: 'string', maxLength: 2000 },
  pickup: requestContact, delivery: requestContact, horses: { type: 'array', items: { type: 'string', pattern: '^HORSE_\\d{3,}$' }, minItems: 1, maxItems: 6, uniqueItems: true },
  horseNotes: { type: 'object', additionalProperties: { type: 'string', maxLength: 2000 } }, purpose: nullable({ type: 'string', maxLength: 1000 })
}, ['origin', 'destination', 'originCountry', 'destinationCountry', 'mode', 'expectedTransportDate', 'expectedDeliveryDate', 'careInstructions', 'pickup', 'delivery', 'horses', 'horseNotes'], false);
const passportInput = obj({ number: { type: 'string', minLength: 1, maxLength: 50 }, authority: { type: 'string', minLength: 1, maxLength: 200 }, issueDate: date, expiryDate: date }, ['number', 'authority', 'issueDate', 'expiryDate'], false);
const horseInput = obj({ name: { type: 'string', minLength: 1, maxLength: 100 }, breed: { type: 'string', minLength: 1, maxLength: 100 },
  sex: { enum: ['STALLION', 'MARE', 'GELDING'] }, dob: date, microchip: { type: 'string', pattern: '^\\d{15}$' },
  value: { type: 'string', pattern: '^[1-9]\\d{0,9}$' }, currency: { const: 'VND' }, passport: passportInput, healthNotes: { type: 'string', maxLength: 2000 },
  reproductiveStatus: nullable({ enum: ['INTACT', 'NOT_PREGNANT', 'PREGNANT', 'GELDED'] }), weight: nullable({ type: 'number', exclusiveMinimum: 0, maximum: 99999999.99 })
}, ['name', 'breed', 'sex', 'dob', 'microchip', 'value', 'currency', 'passport', 'healthNotes'], false);
schemas['F1-J12Request'] = horseInput; schemas['F1-J13Request'] = horseInput;
schemas['F1-J18Request'] = requestInput; schemas['F1-J19Request'] = requestInput;
schemas['F1-J30Request'].properties.mode = { type: 'string', enum: ['ROAD', 'AIR'] };
schemas['F1-J30Request'].required = [...new Set([...schemas['F1-J30Request'].required, 'mode'])];
const editorOperation = spec.paths['/manager/requests/{requestId}/contract-editor'].get;
editorOperation.parameters = [...editorOperation.parameters.filter(p => p.name !== 'mode'),
  { name: 'mode', in: 'query', required: false, schema: { type: 'string', enum: ['ROAD', 'AIR'] } }];
const draftExample = spec.paths['/manager/requests/{requestId}/contract-draft'].put.requestBody.content['application/json'].example;
if (draftExample) draftExample.mode ??= 'ROAD';
schemas.Error = obj({ success: { const: false }, message: str, errorCode: str, data: {}, errors: { type: 'object', additionalProperties: arr(str) } }, ['success', 'message']);

const targets = {};
const use = (ids, schema) => ids.forEach(id => { targets[`F1-J${String(id).padStart(2, '0')}`] = schema; });
use([1], ref('Profile')); use([4], arr(ref('Profile')));
use([2, 5], arr(ref('Horse'))); use([11, 12, 13], ref('Horse'));
use([18, 19, 22, 25, 26, 27, 28], ref('Request')); use([21, 24], arr(ref('Request')));
use([33, 35], ref('Contract'));
use([34], obj({ requestId: str, currentVersion: nullable(ref('Contract')) }, ['requestId']));
use([6], arr(obj({ id: str, name: str, role: str, isActive: { type: 'boolean' } }, ['id', 'name', 'role', 'isActive'])));
use([14], arr(obj({ id: str, name: str, horse: ref('Horse'), selectable: { type: 'boolean' }, conflict: nullable({ type: 'object' }), documentWarnings: arr(str) }, ['id', 'name', 'selectable', 'documentWarnings'])));
use([23], obj({ requestId: str, horses: arr(obj({ horseId: str, documents: arr({ type: 'object' }), medical: arr({ type: 'object' }) }, ['horseId', 'documents', 'medical'])) }, ['requestId', 'horses']));
use([29], obj({ request: ref('Request'), customer: { type: 'object' }, horses: arr(ref('Horse')), draft: nullable(ref('Contract')), currentContract: nullable(ref('Contract')), versions: arr(ref('Contract')), defaults: { type: 'object' }, internalCosts: arr({ type: 'object' }) }, ['request', 'customer', 'horses', 'versions', 'defaults']));
use([30], obj({ requestId: str, contractId: str, versionNo: { type: 'integer' }, status: str, savedAt: str }, ['requestId', 'contractId', 'versionNo', 'status', 'savedAt']));
use([51], obj({ requestId: str, contractId: str, versionNo: { type: 'integer' }, requestStatus: { const: 'ACTIVATED' }, versionStatus: { const: 'SIGNED' }, tripId: str, tripStatus: { const: 'PLANNING' }, signedAt: str }, ['requestId', 'requestStatus', 'tripId', 'tripStatus', 'signedAt']));
use([56], arr(ref('Trip'))); use([57, 58, 59, 60], ref('Trip'));
const payment = obj({ id: str, paymentId: str, invoiceId: str, contractId: str, versionNo: { type: 'integer' },
  amount: num, currency: str, method: str, status: str, databaseStatus: str, receivedAmount: nullable(num), paidAt: nullable(str), reviewRequired: { type: 'boolean' } }, ['id', 'invoiceId', 'contractId', 'versionNo', 'amount', 'method', 'status']);
use([44, 46], payment); use([45], arr(payment));
use([42], obj({ requestId: str, contractId: str, versionNo: { type: 'integer' }, invoiceId: str, currency: str,
  requiredAmount: num, paidAmount: num, remainingAmount: num, canPay: { type: 'boolean' }, validUntil: str, transactions: arr(payment) },
  ['requestId', 'contractId', 'versionNo', 'invoiceId', 'canPay', 'transactions']));
use([40], obj({ contractId: str, versionNo: { type: 'integer' }, newDeadline: str, reason: str, by: str, at: str }, ['contractId', 'versionNo', 'newDeadline']));
use([41], obj({ contractId: str, versionNo: { type: 'integer' }, notificationId: str, queued: { type: 'boolean' } }, ['contractId', 'queued']));
use([63, 65], obj({ updated: { type: 'integer' } }, ['updated']));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  const v = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, canonical(child)]));
  if ('passport' in v && 'microchip' in v) {
    v.healthNotes = v.healthNotes ?? v.conditions ?? '';
    for (const key of ['conditions', 'color', 'fluDate', 'vetName', 'vetPhone', 'flu', 'health']) delete v[key];
  }
  if ('horses' in v && 'pickup' in v && 'origin' in v) {
    v.customerId ??= 'USER_001';
    v.expectedTransportDate ??= v.pickupAt ?? v.date;
    v.expectedDeliveryDate ??= v.date;
    v.careInstructions ??= v.careNotes ?? '';
    v.horseNotes ??= {};
    for (const key of ['pickupAt', 'date', 'careNotes']) delete v[key];
    for (const key of ['pickup', 'delivery']) if (v[key]) v[key].cityId ??= '0123456789abcdef012345';
  }
  if ('v' in v && 'state' in v) {
    v.versionNo = v.v; v.versionStatus = v.state; v.contractStatus ??= v.state === 'SIGNED' ? 'EFFECTIVE' : v.state;
    v.currentDeadline = v.validUntil; v.requestId ??= 'REQUEST_001'; v.requestStatus ??= 'CONTRACT_READY';
    v.contractId ??= 'CONTRACT_001';
    for (const key of ['v', 'state', 'validUntil']) delete v[key];
  }
  if (v.versionNo && v.versionStatus && v.snapshot && !v.snapshot.route) {
    const s = v.snapshot;
    s.route = { departureAtUtc: v.departAt?.replace(' ', 'T') + ':00Z', deliveryAtUtc: v.arriveAt?.replace(' ', 'T') + ':00Z', mode: v.mode };
    s.pickup.cityName ??= s.origin;
    s.delivery.cityName ??= s.destination;
    s.parties = { customer: s.customer };
    s.horses = s.horses.map(h => ({ ...h, microchip_ISO: h.microchip, feI_Passport_No: h.passportNo }));
  }
  if ('email' in v && 'phone' in v && 'name' in v && !('request' in v)) v.fullName ??= v.name;
  if ('load' in v && 'role' in v) v.isActive = true;
  return v;
}
const requestExample = canonical(spec.paths['/customer/requests/{requestId}'].put.requestBody.content['application/json'].example);
delete requestExample.customerId;
const sampleHorse = canonical(spec.paths['/customer/horses'].get.responses['200'].content['application/json'].examples.case1.value.data[0]);
for (const key of ['pickup', 'delivery']) delete requestExample[key].cityName;
for (const [p, method] of [['/customer/requests', 'post'], ['/customer/requests/{requestId}', 'put']]) {
  spec.paths[p][method].requestBody.content['application/json'].example = requestExample;
}
for (const [p, method] of [['/customer/horses', 'post'], ['/customer/horses/{horseId}', 'put']]) {
  spec.paths[p][method].requestBody.content['application/json'].example = canonical(spec.paths[p][method].requestBody.content['application/json'].example);
}
// Backend can omit null data; field-level validation errors must still reach the UI.
for (const methods of Object.values(spec.paths)) for (const operation of Object.values(methods)) {
  if (!operation.operationId) continue;
  for (const [status, response] of Object.entries(operation.responses)) {
    const json = response.content?.['application/json'];
    if (!json) continue;
    if (Number(status) >= 400) json.schema = { $ref: '#/components/schemas/Error' };
    else if (targets[operation.operationId]) {
      const name = `${operation.operationId}Response${status}`;
      schemas[name] = envelope(targets[operation.operationId]);
      json.schema = { $ref: `#/components/schemas/${name}` };
      for (const example of Object.values(json.examples ?? {})) {
        example.value = canonical(example.value);
        const d = example.value.data;
        if (operation.operationId === 'F1-J05') example.value.data = d.map(h => ({ ...sampleHorse, ...h, passport: h.passport ?? { ...sampleHorse.passport, number: h.passportNo } }));
        if (operation.operationId === 'F1-J29') {
          d.horses = d.horses.map(h => ({ ...sampleHorse, ...h, passport: h.passport ?? { ...sampleHorse.passport, number: h.passportNo } }));
          if (d.draft) Object.assign(d.draft, { contractId: 'CONTRACT_001', requestId: 'REQUEST_001', versionNo: 1, contractStatus: 'DRAFT', versionStatus: 'DRAFT' });
        }
        if (['F1-J59', 'F1-J60'].includes(operation.operationId)) d.requestId ??= 'REQUEST_001';
        if (operation.operationId === 'F1-J23') example.value.data = { requestId: 'REQUEST_001', horses: [] };
        if (operation.operationId === 'F1-J30') example.value.data = { requestId: 'REQUEST_001', contractId: 'CONTRACT_001', versionNo: 1, status: 'DRAFT', savedAt: '2026-10-28T00:00:00Z' };
        if (operation.operationId === 'F1-J51') Object.assign(d, { contractId: 'CONTRACT_001', versionNo: 1, requestStatus: 'ACTIVATED', versionStatus: 'SIGNED', tripId: 'TRIP_001', tripStatus: 'PLANNING' });
        if (operation.operationId === 'F1-J40') { d.newDeadline ??= d.validUntil; delete d.validUntil; }
        if (operation.operationId === 'F1-J41') d.queued = true;
        if (operation.operationId === 'F1-J45') example.value.data = d.filter(p => p.type !== 'REFUND');
        if (['F1-J63', 'F1-J65'].includes(operation.operationId)) { d.updated ??= d.updatedCount ?? 0; delete d.updatedCount; }
      }
    }
  }
}
spec.paths['/customer/horses/selectable'].get.parameters = ['expectedTransportDate', 'expectedDeliveryDate'].map(name => ({ name, in: 'query', required: true, schema: date }));
spec.paths['/locations/cities'] = { get: { operationId: 'Runtime-Cities', parameters: ['q', 'country'].map(name => ({ name, in: 'query', required: true, schema: str })), responses: {
  '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/BackendCitiesResponse' } } } },
  '400': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
} } };
schemas.BackendCitiesResponse = envelope(arr(obj({ cityId: str, label: str, countryCode: str }, ['cityId', 'label', 'countryCode'])));
const search = spec.paths['/locations/search'].get;
search.parameters = search.parameters.filter(p => p.name !== 'cityId');
search.parameters.push({ name: 'cityId', in: 'query', required: true, schema: { type: 'string', minLength: 1 } });
// These routes do not exist in the current backend; the frontend must not call them.
delete spec.paths['/customer/requests/{requestId}/submit'];
delete spec.paths['/customer/requests/{requestId}/horses/{horseId}/documents'];
fs.writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
