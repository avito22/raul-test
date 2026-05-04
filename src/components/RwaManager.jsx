import { useEffect, useState } from 'react'
import {
  listAssetSeries,
  createAssetSeries,
  deleteAssetSeries,
  recordMintBurn,
  listLedger,
  getReserveSnapshot,
} from '../lib/api'

const STATUS_TONE = {
  active: 'ok',
  'pending-review': 'warn',
  paused: 'danger',
}

const EMPTY_SERIES = {
  ticker: '',
  name: '',
  underlying: '',
  issuerSpv: '',
  custodian: '',
  custodianAccount: '',
  auditor: '',
  legalOpinion: '',
  jurisdiction: '',
  chain: 'ethereum',
  apyTarget: '',
}

function fmtUsd(n) {
  return n?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtNum(n, max = 2) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: max })
}

export default function RwaManager() {
  const [series, setSeries] = useState([])
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(EMPTY_SERIES)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [mintAmount, setMintAmount] = useState('')

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    const [s, l] = await Promise.all([listAssetSeries(), listLedger()])
    setSeries(s)
    setLedger(l)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await createAssetSeries({
        ...draft,
        apyTarget: parseFloat(draft.apyTarget) || 0,
      })
      setDraft(EMPTY_SERIES)
      setShowForm(false)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this Asset Series? (Hardcoded demo only — no on-chain effect.)')) return
    await deleteAssetSeries(id)
    if (selectedId === id) setSelectedId(null)
    await refresh()
  }

  async function handleMintBurn(kind) {
    const amt = parseFloat(mintAmount)
    if (!amt || amt <= 0) return
    setBusy(true)
    try {
      await recordMintBurn({ seriesId: selectedId, kind, amount: amt })
      setMintAmount('')
      await refresh()
      const snap = await getReserveSnapshot(selectedId)
      setSnapshot(snap)
    } finally {
      setBusy(false)
    }
  }

  async function handleSelect(id) {
    setSelectedId(id)
    setSnapshot(null)
    if (id) {
      const snap = await getReserveSnapshot(id)
      setSnapshot(snap)
    }
  }

  const selected = series.find((s) => s.id === selectedId)
  const totalReserve = series.reduce((sum, s) => sum + s.reserveUsd, 0)
  const totalSupply = series.reduce((sum, s) => sum + s.circulatingSupply, 0)

  return (
    <div className="rwa">
      <div className="rwa-stats">
        <div className="stat-card">
          <span>Asset series</span>
          <strong>{series.length}</strong>
        </div>
        <div className="stat-card">
          <span>Total reserve (USD)</span>
          <strong>{fmtUsd(totalReserve)}</strong>
        </div>
        <div className="stat-card">
          <span>Total tokens issued</span>
          <strong>{fmtNum(totalSupply, 0)}</strong>
        </div>
        <div className="stat-card">
          <span>Coverage</span>
          <strong className="ok">{totalSupply ? ((totalReserve / totalSupply) * 100).toFixed(1) : '—'}%</strong>
        </div>
      </div>

      <div className="rwa-toolbar">
        <h3>Asset series</h3>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '× Cancel' : '+ New series'}
        </button>
      </div>

      {showForm && (
        <form className="rwa-form" onSubmit={handleCreate}>
          <div className="form-grid">
            <label>
              <span>Ticker</span>
              <input required maxLength={8} value={draft.ticker}
                onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
                placeholder="fUSTB" />
            </label>
            <label>
              <span>Display name</span>
              <input required value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Forge Short-Duration US Treasuries" />
            </label>
            <label className="full">
              <span>Underlying asset (with ISIN/CUSIP)</span>
              <input required value={draft.underlying}
                onChange={(e) => setDraft({ ...draft, underlying: e.target.value })}
                placeholder="3-month US Treasury Bills (CUSIP 912797JX5)" />
            </label>
            <label>
              <span>Issuer SPV (registered)</span>
              <input required value={draft.issuerSpv}
                onChange={(e) => setDraft({ ...draft, issuerSpv: e.target.value })}
                placeholder="Forge Treasury SPV I, Ltd." />
            </label>
            <label>
              <span>Custodian (regulated)</span>
              <input required value={draft.custodian}
                onChange={(e) => setDraft({ ...draft, custodian: e.target.value })}
                placeholder="BitGo Trust Company" />
            </label>
            <label>
              <span>Custodian account ref.</span>
              <input value={draft.custodianAccount}
                onChange={(e) => setDraft({ ...draft, custodianAccount: e.target.value })}
                placeholder="BTGT-94521" />
            </label>
            <label>
              <span>Independent auditor</span>
              <input required value={draft.auditor}
                onChange={(e) => setDraft({ ...draft, auditor: e.target.value })}
                placeholder="Ernst & Young LLP" />
            </label>
            <label>
              <span>Legal opinion (firm)</span>
              <input value={draft.legalOpinion}
                onChange={(e) => setDraft({ ...draft, legalOpinion: e.target.value })}
                placeholder="Walkers — Reg S non-security" />
            </label>
            <label>
              <span>Jurisdiction / regime</span>
              <input required value={draft.jurisdiction}
                onChange={(e) => setDraft({ ...draft, jurisdiction: e.target.value })}
                placeholder="BVI / Reg S" />
            </label>
            <label>
              <span>Deploy chain</span>
              <select value={draft.chain}
                onChange={(e) => setDraft({ ...draft, chain: e.target.value })}>
                <option value="ethereum">Ethereum</option>
                <option value="base">Base</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="avalanche">Avalanche</option>
              </select>
            </label>
            <label>
              <span>Target APY (%)</span>
              <input type="number" step="0.01" value={draft.apyTarget}
                onChange={(e) => setDraft({ ...draft, apyTarget: e.target.value })}
                placeholder="4.85" />
            </label>
          </div>
          <p className="form-note">
            Datos hardcodeados de demo. En producción este formulario llamaría a:
            (1) registro mercantil para validar el SPV, (2) API del custodio para
            confirmar la cuenta, (3) Alchemy para desplegar el ERC-20 permissioned,
            (4) wiring del feed Chainlink PoR.
          </p>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create series'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : series.length === 0 ? (
        <p className="muted">No series yet. Create one to get started.</p>
      ) : (
        <div className="rwa-grid">
          <div className="series-list">
            {series.map((s) => {
              const tone = STATUS_TONE[s.status] || 'muted'
              return (
                <div key={s.id}
                  className={`series-card ${selectedId === s.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(s.id)}>
                  <div className="series-head">
                    <div>
                      <strong>{s.ticker}</strong>
                      <em>{s.name}</em>
                    </div>
                    <span className={`pill pill-${tone}`}>{s.status}</span>
                  </div>
                  <dl className="series-meta">
                    <dt>Underlying</dt><dd>{s.underlying}</dd>
                    <dt>Custodian</dt><dd>{s.custodian}</dd>
                    <dt>Auditor</dt><dd>{s.auditor}</dd>
                    <dt>Reserve</dt><dd className="num">{fmtUsd(s.reserveUsd)}</dd>
                    <dt>Supply</dt><dd className="num">{fmtNum(s.circulatingSupply)} {s.ticker}</dd>
                    <dt>NAV / token</dt><dd className="num">${s.navPerToken?.toFixed(4)}</dd>
                    <dt>Target APY</dt><dd className="num">{s.apyTarget}%</dd>
                    <dt>Chain</dt><dd>{s.chain}</dd>
                    <dt>PoR feed</dt><dd><code>{s.porFeed}</code></dd>
                    <dt>Token</dt><dd><code>{s.tokenAddress}</code></dd>
                  </dl>
                  <div className="series-actions">
                    <button className="btn-ghost danger" onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <aside className="series-side">
            {selected ? (
              <>
                <h4>Mint / Burn — {selected.ticker}</h4>
                <p className="muted small">
                  Hooks the permissioned ERC-20 mint()/burn() once wired. Reserves
                  must move in lockstep with the custodian holdings (verified
                  against the PoR feed).
                </p>
                <div className="mb-row">
                  <input type="number" min="0" step="0.01" value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    placeholder={`Amount in ${selected.ticker}`} />
                </div>
                <div className="mb-row">
                  <button className="btn-primary" disabled={busy} onClick={() => handleMintBurn('mint')}>
                    Mint
                  </button>
                  <button className="btn-ghost" disabled={busy} onClick={() => handleMintBurn('burn')}>
                    Burn
                  </button>
                </div>

                {snapshot && (
                  <div className="snapshot">
                    <h5>PoR snapshot</h5>
                    <dl>
                      <dt>As of</dt><dd>{new Date(snapshot.asOf).toLocaleString()}</dd>
                      <dt>Reserve</dt><dd>{fmtUsd(snapshot.reserveUsd)}</dd>
                      <dt>Supply</dt><dd>{fmtNum(snapshot.circulatingSupply)}</dd>
                      <dt>Coverage</dt>
                      <dd className={snapshot.coverageRatio >= 1 ? 'ok' : 'danger'}>
                        {(snapshot.coverageRatio * 100).toFixed(2)}%
                      </dd>
                      <dt>Feed</dt><dd><code>{snapshot.feed}</code></dd>
                    </dl>
                    <p className="muted small">{snapshot.source}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">Select a series to mint, burn, or read its PoR feed.</p>
            )}
          </aside>
        </div>
      )}

      <h3 className="ledger-title">Recent activity</h3>
      {ledger.length === 0 ? (
        <p className="muted">No mint/burn events yet.</p>
      ) : (
        <table className="ledger-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Series</th>
              <th>Op</th>
              <th>Amount</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.at).toLocaleString()}</td>
                <td><strong>{e.ticker}</strong></td>
                <td>
                  <span className={`pill pill-${e.kind === 'mint' ? 'ok' : 'warn'}`}>{e.kind}</span>
                </td>
                <td className="num">{fmtNum(e.amount)}</td>
                <td><code>{e.txHash}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
