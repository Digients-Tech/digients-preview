import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';

await import('./sync-theme.mjs');
const env = { ...process.env };
const workspaceEnv = new URL('../../../.env', import.meta.url);
if (!env.PREVIEW_PASSWORD && existsSync(workspaceEnv)) {
  const config = parseEnv(readFileSync(workspaceEnv, 'utf8'));
  const passwords = [config.PREVIEW_WEB_PASSWORD, config.PREVIEW_WEB_PASSWORD_EXTERNAL].filter(Boolean);
  if (passwords.length) env.PREVIEW_PASSWORD = passwords.join(',');
}
env.CUA_DATA_DIR ??= resolve(homedir(), 'Downloads/digients-cua-review');
const child = spawn('pnpm', ['-C', 'server', 'start:cua'], { cwd: new URL('../../', import.meta.url), env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
