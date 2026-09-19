import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDirectory = path.join(projectRoot, 'build');
const databasePath = path.join(buildDirectory, 'seed.sqlite');
const prismaCli = path.join(projectRoot, 'node_modules', 'prisma', 'build', 'index.js');
const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

fs.mkdirSync(buildDirectory, { recursive: true });
for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(`${databasePath}${suffix}`, { force: true });
}

const environment = {
  ...process.env,
  DATABASE_URL: `file:${databasePath.replaceAll('\\', '/')}`,
};

run(prismaCli, ['migrate', 'deploy', '--schema', 'server/prisma/schema.prisma']);
run(tsxCli, ['server/prisma/seed.ts']);

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
