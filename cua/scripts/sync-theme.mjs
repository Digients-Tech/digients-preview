import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const css = read('../../web/src/index.css');
const root = css.match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
const start = css.indexOf('/* ===================== login ');
const end = css.indexOf('/* ===================== video player', start);
if (!root || start < 0 || end < 0) throw new Error('Production portal token/login source changed; review the CUA theme adapter.');
const generated = new Map([
  ['../portal-tokens.css', root],
  ['../portal-login.css', css.slice(start, end).trim()],
]);
for (const [name, contents] of generated) {
  const output = `/* Generated from web/src/index.css by cua/scripts/sync-theme.mjs. */\n${contents}\n`;
  if (process.argv.includes('--check')) {
    if (read(name) !== output) throw new Error(`Theme drift: ${fileURLToPath(new URL(name, import.meta.url))}`);
  } else writeFileSync(new URL(name, import.meta.url), output);
}
console.log('CUA portal theme matches the production source.');
