// Gera data/reis.json a partir da Tabela A6 (TNM, wol.jw.org) e liga cada rei
// aos capítulos de 1/2 Reis em que o "Conteúdo do Livro" o menciona.
import { writeFile, readFile } from 'node:fs/promises';
const A6 = [
  'https://wol.jw.org/pt/wol/d/r5/lp-t/1001070206',
  'https://wol.jw.org/pt/wol/d/r5/lp-t/1001070215',
];
const judah = [
  ['997', 'Roboão', '17 anos'], ['980', 'Abias (Abião)', '3 anos'], ['978', 'Asa', '41 anos'],
  ['937', 'Jeosafá', '25 anos'], ['913', 'Jeorão', '8 anos'], ['c. 906', 'Acazias', '1 ano'],
  ['c. 905', 'Rainha Atalia', '6 anos'], ['898', 'Jeoás', '40 anos'], ['858', 'Amazias', '29 anos'],
  ['829', 'Uzias (Azarias)', '52 anos'], ['777', 'Jotão', '16 anos'], ['762', 'Acaz', '16 anos'],
  ['746', 'Ezequias', '29 anos'], ['716', 'Manassés', '55 anos'], ['661', 'Amom', '2 anos'],
  ['659', 'Josias', '31 anos'], ['628', 'Jeoacaz', '3 meses'], ['628', 'Jeoiaquim', '11 anos'],
  ['618', 'Joaquim', '3 meses e 10 dias'], ['617', 'Zedequias', '11 anos'],
];
const israel = [
  ['997', 'Jeroboão', '22 anos'], ['c. 976', 'Nadabe', '2 anos'], ['c. 975', 'Baasa', '24 anos'],
  ['c. 952', 'Elá', '2 anos'], ['c. 951', 'Zinri', '7 dias'], ['c. 951', 'Onri e Tibni', '4 anos'],
  ['c. 947', 'Onri (sozinho)', '8 anos'], ['c. 940', 'Acabe', '22 anos'], ['c. 920', 'Acazias', '2 anos'],
  ['c. 917', 'Jeorão', '12 anos'], ['c. 905', 'Jeú', '28 anos'], ['876', 'Jeoacaz', '14 anos'],
  ['c. 862', 'Jeoacaz e Jeoás', '3 anos'], ['c. 859', 'Jeoás (sozinho)', '16 anos'],
  ['c. 844', 'Jeroboão II', '41 anos'], ['c. 803', 'Zacarias', 'registrado: 6 meses'],
  ['c. 791', 'Salum', '1 mês'], ['c. 791', 'Menaém', '10 anos'], ['c. 780', 'Pecaías', '2 anos'],
  ['c. 778', 'Peca', '20 anos'], ['c. 758', 'Oseias', '9 anos a partir de c. 748'],
];
const outlines = {
  '1-reis': JSON.parse(await readFile('data/1-reis/outline.json', 'utf8')),
  '2-reis': JSON.parse(await readFile('data/2-reis/outline.json', 'utf8')),
};
// Primeiro nome "limpo" para procurar no Conteúdo do Livro.
const keys = (n) => {
  const base = n.replace(/^Rainha /, '').replace(/ \(sozinho\)| e .*/g, '');
  const alt = base.match(/\((.+)\)/);
  return [base.replace(/ \(.*\)/, ''), ...(alt ? [alt[1]] : [])];
};
function chapters(name, kingdom) {
  const hits = [];
  // "Jeroboão" não pode casar com "Jeroboão II" (e vice-versa).
  const word = new RegExp('(?<!\\p{L})(' + keys(name).join('|') + ')(?!\\p{L}| II)', 'u');
  const other = kingdom === 'Judá' ? 'Israel' : 'Judá';
  for (const [slug, o] of Object.entries(outlines))
    for (const [ch, items] of Object.entries(o))
      // Nomes repetidos nos dois reinos: descarta título que cite só o outro reino.
      if (items.some((i) => word.test(i.t) && !(i.t.includes(other) && !i.t.includes(kingdom))))
        hits.push(`${slug}/${ch}`);
  return hits;
}
const mk = (list, kingdom) => list.map(([year, name, reign]) => ({ year, name, reign, chapters: chapters(name, kingdom) }));
await writeFile('data/reis.json', JSON.stringify({
  sources: A6,
  events: [
    { year: '740', kingdom: 'israel', text: 'A Assíria conquista Samaria e domina Israel; o reino de Israel de dez tribos, ao norte, chega ao seu fim' },
    { year: '607', kingdom: 'juda', text: 'Jerusalém e seu templo são destruídos pelos babilônios durante o reinado de Nabucodonosor. Zedequias, o último rei da linhagem de Davi, é tirado do trono' },
  ],
  prophets: ['Joel', 'Elias', 'Eliseu', 'Jonas', 'Amós', 'Isaías', 'Miqueias', 'Sofonias', 'Jeremias', 'Naum', 'Habacuque', 'Daniel', 'Ezequiel', 'Obadias', 'Oseias'],
  juda: mk(judah, 'Judá'), israel: mk(israel, 'Israel'),
}, null, 1));
const d = JSON.parse(await readFile('data/reis.json', 'utf8'));
for (const k of [...d.juda, ...d.israel]) console.log(k.name.padEnd(18), k.chapters.join(' '));
