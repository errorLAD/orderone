import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function verifyAll() {
  const routes = ['/', '/login', '/onboarding', '/store/annapurna-foods', '/menu/annapurna-foods'];
  for (const r of routes) {
    const res = await get(`http://localhost:3000${r}`);
    console.log(`Route: ${r} -> Status: ${res.statusCode}, HTML: ${res.data.length} bytes`);
    const cssMatches = [...res.data.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) => m[1]);
    for (const cssUrl of cssMatches) {
      const fullUrl = cssUrl.startsWith('http') ? cssUrl : `http://localhost:3000${cssUrl}`;
      const cssRes = await get(fullUrl);
      console.log(`   CSS: ${cssUrl} -> ${cssRes.statusCode} (${cssRes.data.length} bytes)`);
    }
  }
}

verifyAll().catch(console.error);
