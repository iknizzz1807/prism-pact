import 'dotenv/config';
import { startGameServer } from './server.js';

const port = Number(process.env.PORT ?? 2567);
const botPolicy = (process.env.BOT_POLICY ?? 'heuristic').trim().toLowerCase();

const server = await startGameServer({ port });

console.log(`Prism Pact server listening on ${server.url}`);
console.log(`Health: http://127.0.0.1:${server.port}/health`);
console.log(
  `Bot policy: ${botPolicy === 'jev' ? 'jev (OpenRouter + heuristic fallback)' : 'heuristic (local)'}`,
);

const shutdown = async (signal: string) => {
  console.log(`\n${signal} — đang đóng server…`);
  await server.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
