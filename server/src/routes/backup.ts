import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { DATA_DIR, prisma, SQLITE_PATH } from '../db.js';
import { AppError } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const backupRouter = Router();

backupRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(DATA_DIR, `center-backup-${stamp}.sqlite`);
    const escapedPath = snapshotPath.replaceAll("'", "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedPath}'`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="center-backup-${stamp}.sqlite"`);
    const stream = fs.createReadStream(snapshotPath);
    stream.on('close', () => fs.rmSync(snapshotPath, { force: true }));
    stream.pipe(res);
  }),
);

backupRouter.post(
  '/restore',
  asyncHandler(async (req, res) => {
    const filePath = typeof req.body?.path === 'string' ? req.body.path : null;
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : null;
    if (!filePath && !base64) {
      throw new AppError('Provide a backup file');
    }
    const tmp = `${SQLITE_PATH}.restore-tmp`;
    if (base64) {
      fs.writeFileSync(tmp, Buffer.from(base64, 'base64'));
    } else if (filePath) {
      if (!fs.existsSync(filePath)) throw new AppError('Backup file was not found');
      fs.copyFileSync(filePath, tmp);
    }
    const header = fs.readFileSync(tmp).subarray(0, 16).toString('utf8');
    if (header !== 'SQLite format 3\u0000') {
      fs.rmSync(tmp, { force: true });
      throw new AppError('The selected file is not a valid SQLite backup');
    }
    const backupOfCurrent = `${SQLITE_PATH}.pre-restore-${Date.now()}`;
    await prisma.$disconnect();
    if (fs.existsSync(SQLITE_PATH)) {
      fs.copyFileSync(SQLITE_PATH, backupOfCurrent);
    }
    fs.copyFileSync(tmp, SQLITE_PATH);
    fs.unlinkSync(tmp);
    res.json({
      ok: true,
      message: 'Backup restored. The local server will restart; reopen the app in a moment.',
      previousCopy: path.basename(backupOfCurrent),
    });
    setTimeout(() => process.exit(0), 250);
  }),
);
