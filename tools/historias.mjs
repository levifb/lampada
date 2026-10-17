// Baixa as ilustrações de documentos do wol.jw.org (histórias bíblicas etc.).
// Uso: node tools/historias.mjs <prefixo> <docIdInicial> <docIdFinal>
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const [, , pref, de, ate] = process.argv;
const UA = { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
await mkdir(`img/${pref}`, { recursive: true });
const arq = `tools/${pref}.json`;
let out = [];
try { out = JSON.parse(await readFile(arq, 'utf8')); } catch {}
for (let id = +de; id <= +ate; id++) {
  const url = `https://wol.jw.org/pt/wol/d/r5/lp-t/${id}`;
  const html = await (await fetch(url, { headers: UA })).text();
  const title = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const files = [];
  const vistos = new Set();
  for (const m of html.matchAll(/<img src="(\/pt\/wol\/mp\/[^"]+)"[^>]*alt="([^"]*)"/g)) {
    if (vistos.has(m[1])) continue; vistos.add(m[1]);
    const f = `img/${pref}/${id}-${files.length}.jpg`;
    const r = await fetch('https://wol.jw.org' + m[1], { headers: UA });
    await writeFile(f, Buffer.from(await r.arrayBuffer()));
    files.push({ img: f, alt: strip(m[2]), fonte: 'https://wol.jw.org' + m[1] });
  }
  const refs = [...new Set([...html.matchAll(/class="b"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => strip(m[1])))];
  out = out.filter((o) => o.id !== id).concat({ id, title, pagina: url, imgs: files, refs });
  console.log(id, title, files.map((f) => f.alt).join(' / '));
}
await writeFile(arq, JSON.stringify(out, null, 1));
