const INITIAL_CENTER = [20.6500, -103.6000];
const INITIAL_ZOOM = 12;

const ROUTE_FILES = [
  "bosque-nutella (1).geojson",
  "Ruta la catarina  (1).geojson",
  "huevona (1).geojson",
  "by-pass-516314 (1).geojson",
  "vaca-muerta-rivers-combined (1).geojson",
  "torre-03 (1).geojson",
  "espinazo (1).geojson",
  "pinitos-angel (1).geojson",
  "1-2-mosca (1).geojson",
  "relax (1).geojson",
  "torre-01 (1).geojson",
  "extension-espinazo (1).geojson",
  "toboganes-110689 (1).geojson",
  "mago-de-oz (1).geojson",
  "arenosas (1).geojson"
];

// Colores fijos por archivo .geojson (usa EXACTAMENTE estos nombres de archivo):
const ROUTE_COLORS = {
  "bosque-nutella (1).geojson": "#e41a1c",
  "Ruta la catarina  (1).geojson": "#377eb8",
  "huevona (1).geojson": "#4daf4a",
  "by-pass-516314 (1).geojson": "#984ea3",
  "vaca-muerta-rivers-combined (1).geojson": "#ff7f00",
  "torre-03 (1).geojson": "#a65628",
  "espinazo (1).geojson": "#f781bf",
  "pinitos-angel (1).geojson": "#999999",
  "1-2-mosca (1).geojson": "#66c2a5",
  "relax (1).geojson": "#fc8d62",
  "torre-01 (1).geojson": "#1b9e77",
  "extension-espinazo (1).geojson": "#d95f02",
  "toboganes-110689 (1).geojson": "#7570b3",
  "mago-de-oz (1).geojson": "#e7298a",
  "arenosas (1).geojson": "#66a61e"
};

// Paleta de respaldo + función de color estable (por si agregas nuevas rutas):
const PALETTE = ["#377eb8","#e41a1c","#4daf4a","#984ea3","#ff7f00","#a65628","#f781bf","#999999","#66c2a5","#fc8d62","#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e"];
function stableColorFor(name){
  if (ROUTE_COLORS[name]) return ROUTE_COLORS[name];
  let h = 0;
  for (let i=0; i<name.length; i++){ h=((h<<5)-h)+name.charCodeAt(i); h|=0; }
  return PALETTE[Math.abs(h)%PALETTE.length];
}


let map, userMarker, destLine, routesLayerGroup = L.layerGroup();
const statusEl = document.getElementById('status');
const plusEl = document.getElementById('pluscode');
const nearestEl = document.getElementById('nearest');

function setStatus(msg){ statusEl.textContent = msg; }

function initMap() {
  map = L.map('map');
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; OSM'
  });
  osm.addTo(map);
  routesLayerGroup.addTo(map);
  map.setView(INITIAL_CENTER, INITIAL_ZOOM);
}

function loadRoutes() {
  const list = document.getElementById('routes-list');
  const allBounds = [];

  ROUTE_FILES.forEach(file => {
    fetch(`routes_geojson/${file}`)
      .then(r => r.json())
      .then(geo => {
        // nombre bonito (si existe en properties.name)
        let displayName = file;
        try {
          const f = geo.features?.find(ft => ft.properties?.name);
          if (f && f.properties.name) displayName = f.properties.name;
        } catch(e){}

        // Color estable: prioriza el nombre de archivo y luego el displayName
        const color = stableColorFor(file) || stableColorFor(displayName);

        // Capa
        const layer = L.geoJSON(geo, {
          style: {weight: 3, color},
          pointToLayer: (feat, latlng) => L.circleMarker(latlng, {radius:4, color})
        }).addTo(routesLayerGroup);

        // bounds para zoom general
        try {
          const b = layer.getBounds();
          if (b.isValid()) allBounds.push(b);
        } catch(e){}

        // UI de lista (checkbox + muestra de color + zoom)
        const id = 'r_' + file.replace(/\W/g,'_');
        const wrap = document.createElement('div');
        wrap.className = 'route-item';

        const swatch = document.createElement('div');
        swatch.className = 'route-color';
        swatch.style.background = color;

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.id = id;
        chk.checked = true;

        const nameEl = document.createElement('span');
        nameEl.className = 'route-name';
        nameEl.textContent = displayName;

        const btnZoom = document.createElement('button');
        btnZoom.textContent = '🔍';
        btnZoom.title = 'Zoom a esta ruta';

        wrap.append(swatch, chk, nameEl, btnZoom);
        list.appendChild(wrap);

        chk.addEventListener('change', (e)=>{
          if (e.target.checked) { routesLayerGroup.addLayer(layer); }
          else { routesLayerGroup.removeLayer(layer); }
        });

        btnZoom.addEventListener('click', ()=>{
          try {
            const b = layer.getBounds();
            if (b.isValid()) map.fitBounds(b.pad(0.2));
          } catch(e){}
        });
      })
      .catch(()=> setStatus(`No pude cargar ${file} (¿nombre o ruta mal?)`));
  });

  // Botones globales
  document.getElementById('btn-hide-all').onclick = ()=>{
    routesLayerGroup.eachLayer(l => routesLayerGroup.removeLayer(l));
    document.querySelectorAll('#routes-list input[type="checkbox"]').forEach(c => c.checked = false);
  };
  document.getElementById('btn-show-all').onclick = ()=>{
    document.querySelectorAll('#routes-list input[type="checkbox"]').forEach(c => {
      if (!c.checked) c.checked = true;
    });
    // recargar rápido para asegurar visibilidad
    routesLayerGroup.clearLayers();
    list.innerHTML = '';
    setTimeout(()=>{ routesLayerGroup.clearLayers(); list.innerHTML=''; loadRoutes(); }, 0);
  };
  document.getElementById('btn-zoom-all').onclick = ()=>{
    let union;
    routesLayerGroup.eachLayer(l=>{
      const b = l.getBounds?.();
      if (b && b.isValid()) union = union ? union.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
    });
    if (union && union.isValid()) map.fitBounds(union.pad(0.25));
    else setStatus('No hay rutas visibles para ajustar el zoom');
  };
}



function haversine(lat1, lon1, lat2, lon2){
  const R=6371000, toRad = x=>x*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function bearing(lat1,lon1,lat2,lon2){
  const toRad=x=>x*Math.PI/180, toDeg=x=>x*180/Math.PI;
  const y=Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2));
  const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
          Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1));
  return (toDeg(Math.atan2(y,x))+360)%360;
}

async function loadSafePoints(){
  const rsp = await fetch('safe_points.json');
  return await rsp.json();
}

async function findNearest(lat, lon){
  const pts = await loadSafePoints();
  let best=null, bestD=Infinity;
  for(const p of pts){
    const d = haversine(lat,lon,p.lat,p.lon);
    if(d<bestD){ bestD=d; best=p; }
  }
  return {point:best, dist:bestD};
}

function showUser(lat, lon){
  const here = [lat,lon];
  if(!userMarker){
    userMarker = L.marker(here).addTo(map);
  } else {
    userMarker.setLatLng(here);
  }
  map.setView(here, map.getZoom());
  try{
    const code = OpenLocationCode.encode(lat,lon, 10);
    plusEl.textContent = code;
  }catch(e){}
}

function drawDestinationLine(fromLat, fromLon, toLat, toLon){
  const coords = [[fromLat, fromLon], [toLat,toLon]];
  if(destLine){ destLine.remove(); }
  destLine = L.polyline(coords, {dashArray:'6,6'}).addTo(map);
}

function humanDistance(m){
  if(m<1000) return `${m.toFixed(0)} m`;
  return `${(m/1000).toFixed(2)} km`;
}

function copyPlus(){
  navigator.clipboard?.writeText(plusEl.textContent);
  setStatus('Plus Code copiado');
}

async function handleLost(){
  if(!lastPos){ setStatus('Activa tu ubicación primero'); return; }
  const {coords:{latitude:lat, longitude:lon}} = lastPos;
  const {point, dist} = await findNearest(lat,lon);
  if(!point){ nearestEl.textContent='—'; return; }
  nearestEl.textContent = `${point.name} (${humanDistance(dist)})`;
  drawDestinationLine(lat,lon,point.lat,point.lon);
  const brg = bearing(lat,lon,point.lat,point.lon);
  setStatus(`Rumbo aproximado: ${brg.toFixed(0)}°`);
}

let watchId=null, lastPos=null;
function startLocate(){
  if(!('geolocation' in navigator)){ setStatus('Sin geolocalización'); return; }
  if(watchId) { setStatus('Ubicación activa'); return; }
  watchId = navigator.geolocation.watchPosition(pos=>{
    lastPos = pos;
    showUser(pos.coords.latitude, pos.coords.longitude);
    setStatus('Ubicación actualizada');
  }, err=>{
    setStatus('No pude obtener ubicación (habilita GPS y permisos)');
  }, {enableHighAccuracy:true, maximumAge:3000, timeout:10000});
}

document.getElementById('btn-locate').addEventListener('click', startLocate);
document.getElementById('btn-lost').addEventListener('click', handleLost);
document.getElementById('btn-copy').addEventListener('click', copyPlus);

initMap();
loadRoutes();
