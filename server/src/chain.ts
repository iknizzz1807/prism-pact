/**
 * Operator ký `commitDraft(matchId, draftHash)` lên SeasonVault (1 tx/trận).
 * Nếu thiếu env → trả null và game vẫn chạy bình thường (chain là settlement,
 * không phải điều kiện để chơi).
 */
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import type { Archetype } from '@prism-pact/shared';

export interface ChainClient {
  commitDraft(matchId: string, draftHash: string): Promise<string | null>;
}

export interface DraftPayload {
  matchId: string;
  p1: Archetype[];
  p2: Archetype[];
  p1Ban: Archetype | null;
  p2Ban: Archetype | null;
  salt: string;
}

/** keccak256 của toàn bộ payload draft + salt — công bố sau trận để verify. */
export function buildDraftHash(payload: DraftPayload): string {
  const encoded = JSON.stringify({
    matchId: payload.matchId,
    p1: payload.p1,
    p2: payload.p2,
    p1Ban: payload.p1Ban,
    p2Ban: payload.p2Ban,
    salt: payload.salt,
  });
  return keccak256(toUtf8Bytes(encoded));
}

export function toMatchId(matchId: string): string {
  return keccak256(toUtf8Bytes(matchId));
}

const ABI = ['function commitDraft(bytes32 matchId, bytes32 draftHash) external'];

export function createChainClient(env: NodeJS.ProcessEnv = process.env): ChainClient | null {
  const rpc = env.FUJI_RPC_URL;
  const privateKey = env.PRIVATE_KEY;
  const vaultAddress = env.SEASON_VAULT;

  if (!rpc || !privateKey || !vaultAddress) return null;

  const provider = new JsonRpcProvider(rpc);
  const wallet = new Wallet(privateKey, provider);
  const vault = new Contract(vaultAddress, ABI, wallet);

  return {
    async commitDraft(matchId: string, draftHash: string): Promise<string | null> {
      const tx = await vault.commitDraft!(toMatchId(matchId), draftHash);
      return (tx as { hash: string }).hash;
    },
  };
}
