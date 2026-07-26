// Versão do cache — atualizar a cada deploy garante que o SW antigo seja substituído
const CACHE_VERSION = '20260726';
const CACHE_NAME = `oiko-app-cache-${CACHE_VERSION}`;

// Forçar o novo SW a assumir imediatamente sem esperar aba fechar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/manifest.json']))
      .then(() => self.skipWaiting()) // Ativa imediatamente
  );
});

// Apagar caches de versões antigas ao ativar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('oiko-app-cache-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Assumir controle de todas as abas abertas
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;

  // Ignorar Firebase, APIs e assets do Next.js (eles já têm hash no nome)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) {
    return;
  }

  // Estratégia Network-First para páginas HTML:
  // tenta buscar da rede primeiro; só usa cache se estiver offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Salvar cópia no cache para uso offline
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});