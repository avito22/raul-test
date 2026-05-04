import { useState } from 'react'
import './App.css'
import RwaManager from './components/RwaManager'
import TokenStudio from './components/TokenStudio'
import AntiFraudReference from './components/AntiFraudReference'

const TABS = [
  { id: 'rwa',      label: 'RWA Manager',     hint: 'Issue tokens backed by real, custodied collateral' },
  { id: 'studio',   label: 'Token Studio',    hint: 'ERC-20 / BEP-20 / TRC-20 launcher with whitepaper + listing pack' },
  { id: 'reference', label: 'Reference',      hint: 'Anti-fraud checklist & RWA done legally' },
]

export default function App() {
  const [tab, setTab] = useState('rwa')
  const active = TABS.find((t) => t.id === tab) || TABS[0]

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span>Forge</span>
          <span className="pill pill-muted">tokenization platform</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id}
              className={`tab ${tab === t.id ? 'on' : ''}`}
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="app-subhead">
        <h1>{active.label}</h1>
        <p className="muted">{active.hint}</p>
      </div>

      <main className="app-main">
        {tab === 'rwa' && <RwaManager />}
        {tab === 'studio' && <TokenStudio />}
        {tab === 'reference' && <AntiFraudReference />}
      </main>

      <footer className="footer">
        <p>
          Forge — tokenization platform demo. Hardcoded data for testing; each
          API hook is marked in <code>src/lib/api.js</code> for swap-in (Alchemy,
          BscScan, TronGrid, Chainlink PoR, BitGo / Fireblocks, CoinGecko).
          Nothing here constitutes legal or financial advice.
        </p>
      </footer>
    </div>
  )
}
