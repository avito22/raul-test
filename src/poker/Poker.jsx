import { useMemo, useState } from 'react'
import './poker.css'
import {
  createDeck,
  shuffle,
  bestHand,
  compareHands,
  isRed,
} from './engine'

const STARTING_CHIPS = 500
const MAX_CHIPS = 1000          // tope máximo de fichas que puede acumular un jugador
const ANTE = 10
const MIN_PLAYERS = 2
const MAX_PLAYERS = 10

// Valor de las fichas y cuántas veces se puede usar cada una por apuesta
const CHIP_VALUES = [5, 10, 20, 50, 100]
const MAX_PER_CHIP = 2

const BOT_NAMES = [
  'Lucía', 'Marco', 'Sofía', 'Diego', 'Elena',
  'Hugo', 'Nora', 'Iván', 'Carla', 'Leo',
  'Vera', 'Pablo', 'Rita', 'Bruno', 'Mía',
]

function makePlayers(count) {
  const players = []
  for (let i = 0; i < count; i++) {
    players.push({
      id: i,
      name: i === 0 ? 'Tú' : BOT_NAMES[(i - 1) % BOT_NAMES.length],
      isHuman: i === 0,
      chips: STARTING_CHIPS,
      cards: [],
      folded: false,
      bet: 0,
      eval: null,
    })
  }
  return players
}

function Card({ card, hidden, small }) {
  if (hidden || !card) {
    return <div className={`card card-back ${small ? 'small' : ''}`} aria-label="carta oculta" />
  }
  return (
    <div className={`card ${small ? 'small' : ''} ${isRed(card.suit) ? 'red' : 'black'}`}>
      <span className="corner top">{card.rank}{card.suit}</span>
      <span className="pip">{card.suit}</span>
      <span className="corner bottom">{card.rank}{card.suit}</span>
    </div>
  )
}

export default function Poker() {
  const [numPlayers, setNumPlayers] = useState(4)
  const [players, setPlayers] = useState([])
  const [board, setBoard] = useState([])          // 5 cartas comunitarias predeterminadas
  const [boardShown, setBoardShown] = useState(0) // cuántas comunitarias se ven (3, 4 o 5)
  const [pot, setPot] = useState(0)
  const [phase, setPhase] = useState('setup')     // setup -> idle -> bet -> showdown
  const [message, setMessage] = useState('Elige cuántos jugadores se sientan a la mesa.')
  const [reveal, setReveal] = useState(false)      // revelar cartas de los rivales
  const [winners, setWinners] = useState([])
  const [slip, setSlip] = useState({})             // fichas colocadas en la apuesta actual

  const human = players[0]

  // Total apostado según las fichas colocadas
  const betTotal = CHIP_VALUES.reduce((sum, v) => sum + v * (slip[v] || 0), 0)

  const activeCount = useMemo(
    () => players.filter((p) => !p.folded).length,
    [players],
  )

  // ---- Inicio de partida ----
  function startGame() {
    setPlayers(makePlayers(numPlayers))
    setBoard([])
    setBoardShown(0)
    setPhase('idle')
    setMessage(`Mesa de ${numPlayers} jugadores. Pulsa "Repartir" para empezar.`)
  }

  function deal() {
    if ((human?.chips ?? 0) < ANTE) {
      setMessage('Te has quedado sin fichas. Pulsa "Reiniciar".')
      return
    }
    const d = shuffle(createDeck())
    let idx = 0
    let potTotal = 0
    // 2 cartas a cada jugador con fichas suficientes
    const dealt = players.map((p) => {
      if (p.chips < ANTE) {
        return { ...p, folded: true, cards: [], bet: 0, eval: null }
      }
      const cards = [d[idx], d[idx + 1]]
      idx += 2
      potTotal += ANTE
      return { ...p, cards, folded: false, bet: 0, eval: null, chips: p.chips - ANTE }
    })
    // 5 cartas comunitarias (se muestran 3 al principio: el flop)
    const community = d.slice(idx, idx + 5)

    setPlayers(dealt)
    setBoard(community)
    setBoardShown(3)
    setPot(potTotal)
    setReveal(false)
    setWinners([])
    setSlip({})
    setPhase('bet')
    setMessage('Flop sobre la mesa. Tienes 2 cartas. Coloca fichas y confirma, o pasa.')
  }

  // ---- Fichas de la apuesta ----
  function addChip(v) {
    const used = slip[v] || 0
    if (used >= MAX_PER_CHIP) return            // máximo 2 de cada ficha
    if (betTotal + v > (human?.chips ?? 0)) return // no más de tus fichas
    setSlip({ ...slip, [v]: used + 1 })
  }

  function clearSlip() {
    setSlip({})
  }

  // ---- Ronda de apuestas ----
  function humanBet(amount) {
    const me = players[0]
    const bet = Math.min(amount, me.chips)
    const base = players.map((p) =>
      p.id === 0 ? { ...p, chips: p.chips - bet, bet } : p,
    )
    setSlip({})
    resolveBots(base, bet)
  }

  function resolveBots(base, betToCall) {
    const flop = board.slice(0, 3)
    let added = 0
    const after = base.map((p) => {
      if (p.isHuman || p.folded) return p
      const strength = bestHand(p.cards.concat(flop)).category
      const willCall =
        betToCall === 0 ||
        strength >= 1 ||
        (strength === 0 && Math.random() < 0.4)
      if (!willCall || p.chips < betToCall) {
        return { ...p, folded: betToCall > 0 ? true : p.folded }
      }
      const pay = Math.min(betToCall, p.chips)
      added += pay
      return { ...p, chips: p.chips - pay, bet: pay }
    })
    const newPot = pot + added + base.find((p) => p.isHuman).bet
    resolveShowdown(after, newPot, betToCall)
  }

  // ---- Showdown con desempate progresivo (flop -> turn -> river) ----
  function resolveShowdown(playerList, finalPot, betToCall) {
    let shown = 3
    let winnersList = []
    let bestEval = null
    let evaluated = playerList

    while (shown <= 5) {
      const community = board.slice(0, shown)
      evaluated = playerList.map((p) =>
        p.folded ? p : { ...p, eval: bestHand(p.cards.concat(community)) },
      )
      const contenders = evaluated.filter((p) => !p.folded)
      bestEval = null
      for (const p of contenders) {
        if (!bestEval || compareHands(p.eval, bestEval) > 0) bestEval = p.eval
      }
      winnersList = contenders.filter((p) => compareHands(p.eval, bestEval) === 0)
      if (winnersList.length === 1 || shown === 5) break
      shown++ // empate: se destapa una carta comunitaria más
    }

    const share = Math.floor(finalPot / winnersList.length)
    const winnerIds = new Set(winnersList.map((p) => p.id))
    const settled = evaluated.map((p) =>
      winnerIds.has(p.id)
        ? { ...p, chips: Math.min(MAX_CHIPS, p.chips + share) }
        : p,
    )

    setPlayers(settled)
    setPot(finalPot)
    setBoardShown(shown)
    setReveal(true)
    setWinners(winnersList.map((p) => p.id))
    setPhase('showdown')

    // Mensaje
    const folded = playerList.filter((p) => p.folded && !p.isHuman).length
    const tieSteps =
      shown === 4 ? ' Hubo empate con el flop, así que se destapó el turn.'
      : shown === 5 ? ' Hubo empates: se destaparon turn y river.'
      : ''
    const names = winnersList.map((p) => p.name).join(', ')
    let head
    if (winnersList.length > 1) {
      head = `Empate definitivo entre ${names} (${bestEval.name}). Reparten ${share} cada uno.`
    } else if (winnerIds.has(0)) {
      head = `¡Ganas con ${bestEval.name}! Te llevas ${finalPot} fichas.`
    } else {
      head = `Gana ${names} con ${bestEval.name}.`
    }
    const betNote = betToCall > 0 ? ` Apostaste ${betToCall}; ${folded} rival(es) se retiraron.` : ''
    setMessage(head + betNote + tieSteps)
  }

  function nextHand() {
    setPot(0)
    setBoard([])
    setBoardShown(0)
    setReveal(false)
    setWinners([])
    setPhase('idle')
    setMessage(
      (players[0]?.chips ?? 0) >= ANTE
        ? 'Pulsa "Repartir" para la siguiente mano.'
        : 'Te quedaste sin fichas. Pulsa "Reiniciar".',
    )
  }

  function reset() {
    setPlayers([])
    setBoard([])
    setBoardShown(0)
    setPot(0)
    setPhase('setup')
    setMessage('Elige cuántos jugadores se sientan a la mesa.')
  }

  // ---- Render: setup ----
  if (phase === 'setup') {
    return (
      <div className="poker-app">
        <header className="poker-header">
          <h1>♠ Texas Hold'em ♥</h1>
        </header>
        <section className="setup">
          <h2>¿Cuántos jugadores?</h2>
          <p className="setup-hint">Tú contra {numPlayers - 1} oponente(s) de la máquina.</p>
          <div className="player-picker">
            <button className="btn round" onClick={() => setNumPlayers((n) => Math.max(MIN_PLAYERS, n - 1))}>−</button>
            <span className="picker-value">{numPlayers}</span>
            <button className="btn round" onClick={() => setNumPlayers((n) => Math.min(MAX_PLAYERS, n + 1))}>+</button>
          </div>
          <div className="quick-picks">
            {[2, 4, 6, 8, 10].map((n) => (
              <button key={n} className={`btn ghost ${numPlayers === n ? 'active' : ''}`} onClick={() => setNumPlayers(n)}>{n}</button>
            ))}
          </div>
          <button className="btn primary big" onClick={startGame}>Empezar partida</button>
        </section>
      </div>
    )
  }

  const bots = players.slice(1)

  return (
    <div className="poker-app">
      <header className="poker-header">
        <h1>♠ Texas Hold'em ♥</h1>
        <div className="stats">
          <div className="stat"><span className="label">Tus fichas</span><span className="value">{human?.chips ?? 0}</span></div>
          <div className="stat"><span className="label">Bote</span><span className="value">{pot}</span></div>
          <div className="stat"><span className="label">En juego</span><span className="value">{activeCount}</span></div>
        </div>
      </header>

      <section className="opponents">
        {bots.map((p) => (
          <div key={p.id} className={`opponent ${p.folded ? 'folded' : ''} ${winners.includes(p.id) ? 'winner' : ''}`}>
            <div className="opp-info">
              <span className="opp-name">{p.name}</span>
              <span className="opp-chips">{p.chips} 🪙</span>
            </div>
            <div className="cards mini">
              {[0, 1].map((i) => (
                <Card key={i} card={p.cards[i]} hidden={!reveal || p.folded} small />
              ))}
            </div>
            {p.folded ? <span className="opp-status fold">Retirado</span>
              : reveal && p.eval ? <span className="opp-status">{p.eval.name}</span>
              : <span className="opp-status">{p.cards.length ? 'Jugando' : '—'}</span>}
          </div>
        ))}
      </section>

      {/* Cartas comunitarias */}
      <section className="board">
        <h2 className="board-title">Cartas comunitarias</h2>
        <div className="cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={i} card={board[i]} hidden={!board.length || i >= boardShown} />
          ))}
        </div>
      </section>

      <div className={`outcome-banner ${winners.includes(0) ? 'win' : ''}`}>{message}</div>

      <section className={`your-hand ${winners.includes(0) ? 'winner' : ''}`}>
        <h2>
          Tus cartas
          {reveal && human?.eval && <span className="hand-name"> — {human.eval.name}</span>}
        </h2>
        <div className="cards">
          {[0, 1].map((i) => (
            <Card key={i} card={human?.cards[i]} hidden={!human?.cards.length} />
          ))}
        </div>
      </section>

      <section className="controls">
        {phase === 'idle' && (
          <>
            <button className="btn primary" onClick={deal} disabled={(human?.chips ?? 0) < ANTE}>Repartir (ante {ANTE})</button>
            <button className="btn ghost" onClick={reset}>Reiniciar</button>
          </>
        )}
        {phase === 'bet' && (
          <div className="bet-panel">
            <div className="chips-row">
              {CHIP_VALUES.map((v) => {
                const used = slip[v] || 0
                const disabled = used >= MAX_PER_CHIP || betTotal + v > (human?.chips ?? 0)
                return (
                  <button
                    key={v}
                    type="button"
                    className={`chip chip-${v} ${used ? 'used' : ''}`}
                    onClick={() => addChip(v)}
                    disabled={disabled}
                    title={`Ficha de ${v} (máx. ${MAX_PER_CHIP})`}
                  >
                    <span className="chip-value">{v}</span>
                    {used > 0 && <span className="chip-count">×{used}</span>}
                  </button>
                )
              })}
            </div>
            <div className="bet-summary">Apuesta: <strong>{betTotal}</strong></div>
            <div className="bet-actions">
              <button className="btn primary" onClick={() => humanBet(betTotal)} disabled={betTotal === 0}>Confirmar apuesta</button>
              <button className="btn ghost" onClick={clearSlip} disabled={betTotal === 0}>Limpiar</button>
              <button className="btn ghost" onClick={() => humanBet(0)}>Pasar / Ver</button>
            </div>
          </div>
        )}
        {phase === 'showdown' && (
          <button className="btn primary" onClick={nextHand}>Siguiente mano</button>
        )}
      </section>

      <footer className="poker-footer">
        <p>
          Texas Hold'em para {players.length} jugadores: 2 cartas propias + cartas
          comunitarias. Se reparte el flop (3 cartas); si al decidir el ganador hay
          empate, se destapa el turn y luego el river, hasta 5 cartas en la mesa.
          Apuestas con fichas de 5, 10, 20, 50 y 100 (máx. 2 de cada una por apuesta).
          Tope de {MAX_CHIPS} fichas por jugador.
        </p>
      </footer>
    </div>
  )
}
