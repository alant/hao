// Proxies Weibo's public trending endpoint to fix browser CORS restrictions.
// Uses the Cloudflare Cache API to actually cache at the edge for 5 minutes,
// preventing repeated upstream requests on every page load.
export async function onRequest(context) {
  const cache    = caches.default;
  const cacheKey = new Request('https://weibo.com/ajax/side/hotSearch-cached');

  // Serve from edge cache if available
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer':    'https://weibo.com/',
        'Accept':     'application/json, text/plain, */*',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream error', status: res.status }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data     = await res.json();
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type':                'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control':               'public, max-age=300',
      },
    });

    // Store in Cloudflare edge cache — clone because body can only be read once
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
