import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
const url = new URL(process.env.DATABASE_URL!);
if (url.hostname !== '127.0.0.1' || url.port !== '54329')
  throw new Error(
    'Local database runner only accepts 127.0.0.1:54329. Use your managed database separately.',
  );
const pg = new EmbeddedPostgres({
  databaseDir: '.local/postgres',
  user: url.username,
  password: url.password,
  port: 54329,
  persistent: true,
  authMethod: 'scram-sha-256',
  postgresFlags: ['-h', '127.0.0.1', '-k', '/tmp'],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync('.local/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
const client = pg.getPgClient('postgres');
await client.connect();
const found = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', ['buywise']);
if (!found.rowCount) await pg.createDatabase('buywise');
await client.end();
console.log('Local PostgreSQL ready on 127.0.0.1:54329.');
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
setInterval(() => {}, 60000);
