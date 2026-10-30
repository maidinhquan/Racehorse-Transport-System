// Checks contract artifacts, not backend execution or medical/business outcomes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../frontend/package.json'));
const Ajv = require('ajv');
const ajv = new Ajv({ strict: false, allErrors: true });
const read = name => fs.readFileSync(path.join(here, name), 'utf8');
const spec = JSON.parse(read('flow4.openapi.json'));
const examples = JSON.parse(read('flow4.examples.json'));
const docs = read('FLOW4-API-JSON.md');
const flow = read('FLOW4.md');
const S = spec.components.schemas;
assert.equal(spec.openapi, '3.1.0');
assert.equal(spec.info.version, '1.0.0');
assert.equal(examples.contractVersion, spec.info.version);
assert.equal(examples.scenarios.length, 32);
assert.equal(new Set(examples.scenarios.map(x => x.id)).size, 32);
let checks = 0;
function valid(schema, data, label) {
  const validate = ajv.compile({ ...schema, components: { schemas: S } });
  assert.ok(validate(data), `${label}: ${JSON.stringify(validate.errors)}`);
  checks++;
}
function invalid(name, value) {
  const validate = ajv.compile({ $ref: '#/components/schemas/' + name, components: { schemas: S } });
  assert.equal(validate(value), false, `${name} accepted invalid input: ${JSON.stringify(value)}`);
  checks++;
}
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.$ref) {
    assert.ok(node.$ref.startsWith('#/components/schemas/'));
    assert.ok(S[node.$ref.split('/').at(-1)], `Missing ref ${node.$ref}`);
    checks++;
  }
  for (const value of Object.values(node)) walk(value);
}
walk(spec);
const operations = new Map();
for (const [url, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  assert.ok(!operations.has(op.operationId));
  operations.set(op.operationId, op);
  assert.ok(docs.includes(`## ${op.operationId} — ${method.toUpperCase()} ${url}`));
  assert.ok(docs.includes(`| ${op.operationId} | ${method.toUpperCase()} |`));
  assert.ok(op['x-roles'].length);
  for (const match of url.matchAll(/{(\w+)}/g)) assert.ok(op.parameters.some(p => p.name === match[1] && p.in === 'path' && p.required));
  const body = op.requestBody?.content['application/json'];
  if (body) {
    valid(body.schema, body.example, op.operationId + ' input');
    const name = body.schema.$ref.split('/').at(-1);
    invalid(name, { ...body.example, actor: 'USER_999' });
    invalid(name, { ...body.example, expectedVersion: 0 });
    for (const required of S[name].required) {
      const missing = structuredClone(body.example);
      delete missing[required];
      invalid(name, missing);
    }
  }
  if (method === 'get') assert.equal(op.requestBody, undefined);
  else assert.ok(op.parameters.some(p => p.name === 'Idempotency-Key' && p.required));
  for (const [status, response] of Object.entries(op.responses)) {
    const json = response.content['application/json'];
    if (!json) { assert.ok(status.startsWith('2')); continue; }
    if (json.example) valid(json.schema, json.example, op.operationId + '/' + status);
    for (const [code, example] of Object.entries(json.examples ?? {})) {
      valid(json.schema, example.value, op.operationId + '/' + status + '/' + code);
      assert.equal(example.value.errorCode, code);
    }
  }
}
assert.equal(operations.size, 35);
assert.equal((docs.match(/^## F4-J/gm) ?? []).length, operations.size);
for (const match of docs.matchAll(/```json\n([\s\S]*?)\n```/g)) { JSON.parse(match[1]); checks++; }
valid({ $ref: '#/components/schemas/Tracking' }, examples.road, 'ROAD fixture');
valid({ $ref: '#/components/schemas/Tracking' }, examples.air, 'AIR fixture');
assert.deepEqual(examples.air.milestones.map(m => m.kind), ['DEPARTED', 'AIRPORT_ORIGIN_ARRIVED', 'AIR_HANDOVER', 'AIR_DEPARTED', 'AIR_ARRIVED', 'AIR_RECEIVED', 'DEPARTED', 'FINAL_ARRIVED']);
assert.equal(examples.air.legs.length, 3);
assert.ok(examples.air.legs[0].assignedUserIds.every(id => !examples.air.legs[2].assignedUserIds.includes(id)));
assert.equal(examples.road.map.isGps, false);
assert.equal(examples.road.policy.lateMilestoneMinutes, null);
assert.equal(examples.road.milestones[1].kind, 'FINAL_ARRIVED');
assert.equal(examples.road.milestones[1].actions.canComplete, false);
const input = code => structuredClone(operations.get(code).requestBody.content['application/json'].example);
invalid('DepartureInput', { ...input('F4-J05'), approvedPlanVersion: 0 });
invalid('DepartureInput', { ...input('F4-J05'), acknowledgements: [] });
invalid('MilestoneInput', { ...input('F4-J06'), occurredAt: '2026-11-10T06:00:00Z' });
invalid('MilestoneInput', { ...input('F4-J06'), occurredAt: '2026-11-10 25:00' });
invalid('CorrectionInput', { ...input('F4-J08'), reason: ' ' });
invalid('CheckpointInput', { ...input('F4-J12'), decision: 'OVERRIDE' });
invalid('AirHandoverInput', { ...input('F4-J13'), horseIds: ['HORSE_001', 'HORSE_001'] });
invalid('AirHandoverInput', { ...input('F4-J13'), allHorsesChecked: false });
invalid('EtaDecision', { ...input('F4-J21'), decision: 'FORCE_APPROVE' });
invalid('HealthInput', { ...input('F4-J23'), temperatureC: 999 });
invalid('HealthInput', { ...input('F4-J23'), photoFileIds: ['blob:local-pretend-file'] });
invalid('VetInput', { ...input('F4-J25'), transportFitness: 'DRIVER_SAYS_OK' });
for (const name of ['FINAL_ARRIVED', 'AWAITING_HANDOVER', 'PENDING_MANAGER', 'VETERINARIAN_REQUIRED', 'CONTRACT_SUPERSEDED']) assert.ok(flow.includes(name));
assert.ok(!Object.keys(spec.paths).some(p => p.endsWith('/settlement') || p.endsWith('/acceptance')));
console.log(`Flow 4 contract valid: ${operations.size} operations, ${Object.keys(S).length} schemas, ${checks} checks; 32 acceptance targets (backend not executed).`);
