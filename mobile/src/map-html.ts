export const MAP_HTML = String.raw\`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #101716; }
    .leaflet-container { background: #101716; font-family: Arial, sans-serif; }
    .leaflet-control-attribution { font-size: 8px !important; background: rgba(8,10,11,.72) !important; color: #aab5b1 !important; padding: 2px 5px !important; border-radius: 5px 0 0 0; }
    .leaflet-control-attribution a { color: #C7FF3D !important; }
    .leaflet-control-zoom { border: 1px solid #283033 !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.3) !important; }
    .leaflet-control-zoom a { width: 30px !important; height: 30px !important; line-height: 30px !important; background: #101516 !important; color: #C7FF3D !important; border-bottom: 1px solid #283033 !important; }
    .leaflet-control-zoom a:hover { background: #202A1A !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: true, preferCanvas: true }).setView([-14.2, -51.9], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    const routeGlow = L.polyline([], { color: '#C7FF3D', weight: 13, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const route = L.polyline([], { color: '#C7FF3D', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const currentHalo = L.circleMarker([-14.2, -51.9], { radius: 11, color: '#C7FF3D', weight: 1, opacity: 0.5, fillColor: '#C7FF3D', fillOpacity: 0.16 });
    const current = L.circleMarker([-14.2, -51.9], { radius: 6, color: '#101516', weight: 3, fillColor: '#C7FF3D', fillOpacity: 1 });
    window.updateRoute = function(points) {
      if (!Array.isArray(points)) return;
      const coords = points.map((point) => [Number(point[0]), Number(point[1])]);
      routeGlow.setLatLngs(coords);
      route.setLatLngs(coords);
      if (coords.length) {
        const last = coords[coords.length - 1];
        currentHalo.setLatLng(last).addTo(map);
        current.setLatLng(last).addTo(map);
        if (coords.length > 1) map.fitBounds(route.getBounds(), { padding: [34, 34], maxZoom: 17 });
        else map.setView(last, 16);
      }
    };
    window.centerOn = function(latitude, longitude) {
      map.setView([latitude, longitude], 16, { animate: true });
    };
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
  </script>
</body>
</html>\`;