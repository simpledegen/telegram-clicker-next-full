import { Router } from 'express';
import { authWebApp } from '../auth.js';
import {
  incUserClicks,
  getOrCreateUser,
  getGlobalClicks,
  getUserClicksCached,
  getTopUsersDetailed, 
} from '../db.js';

export const webapp = Router();

webapp.get('/me', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const me = await getOrCreateUser(u.id, u.username);

  const [global, top] = await Promise.all([
    getGlobalClicks(),
    getTopUsersDetailed(20),
  ]);

  res.json({
    me: me.total, 
    global,       
    top,          
  });
});

webapp.post('/click', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  try {
    const me = await incUserClicks(u.id, 1);
    const global = await getGlobalClicks();

    res.json({ me, global });

  } catch (_e) {
    res.status(200).json({
      me: await getUserClicksCached(u.id),
      global: await getGlobalClicks(),
    });
  }
});

webapp.post('/name', authWebApp, async (req, res) => {
  const u = req.tgUser!;
  const { username } = req.body || {};
  const me = await getOrCreateUser(u.id, username);
  res.json({ ok: true, username: me.username });
});
