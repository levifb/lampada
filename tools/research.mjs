// Monta um "dossiê" por capítulo a partir do Guia de Pesquisa para
// Testemunhas de Jeová (wol.jw.org): para cada versículo, as publicações
// citadas, os parágrafos exatos e as imagens desses trechos.
// Uso: node tools/research.mjs 1-reis 2-reis
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', '.cache');
const WOL = 'https://wol.jw.org';
const RSG = { '1-reis': 1204400, '2-reis': 1204401, 'jonas': 1204421, 'daniel': 1204416 };
const UA = { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' };

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&#x3D;/g, '=').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = (h) => decode(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([,.;:!?”)])/g, '$1').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(key, fn) {
  const f = join(CACHE, createHash('md5').update(key).digest('hex'));
  try { return await readFile(f, 'utf8'); } catch {}
  const v = await fn();
  await mkdir(CACHE, { recursive: true });
  await writeFile(f, v);
  return v;
}

const get = (url) => cached(url, async () => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: UA });
    if (r.ok) { await sleep(250); return r.text(); }
    await sleep(2000 * (i + 1));
  }
  throw new Error('falhou ' + url);
});

// /pc/ redireciona para /d/<doc>#h=<p1>:0-<p2>:0
const resolvePc = (pc) => cached('pc:' + pc, async () => {
  const r = await fetch(WOL + pc, { headers: UA, redirect: 'manual' });
  await sleep(150);
  return decode(r.headers.get('location') || '');
});

function parseRsg(html) {
  // Sequência de <p class="se"> (versículo) seguida de blocos su/sk.
  const out = [];
  let cur = null, pub = null;
  for (const m of html.matchAll(/<p[^>]*class="(se|su|sk)"[^>]*>([\s\S]*?)<\/p>/g)) {
    const [, cls, inner] = m;
    if (cls === 'se') { cur = { ref: strip(inner), refs: [] }; out.push(cur); pub = null; }
    else if (cls === 'su') {
      pub = strip(inner).replace(/,$/, '');
      const a = inner.match(/href="([^"]+)"/);
      if (a && cur && !/<\/a>\s*$/.test('')) { /* rótulo da publicação também pode ser link */ }
      if (a && cur) cur.refs.push({ pub, cite: '', pc: a[1] });
    } else if (cls === 'sk' && cur) {
      const a = inner.match(/href="([^"]+)"/);
      const cite = strip(inner);
      // Quando o "su" já trouxe o link, o primeiro "sk" é a citação dele.
      const last = cur.refs[cur.refs.length - 1];
      if (last && !last.cite && last.pub === pub && a && last.pc === a[1]) last.cite = cite;
      else cur.refs.push({ pub, cite, pc: a ? a[1] : null });
    }
  }
  return out;
}

function extractParas(docHtml, from, to) {
  const paras = [];
  const imgs = [];
  for (const m of docHtml.matchAll(/<(p|figure|h\d)[^>]*data-pid="(\d+)"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const pid = +m[2];
    if (pid < from || pid > to) continue;
    const t = strip(m[3]);
    if (t && m[1] !== 'figure') paras.push(t);
  }
  // Imagens do trecho (ou a imagem principal do artigo).
  for (const m of docHtml.matchAll(/<img src="(\/pt\/wol\/mp\/[^"]+)"[^>]*alt="([^"]*)"[^>]*width="(\d+)" height="(\d+)"/g)) {
    // Parágrafo mais próximo antes da imagem e a legenda logo depois dela.
    const before = docHtml.slice(Math.max(0, m.index - 4000), m.index);
    const pids = [...before.matchAll(/data-pid="(\d+)"/g)];
    const pid = pids.length ? +pids[pids.length - 1][1] : 0;
    const after = docHtml.slice(m.index, m.index + 3000);
    const capM = after.match(/<(?:figcaption|p)[^>]*>([\s\S]*?)<\/(?:figcaption|p)>/);
    imgs.push({ pid, src: WOL + m[1], alt: decode(m[2]), w: +m[3], h: +m[4],
      cap: capM ? strip(capM[1]).slice(0, 400) : '', near: pid >= from - 3 && pid <= to + 3 });
  }
  return { paras, imgs };
}

function docTitle(html) {
  return decode((html.match(/<title>(.*?)<\/title>/) || [, ''])[1]).replace(/\s*—\s*BIBLIOTECA ON-LINE.*$/, '');
}

for (const slug of process.argv.slice(2)) {
  const rsg = parseRsg(await get(`${WOL}/pt/wol/d/r5/lp-t/${RSG[slug]}`));
  const byChapter = {};
  for (const e of rsg) {
    const ch = +e.ref.split(':')[0];
    if (!ch) continue;
    (byChapter[ch] ||= []).push(e);
  }
  for (const [ch, entries] of Object.entries(byChapter)) {
    const dossier = [];
    for (const e of entries) {
      for (const r of e.refs) {
        if (!r.pc) continue;
        const loc = await resolvePc(r.pc);
        const m = loc.match(/\/d\/r5\/lp-t\/(\d+)(?:#h=(\d+):\d+-(\d+):\d+)?/);
        if (!m) continue;
        const url = `${WOL}/pt/wol/d/r5/lp-t/${m[1]}`;
        const html = await get(url);
        const from = m[2] ? +m[2] : 0, to = m[3] ? +m[3] : 9999;
        const { paras, imgs } = extractParas(html, from, to);
        dossier.push({ verse: e.ref, pub: r.pub, cite: r.cite, title: docTitle(html),
          source: `${url}${m[2] ? `#h=${m[2]}:0-${m[3]}:0` : ''}`,
          text: paras.join('\n').slice(0, 2500), imgs: imgs.filter((i) => i.near).concat(imgs.filter((i) => !i.near).slice(0, 2)) });
      }
    }
    const f = join(ROOT, 'tools', 'dossie', slug, `${String(ch).padStart(2, '0')}.json`);
    await mkdir(dirname(f), { recursive: true });
    await writeFile(f, JSON.stringify(dossier, null, 1));
    console.log(slug, ch, dossier.length, 'trechos');
  }
}
