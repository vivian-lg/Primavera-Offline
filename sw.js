const CACHE_NAME = 'primavera-cache-v5';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './safe_points.json',
  // Agrega aquí tus rutas .geojson para precache:
  // (Se añaden dinámicamente más abajo)
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Construimos la lista completa con los .geojson detectados
      const extra = await fetch('./routes_list.json').then(r=>r.json()).catch(()=>[]);
      const all = PRECACHE.concat(extra.map(f=>'./routes_geojson/'+f));
      return cache.addAll(all);
    }).then(self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE_NAME ? null : caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp=>{
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(c=> c.put(e.request, copy));
      return resp;
    }).catch(()=> cached))
  );
});
