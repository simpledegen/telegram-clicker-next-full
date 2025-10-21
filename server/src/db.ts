import Redis from 'ioredis';

// === ENV ===
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase env (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
}

const redis = new Redis(REDIS_URL);

// === Redis keys ===
const keyUser = (id: number) => `u:${id}:total`;
const keyGlobal = 'global:total';
const keyLb = 'lb:z';

// === Helpers ===
async function supabaseFetch(path: string, init?: RequestInit) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  };
  const r = await fetch(url, { ...init, headers });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Supabase ${path} ${r.status}: ${text}`);
  }
  return r;
}

// === Public API ===

/** Citește totalul curent din Redis (0 dacă nu există) */
export async function getUserClicksCached(userId: number): Promise<number> {
  const v = await redis.get(keyUser(userId));
  return v ? Number(v) : 0;
}

/** Total global (din Redis) */
export async function getGlobalClicks(): Promise<number> {
  const v = await redis.get(keyGlobal);
  return v ? Number(v) : 0;
}

/** Top N din Redis (ZSET) */
export async function getTopUsers(limit: number): Promise<{ userId: number; total: number }[]> {
  const rows = await redis.zrevrange(keyLb, 0, limit - 1, 'WITHSCORES');
  const out: { userId: number; total: number }[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    out.push({ userId: Number(rows[i]), total: Number(rows[i + 1]) });
  }
  return out;
}

/** Creează/actualizează userul în Supabase, și întoarce totalul (din Redis, cu fallback la DB) */
export async function getOrCreateUser(userId: number, username?: string): Promise<{ id: number; username: string; total: number }> {
  // upsert în public.users
  if (username && username.length >= 3 && username.length <= 32) {
    await supabaseFetch(`/rest/v1/users`, {
      method: 'POST',
      body: JSON.stringify({ id: userId, username }),
      headers: { Prefer: 'resolution=merge-duplicates' },
    });
  } else {
    // asigură existența userului (fără a suprascrie username)
    await supabaseFetch(`/rest/v1/users`, {
      method: 'POST',
      body: JSON.stringify({ id: userId, username: username ?? `user_${userId}` }),
      headers: { Prefer: 'resolution=ignore-duplicates' },
    });
  }

  // citește totalul: întâi Redis, apoi DB dacă e cazul
  let total = await getUserClicksCached(userId);
  if (!total) {
    // ia din public.clicks
    const r = await supabaseFetch(`/rest/v1/clicks?select=total&user_id=eq.${userId}`, { method: 'GET' });
    const rows = (await r.json()) as { total: number }[];
    total = rows?.[0]?.total ?? 0;
    if (total) {
      await redis.set(keyUser(userId), String(total));
      await redis.zadd(keyLb, total, String(userId));
    }
  }

  // obține username-ul actual (pentru leaderboard)
  const rU = await supabaseFetch(`/rest/v1/users?id=eq.${userId}&select=username`, { method: 'GET' });
  const rowU = (await rU.json()) as { username?: string }[];
  const uname = rowU?.[0]?.username ?? `user_${userId}`;

  return { id: userId, username: uname, total };
}

/** Incrementează per-user, leaderboard & global în Redis + persistă în Supabase RPC */
export async function incUserClicks(userId: number, delta: number): Promise<number> {
  if (!Number.isFinite(delta) || delta <= 0) delta = 1;

  const pipe = redis.multi();
  pipe.incrby(keyUser(userId), delta);
  pipe.incrby(keyGlobal, delta);
  pipe.zincrby(keyLb, delta, String(userId));
  const [userNew] = (await pipe.exec()) as [unknown, unknown, unknown] as [number, number, number][];

  // persistă în DB (RPC inc_clicks)
void supabaseFetch(`/rest/v1/rpc/inc_clicks`, {
  method: 'POST',
  body: JSON.stringify({ p_user_id: userId, p_d: delta }),
}).catch((e) => console.error('inc_clicks RPC fail', e));

  return Number(userNew);
}
