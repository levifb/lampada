// Extrai texto bíblico (TNM Edição de Estudo), notas de rodapé, arte e áudio
// de cada capítulo DIRETO do jw.org. Uso: node tools/scrape.mjs 1-reis 2-reis
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS = {
  '1-reis': { num: 11, name: '1 Reis', chapters: 22 },
  '2-reis': { num: 12, name: '2 Reis', chapters: 25 },
  'jonas': { num: 32, name: 'Jonas', chapters: 4 },
  'daniel': { num: 27, name: 'Daniel', chapters: 12 },
};
const UA = { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' };
const base = (slug) => `https://www.jw.org/pt/biblioteca/biblia/biblia-de-estudo/livros/${slug}`;

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

async function get(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) return r.text();
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('falhou: ' + url);
}

function parseChapter(html, bookNum, ch) {
  const pre = `v${bookNum}${String(ch).padStart(3, '0')}`;
  // Corta da primeira ocorrência de versículo até o bloco de notas de rodapé.
  const start = html.indexOf(`id="${pre}001"`);
  const endFn = html.indexOf('class="footnotes"', start);
  const body = html.slice(start - 200, endFn > 0 ? endFn : undefined);
  const re = new RegExp(`<span class="verse" id="${pre}(\\d{3})">`, 'g');
  const marks = [...body.matchAll(re)];
  const verses = [];
  marks.forEach((m, i) => {
    let chunk = body.slice(m.index + m[0].length, i + 1 < marks.length ? marks[i + 1].index : undefined);
    // Novo parágrafo começa antes deste versículo?
    const prevGap = body.slice(i ? marks[i - 1].index : 0, m.index);
    const para = i === 0 || /class="parabreak"|<\/p>\s*<p/.test(prevGap.slice(-400));
    // Marca as notas de rodapé, remove referências cruzadas e o número do versículo.
    const fns = [];
    chunk = chunk
      .replace(/<a class="xrefLink[^>]*>.*?<\/a>/g, '')
      .replace(/<span class="chapterNum">.*?<\/span>|<sup class="verseNum">.*?<\/sup>/g, '')
      .replace(/<a class="footnoteLink"[^>]*#fn(\d+)'[^>]*>\*<\/a>/g, (_, id) => { fns.push(id); return `[[fn:${id}]]`; });
    const text = strip(chunk).replace(/\s+([,.;:!?”])/g, '$1').replace(/\[\[fn:(\d+)\]\]/g, '{$1}');
    verses.push({ n: +m[1], text, ...(para && i ? { p: true } : {}) });
  });
  const footnotes = {};
  for (const m of html.matchAll(/id="fn(\d+)">.*?<span class="">(.*?)<\/span><\/div>/g)) footnotes[m[1]] = strip(m[2]);
  const art = html.match(/cms-imgp\.jw-cdn\.org\/img\/p\/(\d+)\/univ\/art\/\1_univ_lsr_xl\.jpg/);
  return { verses, footnotes, art: art ? 'https://' + art[0] : null };
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function download(url, dest) {
  if (await exists(dest)) return;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('img ' + url);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
}

for (const slug of process.argv.slice(2)) {
  const b = BOOKS[slug];
  const audioJson = JSON.parse(await get(`https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?booknum=${b.num}&output=json&pub=nwt&fileformat=MP3&alllangs=0&langwritten=T&txtCMSLang=T`));
  const audio = {};
  for (const f of audioJson.files.T.MP3) audio[f.track] = f.file.url;
  const outlineHtml = await get(`${base(slug)}-conteudo/`);
  await writeFile(join(ROOT, 'tools', `.outline-${slug}.html`), outlineHtml);
  for (let ch = 1; ch <= b.chapters; ch++) {
    const url = `${base(slug)}/${ch}/`;
    const html = await get(url);
    const { verses, footnotes, art } = parseChapter(html, b.num, ch);
    const file = join(ROOT, 'data', slug, `${String(ch).padStart(2, '0')}.text.json`);
    await mkdir(dirname(file), { recursive: true });
    // A "arte" da página do capítulo é só o ícone genérico da Bíblia de estudo: não usamos.
    void art;
    await writeFile(file, JSON.stringify({ book: slug, chapter: ch, source: url, verses, footnotes, audio: audio[ch] || null }, null, 1));
    console.log(slug, ch, verses.length, 'versículos', art ? '🖼' : '');
  }
}
