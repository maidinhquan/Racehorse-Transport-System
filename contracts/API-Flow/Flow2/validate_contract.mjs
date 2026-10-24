import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(dir, '../../../frontend/package.json'));
const Ajv = require('ajv');
const read = name => fs.readFileSync(path.join(dir, name), 'utf8');
const spec = JSON.parse(read('flow2.openapi.json'));
const main = read('FLOW2.md');
const companion = read('FLOW2-API-JSON.md');
// The installed Ajv 6 uses draft-07. Translate only tuple syntax in a test copy;
// the published contract remains OpenAPI 3.1 / JSON Schema 2020-12.
const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  if (result.prefixItems) {
    result.items = result.prefixItems;
    result.additionalItems = false;
    delete result.prefixItems;
  }
  return result;
};
const ajv = new Ajv({ allErrors: true, unknownFormats: 'ignore', logger: false });
ajv.addSchema({ $id: 'flow2', components: normalize(spec.components) }, 'flow2');
const validator = ref => ajv.compile({ $ref: 'flow2' + ref });
const validate = (name, data) => validator('#/components/schemas/' + name)(data);
for (const name of Object.keys(spec.components.schemas)) validator('#/components/schemas/' + name);
let checked = 0;
let operations = 0;
const ids = new Set();
for (const [url, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    operations++;
    assert(!ids.has(op.operationId)); ids.add(op.operationId);
    const heading = `### ${op.operationId} — ${method.toUpperCase()} ${url}`;
    assert(main.includes(heading) && companion.includes(heading), `Missing ${heading}`);
    for (const [status, response] of Object.entries(op.responses)) {
      const media = response.content?.['application/json'];
      if (!media) continue;
      const check = validator(media.schema.$ref);
      for (const { value } of Object.values(media.examples)) {
        assert(check(value), `${op.operationId} ${status}: ${JSON.stringify(check.errors)}`);
        checked++;
      }
    }
    const body = op.requestBody;
    const json = body?.content?.['application/json'];
    const ref = json?.schema.$ref ?? body?.['x-metadata-schema']?.$ref;
    const example = json?.example ?? body?.['x-metadata-example'];
    if (ref) {
      const check = validator(ref);
      assert(check(example), `${op.operationId} body: ${JSON.stringify(check.errors)}`);
      assert(!check({ ...example, rowVersion: 'fake' }), `${op.operationId} undeclared field accepted`);
      checked++;
    }
  }
}
assert.equal(operations, 52);
for (const [name, fixture] of Object.entries(JSON.parse(read('flow2.examples.json')))) {
  assert(validate(fixture.schema, fixture.data), `Invalid fixture ${name}`); checked++;
}
const endpointText = main.split('<!-- FLOW2_ENDPOINTS_START -->')[1].split('<!-- FLOW2_ENDPOINTS_END -->')[0].trim();
assert.equal(endpointText, companion.split('## Payload theo endpoint')[1].trim(), 'Endpoint chapters drifted');
for (const text of [main, companion]) {
  for (const match of text.matchAll(/```json\s*\n([\s\S]*?)```/g)) JSON.parse(match[1]);
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (!/^(https?:|#)/.test(match[1])) assert(fs.existsSync(path.resolve(dir, match[1])), `Broken link ${match[1]}`);
  }
}
const copy = name => structuredClone(JSON.parse(read('flow2.examples.json'))[name].data);
assert(!validate('InsuranceWrite', { insurer: 'A', policy: 'B', validFrom: '2026-11-20', validTo: '2026-11-22', coverage: -1, currency: 'VND' }));
assert(!validate('InsuranceWrite', { insurer: 'A', policy: 'B', validFrom: '2026-11-20', validTo: '2026-11-22', coverage: 100, currency: 'USD' }));
assert(!validate('F2-J51Request', { routeVersion: 0, resourceVersion: 3, flightVersion: 1 }));
assert(!validate('F2-J51Request', { routeVersion: 1, resourceVersion: 3, flightVersion: 1, canApprove: true }));
assert(!validate('F2-J15Request', { key: 'passport', scope: 'HORSE_001', documentVersion: 0, decision: 'APPROVED', remark: '' }));
assert(!validate('F2-J13Request', { pkgId: 'VN_JP_AIR' }));
assert(!validate('Flight', { status: 'APPROVED' }));
assert(!validate('StopWrite', { id: 'ROUTE_SEGMENT_001', name: 'A', type: 'ORIGIN', country: 'VN', plannedAt: '2026-11-20 08:00', lat: 91, lng: 100, checkpointId: null }));
assert(validate('F2-J15Request', { key: 'invite', scope: 'request', documentVersion: 1, decision: 'APPROVED', remark: '' }));
const ready = copy('readiness-air-ready');
assert(ready.canApprove && ready.checks.length === 7 && ready.checks.every(c => c.ok));
const empty = copy('empty-checklist-blocked');
assert(empty.total === 0 && empty.status === 'NOT_READY' && empty.needs > 0);
const confirm = spec.paths['/coordinator/trips/{tripId}/resources/confirm'].post;
const trip = confirm.responses['200'].content['application/json'].examples.success.value.data;
const actors = Object.values(trip.legs).flatMap(l => Object.values(l.crew));
assert.equal(new Set(actors).size, 6);
assert(Object.values(trip.legs).every(l => l.vehicleId && Object.keys(l.crew).length === 3));
assert.equal(trip.flight.status, 'BOOKED');
assert(!validate('Flight', { ...trip.flight, status: 'APPROVED' }));
assert(!validate('CoordinatorTrip', { ...trip, requestId: undefined }));
assert(!validate('F2-J15Request', { key: 'passport', scope: 'USER_001', documentVersion: 1, decision: 'APPROVED', remark: '' }));
console.log(`Flow 2: ${operations} operations, ${Object.keys(spec.components.schemas).length} schemas, ${checked} examples passed; negative cases, branch checks and Markdown parity passed.`);
