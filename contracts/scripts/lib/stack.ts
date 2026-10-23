/** Deploy bộ contract Prism Pact — dùng chung cho deploy.ts và demo-season.ts. */
import { ethers, network } from 'hardhat';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { MockBenqi, MockUSDC, SeasonVault } from '../../typechain-types';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

export const usdc = (n: number | string) => ethers.parseUnits(String(n), 6);
export const DAY = 24 * 60 * 60;

export interface StackOptions {
  sponsorUsdc?: number;
  seasonDays?: number;
  apyBps?: number;
  operator?: string;
}

export interface Stack {
  usdcToken: MockUSDC;
  benqi: MockBenqi;
  vault: SeasonVault;
  deployer: HardhatEthersSigner;
  operator: string;
  seasonEnd: number;
  mockApyBps: number;
  sponsorUsdc: number;
}

export async function deployStack(options: StackOptions = {}): Promise<Stack> {
  const [deployer] = await ethers.getSigners();
  const operator = options.operator ?? deployer.address;
  const seasonDays = options.seasonDays ?? 14;
  const sponsorUsdc = options.sponsorUsdc ?? 500;
  const mockApyBps = options.apyBps ?? 500;

  const usdcToken = await (await ethers.getContractFactory('MockUSDC')).deploy();
  await usdcToken.waitForDeployment();

  const benqi = await (
    await ethers.getContractFactory('MockBenqi')
  ).deploy(await usdcToken.getAddress(), mockApyBps);
  await benqi.waitForDeployment();

  const vault = await (
    await ethers.getContractFactory('SeasonVault')
  ).deploy(await usdcToken.getAddress(), await benqi.getAddress(), deployer.address, operator);
  await vault.waitForDeployment();

  const latest = await ethers.provider.getBlock('latest');
  const seasonEnd = (latest?.timestamp ?? Math.floor(Date.now() / 1000)) + seasonDays * DAY;
  await (await vault.startSeason(seasonEnd)).wait();

  if (sponsorUsdc > 0) {
    const amount = usdc(sponsorUsdc);
    await (await usdcToken.mint(deployer.address, amount)).wait();
    await (await usdcToken.approve(await vault.getAddress(), amount)).wait();
    await (await vault.sponsor(amount)).wait();
  }

  return { usdcToken, benqi, vault, deployer, operator, seasonEnd, mockApyBps, sponsorUsdc };
}

export interface DeploymentInfo {
  network: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
  operator: string;
  mockUsdc: string;
  mockBenqi: string;
  seasonVault: string;
  seasonEnd: number;
  mockApyBps: number;
  sponsorUsdc: number;
}

export async function saveDeployment(stack: Stack): Promise<DeploymentInfo> {
  const info: DeploymentInfo = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
    deployer: stack.deployer.address,
    operator: stack.operator,
    mockUsdc: await stack.usdcToken.getAddress(),
    mockBenqi: await stack.benqi.getAddress(),
    seasonVault: await stack.vault.getAddress(),
    seasonEnd: stack.seasonEnd,
    mockApyBps: stack.mockApyBps,
    sponsorUsdc: stack.sponsorUsdc,
  };

  const file = join(__dirname, '..', '..', 'deployments', `${network.name}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(info, null, 2) + '\n');
  return info;
}
