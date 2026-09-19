import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'release', 'PlayStation Center');
const appDirectory = path.join(output, 'resources', 'app');

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(path.join(root, 'node_modules', 'electron', 'dist'), output, { recursive: true });

const originalExecutable = path.join(output, 'electron.exe');
const applicationExecutable = path.join(output, 'PlayStation Center.exe');
fs.renameSync(originalExecutable, applicationExecutable);

fs.rmSync(path.join(output, 'resources', 'default_app.asar'), { force: true });
fs.mkdirSync(appDirectory, { recursive: true });

copy('package.json');
copy('desktop/main.cjs');
copy('desktop/server-runner.cjs');
copy('desktop/server-bundle.cjs');
copy('client/dist');
copy('node_modules/@prisma/client');
copy('node_modules/.prisma/client');

fs.copyFileSync(path.join(root, 'build', 'seed.sqlite'), path.join(output, 'resources', 'seed.sqlite'));

function copy(relativePath) {
  const source = path.join(root, relativePath);
  const destination = path.join(appDirectory, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}
