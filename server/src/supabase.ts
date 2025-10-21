import fetch from 'node-fetch';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Missing Supabase env');

export const sb = {
  async upsertUser(id: number, username: string) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{ id, username }])
    });
    if (!r.ok) throw new Error('supabase upsertUser failed');
  },
  async getUserClicks(userId: number) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/clicks?user_id=eq.${userId}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    if (!r.ok) throw new Error('supabase getUserClicks failed');
    const js = (await r.json()) as { total: number }[];
    return js[0]?.total ?? 0;
  },
  async getLeaderboard(limit = 20) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=total.desc&limit=${limit}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    if (!r.ok) throw new Error('supabase leaderboard failed');
    return (await r.json()) as { id: number; username: string; total: number }[];
  }
};
