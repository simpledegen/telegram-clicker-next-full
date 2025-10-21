import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const ALLOW_DEV = process.env.ALLOW_DEV === '1';

export type TgUser = { id: number; username?: string };

declare module 'express-serve-static-core' {
  interface Request {
    tgUser?: TgUser;
  }
}

/**
 * Parsează initData de la Telegram WebApp (x-telegram-init).
 * Pentru dev local (ALLOW_DEV=1), dacă nu există init, folosim un user mock.
 */
export function authWebApp(req: Request, res: Response, next: NextFunction) {
  const initData = req.header('x-telegram-init');

  // DEV bypass
  if (ALLOW_DEV && (!initData || initData === 'DEV')) {
    req.tgUser = { id: 999, username: 'dev' };
    return next();
  }

  if (!initData) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Validare minimală (opțional poți aplica validarea completă cu HMAC)
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) throw new Error('no user');
    const user = JSON.parse(userStr) as { id: number; username?: string };

    // Validare HMAC (schematică)
    const hash = params.get('hash');
    if (!hash) throw new Error('no hash');
    const dataCheckString = [...params.entries()]
      .filter(([k]) => k !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const check = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    if (check !== hash) throw new Error('bad signature');

    req.tgUser = { id: user.id, username: user.username };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
}
