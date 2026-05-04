// Forge platform fee model.
//
// We bill the customer in USD (paid in fiat or USDC/USDT). On top of our
// fee we pass through the chain's native gas — shown to the customer
// before they confirm so they know the breakdown.
//
// Tweak these numbers to your business model. They're chosen to be:
//   - profitable on Starter even after we eat support cost,
//   - competitive with CoinTool / TokenMint / Bitbond Token Tool,
//   - high enough on Launch to fund the whitepaper editor + listing rep.

export const PLAN_TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    price: 499,
    description: 'Single-chain ERC/BEP/TRC-20 deploy with verified source.',
    chainsIncluded: 1,
    features: {
      contract: true,
      verification: true,
      icon: true,
      whitepaper: false,
      landing: false,
      exchangePack: false,
      audit: false,
      kycBadge: false,
      liquidityHelp: false,
    },
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 1499,
    description: 'Contract + whitepaper draft + landing page on 1 chain.',
    chainsIncluded: 1,
    features: {
      contract: true,
      verification: true,
      icon: true,
      whitepaper: true,
      landing: true,
      exchangePack: false,
      audit: false,
      kycBadge: false,
      liquidityHelp: false,
    },
  },
  {
    id: 'launch',
    label: 'Launch',
    price: 3999,
    description: 'Up to 3 chains + whitepaper + landing + exchange pack + KYC badge.',
    chainsIncluded: 3,
    features: {
      contract: true,
      verification: true,
      icon: true,
      whitepaper: true,
      landing: true,
      exchangePack: true,
      audit: false,
      kycBadge: true,
      liquidityHelp: true,
    },
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: 9999,
    description: 'Everything + audit coordination + market-maker intro + bridge config.',
    chainsIncluded: 99,
    features: {
      contract: true,
      verification: true,
      icon: true,
      whitepaper: true,
      landing: true,
      exchangePack: true,
      audit: true,
      kycBadge: true,
      liquidityHelp: true,
    },
  },
]

export function getPlan(id) {
  return PLAN_TIERS.find((p) => p.id === id) || PLAN_TIERS[0]
}

export function totalCost(plan, gasUsd, extraChains = 0) {
  const overage = Math.max(0, extraChains) * 250 // per extra chain past plan limit
  return {
    platform: plan.price,
    overage,
    gas: gasUsd,
    total: +(plan.price + overage + gasUsd).toFixed(2),
  }
}
