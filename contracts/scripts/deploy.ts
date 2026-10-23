/**
 * Deploy bộ contract Prism Pact lên Fuji (hoặc hardhat local).
 *
 *   npm run deploy:fuji   --workspace contracts
 *   npm run deploy:local  --workspace contracts
 *
 * Ghi địa chỉ vào contracts/deployments/<network>.json để client/server dùng.
 */
import { network } from 'hardhat';
import { deployStack, saveDeployment } from './lib/stack';

async function main() {
  console.log(`\nNetwork : ${network.name}`);

  const stack = await deployStack({
    sponsorUsdc: Number(process.env.SPONSOR_USDC ?? 500),
    seasonDays: Number(process.env.SEASON_DAYS ?? 14),
    apyBps: Number(process.env.MOCK_APY_BPS ?? 500),
    operator: process.env.OPERATOR_ADDRESS,
  });

  const info = await saveDeployment(stack);

  console.log(`Deployer: ${info.deployer}`);
  console.log(`Operator: ${info.operator}`);
  console.log('\n── Deployed ─────────────────────────────');
  console.log(`MockUSDC    : ${info.mockUsdc}`);
  console.log(`MockBenqi   : ${info.mockBenqi}`);
  console.log(`SeasonVault : ${info.seasonVault}`);
  console.log(`Season ends : ${new Date(info.seasonEnd * 1000).toISOString()}`);
  console.log(`Prize pool  : ${info.sponsorUsdc} USDC (sponsor)`);
  console.log(`Saved to    : contracts/deployments/${network.name}.json\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
