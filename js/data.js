// Carrega o conteúdo (tudo extraído de jw.org / wol.jw.org) dos arquivos JSON locais.
const cache = new Map();

async function json(url, opcional = false) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) { if (opcional) return null; throw new Error(url); }
    return r.json();
  }).catch((e) => { if (opcional) return null; throw e; });
  cache.set(url, p);
  return p;
}

const pad = (n) => String(n).padStart(2, '0');

export const livros = () => json('data/books.json');
export const reis = () => json('data/reis.json');
export const roteiro = (livro) => json(`data/${livro}/outline.json`);

const temEstudo = async (livro, n) => (await json('data/estudos.json', true) || []).includes(`${livro}/${n}`);

export async function capitulo(livro, n) {
  const [texto, est, rot] = await Promise.all([
    json(`data/${livro}/${pad(n)}.text.json`),
    estudo(livro, n),
    roteiro(livro),
  ]);
  return { ...texto, estudo: est || {}, secoes: rot[n] || [] };
}

// Apenas o estudo (para telas que listam muitos capítulos).
export const estudo = async (livro, n) => (await temEstudo(livro, n)) ? json(`data/${livro}/${pad(n)}.study.json`, true) : null;

export async function ordem() {
  const ls = await livros();
  return ls.flatMap((l) => Array.from({ length: l.capitulos }, (_, i) => ({ livro: l.slug, nome: l.nome, n: i + 1, chave: `${l.slug}/${i + 1}` })));
}
