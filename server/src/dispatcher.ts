import { Bot, InlineKeyboard } from 'grammy';
import { getGlobalClicksStable, getTopUsers, getUserClicksStable } from './db.js';

type Ticket = { chatId: number; messageId: number; active: boolean; lastPush: number };
const sessions = new Map<number, Ticket>();

let intervalMs = 1000;

export function setLoad(activeSessions: number) {
  if (activeSessions < 1000) intervalMs = 750;
  else if (activeSessions < 2500) intervalMs = 1500;
  else intervalMs = 3000;
}

export function attachDispatcher(bot: Bot) {
  setInterval(async () => {
    const now = Date.now();
    const tickets = [...sessions.values()].filter(t => t.active && now - t.lastPush >= intervalMs);
    if (!tickets.length) return;

    const [global, top] = await Promise.all([getGlobalClicksStable(), getTopUsers(20)]);

    await Promise.all(tickets.map(async t => {
      try {
        const userTotal = await getUserClicksStable(t.chatId);
        const leaderboard = await formatLeaderboard(top);
        const text = renderWelcome(userTotal, global, leaderboard);
        await bot.api.editMessageText(t.chatId, t.messageId, text, { parse_mode: 'HTML', reply_markup: welcomeMarkup() });
        t.lastPush = now;
      } catch (e: any) {
        const message = String(e?.description || e?.message || e);
        if (message.includes('Too Many Requests')) {
          intervalMs = Math.min(intervalMs + 500, 5000);
        } else if (message.includes('message to edit not found')) {
          t.active = false;
        }
      }
    }));
  }, 300);
}

export function upsertSession(chatId: number, messageId: number) {
  const t = sessions.get(chatId) || { chatId, messageId, active: true, lastPush: 0 };
  t.messageId = messageId; t.active = true;
  sessions.set(chatId, t);
}

export function deactivateSession(chatId: number) {
  const t = sessions.get(chatId);
  if (t) t.active = false;
}

function renderWelcome(userTotal: number, global: number, leaderboard: string) {
  return `
<b>Welcome to Clicker</b> ✨

<b>Your clicks:</b> ${userTotal}
<b>Global clicks:</b> ${global}

<b>Top 20</b>
${leaderboard}

Use the Mini App to click!`;
}

function welcomeMarkup() {
  return new InlineKeyboard()
    .webApp('🚀 Open Mini App', process.env.PUBLIC_MINIAPP_URL!)
    .row()
    .text('🔄 Refresh', 'refresh');
}

async function formatLeaderboard(top: { userId: number; total: number }[]) {
  const ids = top.map(t => t.userId);
  if (!ids.length) return '—';
  const url = `${process.env.SUPABASE_URL}/rest/v1/users?id=in.(${ids.join(',')})`;
  const r = await fetch(url, { headers: { apikey: process.env.SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } });
  const rows = (await r.json()) as { id: number; username: string }[];
  const nameById = new Map(rows.map(r => [r.id, r.username]));
  return top.map((t, i) => `${i + 1}. ${escapeHtml(nameById.get(t.userId) || 'anon')} — <b>${t.total}</b>`).join('\n');
}
function escapeHtml(s: string) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)); }
