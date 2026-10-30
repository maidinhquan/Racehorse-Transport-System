import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const require = createRequire(path.join(repo, 'frontend/package.json'));
const Ajv = require('ajv');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const spec = read(path.join(here, 'flow6.openapi.json'));
assert.deepEqual(spec, read(path.join(repo, 'frontend/src/contracts/flow6.openapi.json')), 'Frontend mirror drift');
const ajv = new Ajv({ allErrors: true, logger: false, unknownFormats: 'ignore' });
const root = 'flow6.schema.json';
ajv.addSchema({ $id: root, components: spec.components }, root);
const rewrite = value => Array.isArray(value) ? value.map(rewrite) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === '$ref' && v.startsWith('#/') ? root + v : rewrite(v)])) : value;
const validate = (schema, data, label) => {
  const check = ajv.compile(rewrite(schema));
  assert.ok(check(data), `${label}: ${ajv.errorsText(check.errors)}`);
};
const invalid = (name, data) => {
  const check = ajv.getSchema(`${root}#/components/schemas/${name}`);
  assert.equal(check(data), false, `${name} accepted invalid input ${JSON.stringify(data)}`);
};
const api = fs.readFileSync(path.join(repo, 'frontend/src/features/aftercare/api/flow6Api.ts'), 'utf8');
const types = fs.readFileSync(path.join(repo, 'frontend/src/features/aftercare/types/flow6.types.ts'), 'utf8');
const docs = fs.readFileSync(path.join(here, 'FLOW6-API-JSON.md'), 'utf8');
const ids = new Set();
let examples = 0;
let inputs = 0;
for (const name of Object.keys(spec.components.schemas)) {
  assert.ok(ajv.getSchema(`${root}#/components/schemas/${name}`), `Uncompilable ${name}`);
  assert.ok(types.includes(`export type ${name} = `), `Missing TS type ${name}`);
}
for (const [route, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    assert.ok(!ids.has(op.operationId), `Duplicate ${op.operationId}`);
    ids.add(op.operationId);
    assert.ok(api.includes(`'${op.operationId}'`), `SDK missing ${op.operationId}`);
    assert.ok(docs.includes(`## ${op.operationId} — ${method.toUpperCase()} ${route}`));
    assert.equal(op['x-implementation-status'], 'DESIGNED_NOT_IMPLEMENTED');
    const pathNames = [...route.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(op.parameters.filter(p => p.in === 'path').map(p => p.name).sort(), pathNames);
    if (method !== 'get') {
      assert.ok(op.parameters.some(p => p.in === 'header' && p.name === 'Idempotency-Key' && p.required));
    }
    const body = op.requestBody?.content['application/json'];
    if (body) {
      validate(body.schema, body.example, op.operationId + ' request');
      inputs++;
      const name = body.schema.$ref.split('/').at(-1);
      for (const required of spec.components.schemas[name].required) {
        const bad = structuredClone(body.example); delete bad[required];
        invalid(name, bad);
      }
      invalid(name, { ...body.example, actor: 'USER_999', status: 'CLOSED' });
    }
    for (const [status, response] of Object.entries(op.responses)) {
      const content = response.content['application/json'];
      if (!content) continue;
      const values = content.example ? [content.example] : Object.values(content.examples ?? {}).map(v => v.value);
      assert.ok(values.length, `${op.operationId} ${status}: no example`);
      for (const value of values) {
        validate(content.schema, value, `${op.operationId} ${status}`); examples++;
        const data = value.data;
        if (data?.settlement) {
          const s = data.settlement;
          assert.equal(s.netPayable, s.originalTotal - s.reductionTotal - s.waiverTotal);
          assert.equal(s.outstanding, Math.max(0, s.netPayable - s.verifiedDeposit - s.verifiedBalance));
          assert.equal(s.refundDue, Math.max(0, s.verifiedDeposit + s.verifiedBalance - s.netPayable - s.verifiedRefund));
          assert.equal(s.reductionTotal, s.adjustments.filter(a => a.kind === 'REDUCTION').reduce((n, a) => n + a.amount, 0));
          assert.equal(s.waiverTotal, s.adjustments.filter(a => a.kind === 'WAIVER').reduce((n, a) => n + a.amount, 0));
          if (data.acceptance.status !== 'ACCEPTED') assert.equal(data.acceptance.acceptedAt, null);
          if (data.phase === 'CLOSED') {
            assert.equal(s.outstanding, 0); assert.equal(s.refundDue, 0);
            assert.equal(s.pendingAdjustmentIds.length + s.pendingPaymentIds.length, 0);
            assert.ok(data.closure);
          }
        }
      }
    }
  }
}
assert.equal((api.match(/=> flow6Request</g) ?? []).length, ids.size, 'Extra/missing SDK operations');
invalid('AcceptanceInput', { expectedVersion: 1, statementVersion: 1, confirmed: false });
invalid('AcceptanceInput', { expectedVersion: 0, statementVersion: 1, confirmed: true });
invalid('PaymentInput', { expectedVersion: 1, invoiceVersion: 1, method: 'BANK_TRANSFER' });
invalid('PaymentInput', { expectedVersion: 1, invoiceVersion: 1, method: 'VNPAY', amount: 1 });
invalid('ProposalInput', { expectedVersion: 1, description: 'Giảm tiền', reductionAmount: -1, evidenceFileIds: [] });
invalid('ProposalInput', { expectedVersion: 1, description: 'Giảm tiền', reductionAmount: 1.5, evidenceFileIds: [] });
invalid('ExtensionInput', { expectedVersion: 1, newDueAt: '2026-11-24T10:00:00Z', reason: 'Gia hạn theo yêu cầu.' });
invalid('CloseInput', { expectedVersion: 1, mode: 'AUTO', reason: 'Tự động đóng đơn.' });
invalid('ComplaintInput', { expectedVersion: 1, kind: 'ISSUE', category: 'OTHER', title: 'Vấn đề', description: 'Kiểm tra lại', horseId: 'HORSE_001', evidenceFileIds: ['x', 'x'] });
assert.equal(spec['x-payment-verification'].browserCallable, false);
assert.ok(!Object.keys(spec.paths).some(p => /ipn|verify-payment|auto-close/.test(p)), 'No browser payment confirmation or auto-close endpoint');
const targets = read(path.join(here, 'flow6.examples.json'));
assert.equal(targets.contractVersion, spec.info.version);
assert.equal(targets.status, 'ACCEPTANCE_TARGETS_NOT_EXECUTED_BACKEND_TESTS');
assert.equal(targets.scenarios.length, 40);
assert.equal(new Set(targets.scenarios.map(s => s.id)).size, 40);
for (const [key, name] of [['handoverContext', 'HandoverContext'], ['awaitingAcceptance', 'Aftercare'], ['acceptedAwaitingPayment', 'Aftercare'], ['normalClosure', 'Aftercare']]) {
  validate({ $ref: '#/components/schemas/' + name }, targets[key], key);
}
assert.equal(targets.awaitingAcceptance.phase, 'AWAITING_ACCEPTANCE');
assert.equal(targets.acceptedAwaitingPayment.acceptance.status, 'ACCEPTED');
assert.equal(targets.normalClosure.phase, 'CLOSED');
for (const match of docs.matchAll(/```json\n([\s\S]*?)\n```/g)) JSON.parse(match[1]);
const handoverOperation = Object.values(spec.paths).flatMap(Object.values).find(op => op['x-client-name'] === 'completeHandover');
assert.ok(handoverOperation.description.includes('FINAL_ARRIVED') && handoverOperation.description.includes('Flow5'));
assert.ok(handoverOperation.responses['409'].content['application/json'].examples.HANDOVER_NOT_READY);
console.log(`Flow 6 contract OK: ${ids.size} operations, ${Object.keys(spec.components.schemas).length} schemas, ${inputs} JSON requests, ${examples} examples; mirror, SDK, negative payloads and 40 acceptance targets verified. Backend guards still require integration tests.`);
