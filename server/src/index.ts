import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { webhookCallback } from 'grammy';
import { createBot } from './telegram.js';
import { webapp } from './routes/webapp.js';
import { health } from './routes/health.js';

const log = pino();
const app = express();
app.set('trust proxy', true); // ești în spatele nginx/cloudflare

// creează botul
const bot = createBot();

// 1) Body parser ÎNAINTE de webhook (fix pt. update_id undefined)
app.use(express.json({ limit: '1mb' }));

// 2) Webhook (după body parser)
const webhookPath = '/bot/webhook';
app.use(webhookPath, webhookCallback(bot, 'express'));

// 3) Rutele API (inclusiv health) sub /api
app.use('/api', webapp);
app.use('/api', health);

// 4) Logare erori ne-prinse (să nu mai pice procesul în tăcere)
bot.catch((err) => {
  console.error('BOT ERROR', err.error);
});
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});

// 5) Start server
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  log.info(`API up on ${PORT}`);
});
