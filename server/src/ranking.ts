/**
 * Rank points off-chain — README mục 9.1.
 * JSON file đủ cho hackathon; swap sang Postgres khi cần.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RankView } from '@prism-pact/shared';

export const RANK_WIN = 25;
export const RANK_LOSS = -15;

export type Outcome = 'win' | 'lose' | 'draw';

export class RankingStore {
  private points = new Map<string, number>();
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly file?: string) {
    if (!file) return;
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, number>;
      for (const [id, value] of Object.entries(raw)) this.points.set(id, value);
    } catch {
      // file chưa có → bắt đầu từ 0
    }
  }

  get(playerId: string): number {
    return this.points.get(playerId) ?? 0;
  }

  apply(playerId: string, outcome: Outcome): RankView {
    const delta = outcome === 'win' ? RANK_WIN : outcome === 'lose' ? RANK_LOSS : 0;
    const points = Math.max(0, this.get(playerId) + delta);
    this.points.set(playerId, points);
    this.scheduleSave();
    return { points, delta };
  }

  private scheduleSave(): void {
    if (!this.file || this.saveTimer) return;
    // debounce: nhiều trận kết thúc liên tiếp chỉ ghi 1 lần
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const data: Record<string, number> = {};
      for (const [id, value] of this.points) data[id] = value;
      mkdirSync(dirname(this.file!), { recursive: true });
      writeFileSync(this.file!, JSON.stringify(data, null, 2) + '\n');
    }, 200);
    this.saveTimer.unref?.();
  }
}
