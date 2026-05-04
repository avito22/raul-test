import { useMemo, useState } from 'react'
import {
  checkSymbolAvailability,
  deployToken,
  generateWhitepaper,
  generateLanding,
  generateExchangePack,
} from '../lib/api'
import { CHAINS, getChain, estimateDeployCost } from '../lib/chains'
import { PLAN_TIERS, getPlan, totalCost } from '../lib/pricing'

const STEPS = [
  { id: 'plan',     label: '1. Plan' },
  { id: 'chain',    label: '2. Chain' },
  { id: 'identity', label: '3. Identity' },
  { id: 'features', label: '4. Contract' },
  { id: 'brand',    label: '5. Branding' },
  { id: 'review',   label: '6. Review' },
  { id: 'deploy',   label: '7. Deploy' },
]

const EMPTY = {
  planId: 'pro',
  chainId: 'ethereum',
  extraChains: [],
  name: '',
  symbol: '',
  decimals: 18,
  totalSupply: 1_000_000,
  mintable: false,
  burnable: true,
  pausable: false,
  permissioned: false,
  description: '',
  icon: null,        // data URL
  governance: '',
  bridgeTo: '',
  dex: 'Uniswap V3',
  security: false,
  kyc: false,
  travelRule: false,
  restrictedGeos: 'US, UK, sanctioned jurisdictions',
}

function Step({ children, active }) {
  return <div className={`studio-step ${active ? 'active' : ''}`}>{children}</div>
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

export default function TokenStudio() {
  const [stepIdx, setStepIdx] = useState(0)
  const [token, setToken] = useState(EMPTY)
  const [availability, setAvailability] = useState(null)
  const [checking, setChecking] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployment, setDeployment] = useState(null)

  const plan = getPlan(token.planId)
  const chain = getChain(token.chainId)
  const gas = useMemo(() => estimateDeployCost(chain), [chain])
  const extraChains = token.extraChains.map(getChain)
  const extraGas = extraChains.reduce((sum, c) => sum + estimateDeployCost(c).usd, 0)
  const overageCount = Math.max(
    0,
    1 + token.extraChains.length - plan.chainsIncluded
  )
  const cost = totalCost(plan, gas.usd + extraGas, overageCount)

  const step = STEPS[stepIdx]

  function update(patch) {
    setToken((t) => ({ ...t, ...patch }))
  }

  async function handleCheck() {
    if (!token.symbol) return
    setChecking(true)
    const r = await checkSymbolAvailability(token.symbol)
    setAvailability(r)
    setChecking(false)
  }

  async function handleIcon(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 500_000) {
      alert('Icon must be under 500 KB. PNG 200×200 recommended.')
      return
    }
    const url = await readFile(f)
    update({ icon: url })
  }

  async function handleDeploy() {
    setDeploying(true)
    try {
      const result = await deployToken({
        ...token,
        standard: chain.standard,
        chain: chain.label,
      })
      setDeployment(result)
    } finally {
      setDeploying(false)
    }
  }

  function go(delta) {
    const next = Math.max(0, Math.min(STEPS.length - 1, stepIdx + delta))
    setStepIdx(next)
  }

  const tokenForGen = useMemo(() => ({
    ...token,
    standard: chain.standard,
    chain: chain.label,
    contractAddress: deployment?.contractAddress,
  }), [token, chain, deployment])
  const wp = useMemo(() => generateWhitepaper(tokenForGen), [tokenForGen])
  const landing = useMemo(() => generateLanding(tokenForGen), [tokenForGen])
  const pack = useMemo(() => generateExchangePack(tokenForGen), [tokenForGen])

  const canAdvance = (() => {
    if (step.id === 'identity') return token.name && token.symbol && availability?.ok
    return true
  })()

  return (
    <div className="studio">
      <ol className="studio-nav">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i === stepIdx ? 'on' : i < stepIdx ? 'done' : ''}
              onClick={() => i <= stepIdx && setStepIdx(i)}>
            {s.label}
          </li>
        ))}
      </ol>

      <Step active={step.id === 'plan'}>
        <h3>Choose a plan</h3>
        <p className="muted">
          You pay Forge in USD (fiat or USDC). Network gas is passed through and
          shown in the final review.
        </p>
        <div className="plan-grid">
          {PLAN_TIERS.map((p) => (
            <label key={p.id} className={`plan-card ${token.planId === p.id ? 'on' : ''}`}>
              <input type="radio" name="plan" checked={token.planId === p.id}
                onChange={() => update({ planId: p.id })} />
              <div className="plan-head">
                <h4>{p.label}</h4>
                <span className="plan-price">${p.price.toLocaleString()}</span>
              </div>
              <p className="plan-desc">{p.description}</p>
              <ul className="plan-features">
                <li className={p.features.contract ? 'on' : 'off'}>Smart contract deploy</li>
                <li className={p.features.verification ? 'on' : 'off'}>Source verified on explorer</li>
                <li className={p.features.icon ? 'on' : 'off'}>Token icon (PNG/SVG)</li>
                <li className={p.features.whitepaper ? 'on' : 'off'}>Whitepaper draft</li>
                <li className={p.features.landing ? 'on' : 'off'}>Landing page template</li>
                <li className={p.features.exchangePack ? 'on' : 'off'}>Exchange listing pack</li>
                <li className={p.features.kycBadge ? 'on' : 'off'}>Founder KYC badge</li>
                <li className={p.features.liquidityHelp ? 'on' : 'off'}>Liquidity bootstrap help</li>
                <li className={p.features.audit ? 'on' : 'off'}>Audit coordination</li>
              </ul>
              <p className="plan-included">Includes {p.chainsIncluded === 99 ? 'unlimited' : p.chainsIncluded} chain{p.chainsIncluded === 1 ? '' : 's'}</p>
            </label>
          ))}
        </div>
      </Step>

      <Step active={step.id === 'chain'}>
        <h3>Pick a primary chain</h3>
        <p className="muted">
          ERC-20 / BEP-20 / TRC-20 are different standards on different chains.
          Pick where you want the canonical token; you can add more chains for
          ${250} each over your plan limit.
        </p>
        <div className="chain-grid">
          {CHAINS.map((c) => {
            const est = estimateDeployCost(c)
            const isPrimary = token.chainId === c.id
            const isExtra = token.extraChains.includes(c.id)
            return (
              <div key={c.id}
                className={`chain-card ${isPrimary ? 'primary' : ''} ${isExtra ? 'extra' : ''}`}>
                <div className="chain-head" style={{ '--badge': c.badge }}>
                  <span className="chain-dot" />
                  <strong>{c.label}</strong>
                </div>
                <dl>
                  <dt>Standard</dt><dd>{c.standard}</dd>
                  <dt>Native</dt><dd>{c.native}</dd>
                  <dt>Est. deploy gas</dt>
                  <dd>{est.nativeAmount} {c.native} ≈ ${est.usd.toFixed(2)}</dd>
                </dl>
                <div className="chain-actions">
                  <button className={`btn-ghost ${isPrimary ? 'on' : ''}`}
                    onClick={() => update({
                      chainId: c.id,
                      extraChains: token.extraChains.filter((x) => x !== c.id),
                    })}>
                    {isPrimary ? '✓ Primary' : 'Set primary'}
                  </button>
                  {!isPrimary && (
                    <button className={`btn-ghost ${isExtra ? 'on' : ''}`}
                      onClick={() => update({
                        extraChains: isExtra
                          ? token.extraChains.filter((x) => x !== c.id)
                          : [...token.extraChains, c.id],
                      })}>
                      {isExtra ? '✓ Extra' : '+ Extra'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Step>

      <Step active={step.id === 'identity'}>
        <h3>Token identity</h3>
        <div className="form-grid">
          <label>
            <span>Token name</span>
            <input maxLength={40} value={token.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="My Token" />
          </label>
          <label>
            <span>Symbol (2–8 chars)</span>
            <div className="check-row">
              <input maxLength={8} value={token.symbol}
                onChange={(e) => { update({ symbol: e.target.value.toUpperCase() }); setAvailability(null) }}
                placeholder="MTK" />
              <button type="button" className="btn-ghost" disabled={checking || !token.symbol}
                onClick={handleCheck}>
                {checking ? 'Checking…' : 'Check availability'}
              </button>
            </div>
            {availability && (
              <span className={`avail ${availability.ok ? 'ok' : 'danger'}`}>
                {availability.ok ? '✓' : '✗'} {availability.reason}
              </span>
            )}
          </label>
          <label>
            <span>Decimals</span>
            <input type="number" min={0} max={18} value={token.decimals}
              onChange={(e) => update({ decimals: parseInt(e.target.value, 10) || 0 })} />
          </label>
          <label>
            <span>Total supply</span>
            <input type="number" min={1} value={token.totalSupply}
              onChange={(e) => update({ totalSupply: parseInt(e.target.value, 10) || 0 })} />
          </label>
          <label className="full">
            <span>Icon (PNG/SVG, 200×200, &lt; 500 KB)</span>
            <div className="icon-row">
              <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleIcon} />
              {token.icon && <img alt="icon preview" src={token.icon} className="icon-preview" />}
            </div>
          </label>
        </div>
      </Step>

      <Step active={step.id === 'features'}>
        <h3>Smart contract features</h3>
        <p className="muted">
          Built on audited OpenZeppelin ERC-20 modules. Each toggle adds the
          matching extension and can be reflected verbatim in the whitepaper.
        </p>
        <div className="features">
          {[
            ['mintable', 'Mintable', 'Owner can mint new supply after deploy. Useful for staking rewards or scheduled emissions.'],
            ['burnable', 'Burnable', 'Holders can burn their tokens, reducing supply.'],
            ['pausable', 'Pausable', 'Owner can pause transfers in emergencies (incident response, regulatory order).'],
            ['permissioned', 'Permissioned (allowlist)', 'Only KYC-approved addresses can hold/transfer. Required for security tokens.'],
            ['security', 'Token is a security', 'Sets compliance flags in the whitepaper and exchange pack. Get a legal opinion.'],
            ['kyc', 'KYC at primary issuance', 'Surveys buyers via Sumsub/Onfido at sale time.'],
            ['travelRule', 'Travel Rule on transfers', 'Notabene integration for transfers ≥ €1,000.'],
          ].map(([k, label, help]) => (
            <label key={k} className={`feature-row ${token[k] ? 'on' : ''}`}>
              <input type="checkbox" checked={!!token[k]}
                onChange={(e) => update({ [k]: e.target.checked })} />
              <div>
                <strong>{label}</strong>
                <p>{help}</p>
              </div>
            </label>
          ))}
        </div>
      </Step>

      <Step active={step.id === 'brand'}>
        <h3>Branding & docs</h3>
        <div className="form-grid">
          <label className="full">
            <span>One-paragraph description (used in whitepaper + landing)</span>
            <textarea rows={4} value={token.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="What is this token, who is it for, why does it exist?" />
          </label>
          <label>
            <span>Initial DEX</span>
            <select value={token.dex} onChange={(e) => update({ dex: e.target.value })}>
              <option>Uniswap V3</option>
              <option>PancakeSwap</option>
              <option>Trader Joe</option>
              <option>SunSwap</option>
              <option>Aerodrome</option>
              <option>Camelot</option>
            </select>
          </label>
          <label>
            <span>Bridge target (optional)</span>
            <input value={token.bridgeTo}
              onChange={(e) => update({ bridgeTo: e.target.value })}
              placeholder="Polygon, Base…" />
          </label>
          <label>
            <span>Governance model</span>
            <input value={token.governance}
              onChange={(e) => update({ governance: e.target.value })}
              placeholder="3-of-5 multisig + on-chain DAO from year 2" />
          </label>
          <label className="full">
            <span>Restricted geographies</span>
            <input value={token.restrictedGeos}
              onChange={(e) => update({ restrictedGeos: e.target.value })}
              placeholder="US, UK, sanctioned jurisdictions" />
          </label>
        </div>

        <details className="preview">
          <summary>Preview whitepaper draft</summary>
          <pre className="doc-preview">{wp}</pre>
          <div className="dl-row">
            <button className="btn-ghost" onClick={() => downloadText(`${token.symbol || 'token'}-whitepaper.md`, wp)}>
              ↓ Download .md
            </button>
          </div>
        </details>

        <details className="preview">
          <summary>Preview landing page (HTML)</summary>
          <pre className="doc-preview">{landing}</pre>
          <div className="dl-row">
            <button className="btn-ghost" onClick={() => downloadText(`${token.symbol || 'token'}-landing.html`, landing)}>
              ↓ Download .html
            </button>
          </div>
        </details>
      </Step>

      <Step active={step.id === 'review'}>
        <h3>Review & cost</h3>

        <div className="review-grid">
          <div className="review-card">
            <h4>Token</h4>
            <dl>
              <dt>Name</dt><dd>{token.name || <em className="muted">—</em>}</dd>
              <dt>Symbol</dt><dd>{token.symbol || <em className="muted">—</em>}</dd>
              <dt>Standard</dt><dd>{chain.standard}</dd>
              <dt>Primary chain</dt><dd>{chain.label}</dd>
              <dt>Extra chains</dt><dd>{extraChains.length ? extraChains.map((c) => c.label).join(', ') : '—'}</dd>
              <dt>Total supply</dt><dd>{Number(token.totalSupply).toLocaleString()}</dd>
              <dt>Decimals</dt><dd>{token.decimals}</dd>
              <dt>Features</dt>
              <dd>
                {[
                  token.mintable && 'Mintable',
                  token.burnable && 'Burnable',
                  token.pausable && 'Pausable',
                  token.permissioned && 'Permissioned',
                  token.security && 'Security',
                ].filter(Boolean).join(', ') || 'Standard ERC-20'}
              </dd>
            </dl>
          </div>

          <div className="review-card">
            <h4>Cost breakdown</h4>
            <dl className="cost">
              <dt>Plan ({plan.label})</dt><dd className="num">${plan.price.toLocaleString()}</dd>
              {overageCount > 0 && (
                <>
                  <dt>Extra chain overage ({overageCount} × $250)</dt>
                  <dd className="num">${(overageCount * 250).toLocaleString()}</dd>
                </>
              )}
              <dt>Network gas (primary, {chain.native})</dt>
              <dd className="num">{gas.nativeAmount} {gas.native} ≈ ${gas.usd.toFixed(2)}</dd>
              {extraChains.length > 0 && (
                <>
                  <dt>Network gas (extras)</dt>
                  <dd className="num">≈ ${extraGas.toFixed(2)}</dd>
                </>
              )}
              <dt className="total">Total payable today</dt>
              <dd className="num total">${cost.total.toLocaleString()}</dd>
            </dl>
            <p className="muted small">
              Gas estimates use mocked native USD prices. In production they're
              computed live via CoinGecko + the chain's gas oracle and refreshed
              before signing the transaction.
            </p>
          </div>
        </div>

        <div className="review-card">
          <h4>Exchange listing pack</h4>
          <p className="muted">{pack.summary}</p>
          <table className="pack-table">
            <tbody>
              {pack.fields.map((f) => (
                <tr key={f.k}>
                  <th>{f.k}</th>
                  <td>{String(f.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h5>Submission targets</h5>
          <table className="pack-table">
            <thead><tr><th>Exchange</th><th>Listing fee</th><th>SLA</th><th>Apply</th></tr></thead>
            <tbody>
              {pack.targets.map((x) => (
                <tr key={x.exchange}>
                  <td><strong>{x.exchange}</strong></td>
                  <td>{x.fee}</td>
                  <td>{x.sla}</td>
                  <td><a href={x.url} target="_blank" rel="noreferrer">Open</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Step>

      <Step active={step.id === 'deploy'}>
        <h3>Deploy</h3>
        {!deployment ? (
          <>
            <p>
              Clicking deploy will (in production) request your wallet to sign
              the create-contract transaction on <strong>{chain.label}</strong>,
              charge ${cost.total} via fiat/USDC for the platform fee, and then
              broadcast the bytecode through Alchemy / TronGrid.
            </p>
            <p className="muted">
              Right now we run a mocked deploy so you can see the full flow.
            </p>
            <button className="btn-primary big" disabled={deploying || !token.name || !token.symbol}
              onClick={handleDeploy}>
              {deploying ? 'Broadcasting…' : `Deploy ${token.symbol || 'token'} for $${cost.total.toLocaleString()}`}
            </button>
          </>
        ) : (
          <div className="deploy-result">
            <span className="pill pill-ok">Deployment complete (mock)</span>
            <h4>{token.name} ({token.symbol})</h4>
            <dl>
              <dt>Chain</dt><dd>{chain.label}</dd>
              <dt>Standard</dt><dd>{chain.standard}</dd>
              <dt>Contract</dt><dd><code>{deployment.contractAddress}</code></dd>
              <dt>Tx hash</dt><dd><code>{deployment.txHash}</code></dd>
              <dt>Deployed at</dt><dd>{new Date(deployment.deployedAt).toLocaleString()}</dd>
            </dl>
            <p className="muted small">{deployment.note}</p>
            <div className="dl-row">
              <button className="btn-ghost" onClick={() => downloadText(`${token.symbol}-whitepaper.md`, wp)}>↓ Whitepaper</button>
              <button className="btn-ghost" onClick={() => downloadText(`${token.symbol}-landing.html`, landing)}>↓ Landing HTML</button>
              <button className="btn-ghost" onClick={() => downloadText(`${token.symbol}-listing-pack.json`, JSON.stringify(pack, null, 2))}>↓ Exchange pack JSON</button>
            </div>
          </div>
        )}
      </Step>

      <div className="studio-actions">
        <button className="btn-ghost" disabled={stepIdx === 0} onClick={() => go(-1)}>← Back</button>
        <span className="muted small">
          {step.label} · {chain.standard} on {chain.label} · {plan.label} ${cost.total.toLocaleString()}
        </span>
        <button className="btn-primary" disabled={stepIdx === STEPS.length - 1 || !canAdvance}
          onClick={() => go(1)}>
          Next →
        </button>
      </div>
    </div>
  )
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
