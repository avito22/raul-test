// Reference data for the "RWA done legally" comparison demo.
//
// All values are public information published by the projects themselves
// (Ondo, Backed, Matrixdock, Superstate, Maple, Centrifuge) or by their
// regulators / custodians. Numbers are approximate and for educational
// comparison only — not investment advice, not promotion.
//
// Functions are async so the UI can swap in live data later (Alchemy,
// Chainlink Proof of Reserve feeds, project APIs) without changing the UI.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Real RWA reference projects --------------------------------------------

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

// --- Required stack (what every legit RWA token must have) -------------------

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

// --- Realistic yield benchmarks ---------------------------------------------

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

// --- Regulatory pathway by jurisdiction --------------------------------------

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

// --- Red flags taken from the documents shared by the user ------------------
//
// Each flag is general enough to be a useful checklist for any project,
// but is calibrated to the patterns visible in the conversation.

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

export const config = {
  alchemyKey: import.meta.env?.VITE_ALCHEMY_API_KEY ?? null,
  chainlinkPorFeed: null,
}
