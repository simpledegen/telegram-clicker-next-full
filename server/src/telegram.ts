import { Bot } from 'grammy';
import { upsertSession, deactivateSession } from './dispatcher.js';
import { getGlobalClicks, getTopUsers, getUserClicksCached } from './db.js';
import { InlineKeyboard } from 'grammy';

function welcomeMarkup() {
  return new InlineKeyboard()
    .webApp('🚀 Open Mini App', process.env.PUBLIC_MINIAPP_URL!)
    .row()
    .text('🔄 Refresh', 'refresh');
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

function escapeHtml(s: string) { return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)); }

async function formatLeaderboard(top: { userId: number; total: number }[]) {
  const ids = top.map(t => t.userId);
  if (!ids.length) return '—';
  const url = `${process.env.SUPABASE_URL}/rest/v1/users?id=in.(${ids.join(',')})`;
  const r = await fetch(url, { headers: { apikey: process.env.SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } });
  const rows = (await r.json()) as { id: number; username: string }[];
  const nameById = new Map(rows.map(r => [r.id, r.username]));
  return top.map((t, i) => `${i + 1}. ${escapeHtml(nameById.get(t.userId) || 'anon')} — <b>${t.total}</b>`).join('\n');
}

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error('Missing BOT_TOKEN');
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    try {
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;
      if (!chatId || !userId) return;

      const [global, top] = await Promise.all([getGlobalClicks(), getTopUsers(20)]);
      const me = await getUserClicksCached(userId);
      const leaderboard = await formatLeaderboard(top);
      const text = renderWelcome(me, global, leaderboard);

      const sent = await ctx.api.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: welcomeMarkup() });
      upsertSession(chatId, sent.message_id);
    } catch (e) {
      console.error('start failed', e);
    }
  });

  bot.callbackQuery('refresh', async (ctx) => {
    try {
      const chatId = ctx.chat?.id;
      const userId = ctx.from?.id;
      if (!chatId || !userId) return;

      const [global, top] = await Promise.all([getGlobalClicks(), getTopUsers(20)]);
      const me = await getUserClicksCached(userId);
      const leaderboard = await formatLeaderboard(top);
      const text = renderWelcome(me, global, leaderboard);

      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: welcomeMarkup() });
      await ctx.answerCallbackQuery({ text: 'Refreshed ✅', show_alert: false });
      const mid = ctx.update.callback_query?.message?.message_id;
      if (mid && chatId) upsertSession(chatId, mid);
    } catch (e) {
      await ctx.answerCallbackQuery().catch(() => {});
    }
  });

  bot.on('message', async (ctx) => {
    const txt = ctx.message?.text?.trim().toLowerCase() || '';
    if (txt.startsWith('/start') || txt.startsWith('/')) return;
  });

  bot.catch((err) => {
    console.error('BOT ERROR', err.error); 
  });

  return bot;
}
