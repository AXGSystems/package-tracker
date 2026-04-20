/* ConciURGE™ Service Worker — Offline Support */
var CACHE_NAME = 'conciurge-v1';
var ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/charts.js',
  '/license.js',
  '/manifest.json',
  '/conciurge-logo-sm.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Network first for API calls, cache first for assets
  if (e.request.url.includes('script.google.com') || e.request.url.includes('api.')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache new assets
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function() {
      if (e.request.destination === 'document') return caches.match('/index.html');
    })
  );
});
