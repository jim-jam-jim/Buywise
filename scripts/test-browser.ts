import chromium from '@sparticuz/chromium';
import { spawn } from 'node:child_process';
const executablePath = await chromium.executablePath();
const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_CHROMIUM_EXECUTABLE: executablePath,
    PLAYWRIGHT_CHROMIUM_ARGS: JSON.stringify(
      chromium.args.filter(
        (arg) =>
          !arg.includes('disable-web-security') &&
          !arg.includes('disable-site-isolation-trials') &&
          !arg.startsWith('--disable-features='),
      ),
    ),
  },
});
child.on('exit', (code) => process.exit(code ?? 1));
