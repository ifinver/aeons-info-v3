/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		// KV API routing
		if (url.pathname === '/api/kv' || url.pathname.startsWith('/api/kv/')) {
			return handleKvApi(request, env);
		}
		switch (url.pathname) {
			case '/message':
				return new Response('Hello, World!');
			case '/random':
				return new Response(crypto.randomUUID());
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;

// --- KV API helpers ---
async function handleKvApi(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segments = url.pathname.split('/').filter(Boolean); // ['api','kv', ...]

  // 检查是否是练功时间KV请求
  if (segments.length >= 3 && segments[2] === 'practice-time') {
    const notBound = !env || !('aeons_info_practice_time' in env) || !env.aeons_info_practice_time;
    if (notBound) {
      return json(
        { error: 'aeons_info_practice_time namespace not bound. Add a KV binding named "aeons_info_practice_time" in wrangler config.' },
        501
      );
    }
    return handlePracticeTimeKv(request, env.aeons_info_practice_time, segments.slice(3));
  }

  // 默认KV处理
  const notBound = !env || !('aeons_info_config' in env) || !env.aeons_info_config;
  if (notBound) {
    return json(
      { error: 'aeons_info_config namespace not bound. Add a KV binding named "aeons_info_config" in wrangler config.' },
      501
    );
  }

  // GET /api/kv -> list keys (optional prefix)
  if (segments.length === 2 && method === 'GET') {
    const prefix = url.searchParams.get('prefix') ?? undefined;
    const list = await env.aeons_info_config.list({ prefix });
    return json(list);
  }

  // /api/kv/:key
  if (segments.length >= 3) {
    const key = decodeURIComponent(segments.slice(2).join('/'));

    if (method === 'GET') {
      const value = await env.aeons_info_config.get(key, { type: 'json' });
      if (value === null) return json({ error: 'Key not found' }, 404);
      return json(value);
    }

    if (method === 'DELETE') {
      await env.aeons_info_config.delete(key);
      return json({ ok: true });
    }

    if (method === 'POST' || method === 'PUT') {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }
      const ttlParam = url.searchParams.get('ttl');
      const ttl = ttlParam ? Number(ttlParam) : undefined;
      await env.aeons_info_config.put(key, JSON.stringify(body), ttl ? { expirationTtl: ttl } : undefined);
      return json({ ok: true });
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}

// --- Practice Time KV handlers ---
async function handlePracticeTimeKv(request: Request, kv: any, segments: string[]): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // GET /api/kv/practice-time -> 获取所有练功记录
  if (segments.length === 0 && method === 'GET') {
    const list = await kv.list();
    const records = [];
    
    for (const key of list.keys) {
      const value = await kv.get(key.name, { type: 'json' });
      if (value) {
        records.push({
          date: key.name,
          ...value
        });
      }
    }
    
    // 按日期排序
    records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return json(records);
  }

  // POST /api/kv/practice-time -> 添加新的练功记录
  if (segments.length === 0 && method === 'POST') {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.date || body.hours === undefined || body.minutes === undefined) {
      return json({ error: 'Missing required fields: date, hours, minutes' }, 400);
    }

    // 验证数据格式
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(body.date)) {
      return json({ error: 'Invalid date format, expected YYYY-MM-DD' }, 400);
    }

    const hours = parseInt(body.hours);
    const minutes = parseInt(body.minutes);
    
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
      return json({ error: 'Invalid time values' }, 400);
    }

    // 存储数据
    const record = {
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
      timestamp: new Date().toISOString()
    };

    await kv.put(body.date, JSON.stringify(record));
    return json({ ok: true, record });
  }

  // DELETE /api/kv/practice-time/:date -> 删除指定日期的记录
  if (segments.length === 1 && method === 'DELETE') {
    const date = decodeURIComponent(segments[0]);
    await kv.delete(date);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed or invalid path' }, 405);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
