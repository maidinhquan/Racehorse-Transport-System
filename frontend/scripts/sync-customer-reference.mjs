import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import postcss from 'postcss';

const source = process.argv[2];
if (!source) throw new Error('Provide the path to the reference HTML.');
const html = fs.readFileSync(source, 'utf8');
const scope = '.customer-html-reference';
const assets = ['assets/css/portal.css', 'customer-consolidated-horses', 'customer-specialist-doc-sync-ui'];
const css = assets.map(asset => {
  const block = [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)].find(([, attrs]) => attrs.includes(`data-cbn-source="${asset}"`));
  if (!block) throw new Error(`Missing reference asset: ${asset}`);
  const root = postcss.parse(block[2]);
  root.walkRules(rule => {
    if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    const selectors = postcss.list.comma(rule.selector).filter(s => !['body', 'html'].includes(s.trim()));
    if (!selectors.length) { rule.remove(); return; }
    rule.selector = selectors.map(s => s.trim() === ':root' ? scope : `${scope} ${s}`).join(', ');
  });
  return `/* Source asset: ${asset} */\n${root.toString()}`;
}).join('\n');
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/features/customer/pages/create-request/CustomerHtmlReference.css');
fs.writeFileSync(target, `/* Extracted from ${path.basename(source)}.\n   SHA256: ${crypto.createHash('sha256').update(html).digest('hex')}\n   Original declarations preserved; selectors scoped to the Customer wizard.\n   Regenerate with: node scripts/sync-customer-reference.mjs <reference.html> */\n${css}\n`, 'utf8');
console.log(`Extracted ${assets.length} original style blocks.`);
