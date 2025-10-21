import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { webhookCallback } from 'grammy';
import { createBot } from './telegram.js';
import { webapp } from './routes/webapp.js';
import { health } from './routes/health.js';
import { attachDispatcher } from './dispatcher.js'; // 👈

const log = pino();
const app = express();
app.set('trust proxy', true);

// Body parser ÎNAINTE de webhook
app.use(express.json({ limit: '1mb' }));

const bot = createBot();

// 👇 pornește ciclicitatea de editări live
attachDispatcher(bot); // 👈 OBLIGATORIU

// Webhook (după body parser)
app.use('/bot/webhook', webhookCallback(bot, 'express'));

// API
app.use('/api', webapp);
app.use('/api', health);

// Hardening logs
bot.catch((err) => console.error('BOT ERROR', err.error));
process.on('unhandledRejection', (e) => console.error('UNHANDLED REJECTION', e));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION', e));

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => log.info(`API up on ${PORT}`));
