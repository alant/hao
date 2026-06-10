// Proxies search suggestions from Bing or Baidu to fix browser CORS.
// Uses the Cloudflare Cache API to cache at the edge for 60 seconds.
const edgeCache = typeof caches !== 'undefined' ? caches.default : null;

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const q      = searchParams.get('q')      || '';
  const engine = searchParams.get('engine') || 'bing';

  if (!q.trim()) return json([]);

  const cacheKey = new Request(context.request.url);

  // Serve from edge cache if available (undefined in local dev / pages.dev)
  const cached = await edgeCache?.match(cacheKey);
  if (cached) return cached;

  try {
    let suggestions = [];

    if (engine === 'baidu') {
      const res  = await fetch(
        `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.baidu.com/' } }
      );
      const data = await res.json();
      suggestions = (data.g || []).map(item => item.q).filter(Boolean);
    } else {
      const res  = await fetch(
        `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}&language=zh-CN`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await res.json();
      suggestions = data[1] || [];
    }

    const response = json(suggestions.slice(0, 8));

    // Store in Cloudflare edge cache
    if (edgeCache) context.waitUntil(edgeCache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    return json([]);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type':                'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control':               'public, max-age=60',
    },
  });
}
