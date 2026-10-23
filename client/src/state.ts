import type { MatchView, RankView, Side, TurnAnimation } from '@prism-pact/shared';

export interface MatchEnd {
  winner: Side | 'draw';
  rank: RankView;
}

type Listener = () => void;

const MAX_EVENTS = 60;

/**
 * Chỉ giữ snapshot mới nhất từ server + event log.
 * Scene render thẳng từ đây, không suy diễn luật chơi.
 */
export class MatchStore {
  view: MatchView | null = null;
  events: string[] = [];
  end: MatchEnd | null = null;
  lastRank: RankView | null = null;

  private animation: TurnAnimation | null = null;
  private animationSeq = 0;
  private consumedSeq = 0;

  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setView(view: MatchView, events: string[], animation?: TurnAnimation): void {
    if (!this.view || this.view.matchId !== view.matchId) {
      this.events = [];
    }
    this.view = view;
    if (animation) {
      this.animation = animation;
      this.animationSeq += 1;
    }
    if (events.length > 0) {
      this.events = [...this.events, ...events].slice(-MAX_EVENTS);
    }
    if (view.rank) this.lastRank = view.rank;
    this.emit();
  }

  /** Trả về animation mới nhất chưa được phát; null nếu đã phát rồi. */
  consumeAnimation(): { animation: TurnAnimation; seq: number } | null {
    if (!this.animation || this.animationSeq === this.consumedSeq) return null;
    this.consumedSeq = this.animationSeq;
    return { animation: this.animation, seq: this.animationSeq };
  }

  setEnd(winner: Side | 'draw', rank: RankView): void {
    this.end = { winner, rank };
    this.lastRank = rank;
    this.emit();
  }

  pushEvent(text: string): void {
    this.events = [...this.events, text].slice(-MAX_EVENTS);
    this.emit();
  }

  clear(): void {
    this.view = null;
    this.end = null;
    this.events = [];
    this.animation = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const matchStore = new MatchStore();
