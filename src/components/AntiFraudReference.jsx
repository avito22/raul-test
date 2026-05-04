import { useEffect, useMemo, useState } from 'react'
import {
  getReferenceProjects,
  getRedFlagChecklist,
  getRegulatoryPathway,
  getRequiredStack,
  getYieldBenchmarks,
} from '../lib/api'

function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let cancelled = false
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

export default function AntiFraudReference() {
  const projects = useAsync(getReferenceProjects)
  const stack = useAsync(getRequiredStack)
  const yields = useAsync(getYieldBenchmarks)
  const reg = useAsync(getRegulatoryPathway)
  const flags = useAsync(getRedFlagChecklist)

  return (
    <div className="reference">
      <div className="reference-intro">
        <Pill tone="accent">Educational reference · No es una promoción</Pill>
        <h2>Tokenización de RWA hecha bien</h2>
        <p className="lede">
          Compara cualquier proyecto que te presenten contra cómo trabajan los
          emisores RWA reales (Ondo, Backed, Matrixdock, Superstate, Maple,
          Centrifuge). Si en lo que te enseñan faltan estos elementos, ya sabes.
        </p>
      </div>

      <Section
        id="test"
        eyebrow="60-second self-test"
        title="¿El proyecto que te están vendiendo es RWA real o un esquema?"
        lede="Marca cada elemento que reconozcas. Cada bandera es un patrón documentado por reguladores (SEC, FCA, CNMV, ICC, FBI). El veredicto se actualiza en vivo."
      >
        {flags.loading ? <p className="muted">Cargando checklist…</p> : <RedFlagTest flags={flags.data} />}
      </Section>

      <Section
        id="projects"
        eyebrow="Reference projects"
        title="Cómo se presentan los emisores de RWA reales"
        lede="Todos publican: custodio regulado nombrado, auditor independiente, mecanismo de Proof of Reserve, jurisdicción y régimen regulatorio."
      >
        {projects.loading ? <p className="muted">Cargando…</p> : (
          <div className="projects-table-wrap">
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Proyecto</th><th>Activo subyacente</th><th>Custodio</th>
                  <th>Auditor</th><th>Proof of Reserve</th><th>Yield</th><th>Régimen</th>
                </tr>
              </thead>
              <tbody>
                {projects.data.map((p) => (
                  <tr key={p.name}>
                    <td><strong>{p.name}</strong><em className="muted small">{p.url}</em></td>
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
      </Section>

      <Section
        id="stack"
        eyebrow="Required stack"
        title="Los 6 pilares no negociables de un emisor RWA serio"
        lede="Si alguno está vago, en blanco o con marketing, no está hecho."
      >
        {stack.loading ? <p className="muted">Cargando…</p> : (
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
        lede="No hay magia: el yield viene del activo subyacente."
      >
        {yields.loading ? <p className="muted">Cargando…</p> : (
          <div className="yields">
            {yields.data.map((y) => (
              <div key={y.label} className={`yield-row risk-${y.risk}`}>
                <div className="yield-label">{y.label}</div>
                <div className="yield-bar"><i style={{ width: `${Math.min(y.yield, 100)}%` }} /></div>
                <div className="yield-num">{y.yield}%</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="reg"
        eyebrow="Regulatory pathway"
        title="Lo que de verdad cuesta hacerlo legal"
        lede="No existe un atajo BVI que evite la regulación si vendes a residentes UE/USA/UK."
      >
        {reg.loading ? <p className="muted">Cargando…</p> : (
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
    </div>
  )
}
