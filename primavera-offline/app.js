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
  ROUTE_FILES.forEach(file => {
    fetch(`routes_geojson/${file}`)
      .then(r => r.json())
      .then(geo => {
        const layer = L.geoJSON(geo, {
          style: {weight: 3},
          pointToLayer: (feat, latlng) => L.circleMarker(latlng, {radius:4})
        }).addTo(routesLayerGroup);

        const id = 'r_' + file.replace(/\W/g,'_');
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" id="${id}" checked> ${file}`;
        list.appendChild(label);
        document.getElementById(id).addEventListener('change', (e)=>{
          if(e.target.checked){ routesLayerGroup.addLayer(layer); }
          else { routesLayerGroup.removeLayer(layer); }
        });
      })
      .catch(()=> setStatus(`No pude cargar ${file}`));
  });
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
