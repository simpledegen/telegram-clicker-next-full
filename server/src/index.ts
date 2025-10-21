import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import { webhookCallback } from 'grammy';
import { createBot } from './telegram.js';
import { webapp } from './routes/webapp.js';
import { health } from './routes/health.js';

const log = pino();
const app = express();

const bot = createBot();

// 1) MONTEAZĂ WEBHOOK-UL ÎNAINTE DE ORICE ALT MIDDLEWARE
const webhookPath = '/bot/webhook';
app.use(webhookPath, webhookCallback(bot, 'express'));

// 2) ABIA ACUM parsăm JSON pentru rutele noastre
app.use(express.json());

// 3) Rutele API (inclusiv health) sub /api
app.use('/api', webapp);
app.use('/api', health);

// 4) Error handlers – ca să nu mai moară procesul fără stack în loguri
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION', err);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});

// 5) Pornire server
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  log.info(`API up on ${PORT}`);
});
