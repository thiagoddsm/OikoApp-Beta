const CACHE_NAME = 'oiko-app-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar requisições que não sejam do método GET (como POST do firestore, etc)
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requisições para o Firebase, Firestore, Google APIs ou qualquer domínio externo
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis') || 
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') // Deixar que o Next.js cuide das atualizações em dev
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});