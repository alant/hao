// Reverse-geocodes lat/lon to Chinese + native city name via Nominatim.
// Called server-side to avoid CORS and to keep user IP off third-party logs.
const edgeCache = typeof caches !== 'undefined' ? caches.default : null;

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) return json({ nameZh: '', nameNative: '' });

  const cacheKey = new Request(context.request.url);
  const cached = await edgeCache?.match(cacheKey);
  if (cached) return cached;

  try {
    const headers = { 'User-Agent': 'haohome-portal/1.0 (family portal)' };

    const [zhRes, enRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh-CN`, { headers }),
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,    { headers }),
    ]);

    const [zhData, enData] = await Promise.all([zhRes.json(), enRes.json()]);

    const pick = d => d.address?.city || d.address?.town || d.address?.county || d.address?.state || '';
    const nameZh     = pick(zhData);
    const nameNative = pick(enData);

    const response = json({ nameZh, nameNative });
    // Cache for 24 hours — city names don't change
    if (edgeCache) context.waitUntil(edgeCache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return json({ nameZh: '', nameNative: '' });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type':  'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
