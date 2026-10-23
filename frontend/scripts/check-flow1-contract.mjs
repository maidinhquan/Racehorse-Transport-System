import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'contracts/API-Flow/Flow1');
const spec = JSON.parse(fs.readFileSync(path.join(dir, 'flow1.openapi.json'), 'utf8'));
const main = fs.readFileSync(path.join(dir, 'FLOW1.md'), 'utf8');
const companion = fs.readFileSync(path.join(dir, 'FLOW1-API-JSON.md'), 'utf8');
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
ajv.addSchema({ ...spec, $id: 'flow1' }, 'flow1');
let checked = 0;
for (const [url, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    assert(main.includes(`### ${op.operationId} — ${method.toUpperCase()} ${url}`), `Missing main endpoint ${op.operationId}`);
    assert(companion.includes(`### ${op.operationId} — ${method.toUpperCase()} ${url}`), `Missing companion endpoint ${op.operationId}`);
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
assert(!validate('F1-J47Request', { confirmedAmount: -1, transactionCode: 'REF', receivedAt: '2026-10-23 09:20', note: '' }));
const mutationOps = Object.values(spec.paths).flatMap(p => Object.values(p)).filter(op => op.requestBody?.content?.['application/json']);
assert.equal(Object.values(spec.paths).reduce((n, p) => n + Object.keys(p).length, 0), 66);
// Verify Markdown copies stay identical per endpoint, not just heading counts.
const split = text => new Map([...text.matchAll(/^### (F1-J\d+) .*?(?=^### F1-J|^## |^<!-- FLOW1_JSON_\d+_END -->|$(?![\s\S]))/gms)].map(m => [m[1], m[0].trim()]));
const left = split(main), right = split(companion);
for (const [id, block] of right) assert.equal(left.get(id), block, `Markdown drift: ${id}`);
console.log(`Flow 1: 66 endpoints, ${checked} JSON examples and ${mutationOps.length} request schemas validated; negative cases and Markdown parity passed.`);
