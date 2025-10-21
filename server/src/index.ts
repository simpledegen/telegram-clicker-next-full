import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { webhookCallback } from 'grammy';
import { createBot } from './telegram.js';
import { webapp } from './routes/webapp.js';
import { health } from './routes/health.js';
import { warmupGlobalFromDB } from './db.js'; 

const log = pino();
const app = express();
app.set('trust proxy', true);

const bot = createBot();

app.use(express.json({ limit: '1mb' }));

// webhook
app.use('/bot/webhook', webhookCallback(bot, 'express'));

// API
app.use('/api', webapp);
app.use('/api', health);

// logs
bot.catch((err) => console.error('BOT ERROR', err.error));
process.on('unhandledRejection', (err) => console.error('UNHANDLED REJECTION', err));
process.on('uncaughtException', (err) => console.error('UNCAUGHT EXCEPTION', err));

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  log.info(`API up on ${PORT}`);
  warmupGlobalFromDB().catch(console.error); 
});
