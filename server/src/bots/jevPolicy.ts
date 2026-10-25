/**
 * JevPolicy — gọi TypeSafe Jev qua OpenRouter System One API.
 *
 * Chain tuần tự (mỗi call nhận state đã cập nhật quyết định trước):
 *   1. chọn skill
 *   2. chọn target cho skill
 *   3. chọn gem intent
 *
 * Jev KHÔNG chọn swap và KHÔNG tính damage. MatchRoom dùng intent → weights
 * rồi brute-force swap local.
 */
import {
  CONFIG,
  canUseSkill,
  effectiveSkillCost,
  heroDef,
  otherSide,
} from '@prism-pact/shared';
import type {
  BattleState,
  Buff,
  GemType,
  HeroDef,
  HeroState,
  Side,
  SkillDef,
} from '@prism-pact/shared';
import { preferredEnemyTarget } from './heuristicPolicy.js';
import { ARCHETYPE_ROLE, skillOptionKey, skillTextEn } from './skillText.js';
import {
  GEM_INTENTS,
  INTENT_CRITERIA,
  INTENT_WEIGHTS,
  type BotPolicy,
  type GemIntent,
  type PlanContext,
  type TurnPlan,
} from './types.js';

export interface JevConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  referer?: string;
  title?: string;
  logDecisions?: boolean;
}

export interface JevHttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type JevFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<JevHttpResponse>;

interface JevAnswer {
  type?: string;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

interface JevResponse {
  model?: string;
  answers?: Record<string, JevAnswer>;
  usage?: { cost?: number; input_tokens?: number; output_tokens?: number };
}

interface JevQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

type JevQuestions = Record<string, JevQuestion>;

export type JevErrorCode = 'network' | 'http' | 'malformed' | 'invalid-option' | 'missing-answer';

export class JevError extends Error {
  constructor(
    message: string,
    readonly code: JevErrorCode,
  ) {
    super(message);
    this.name = 'JevError';
  }
}

export type SkillTargetType = 'enemy' | 'ally' | 'self' | 'none';

export interface LegalSkill {
  hero: HeroState;
  def: HeroDef;
  skill: SkillDef;
  cost: number;
  targetType: SkillTargetType;
}

interface PickResult {
  choice: string;
  confidence: number;
  margin: number;
}

const GEM_SYMBOL: Record<GemType, string> = {
  ATK: 'A',
  HP: 'H',
  MANA: 'M',
  SHIELD: 'S',
};

const GEM_TYPES: readonly GemType[] = ['ATK', 'HP', 'MANA', 'SHIELD'];

function teamHpPct(heroes: readonly HeroState[]): number {
  const max = heroes.reduce((sum, h) => sum + h.maxHp, 0);
  const hp = heroes.reduce((sum, h) => sum + h.hp, 0);
  return Math.round((hp / Math.max(1, max)) * 100);
}

function buffText(buffs: readonly Buff[]): string {
  if (buffs.length === 0) return 'none';
  return buffs
    .map((b) => {
      const pct = b.pct > 0 ? `${Math.round(b.pct * 100)}%` : '';
      const sign =
        b.kind === 'ATK_UP' || b.kind === 'DEF_UP'
          ? '+'
          : b.pct > 0
            ? '-'
            : '';
      return `${b.kind}${sign}${pct}(${b.turns}t)`;
    })
    .join(', ');
}

function heroLine(hero: HeroState): string {
  const dead = hero.alive ? '' : ' DEAD';
  const pct = Math.round((hero.hp / Math.max(1, hero.maxHp)) * 100);
  const cdLength = heroDef(hero.archetype).skill.cd;
  return (
    `- ${hero.uid} ${hero.archetype} (${ARCHETYPE_ROLE[hero.archetype]}) ` +
    `HP ${hero.hp}/${hero.maxHp} (${pct}%)${dead} ` +
    `ATK ${hero.atk} DEF ${hero.def} shield ${hero.shield} ` +
    `CD_remaining ${hero.cd}/${cdLength} buffs: ${buffText(hero.buffs)}`
  );
}

function boardCounts(state: BattleState): Record<GemType, number> {
  const counts: Record<GemType, number> = { ATK: 0, HP: 0, MANA: 0, SHIELD: 0 };
  for (const cell of state.board) {
    if (cell) counts[cell.type] += 1;
  }
  return counts;
}

function boardRows(state: BattleState): string[] {
  const size = CONFIG.BOARD_SIZE;
  const rows: string[] = [];
  for (let r = 0; r < size; r++) {
    const cells: string[] = [];
    for (let c = 0; c < size; c++) {
      const cell = state.board[r * size + c];
      if (!cell) {
        cells.push('.');
        continue;
      }
      const special = cell.special === 'BOMB' ? '*' : cell.special === 'RAINBOW' ? '^' : '';
      cells.push(`${GEM_SYMBOL[cell.type]}${special}`);
    }
    rows.push(cells.join(' '));
  }
  return rows;
}

function boardMajority(counts: Record<GemType, number>): GemType[] {
  const max = Math.max(...GEM_TYPES.map((t) => counts[t]));
  return GEM_TYPES.filter((t) => counts[t] === max);
}

/** Skill hợp lệ theo đúng luật server (mana thực tế, cooldown, once, target). */
export function legalSkills(state: BattleState, side: Side): LegalSkill[] {
  const active = state.sides[side];
  const enemies = state.sides[otherSide(side)].heroes;
  const out: LegalSkill[] = [];

  for (const hero of active.heroes) {
    if (!hero.alive) continue;
    const def = heroDef(hero.archetype);
    const cost = effectiveSkillCost(hero, active.heroes, enemies);
    if (canUseSkill(hero, active.mana, active.skillUsedThisTurn, cost) !== null) continue;

    const targetType = (def.skill.target ?? 'enemy') as SkillTargetType;
    if (targetType === 'enemy' && !enemies.some((h) => h.alive)) continue;
    if (targetType === 'ally' && !active.heroes.some((h) => h.alive)) continue;

    out.push({ hero, def, skill: def.skill, cost, targetType });
  }

  return out;
}

/** State text gửi Jev — tiếng Anh, gọn, có cue rõ ràng. */
export function renderBattleState(state: BattleState, side: Side): string {
  const you = state.sides[side];
  const enemySide = otherSide(side);
  const enemy = state.sides[enemySide];
  const legal = legalSkills(state, side);
  const enemyAlive = enemy.heroes.filter((h) => h.alive);
  const counts = boardCounts(state);
  const majority = boardMajority(counts);
  const youHpPct = teamHpPct(you.heroes);
  const enemyHpPct = teamHpPct(enemy.heroes);
  const targetLow = enemyAlive.some((h) => h.hp / Math.max(1, h.maxHp) <= 0.3);
  const teamLow = youHpPct <= 40;
  const hasDot = you.heroes.some(
    (h) => h.alive && h.buffs.some((b) => b.kind === 'BURN' || b.kind === 'POISON'),
  );
  const dotPct = you.heroes.reduce(
    (sum, h) =>
      h.alive
        ? sum +
          h.buffs
            .filter((b) => b.kind === 'BURN' || b.kind === 'POISON')
            .reduce((s, b) => s + b.pct, 0)
        : sum,
    0,
  );
  const enemyShield = enemyAlive.some((h) => h.shield > 0);
  const costs = you.heroes
    .filter((h) => h.alive)
    .map((h) => effectiveSkillCost(h, you.heroes, enemy.heroes));
  const cheapest = costs.length > 0 ? Math.min(...costs) : null;
  const manaLow = cheapest !== null && you.mana < cheapest;

  const lines: string[] = [
    `GAME: Prism Pact`,
    `YOU_ARE: ${side}`,
    `TURN: ${state.turn}  ACTIVE: ${state.active}  SUDDEN_DEATH: ${state.suddenDeath}`,
    '',
    'CUES:',
    `- target_low_hp=${String(targetLow).toLowerCase()}`,
    `- team_low_hp=${String(teamLow).toLowerCase()}`,
    `- mana_low=${String(manaLow).toLowerCase()}`,
    `- skill_available=${String(legal.length > 0).toLowerCase()}`,
    `- team_has_dot=${String(hasDot).toLowerCase()}`,
    `- team_dot_pct_per_turn=${Math.round(dotPct * 100)}`,
    `- enemy_has_shield=${String(enemyShield).toLowerCase()}`,
    `- board_most=${majority.join(',')}`,
    '',
    'BOARD 8x8 (A=ATK H=HP M=MANA S=SHIELD; *=bomb on that gem; ^=rainbow on that gem; .=empty):',
    ...boardRows(state),
    `BOARD_COUNTS: ATK=${counts.ATK} HP=${counts.HP} MANA=${counts.MANA} SHIELD=${counts.SHIELD}`,
    '',
    `YOUR TEAM (${side}) mana=${you.mana} teamHP=${youHpPct}% alive=${you.heroes.filter((h) => h.alive).length}/${you.heroes.length}`,
    ...you.heroes.map(heroLine),
  ];

  if (you.thrall) {
    const t = you.thrall;
    lines.push(`- THRALL HP ${t.hp}/${t.maxHp} ATK ${t.atk} alive=${t.alive}`);
  }

  lines.push(
    '',
    `ENEMY TEAM (${enemySide}) mana=${enemy.mana} teamHP=${enemyHpPct}% alive=${enemyAlive.length}/${enemy.heroes.length}`,
    ...enemy.heroes.map(heroLine),
  );

  if (enemy.thrall) {
    const t = enemy.thrall;
    lines.push(`- THRALL HP ${t.hp}/${t.maxHp} ATK ${t.atk} alive=${t.alive}`);
  }

  lines.push('', 'LEGAL SKILLS (only legal options are listed):');
  if (legal.length === 0) {
    lines.push('- none');
  } else {
    for (const item of legal) {
      lines.push(
        `- ${item.hero.uid} ${item.hero.archetype} ${item.skill.name}: cost ${item.cost} mana, ` +
          `target ${item.targetType}, cooldown length ${item.skill.cd}. ` +
          skillTextEn(item.skill.id, item.skill.desc),
      );
    }
  }

  lines.push('', 'ENEMY TARGETS:');
  if (enemyAlive.length === 0) {
    lines.push('- none');
  } else {
    for (const hero of enemyAlive) {
      lines.push(
        `- ${hero.uid} ${hero.archetype} (${ARCHETYPE_ROLE[hero.archetype]}) ` +
          `HP ${Math.round((hero.hp / Math.max(1, hero.maxHp)) * 100)}% ` +
          `shield ${hero.shield} buffs: ${buffText(hero.buffs)}`,
      );
    }
  }

  lines.push('', 'ALLY TARGETS:');
  const allies = you.heroes.filter((h) => h.alive);
  if (allies.length === 0) {
    lines.push('- none');
  } else {
    for (const hero of allies) {
      lines.push(
        `- ${hero.uid} ${hero.archetype} (${ARCHETYPE_ROLE[hero.archetype]}) ` +
          `HP ${Math.round((hero.hp / Math.max(1, hero.maxHp)) * 100)}% ` +
          `buffs: ${buffText(hero.buffs)}`,
      );
    }
  }

  return lines.join('\n');
}

function targetLine(hero: HeroState): string {
  return (
    `${hero.uid} ${hero.archetype} (${ARCHETYPE_ROLE[hero.archetype]}), ` +
    `HP ${Math.round((hero.hp / Math.max(1, hero.maxHp)) * 100)}%, ` +
    `shield ${hero.shield}, buffs: ${buffText(hero.buffs)}`
  );
}

/**
 * Provider-agnostic client for the TypeSafe `/v1/systemone` wire protocol.
 * Jev (hosted OpenRouter) and Von (local CPU) use the exact same request/response
 * shape, so only base URL + model + auth differ.
 */
export class SystemOnePolicy implements BotPolicy {
  readonly name: string;

  private readonly config: JevConfig;
  private readonly fetchImpl: JevFetch;

  constructor(config: JevConfig, fetchImpl?: JevFetch, name = 'systemone') {
    this.config = config;
    this.name = name;
    this.fetchImpl = fetchImpl ?? (globalThis.fetch.bind(globalThis) as JevFetch);
  }

  async planTurn(
    state: BattleState,
    side: Side,
    ctx: PlanContext = {},
  ): Promise<TurnPlan | null> {
    const you = state.sides[side];
    const enemy = state.sides[otherSide(side)];
    const snapshot = renderBattleState(state, side);
    const legal = legalSkills(state, side);
    const collected: PickResult[] = [];

    let chosenSkill: LegalSkill | null = null;
    let skillTargetUid: string | null = null;
    // Basic attack target must be an enemy, even when the chosen skill targets an ally.
    let attackTargetUid = preferredEnemyTarget(state, side);

    if (legal.length > 0) {
      const keys = legal.map((item, index) => skillOptionKey(item.skill.id, index));
      const criteria: Record<string, string> = {};
      legal.forEach((item, index) => {
        criteria[keys[index]!] =
          `${item.hero.uid} ${item.hero.archetype} uses ${item.skill.name} — ` +
          `${skillTextEn(item.skill.id, item.skill.desc)} ` +
          `Cost ${item.cost} mana, target ${item.targetType}.`;
      });

      const answers = await this.ask(
        snapshot,
        {
          skill: {
            type: 'choice',
            instructions:
              `You are ${side}. Choose exactly one legal skill for this turn. ` +
              'Use the CUES, your team HP, enemy HP, mana, cooldowns, and the board.',
            criteria,
          },
        },
        ctx.signal,
      );

      const pick = this.pick(answers, 'skill', keys);
      collected.push(pick);
      chosenSkill = legal[keys.indexOf(pick.choice)]!;

      if (chosenSkill.targetType === 'enemy' || chosenSkill.targetType === 'ally') {
        const pool =
          chosenSkill.targetType === 'enemy'
            ? enemy.heroes.filter((h) => h.alive)
            : you.heroes.filter((h) => h.alive);

        if (pool.length > 0) {
          const targetKeys = pool.map((_, index) => `T${index + 1}`);
          const targetCriteria: Record<string, string> = {};
          pool.forEach((hero, index) => {
            targetCriteria[targetKeys[index]!] = targetLine(hero);
          });

          const stateWithSkill =
            `${snapshot}\n\n` +
            `DECISION_1: skill=${chosenSkill.skill.name} by ${chosenSkill.hero.uid} ` +
            `(${chosenSkill.hero.archetype}), target_type=${chosenSkill.targetType}.\n` +
            'Now choose the best target for this skill.';

          const targetAnswers = await this.ask(
            stateWithSkill,
            {
              target: {
                type: 'choice',
                instructions:
                  `The chosen skill is ${chosenSkill.skill.name}: ` +
                  `${skillTextEn(chosenSkill.skill.id, chosenSkill.skill.desc)} ` +
                  `Choose the best ${chosenSkill.targetType} target from the listed candidates.`,
                criteria: targetCriteria,
              },
            },
            ctx.signal,
          );

          const targetPick = this.pick(targetAnswers, 'target', targetKeys);
          collected.push(targetPick);
          skillTargetUid = pool[targetKeys.indexOf(targetPick.choice)]!.uid;
          if (chosenSkill.targetType === 'enemy') attackTargetUid = skillTargetUid;
        }
      }
    }

    let intentState = `${snapshot}\n\nDECISION_1: skill=${
      chosenSkill ? `${chosenSkill.skill.name} by ${chosenSkill.hero.uid}` : 'none'
    }.`;
    if (skillTargetUid) intentState += `\nDECISION_2: target=${skillTargetUid}.`;
    intentState +=
      '\n\nChoose the gem intent for this turn. ' +
      'Map it to ATK/HP/MANA/SHIELD weights. ' +
      'Use the CUES and the chosen skill/target. Be specific.';

    const intentAnswers = await this.ask(
      intentState,
      {
        intent: {
          type: 'choice',
          instructions: 'Choose the best strategic gem intent for this turn.',
          criteria: { ...INTENT_CRITERIA },
        },
      },
      ctx.signal,
    );

    const intentPick = this.pick(intentAnswers, 'intent', [...GEM_INTENTS]);
    collected.push(intentPick);
    const intent = intentPick.choice as GemIntent;

    const confidence = Math.min(...collected.map((item) => item.confidence));
    const margin = Math.min(...collected.map((item) => item.margin));

    if (this.config.logDecisions) {
      console.log(
        `[${this.name}] ${side} skill=${chosenSkill?.skill.name ?? 'none'} ` +
          `target=${skillTargetUid ?? 'none'} intent=${intent} ` +
          `confidence=${confidence.toFixed(2)} margin=${margin.toFixed(2)}`,
      );
    }

    return {
      skill: chosenSkill
        ? { casterUid: chosenSkill.hero.uid, targetUid: skillTargetUid }
        : null,
      targetUid: attackTargetUid,
      intent,
      weights: INTENT_WEIGHTS[intent],
      source: this.name === 'von' ? 'von' : 'jev',
      confidence,
      margin,
    };
  }

  private pick(answers: Record<string, JevAnswer>, key: string, allowed: readonly string[]): PickResult {
    const answer = answers[key];
    if (!answer) throw new JevError(`${this.name} answer missing "${key}"`, 'missing-answer');

    const choice = answer.choice;
    if (typeof choice !== 'string' || !allowed.includes(choice)) {
      throw new JevError(
        `${this.name} returned invalid option "${String(choice)}" for "${key}" (allowed: ${allowed.join(', ')})`,
        'invalid-option',
      );
    }

    const probabilities = answer.probabilities ?? {};
    const sorted = Object.values(probabilities)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => b - a);

    const confidence =
      typeof answer.confidence === 'number' ? answer.confidence : (sorted[0] ?? 0);
    const margin = sorted.length >= 2 ? sorted[0]! - sorted[1]! : confidence;

    return { choice, confidence, margin };
  }

  private async ask(
    state: string,
    questions: JevQuestions,
    signal?: AbortSignal,
  ): Promise<Record<string, JevAnswer>> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;
    if (this.config.referer) headers['http-referer'] = this.config.referer;
    if (this.config.title) headers['x-title'] = this.config.title;

    let response: JevHttpResponse;
    try {
      response = await this.fetchImpl(this.config.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          state,
          questions,
        }),
        signal,
      });
    } catch (error) {
      throw new JevError(
        `${this.name} request failed: ${error instanceof Error ? error.message : String(error)}`,
        'network',
      );
    }

    const text = await response.text();
    if (!response.ok) {
      throw new JevError(`${this.name} HTTP ${response.status}: ${text.slice(0, 300)}`, 'http');
    }

    let data: JevResponse;
    try {
      data = JSON.parse(text) as JevResponse;
    } catch {
      throw new JevError(`${this.name} returned invalid JSON`, 'malformed');
    }

    if (!data.answers || typeof data.answers !== 'object') {
      throw new JevError(`${this.name} response missing "answers"`, 'malformed');
    }

    return data.answers;
  }
}

/** Hosted TypeSafe Jev qua OpenRouter. */
export class JevPolicy extends SystemOnePolicy {
  constructor(config: JevConfig, fetchImpl?: JevFetch) {
    super(config, fetchImpl, 'jev');
  }
}

/** Von local CPU — cùng wire protocol `/v1/systemone`. */
export class VonPolicy extends SystemOnePolicy {
  constructor(config: JevConfig, fetchImpl?: JevFetch) {
    super(config, fetchImpl, 'von');
  }
}
