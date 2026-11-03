import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function schemaToTs(schema) {
  if (!schema) return 'any';
  if (schema['$ref']) {
    return schema['$ref'].split('/').pop();
  }
  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }
  if (schema.enum) {
    return schema.enum.map(v => JSON.stringify(v)).join(' | ');
  }
  if (schema.anyOf) {
    return '(' + schema.anyOf.map(schemaToTs).join(' | ') + ')';
  }
  if (schema.type === 'string') {
    return 'string';
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return 'number';
  }
  if (schema.type === 'boolean') {
    return 'boolean';
  }
  if (schema.type === 'null') {
    return 'null';
  }
  if (schema.type === 'array') {
    return 'Array<' + schemaToTs(schema.items) + '>';
  }
  if (schema.type === 'object') {
    const props = schema.properties || {};
    const req = new Set(schema.required || []);
    const parts = [];
    for (const [k, v] of Object.entries(props)) {
      const opt = req.has(k) ? '' : '?';
      parts.push(`${k}${opt}: ${schemaToTs(v)}`);
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      parts.push(`[key: string]: ${schemaToTs(schema.additionalProperties)}`);
    } else if (parts.length === 0) {
      return 'Record<string, unknown>';
    }
    return '{ ' + parts.join('; ') + (parts.length ? ' ' : '') + '}';
  }
  return 'unknown';
}

function generateTypes(spec, flowName, sourcePath) {
  const lines = [
    `// Generated from ${sourcePath}. Do not edit by hand.`,
    `// These DTOs describe a target API contract for ${flowName}.`,
  ];
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    lines.push(`export type ${name} = ${schemaToTs(schema)};`);
  }
  return lines.join('\n') + '\n';
}

function generateEndpoints(spec, flowPrefix, exportName) {
  const lines = [
    `/**`,
    ` * ${exportName} endpoint registry — maps operationId → { method, path }`,
    ` */`,
    `export const ${exportName} = {`,
  ];
  const sorted = [];
  for (const [p, methods] of Object.entries(spec.paths)) {
    for (const [m, op] of Object.entries(methods)) {
      sorted.push({ id: op.operationId, method: m.toUpperCase(), path: p });
    }
  }
  sorted.sort((a, b) => a.id.localeCompare(b.id));
  for (const item of sorted) {
    const padId = `'${item.id}':`.padEnd(12, ' ');
    const padMethod = `'${item.method}',`.padEnd(9, ' ');
    lines.push(`  ${padId} { method: ${padMethod} path: '${item.path}' },`);
  }
  lines.push(`} as const;\n`);
  lines.push(`export type ${flowPrefix}OperationId = keyof typeof ${exportName};\n`);
  return lines.join('\n');
}

// Generate Flow 4
const f4Spec = JSON.parse(fs.readFileSync(path.join(root, 'src/contracts/flow4.openapi.json'), 'utf8'));
const f4TypesPath = path.join(root, 'src/features/tracking/types/flow4.types.ts');
fs.mkdirSync(path.dirname(f4TypesPath), { recursive: true });
fs.writeFileSync(f4TypesPath, generateTypes(f4Spec, 'Flow 4', 'contracts/API-Flow/Flow4/flow4.openapi.json'), 'utf8');

const f4EndpointsPath = path.join(root, 'src/features/tracking/api/flow4Endpoints.ts');
fs.mkdirSync(path.dirname(f4EndpointsPath), { recursive: true });
fs.writeFileSync(f4EndpointsPath, generateEndpoints(f4Spec, 'Flow4', 'flow4Endpoints'), 'utf8');

// Generate Flow 5
const f5Spec = JSON.parse(fs.readFileSync(path.join(root, 'src/contracts/flow5.openapi.json'), 'utf8'));
const f5TypesPath = path.join(root, 'src/features/incidents/types/flow5.types.ts');
fs.mkdirSync(path.dirname(f5TypesPath), { recursive: true });
fs.writeFileSync(f5TypesPath, generateTypes(f5Spec, 'Flow 5', 'contracts/API-Flow/Flow5/flow5.openapi.json'), 'utf8');

const f5EndpointsPath = path.join(root, 'src/features/incidents/api/flow5Endpoints.ts');
fs.mkdirSync(path.dirname(f5EndpointsPath), { recursive: true });
fs.writeFileSync(f5EndpointsPath, generateEndpoints(f5Spec, 'Flow5', 'flow5Endpoints'), 'utf8');

// Generate Flow 6 endpoints
const f6Spec = JSON.parse(fs.readFileSync(path.join(root, 'src/contracts/flow6.openapi.json'), 'utf8'));
const f6EndpointsPath = path.join(root, 'src/features/aftercare/api/flow6Endpoints.ts');
fs.writeFileSync(f6EndpointsPath, generateEndpoints(f6Spec, 'Flow6', 'flow6Endpoints'), 'utf8');

console.log('Generated types and endpoints for Flow 4, Flow 5, and Flow 6 endpoints.');

