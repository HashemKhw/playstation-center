import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { DATA_DIR, enableWal } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { backupRouter } from './routes/backup.js';
import { pricingRouter } from './routes/pricing.js';
import { productsRouter } from './routes/products.js';
import { reportsRouter } from './routes/reports.js';
import { screensRouter } from './routes/screens.js';
import { sessionsRouter } from './routes/sessions.js';
import { settingsRouter } from './routes/settings.js';
import { transactionsRouter } from './routes/transactions.js';

fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/screens', screensRouter);
app.use('/api/products', productsRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);

const staticDirectory = process.env.PSCENTER_STATIC_DIR;
if (staticDirectory && fs.existsSync(staticDirectory)) {
  app.use(express.static(staticDirectory));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(staticDirectory, 'index.html'));
  });
}

app.use(errorHandler);

async function main() {
  await enableWal();
  app.listen(config.port, '127.0.0.1', () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

void main();
