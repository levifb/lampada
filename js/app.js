import { store, hojeISO } from './store.js';
import * as dados from './data.js';

const app = document.getElementById('app');
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icone = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const romas = `<div class="romas" aria-hidden="true">${icone('roma')}${icone('roma')}${icone('roma')}</div>`;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const fonteLink = (url, rotulo = 'jw.org') => url ? `<a class="fonte" href="${esc(url)}" target="_blank" rel="noopener">fonte: ${esc(rotulo)} ↗</a>` : '';

// Rótulo legível para uma URL de origem.
function nomeFonte(url = '') {
  if (url.includes('wol.jw.org')) return 'wol.jw.org';
  if (url.includes('jw-cdn.org')) return 'jw.org';
  return 'jw.org';
}

/* ───────────────────────── Tema e fonte ───────────────────────── */
function aplicarPreferencias() {
  const { tema, fonte } = store.get();
  if (tema === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = tema;
  document.documentElement.style.setProperty('--leitura', ['1.02rem', '1.14rem', '1.28rem', '1.42rem'][fonte] || '1.14rem');
}
aplicarPreferencias();

/* ───────────────────────── Sheet ───────────────────────── */
const sheet = document.getElementById('sheet');
function abrirSheet(html) {
  sheet.querySelector('.sheet-body').innerHTML = html;
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  sheet.querySelector('.sheet-close').focus();
}
function fecharSheet() { sheet.hidden = true; document.body.style.overflow = ''; }
sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) fecharSheet(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) fecharSheet(); });

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 3200);
}

/* ───────────────────────── Utilidades ───────────────────────── */
async function capituloAtual() {
  const ordem = await dados.ordem();
  return { ordem, atual: ordem.find((c) => !store.feito(c.chave)) || null };
}
async function capaDe(livro, estudo) {
  if (estudo?.capa?.img) return estudo.capa;
  const l = (await dados.livros()).find((x) => x.slug === livro);
  return l.capa;
}
function observarRevelacoes(raiz) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  raiz.querySelectorAll('.revela').forEach((el) => io.observe(el));
}

/* ───────────────────────── Boas-vindas ───────────────────────── */
async function viewBoasVindas() {
  document.body.classList.add('lendo');
  const ordem = await dados.ordem();
  const livros = await dados.livros();
  let escolha = ordem[0].chave;
  const grade = (l) => `<div class="secao" style="padding-inline:0">
      <span class="etiqueta">${esc(l.nome)}</span>
      <div class="grade-caps">${ordem.filter((c) => c.livro === l.slug).map((c) => `<button data-k="${c.chave}">${c.n}</button>`).join('')}</div>
    </div>`;
  app.innerHTML = `<section class="boas-vindas wrap view">
      <span class="etiqueta">Estudo pessoal · <b>1 capítulo por dia</b></span>
      <h1 class="display">Entre na <em>história</em>.</h1>
      <p class="muted" style="font-size:1.1rem;max-width:32ch;margin:0">Cada dia, um capítulo da Tradução do Novo Mundo, com ilustrações, achados e contexto tirados do jw.org.</p>
      <h2 class="display" style="font-size:1.6rem;margin:44px 0 0">Onde você está na leitura?</h2>
      <p class="muted" style="margin:6px 0 0;font-size:.92rem">Toque no capítulo que vai ler hoje. Os anteriores ficam marcados como já lidos.</p>
      ${livros.map(grade).join('')}
      <div style="margin-top:34px"><button class="btn" id="comecar"><span>Começar por <span id="esc"></span></span> ${icone('i-seta')}</button></div>
    </section>`;
  const pintar = () => {
    const idx = ordem.findIndex((c) => c.chave === escolha);
    app.querySelectorAll('.grade-caps button').forEach((b) => {
      const i = ordem.findIndex((c) => c.chave === b.dataset.k);
      b.classList.toggle('on', i === idx); b.classList.toggle('antes', i < idx);
    });
    const c = ordem[idx];
    app.querySelector('#esc').textContent = `${c.nome} ${c.n}`;
  };
  app.addEventListener('click', (e) => {
    const b = e.target.closest('.grade-caps button');
    if (b) { escolha = b.dataset.k; pintar(); }
  });
  app.querySelector('#comecar').onclick = () => { store.comecarEm(ordem.map((c) => c.chave), escolha); location.hash = '#/hoje'; };
  pintar();
}

/* ───────────────────────── Hoje ───────────────────────── */
async function viewHoje() {
  if (!store.get().inicio) return viewBoasVindas();
  const { ordem, atual } = await capituloAtual();
  if (!atual) return viewFim(ordem);
  const cap = await dados.capitulo(atual.livro, atual.n);
  const est = cap.estudo;
  const capa = await capaDe(atual.livro, est);
  const titulo = est.titulo || cap.secoes[0]?.t || `${atual.nome} ${atual.n}`;
  const seq = store.sequencia();
  const leu = store.leuHoje();
  const agora = new Date();
  const teaser = (est.achados || []).find((a) => a.img);

  // Últimos 7 dias, terminando hoje.
  const dias = store.dias();
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(agora); d.setDate(d.getDate() - (6 - i));
    const iso = hojeISO(d);
    return `<div class="dia ${dias.has(iso) ? 'feito' : ''} ${i === 6 ? 'hoje' : ''}"><div class="tab">${dias.has(iso) ? icone('roma') : ''}</div><span>${DIAS[d.getDay()]}</span></div>`;
  }).join('');

  const feitos = ordem.filter((c) => store.feito(c.chave)).length;

  app.innerHTML = `<div class="view">
    <header class="topo">
      <span class="marca">${icone('i-hoje')} Lâmpada</span>
      <span class="etiqueta">${DIAS[agora.getDay()]} · ${agora.getDate()} ${MESES[agora.getMonth()]}</span>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${icone('i-ajustes')}</a>
    </header>

    <a class="capa" href="#/ler/${atual.livro}/${atual.n}">
      <img src="${esc(capa.img)}" alt="${esc(capa.alt || '')}">
      <span class="capa-num" aria-hidden="true">${atual.n}</span>
      <div class="capa-txt">
        <span class="etiqueta">${leu ? 'Quer adiantar? · ' : 'Leitura de hoje · '}<b>${esc(atual.nome)} ${atual.n}</b>${est.quando ? ' · ' + esc(est.quando) : ''}</span>
        <h1 class="display">${esc(titulo)}</h1>
        ${est.chamada ? `<p>${esc(est.chamada)}</p>` : ''}
        <span class="btn">Entrar na história ${icone('i-seta')}</span>
      </div>
    </a>

    <div class="hoje-grade">
      <div>
        <div class="contagem">
          <span class="n">${seq}</span>
          <span class="t"><strong>${seq === 1 ? 'dia seguido' : 'dias seguidos'}</strong>${leu ? 'Leitura de hoje selada. Até amanhã!' : seq ? 'Leia hoje para não quebrar a sequência.' : 'Um capítulo hoje começa uma nova sequência.'}</span>
        </div>
        <div class="semana" aria-label="Últimos 7 dias">${semana}</div>
        <div class="secao">
          <span class="etiqueta">Jornada · <b>${feitos} de ${ordem.length}</b> capítulos</span>
          <div style="height:6px;border-radius:6px;background:var(--papiro-2);overflow:hidden"><i style="display:block;height:100%;width:${(feitos / ordem.length) * 100}%;background:var(--argila)"></i></div>
        </div>
      </div>
      <div>
        ${cap.secoes.length ? `<div class="secao"><span class="etiqueta">Neste capítulo</span>
          <ol class="roteiro">${cap.secoes.filter((s, i, a) => !a.slice(0, i).some((p) => p.from <= s.from && p.to >= s.to)).map((s) => `<li><span>${esc(s.t)}</span><span>${s.from}${s.to !== s.from ? '–' + s.to : ''}</span></li>`).join('')}</ol></div>` : ''}
        ${teaser ? `<div class="secao"><span class="etiqueta">Você vai descobrir</span>
          <a class="teaser" href="#/ler/${atual.livro}/${atual.n}"><img src="${esc(teaser.img)}" alt=""><div><span class="etiqueta">${esc(teaser.tag || 'Achado')}</span><h3>${esc(teaser.titulo)}</h3></div></a></div>` : ''}
      </div>
    </div>
  </div>`;
}

async function viewFim(ordem) {
  app.innerHTML = `<section class="cab wrap view">
    <span class="etiqueta">Jornada concluída</span>
    <h1 class="display">Você leu os ${ordem.length} capítulos.</h1>
    <p>Todos os livros desta jornada foram lidos. Reveja suas anotações e peças no Acervo.</p>
    <p style="margin-top:20px"><a class="btn" href="#/acervo">Abrir o acervo ${icone('i-seta')}</a></p>
  </section>`;
}

/* ───────────────────────── Leitura ───────────────────────── */
let audioAtual = null;

function montarTexto(cap) {
  const est = cap.estudo;
  const achados = est.achados || [];
  const porVerso = new Map();
  achados.forEach((a, i) => { if (!porVerso.has(a.v)) porVerso.set(a.v, []); porVerso.get(a.v).push(i); });
  // Só títulos de primeiro nível (os que não estão dentro de outro).
  const secoes = cap.secoes.filter((s, i, a) => !a.slice(0, i).some((p) => p.from <= s.from && p.to >= s.to));
  const inicioSecao = new Map(secoes.map((s) => [s.from, s]));

  let html = '', par = [], pendentes = [];
  const fecharPar = () => {
    if (par.length) html += `<p>${par.join(' ')}</p>`;
    par = [];
    for (const i of pendentes) html += cartaoAchado(achados[i], i);
    pendentes = [];
  };
  for (const v of cap.verses) {
    const sec = inicioSecao.get(v.n);
    if (sec || v.p) fecharPar();
    if (sec) html += `<h2><span class="etiqueta">${sec.from}${sec.to !== sec.from ? '–' + sec.to : ''}</span>${esc(sec.t)}</h2>`;
    const txt = esc(v.text).replace(/\{(\d+)\}/g, (_, id) => `<button class="fn" data-fn="${id}" aria-label="Nota de rodapé">*</button>`);
    const tem = porVerso.has(v.n);
    const num = v.n === 1 ? `<span class="capnum" aria-label="Capítulo ${cap.chapter}">${cap.chapter}</span>` : `<sup>${v.n}</sup>`;
    par.push(`<span class="v${tem ? ' tem-nota' : ''}" id="v${v.n}" ${tem ? `data-achado="${porVerso.get(v.n)[0]}"` : ''}>${num}${txt}</span>`);
    if (tem) pendentes.push(...porVerso.get(v.n));
  }
  fecharPar();
  return html;
}

function cartaoAchado(a, i) {
  return `<aside class="achado revela" id="achado-${i}">
    ${a.img ? `<figure><img src="${esc(a.img)}" alt="${esc(a.alt || '')}" loading="lazy">${a.legenda ? `<figcaption>${esc(a.legenda)}</figcaption>` : ''}</figure>` : ''}
    <div class="corpo">
      <span class="etiqueta tag">${esc(a.tag || 'Você sabia?')} · v. ${a.v}</span>
      <h3>${esc(a.titulo)}</h3>
      ${a.citacao ? `<blockquote>“${esc(a.citacao)}”</blockquote>` : ''}
      ${(a.texto || []).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${fonteLink(a.fonte, a.fonteNome || nomeFonte(a.fonte))}
    </div>
  </aside>`;
}

function seloSVG(rotulo, centro) {
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><path id="circ" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
    <circle class="disco" cx="100" cy="100" r="92"/>
    <circle class="anel" cx="100" cy="100" r="84" stroke-width="1.5"/>
    <circle class="anel" cx="100" cy="100" r="56" stroke-width="1"/>
    <text><textPath href="#circ" startOffset="0" textLength="446" lengthAdjust="spacing">${esc(rotulo)}</textPath></text>
    <text class="centro" x="100" y="111" text-anchor="middle">${esc(centro)}</text>
  </svg>`;
}

async function viewLer(livro, n) {
  n = +n;
  const chave = `${livro}/${n}`;
  const [cap, livros, ordem] = await Promise.all([dados.capitulo(livro, n), dados.livros(), dados.ordem()]);
  const L = livros.find((l) => l.slug === livro);
  const est = cap.estudo;
  const capa = await capaDe(livro, est);
  const titulo = est.titulo || cap.secoes[0]?.t || `${L.nome} ${n}`;
  const idx = ordem.findIndex((c) => c.chave === chave);
  const prox = ordem[idx + 1];
  const feito = store.feito(chave);
  const notasRodape = cap.footnotes || {};
  document.body.classList.add('lendo');

  const contexto = [['Rei', est.rei], ['Quando', est.quando], ['Onde', est.onde]].filter(([, v]) => v);

  app.innerHTML = `<div class="view">
    <div class="progresso" id="prog"></div>
    <div class="barra-leitura" id="barra">
      <a class="icon-btn" href="#/hoje" aria-label="Voltar">${icone('i-voltar')}</a>
      <span class="etiqueta">${esc(L.nome)} · <b>${n}</b></span>
      <a class="icon-btn" href="${esc(cap.source)}" target="_blank" rel="noopener" aria-label="Abrir no jw.org" title="Abrir no jw.org"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
    </div>

    <header class="cena">
      <img src="${esc(capa.img)}" alt="${esc(capa.alt || '')}">
      <div class="cena-txt">
        <span class="etiqueta">${esc(L.nome)} · capítulo ${n}${est.quando ? ' · ' + esc(est.quando) : ''}</span>
        <h1 class="display">${esc(titulo)}</h1>
      </div>
    </header>
    ${capa.legenda || capa.alt ? `<p class="legenda-img">${esc(capa.legenda || capa.alt)} · <a href="${esc(capa.fonte || '#')}" target="_blank" rel="noopener">${nomeFonte(capa.fonte)}</a></p>` : ''}

    <article class="wrap">
      ${contexto.length ? `<dl class="contexto">${contexto.map(([k, v]) => `<div><dt class="etiqueta">${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${est.intro ? `<p class="intro">${esc(est.intro)}</p>${fonteLink(est.introFonte, nomeFonte(est.introFonte))}` : ''}

      ${cap.audio ? `<div class="audio" id="audio">
        <button aria-label="Ouvir o capítulo">${icone('i-play')}</button>
        <div class="rotulo"><span class="etiqueta">Ouvir o capítulo · jw.org</span><div class="faixa" role="slider" aria-label="Posição do áudio"><i></i></div></div>
        <span class="tempo">0:00</span>
      </div>` : ''}

      <div class="texto" id="texto">${montarTexto(cap)}</div>
      <p style="margin-top:22px">${fonteLink(cap.source, 'Tradução do Novo Mundo · Edição de Estudo')}</p>

      ${romas}

      <section class="fecho">
        <span class="etiqueta">Para pensar</span>
        <p class="pergunta" style="margin-top:12px">${esc(est.pergunta || 'O que este capítulo me ensina sobre Jeová?')}</p>
        ${est.perguntaFonte ? fonteLink(est.perguntaFonte, nomeFonte(est.perguntaFonte)) : ''}
        <textarea class="nota-area" id="nota" placeholder="Escreva sua reflexão…">${esc(store.nota(chave))}</textarea>

        ${(est.mais || []).length ? `<div class="mais"><span class="etiqueta">Ir mais fundo no jw.org</span>
          ${est.mais.map((m) => `<a href="${esc(m.url)}" target="_blank" rel="noopener"><span>${esc(m.rotulo)}</span>${icone('i-seta')}</a>`).join('')}</div>` : ''}

        <div class="selo-wrap">
          <button class="selo ${feito ? 'feito' : ''}" id="selo" aria-label="${feito ? 'Leitura selada' : 'Selar a leitura'}">
            ${seloSVG(`${L.nome} ${n} · ${feito ? 'lido' : 'toque para selar'} · `, feito ? '✓' : `${n}`)}
            <span class="poeira" id="poeira"></span>
          </button>
          <span class="etiqueta" id="selo-txt" style="margin-top:12px">${feito ? 'Leitura selada' : 'Terminou? Sele a leitura'}</span>
          ${feito ? `<button class="etiqueta" id="desfazer" style="all:unset;cursor:pointer;margin-top:10px;font:.7rem var(--f-mono);color:var(--tinta-3);text-decoration:underline">desfazer</button>` : ''}
        </div>
      </section>

      ${prox ? `<a class="prox" href="#/ler/${prox.livro}/${prox.n}"><div><span class="etiqueta">Próximo capítulo</span><h3>${esc(prox.nome)} ${prox.n}</h3></div>${icone('i-seta')}</a>` : ''}
    </article>
  </div>`;

  // Barra de progresso da leitura.
  const prog = app.querySelector('#prog'), barra = app.querySelector('#barra');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    barra.classList.toggle('solta', scrollY > (app.querySelector('.cena')?.offsetHeight || 400) - 70);
  };
  addEventListener('scroll', onScroll, { passive: true });
  limpezas.push(() => removeEventListener('scroll', onScroll));
  observarRevelacoes(app);

  // Notas de rodapé, versículos com achado.
  app.querySelector('#texto').addEventListener('click', (e) => {
    const fn = e.target.closest('.fn');
    if (fn) {
      const v = fn.closest('.v')?.id.slice(1);
      abrirSheet(`<span class="etiqueta">Nota de rodapé · v. ${v}</span><h3>${esc(notasRodape[fn.dataset.fn] || '')}</h3>${fonteLink(cap.source, 'TNM · Edição de Estudo')}`);
      return;
    }
    const v = e.target.closest('.v.tem-nota');
    if (v) document.getElementById('achado-' + v.dataset.achado)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Anotação pessoal.
  const nota = app.querySelector('#nota');
  let t;
  nota.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => store.anotar(chave, nota.value), 400); });

  // Selo.
  app.querySelector('#selo').onclick = (e) => {
    const selo = e.currentTarget;
    if (store.feito(chave)) return;
    store.anotar(chave, nota.value);
    store.concluir(chave);
    selo.classList.add('feito', 'carimbar');
    selo.innerHTML = seloSVG(`${L.nome} ${n} · lido em ${new Date().getDate()} ${MESES[new Date().getMonth()]} · `, '✓') + '<span class="poeira" id="poeira"></span>';
    const poeira = selo.querySelector('#poeira');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = 90 + Math.random() * 40;
      const p = document.createElement('i');
      p.style.setProperty('--x', `${Math.cos(a) * r}px`); p.style.setProperty('--y', `${Math.sin(a) * r}px`);
      p.style.animationDelay = '.25s';
      poeira.append(p);
    }
    app.querySelector('#selo-txt').textContent = 'Leitura selada';
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    const s = store.sequencia();
    setTimeout(() => toast(s > 1 ? `Selado! ${s} dias seguidos.` : 'Selado! Sequência iniciada.'), 500);
  };
  app.querySelector('#desfazer')?.addEventListener('click', () => { store.desfazer(chave); viewLer(livro, n); });

  // Áudio (streaming do jw-cdn.org).
  const box = app.querySelector('#audio');
  if (box) {
    const btn = box.querySelector('button'), barraA = box.querySelector('.faixa i'), tempo = box.querySelector('.tempo');
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    btn.onclick = () => {
      if (!audioAtual || audioAtual.dataset.src !== cap.audio) {
        audioAtual?.pause();
        audioAtual = new Audio(cap.audio); audioAtual.dataset.src = cap.audio;
        audioAtual.ontimeupdate = () => { barraA.style.width = `${(audioAtual.currentTime / audioAtual.duration) * 100 || 0}%`; tempo.textContent = fmt(audioAtual.currentTime); };
        audioAtual.onpause = audioAtual.onplay = () => { btn.innerHTML = icone(audioAtual.paused ? 'i-play' : 'i-pause'); };
        audioAtual.onerror = () => toast('Áudio indisponível sem internet.');
      }
      audioAtual.paused ? audioAtual.play() : audioAtual.pause();
    };
    box.querySelector('.faixa').onclick = (e) => {
      if (!audioAtual?.duration) return;
      const r = e.currentTarget.getBoundingClientRect();
      audioAtual.currentTime = ((e.clientX - r.left) / r.width) * audioAtual.duration;
    };
  }
  scrollTo(0, 0);
}

/* ───────────────────────── Jornada ───────────────────────── */
async function viewJornada() {
  const ordem = await dados.ordem();
  const livros = await dados.livros();
  const atual = ordem.find((c) => !store.feito(c.chave));
  const titulos = await Promise.all(ordem.map(async (c) => {
    const [e, r] = await Promise.all([dados.estudo(c.livro, c.n), dados.roteiro(c.livro)]);
    return e?.titulo || r[c.n]?.[0]?.t || '';
  }));

  // Pontos de um caminho serpenteante; espaço extra antes de cada livro.
  const passo = 92, pts = [];
  let y = 40;
  ordem.forEach((c, i) => {
    if (c.n === 1) y += 70;
    const x = 50 + Math.sin(i * 0.78) * 30;
    pts.push({ x, y, c, i });
    y += passo;
  });
  const altura = y + 20;
  const curva = (lista) => lista.map((p, i) => {
    if (!i) return `M ${p.x} ${p.y}`;
    const a = lista[i - 1], my = (a.y + p.y) / 2;
    return `C ${a.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
  }).join(' ');
  const ultimoFeito = pts.filter((p) => store.feito(p.c.chave)).at(-1);
  const andados = ultimoFeito ? pts.slice(0, ultimoFeito.i + 1) : [];

  app.innerHTML = `<div class="view">
    <header class="cab wrap">
      <span class="etiqueta">${ordem.filter((c) => store.feito(c.chave)).length} de ${ordem.length} capítulos</span>
      <h1 class="display">A jornada</h1>
      <p>${livros.map((l) => esc(l.nome)).join(' · ')}. Cada marco é um dia de leitura.</p>
    </header>
    <div class="mapa" style="height:${altura}px">
      <svg class="trilha" viewBox="0 0 100 ${altura}" preserveAspectRatio="none" aria-hidden="true">
        <path class="caminho" d="${curva(pts)}" vector-effect="non-scaling-stroke"/>
        ${andados.length > 1 ? `<path class="andado" d="${curva(andados)}" vector-effect="non-scaling-stroke"/>` : ''}
      </svg>
      ${livros.map((l) => { const p = pts.find((q) => q.c.livro === l.slug && q.c.n === 1); return `<div class="livro-sep" style="top:${p.y - 62}px"><span>${esc(l.nome)}</span></div>`; }).join('')}
      ${pts.map((p) => {
        const cls = store.feito(p.c.chave) ? 'feito' : p.c === atual ? 'atual' : '';
        const lado = p.x < 50 ? 'lado-d' : 'lado-e';
        return `<a class="marco ${cls} ${lado}" href="#/ler/${p.c.livro}/${p.c.n}" style="left:${p.x}%;top:${p.y}px">
          <span class="p">${store.feito(p.c.chave) ? '✓' : p.c.n}</span><span class="rot">${esc(titulos[p.i])}</span></a>`;
      }).join('')}
    </div>
  </div>`;
  const alvo = app.querySelector('.marco.atual');
  if (alvo) setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
}

/* ───────────────────────── Reis ───────────────────────── */
async function viewReis() {
  const r = await dados.reis();
  const lido = (k) => k.chapters.some((c) => store.feito(c));
  const col = (lista, nome, sub, chave) => `<div class="reino">
      <h2>${nome}<small class="etiqueta">${sub}</small></h2>
      ${lista.map((k, i) => `<a class="rei ${lido(k) ? 'lido' : ''}" href="#" data-reino="${chave}" data-i="${i}">
        <div class="ano">${esc(k.year)}${/^\d/.test(k.year) ? ' a.C.' : ''}</div>
        <div class="nome">${esc(k.name)}</div><div class="dur">${esc(k.reign)}</div></a>`).join('')}
      ${r.events.filter((e) => e.kingdom === chave).map((e) => `<div class="evento"><b>${e.year} a.C.</b>${esc(e.text)}</div>`).join('')}
    </div>`;
  app.innerHTML = `<div class="view">
    <header class="cab wrap">
      <span class="etiqueta">Tabela A6 · Tradução do Novo Mundo</span>
      <h1 class="display">Os reis</h1>
      <p>Depois de Salomão, o reino se divide. Os reis marcados em argila já apareceram na sua leitura.</p>
      ${fonteLink(r.sources[0], 'wol.jw.org · Profetas e Reis de Judá e de Israel')}
    </header>
    <div class="reinos wide">
      ${col(r.juda, 'Judá', 'ao sul · 2 tribos', 'juda')}
      ${col(r.israel, 'Israel', 'ao norte · 10 tribos', 'israel')}
    </div>
    <section class="secao wrap" style="padding-inline:0">
      <span class="etiqueta">Profetas do período</span>
      <div class="profetas">${r.prophets.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
    </section>
  </div>`;
  app.querySelector('.reinos').addEventListener('click', async (e) => {
    const a = e.target.closest('.rei');
    if (!a) return;
    e.preventDefault();
    const k = r[a.dataset.reino][+a.dataset.i];
    const livros = await dados.livros();
    const nomeCap = (c) => { const [l, n] = c.split('/'); return `${livros.find((x) => x.slug === l).nome} ${n}`; };
    abrirSheet(`<span class="etiqueta">${a.dataset.reino === 'juda' ? 'Reino de Judá' : 'Reino de Israel'} · ${esc(k.year)}${/^\d/.test(k.year) ? ' a.C.' : ''}</span>
      <h3>${esc(k.name)}</h3><p>Reinado: ${esc(k.reign)}.</p>
      ${k.chapters.length ? `<div class="mais"><span class="etiqueta">Aparece em</span>${k.chapters.map((c) => `<a href="#/ler/${c}" data-close><span>${nomeCap(c)} ${store.feito(c) ? '· lido' : ''}</span>${icone('i-seta')}</a>`).join('')}</div>` : ''}
      <p style="margin-top:14px">${fonteLink(r.sources[a.dataset.reino === 'juda' && +a.dataset.i > 9 || a.dataset.reino === 'israel' && +a.dataset.i > 14 ? 1 : 0], 'Tabela A6 · wol.jw.org')}</p>`);
  });
}

/* ───────────────────────── Acervo ───────────────────────── */
async function viewAcervo() {
  const ordem = await dados.ordem();
  const pecas = [];
  await Promise.all(ordem.map(async (c, ci) => {
    const e = await dados.estudo(c.livro, c.n);
    (e?.achados || []).forEach((a, i) => { if (a.img) pecas.push({ ...a, c, ordem: ci * 100 + i }); });
  }));
  pecas.sort((a, b) => a.ordem - b.ordem);
  const abertas = pecas.filter((p) => store.feito(p.c.chave));
  app.innerHTML = `<div class="view">
    <header class="cab wrap">
      <span class="etiqueta">Seu acervo</span>
      <h1 class="display">Achados</h1>
      <p>Cada capítulo selado acrescenta peças: ilustrações, descobertas e contexto que você encontrou na leitura.</p>
      <div class="contador"><b>${abertas.length}</b><span class="etiqueta">de ${pecas.length} peças</span></div>
    </header>
    <div class="vitrine wide">
      ${pecas.map((p, i) => store.feito(p.c.chave)
        ? `<button class="peca" data-i="${i}"><img src="${esc(p.img)}" alt="${esc(p.alt || '')}" loading="lazy"><div class="ficha"><span class="etiqueta">${esc(p.c.nome)} ${p.c.n}:${p.v}</span><b>${esc(p.titulo)}</b></div></button>`
        : `<div class="peca trancada" title="Leia ${esc(p.c.nome)} ${p.c.n} para abrir">${icone('i-acervo')}</div>`).join('')}
    </div>
  </div>`;
  app.querySelector('.vitrine').addEventListener('click', (e) => {
    const b = e.target.closest('.peca[data-i]');
    if (!b) return;
    const p = pecas[+b.dataset.i];
    abrirSheet(`<img src="${esc(p.img)}" alt="${esc(p.alt || '')}"><span class="etiqueta">${esc(p.c.nome)} ${p.c.n}:${p.v} · ${esc(p.tag || 'Achado')}</span>
      <h3>${esc(p.titulo)}</h3>${p.citacao ? `<p><em>“${esc(p.citacao)}”</em></p>` : ''}${(p.texto || []).map((t) => `<p>${esc(t)}</p>`).join('')}
      ${fonteLink(p.fonte, p.fonteNome || nomeFonte(p.fonte))}
      <div class="mais"><a href="#/ler/${p.c.livro}/${p.c.n}" data-close><span>Reler ${esc(p.c.nome)} ${p.c.n}</span>${icone('i-seta')}</a></div>`);
  });
}

/* ───────────────────────── Ajustes ───────────────────────── */
function baixarLembrete(hora) {
  const [hh, mm] = hora.split(':');
  const d = new Date(); d.setDate(d.getDate() + (store.leuHoje() ? 1 : 0));
  const dt = `${hojeISO(d).replace(/-/g, '')}T${hh}${mm}00`;
  const url = location.href.split('#')[0] + '#/hoje';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lampada//Estudo pessoal//PT', 'BEGIN:VEVENT',
    `UID:lampada-leitura-diaria@estudo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${dt}`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY', 'SUMMARY:📖 Leitura do dia — Lâmpada',
    `DESCRIPTION:Seu capítulo de hoje está esperando. ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Hora da leitura', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'lembrete-leitura.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function viewAjustes() {
  const s = store.get();
  const seg = (nome, ops, atual) => `<div class="seg" data-seg="${nome}">${ops.map(([v, r]) => `<button data-v="${v}" class="${String(atual) === String(v) ? 'on' : ''}">${r}</button>`).join('')}</div>`;
  app.innerHTML = `<div class="view">
    <header class="cab wrap">
      <a class="icon-btn" href="#/hoje" aria-label="Voltar" style="margin-left:-10px">${icone('i-voltar')}</a>
      <h1 class="display">Ajustes</h1>
    </header>
    <div class="wrap">
      <div class="ajustes">
        <div class="ajuste"><label>Tema</label>${seg('tema', [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']], s.tema)}</div>
        <div class="ajuste"><label>Tamanho do texto</label>${seg('fonte', [[0, 'A−'], [1, 'A'], [2, 'A+'], [3, 'A++']], s.fonte)}</div>
        <div class="ajuste"><div><label for="hora">Lembrete diário</label><small>Cria um evento que se repete todo dia no calendário do celular.</small></div><input type="time" id="hora" value="${esc(s.lembrete)}"></div>
        <div class="ajuste" style="justify-content:flex-end"><button class="btn" id="ics" style="padding:.8rem 1.1rem">Adicionar ao calendário</button></div>
      </div>
      <div class="ajustes">
        <div class="ajuste"><div><label>Recomeçar</label><small>Escolher de novo onde você está. As anotações ficam guardadas.</small></div><button class="btn ghost" id="reset" style="padding:.8rem 1.1rem">Recomeçar</button></div>
      </div>
      <p class="muted" style="font-size:.85rem;margin-top:26px">Todo o conteúdo (texto bíblico da Tradução do Novo Mundo, ilustrações, áudio e informações) vem de <a href="https://www.jw.org/pt/" target="_blank" rel="noopener">jw.org</a> e <a href="https://wol.jw.org/pt/" target="_blank" rel="noopener">wol.jw.org</a>, com link para a fonte em cada item. App de uso pessoal. Seu progresso fica guardado só neste aparelho.</p>
    </div>
  </div>`;
  app.querySelectorAll('[data-seg]').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const v = g.dataset.seg === 'fonte' ? +b.dataset.v : b.dataset.v;
    store.set({ [g.dataset.seg]: v });
    g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    aplicarPreferencias();
  }));
  app.querySelector('#hora').onchange = (e) => store.set({ lembrete: e.target.value });
  app.querySelector('#ics').onclick = () => baixarLembrete(app.querySelector('#hora').value || '07:00');
  app.querySelector('#reset').onclick = () => {
    const feitos = Object.fromEntries(Object.entries(store.get().feitos).filter(([, f]) => !f.antes));
    store.set({ inicio: null, feitos });
    location.hash = '#/hoje';
  };
}

/* ───────────────────────── Roteador ───────────────────────── */
let limpezas = [];
async function rotear() {
  limpezas.forEach((f) => f()); limpezas = [];
  document.body.classList.remove('lendo');
  fecharSheet();
  const [, rota, ...args] = (location.hash || '#/hoje').split('/');
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === rota));
  try {
    if (rota === 'ler') await viewLer(...args);
    else if (rota === 'jornada') await viewJornada();
    else if (rota === 'reis') await viewReis();
    else if (rota === 'acervo') await viewAcervo();
    else if (rota === 'ajustes') viewAjustes();
    else await viewHoje();
  } catch (err) {
    console.error(err);
    app.innerHTML = `<section class="cab wrap"><h1 class="display">Algo saiu errado</h1><p>${esc(err.message)}</p></section>`;
  }
  if (rota !== 'ler' && rota !== 'jornada') scrollTo(0, 0);
  app.focus({ preventScroll: true });
}
addEventListener('hashchange', rotear);
rotear();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
