const API = (path: string) => `/api${path}`;

// dev helper: ?dev=1 în URL activează bypass
const isBrowser = typeof window !== 'undefined';
const isDevParam = isBrowser && new URLSearchParams(window.location.search).has('dev');

function getInit() {
  const tg = (globalThis as any).Telegram?.WebApp;
  if (tg?.initData) return tg.initData;
  if (isDevParam) return 'DEV'; // va fi acceptat de ALLOW_DEV=1 pe server
  return '';
}

async function jsonOrThrow(r: Response) {
  const text = await r.text();
  try {
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`);
    return data;
  } catch {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return null;
  }
}

export async function fetchMe() {
  try {
    const r = await fetch(API('/me'), { headers: { 'x-telegram-init': getInit() } });
    return await jsonOrThrow(r);
  } catch {
    // fallback pt. UI local să nu crape
    return { me: 0, global: 0, top: [] as any[] };
  }
}

export async function doClick() {
  const r = await fetch(API('/click'), { method: 'POST', headers: { 'x-telegram-init': getInit() } });
  return jsonOrThrow(r);
}

export async function changeName(username: string) {
  const r = await fetch(API('/name'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-telegram-init': getInit() },
    body: JSON.stringify({ username })
  });
  return jsonOrThrow(r);
}
