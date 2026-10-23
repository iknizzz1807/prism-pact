import { expect } from 'chai';
import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

const DAY = 24 * 60 * 60;
const usdc = (n: number | string) => ethers.parseUnits(String(n), 6);

// ── Merkle helper (sorted-pair, khớp với OZ MerkleProof) ────────────────

interface Entry {
  account: string;
  amount: bigint;
}

const leafOf = (e: Entry): string =>
  ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [e.account, e.amount]),
  );

const hashPair = (a: string, b: string): string =>
  BigInt(a) < BigInt(b)
    ? ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [a, b])
    : ethers.solidityPackedKeccak256(['bytes32', 'bytes32'], [b, a]);

function buildTree(entries: Entry[]): { root: string; proofs: Map<string, string[]> } {
  const nodes = entries.map((e) => ({ account: e.account, hash: leafOf(e) }));
  let layer = nodes.map((n) => n.hash).sort();
  const layers: string[][] = [layer];

  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(layer[i + 1] ? hashPair(layer[i]!, layer[i + 1]!) : layer[i]!);
    }
    layers.push(next);
    layer = next;
  }

  const proofs = new Map<string, string[]>();
  for (const node of nodes) {
    let idx = layers[0]!.indexOf(node.hash);
    const proof: string[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (sibling < layers[l]!.length) proof.push(layers[l]![sibling]!);
      idx = Math.floor(idx / 2);
    }
    proofs.set(node.account, proof);
  }

  return { root: layers[layers.length - 1]![0]!, proofs };
}

// ── Fixture ─────────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, operator, alice, bob, carol] = await ethers.getSigners();

  const usdcToken = await (await ethers.getContractFactory('MockUSDC')).deploy();
  const benqi = await (
    await ethers.getContractFactory('MockBenqi')
  ).deploy(await usdcToken.getAddress(), 500n); // 5% APY

  const vault = await (
    await ethers.getContractFactory('SeasonVault')
  ).deploy(await usdcToken.getAddress(), await benqi.getAddress(), owner.address, operator.address);

  const vaultAddress = await vault.getAddress();
  const users: HardhatEthersSigner[] = [alice, bob, carol];
  for (const user of users) {
    await usdcToken.mint(user.address, usdc(1000));
    await usdcToken.connect(user).approve(vaultAddress, ethers.MaxUint256);
  }
  await usdcToken.mint(owner.address, usdc(2000));
  await usdcToken.connect(owner).approve(vaultAddress, ethers.MaxUint256);

  const seasonEnd = (await time.latest()) + 14 * DAY;
  await vault.startSeason(seasonEnd);

  return { usdcToken, benqi, vault, owner, operator, alice, bob, carol, seasonEnd };
}

describe('Prism Pact — SeasonVault', () => {
  describe('season & deposit', () => {
    it('deposit chuyển principal vào yield source và ghi sổ', async () => {
      const { usdcToken, benqi, vault, alice } = await loadFixture(deployFixture);

      await vault.connect(alice).deposit(usdc(100));

      expect(await vault.principalOf(alice.address)).to.equal(usdc(100));
      expect(await vault.totalPrincipal()).to.equal(usdc(100));
      expect(await benqi.principalOf(await vault.getAddress())).to.equal(usdc(100));
      expect(await usdcToken.balanceOf(alice.address)).to.equal(usdc(900));
      expect(await vault.prizePool()).to.equal(0n);
    });

    it('từ chối deposit khi mùa chưa bắt đầu', async () => {
      const { usdcToken, benqi, vault, owner, operator, alice } = await loadFixture(deployFixture);

      const fresh = await (
        await ethers.getContractFactory('SeasonVault')
      ).deploy(
        await usdcToken.getAddress(),
        await benqi.getAddress(),
        owner.address,
        operator.address,
      );
      await usdcToken.connect(alice).approve(await fresh.getAddress(), ethers.MaxUint256);

      await expect(fresh.connect(alice).deposit(usdc(1))).to.be.revertedWithCustomError(
        fresh,
        'SeasonNotStarted',
      );
      // vault gốc vẫn hoạt động bình thường
      expect(await vault.seasonEnd()).to.be.greaterThan(0n);
    });

    it('từ chối deposit sau khi mùa kết thúc', async () => {
      const { vault, alice, seasonEnd } = await loadFixture(deployFixture);
      await time.increaseTo(seasonEnd);
      await expect(vault.connect(alice).deposit(usdc(1))).to.be.revertedWithCustomError(
        vault,
        'SeasonEnded',
      );
    });

    it('từ chối deposit 0', async () => {
      const { vault, alice } = await loadFixture(deployFixture);
      await expect(vault.connect(alice).deposit(0)).to.be.revertedWithCustomError(vault, 'ZeroAmount');
    });
  });

  describe('yield', () => {
    it('lãi tích luỹ đúng theo APY và thời gian', async () => {
      const { vault, benqi, alice } = await loadFixture(deployFixture);

      await vault.connect(alice).deposit(usdc(100));
      await time.increase(7 * DAY);
      await benqi.accrue();

      const expected = (usdc(100) * 500n * BigInt(7 * DAY)) / (10000n * BigInt(365 * DAY));
      expect(await vault.yieldBalance()).to.be.closeTo(expected, 10n);
      expect(await vault.prizePool()).to.equal(await vault.yieldBalance());
    });

    it('APY cao (chế độ demo) làm prize pool lớn nhanh', async () => {
      const { vault, benqi, alice } = await loadFixture(deployFixture);

      await vault.connect(alice).deposit(usdc(100));
      await benqi.setApyBps(20000); // 200%
      await time.increase(DAY);
      await benqi.accrue();

      expect(await vault.yieldBalance()).to.be.greaterThan(usdc('0.5'));
    });
  });

  describe('withdraw principal', () => {
    it('không cho rút khi mùa còn chạy', async () => {
      const { vault, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(usdc(100));
      await expect(vault.connect(alice).withdrawPrincipal()).to.be.revertedWithCustomError(
        vault,
        'SeasonActive',
      );
    });

    it('sau mùa: trả đủ 100% principal dù prize đã post', async () => {
      const { usdcToken, vault, alice, owner, seasonEnd, benqi } = await loadFixture(deployFixture);

      await vault.connect(alice).deposit(usdc(100));
      await vault.connect(owner).sponsor(usdc(500));
      await time.increaseTo(seasonEnd);
      await benqi.accrue();

      const { root } = buildTree([{ account: alice.address, amount: usdc(1) }]);
      await vault.postPrizeRoot(root, usdc(1));

      const before = await usdcToken.balanceOf(alice.address);
      await vault.connect(alice).withdrawPrincipal();

      expect(await usdcToken.balanceOf(alice.address)).to.equal(before + usdc(100));
      expect(await vault.totalPrincipal()).to.equal(0n);
    });
  });

  describe('draft commit', () => {
    it('operator commit được, lưu hash và emit event', async () => {
      const { vault, operator } = await loadFixture(deployFixture);
      const matchId = ethers.id('match-1');
      const draftHash = ethers.id('picks-and-salt');

      await expect(vault.connect(operator).commitDraft(matchId, draftHash))
        .to.emit(vault, 'DraftCommitted')
        .withArgs(matchId, draftHash);

      expect(await vault.draftHashOf(matchId)).to.equal(draftHash);
    });

    it('người không phải operator bị chặn', async () => {
      const { vault, alice } = await loadFixture(deployFixture);
      await expect(
        vault.connect(alice).commitDraft(ethers.id('m'), ethers.id('h')),
      ).to.be.revertedWithCustomError(vault, 'NotOperator');
    });

    it('không commit trùng matchId', async () => {
      const { vault, operator } = await loadFixture(deployFixture);
      const matchId = ethers.id('match-1');
      await vault.connect(operator).commitDraft(matchId, ethers.id('h1'));
      await expect(
        vault.connect(operator).commitDraft(matchId, ethers.id('h2')),
      ).to.be.revertedWithCustomError(vault, 'AlreadyCommitted');
    });
  });

  describe('prize', () => {
    async function prizeFixture() {
      const base = await deployFixture();
      await base.vault.connect(base.alice).deposit(usdc(100));
      await base.vault.connect(base.bob).deposit(usdc(100));
      await base.vault.connect(base.owner).sponsor(usdc(500));
      await time.increaseTo(base.seasonEnd);
      await base.benqi.accrue();
      return base;
    }

    it('post root + claim hoạt động, chống claim 2 lần', async () => {
      const { usdcToken, vault, alice, bob } = await loadFixture(prizeFixture);

      const entries: Entry[] = [
        { account: alice.address, amount: usdc(300) },
        { account: bob.address, amount: usdc(200) },
      ];
      const { root, proofs } = buildTree(entries);

      await vault.postPrizeRoot(root, usdc(500));
      expect(await vault.prizeReserve()).to.equal(usdc(500));

      const before = await usdcToken.balanceOf(alice.address);
      await vault.connect(alice).claimPrize(usdc(300), proofs.get(alice.address)!);
      expect(await usdcToken.balanceOf(alice.address)).to.equal(before + usdc(300));

      await expect(
        vault.connect(alice).claimPrize(usdc(300), proofs.get(alice.address)!),
      ).to.be.revertedWithCustomError(vault, 'AlreadyClaimed');

      await vault.connect(bob).claimPrize(usdc(200), proofs.get(bob.address)!);
      expect(await vault.prizeReserve()).to.equal(0n);
    });

    it('proof sai bị từ chối', async () => {
      const { vault, alice, carol } = await loadFixture(prizeFixture);

      const entries: Entry[] = [
        { account: alice.address, amount: usdc(300) },
        { account: carol.address, amount: usdc(200) },
      ];
      const { root, proofs } = buildTree(entries);
      await vault.postPrizeRoot(root, usdc(500));

      await expect(
        vault.connect(carol).claimPrize(usdc(300), proofs.get(alice.address)!),
      ).to.be.revertedWithCustomError(vault, 'InvalidProof');
    });

    it('không post prize vượt quá pool', async () => {
      const { vault, alice } = await loadFixture(prizeFixture);
      const { root } = buildTree([{ account: alice.address, amount: 1n }]);
      await expect(vault.postPrizeRoot(root, usdc(10_000))).to.be.revertedWithCustomError(
        vault,
        'ExceedsPool',
      );
    });

    it('không post prize khi mùa còn chạy', async () => {
      const { vault, alice } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(usdc(100));
      const { root } = buildTree([{ account: alice.address, amount: 1n }]);
      await expect(vault.postPrizeRoot(root, 1n)).to.be.revertedWithCustomError(vault, 'SeasonActive');
    });

    it('không post 2 lần', async () => {
      const { vault, alice, bob } = await loadFixture(prizeFixture);
      const { root } = buildTree([
        { account: alice.address, amount: usdc(250) },
        { account: bob.address, amount: usdc(250) },
      ]);
      await vault.postPrizeRoot(root, usdc(500));
      await expect(vault.postPrizeRoot(root, usdc(500))).to.be.revertedWithCustomError(
        vault,
        'AlreadyPosted',
      );
    });

    it('invariant: principal không bị dùng làm prize', async () => {
      const { usdcToken, benqi, vault, alice, bob } = await loadFixture(prizeFixture);

      const entries: Entry[] = [
        { account: alice.address, amount: usdc(300) },
        { account: bob.address, amount: usdc(200) },
      ];
      const { root, proofs } = buildTree(entries);
      await vault.postPrizeRoot(root, usdc(500));
      await vault.connect(alice).claimPrize(usdc(300), proofs.get(alice.address)!);
      await vault.connect(bob).claimPrize(usdc(200), proofs.get(bob.address)!);

      // Prize đã trả hết nhưng principal vẫn nguyên trong yield source
      expect(await vault.totalPrincipal()).to.equal(usdc(200));
      expect(await benqi.principalOf(await vault.getAddress())).to.equal(usdc(200));

      const aliceBefore = await usdcToken.balanceOf(alice.address);
      const bobBefore = await usdcToken.balanceOf(bob.address);
      await vault.connect(alice).withdrawPrincipal();
      await vault.connect(bob).withdrawPrincipal();

      expect(await usdcToken.balanceOf(alice.address)).to.equal(aliceBefore + usdc(100));
      expect(await usdcToken.balanceOf(bob.address)).to.equal(bobBefore + usdc(100));
    });
  });

  describe('sponsor', () => {
    it('sponsor làm tăng prize pool ngay lập tức', async () => {
      const { vault, owner } = await loadFixture(deployFixture);
      await vault.connect(owner).sponsor(usdc(500));
      expect(await vault.prizePool()).to.equal(usdc(500));
      expect(await vault.sponsored()).to.equal(usdc(500));
    });

    it('owner rút được sponsor dư sau khi post prize, không đụng prizeReserve', async () => {
      const { usdcToken, benqi, vault, owner, alice, bob } = await loadFixture(deployFixture);
      await vault.connect(alice).deposit(usdc(100));
      await vault.connect(bob).deposit(usdc(100));
      await vault.connect(owner).sponsor(usdc(1000));
      await time.increaseTo(await vault.seasonEnd());
      await benqi.accrue();

      const { root } = buildTree([
        { account: alice.address, amount: usdc(100) },
        { account: bob.address, amount: usdc(100) },
      ]);
      await vault.postPrizeRoot(root, usdc(200));

      const before = await usdcToken.balanceOf(owner.address);
      await vault.connect(owner).withdrawUnusedSponsor(owner.address);

      expect(await usdcToken.balanceOf(owner.address)).to.be.greaterThan(before + usdc(799));
      expect(await vault.prizeReserve()).to.equal(usdc(200));
    });
  });
});
