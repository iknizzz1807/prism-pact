import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';
import 'dotenv/config';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FUJI_RPC_URL = process.env.FUJI_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    fuji: {
      url: FUJI_RPC_URL,
      chainId: 43113,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  mocha: {
    timeout: 60_000,
  },
};

export default config;
