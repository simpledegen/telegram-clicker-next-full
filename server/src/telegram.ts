import { Bot } from 'grammy';
import { upsertSession, deactivateSession } from './dispatcher.js';
import { getGlobalClicks, getTopUsers, getUserClicksCached } from './db.js';
import { InlineKeyboard } from 'grammy';

// același welcomeMarkup ca în dispatcher, ca fallback dacă îl vrei aici
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

  // /start → trimite mesajul “Welcome” + butoane și pornește sesiunea pentru editări
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
      // important: pornește sesiunea pentru editările periodice
      upsertSession(chatId, sent.message_id);
    } catch (e) {
      console.error('start failed', e);
    }
  });

  // callback “Refresh” → forțează refresh manual al mesajului
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
      // opțional, re-atașăm sesiunea (în caz că s-a pierdut id-ul)
      const mid = ctx.update.callback_query?.message?.message_id;
      if (mid && chatId) upsertSession(chatId, mid);
    } catch (e) {
      // dacă mesajul nu poate fi editat, ignorăm
      await ctx.answerCallbackQuery().catch(() => {});
    }
  });

  // (opțional) dacă vrei să “închizi” sesiunea când userul scrie altceva
  bot.on('message', async (ctx) => {
    const txt = ctx.message?.text?.trim().toLowerCase() || '';
    // nu opri sesiunea pentru /start sau comenzi
    if (txt.startsWith('/start') || txt.startsWith('/')) return;
    // dacă vrei, poți dezactiva sesiunea când userul scrie orice altceva:
    // deactivateSession(ctx.chat.id);
  });

  bot.catch((err) => {
    console.error('BOT ERROR', err.error); // logează orice eroare din grammy ca să nu dărâme procesul
  });
  
  return bot;
}
