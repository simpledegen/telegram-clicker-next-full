import { Router } from 'express';
import { authWebApp } from '../auth.js';
import {
  incUserClicks,
  getOrCreateUser,
  getGlobalClicks,
  getUserClicksCached,
  getTopUsersDetailed, // ✅ folosim varianta care aduce și username-urile
} from '../db.js';

export const webapp = Router();

/**
 * GET /api/me – datele pentru UI (cu username în leaderboard)
 */
webapp.get('/me', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  // asigură user + username în DB
  const me = await getOrCreateUser(u.id, u.username);

  // global + top cu username
  const [global, top] = await Promise.all([
    getGlobalClicks(),
    getTopUsersDetailed(20),
  ]);

  res.json({
    me: me.total, // total-ul meu
    global,       // total global
    top,          // [{ userId, total, username? }, ...]
  });
});

/**
 * POST /api/click – click +1, răspuns rapid
 */
webapp.post('/click', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  try {
    // increment rapid în Redis
    const me = await incUserClicks(u.id, 1);
    const global = await getGlobalClicks();

    // răspunde imediat clientului
    res.json({ me, global });

    // persistă în Supabase în background (RPC-ul din incUserClicks e fire-and-forget)
  } catch (_e) {
    // fallback: nu stricăm UI-ul dacă a eșuat RPC/altceva
    res.status(200).json({
      me: await getUserClicksCached(u.id),
      global: await getGlobalClicks(),
    });
  }
});

/**
 * POST /api/name – schimbă username-ul
 */
webapp.post('/name', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const { username } = req.body || {};
  const me = await getOrCreateUser(u.id, username);
  res.json({ ok: true, username: me.username });
});
