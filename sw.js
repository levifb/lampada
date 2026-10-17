// Offline: o "esqueleto" do app vai para o cache na instalação; dados e imagens
// entram no cache conforme são usados (e todos os capítulos são pré-carregados aos poucos).
const VERSAO = 'lampada-119204dd';
const BASE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/data.js',
  'fonts/fonts.css', 'fonts/Fraunces-normal.woff2', 'fonts/Fraunces-italic.woff2', 'fonts/Literata-normal.woff2',
  'fonts/Literata-italic.woff2', 'fonts/JetBrainsMono-normal.woff2', 'manifest.webmanifest', 'icons/icon.svg',
  'data/books.json', 'data/reis.json', 'data/estudos.json', 'data/1-reis/outline.json', 'data/2-reis/outline.json', 'data/precache.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSAO);
    await c.addAll(BASE);
    // Todos os capítulos e imagens, para ler sem internet.
    try {
      const lista = await (await fetch('data/precache.json')).json();
      for (let i = 0; i < lista.length; i += 20) await c.addAll(lista.slice(i, i + 20));
    } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // áudio do jw-cdn vai direto
  e.respondWith((async () => {
    const c = await caches.open(VERSAO);
    const hit = await c.match(e.request, { ignoreSearch: true });
    const rede = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await rede) || c.match('index.html');
  })());
});
