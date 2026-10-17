// Mostra trechos específicos do dossiê: node tools/trecho.mjs 1-reis 17 1 3 5
import { readFileSync } from 'node:fs';
const [, , livro, cap, ...idx] = process.argv;
const d = JSON.parse(readFileSync(`tools/dossie/${livro}/${String(cap).padStart(2, '0')}.json`, 'utf8'));
for (const i of idx) { const x = d[+i]; console.log(`\n#${i} [${x.verse}] ${x.title} — ${x.source}\n${x.text}`); }
