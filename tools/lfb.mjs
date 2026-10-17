// Baixa as ilustrações e referências das histórias 44–58 de
// "Aprenda com as Histórias da Bíblia" (wol.jw.org) — cobrem 1 e 2 Reis.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
await mkdir('img/lfb', { recursive: true });
const out = [];
for (let n = 44; n <= 58; n++) {
  const id = 1102016010 + n;
  const url = `https://wol.jw.org/pt/wol/d/r5/lp-t/${id}`;
  const html = await (await fetch(url, { headers: UA })).text();
  const title = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1]);
  const imgs = [...html.matchAll(/<img src="(\/pt\/wol\/mp\/[^"]+)"[^>]*alt="([^"]*)"/g)];
  const refs = [...new Set([...html.matchAll(/class="b"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => strip(m[1])))];
  const paras = [...html.matchAll(/<p[^>]*data-pid="\d+"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter(Boolean);
  const files = [];
  for (const [i, m] of imgs.entries()) {
    const f = `img/lfb/historia-${n}${i ? '-' + i : ''}.jpg`;
    const r = await fetch('https://wol.jw.org' + m[1], { headers: UA });
    await writeFile(f, Buffer.from(await r.arrayBuffer()));
    files.push({ img: f, alt: strip(m[2]), source: 'https://wol.jw.org' + m[1] });
  }
  out.push({ n, title, page: url, imgs: files, refs, paras });
  console.log(n, title, files.length, refs.slice(0, 4).join(' '));
}
await writeFile('tools/lfb.json', JSON.stringify(out, null, 1));
