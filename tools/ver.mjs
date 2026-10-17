// Mostra o dossiê de um capítulo de forma compacta para curadoria.
import { readFileSync } from 'node:fs';
const [, , livro, cap, max = 900] = process.argv;
const d = JSON.parse(readFileSync(`tools/dossie/${livro}/${String(cap).padStart(2, '0')}.json`, 'utf8'));
const vistos = new Set();
d.forEach((x, i) => {
  if (vistos.has(x.source)) { console.log(`
#${i} [${x.verse}] = mesmo trecho`); return; }
  vistos.add(x.source);
  console.log(`\n#${i} [${x.verse}] ${x.pub} ${x.cite} — ${x.title}\n   ${x.source}`);
  console.log('   ' + x.text.slice(0, +max).replace(/\n/g, '\n   '));
  for (const im of x.imgs.filter((m) => m.near || x.imgs.length < 4)) console.log(`   🖼 ${im.near ? '*' : ' '} ${im.w}x${im.h} ${im.src} | ${im.alt} | ${im.cap.slice(0, 160)}`);
});
