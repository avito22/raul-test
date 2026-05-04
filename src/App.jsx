import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  getReferenceProjects,
  getRedFlagChecklist,
  getRegulatoryPathway,
  getRequiredStack,
  getYieldBenchmarks,
} from './lib/api'

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

function Pill({ children, tone = 'default' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function Section({ id, eyebrow, title, lede, children }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {lede && <p className="section-lede">{lede}</p>}
      </div>
      {children}
    </section>
  )
}

function RedFlagTest({ flags }) {
  const [checked, setChecked] = useState({})
  const score = Object.values(checked).filter(Boolean).length
  const total = flags.length

  const verdict = useMemo(() => {
    if (score === 0) return { tone: 'ok', text: 'Sin banderas marcadas — sigue verificando, pero el patrón obvio no aparece.' }
    if (score <= 2) return { tone: 'warn', text: 'Algunas banderas presentes — pide explicaciones documentadas antes de avanzar.' }
    if (score <= 5) return { tone: 'warn', text: 'Patrón sospechoso. Para hasta tener verificación independiente.' }
    return { tone: 'danger', text: 'Patrón claro de fraude. No firmes, no transfieras, no aportes wallet ni identidad.' }
  }, [score])

  return (
    <div className="redflag">
      <div className="redflag-list">
        {flags.map((f) => (
          <label key={f.id} className={`redflag-item ${checked[f.id] ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={!!checked[f.id]}
              onChange={(e) => setChecked((c) => ({ ...c, [f.id]: e.target.checked }))}
            />
            <div>
              <strong>{f.label}</strong>
              <p>{f.explanation}</p>
            </div>
          </label>
        ))}
      </div>
      <aside className={`redflag-verdict tone-${verdict.tone}`}>
        <div className="score">
          <span>Banderas marcadas</span>
          <strong>{score}<small>/{total}</small></strong>
        </div>
        <p>{verdict.text}</p>
        <ul>
          <li><b>España:</b> CNMV (chiringuitos), Policía Nacional GDT (denuncia).</li>
          <li><b>Portugal:</b> CMVM, Polícia Judiciária.</li>
          <li><b>UE general:</b> ESMA warnings register, regulador nacional.</li>
          <li><b>UK:</b> FCA Warning List (fca.org.uk/scamsmart).</li>
          <li><b>USA:</b> SEC PAUSE list, FINRA BrokerCheck, FBI IC3.</li>
        </ul>
      </aside>
    </div>
  )
}

export default function App() {
  const projects = useAsync(getReferenceProjects)
  const stack = useAsync(getRequiredStack)
  const yields = useAsync(getYieldBenchmarks)
  const reg = useAsync(getRegulatoryPathway)
  const flags = useAsync(getRedFlagChecklist)

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-bg" aria-hidden />
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">◆</span>
            <span>RWA Reference</span>
            <Pill tone="muted">comparison demo</Pill>
          </div>
          <div className="nav-links">
            <a href="#test">Red-flag test</a>
            <a href="#projects">Proyectos reales</a>
            <a href="#stack">Stack mínimo</a>
            <a href="#yields">Yields realistas</a>
            <a href="#reg">Pathway regulatorio</a>
            <a href="#cost">Coste y plazos</a>
          </div>
        </nav>

        <div className="hero-content">
          <Pill tone="accent">Educational reference · No es una promoción</Pill>
          <h1>
            Tokenización de RWA hecha bien
            <span className="hero-sub">
              Cómo se ve un proyecto legítimo de Real-World Assets — y cómo detectar
              cuándo lo que te están mostrando no lo es.
            </span>
          </h1>
          <p className="lede">
            Esta página existe para que puedas <strong>comparar</strong> el proyecto que
            te hayan presentado contra cómo trabajan los emisores de RWA reales (Ondo,
            Backed, Matrixdock, Superstate, Maple, Centrifuge). Cada sección lista los
            elementos que <em>todo</em> emisor serio expone públicamente. Si en lo que te
            enseñan faltan, ya sabes.
          </p>
          <div className="hero-cta">
            <a className="cta-primary" href="#test">→ Empieza por el test de banderas</a>
            <a className="cta-secondary" href="#projects">Ver proyectos reales</a>
          </div>
        </div>
      </header>

      <Section
        id="test"
        eyebrow="60-second self-test"
        title="¿El proyecto que te están vendiendo es RWA real o un esquema?"
        lede="Marca cada elemento que reconozcas en el material que te han enseñado. Cada bandera es un patrón documentado por reguladores (SEC, FCA, CNMV, ICC, FBI). El veredicto se actualiza en vivo."
      >
        {flags.loading ? (
          <p className="muted">Cargando checklist…</p>
        ) : (
          <RedFlagTest flags={flags.data} />
        )}
      </Section>

      <Section
        id="projects"
        eyebrow="Reference projects"
        title="Cómo se presentan los emisores de RWA reales"
        lede="Todos publican: custodio regulado nombrado, auditor independiente, mecanismo de Proof of Reserve, jurisdicción y régimen regulatorio. Si en lo tuyo no aparece la columna entera, no es RWA hecho bien."
      >
        {projects.loading ? (
          <p className="muted">Cargando proyectos…</p>
        ) : (
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Activo subyacente</th>
                  <th>Custodio</th>
                  <th>Auditor</th>
                  <th>Proof of Reserve</th>
                  <th>Yield</th>
                  <th>Régimen</th>
                </tr>
              </thead>
              <tbody>
                {projects.data.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <strong>{p.name}</strong>
                      <em className="muted small">{p.url}</em>
                    </td>
                    <td>{p.asset}</td>
                    <td>{p.custodian}</td>
                    <td>{p.auditor}</td>
                    <td>{p.proofOfReserve}</td>
                    <td className="num">{p.yield}</td>
                    <td>{p.regulatory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="footnote">
          Datos públicos publicados por cada emisor. No es promoción. Verifica en la
          web oficial antes de cualquier decisión.
        </p>
      </Section>

      <Section
        id="stack"
        eyebrow="Required stack"
        title="Los 6 pilares no negociables de un emisor RWA serio"
        lede="Cualquier proyecto que prometa tokenizar activos reales debería poder rellenar estos seis cuadros con nombres y entidades concretas. Si alguno está vago, en blanco o con marketing, no está hecho."
      >
        {stack.loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <div className="stack-grid">
            {stack.data.map((s, i) => (
              <div key={s.pillar} className="stack-card">
                <span className="stack-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.pillar}</h3>
                <p className="stack-examples"><b>Ejemplos:</b> {s.examples}</p>
                <p className="stack-why"><b>Por qué importa:</b> {s.whyItMatters}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="yields"
        eyebrow="Reality check"
        title="Yields realistas vs. promesas imposibles"
        lede="No hay magia: el yield viene del activo subyacente. Si te ofrecen 15-100% APY sobre capital institucional 'sin riesgo', el activo subyacente no existe."
      >
        {yields.loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <div className="yields">
            {yields.data.map((y) => (
              <div key={y.label} className={`yield-row risk-${y.risk}`}>
                <div className="yield-label">{y.label}</div>
                <div className="yield-bar">
                  <i style={{ width: `${Math.min(y.yield, 100)}%` }} />
                </div>
                <div className="yield-num">{y.yield}%</div>
              </div>
            ))}
          </div>
        )}
        <p className="footnote">
          Las primeras cuatro filas reflejan benchmarks observables (T-Bills, ETFs IG,
          private credit). A partir del 12-15% APY aumentas riesgo de mercado, de
          contraparte o de fraude — no hay gratis. Por encima del 15% en producto
          "institucional sin riesgo" estás en zona de scam.
        </p>
      </Section>

      <Section
        id="reg"
        eyebrow="Regulatory pathway"
        title="Lo que de verdad cuesta hacerlo legal"
        lede="No existe un atajo BVI que evite la regulación si vendes a residentes UE/USA/UK. Esto es lo que cuesta y tarda hacerlo bien — de los propios filings públicos de los proyectos que sí lo hicieron."
      >
        {reg.loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <div className="reg-grid">
            {reg.data.map((r) => (
              <div key={r.jur} className="reg-card">
                <h3>{r.jur}</h3>
                <dl>
                  <dt>Marco</dt><dd>{r.framework}</dd>
                  <dt>Coste estimado</dt><dd>{r.cost}</dd>
                  <dt>Tiempo</dt><dd>{r.time}</dd>
                  <dt>Autoridad</dt><dd>{r.authority}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="cost"
        eyebrow="Plazos honestos"
        title="4–8 semanas vs. 12–24 meses"
        lede="Una de las pistas más fuertes de que algo es scam es el time-to-market. Tokenizar activos reales rápido y barato no se puede."
      >
        <div className="compare">
          <div className="compare-col bad">
            <Pill tone="danger">Lo que prometen los esquemas</Pill>
            <ul>
              <li>4–8 semanas hasta "salir al mercado"</li>
              <li>"BVI shell, sin licencia bancaria"</li>
              <li>Sin auditor, sin Proof of Reserve</li>
              <li>Custodio = "el banco actúa como Processor, no custodian"</li>
              <li>Yield 15-100% APY desde el día 1</li>
              <li>Coste para el "Developer" en USDT por adelantado</li>
            </ul>
          </div>
          <div className="compare-col good">
            <Pill tone="ok">Lo que cuesta de verdad</Pill>
            <ul>
              <li>12–24 meses desde idea a primer mint público</li>
              <li>Legal opinion: $30k–100k antes de tocar código</li>
              <li>Onboarding con custodio regulado: 2–6 meses</li>
              <li>Auditoría smart contracts: $50k–250k (Trail of Bits, OpenZeppelin, Halborn, Spearbit)</li>
              <li>Proof of Reserve (Chainlink): integración dedicada, 1–3 meses</li>
              <li>Aplicación regulatoria: 6–18 meses según jurisdicción</li>
              <li>Capital total: $500k – $3M antes del primer dólar de yield</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section
        id="verify"
        eyebrow="Cómo verificar"
        title="Pasos concretos antes de firmar o transferir"
        lede="Si te están presentando un proyecto, esta es la lista mínima de comprobaciones independientes — cada una con la fuente oficial."
      >
        <ol className="verify-list">
          <li>
            <strong>Verifica la entidad.</strong> Busca el número de registro en el
            registro mercantil de su jurisdicción (Companies House UK, Registo Comercial
            PT, BVI FSC, etc.). Que la sociedad exista <em>no</em> implica que esté
            autorizada para servicios de inversión.
          </li>
          <li>
            <strong>Verifica la licencia.</strong> Cada regulador publica su registro:
            CNMV (es.cnmv.es), CMVM (cmvm.pt), FCA (register.fca.org.uk), BaFin, FINMA,
            MAS, SEC EDGAR. Si la licencia que dicen tener no aparece, no la tienen.
          </li>
          <li>
            <strong>Verifica el custodio.</strong> El custodio debe estar nombrado y ser
            independiente. Llámalo por un teléfono publicado en su web oficial — no por
            un contacto que te pase el proyecto.
          </li>
          <li>
            <strong>Verifica la wallet en Etherscan / BaseScan.</strong> Mira historial,
            edad, contrapartes. Pega el address en{' '}
            <code>chainabuse.com</code> y en la lista de SEC PAUSE.
          </li>
          <li>
            <strong>Busca en Google la frase exacta.</strong> Frases como "irrevocable
            cash backed swift MT103" o "Prime Bank Program" devuelven docenas de avisos
            de reguladores. Si la frase aparece en avisos de fraude, está en avisos de
            fraude por algo.
          </li>
          <li>
            <strong>Pide auditoría on-chain.</strong> Si dicen tener Proof of Reserve,
            pide la URL del feed Chainlink y la dirección del contrato. Verifica en la
            red.
          </li>
          <li>
            <strong>Consulta a un abogado <em>de tu elección</em>.</strong> No al que te
            recomiende el proyecto. Especialista en regulación financiera o crypto.
          </li>
        </ol>
      </Section>

      <footer className="footer">
        <p>
          Demo de referencia educativa. Sin afiliación con los proyectos mencionados.
          Datos tomados de fuentes públicas oficiales de cada emisor y de las webs de
          los reguladores citados. No constituye asesoramiento financiero ni legal —
          es exactamente lo que su nombre indica: una referencia para comparar.
        </p>
      </footer>
    </div>
  )
}
