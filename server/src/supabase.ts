// Folosește fetch nativ din Node 20 (NU importa "node-fetch").

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase env');
}

// Helper generic pentru apeluri Supabase (REST & RPC)
export function supabaseFetch(path: string, init: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${SUPABASE_URL}${path}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  return fetch(url, { ...init, headers });
}

// Metode convenabile pentru operațiile folosite în proiect
export const sb = {
  async upsertUser(id: number, username: string) {
    const r = await supabaseFetch('/rest/v1/users', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ id, username }]),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`supabase upsertUser failed: ${r.status} ${txt}`);
    }
  },

  async getUserClicks(userId: number) {
    const r = await supabaseFetch(`/rest/v1/clicks?user_id=eq.${userId}`, { method: 'GET' });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`supabase getUserClicks failed: ${r.status} ${txt}`);
    }
    const js = (await r.json()) as { total: number }[];
    return js[0]?.total ?? 0;
  },

  async getLeaderboard(limit = 20) {
    const r = await supabaseFetch(
      `/rest/v1/leaderboard?select=*&order=total.desc&limit=${limit}`,
      { method: 'GET' }
    );
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`supabase leaderboard failed: ${r.status} ${txt}`);
    }
    return (await r.json()) as { id: number; username: string; total: number }[];
  },
};
