// Returns Cloudflare's built-in geolocation data for the visitor.
// Works automatically on Cloudflare Pages — no API key needed.
export async function onRequest(context) {
  const cf = context.request.cf ?? {};
  return new Response(JSON.stringify({
    city:      cf.city      ?? null,
    region:    cf.region    ?? null,
    country:   cf.country   ?? null,
    latitude:  cf.latitude  ?? null,
    longitude: cf.longitude ?? null,
    timezone:  cf.timezone  ?? null,
  }), {
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control':               'no-store',
    },
  });
}
