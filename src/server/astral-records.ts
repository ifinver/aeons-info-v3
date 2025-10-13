/**
 * 出神记录（记事本/文章）处理模块
 * - 用户隔离：所有键以 u:<userId>: 前缀
 * - 记事本键：
 *   - u:<userId>:nb:list -> string[] 记事本ID按新到旧
 *   - u:<userId>:nb:<notebookId> -> { id, name, createdAt, updatedAt }
 * - 文章键：
 *   - u:<userId>:nb:<notebookId>:post:list -> string[] 文章ID按新到旧
 *   - u:<userId>:nb:<notebookId>:post:<postId>:meta -> { id, title, createdAt, updatedAt }
 *   - u:<userId>:nb:<notebookId>:post:<postId>:content -> string Markdown 正文
 */

import { getChinaISOString } from './timezone';

export interface NotebookMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export async function handleAstralRecordsKv(
  request: Request,
  kv: KVNamespace,
  segments: string[],
  user: { id: string }
): Promise<Response> {
  const method = request.method.toUpperCase();

  // /api/kv/astral-records
  // ├─ GET notebooks
  // ├─ POST notebooks
  // ├─ GET notebooks/:nbId
  // ├─ PUT notebooks/:nbId
  // ├─ DELETE notebooks/:nbId
  // ├─ GET notebooks/:nbId/posts
  // ├─ POST notebooks/:nbId/posts
  // ├─ GET notebooks/:nbId/posts/:postId
  // ├─ PUT notebooks/:nbId/posts/:postId
  // └─ DELETE notebooks/:nbId/posts/:postId

  // notebooks root
  if (segments.length === 1 && segments[0] === 'notebooks') {
    if (method === 'GET') {
      const list = await getNotebookList(kv, user.id);
      return json(list);
    }
    if (method === 'POST') {
      const body = await readJson(request);
      if (!body || typeof body.name !== 'string' || !body.name.trim()) {
        return json({ error: '缺少记事本名称' }, 400);
      }
      const meta = await createNotebook(kv, user.id, body.name.trim());
      return json({ ok: true, notebook: meta });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  // notebooks/:nbId
  if (segments.length === 2 && segments[0] === 'notebooks') {
    const nbId = decodeURIComponent(segments[1]);
    if (method === 'GET') {
      const meta = await getNotebook(kv, user.id, nbId);
      if (!meta) return json({ error: 'Notebook not found' }, 404);
      return json(meta);
    }
    if (method === 'PUT') {
      const body = await readJson(request);
      if (!body || typeof body.name !== 'string' || !body.name.trim()) {
        return json({ error: '缺少记事本名称' }, 400);
      }
      const updated = await renameNotebook(kv, user.id, nbId, body.name.trim());
      if (!updated) return json({ error: 'Notebook not found' }, 404);
      return json({ ok: true, notebook: updated });
    }
    if (method === 'DELETE') {
      const ok = await deleteNotebook(kv, user.id, nbId);
      if (!ok) return json({ error: 'Notebook not found' }, 404);
      return json({ ok: true });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  // notebooks/:nbId/posts
  if (segments.length === 3 && segments[0] === 'notebooks' && segments[2] === 'posts') {
    const nbId = decodeURIComponent(segments[1]);
    if (method === 'GET') {
      const list = await getPostList(kv, user.id, nbId);
      return json(list);
    }
    if (method === 'POST') {
      const body = await readJson(request);
      if (!body || typeof body.title !== 'string' || !body.title.trim() || typeof body.content !== 'string') {
        return json({ error: '缺少标题或内容' }, 400);
      }
      const created = await createPost(kv, user.id, nbId, body.title.trim(), body.content);
      if (!created) return json({ error: 'Notebook not found' }, 404);
      return json({ ok: true, post: created });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  // notebooks/:nbId/posts/:postId
  if (segments.length === 4 && segments[0] === 'notebooks' && segments[2] === 'posts') {
    const nbId = decodeURIComponent(segments[1]);
    const postId = decodeURIComponent(segments[3]);
    if (method === 'GET') {
      const post = await getPost(kv, user.id, nbId, postId);
      if (!post) return json({ error: 'Post not found' }, 404);
      return json(post);
    }
    if (method === 'PUT') {
      const body = await readJson(request);
      if (!body || (typeof body.title !== 'string' && typeof body.content !== 'string')) {
        return json({ error: '缺少要更新的字段' }, 400);
      }
      const updated = await updatePost(kv, user.id, nbId, postId, body.title, body.content);
      if (!updated) return json({ error: 'Post not found' }, 404);
      return json({ ok: true, post: updated });
    }
    if (method === 'DELETE') {
      const ok = await deletePost(kv, user.id, nbId, postId);
      if (!ok) return json({ error: 'Post not found' }, 404);
      return json({ ok: true });
    }
    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ error: 'Invalid path' }, 404);
}

// --- KV helpers ---

function nbListKey(userId: string) { return `u:${userId}:nb:list`; }
function nbMetaKey(userId: string, nbId: string) { return `u:${userId}:nb:${nbId}`; }
function postListKey(userId: string, nbId: string) { return `u:${userId}:nb:${nbId}:post:list`; }
function postMetaKey(userId: string, nbId: string, postId: string) { return `u:${userId}:nb:${nbId}:post:${postId}:meta`; }
function postContentKey(userId: string, nbId: string, postId: string) { return `u:${userId}:nb:${nbId}:post:${postId}:content`; }

async function getNotebookList(kv: KVNamespace, userId: string): Promise<NotebookMeta[]> {
  const ids = (await kv.get(nbListKey(userId), { type: 'json' })) as string[] | null;
  if (!ids || ids.length === 0) return [];
  const metas = await Promise.all(ids.map(id => kv.get(nbMetaKey(userId, id), { type: 'json' }) as Promise<NotebookMeta | null>));
  return metas.filter(Boolean) as NotebookMeta[];
}

async function getNotebook(kv: KVNamespace, userId: string, nbId: string): Promise<NotebookMeta | null> {
  return (await kv.get(nbMetaKey(userId, nbId), { type: 'json' })) as NotebookMeta | null;
}

async function createNotebook(kv: KVNamespace, userId: string, name: string): Promise<NotebookMeta> {
  const id = cryptoRandomId();
  const now = getChinaISOString();
  const meta: NotebookMeta = { id, name, createdAt: now, updatedAt: now };
  const list = ((await kv.get(nbListKey(userId), { type: 'json' })) as string[] | null) || [];
  await kv.put(nbMetaKey(userId, id), JSON.stringify(meta));
  await kv.put(nbListKey(userId), JSON.stringify([id, ...list]));
  return meta;
}

async function renameNotebook(kv: KVNamespace, userId: string, nbId: string, name: string): Promise<NotebookMeta | null> {
  const meta = await getNotebook(kv, userId, nbId);
  if (!meta) return null;
  const updated: NotebookMeta = { ...meta, name, updatedAt: getChinaISOString() };
  await kv.put(nbMetaKey(userId, nbId), JSON.stringify(updated));
  return updated;
}

async function deleteNotebook(kv: KVNamespace, userId: string, nbId: string): Promise<boolean> {
  const meta = await getNotebook(kv, userId, nbId);
  if (!meta) return false;
  const list = ((await kv.get(nbListKey(userId), { type: 'json' })) as string[] | null) || [];
  const next = list.filter(id => id !== nbId);
  await kv.put(nbListKey(userId), JSON.stringify(next));
  // 删除该记事本下的所有文章键（尽力而为）
  const posts = ((await kv.get(postListKey(userId, nbId), { type: 'json' })) as string[] | null) || [];
  for (const postId of posts) {
    await kv.delete(postMetaKey(userId, nbId, postId));
    await kv.delete(postContentKey(userId, nbId, postId));
  }
  await kv.delete(postListKey(userId, nbId));
  await kv.delete(nbMetaKey(userId, nbId));
  return true;
}

async function getPostList(kv: KVNamespace, userId: string, nbId: string): Promise<PostMeta[]> {
  const list = ((await kv.get(postListKey(userId, nbId), { type: 'json' })) as string[] | null) || [];
  if (list.length === 0) return [];
  const metas = await Promise.all(list.map(id => kv.get(postMetaKey(userId, nbId, id), { type: 'json' }) as Promise<PostMeta | null>));
  return metas.filter(Boolean) as PostMeta[];
}

async function createPost(kv: KVNamespace, userId: string, nbId: string, title: string, content: string): Promise<PostMeta | null> {
  const nb = await getNotebook(kv, userId, nbId);
  if (!nb) return null;
  const id = cryptoRandomId();
  const now = getChinaISOString();
  const meta: PostMeta = { id, title, createdAt: now, updatedAt: now };
  const list = ((await kv.get(postListKey(userId, nbId), { type: 'json' })) as string[] | null) || [];
  await kv.put(postMetaKey(userId, nbId, id), JSON.stringify(meta));
  await kv.put(postContentKey(userId, nbId, id), content);
  await kv.put(postListKey(userId, nbId), JSON.stringify([id, ...list]));
  // 更新 notebook 的 updatedAt
  await kv.put(nbMetaKey(userId, nbId), JSON.stringify({ ...nb, updatedAt: now }));
  return meta;
}

async function getPost(kv: KVNamespace, userId: string, nbId: string, postId: string): Promise<{ meta: PostMeta; content: string } | null> {
  const meta = (await kv.get(postMetaKey(userId, nbId, postId), { type: 'json' })) as PostMeta | null;
  if (!meta) return null;
  const content = (await kv.get(postContentKey(userId, nbId, postId))) || '';
  return { meta, content };
}

async function updatePost(kv: KVNamespace, userId: string, nbId: string, postId: string, title?: string, content?: string): Promise<PostMeta | null> {
  const meta = (await kv.get(postMetaKey(userId, nbId, postId), { type: 'json' })) as PostMeta | null;
  if (!meta) return null;
  const now = getChinaISOString();
  const updated: PostMeta = { ...meta, title: typeof title === 'string' && title.trim() ? title.trim() : meta.title, updatedAt: now };
  await kv.put(postMetaKey(userId, nbId, postId), JSON.stringify(updated));
  if (typeof content === 'string') {
    await kv.put(postContentKey(userId, nbId, postId), content);
  }
  return updated;
}

async function deletePost(kv: KVNamespace, userId: string, nbId: string, postId: string): Promise<boolean> {
  const meta = (await kv.get(postMetaKey(userId, nbId, postId), { type: 'json' })) as PostMeta | null;
  if (!meta) return false;
  const list = ((await kv.get(postListKey(userId, nbId), { type: 'json' })) as string[] | null) || [];
  const next = list.filter(id => id !== postId);
  await kv.put(postListKey(userId, nbId), JSON.stringify(next));
  await kv.delete(postMetaKey(userId, nbId, postId));
  await kv.delete(postContentKey(userId, nbId, postId));
  return true;
}

// --- utils ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

async function readJson(req: Request): Promise<any | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function cryptoRandomId(): string {
  // 生成 16 字节随机ID的base36表示
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
}


