/**
 * CLI demo: 2 bot đánh nhau một trận hoàn chỉnh, in log từng lượt.
 * Chạy: npm run demo  (hoặc npm run demo -- 1234 để đổi seed)
 */
import { CONFIG } from '../src/config.js';
import { mulberry32 } from '../src/rng.js';
import { createBattle, type BattleState, type TurnReport, playTurn } from '../src/battle.js';
import { chooseAction } from '../src/bot.js';
import type { Board, GemType, HeroState } from '../src/types.js';

const CH: Record<GemType, string> = { ATK: 'A', HP: 'H', MANA: 'M', SHIELD: 'S' };

function bar(value: number, max: number, width = 12): string {
  const filled = max <= 0 ? 0 : Math.round((value / max) * width);
  return `[${'#'.repeat(filled)}${'-'.repeat(Math.max(0, width - filled))}]`;
}

function teamLine(heroes: readonly HeroState[]): string {
  return heroes
    .map((h) => {
      const name = h.archetype.padEnd(10);
      return h.alive ? `${name}${bar(h.hp, h.maxHp)} ${h.hp}/${h.maxHp}` : `${name}${' '.repeat(12)} DEAD`;
    })
    .join('\n         ');
}

function renderBoard(board: Board): void {
  console.log('\n   ' + Array.from({ length: CONFIG.BOARD_SIZE }, (_, i) => i).join(' '));
  for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
    const row: string[] = [];
    for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
      const gem = board[r * CONFIG.BOARD_SIZE + c];
      row.push(gem ? CH[gem.type] : '.');
    }
    console.log(`${r}  ${row.join(' ')}`);
  }
}

function printTurn(report: TurnReport): void {
  console.log(`\n--- TURN ${report.turn + 1} · ${report.side} ---`);
  for (const line of report.logs) console.log(`  · ${line}`);
  console.log(
    `  => damage ${report.damage} | heal ${report.healed} | mana ${report.mana} | hits ${report.hits}`,
  );
}

function printState(state: BattleState): void {
  console.log(`\nP1  mana ${state.sides.P1.mana}`);
  console.log('         ' + teamLine(state.sides.P1.heroes));
  console.log(`\nP2  mana ${state.sides.P2.mana}`);
  console.log('         ' + teamLine(state.sides.P2.heroes));
}

const seed = Number(process.argv[2] ?? 2026);
const rng = mulberry32(seed);

const state = createBattle(
  ['Tank', 'Burst', 'Healer'],
  ['Bruiser', 'Assassin', 'Controller'],
  rng,
);

console.log(`PRISM PACT — CLI DEMO (seed ${seed})`);
console.log('P1: Tank / Burst / Healer      P2: Bruiser / Assassin / Controller');
renderBoard(state.board);
printState(state);

let guard = 0;
while (state.winner === null && guard++ < 300) {
  const action = chooseAction(state, rng);
  if (!action) break;
  const report = playTurn(state, action, rng);
  if (!report.accepted) continue;
  printTurn(report);
}

renderBoard(state.board);
printState(state);
console.log(
  `\nRESULT: ${state.winner ?? 'unfinished'} · ${state.turn} lượt · suddenDeath=${state.suddenDeath}`,
);
