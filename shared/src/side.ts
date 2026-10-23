import type { Side } from './types.js';

export const otherSide = (side: Side): Side => (side === 'P1' ? 'P2' : 'P1');
