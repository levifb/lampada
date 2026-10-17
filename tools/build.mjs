// 1) Confere que TODA fonte citada nos dados é jw.org / wol.jw.org / jw-cdn.org.
// 2) Gera data/precache.json (lista para o modo offline).
// 3) Atualiza a versão do cache no sw.js quando algo muda.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const PERMITIDO = /^https:\/\/([a-z0-9-]+\.)*(jw\.org|jw-cdn\.org)(\/|$)/;

async function arquivos(dir) {
  const out = [];
  for (const e of await readdir(join(ROOT, dir), { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await arquivos(p)); else out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

const erros = [];
function checarUrls(obj, onde) {
  if (typeof obj === 'string') {
    if (/^https?:\/\//.test(obj) && !PERMITIDO.test(obj)) erros.push(`${onde}: ${obj}`);
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) checarUrls(v, `${onde}.${k}`);
  }
}

const dados = (await arquivos('data')).filter((f) => f.endsWith('.json') && !f.endsWith('precache.json'));
const imgsUsadas = new Set();
for (const f of dados) {
  const j = JSON.parse(await readFile(join(ROOT, f), 'utf8'));
  checarUrls(j, f);
  JSON.stringify(j).replace(/"(img\/[^"]+)"/g, (_, p) => imgsUsadas.add(p));
}
for (const p of imgsUsadas) {
  try { await stat(join(ROOT, p)); } catch { erros.push(`imagem não existe: ${p}`); }
}
if (erros.length) {
  console.error('✗ Problemas encontrados:\n  ' + erros.join('\n  '));
  process.exit(1);
}

// Índice de quais capítulos já têm estudo (o app não pede arquivos que não existem).
const estudos = dados.filter((f) => f.endsWith('.study.json')).map((f) => f.replace(/^data\/(.+)\/0?(\d+)\.study\.json$/, '$1/$2'));
await writeFile(join(ROOT, 'data/estudos.json'), JSON.stringify(estudos));
const lista = ['data/estudos.json', ...dados, ...imgsUsadas, ...(await arquivos('icons')).filter((f) => f.endsWith('.png'))].sort();
await writeFile(join(ROOT, 'data/precache.json'), JSON.stringify(lista));

const h = createHash('md5');
for (const f of [...lista, 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/data.js']) h.update(await readFile(join(ROOT, f)));
const versao = 'lampada-' + h.digest('hex').slice(0, 8);
const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');
await writeFile(join(ROOT, 'sw.js'), sw.replace(/const VERSAO = '[^']+'/, `const VERSAO = '${versao}'`));
console.log(`✓ ${dados.length} arquivos de dados, ${imgsUsadas.size} imagens, todas as fontes em jw.org. Cache: ${versao}`);
