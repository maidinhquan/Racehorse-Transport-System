// Contract/schema validation only. This does not execute backend business rules.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const require = createRequire(path.join(repo, 'frontend/package.json'));
const Ajv = require('ajv');
const spec = JSON.parse(fs.readFileSync(path.join(here, 'flow3.openapi.json'), 'utf8'));
const examples = JSON.parse(fs.readFileSync(path.join(here, 'flow3.examples.json'), 'utf8'));
const docs = fs.readFileSync(path.join(here, 'FLOW3-API-JSON.md'), 'utf8');
const flow = fs.readFileSync(path.join(here, 'FLOW3.md'), 'utf8');
assert.equal(spec.openapi, '3.1.0');
assert.equal(spec.info.version, '2.0.0');
assert.equal(examples.contractVersion, spec.info.version);
assert.equal(examples.status, 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS');
const ajv = new Ajv({ allErrors: true, logger: false, unknownFormats: 'ignore' });
const root = 'flow3.schema.json';
ajv.addSchema({ $id: root, components: spec.components }, root);
const rewrite = x => Array.isArray(x) ? x.map(rewrite) : x && typeof x === 'object'
  ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === '$ref' && v.startsWith('#/') ? root + v : rewrite(v)])) : x;
let checks = 0;
const valid = (schema, value, label) => {
  const validate = ajv.compile(rewrite(schema));
  assert.ok(validate(value), `${label}: ${ajv.errorsText(validate.errors)}`);
  checks++;
};
const invalid = (name, value) => {
  const validate = ajv.getSchema(`${root}#/components/schemas/${name}`);
  assert.equal(validate(value), false, `${name} accepted invalid ${JSON.stringify(value)}`);
  checks++;
};
const resolve = schema => schema.$ref ? spec.components.schemas[schema.$ref.split('/').at(-1)] : schema;
for (const name of Object.keys(spec.components.schemas)) {
  assert.ok(ajv.getSchema(`${root}#/components/schemas/${name}`), `Schema not compilable: ${name}`);
}
const operationIds = new Set();
for (const [url, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    assert.ok(!operationIds.has(op.operationId), `Duplicate ${op.operationId}`);
    operationIds.add(op.operationId);
    assert.equal(op['x-implementation-status'], 'DESIGNED_NOT_IMPLEMENTED');
    assert.ok(op['x-roles'].length);
    assert.ok(docs.includes(`## ${op.operationId} — ${method.toUpperCase()} ${url}`));
    const pathParams = [...url.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(op.parameters.filter(p => p.in === 'path').map(p => p.name).sort(), pathParams);
    for (const p of op.parameters) {
      if (p.schema.example !== undefined) valid(p.schema, p.schema.example, `${op.operationId} param ${p.name}`);
    }
    if (['get', 'delete'].includes(method)) assert.equal(op.requestBody, undefined);
    if (method !== 'get' && op.operationId !== 'F3-J07') {
      assert.ok(op.parameters.some(p => p.in === 'header' && p.name === 'Idempotency-Key' && p.required));
    }
    if (method === 'delete') assert.ok(op.parameters.some(p => p.in === 'query' && p.name === 'expectedVersion' && p.required));
    const body = op.requestBody?.content['application/json'];
    if (body) {
      valid(body.schema, body.example, op.operationId + ' input');
      const schema = resolve(body.schema);
      const name = body.schema.$ref.split('/').at(-1);
      for (const required of schema.required) {
        const missing = structuredClone(body.example); delete missing[required];
        invalid(name, missing);
      }
      invalid(name, { ...body.example, actor: 'USER_999', status: 'APPROVED' });
      if ('expectedVersion' in body.example) invalid(name, { ...body.example, expectedVersion: 0 });
      if (schema.properties.decision) {
        invalid(name, { ...body.example, decision: 'RETURN' });
        invalid(name, { ...body.example, decision: 'RETURN', reason: 'x' });
        valid(body.schema, { ...body.example, decision: 'RETURN', reason: 'Cần điều chỉnh phương án' }, op.operationId + ' return');
      }
    }
    for (const [status, response] of Object.entries(op.responses)) {
      const json = response.content['application/json'];
      if (!json) {
        assert.equal(op.operationId, 'F3-J52');
        continue;
      }
      const values = json.example ? [json.example] : Object.values(json.examples).map(x => x.value);
      assert.ok(values.length);
      for (const value of values) valid(json.schema, value, `${op.operationId} ${status}`);
      if (status.startsWith('2') && method !== 'get' && op.operationId !== 'F3-J07' && body) {
        const data = json.example.data;
        if (data.binding) assert.ok(data.binding.version > body.example.expectedVersion, `${op.operationId} did not advance revision`);
      }
    }
  }
}
assert.equal(operationIds.size, 52);
for (const retired of spec['x-retired-operations']) assert.ok(!operationIds.has(retired.operationId));
assert.ok(flow.includes('ROAD') && flow.includes('AIR') && flow.includes('trước submit'));
for (const [name, value] of [
  ['TruckProfile', { vehicleId: 'VEHICLE_001', heightM: 3.8, widthM: 2.5, lengthM: 10, currentT: 12, grossT: 18, axleT: 4 }],
  ['BookingInput', { expectedVersion: 1, planVersion: 1, flightVersion: 1, bookingRef: 'EQA-001', confirmedHorses: 2, acknowledged: true, source: 'PARTNER_REFERENCE', note: '', evidenceFileId: null }],
]) {
  valid({ $ref: '#/components/schemas/' + name }, value, name);
  if (name === 'TruckProfile') for (const key of ['heightM', 'widthM', 'lengthM', 'currentT', 'grossT', 'axleT']) invalid(name, { ...value, [key]: 0 });
  if (name === 'BookingInput') {
    for (const count of [0, 5, 2.5]) invalid(name, { ...value, confirmedHorses: count });
    invalid(name, { ...value, acknowledged: false });
    invalid(name, { ...value, bookingRef: 'abc' });
    invalid(name, { ...value, source: 'REALTIME_AIRLINE_API' });
  }
}
valid({ $ref: '#/components/schemas/PlanDraftInput' }, examples.road.draftRequest, 'ROAD request fixture');
valid({ $ref: '#/components/schemas/Routing' }, examples.road.routing, 'ROAD route fixture');
valid({ $ref: '#/components/schemas/Plan' }, examples.air.approvedPlan, 'AIR approved fixture');
valid({ $ref: '#/components/schemas/Context' }, examples.air.contextAfterApproval, 'AIR context fixture');
const air = examples.air.approvedPlan;
assert.equal(air.resources.length, 2);
assert.deepEqual(air.resources.map(x => x.leg), ['outbound', 'inbound']);
assert.equal(new Set(air.resources.map(x => x.vehicleId)).size, 2);
assert.equal(new Set(air.resources.flatMap(x => Object.values(x.crew))).size, 6);
for (const resource of air.resources) assert.equal(resource.truckProfile.vehicleId, resource.vehicleId);
const airports = air.stops.map((s, i) => s.type === 'AIRPORT' ? i : -1).filter(i => i >= 0);
assert.equal(airports.length, 2);
assert.equal(airports[1], airports[0] + 1);
assert.ok(air.eta <= examples.air.contextAfterApproval.deliveryDeadline);
assert.equal(air.flight.service.arriveLocal, '2026-11-10 22:30');
assert.equal(air.flight.service.arriveZone, 'Asia/Tokyo');
assert.equal(air.flight.service.arriveAt, '2026-11-10 20:30');
assert.equal(air.routing.provider, 'HERE_TRUCK');
assert.equal(air.routing.truckVerified, true);
assert.equal(air.routing.flyMin, 330);
const scenarioIds = new Set(examples.scenarios.map(s => s.id));
assert.equal(scenarioIds.size, 37);
for (const scenario of examples.scenarios) assert.ok(scenario.given && scenario.when.length && scenario.then.length && scenario.reason);
for (const id of ['parallel-preparation', 'road-submit-missing-confirm', 'air-no-booking-before-approval', 'scope-and-actor',
  'active-trip-resource-race', 'pickup-consent', 'catalog-changed', 'ready-independent-versions', 'provider-down']) assert.ok(scenarioIds.has(id));
console.log(`PASS: ${operationIds.size} operations, ${Object.keys(spec.components.schemas).length} schemas, ${checks} schema/example checks, ${scenarioIds.size} acceptance targets. Backend tests were not executed.`);
