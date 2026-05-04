// Data layer for the CABLE / WIRE demo.
//
// Currently returns HARDCODED data so the UI renders without any backend.
// Every function is async and shaped so it can be swapped for a real call:
//
//   - On-chain reads (token supply, holders, transfers) → Alchemy SDK
//   - Banking reads (SWIFT GLOBAL TRN feed, custody balances) → bank API gateway
//
// To wire Alchemy:
//   1. npm install alchemy-sdk
//   2. Add VITE_ALCHEMY_API_KEY to .env.local
//   3. Replace the bodies of getTokenStats / getRecentTransfers with the
//      commented-out Alchemy code below. The function signatures don't change.

const TOKEN_ADDRESS_PLACEHOLDER = '0xCAB1E0000000000000000000000000000000CAB1'
const NETWORK = 'base-mainnet'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- ERC-20 / on-chain stats -------------------------------------------------

export async function getTokenStats() {
  await sleep(300)
  return {
    address: TOKEN_ADDRESS_PLACEHOLDER,
    network: NETWORK,
    name: 'CABLE',
    symbol: 'CABLE',
    decimals: 24,
    totalSupply: '1,000,000,000,000', // 1T
    circulating: '184,250,000,000',
    holders: 1247,
    priceUsd: 1.0382,
    priceChange24h: 0.42,
    marketCap: '1,038,200,000',
    collateralizationRatio: 1.18, // colateral / circulating
  }
  // TODO(alchemy):
  // import { Alchemy, Network } from 'alchemy-sdk'
  // const alchemy = new Alchemy({
  //   apiKey: import.meta.env.VITE_ALCHEMY_API_KEY,
  //   network: Network.BASE_MAINNET,
  // })
  // const meta = await alchemy.core.getTokenMetadata(TOKEN_ADDRESS_PLACEHOLDER)
  // const supply = await alchemy.core.getTokenSupply(TOKEN_ADDRESS_PLACEHOLDER)
  // ...
}

export async function getRecentTransfers(limit = 6) {
  await sleep(450)
  const sample = [
    { hash: '0x9af1...d2c0', from: 'Custody-BVI', to: 'PPP-Tranche-12', amount: '12,500,000', ageMin: 2 },
    { hash: '0x44e2...1b7a', from: 'MM-Aerodrome', to: 'Treasury', amount: '850,000', ageMin: 7 },
    { hash: '0xb1c8...7fe4', from: 'Bullet-Desk-3', to: 'LP-Pool', amount: '4,200,000', ageMin: 14 },
    { hash: '0x2d7e...88a1', from: 'Mint', to: 'Custody-BVI', amount: '50,000,000', ageMin: 23 },
    { hash: '0xee03...5910', from: 'PPP-Tranche-11', to: 'Investor-A', amount: '7,750,000', ageMin: 38 },
    { hash: '0x71bd...4c2f', from: 'Treasury', to: 'MM-Uniswap', amount: '2,100,000', ageMin: 52 },
  ]
  return sample.slice(0, limit)
  // TODO(alchemy):
  // const transfers = await alchemy.core.getAssetTransfers({
  //   contractAddresses: [TOKEN_ADDRESS_PLACEHOLDER],
  //   category: ['erc20'],
  //   maxCount: limit,
  //   order: 'desc',
  // })
  // return transfers.transfers.map(...)
}

// --- Banking / SWIFT GLOBAL TRN feed -----------------------------------------

export async function getCollateralFeed() {
  await sleep(380)
  return {
    source: 'SWIFT GLOBAL · MT760 / MT799 messages',
    custodian: 'BVI Trust Co. (regulated)',
    lastSync: new Date().toISOString(),
    totalCollateralUsd: '1,225,000,000',
    items: [
      {
        ref: 'SWGT-2026-0481',
        bank: 'HSBC London',
        instrument: 'TRN MT760',
        amountUsd: '450,000,000',
        maturity: '2027-03-14',
        status: 'verified',
      },
      {
        ref: 'SWGT-2026-0482',
        bank: 'Deutsche Bank Frankfurt',
        instrument: 'TRN MT799',
        amountUsd: '300,000,000',
        maturity: '2026-11-02',
        status: 'verified',
      },
      {
        ref: 'SWGT-2026-0483',
        bank: 'Standard Chartered Singapore',
        instrument: 'TRN MT760',
        amountUsd: '275,000,000',
        maturity: '2027-08-21',
        status: 'pending',
      },
      {
        ref: 'SWGT-2026-0484',
        bank: 'BNP Paribas Paris',
        instrument: 'TRN MT760',
        amountUsd: '200,000,000',
        maturity: '2026-09-30',
        status: 'verified',
      },
    ],
  }
  // TODO(banking-api):
  // const res = await fetch(`${import.meta.env.VITE_BANK_API_URL}/swift/trn-feed`, {
  //   headers: { Authorization: `Bearer ${import.meta.env.VITE_BANK_API_TOKEN}` },
  // })
  // return res.json()
}

export const config = {
  tokenAddress: TOKEN_ADDRESS_PLACEHOLDER,
  network: NETWORK,
  alchemyKey: import.meta.env?.VITE_ALCHEMY_API_KEY ?? null,
  bankApiUrl: import.meta.env?.VITE_BANK_API_URL ?? null,
}
