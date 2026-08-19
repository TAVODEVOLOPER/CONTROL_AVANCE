// Service Worker — Dragados Offshore · Control de Instalación
// Permite que la app cargue aunque no haya señal de internet.
// IMPORTANTE: sube este archivo junto a index.html, en la misma carpeta raíz del repositorio.
// Cuando subas una versión nueva de index.html, sube también este archivo si cambiaste
// CACHE_VERSION (no es obligatorio cambiarlo en cada versión, solo si quieres forzar
// que los celulares descarten la caché vieja de inmediato).

const CACHE_VERSION = 'v5.9';
const CACHE_NAME = 'dragados-control-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => { /* si algún recurso externo falla al precachear, no rompe la instalación */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Nunca interceptar envíos de datos (sincronización con Google Sheets, etc.)
  if (req.method !== 'GET') return;

  // Nunca cachear las llamadas a Google Apps Script: siempre deben ir a la red,
  // porque ahí vive la información real y cambiante del proyecto.
  if (req.url.includes('script.google.com')) return;

  // Estrategia: intentar la red primero (para tener siempre lo más nuevo),
  // y si no hay conexión, usar lo que haya guardado en caché.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
