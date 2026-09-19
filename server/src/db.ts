import path from 'node:path';
import { PrismaClient } from '@prisma/client';

export const DATA_DIR = process.env.PSCENTER_DATA_DIR
  ? path.resolve(process.env.PSCENTER_DATA_DIR)
  : path.resolve(process.cwd(), 'data');
export const SQLITE_PATH = path.join(DATA_DIR, 'center.sqlite');

export const prisma = new PrismaClient();

export async function enableWal(): Promise<void> {
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
}
