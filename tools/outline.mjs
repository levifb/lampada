// Lê o "Conteúdo do Livro" (jw.org, TNM Edição de Estudo) salvo pelo scrape.mjs
// e gera data/<livro>/outline.json: { "1": [{ t, from, to }] }
import { readFile, writeFile } from 'node:fs/promises';
for (const slug of process.argv.slice(2)) {
  const html = await readFile(`tools/.outline-${slug}.html`, 'utf8');
  const lines = html.replace(/<\/(li|p|h\d|div)>/g, '$&\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = {};
  let ch = 0;
  for (const l of lines) {
    if (/^\d+$/.test(l) && +l === ch + 1) { ch = +l; out[ch] = []; continue; }
    const m = ch && l.match(/^(.+?) \((\d+)(?:[-,] ?(\d+))?\)$/);
    if (m) out[ch].push({ t: m[1], from: +m[2], to: +(m[3] || m[2]) });
  }
  await writeFile(`data/${slug}/outline.json`, JSON.stringify(out, null, 1));
  console.log(slug, Object.keys(out).length, 'capítulos');
}
