import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  config as apiConfig,
  getCollateralFeed,
  getRecentTransfers,
  getTokenStats,
} from './lib/api'

const NAMING_OPTIONS = [
  {
    id: 'CABLE',
    ticker: 'CABLE',
    tagline: 'Cable financiero entre TradFi y crypto',
    pros: [
      'Referencia histórica al "Cable" (GBP/USD) → familiar en finanzas',
      'Corto, pronunciable, sin connotación regulatoria',
      'No colisiona con stablecoins conocidos',
    ],
    cons: [
      'Existe un token "Cable" minoritario en algunas chains (verificar Base)',
      'Marca débil fuera del nicho FX',
    ],
    collisionRisk: 'medio',
    marketing: 7,
    legal: 8,
  },
  {
    id: 'SWIFT',
    ticker: 'SWGT',
    tagline: 'SWIFT GLOBAL TOKEN — el rail institucional on-chain',
    pros: [
      'Marketing potentísimo: SWIFT = transferencias internacionales',
      'Posiciona el producto como infraestructura, no como memecoin',
    ],
    cons: [
      'SWIFT es marca registrada → riesgo legal alto (cease & desist)',
      'Reguladores pueden interpretarlo como suplantación bancaria',
      'Exchanges pueden rechazar el listing por riesgo de marca',
    ],
    collisionRisk: 'alto',
    marketing: 10,
    legal: 2,
  },
  {
    id: 'AAA',
    ticker: 'AAA',
    tagline: 'Calificación máxima, colateral institucional',
    pros: [
      'Asocia a "rating AAA" → percepción de calidad/seguridad',
      'Tres letras = ticker premium, fácil de listar',
      'Sin marca registrada bloqueante',
    ],
    cons: [
      'Existen varios tokens AAA en otras chains → ambigüedad de búsqueda',
      'Reguladores pueden objetar uso del término "AAA" sin rating real',
    ],
    collisionRisk: 'medio-alto',
    marketing: 9,
    legal: 5,
  },
]

const PROGRAMS = [
  {
    name: 'PPP',
    full: 'Private Placement Program',
    description:
      'Colocación privada de tranches a inversores institucionales acreditados. El TRN entra como colateral, el token se emite contra ese respaldo.',
    yield: '15–35% APY',
  },
  {
    name: 'Bullet Trading',
    full: 'Bullet Trading Desk',
    description:
      'Operativa intradía sobre el token con liquidez profunda. Estrategias direccionales sobre el spread del colateral subyacente.',
    yield: '40–80% APY',
  },
  {
    name: 'Market Making',
    full: 'Market Making on Base DEX',
    description:
      'Provisión de liquidez en pools en Base (Aerodrome / Uniswap v4). Captura de fees + incentivos de protocolo.',
    yield: '20–60% APY',
  },
]

function Pill({ children, tone = 'default' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function Section({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((error) => !cancelled && setState({ loading: false, data: null, error }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export default function App() {
  const [model, setModel] = useState('new')
  const [selectedName, setSelectedName] = useState('CABLE')
  const [decimals, setDecimals] = useState(24)
  const [supplyExp, setSupplyExp] = useState(12)

  const stats = useAsync(getTokenStats)
  const transfers = useAsync(() => getRecentTransfers(6))
  const collateral = useAsync(getCollateralFeed)

  const selected = useMemo(
    () => NAMING_OPTIONS.find((n) => n.id === selectedName),
    [selectedName],
  )

  const supplyHuman = useMemo(() => {
    const map = {
      9: 'Mil millones (1B)',
      10: '10 mil millones',
      11: '100 mil millones',
      12: '1 Trillón (1T)',
      13: '10 Trillones',
      14: '100 Trillones',
      15: '1 Quadrillón',
    }
    return map[supplyExp] ?? `1e${supplyExp}`
  }, [supplyExp])

  const isOld = model === 'old'

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-bg" aria-hidden />
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">◆</span>
            <span>{selected.ticker}</span>
            <Pill tone="muted">v2 · reframe</Pill>
          </div>
          <div className="nav-links">
            <a href="#summary">Resumen</a>
            <a href="#naming">Naming</a>
            <a href="#bridge">Bridge</a>
            <a href="#live">Live</a>
            <a href="#programs">Programas</a>
            <a href="#factory">Factoría</a>
          </div>
        </nav>

        <div className="hero-content">
          <Pill tone="accent">Ethereum L2 · Base · BVI</Pill>
          <h1>
            {selected.ticker}
            <span className="hero-sub"> — {selected.tagline}</span>
          </h1>
          <p className="lede">
            Reformulación del proyecto <s>WIRE</s>: <strong>token sin paridad 1:1</strong>,
            sin etiqueta de stablecoin. La función central es{' '}
            <strong>tokenizar TRN como colateral</strong> y servir de puente entre
            fondos M1 institucionales y crypto en la mejor red para ello.
          </p>

          <div className="model-toggle" role="tablist" aria-label="Modelo del token">
            <button
              role="tab"
              aria-selected={isOld}
              className={isOld ? 'active' : ''}
              onClick={() => setModel('old')}
            >
              Modelo viejo · Stablecoin 1:1
            </button>
            <button
              role="tab"
              aria-selected={!isOld}
              className={!isOld ? 'active' : ''}
              onClick={() => setModel('new')}
            >
              Modelo nuevo · Token libre
            </button>
          </div>

          <div className={`model-card ${isOld ? 'old' : 'new'}`}>
            {isOld ? (
              <>
                <h3>WIRE original (stablecoin)</h3>
                <ul>
                  <li>Paridad 1:1 con USD/M1 → exige reservas auditables permanentes.</li>
                  <li>Encaje en MiCA / GENIUS Act / regs de e-money → meses/años de licencia.</li>
                  <li>Listing en CEX casi imposible sin licencia EMI o equivalente.</li>
                  <li>Time-to-market estimado: <strong>12–24 meses</strong>.</li>
                </ul>
              </>
            ) : (
              <>
                <h3>{selected.ticker} reformulado (token libre)</h3>
                <ul>
                  <li>Sin paridad 1:1 → no califica como stablecoin → fuera de MiCA Title III.</li>
                  <li>Token utility con TRN como colateral, precio de mercado.</li>
                  <li>BVI + emisión en Base = onboarding rápido, sin licencia bancaria.</li>
                  <li>Time-to-market estimado: <strong>4–8 semanas</strong>.</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </header>

      <Section id="summary" eyebrow="Resumen ejecutivo v2" title="Especificación actualizada">
        <div className="spec-grid">
          <div className="spec-row">
            <span>Nombre</span>
            <strong>{selected.ticker} — {selected.tagline}</strong>
          </div>
          <div className="spec-row">
            <span>Ticker</span>
            <code>{selected.ticker}</code>
          </div>
          <div className="spec-row">
            <span>Token secundario</span>
            <strong>TRNt (TRN Trading Token)</strong>
          </div>
          <div className="spec-row">
            <span>Blockchain</span>
            <strong>Ethereum L2 · Base</strong>
          </div>
          <div className="spec-row spec-row-wide">
            <span>Supply</span>
            <strong>{supplyHuman} ({decimals} decimales)</strong>
            <div className="sliders">
              <label>
                Decimales: <b>{decimals}</b>
                <input
                  type="range"
                  min="6"
                  max="30"
                  value={decimals}
                  onChange={(e) => setDecimals(Number(e.target.value))}
                />
              </label>
              <label>
                Supply (1e{supplyExp}): <b>{supplyHuman}</b>
                <input
                  type="range"
                  min="9"
                  max="15"
                  value={supplyExp}
                  onChange={(e) => setSupplyExp(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
          <div className="spec-row">
            <span>Target</span>
            <strong>Institucional exclusivo (no retail)</strong>
          </div>
          <div className="spec-row">
            <span>Programas</span>
            <strong>PPP · Bullet Trading · Market Making</strong>
          </div>
          <div className="spec-row">
            <span>Yield</span>
            <strong>15–100% APY (variable según programa)</strong>
          </div>
          <div className="spec-row">
            <span>Jurisdicción</span>
            <strong>BVI</strong>
          </div>
          <div className="spec-row">
            <span>Naturaleza</span>
            <strong>
              {isOld
                ? 'Stablecoin con paridad 1:1 (modelo viejo)'
                : 'Token utility sin paridad — colateralizado por TRN'}
            </strong>
          </div>
        </div>
      </Section>

      <Section
        id="naming"
        eyebrow="Naming & marketing"
        title="Tres candidatos, una decisión"
      >
        <div className="name-grid">
          {NAMING_OPTIONS.map((opt) => {
            const active = opt.id === selectedName
            return (
              <button
                key={opt.id}
                className={`name-card ${active ? 'active' : ''}`}
                onClick={() => setSelectedName(opt.id)}
                aria-pressed={active}
              >
                <div className="name-head">
                  <h3>{opt.ticker}</h3>
                  <Pill
                    tone={
                      opt.collisionRisk === 'alto'
                        ? 'danger'
                        : opt.collisionRisk === 'medio-alto'
                        ? 'warn'
                        : 'ok'
                    }
                  >
                    riesgo: {opt.collisionRisk}
                  </Pill>
                </div>
                <p className="name-tag">{opt.tagline}</p>

                <div className="bars">
                  <div>
                    <span>Marketing</span>
                    <div className="bar"><i style={{ width: `${opt.marketing * 10}%` }} /></div>
                    <em>{opt.marketing}/10</em>
                  </div>
                  <div>
                    <span>Seguridad legal</span>
                    <div className="bar"><i style={{ width: `${opt.legal * 10}%` }} /></div>
                    <em>{opt.legal}/10</em>
                  </div>
                </div>

                <details>
                  <summary>Pros / contras</summary>
                  <strong>Pros</strong>
                  <ul>{opt.pros.map((p) => <li key={p}>{p}</li>)}</ul>
                  <strong>Contras</strong>
                  <ul>{opt.cons.map((p) => <li key={p}>{p}</li>)}</ul>
                </details>
              </button>
            )
          })}
        </div>
        <p className="recommendation">
          <strong>Recomendación:</strong> <code>CABLE</code> equilibra marketing y seguridad legal.{' '}
          <code>SWIFT GLOBAL TOKEN</code> tiene techo de marketing pero choca con marca registrada.{' '}
          <code>AAA</code> es premium pero requiere disclaimer claro de "no es un rating crediticio".
        </p>
      </Section>

      <Section id="flow" eyebrow="Flujo de valor" title="De TRN a yield on-chain">
        <div className="flow">
          <div className="flow-step">
            <div className="flow-num">1</div>
            <h4>TRN / Fondos M1</h4>
            <p>Treasury notes y fondos institucionales se aportan como colateral off-chain.</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="flow-num">2</div>
            <h4>Custodia + atestación</h4>
            <p>Custodio regulado certifica el colateral. Oráculo publica el ratio en Base.</p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="flow-num">3</div>
            <h4>Mint {selected.ticker}</h4>
            <p>
              Se emiten {selected.ticker} en Base (ERC-20, {decimals} decimales). Sin paridad rígida
              — el mercado descubre el precio.
            </p>
          </div>
          <div className="flow-arrow">→</div>
          <div className="flow-step">
            <div className="flow-num">4</div>
            <h4>Programas de yield</h4>
            <p>El token entra en PPP, Bullet Trading o MM. Yield 15–100% APY al holder.</p>
          </div>
        </div>
      </Section>

      <Section
        id="bridge"
        eyebrow="Bank ↔ Crypto bridge"
        title="SWIFT GLOBAL → TRN bancario → ERC-20 en Base"
      >
        <div className="bridge">
          <div className="bridge-col bank">
            <h4>Mundo bancario</h4>
            <ul>
              <li>Bancos corresponsales emiten <b>TRN (MT760 / MT799)</b> vía SWIFT GLOBAL.</li>
              <li>Custodio en BVI recibe la atestación y la verifica.</li>
              <li>Reporte M1 → ratio de colateralización publicado por oráculo.</li>
            </ul>
            <code className="endpoint">GET /swift/trn-feed</code>
          </div>

          <div className="bridge-pipe">
            <span className="pipe-label">API gateway</span>
            <div className="pipe" />
            <span className="pipe-label">Oracle / Bridge</span>
          </div>

          <div className="bridge-col chain">
            <h4>Mundo crypto (Base L2)</h4>
            <ul>
              <li>Contrato <b>ERC-20</b> de {selected.ticker} con <b>mint/burn</b> controlado por el bridge.</li>
              <li>Estado on-chain (supply, holders, transfers) leído vía <b>Alchemy SDK</b>.</li>
              <li>El token alimenta los programas PPP / Bullet / MM.</li>
            </ul>
            <code className="endpoint">alchemy.core.getTokenSupply()</code>
          </div>
        </div>

        <div className="api-note">
          <strong>Estado de la integración:</strong>{' '}
          {apiConfig.alchemyKey
            ? <Pill tone="ok">Alchemy KEY detectada</Pill>
            : <Pill tone="warn">Datos hardcoded · falta VITE_ALCHEMY_API_KEY</Pill>}
          {' '}
          {apiConfig.bankApiUrl
            ? <Pill tone="ok">Bank API URL configurada</Pill>
            : <Pill tone="warn">Falta VITE_BANK_API_URL</Pill>}
          <p>
            La capa <code>src/lib/api.js</code> ya expone{' '}
            <code>getTokenStats()</code>, <code>getRecentTransfers()</code> y{' '}
            <code>getCollateralFeed()</code>. Sustituir el cuerpo por las llamadas
            comentadas para activar Alchemy + bank gateway sin tocar la UI.
          </p>
        </div>
      </Section>

      <Section
        id="live"
        eyebrow="Live data (mocked)"
        title={`Estado on-chain de ${selected.ticker}`}
      >
        <div className="live-grid">
          <div className="kpi">
            <span>Total supply</span>
            <strong>{stats.loading ? '…' : stats.data.totalSupply}</strong>
            <em>{stats.data?.decimals ?? decimals} decimales</em>
          </div>
          <div className="kpi">
            <span>Circulating</span>
            <strong>{stats.loading ? '…' : stats.data.circulating}</strong>
            <em>{stats.data && `${((184250 / 1000000) * 100).toFixed(2)}% del supply`}</em>
          </div>
          <div className="kpi">
            <span>Holders</span>
            <strong>{stats.loading ? '…' : stats.data.holders.toLocaleString()}</strong>
            <em>wallets institucionales</em>
          </div>
          <div className="kpi">
            <span>Precio (USD)</span>
            <strong>{stats.loading ? '…' : `$${stats.data.priceUsd.toFixed(4)}`}</strong>
            <em className={stats.data?.priceChange24h >= 0 ? 'pos' : 'neg'}>
              {stats.data && `${stats.data.priceChange24h >= 0 ? '+' : ''}${stats.data.priceChange24h}% 24h`}
            </em>
          </div>
          <div className="kpi">
            <span>Market cap</span>
            <strong>{stats.loading ? '…' : `$${stats.data.marketCap}`}</strong>
            <em>aprox.</em>
          </div>
          <div className="kpi">
            <span>Ratio colateral</span>
            <strong>{stats.loading ? '…' : `${stats.data.collateralizationRatio.toFixed(2)}x`}</strong>
            <em>colateral / circulating</em>
          </div>
        </div>

        <div className="live-cols">
          <div className="live-card">
            <h3>Últimos transfers ERC-20</h3>
            {transfers.loading ? (
              <p className="muted">Cargando desde el indexador…</p>
            ) : (
              <table className="tx-table">
                <thead>
                  <tr><th>Tx</th><th>De</th><th>A</th><th>Cantidad</th><th>Hace</th></tr>
                </thead>
                <tbody>
                  {transfers.data.map((t) => (
                    <tr key={t.hash}>
                      <td><code>{t.hash}</code></td>
                      <td>{t.from}</td>
                      <td>{t.to}</td>
                      <td className="num">{t.amount}</td>
                      <td>{t.ageMin} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="source">Fuente: Alchemy <code>getAssetTransfers</code> (mock)</p>
          </div>

          <div className="live-card">
            <h3>Feed de colaterales SWIFT GLOBAL</h3>
            {collateral.loading ? (
              <p className="muted">Sincronizando con custodio BVI…</p>
            ) : (
              <>
                <p className="muted small">
                  {collateral.data.source} · custodio: {collateral.data.custodian}<br />
                  Total colateral: <b>${collateral.data.totalCollateralUsd}</b>
                </p>
                <table className="tx-table">
                  <thead>
                    <tr><th>Ref</th><th>Banco</th><th>Instrumento</th><th>USD</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {collateral.data.items.map((c) => (
                      <tr key={c.ref}>
                        <td><code>{c.ref}</code></td>
                        <td>{c.bank}</td>
                        <td>{c.instrument}</td>
                        <td className="num">{c.amountUsd}</td>
                        <td>
                          <Pill tone={c.status === 'verified' ? 'ok' : 'warn'}>
                            {c.status}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p className="source">Fuente: bank API gateway · SWIFT GLOBAL (mock)</p>
          </div>
        </div>
      </Section>

      <Section id="programs" eyebrow="Programas" title="Cómo se genera el yield">
        <div className="program-grid">
          {PROGRAMS.map((p) => (
            <div key={p.name} className="program-card">
              <div className="program-head">
                <h3>{p.name}</h3>
                <Pill tone="accent">{p.yield}</Pill>
              </div>
              <h4>{p.full}</h4>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="factory"
        eyebrow="Visión a futuro"
        title="Factoría de tokens colateralizados"
      >
        <p className="factory-intro">
          Una vez consolidada la base de <strong>{selected.ticker}</strong>, la misma
          infraestructura permite emitir nuevos tokens con distintos TRN como colateral —
          o añadir nuevos colaterales a tokens existentes.
        </p>
        <div className="factory">
          <div className="factory-base">
            <h4>Base reutilizable</h4>
            <ul>
              <li>Contrato ERC-20 parametrizable (supply, decimales, oráculo)</li>
              <li>Módulo de custodia + atestación off-chain</li>
              <li>Adaptadores a programas (PPP / Bullet / MM)</li>
              <li>Gobernanza BVI + multisig</li>
            </ul>
          </div>
          <div className="factory-arrow">⇒</div>
          <div className="factory-children">
            <div className="child">
              <strong>{selected.ticker}-EUR</strong>
              <span>colateral: TRN denominado en EUR</span>
            </div>
            <div className="child">
              <strong>{selected.ticker}-GOLD</strong>
              <span>colateral: TRN respaldado por oro físico</span>
            </div>
            <div className="child">
              <strong>{selected.ticker}-CORP</strong>
              <span>colateral: bonos corporativos investment grade</span>
            </div>
            <div className="child more">
              <strong>+ N</strong>
              <span>cualquier TRN nuevo se enchufa como colateral</span>
            </div>
          </div>
        </div>
      </Section>

      <footer className="footer">
        <p>
          Demo conceptual · Reformulación del proyecto WIRE → <strong>{selected.ticker}</strong>.
          Esta página resume la conversación con Kimi K2.6 y la traslada a un mock interactivo
          para alineación interna. No es un white paper ni constituye asesoramiento financiero.
        </p>
      </footer>
    </div>
  )
}
