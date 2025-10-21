import Redis from 'ioredis';
import { supabaseFetch } from './supabase.js';

const redis = new Redis(process.env.REDIS_URL!);

const keyUser = (id: number) => `user:${id}:total`;
const keyGlobal = 'global:total';
const keyLb = 'leaderboard';

/**
 * Increment rapid în Redis + persist în DB prin RPC (fire-and-forget).
 * Îl lăsăm rapid pentru UX. Dacă vrei “strict”, pune await pe RPC și tratează erorile.
 */
export async function incUserClicks(userId: number, delta: number): Promise<number> {
  const pipe = redis.multi();
  pipe.incrby(keyUser(userId), delta);
  pipe.incrby(keyGlobal, delta);
  pipe.zincrby(keyLb, delta, String(userId));
  const exec = await pipe.exec();
  const userNewRaw = exec?.[0]?.[1] ?? '0';
  const userNew = Number(userNewRaw);

  void supabaseFetch('/rest/v1/rpc/inc_clicks', {
    method: 'POST',
    body: JSON.stringify({ p_user_id: userId, p_d: delta }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(`inc_clicks RPC fail ${r.status} ${await r.text().catch(()=>'')}`);
    })
    .catch((e) => console.error('inc_clicks RPC fail', e));

  return userNew;
}

/** AFIȘARE USER: DB-first, apoi sincronizează Redis dacă e în urmă */
export async function getUserClicksStable(userId: number): Promise<number> {
  const [rVal, dbVal] = await Promise.all([
    redis.get(keyUser(userId)),
    (async () => {
      const r = await supabaseFetch(`/rest/v1/clicks?user_id=eq.${userId}&select=total&limit=1`, { method: 'GET' });
      if (!r.ok) return 0;
      const rows = (await r.json()) as { total: number }[];
      return Number(rows[0]?.total ?? 0);
    })(),
  ]);

  const rNum = rVal ? Number(rVal) : 0;
  const final = Math.max(rNum, dbVal);

  if (final !== rNum) await redis.set(keyUser(userId), String(final));
  return final;
}

/** AFIȘARE GLOBAL: DB-first (sumă), apoi ajustează Redis dacă e gol/mai mic */
export async function getGlobalClicksStable(): Promise<number> {
  const rv = await redis.get(keyGlobal);
  if (rv !== null && !Number.isNaN(Number(rv))) {
    const dbSum = await sumDbClicks();
    const rNum = Number(rv);
    const final = Math.max(rNum, dbSum);
    if (final !== rNum) await redis.set(keyGlobal, String(final));
    return final;
  }
  const sum = await sumDbClicks();
  await redis.set(keyGlobal, String(sum));
  return sum;
}

/** Leaderboard rămâne din Redis pentru performanță */
export async function getTopUsers(n: number) {
  const r = await supabaseFetch(
    `/rest/v1/clicks?select=user_id,total&order=total.desc&limit=${n}`,
    { method: 'GET' }
  );
  if (!r.ok) {
    // fallback pe Redis doar dacă pică Supabase
    const arr = await redis.zrevrange('leaderboard', 0, n - 1, 'WITHSCORES');
    const out: { userId: number; total: number }[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      out.push({ userId: Number(arr[i]), total: Number(arr[i + 1]) });
    }
    return out;
  }
  const rows = (await r.json()) as { user_id: number; total: number }[];
  // menținem aceeași formă { userId, total } ca să nu schimbi alt cod
  return rows.map((x) => ({ userId: x.user_id, total: Number(x.total || 0) }));
}


/** Creează/actualizează userul în DB (compat cu vechiul cod) */
export async function getOrCreateUser(userId: number, username?: string) {
  if (!username) username = `user_${userId}`;

  // Citește existentul
  const existing = await supabaseFetch(`/rest/v1/users?id=eq.${userId}`, { method: 'GET' })
    .then((r) => r.json() as Promise<any[]>)
    .catch(() => []);

  if (!existing?.length) {
    await supabaseFetch('/rest/v1/users', {
      method: 'POST',
      body: JSON.stringify([{ id: userId, username }]),
      headers: { Prefer: 'resolution=merge-duplicates' },
    }).catch(() => {});
  } else if (existing[0]?.username !== username) {
    await supabaseFetch(`/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    }).catch(() => {});
  }

  const total = await getUserClicksStable(userId);
  return { id: userId, username, total };
}

/** Încălzire global la boot din DB */
export async function warmupGlobalFromDB() {
  try {
    const dbSum = await sumDbClicks();
    const rVal = await redis.get(keyGlobal);
    const rNum = rVal ? Number(rVal) : 0;
    if (!rVal || rNum < dbSum) {
      await redis.set(keyGlobal, String(dbSum));
    }
  } catch (e) {
    console.error('warmupGlobalFromDB fail', e);
  }
}

/** Helper: sumă globală din DB */
async function sumDbClicks(): Promise<number> {
  const r = await supabaseFetch('/rest/v1/clicks?select=total', { method: 'GET' });
  if (!r.ok) return 0;
  const rows = (await r.json()) as { total: number }[];
  return rows.reduce((a, x) => a + Number(x.total || 0), 0);
}

/** ===== Aliasuri pentru compatibilitate cu vechea bază de cod ===== */
export { getUserClicksStable as getUserClicksCached };
export { getGlobalClicksStable as getGlobalClicks };

export { redis };
