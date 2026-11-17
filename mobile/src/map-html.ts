export const MAP_HTML = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #111817; }
    .leaflet-container { background: #111817; font-family: Arial, sans-serif; }
    .leaflet-control-attribution { font-size: 9px !important; }
    .leaflet-control-zoom a { color: #111 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-14.2, -51.9], 4);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const route = L.polyline([], { color: '#C7FF3D', weight: 6, opacity: 0.96, lineCap: 'round', lineJoin: 'round' }).addTo(map);
    const current = L.circleMarker([-14.2, -51.9], { radius: 7, color: '#101516', weight: 3, fillColor: '#C7FF3D', fillOpacity: 1 });
    window.updateRoute = function(points) {
      if (!Array.isArray(points)) return;
      const coords = points.map((point) => [Number(point[0]), Number(point[1])]);
      route.setLatLngs(coords);
      if (coords.length) {
        current.setLatLng(coords[coords.length - 1]).addTo(map);
        if (coords.length > 1) map.fitBounds(route.getBounds(), { padding: [24, 24], maxZoom: 17 });
        else map.setView(coords[0], 16);
      }
    };
    window.centerOn = function(latitude, longitude) {
      map.setView([latitude, longitude], 16, { animate: true });
    };
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
  </script>
</body>
</html>`;