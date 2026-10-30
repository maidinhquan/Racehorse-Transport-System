// Contract artifacts only; backend workflow and financial integration are not executed.
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
const spec = JSON.parse(read('flow5.openapi.json'));
const examples = JSON.parse(read('flow5.examples.json'));
const docs = read('FLOW5-API-JSON.md');
const flow = read('FLOW5.md');
const S = spec.components.schemas;
assert.equal(spec.openapi, '3.1.0');
assert.equal(spec.info.version, examples.contractVersion);
assert.equal(examples.scenarios.length, 40);
assert.equal(new Set(examples.scenarios.map(s => s.id)).size, 40);
let checks = 0;
function valid(schema, data, label) {
  const validate = ajv.compile({ ...schema, components: { schemas: S } });
  assert.ok(validate(data), `${label}: ${JSON.stringify(validate.errors)}`); checks++;
}
function invalid(name, value) {
  const validate = ajv.compile({ $ref: '#/components/schemas/' + name, components: { schemas: S } });
  assert.equal(validate(value), false, `${name} accepted invalid input: ${JSON.stringify(value)}`); checks++;
}
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.$ref) { assert.ok(node.$ref.startsWith('#/components/schemas/')); assert.ok(S[node.$ref.split('/').at(-1)]); checks++; }
  Object.values(node).forEach(walk);
}
walk(spec);
const operations = new Map();
for (const [url, methods] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(methods)) {
  assert.ok(!operations.has(op.operationId)); operations.set(op.operationId, op);
  assert.ok(docs.includes(`## ${op.operationId} — ${method.toUpperCase()} ${url}`));
  assert.ok(docs.includes(`| ${op.operationId} | ${method.toUpperCase()} |`));
  assert.ok(op['x-roles'].length);
  for (const match of url.matchAll(/{(\w+)}/g)) assert.ok(op.parameters.some(p => p.name === match[1] && p.in === 'path' && p.required));
  const body = op.requestBody?.content['application/json'];
  if (body) {
    valid(body.schema, body.example, op.operationId + ' request');
    const name = body.schema.$ref.split('/').at(-1);
    invalid(name, { ...body.example, actor: 'USER_999', status: 'RESOLVED' });
    for (const required of S[name].required) { const bad = structuredClone(body.example); delete bad[required]; invalid(name, bad); }
    if ('expectedVersion' in body.example) invalid(name, { ...body.example, expectedVersion: 0 });
  }
  if (method === 'get') assert.equal(op.requestBody, undefined);
  if (!op['x-read-only']) assert.ok(op.parameters.some(p => p.name === 'Idempotency-Key' && p.required));
  for (const [status, response] of Object.entries(op.responses)) {
    const json = response.content['application/json'];
    if (!json) { assert.ok(status.startsWith('2')); continue; }
    if (json.example) valid(json.schema, json.example, op.operationId + '/' + status);
    for (const [code, e] of Object.entries(json.examples ?? {})) { valid(json.schema, e.value, op.operationId + '/' + code); assert.equal(e.value.errorCode, code); }
  }
}
assert.equal(operations.size, 43);
assert.equal((docs.match(/^## F5-J/gm) ?? []).length, 43);
for (const match of docs.matchAll(/```json\n([\s\S]*?)\n```/g)) { JSON.parse(match[1]); checks++; }
for (const name of ['roadResourceFailure', 'airDelay']) valid({ $ref: '#/components/schemas/IncidentDetail' }, examples[name], name);
assert.equal(examples.roadResourceFailure.recovery.requiresManager, true);
assert.equal(examples.airDelay.recovery.content.flight.flightCode, 'EQ124');
const input = code => structuredClone(operations.get(code).requestBody.content['application/json'].example);
invalid('ReportInput', { ...input('F5-J03'), expectedExecutionVersion: 0 });
invalid('ReportInput', { ...input('F5-J03'), occurredAt: '2026-11-10T08:00:00Z' });
invalid('ReportInput', { ...input('F5-J03'), occurredAt: '2026-11-10 25:00' });
invalid('AssessmentInput', { ...input('F5-J07'), impacts: [] });
invalid('RecoveryInput', { ...input('F5-J14'), content: { ...input('F5-J14').content, customerAdditionalChargeVnd: 1 } });
invalid('RecoveryInput', { ...input('F5-J14'), content: { ...input('F5-J14').content, deliveryAddress: 'Đổi điểm giao' } });
invalid('RecoveryDecision', { ...input('F5-J17'), decision: 'FORCE_CONTINUE' });
invalid('ComplianceInput', { ...input('F5-J21'), area: 'HEALTH' });
invalid('VetInput', { ...input('F5-J22'), transportFitness: 'DRIVER_APPROVED' });
invalid('ExternalActionInput', { ...input('F5-J23'), evidenceFileIds: [] });
invalid('ContinuationInput', { ...input('F5-J26'), readinessVersion: '' });
invalid('CustomerReply', { ...input('F5-J32'), decision: 'AUTO_ACCEPT' });
invalid('ExternalAgreementInput', { ...input('F5-J33'), evidenceFileIds: [] });
invalid('TerminationInput', { ...input('F5-J37'), proposedRefundVnd: -1 });
invalid('TerminationReferInput', { ...input('F5-J39'), custodyEvidenceFileIds: [] });
assert.ok(!spec.paths['/manager/incidents/{incidentId}/status']);
assert.equal(spec['x-retired-operations'][0].errorCode, 'CONTRACT_SUPERSEDED');
for (const name of ['REPORTED', 'IN_PROGRESS', 'RESOLVED', 'CUSTOMER_AGREEMENT_REQUIRED', 'terminationSettlementAvailable', 'CONTRACT_SUPERSEDED']) assert.ok(flow.includes(name));
console.log(`Flow 5 contract valid: ${operations.size} operations, ${Object.keys(S).length} schemas, ${checks} checks; 40 acceptance targets (backend not executed).`);
