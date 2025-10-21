import { Router } from 'express';
import { authWebApp } from '../auth.js';
import { incUserClicks, getOrCreateUser, getGlobalClicks, getTopUsers } from '../db.js';

export const webapp = Router();

// GET /api/me – datele pentru UI
webapp.get('/me', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const me = await getOrCreateUser(u.id, u.username);
  const [global, top] = await Promise.all([getGlobalClicks(), getTopUsers(20)]);
  res.json({
    me: me.total,
    global,
    top,
  });
});

// POST /api/click – click +1
webapp.post('/click', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const me = await incUserClicks(u.id, 1);
  const global = await getGlobalClicks();
  res.json({ me, global });
});

// POST /api/name – schimbă username-ul
webapp.post('/name', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const { username } = req.body || {};
  const me = await getOrCreateUser(u.id, username);
  res.json({ ok: true, username: me.username });
});
