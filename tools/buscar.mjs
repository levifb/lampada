// Busca no jw.org (mesma API do campo de busca do site) e lista resultados com imagem.
// Uso: node tools/buscar.mjs "unção de Salomão" [all|publications|videos]
const [, , q, tipo = 'all'] = process.argv;
const token = await (await fetch('https://b.jw-cdn.org/tokens/jworg.jwt')).text();
const r = await fetch(`https://b.jw-cdn.org/apis/search/results/T/${tipo}?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } });
const j = await r.json();
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const walk = (lst) => { for (const x of lst || []) {
  if (x.type === 'item' && x.image?.url) console.log(`${strip(x.title)} | ${x.context || ''} | ${x.image.url} | ${Object.values(x.links || {})[0]}\n    ${strip(x.snippet).slice(0, 160)}`);
  walk(x.results);
} };
walk(j.results);
