/**
 * Demo trọn vòng đời DeFi trên hardhat network (không cần ví thật):
 *   deposit → yield 14 ngày → post prize root → claim → withdraw principal
 * và in bảng chứng minh "no-loss": người thua nhận lại đủ 100%.
 *
 *   npm run demo:season --workspace contracts
 */
import { ethers, network } from 'hardhat';
import { formatUnits } from 'ethers';
import { deployStack, saveDeployment, usdc } from './lib/stack';

const SEED = 1000;
const DEPOSIT = 100;
const SPONSOR = 500;

async function main() {
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('demo-season chỉ chạy trên hardhat/localhost (cần nhiều signer + tua thời gian).');
    return;
  }

  const stack = await deployStack({ sponsorUsdc: SPONSOR, seasonDays: 14, apyBps: 500 });
  const info = await saveDeployment(stack);
  const { usdcToken, benqi, vault } = stack;

  const signers = await ethers.getSigners();
  const names = ['alice', 'bob', 'carol'];
  const players = signers.slice(2, 5);

  console.log('\n── Season demo ─────────────────────────────');
  console.log(`Vault: ${info.seasonVault}`);
  console.log(`Mùa kết thúc: ${new Date(info.seasonEnd * 1000).toISOString()}`);

  // 1. Nạp 100 USDC mỗi người
  for (const player of players) {
    await (await usdcToken.mint(player.address, usdc(SEED))).wait();
    await (await usdcToken.connect(player).approve(await vault.getAddress(), usdc(DEPOSIT))).wait();
    await (await vault.connect(player).deposit(usdc(DEPOSIT))).wait();
  }
  console.log(`Đã nạp ${DEPOSIT} USDC × ${players.length} + sponsor ${SPONSOR} USDC`);

  // 2. Tua thời gian tới cuối mùa
  const now = Number((await ethers.provider.getBlock('latest'))?.timestamp ?? 0);
  if (now < stack.seasonEnd) {
    await ethers.provider.send('evm_increaseTime', [stack.seasonEnd - now + 60]);
    await ethers.provider.send('evm_mine', []);
    console.log(`Tua thời gian ${Math.ceil((stack.seasonEnd - now) / 86400)} ngày (hardhat)`);
  }

  // 3. Chốt lãi
  await (await benqi.accrue()).wait();
  const pool = (await vault.prizePool()) as bigint;
  const principal = (await vault.totalPrincipal()) as bigint;
  console.log(`\nPrize pool : ${formatUnits(pool, 6)} USDC`);
  console.log(`Principal  : ${formatUnits(principal, 6)} USDC (không đụng tới)`);

  // 4. Top 30% của 3 người = 1 người → nhận toàn bộ pool
  const winner = players[0]!;
  const leaf = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [winner.address, pool]),
  );
  await (await vault.postPrizeRoot(leaf, pool)).wait();
  await (await vault.connect(winner).claimPrize(pool, [])).wait();
  console.log(`Đã post merkle root + ${names[0]} claim prize`);

  // 5. Tất cả rút principal
  for (const player of players) {
    await (await vault.connect(player).withdrawPrincipal()).wait();
  }

  // 6. Bảng chứng minh no-loss
  console.log('\nNgười chơi   Nạp    Nhận lại   Prize      Tổng');
  console.log('──────────────────────────────────────────────────────');

  let noLoss = true;
  for (let i = 0; i < players.length; i++) {
    const balance = (await usdcToken.balanceOf(players[i]!.address)) as bigint;
    const prize = i === 0 ? pool : 0n;
    const expected = usdc(SEED) + prize;
    if (balance !== expected) noLoss = false;

    console.log(
      `${names[i]!.padEnd(11)} ${String(DEPOSIT).padStart(4)}   ` +
        `${String(DEPOSIT).padStart(7)}   ${formatUnits(prize, 6).padStart(8)}   ` +
        `${formatUnits(balance, 6)}`,
    );
  }

  console.log('──────────────────────────────────────────────────────');
  console.log(noLoss ? '✓ No-loss: mọi người nhận lại đủ principal' : '✗ SAI: có người mất principal');
  console.log(`✓ Prize lấy từ yield + sponsor: ${formatUnits(pool, 6)} USDC\n`);

  if (!noLoss) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
