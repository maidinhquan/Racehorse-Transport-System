// Verify original feature/quan rendering structure and CSS without snapshotting API data.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const ts = require('../../frontend/node_modules/typescript');
const root = path.resolve(__dirname, '../..');
const ref = '17687eedd40ec02ced54bf45df826fa5916e977c';
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'frontend'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
function signature(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows = [];
  function visit(n) {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const attrs = n.attributes.properties.filter(a => ts.isJsxAttribute(a) && ['className', 'style'].includes(a.name.getText(ast)))
        .map(a => a.getText(ast).replace(/\s+/g, ''));
      rows.push([n.tagName.getText(ast), attrs]);
    }
    ts.forEachChild(n, visit);
  }
  visit(ast); return rows;
}
let css = 0, components = 0;
for (const file of files) {
  if (!file.endsWith('.css') && (!file.endsWith('.tsx') || file.endsWith('/AppRouter.tsx'))) continue;
  const original = execFileSync('git', ['show', ref + ':' + file], { cwd: root });
  const current = fs.readFileSync(path.join(root, file));
  if (file.endsWith('.css')) { assert.deepEqual(current, original, file + ': CSS differs from feature/quan'); css++; }
  else { assert.deepEqual(signature(current.toString(), file), signature(original.toString(), file), file + ': JSX tags/className/style differ from feature/quan'); components++; }
}
const extra = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'frontend/src'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
for (const file of extra) {
  if (!file.endsWith('.tsx') || !fs.existsSync(path.join(root, file)) || files.includes(file) || file.endsWith('.test.tsx') || file.endsWith('/auth/RequireCustomer.tsx')) continue;
  assert.fail('Created UI component outside feature/quan: ' + file);
}
console.log(`PASS original feature/quan: ${css} CSS files byte-identical; ${components} TSX files preserve JSX tags/className/style; no replacement pages.`);
