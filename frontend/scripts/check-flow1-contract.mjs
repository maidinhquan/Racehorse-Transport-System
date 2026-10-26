import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'contracts/API-Flow/Flow1');
const feDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/contracts');
const rootSpecPath = path.join(dir, 'flow1.openapi.json');
const feSpecPath = path.join(feDir, 'flow1.openapi.json');
const specPath = fs.existsSync(rootSpecPath) ? rootSpecPath : feSpecPath;
if (fs.existsSync(rootSpecPath) && fs.existsSync(feSpecPath)) {
  assert.deepEqual(JSON.parse(fs.readFileSync(feSpecPath, 'utf8')), JSON.parse(fs.readFileSync(rootSpecPath, 'utf8')), 'frontend/src/contracts/flow1.openapi.json is not in sync with contracts/API-Flow/Flow1/flow1.openapi.json');
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const main = fs.existsSync(path.join(dir, 'FLOW1.md')) ? fs.readFileSync(path.join(dir, 'FLOW1.md'), 'utf8') : '';
const companion = fs.existsSync(path.join(dir, 'FLOW1-API-JSON.md')) ? fs.readFileSync(path.join(dir, 'FLOW1-API-JSON.md'), 'utf8') : '';
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
ajv.addSchema({ components: spec.components, $id: 'flow1' }, 'flow1');
let checked = 0;
for (const [url, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (main) assert(main.includes(`### ${op.operationId} — ${method.toUpperCase()} ${url}`), `Missing main endpoint ${op.operationId}`);
    if (companion) assert(companion.includes(`### ${op.operationId} — ${method.toUpperCase()} ${url}`), `Missing companion endpoint ${op.operationId}`);
    for (const [status, response] of Object.entries(op.responses)) {
      const media = response.content?.['application/json'];
      if (!media?.examples) continue;
      const check = ajv.compile({ $ref: 'flow1' + media.schema.$ref });
      for (const { value } of Object.values(media.examples)) {
        assert(check(value), `${op.operationId} response ${status}: ${JSON.stringify(check.errors)}`); checked++;
      }
    }
    const request = op.requestBody?.content?.['application/json'];
    if (request?.example) {
      const check = ajv.compile({ $ref: 'flow1' + request.schema.$ref });
      assert(check(request.example), `${op.operationId} request: ${JSON.stringify(check.errors)}`); checked++;
      assert(!check({ ...request.example, rowVersion: 'fake' }), `${op.operationId} accepted undeclared rowVersion`);
    }
  }
}
const validate = (name, value) => ajv.validate({ $ref: `flow1#/components/schemas/${name}` }, value);
assert(!validate('F1-J51Request', { versionNo: 0, otp: '482913' }));
assert(!validate('F1-J51Request', { versionNo: 1, otp: '00000X' }));
assert(!validate('F1-J39Request', { versionNo: 1, decision: 'RETURNED', text: 'Decision text' }));
assert(!validate('F1-J43Request', { method: 'BANK_TRANSFER' }));
assert(!spec.paths['/manager/payments/{paymentId}/confirm']);
assert(!spec.paths['/manager/payments/{paymentId}/reject']);
assert(!spec.components.schemas['F1-J47Request']);
assert(!spec.components.schemas['F1-J48Request']);
assert.equal(spec.components.schemas['F1-J43Request'].properties.method.enum.join(','), 'VNPAY');
assert(!spec.paths['/manager/contracts/{contractId}/refund/complete'].post.requestBody);
assert(spec.paths['/customer/requests'].post.parameters.some(p => p.in === 'header' && p.name === 'Idempotency-Key' && p.required));
const mutationOps = Object.values(spec.paths).flatMap(p => Object.values(p)).filter(op => op.requestBody?.content?.['application/json']);
if (main && companion) {
  // Verify Markdown copies stay identical per endpoint, not just heading counts.
  const split = text => new Map([...text.matchAll(/^### (F1-J\d+) .*?(?=^### F1-J|^## |^<!-- FLOW1_JSON_\d+_END -->|$(?![\s\S]))/gms)].map(m => [m[1], m[0].trim()]));
  const left = split(main), right = split(companion);
  for (const [id, block] of right) assert.equal(left.get(id), block, `Markdown drift: ${id}`);
}
const endpointCount = Object.values(spec.paths).reduce((n, paths) => n + Object.keys(paths).length, 0);
assert.equal(endpointCount, 65);
console.log(`Flow 1: ${endpointCount} endpoints, ${checked} JSON examples and ${mutationOps.length} request schemas validated; negative cases and Markdown parity passed.`);
