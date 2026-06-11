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

    // Single request with namedetails=1 returns all language variants — avoids
    // doubling Nominatim hits and reduces risk of rate-limiting.
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&namedetails=1&accept-language=zh-CN`,
      { headers }
    );
    const data = await res.json();

    const pick = (d, lang) => {
      const addr = d.address || {};
      const field = addr.city || addr.town || addr.county || addr.state || '';
      if (lang && d.namedetails) {
        const tagged = d.namedetails[`name:${lang}`];
        return tagged || field;
      }
      return field;
    };
    const nameZh     = pick(data, 'zh');
    const nameNative = pick(data, 'en');

    const response = json({ nameZh, nameNative });
    // Cache for 24 hours — city names don't change
    if (edgeCache) context.waitUntil(edgeCache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ nameZh: '', nameNative: '' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
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
