// Busca no wol.jw.org e lista documentos com imagens cujo alt contém o termo.
// Uso: node tools/wolbusca.mjs "rainha de Sabá" [termoNoAlt]
const [, , q, altq] = process.argv;
const UA = { 'User-Agent': 'Mozilla/5.0 (estudo pessoal)' };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const h = await (await fetch(`https://wol.jw.org/pt/wol/s/r5/lp-t?q=${encodeURIComponent(q)}&p=par&r=occ&st=a`, { headers: UA })).text();
const ids = [...new Set([...h.matchAll(/href="\/pt\/wol\/d\/r5\/lp-t\/(\d+)\?/g)].map((m) => m[1]))].slice(0, 40);
for (const id of ids) {
  const d = await (await fetch(`https://wol.jw.org/pt/wol/d/r5/lp-t/${id}`, { headers: UA })).text();
  const title = strip((d.match(/<title>(.*?) &mdash;/) || [, ''])[1]);
  const imgs = [...d.matchAll(/<img src="\/pt\/wol\/mp\/r5\/lp-t\/([^"]+)"[^>]*alt="([^"]*)"/g)].filter((m) => !altq || m[2].toLowerCase().includes(altq.toLowerCase()));
  if (imgs.length) { console.log(id, title); imgs.forEach((m) => console.log('   ', m[1], '|', strip(m[2]).slice(0, 180))); }
}
