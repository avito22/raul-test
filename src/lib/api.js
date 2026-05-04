// Forge platform — data layer.
//
// Every function below is async so the UI can swap hardcoded data for live
// API calls without touching the components. Each section marks the exact
// real-world API that should replace the stub:
//
//   - Alchemy / Infura / QuickNode  → ERC-20 deploy + read on EVM chains
//   - BscScan / Etherscan / Basescan / Arbiscan / Polygonscan → contract verify
//   - TronGrid / TronScan API       → TRC-20 deploy + read on Tron
//   - Solana RPC + Metaplex         → SPL token deploy
//   - Chainlink Proof-of-Reserve    → on-chain reserve attestation feed
//   - BitGo / Fireblocks / Anchorage → custodian REST API for SPV holdings
//   - CoinGecko / CoinMarketCap     → price feeds for gas USD conversion
//   - Sumsub / Notabene / Chainalysis → KYC / Travel Rule / screening
//
// All keys live in env vars — see config at the bottom of this file.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// RWA MANAGER
// ---------------------------------------------------------------------------
// An "Asset Series" is one tokenized real-world position: a registered SPV
// that holds a specific underlying (T-Bill, ETF, private credit pool) at a
// regulated custodian, with a Chainlink PoR feed exposing reserves on-chain.
//
// Real source for these in production:
//   - SPV registry           → Companies House / BVI FSC / Liechtenstein FMA APIs
//   - Custodian holdings     → BitGo/Fireblocks/Anchorage REST (signed reports)
//   - PoR feed               → Chainlink data feed contract (read on-chain)
//   - Token contract         → ERC-20 read via Alchemy
// ---------------------------------------------------------------------------

const SEED_ASSET_SERIES = [
  {
    id: 'series-ustb-001',
    ticker: 'fUSTB',
    name: 'Forge Short-Duration US Treasuries',
    underlying: '3-month US Treasury Bills (CUSIP 912797JX5)',
    issuerSpv: 'Forge Treasury SPV I, Ltd. (BVI 2087612)',
    custodian: 'BitGo Trust Company (SD chartered)',
    custodianAccount: 'BTGT-94521-FORGE',
    auditor: 'Ernst & Young LLP',
    legalOpinion: 'Walkers (BVI) — non-security under Reg S',
    jurisdiction: 'BVI / Reg S to non-US qualified purchasers',
    porFeed: '0x4d5f...ab12',           // Chainlink PoR feed address (mock)
    tokenAddress: '0xa0e1...77fe',       // ERC-20 contract (mock)
    chain: 'ethereum',
    decimals: 6,
    reserveUsd: 4_812_540.22,
    circulatingSupply: 4_810_000.0,
    navPerToken: 1.0005,
    apyTarget: 4.85,
    status: 'active',
    createdAt: '2025-09-12',
  },
  {
    id: 'series-ig-001',
    ticker: 'fIGCB',
    name: 'Forge Investment-Grade Corporate Basket',
    underlying: 'iShares iBoxx $ Investment Grade Corp Bond ETF (LQD)',
    issuerSpv: 'Forge Credit SPC — Series A (Cayman 414220)',
    custodian: 'Anchorage Digital Bank, NA',
    custodianAccount: 'ANCH-FORGE-IG-A',
    auditor: 'KPMG Cayman',
    legalOpinion: 'Maples Group — non-security to non-US qualified',
    jurisdiction: 'Cayman SPC / Reg S',
    porFeed: '0x77ab...90e4',
    tokenAddress: '0xb2c4...1f02',
    chain: 'base',
    decimals: 18,
    reserveUsd: 1_205_330.10,
    circulatingSupply: 1_198_500.0,
    navPerToken: 1.0057,
    apyTarget: 5.40,
    status: 'active',
    createdAt: '2025-11-04',
  },
  {
    id: 'series-mmf-001',
    ticker: 'fMMF',
    name: 'Forge USD Money Market',
    underlying: 'Federated Hermes Govt Obligations Fund (GOIXX)',
    issuerSpv: 'Forge Cash SPV LLC (Delaware 7041188)',
    custodian: 'Coinbase Custody Trust Company, LLC',
    custodianAccount: 'CBC-2204-FORGE-MMF',
    auditor: 'Deloitte & Touche LLP',
    legalOpinion: 'Cooley LLP — Reg D 506(c) accredited',
    jurisdiction: 'US / SEC Reg D 506(c)',
    porFeed: '0x0188...c4d2',
    tokenAddress: '0xc8d1...ee93',
    chain: 'ethereum',
    decimals: 6,
    reserveUsd: 12_400_111.50,
    circulatingSupply: 12_398_220.0,
    navPerToken: 1.0001,
    apyTarget: 4.55,
    status: 'pending-review',
    createdAt: '2026-04-21',
  },
]

let assetSeriesStore = null

function loadAssetSeries() {
  if (assetSeriesStore) return assetSeriesStore
  try {
    const raw = localStorage.getItem('forge.assetSeries')
    assetSeriesStore = raw ? JSON.parse(raw) : [...SEED_ASSET_SERIES]
  } catch {
    assetSeriesStore = [...SEED_ASSET_SERIES]
  }
  return assetSeriesStore
}

function persistAssetSeries() {
  try {
    localStorage.setItem('forge.assetSeries', JSON.stringify(assetSeriesStore))
  } catch { /* localStorage unavailable */ }
}

export async function listAssetSeries() {
  // REAL: GET /v1/series → Forge backend; backend joins on-chain PoR + custodian.
  await sleep(120)
  return loadAssetSeries()
}

export async function createAssetSeries(input) {
  // REAL pipeline:
  //   1. Validate SPV exists (Companies House / BVI FSC API).
  //   2. Confirm custodian account via custodian API (BitGo/Fireblocks).
  //   3. Deploy permissioned ERC-20 (Alchemy + signer).
  //   4. Wire Chainlink PoR feed; record feed address.
  //   5. Persist series in backend DB.
  await sleep(400)
  const list = loadAssetSeries()
  const id = `series-${Date.now().toString(36)}`
  const series = {
    id,
    status: 'pending-review',
    createdAt: new Date().toISOString().slice(0, 10),
    reserveUsd: 0,
    circulatingSupply: 0,
    navPerToken: 1.0,
    porFeed: '0x' + Math.random().toString(16).slice(2, 10) + '...',
    tokenAddress: '0x' + Math.random().toString(16).slice(2, 10) + '...',
    decimals: 6,
    ...input,
  }
  assetSeriesStore = [series, ...list]
  persistAssetSeries()
  return series
}

export async function deleteAssetSeries(id) {
  await sleep(120)
  assetSeriesStore = loadAssetSeries().filter((s) => s.id !== id)
  persistAssetSeries()
  return { ok: true }
}

export async function recordMintBurn({ seriesId, kind, amount, txNote }) {
  // REAL: signed call to permissioned ERC-20 mint()/burn() — only callable
  // by the issuer SPV's signer; reserves must increase/decrease in lockstep
  // with the custodian holding (verified via PoR before the tx is broadcast).
  await sleep(260)
  const list = loadAssetSeries()
  const series = list.find((s) => s.id === seriesId)
  if (!series) throw new Error('Series not found')
  const delta = kind === 'mint' ? amount : -amount
  series.circulatingSupply = +(series.circulatingSupply + delta).toFixed(2)
  series.reserveUsd = +(series.reserveUsd + delta * series.navPerToken).toFixed(2)
  persistAssetSeries()
  const entry = {
    id: `tx-${Date.now().toString(36)}`,
    seriesId,
    ticker: series.ticker,
    kind,
    amount,
    note: txNote || '',
    txHash: '0x' + Math.random().toString(16).slice(2, 18) + '…',
    at: new Date().toISOString(),
  }
  const ledger = JSON.parse(localStorage.getItem('forge.ledger') || '[]')
  ledger.unshift(entry)
  localStorage.setItem('forge.ledger', JSON.stringify(ledger.slice(0, 200)))
  return entry
}

export async function listLedger() {
  await sleep(80)
  try {
    return JSON.parse(localStorage.getItem('forge.ledger') || '[]')
  } catch {
    return []
  }
}

export async function getReserveSnapshot(seriesId) {
  // REAL: read Chainlink PoR feed contract via Alchemy `eth_call`.
  // Returns the latest signed reserve attestation.
  await sleep(180)
  const series = loadAssetSeries().find((s) => s.id === seriesId)
  if (!series) return null
  return {
    asOf: new Date().toISOString(),
    reserveUsd: series.reserveUsd,
    circulatingSupply: series.circulatingSupply,
    coverageRatio: series.circulatingSupply
      ? +(series.reserveUsd / (series.circulatingSupply * series.navPerToken)).toFixed(4)
      : 1.0,
    feed: series.porFeed,
    source: 'Chainlink PoR (mock) → replace with live feed read',
  }
}

// ---------------------------------------------------------------------------
// TOKEN STUDIO — name availability
// ---------------------------------------------------------------------------
// Real implementation:
//   - Symbol/name lookup against CoinGecko + CoinMarketCap.
//   - Contract deploy collision check via chain explorer.
//   - Trademark check (USPTO / EUIPO) is manual but can be linked.
// ---------------------------------------------------------------------------

const TAKEN_SYMBOLS = new Set([
  'USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'BNB', 'SOL', 'TRX', 'WETH', 'WBTC',
  'LINK', 'UNI', 'AAVE', 'MKR', 'SHIB', 'PEPE', 'DOGE', 'MATIC', 'POL',
  'ARB', 'OP', 'AVAX', 'NEAR', 'ATOM', 'XRP', 'LTC', 'ADA', 'BUSD', 'TUSD',
  'PYUSD', 'FDUSD', 'CRV', 'LDO', 'RPL', 'FRAX', 'COMP', 'SNX', 'SUSHI',
])

export async function checkSymbolAvailability(symbol) {
  // REAL:
  //   GET https://api.coingecko.com/api/v3/coins/list  → match by `symbol`
  //   GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?symbol=...
  //   GET https://api.etherscan.io/api?module=token&action=tokeninfo&...
  await sleep(220)
  const s = (symbol || '').trim().toUpperCase()
  if (!s) return { ok: false, reason: 'Symbol is empty' }
  if (s.length < 2 || s.length > 8) return { ok: false, reason: 'Symbol must be 2–8 chars' }
  if (!/^[A-Z0-9]+$/.test(s)) return { ok: false, reason: 'Letters and digits only' }
  if (TAKEN_SYMBOLS.has(s)) {
    return { ok: false, reason: `${s} is already a major listed token (CoinGecko/CMC)` }
  }
  return { ok: true, reason: `${s} appears unused on the top-1000 lists` }
}

// ---------------------------------------------------------------------------
// TOKEN STUDIO — deploy (mock)
// ---------------------------------------------------------------------------
// Real implementation per chain:
//   EVM (eth/bsc/polygon/arbitrum/base/avalanche):
//     1. Compile OpenZeppelin ERC20 + extensions chosen by user.
//     2. Estimate gas via Alchemy `eth_estimateGas`.
//     3. Sign + send creation tx with platform deployer key (or user-signed
//        via WalletConnect); user pays gas + platform fee in USD/USDT.
//     4. Verify on Etherscan/BscScan/etc. via their /api?module=contract API.
//   Tron:
//     1. Use TronWeb to build TRC-20 contract; broadcast via TronGrid.
//     2. Verify via TronScan API.
//   Solana:
//     1. spl-token create-mint via Solana Web3.js + Metaplex metadata.
// ---------------------------------------------------------------------------

export async function deployToken(payload) {
  await sleep(900)
  return {
    ok: true,
    chain: payload.chain,
    contractAddress: '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'),
    txHash: '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0'),
    explorerUrl: '#',
    deployedAt: new Date().toISOString(),
    note: 'MOCK DEPLOY — wire Alchemy/TronGrid/Solana RPC to enable real broadcast.',
  }
}

// ---------------------------------------------------------------------------
// TOKEN STUDIO — whitepaper + landing + exchange listing pack
// ---------------------------------------------------------------------------
// These are template generators. In production you'd:
//   - Render whitepaper to PDF via puppeteer/pdfkit on the server.
//   - Push landing page to its own subdomain via Netlify/Vercel deploy hook.
//   - Submit listing forms via the exchange's REST API where available
//     (CoinGecko: form, CoinMarketCap: form, Gate/MEXC/KuCoin: partner API).
// ---------------------------------------------------------------------------

export function generateWhitepaper(t) {
  const supplyFmt = Number(t.totalSupply || 0).toLocaleString('en-US')
  return `# ${t.name} (${t.symbol}) — Whitepaper v0.1

> Generated by Forge Token Studio. Replace placeholders before publishing.
> Have a regulated counsel review every claim that touches yield, custody,
> or jurisdiction before you publish or pitch this document.

## 1. Abstract
${t.description || `${t.name} is a ${t.standard} token deployed on ${t.chain}. This document describes its design, supply mechanics, and governance.`}

## 2. Token specification
- **Name**: ${t.name}
- **Symbol**: ${t.symbol}
- **Standard**: ${t.standard}
- **Chain**: ${t.chain}
- **Decimals**: ${t.decimals}
- **Total supply**: ${supplyFmt} ${t.symbol}
- **Mintable**: ${t.mintable ? 'Yes (owner-only)' : 'No (fixed supply)'}
- **Burnable**: ${t.burnable ? 'Yes' : 'No'}
- **Pausable**: ${t.pausable ? 'Yes (owner-only)' : 'No'}
- **Permissioned transfers (allowlist)**: ${t.permissioned ? 'Yes' : 'No'}

## 3. Distribution
- Public sale: <to be defined>
- Treasury: <to be defined>
- Team & advisors (vesting): <to be defined>
- Liquidity provisioning: <to be defined>
- Ecosystem incentives: <to be defined>

## 4. Smart contract architecture
${t.symbol} extends OpenZeppelin's audited ERC-20 implementation with the
selected modules (${[t.mintable && 'Mintable', t.burnable && 'Burnable', t.pausable && 'Pausable', t.permissioned && 'AccessControl allowlist'].filter(Boolean).join(', ') || 'standard ERC-20'}).
Source code is published at deploy time and verified on the chain explorer.

## 5. Governance
${t.governance || 'Owner key held by the issuer multisig (3-of-5). On-chain governance is out of scope for v0.1.'}

## 6. Security
- Static analysis: Slither, Mythril (CI).
- Audit: <auditor TBD — recommended Trail of Bits, OpenZeppelin, Halborn>.
- Bug bounty: <Immunefi tier TBD>.

## 7. Compliance
- Token is **${t.security ? 'a security' : 'not a security'}** in the issuer's view; final classification belongs to a regulated counsel.
- KYC for primary issuance: ${t.kyc ? 'Yes (Sumsub/Onfido)' : 'No (utility distribution only)'}.
- Travel Rule: ${t.travelRule ? 'Notabene integration on transfers ≥ €1,000' : 'N/A'}.

## 8. Roadmap
- Q1: Audit, mainnet deploy on ${t.chain}.
- Q2: Liquidity bootstrap, CEX listings.
- Q3: Cross-chain bridge to ${t.bridgeTo || '<chain TBD>'}.
- Q4: Governance handover.

## 9. Risk factors
Token holders bear smart contract risk, market risk, regulatory risk, and
counterparty risk on issuer custody. Past performance of comparable tokens
is not indicative of future results. This document is informational only and
is not an offer to sell securities.

---
*Generated ${new Date().toISOString().slice(0, 10)} by Forge Token Studio.*
`
}

export function generateLanding(t) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${t.name} (${t.symbol})</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font: 16px/1.55 ui-sans-serif, system-ui, Inter, Arial; background: #08090c; color: #e7eaf0; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 64px 24px; }
  h1 { font-size: clamp(2rem, 5vw, 3.4rem); margin: 0 0 12px; letter-spacing: -.01em; }
  h2 { margin-top: 36px; }
  .sub { color: #9aa3b2; max-width: 640px; }
  .pill { display: inline-block; padding: 4px 12px; border: 1px solid #34404f; border-radius: 999px; font-size: .8rem; color: #5cf2c8; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 24px; }
  .card { border: 1px solid #232936; border-radius: 12px; padding: 16px 18px; background: #11141a; }
  .card b { color: #5cf2c8; display: block; font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 6px; }
  .cta { display: inline-block; margin-top: 20px; padding: 12px 22px; background: #5cf2c8; color: #001a14; border-radius: 10px; font-weight: 600; text-decoration: none; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo; background: rgba(255,255,255,.06); padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
<div class="wrap">
  <span class="pill">${t.standard} on ${t.chain}</span>
  <h1>${t.name} <small style="color:#9aa3b2">(${t.symbol})</small></h1>
  <p class="sub">${t.description || `${t.symbol} is the native token of ${t.name}. Replace this paragraph with your value proposition.`}</p>
  <a class="cta" href="#buy">Get ${t.symbol}</a>

  <div class="grid">
    <div class="card"><b>Supply</b>${Number(t.totalSupply || 0).toLocaleString('en-US')}</div>
    <div class="card"><b>Decimals</b>${t.decimals}</div>
    <div class="card"><b>Mintable</b>${t.mintable ? 'Yes' : 'No'}</div>
    <div class="card"><b>Burnable</b>${t.burnable ? 'Yes' : 'No'}</div>
    <div class="card"><b>Pausable</b>${t.pausable ? 'Yes' : 'No'}</div>
    <div class="card"><b>Contract</b><code>${t.contractAddress || 'pending deploy'}</code></div>
  </div>

  <h2>Why ${t.symbol}</h2>
  <ul>
    <li>Audited OpenZeppelin base; source verified on the chain explorer.</li>
    <li>Multisig-controlled owner; transparent on-chain governance log.</li>
    <li>Liquidity on launch via ${t.dex || 'Uniswap V3'}; CEX listings to follow.</li>
  </ul>

  <h2>Roadmap</h2>
  <ol>
    <li>Audit + bug bounty.</li>
    <li>Mainnet deploy on ${t.chain}.</li>
    <li>DEX listing + initial liquidity.</li>
    <li>CEX listings (CMC, CG, then tier-2 exchanges).</li>
  </ol>

  <h2>Disclaimers</h2>
  <p style="color:#6b7280; font-size:.86rem">${t.symbol} is informational only. Token classification, suitability, and offering jurisdiction are subject to regulated legal review. Buying ${t.symbol} carries market and smart-contract risk; only buy what you can afford to lose.</p>
</div>
</body>
</html>
`
}

export function generateExchangePack(t) {
  // What every CEX/aggregator asks for. Real submission goes via:
  //   CoinGecko:    https://www.coingecko.com/en/coins/new
  //   CoinMarketCap: https://coinmarketcap.com/request/
  //   Gate.io:      partner application portal (gate.io/listing)
  //   MEXC:         https://www.mexc.com/support/articles/360000254192
  //   KuCoin:       https://www.kucoin.com/listingapplication
  return {
    summary: `${t.name} (${t.symbol}) — listing application package`,
    fields: [
      { k: 'Project name', v: t.name },
      { k: 'Token symbol', v: t.symbol },
      { k: 'Token standard', v: t.standard },
      { k: 'Primary chain', v: t.chain },
      { k: 'Contract address', v: t.contractAddress || '(pending deploy)' },
      { k: 'Total supply', v: Number(t.totalSupply || 0).toLocaleString('en-US') },
      { k: 'Circulating supply (initial)', v: t.circulatingInitial || '(define)' },
      { k: 'Decimals', v: t.decimals },
      { k: 'Whitepaper URL', v: '(host PDF + paste URL)' },
      { k: 'Project website', v: '(landing URL)' },
      { k: 'Logo (PNG 200x200, transparent)', v: t.icon ? 'attached' : '(missing)' },
      { k: 'Audit report URL', v: '(Trail of Bits / OpenZeppelin / Halborn URL)' },
      { k: 'KYC of founders', v: '(Assure DeFi / Solidproof badge URL)' },
      { k: 'Liquidity provisioning', v: '(DEX pool, initial USD value, lock duration)' },
      { k: 'Market makers', v: '(Wintermute / GSR / Flowdesk / DWF)' },
      { k: 'Github / source verified', v: '(repo + verified on explorer)' },
      { k: 'Telegram / Discord / X', v: '(community links)' },
      { k: 'Legal opinion', v: '(law firm + jurisdiction)' },
      { k: 'Restricted geographies', v: t.restrictedGeos || 'US, UK, sanctioned jurisdictions' },
    ],
    targets: [
      { exchange: 'CoinMarketCap (aggregator)', fee: 'Free', sla: '2–8 weeks', url: 'https://coinmarketcap.com/request/' },
      { exchange: 'CoinGecko (aggregator)',     fee: 'Free', sla: '1–4 weeks', url: 'https://www.coingecko.com/en/coins/new' },
      { exchange: 'Uniswap V3 (DEX)',           fee: 'Pool gas only', sla: 'Instant', url: 'https://app.uniswap.org/pool' },
      { exchange: 'PancakeSwap (BSC DEX)',      fee: 'Pool gas only', sla: 'Instant', url: 'https://pancakeswap.finance/' },
      { exchange: 'MEXC',                       fee: '$15k–50k + market making', sla: '2–6 weeks', url: 'https://www.mexc.com/support/articles/360000254192' },
      { exchange: 'Gate.io',                    fee: '$30k–100k + MM', sla: '4–8 weeks', url: 'https://www.gate.io/help/global/list-application' },
      { exchange: 'KuCoin',                     fee: '$50k–250k + MM', sla: '4–10 weeks', url: 'https://www.kucoin.com/listingapplication' },
      { exchange: 'Bitget',                     fee: '$30k–80k + MM', sla: '3–8 weeks', url: 'https://www.bitget.com/' },
      { exchange: 'Bybit',                      fee: 'Negotiated', sla: '4–10 weeks', url: 'https://www.bybit.com/' },
      { exchange: 'Binance (tier-1)',           fee: 'Negotiated, performance-based', sla: '6–18 months', url: 'https://www.binance.com/en/my/coin-applications' },
    ],
  }
}

// ---------------------------------------------------------------------------
// REFERENCE / EDUCATIONAL CONTENT
// ---------------------------------------------------------------------------
// Original "RWA done legally" comparison data, kept on purpose so the
// Reference tab can keep working as anti-fraud material.
// ---------------------------------------------------------------------------

export async function getReferenceProjects() {
  await sleep(250)
  return [
    {
      name: 'Ondo OUSG / USDY',
      asset: 'Tokenized US Treasuries (BlackRock BUIDL / short-T-Bill ETFs)',
      chain: 'Ethereum + Solana + Polygon',
      custodian: 'Coinbase Custody / Clear Street / NAV Consulting',
      auditor: 'Ankura (admin), Big-4 audited fund vehicle',
      proofOfReserve: 'Chainlink PoR + monthly transparency report',
      yield: '~4.5–5.2% APY',
      regulatory: 'Reg D / Reg S, qualified purchasers',
      url: 'ondo.finance',
    },
    {
      name: 'Backed.fi (bIB01, bC3M, bHIGH)',
      asset: 'ETF-tracking tokens (iShares treasury / corporate bond ETFs)',
      chain: 'Ethereum, Base, Gnosis, Avalanche',
      custodian: 'InCore Bank (CH) / regulated SPV per series',
      auditor: 'Network Firm (audit), MME (legal)',
      proofOfReserve: 'Chainlink PoR live feed + daily NAV',
      yield: 'Tracks underlying ETF (≈4.5–5.5%)',
      regulatory: 'Liechtenstein TVTG token issuer',
      url: 'backed.fi',
    },
    {
      name: 'Matrixdock STBT',
      asset: 'Short-term US Treasury Bills + reverse repos',
      chain: 'Ethereum',
      custodian: 'Standard regulated custodian (Matrixport group)',
      auditor: 'Moore Stephens (PwC network)',
      proofOfReserve: 'Daily attestation, on-chain dashboard',
      yield: '~5.0% APY (T-Bill yield)',
      regulatory: 'Singapore (MAS-aware), accredited only',
      url: 'matrixdock.com',
    },
    {
      name: 'Superstate USTB',
      asset: 'Short-duration US Treasuries (1940 Act fund)',
      chain: 'Ethereum',
      custodian: 'Anchorage Digital Bank (OCC chartered)',
      auditor: 'Ernst & Young',
      proofOfReserve: 'NAV published daily; SEC-registered fund',
      yield: '~4.8–5.3% APY',
      regulatory: 'SEC-registered ’40 Act fund (qualified)',
      url: 'superstate.co',
    },
    {
      name: 'Maple Finance',
      asset: 'Institutional private credit pools',
      chain: 'Ethereum, Base, Solana',
      custodian: 'BitGo / Anchorage / Copper depending on pool',
      auditor: 'Per-pool audited financials',
      proofOfReserve: 'Pool-level reporting, on-chain accounting',
      yield: '~7–10% APY (variable, with credit risk)',
      regulatory: 'Permissioned pools, KYC, accredited',
      url: 'maple.finance',
    },
    {
      name: 'Centrifuge',
      asset: 'Real-world receivables / structured credit pools',
      chain: 'Ethereum + Centrifuge Chain',
      custodian: 'Per-pool issuer SPV with regulated administrator',
      auditor: 'Per-pool audit',
      proofOfReserve: 'Pool NAV, on-chain tranches',
      yield: '~4–10% APY (varies by pool risk)',
      regulatory: 'Issuer SPV per jurisdiction, MiCA-aware',
      url: 'centrifuge.io',
    },
  ]
}

export async function getRequiredStack() {
  await sleep(200)
  return [
    {
      pillar: 'Regulated custodian',
      examples: 'Anchorage Digital Bank, Coinbase Custody, BitGo Trust, Fireblocks (with trust partner), Komainu, InCore Bank',
      whyItMatters: 'Holds the underlying asset (T-Bills, ETFs, cash) with bankruptcy-remote segregation. Without one, "collateral" is unverifiable.',
    },
    {
      pillar: 'On-chain Proof of Reserve',
      examples: 'Chainlink PoR, real-time attestation feed, daily NAV publication',
      whyItMatters: 'Anyone can verify reserves match circulating supply at any moment. No PoR → no proof.',
    },
    {
      pillar: 'Independent auditor',
      examples: 'Big-4 (PwC, EY, KPMG, Deloitte) or recognized network firm',
      whyItMatters: 'Audited financial statements of the issuer SPV and reserve fund. Self-audits do not count.',
    },
    {
      pillar: 'Legal opinion (Howey / MiCA / FSMA)',
      examples: 'Issued by a regulated law firm in the project jurisdiction',
      whyItMatters: 'Confirms whether the token is a security and which licenses are required. Filed before launch, not after.',
    },
    {
      pillar: 'KYC / AML at contract level',
      examples: 'Permissioned ERC-20 (allowlisted), on-chain Travel Rule (Notabene, Sumsub), Chainalysis screening',
      whyItMatters: 'Ensures only verified parties can hold the token; required for FATF Travel Rule compliance.',
    },
    {
      pillar: 'Transparent reserve composition',
      examples: 'Public dashboard with ISIN-level holdings, NAV, duration, counterparties',
      whyItMatters: 'Investors can independently check what backs each token. Opaque "TRN collateral" does not pass.',
    },
  ]
}

export async function getYieldBenchmarks() {
  await sleep(200)
  return [
    { label: 'US Treasury Bills (3-month)', yield: 4.3, risk: 'min' },
    { label: 'Tokenized T-Bills (Ondo, Superstate, Matrixdock)', yield: 4.8, risk: 'min' },
    { label: 'Investment-grade corporate bonds', yield: 5.5, risk: 'low' },
    { label: 'Tokenized private credit (Maple)', yield: 9, risk: 'med' },
    { label: 'High-yield crypto-native (DeFi blue-chip)', yield: 12, risk: 'high' },
    { label: 'Threshold of plausibility', yield: 15, risk: 'edge' },
    { label: '"PPP / Bullet Trading" promised yields', yield: 100, risk: 'scam' },
  ]
}

export async function getRegulatoryPathway() {
  await sleep(180)
  return [
    {
      jur: 'European Union',
      framework: 'MiCA (Title II/III) + MiFID II if security',
      cost: '€300k–1.5M',
      time: '9–18 months',
      authority: 'ESMA + national regulator (CNMV ES, BaFin DE, AMF FR, CSSF LU)',
    },
    {
      jur: 'United States',
      framework: 'SEC Reg D / Reg S (private), or full registration; CFTC if commodity',
      cost: '$500k–3M',
      time: '6–18 months (Reg D), 18+ months (full)',
      authority: 'SEC, FINRA, NYDFS (BitLicense for NY)',
    },
    {
      jur: 'United Kingdom',
      framework: 'FCA cryptoasset registration + financial promotion regime',
      cost: '£200k–800k',
      time: '6–12 months',
      authority: 'FCA',
    },
    {
      jur: 'Singapore',
      framework: 'MAS Payment Services Act / DPT license; or CMS if security',
      cost: 'S$300k–1.5M',
      time: '9–18 months',
      authority: 'MAS',
    },
    {
      jur: 'Switzerland / Liechtenstein',
      framework: 'FINMA token guidance (CH); TVTG (LI)',
      cost: 'CHF 200k–700k',
      time: '6–12 months',
      authority: 'FINMA / FMA',
    },
  ]
}

export async function getRedFlagChecklist() {
  await sleep(150)
  return [
    {
      id: 'guaranteed_returns',
      label: 'The provider "guarantees profits" or "is responsible for losses"',
      explanation: 'Illegal under MiFID II, FCA rules, SEC anti-fraud rules. No regulated entity can offer this.',
    },
    {
      id: 'apy_above_15',
      label: 'Promised APY above 15% on "institutional" / "low-risk" capital',
      explanation: 'Real institutional yields top out near risk-free + a documented spread. 15–100% is HYIP / Ponzi territory.',
    },
    {
      id: 'mt760_cash_backed',
      label: 'Talk of "MT760", "MT799", "cash-backed SWIFT", "Prime Bank Instruments"',
      explanation: 'Repeatedly flagged by ICC, FBI, Fed, SEC as fraud. These instruments do not exist as transferable yield products.',
    },
    {
      id: 'm1_to_usdt',
      label: '"Convert M1 ledger entries to USDT" or "monetize SWIFT TRN to crypto"',
      explanation: 'No banking accounting operation does this. M1 is a macro monetary aggregate, not a transferable book entry.',
    },
    {
      id: 'placeholder_bank',
      label: 'Contract names a "[Bank Host Name]" or jurisdiction as placeholder',
      explanation: 'A real agreement names an actual licensed counterparty. Placeholders mean the bank does not exist yet.',
    },
    {
      id: 'no_custodian',
      label: 'No regulated custodian named, or "Bank acts as Processor not custodian"',
      explanation: 'Without a qualified custodian holding the underlying, there is no enforceable claim on the collateral.',
    },
    {
      id: 'fake_swift_screens',
      label: 'Screenshots from a "SWIFT NET" / "Global Server" web panel',
      explanation: 'Real SWIFT terminals do not look like these. They are fabricated UIs designed to convince victims.',
    },
    {
      id: 'avoid_regulation',
      label: 'Goal stated as "avoid regulatory conditions" / "go to market faster without licenses"',
      explanation: 'Regulatory arbitrage is not a strategy; it is a delayed enforcement action.',
    },
    {
      id: 'bvi_only',
      label: 'Sole jurisdiction is BVI / Seychelles / Marshall Islands shell with no substance',
      explanation: 'Legitimate RWA issuers also have substance in a real regulator (EU, US, UK, SG, CH).',
    },
    {
      id: 'pay_first_fees',
      label: 'Up-front fees (commission, paymaster, gas, "loyalty bonus structure")',
      explanation: 'Advance-fee structure is a defining feature of HYIP / 419 / Prime Bank fraud.',
    },
    {
      id: 'no_proof_of_reserve',
      label: 'No on-chain Proof of Reserve, no public NAV, no auditor named',
      explanation: 'Without independent reserve verification, the "collateral" is whatever they say it is.',
    },
    {
      id: 'fake_tech_terms',
      label: 'Mix of unrelated tech terms ("Oracle Console", "TNT server", "Banker trigger within the Blockchain")',
      explanation: 'Fabricated jargon designed to sound technical to non-experts. Real protocols have real, googleable names.',
    },
  ]
}

// ---------------------------------------------------------------------------
// CONFIG — env vars expected when wiring real APIs
// ---------------------------------------------------------------------------

export const config = {
  alchemyKey:      import.meta.env?.VITE_ALCHEMY_API_KEY      ?? null,
  bscscanKey:      import.meta.env?.VITE_BSCSCAN_API_KEY      ?? null,
  etherscanKey:    import.meta.env?.VITE_ETHERSCAN_API_KEY    ?? null,
  basescanKey:     import.meta.env?.VITE_BASESCAN_API_KEY     ?? null,
  arbiscanKey:     import.meta.env?.VITE_ARBISCAN_API_KEY     ?? null,
  polygonscanKey:  import.meta.env?.VITE_POLYGONSCAN_API_KEY  ?? null,
  trongridKey:     import.meta.env?.VITE_TRONGRID_API_KEY     ?? null,
  solanaRpc:       import.meta.env?.VITE_SOLANA_RPC_URL       ?? null,
  coingeckoKey:    import.meta.env?.VITE_COINGECKO_API_KEY    ?? null,
  bitgoKey:        import.meta.env?.VITE_BITGO_API_KEY        ?? null,
  fireblocksKey:   import.meta.env?.VITE_FIREBLOCKS_API_KEY   ?? null,
  chainlinkPorAbi: null, // load from @chainlink/contracts when wiring
}
