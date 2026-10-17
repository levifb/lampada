// Estado local (só neste aparelho): progresso, anotações e preferências.
const KEY = 'lampada:v1';

const vazio = () => ({ inicio: null, feitos: {}, notas: {}, tema: 'auto', fonte: 1, lembrete: '07:00' });

let estado;
try { estado = { ...vazio(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
catch { estado = vazio(); }

const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(estado)); } catch {} };

export const hojeISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const store = {
  get: () => estado,
  set(patch) { Object.assign(estado, patch); salvar(); },

  // Marca capítulos anteriores ao ponto de partida como já lidos (antes do app).
  comecarEm(ordem, chave) {
    estado.inicio = chave;
    for (const k of ordem) {
      if (k === chave) break;
      estado.feitos[k] ||= { d: null, antes: true };
    }
    salvar();
  },
  concluir(chave) { estado.feitos[chave] = { d: hojeISO() }; salvar(); },
  desfazer(chave) { delete estado.feitos[chave]; salvar(); },
  feito: (chave) => !!estado.feitos[chave],
  nota: (chave) => estado.notas[chave] || '',
  anotar(chave, txt) { if (txt.trim()) estado.notas[chave] = txt; else delete estado.notas[chave]; salvar(); },

  dias() { return new Set(Object.values(estado.feitos).map((f) => f.d).filter(Boolean)); },

  // Dias seguidos com leitura, contando até hoje (ou até ontem, se hoje ainda não leu).
  sequencia() {
    const dias = this.dias();
    const d = new Date();
    if (!dias.has(hojeISO(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (dias.has(hojeISO(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  leuHoje() { return this.dias().has(hojeISO()); },
};
