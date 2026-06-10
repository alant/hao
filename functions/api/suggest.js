// Proxies search suggestions from Bing or Baidu to fix browser CORS.
export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const q      = searchParams.get('q')      || '';
  const engine = searchParams.get('engine') || 'bing';

  if (!q.trim()) {
    return json([]);
  }

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
      // Bing OpenSearch suggestion API
      const res  = await fetch(
        `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}&language=zh-CN`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await res.json();
      suggestions = data[1] || [];
    }

    return json(suggestions.slice(0, 8));
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
