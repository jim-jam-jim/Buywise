import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
mkdirSync('.local', { recursive: true });
if (!existsSync('.env')) {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL="postgresql://buywise:${password}@127.0.0.1:54329/buywise"\nBETTER_AUTH_URL="http://localhost:3000"\nBETTER_AUTH_SECRET="${randomBytes(48).toString('hex')}"\n`,
    { mode: 0o600 },
  );
  console.log('Created local configuration with generated secrets.');
} else console.log('Existing .env preserved.');
