// Chain registry for Token Studio.
//
// Gas estimates are rough — replace with live values fetched from:
//   EVM:    Alchemy `eth_gasPrice` + estimateGas on the deploy bytecode
//   Tron:   TronGrid /wallet/triggerconstantcontract energy estimate
//   Solana: getRecentPrioritizationFees + base rent for mint+metadata
//
// Native USD price comes from CoinGecko /simple/price.

export const CHAINS = [
  {
    id: 'ethereum',
    label: 'Ethereum (ERC-20)',
    standard: 'ERC-20',
    native: 'ETH',
    nativeUsd: 3500,
    deployGas: 1_500_000,
    gasPriceGwei: 22,
    rpcEnv: 'VITE_ALCHEMY_API_KEY',
    explorer: 'https://etherscan.io',
    explorerApi: 'https://api.etherscan.io/api',
    explorerKeyEnv: 'VITE_ETHERSCAN_API_KEY',
    badge: '#6ea8ff',
  },
  {
    id: 'bsc',
    label: 'BNB Smart Chain (BEP-20)',
    standard: 'BEP-20',
    native: 'BNB',
    nativeUsd: 620,
    deployGas: 1_500_000,
    gasPriceGwei: 3,
    rpcEnv: 'VITE_BSC_RPC_URL',
    explorer: 'https://bscscan.com',
    explorerApi: 'https://api.bscscan.com/api',
    explorerKeyEnv: 'VITE_BSCSCAN_API_KEY',
    badge: '#f5b13d',
  },
  {
    id: 'tron',
    label: 'Tron (TRC-20)',
    standard: 'TRC-20',
    native: 'TRX',
    nativeUsd: 0.18,
    deployEnergy: 1_500_000_000,        // a deploy can burn this much energy
    energyPerTrx: 25_000,                // network parameter (changes)
    rpcEnv: 'VITE_TRONGRID_API_KEY',
    explorer: 'https://tronscan.org',
    explorerApi: 'https://apilist.tronscanapi.com/api',
    explorerKeyEnv: 'VITE_TRONSCAN_API_KEY',
    badge: '#ff4747',
  },
  {
    id: 'polygon',
    label: 'Polygon (ERC-20)',
    standard: 'ERC-20',
    native: 'MATIC',
    nativeUsd: 0.55,
    deployGas: 1_500_000,
    gasPriceGwei: 35,
    rpcEnv: 'VITE_POLYGON_RPC_URL',
    explorer: 'https://polygonscan.com',
    explorerApi: 'https://api.polygonscan.com/api',
    explorerKeyEnv: 'VITE_POLYGONSCAN_API_KEY',
    badge: '#a06ef0',
  },
  {
    id: 'arbitrum',
    label: 'Arbitrum One (ERC-20)',
    standard: 'ERC-20',
    native: 'ETH',
    nativeUsd: 3500,
    deployGas: 2_500_000,
    gasPriceGwei: 0.1,
    rpcEnv: 'VITE_ARBITRUM_RPC_URL',
    explorer: 'https://arbiscan.io',
    explorerApi: 'https://api.arbiscan.io/api',
    explorerKeyEnv: 'VITE_ARBISCAN_API_KEY',
    badge: '#28a0f0',
  },
  {
    id: 'base',
    label: 'Base (ERC-20)',
    standard: 'ERC-20',
    native: 'ETH',
    nativeUsd: 3500,
    deployGas: 1_500_000,
    gasPriceGwei: 0.05,
    rpcEnv: 'VITE_BASE_RPC_URL',
    explorer: 'https://basescan.org',
    explorerApi: 'https://api.basescan.org/api',
    explorerKeyEnv: 'VITE_BASESCAN_API_KEY',
    badge: '#0052ff',
  },
  {
    id: 'avalanche',
    label: 'Avalanche C-Chain (ERC-20)',
    standard: 'ERC-20',
    native: 'AVAX',
    nativeUsd: 32,
    deployGas: 1_500_000,
    gasPriceGwei: 27,
    rpcEnv: 'VITE_AVAX_RPC_URL',
    explorer: 'https://snowtrace.io',
    explorerApi: 'https://api.snowtrace.io/api',
    explorerKeyEnv: 'VITE_SNOWTRACE_API_KEY',
    badge: '#e84142',
  },
]

export function getChain(id) {
  return CHAINS.find((c) => c.id === id) || CHAINS[0]
}

// Returns { native, nativeAmount, usd } — gas cost in native and USD.
export function estimateDeployCost(chain) {
  if (chain.id === 'tron') {
    const trx = chain.deployEnergy / chain.energyPerTrx
    return {
      native: chain.native,
      nativeAmount: +trx.toFixed(2),
      usd: +(trx * chain.nativeUsd).toFixed(2),
    }
  }
  // EVM: cost = gas * gasPrice (gwei → ether) * nativeUsd
  const ether = (chain.deployGas * chain.gasPriceGwei) / 1e9
  return {
    native: chain.native,
    nativeAmount: +ether.toFixed(6),
    usd: +(ether * chain.nativeUsd).toFixed(2),
  }
}
