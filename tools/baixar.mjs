// Baixa imagens do wol.jw.org: node tools/baixar.mjs it-1/2020/436 ia/2013/85 ...
// Salva em img/wol/<pub>-<ano>-<n>.jpg
import { mkdir, writeFile, access } from 'node:fs/promises';
await mkdir('img/wol', { recursive: true });
for (const p of process.argv.slice(2)) {
  const f = `img/wol/${p.replace(/\//g, '-')}.jpg`;
  try { await access(f); continue; } catch {}
  const r = await fetch(`https://wol.jw.org/pt/wol/mp/r5/lp-t/${p}`, { headers: { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' } });
  if (!r.ok) { console.error('falhou', p); continue; }
  await writeFile(f, Buffer.from(await r.arrayBuffer()));
  console.log(f);
}
