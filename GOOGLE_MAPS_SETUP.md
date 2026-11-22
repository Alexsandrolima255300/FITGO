# FIT GO — configuração do Google Maps

1. No Google Cloud Console, selecione um projeto e ative **Maps JavaScript API**.
2. Configure faturamento e crie uma chave de API.
3. Restrinja a chave por HTTP referrer aos domínios oficiais e de preview do FIT GO; restrinja a API à Maps JavaScript API.
4. Para desenvolvimento local, crie `.env.local` na raiz:

```env
VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

5. Na Vercel, cadastre `VITE_GOOGLE_MAPS_API_KEY` nas Environment Variables dos ambientes usados e publique um novo deploy.

A chave do navegador é visível no bundle, portanto a proteção é feita por restrições de domínio e API. Nunca use uma chave irrestrita.

A migração substitui apenas a camada de mapa. O GPS continua usando `navigator.geolocation.watchPosition`; as atividades permanecem em `localStorage` na chave `fgruns`, no mesmo formato; o cálculo de distância usa Haversine; e a exportação GPX permanece compatível.
