import { useMemo, useState } from 'react'
import './poker.css'
import {
  createDeck,
  shuffle,
  evaluateHand,
  compareHands,
  aiDiscard,
  isRed,
} from './engine'

const STARTING_CHIPS = 200
const ANTE = 10
const MIN_PLAYERS = 2
const MAX_PLAYERS = 10

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

function Card({ card, hidden, held, onClick, selectable, small }) {
  if (hidden || !card) {
    return <div className={`card card-back ${small ? 'small' : ''}`} aria-label="carta oculta" />
  }
  return (
    <button
      type="button"
      className={`card ${small ? 'small' : ''} ${isRed(card.suit) ? 'red' : 'black'} ${
        held ? 'held' : ''
      } ${selectable ? 'selectable' : ''}`}
      onClick={onClick}
      disabled={!selectable}
    >
      <span className="corner top">{card.rank}{card.suit}</span>
      <span className="pip">{card.suit}</span>
      <span className="corner bottom">{card.rank}{card.suit}</span>
      {held && <span className="hold-tag">FIJA</span>}
    </button>
  )
}

export default function Poker() {
  const [numPlayers, setNumPlayers] = useState(4)
  const [players, setPlayers] = useState([])
  const [deck, setDeck] = useState([])
  const [pot, setPot] = useState(0)
  const [held, setHeld] = useState([false, false, false, false, false])
  const [phase, setPhase] = useState('setup') // setup -> bet -> draw -> showdown
  const [message, setMessage] = useState('Elige cuántos jugadores se sientan a la mesa.')
  const [reveal, setReveal] = useState(false)
  const [winners, setWinners] = useState([])

  const human = players[0]

  const activeCount = useMemo(
    () => players.filter((p) => !p.folded).length,
    [players],
  )

  // ---- Inicio de partida / nueva mano ----
  function startGame() {
    setPlayers(makePlayers(numPlayers))
    setPhase('idle')
    setMessage(`Mesa de ${numPlayers} jugadores. Pulsa "Repartir" para empezar.`)
  }

  function deal() {
    const alive = players.filter((p) => p.chips >= ANTE)
    if (!alive.find((p) => p.isHuman)) {
      setMessage('Te has quedado sin fichas. Pulsa "Reiniciar".')
      return
    }
    const d = shuffle(createDeck())
    let idx = 0
    let potTotal = 0
    const dealt = players.map((p) => {
      if (p.chips < ANTE) {
        return { ...p, folded: true, cards: [], bet: 0, eval: null }
      }
      const cards = d.slice(idx, idx + 5)
      idx += 5
      potTotal += ANTE
      return {
        ...p,
        cards,
        folded: false,
        bet: 0,
        eval: null,
        chips: p.chips - ANTE,
      }
    })
    setPlayers(dealt)
    setDeck(d.slice(idx))
    setPot(potTotal)
    setHeld([false, false, false, false, false])
    setReveal(false)
    setWinners([])
    setPhase('bet')
    setMessage(`Ante de ${ANTE} por jugador. Tu turno: apuesta o pasa.`)
  }

  // ---- Ronda de apuestas (simplificada: una decisión humana, bots responden) ----
  function humanBet(amount) {
    const me = players[0]
    const bet = Math.min(amount, me.chips)
    const updated = players.map((p) =>
      p.id === 0 ? { ...p, chips: p.chips - bet, bet } : p,
    )
    resolveBots(updated, bet)
  }

  function resolveBots(base, betToCall) {
    let added = 0
    const after = base.map((p) => {
      if (p.isHuman || p.folded) return p
      const strength = evaluateHand(p.cards).category
      // Decisión del bot: iguala si tiene mano decente o la apuesta es pequeña
      const willCall =
        betToCall === 0 ||
        strength >= 1 ||
        (strength === 0 && Math.random() < 0.35)
      if (!willCall || p.chips < betToCall) {
        return { ...p, folded: betToCall > 0 ? true : p.folded }
      }
      const pay = Math.min(betToCall, p.chips)
      added += pay
      return { ...p, chips: p.chips - pay, bet: pay }
    })
    setPlayers(after)
    setPot((pt) => pt + added + base.find((p) => p.isHuman).bet)
    setPhase('draw')
    const folded = after.filter((p) => p.folded && !p.isHuman).length
    setMessage(
      betToCall > 0
        ? `Apostaste ${betToCall}. ${folded} rival(es) se retiraron. Cambia tus cartas.`
        : 'Pasaste. Selecciona las cartas a conservar y pulsa "Cambiar".',
    )
  }

  // ---- Cambio de cartas ----
  function toggleHold(i) {
    if (phase !== 'draw') return
    setHeld((h) => h.map((v, idx) => (idx === i ? !v : v)))
  }

  function draw() {
    // Decide qué cambia cada jugador
    const plans = players.map((p) => {
      if (p.folded) return { keep: p.cards.map(() => true) }
      if (p.isHuman) return { keep: held.slice() }
      const discard = new Set(aiDiscard(p.cards))
      return { keep: p.cards.map((_, i) => !discard.has(i)) }
    })

    // Pila de robo = mazo restante + todos los descartes, rebarajado.
    // Así nunca faltan cartas aunque haya 10 jugadores en la mesa.
    const discarded = []
    players.forEach((p, pi) => {
      if (p.folded) return
      p.cards.forEach((c, i) => {
        if (!plans[pi].keep[i]) discarded.push(c)
      })
    })
    let work = shuffle(deck.concat(discarded))

    const after = players.map((p, pi) => {
      if (p.folded) return p
      const newCards = p.cards.map((c, i) => (plans[pi].keep[i] ? c : work.shift()))
      return { ...p, cards: newCards }
    })

    // Evaluación y showdown
    const evaluated = after.map((p) =>
      p.folded ? p : { ...p, eval: evaluateHand(p.cards) },
    )
    const contenders = evaluated.filter((p) => !p.folded)
    let best = null
    for (const p of contenders) {
      if (!best || compareHands(p.eval, best.eval) > 0) best = p
    }
    const winnersList = contenders.filter(
      (p) => compareHands(p.eval, best.eval) === 0,
    )
    const share = Math.floor(pot / winnersList.length)
    const winnerIds = new Set(winnersList.map((p) => p.id))
    const settled = evaluated.map((p) =>
      winnerIds.has(p.id) ? { ...p, chips: p.chips + share } : p,
    )

    setDeck(work)
    setPlayers(settled)
    setReveal(true)
    setWinners(winnersList.map((p) => p.id))
    setPhase('showdown')

    const youWon = winnerIds.has(0)
    const names = winnersList.map((p) => p.name).join(', ')
    if (winnersList.length > 1) {
      setMessage(`Bote repartido entre ${names} (${best.eval.name}). Cada uno gana ${share}.`)
    } else if (youWon) {
      setMessage(`¡Ganas con ${best.eval.name}! Te llevas ${pot} fichas.`)
    } else {
      setMessage(`Gana ${names} con ${best.eval.name}.`)
    }
  }

  function nextHand() {
    setPot(0)
    setReveal(false)
    setWinners([])
    const humanAlive = players[0]?.chips >= ANTE
    setPhase('idle')
    setMessage(
      humanAlive
        ? 'Pulsa "Repartir" para la siguiente mano.'
        : 'Te quedaste sin fichas. Pulsa "Reiniciar".',
    )
  }

  function reset() {
    setPlayers([])
    setPot(0)
    setPhase('setup')
    setMessage('Elige cuántos jugadores se sientan a la mesa.')
  }

  // ---- Render ----
  if (phase === 'setup') {
    return (
      <div className="poker-app">
        <header className="poker-header">
          <h1>♠ Póker — 5 Cartas ♥</h1>
        </header>
        <section className="setup">
          <h2>¿Cuántos jugadores?</h2>
          <p className="setup-hint">Tú contra {numPlayers - 1} oponente(s) controlados por la máquina.</p>
          <div className="player-picker">
            <button
              className="btn round"
              onClick={() => setNumPlayers((n) => Math.max(MIN_PLAYERS, n - 1))}
            >−</button>
            <span className="picker-value">{numPlayers}</span>
            <button
              className="btn round"
              onClick={() => setNumPlayers((n) => Math.min(MAX_PLAYERS, n + 1))}
            >+</button>
          </div>
          <div className="quick-picks">
            {[2, 4, 6, 8, 10].map((n) => (
              <button
                key={n}
                className={`btn ghost ${numPlayers === n ? 'active' : ''}`}
                onClick={() => setNumPlayers(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="btn primary big" onClick={startGame}>
            Empezar partida
          </button>
        </section>
      </div>
    )
  }

  const bots = players.slice(1)

  return (
    <div className="poker-app">
      <header className="poker-header">
        <h1>♠ Póker — 5 Cartas ♥</h1>
        <div className="stats">
          <div className="stat">
            <span className="label">Tus fichas</span>
            <span className="value">{human?.chips ?? 0}</span>
          </div>
          <div className="stat">
            <span className="label">Bote</span>
            <span className="value">{pot}</span>
          </div>
          <div className="stat">
            <span className="label">En juego</span>
            <span className="value">{activeCount}</span>
          </div>
        </div>
      </header>

      <section className="opponents">
        {bots.map((p) => (
          <div
            key={p.id}
            className={`opponent ${p.folded ? 'folded' : ''} ${
              winners.includes(p.id) ? 'winner' : ''
            }`}
          >
            <div className="opp-info">
              <span className="opp-name">{p.name}</span>
              <span className="opp-chips">{p.chips} 🪙</span>
            </div>
            <div className="cards mini">
              {[0, 1, 2, 3, 4].map((i) => (
                <Card key={i} card={p.cards[i]} hidden={!reveal || p.folded} small />
              ))}
            </div>
            {p.folded ? (
              <span className="opp-status fold">Retirado</span>
            ) : reveal && p.eval ? (
              <span className="opp-status">{p.eval.name}</span>
            ) : (
              <span className="opp-status">{p.cards.length ? 'Jugando' : '—'}</span>
            )}
          </div>
        ))}
      </section>

      <div className={`outcome-banner ${winners.includes(0) ? 'win' : ''}`}>
        {message}
      </div>

      <section className={`your-hand ${winners.includes(0) ? 'winner' : ''}`}>
        <h2>
          Tu mano
          {reveal && human?.eval && <span className="hand-name"> — {human.eval.name}</span>}
        </h2>
        <div className="cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              card={human?.cards[i]}
              hidden={!human?.cards.length}
              held={held[i]}
              selectable={phase === 'draw' && !human?.folded}
              onClick={() => toggleHold(i)}
            />
          ))}
        </div>
      </section>

      <section className="controls">
        {phase === 'idle' && (
          <>
            <button className="btn primary" onClick={deal} disabled={(human?.chips ?? 0) < ANTE}>
              Repartir (ante {ANTE})
            </button>
            <button className="btn ghost" onClick={reset}>Reiniciar</button>
          </>
        )}

        {phase === 'bet' && (
          <>
            <button className="btn" onClick={() => humanBet(10)} disabled={human.chips < 10}>Apostar 10</button>
            <button className="btn" onClick={() => humanBet(25)} disabled={human.chips < 25}>Apostar 25</button>
            <button className="btn" onClick={() => humanBet(50)} disabled={human.chips < 50}>Apostar 50</button>
            <button className="btn ghost" onClick={() => humanBet(0)}>Pasar</button>
          </>
        )}

        {phase === 'draw' && (
          <button className="btn primary" onClick={draw}>Cambiar cartas</button>
        )}

        {phase === 'showdown' && (
          <button className="btn primary" onClick={nextHand}>Siguiente mano</button>
        )}
      </section>

      <footer className="poker-footer">
        <p>
          5-Card Draw para {players.length} jugadores. Conserva tus mejores cartas,
          cambia el resto y gana el bote. Los rivales apuestan, se retiran y cambian
          cartas con su propia estrategia.
        </p>
      </footer>
    </div>
  )
}
