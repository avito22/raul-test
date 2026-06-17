import { useMemo, useState } from 'react'
import './poker.css'
import {
  createDeck,
  shuffle,
  bestHand,
  compareHands,
  isRed,
} from './engine'
import OnlinePoker from './OnlinePoker'
import { sfx, setSoundEnabled } from './sfx'

const STARTING_CHIPS = 500
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

function makePlayers(count, mode) {
  const players = []
  for (let i = 0; i < count; i++) {
    const isHuman = mode === 'friends' ? true : i === 0
    const name =
      mode === 'friends'
        ? `Jugador ${i + 1}`
        : i === 0
        ? 'Tú'
        : BOT_NAMES[(i - 1) % BOT_NAMES.length]
    players.push({
      id: i,
      name,
      isHuman,
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
  const [mode, setMode] = useState(null)           // 'cpu' | 'friends'
  const [numPlayers, setNumPlayers] = useState(4)
  const [players, setPlayers] = useState([])
  const [board, setBoard] = useState([])           // 5 cartas comunitarias
  const [boardShown, setBoardShown] = useState(0)
  const [pot, setPot] = useState(0)
  const [phase, setPhase] = useState('mode')       // mode -> setup -> idle -> bet/fbet -> showdown
  const [message, setMessage] = useState('')
  const [reveal, setReveal] = useState(false)
  const [winners, setWinners] = useState([])
  const [slip, setSlip] = useState({})

  // Estado del modo "pase y juega"
  const [order, setOrder] = useState([])           // ids activos en orden de turno
  const [ptr, setPtr] = useState(0)                // puntero al jugador en turno
  const [currentCall, setCurrentCall] = useState(0)
  const [gate, setGate] = useState(false)          // pantalla de privacidad entre turnos
  const [sound, setSound] = useState(true)

  function toggleSound() {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
  }

  const human = players[0]
  const betTotal = CHIP_VALUES.reduce((sum, v) => sum + v * (slip[v] || 0), 0)

  const activeCount = useMemo(
    () => players.filter((p) => !p.folded).length,
    [players],
  )

  // ===================== Configuración =====================
  function chooseMode(m) {
    setMode(m)
    if (m === 'online') {
      setPhase('online')
      return
    }
    setNumPlayers(m === 'friends' ? 3 : 4)
    setPhase('setup')
  }

  function startGame() {
    setPlayers(makePlayers(numPlayers, mode))
    setBoard([])
    setBoardShown(0)
    setPhase('idle')
    setMessage(
      mode === 'friends'
        ? `Mesa de ${numPlayers} amigos. Pulsa "Repartir" para empezar.`
        : `Mesa de ${numPlayers} jugadores. Pulsa "Repartir" para empezar.`,
    )
  }

  // ===================== Reparto =====================
  function deal() {
    sfx.deal()
    const d = shuffle(createDeck())
    let idx = 0
    let potTotal = 0
    const dealt = players.map((p) => {
      if (p.chips < ANTE) {
        return { ...p, folded: true, cards: [], bet: 0, eval: null }
      }
      const cards = [d[idx], d[idx + 1]]
      idx += 2
      potTotal += ANTE
      return { ...p, cards, folded: false, bet: 0, eval: null, chips: p.chips - ANTE }
    })
    const community = d.slice(idx, idx + 5)

    setPlayers(dealt)
    setBoard(community)
    setBoardShown(3)
    setPot(potTotal)
    setReveal(false)
    setWinners([])
    setSlip({})

    if (mode === 'friends') {
      const activeOrder = dealt.filter((p) => !p.folded).map((p) => p.id)
      setOrder(activeOrder)
      setPtr(0)
      setCurrentCall(0)
      setGate(true)
      setPhase('fbet')
      setMessage('Flop sobre la mesa. Cada jugador apuesta en su turno.')
    } else {
      if ((dealt[0]?.chips ?? 0) < 0) { /* noop */ }
      setPhase('bet')
      setMessage('Flop sobre la mesa. Tienes 2 cartas. Coloca fichas y confirma, o pasa.')
    }
  }

  // ===================== Fichas =====================
  function addChip(v, maxChips) {
    const used = slip[v] || 0
    if (used >= MAX_PER_CHIP) return
    if (betTotal + v > maxChips) return
    sfx.chip()
    setSlip({ ...slip, [v]: used + 1 })
  }
  function clearSlip() {
    setSlip({})
  }

  // ===================== Modo vs máquina =====================
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
        betToCall === 0 || strength >= 1 || (strength === 0 && Math.random() < 0.4)
      if (!willCall || p.chips < betToCall) {
        return { ...p, folded: betToCall > 0 ? true : p.folded }
      }
      const pay = Math.min(betToCall, p.chips)
      added += pay
      return { ...p, chips: p.chips - pay, bet: pay }
    })
    const newPot = pot + added + base.find((p) => p.isHuman).bet
    const folded = after.filter((p) => p.folded && !p.isHuman).length
    const note = betToCall > 0 ? ` Apostaste ${betToCall}; ${folded} rival(es) se retiraron.` : ''
    resolveShowdown(after, newPot, note)
  }

  // ===================== Modo pase y juega =====================
  function revealTurn() {
    setGate(false)
  }

  function friendsAct(type) {
    const curId = order[ptr]
    let contribution = 0
    let folded = false
    let nextCall = currentCall

    if (type === 'fold') {
      folded = true
      sfx.fold()
    } else if (type === 'call') {
      contribution = Math.min(currentCall, players[curId].chips)
    } else if (type === 'check') {
      contribution = 0
    } else if (type === 'bet') {
      contribution = Math.min(betTotal, players[curId].chips)
      if (contribution > nextCall) nextCall = contribution
    }

    const updated = players.map((p) =>
      p.id === curId
        ? { ...p, folded: p.folded || folded, chips: p.chips - contribution, bet: p.bet + contribution }
        : p,
    )
    const newPot = pot + contribution

    setSlip({})

    // ¿quedan jugadores por actuar en esta ronda?
    const isLast = ptr + 1 >= order.length
    const stillIn = updated.filter((p) => order.includes(p.id) && !p.folded)

    if (isLast || stillIn.length <= 1) {
      setPlayers(updated)
      setPot(newPot)
      resolveShowdown(updated, newPot, '')
    } else {
      setPlayers(updated)
      setPot(newPot)
      setCurrentCall(nextCall)
      setPtr(ptr + 1)
      setGate(true)
    }
  }

  // ===================== Showdown (común a ambos modos) =====================
  function resolveShowdown(playerList, finalPot, extraNote) {
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
      shown++ // empate: destapa una carta comunitaria más
    }

    const share = Math.floor(finalPot / Math.max(1, winnersList.length))
    const winnerIds = new Set(winnersList.map((p) => p.id))
    const settled = evaluated.map((p) =>
      winnerIds.has(p.id) ? { ...p, chips: p.chips + share } : p,
    )

    setPlayers(settled)
    setPot(finalPot)
    setBoardShown(shown)
    setReveal(true)
    setWinners(winnersList.map((p) => p.id))
    setPhase('showdown')

    const youWon = winnerIds.has(0) && mode === 'cpu'
    if (mode === 'cpu') { if (youWon) sfx.win(); else sfx.lose() }
    else sfx.win()

    const tieSteps =
      shown === 4 ? ' Hubo empate con el flop, así que se destapó el turn.'
      : shown === 5 ? ' Hubo empates: se destaparon turn y river.'
      : ''
    const names = winnersList.map((p) => p.name).join(', ')
    let head
    if (winnersList.length > 1) {
      head = `Empate entre ${names} (${bestEval ? bestEval.name : ''}). Reparten ${share} cada uno.`
    } else if (winnerIds.has(0) && mode === 'cpu') {
      head = `¡Ganas con ${bestEval.name}! Te llevas ${finalPot} fichas.`
    } else {
      head = `Gana ${names} con ${bestEval ? bestEval.name : ''}. Bote: ${finalPot}.`
    }
    setMessage(head + extraNote + tieSteps)
  }

  function nextHand() {
    setPot(0)
    setBoard([])
    setBoardShown(0)
    setReveal(false)
    setWinners([])
    setGate(false)
    setPhase('idle')
    const someoneCanPlay = players.some((p) => p.chips >= ANTE)
    setMessage(
      someoneCanPlay
        ? 'Pulsa "Repartir" para la siguiente mano.'
        : 'Nadie tiene fichas suficientes. Pulsa "Cambiar modo".',
    )
  }

  function backToMenu() {
    setPlayers([])
    setBoard([])
    setBoardShown(0)
    setPot(0)
    setMode(null)
    setPhase('mode')
    setMessage('')
  }

  // ===================== Render: selección de modo =====================
  if (phase === 'mode') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>♠ Texas Hold'em ♥</h1></header>
        <section className="setup">
          <h2>¿Cómo quieres jugar?</h2>
          <div className="mode-grid">
            <button className="mode-card" onClick={() => chooseMode('cpu')}>
              <span className="mode-emoji">🤖</span>
              <span className="mode-title">Contra la máquina</span>
              <span className="mode-desc">Tú contra varios bots.</span>
            </button>
            <button className="mode-card" onClick={() => chooseMode('friends')}>
              <span className="mode-emoji">👥</span>
              <span className="mode-title">Con amigos (pase y juega)</span>
              <span className="mode-desc">Mismo dispositivo, por turnos.</span>
            </button>
            <button className="mode-card" onClick={() => chooseMode('online')}>
              <span className="mode-emoji">🌐</span>
              <span className="mode-title">Online</span>
              <span className="mode-desc">En tiempo real (próximamente).</span>
            </button>
          </div>
        </section>
      </div>
    )
  }

  // ===================== Render: online (P2P en tiempo real) =====================
  if (phase === 'online') {
    return <OnlinePoker onExit={backToMenu} />
  }

  // ===================== Render: elegir número de jugadores =====================
  if (phase === 'setup') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>♠ Texas Hold'em ♥</h1></header>
        <section className="setup">
          <h2>{mode === 'friends' ? '¿Cuántos amigos juegan?' : '¿Cuántos jugadores?'}</h2>
          <p className="setup-hint">
            {mode === 'friends'
              ? 'Todos juegan en este dispositivo, por turnos.'
              : `Tú contra ${numPlayers - 1} oponente(s) de la máquina.`}
          </p>
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
          <div className="bet-actions">
            <button className="btn primary big" onClick={startGame}>Empezar partida</button>
            <button className="btn ghost" onClick={backToMenu}>Cambiar modo</button>
          </div>
        </section>
      </div>
    )
  }

  // Jugador en turno (modo amigos)
  const turnPlayer = phase === 'fbet' ? players[order[ptr]] : null

  // ===================== Render: pantalla de privacidad (pase y juega) =====================
  if (phase === 'fbet' && gate) {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>♠ Texas Hold'em ♥</h1></header>
        <section className="setup">
          <h2>📱 Pasa el dispositivo a</h2>
          <p className="picker-value" style={{ fontSize: '2rem' }}>{turnPlayer?.name}</p>
          <p className="setup-hint">Que nadie más mire. Cuando estés listo, ve tus cartas.</p>
          <button className="btn primary big" onClick={revealTurn}>Ver mis cartas</button>
        </section>
      </div>
    )
  }

  const bots = players.slice(1)
  const maxChipsForTurn = mode === 'friends' ? (turnPlayer?.chips ?? 0) : (human?.chips ?? 0)

  return (
    <div className="poker-app">
      <header className="poker-header">
        <h1>♠ Texas Hold'em ♥</h1>
        <div className="stats">
          <div className="stat"><span className="label">Bote</span><span className="value">{pot}</span></div>
          <div className="stat"><span className="label">En juego</span><span className="value">{activeCount}</span></div>
          {mode === 'cpu' && (
            <div className="stat"><span className="label">Tus fichas</span><span className="value">{human?.chips ?? 0}</span></div>
          )}
          <button className="btn ghost sound-btn" onClick={toggleSound} title="Sonido">{sound ? '🔊' : '🔇'}</button>
        </div>
      </header>

      {/* Lista de jugadores */}
      <section className="opponents">
        {(mode === 'friends' ? players : bots).map((p) => {
          const isTurn = phase === 'fbet' && order[ptr] === p.id
          return (
            <div key={p.id} className={`opponent ${p.folded ? 'folded' : ''} ${winners.includes(p.id) ? 'winner' : ''} ${isTurn ? 'turn' : ''}`}>
              <div className="opp-info">
                <span className="opp-name">{p.name}</span>
                <span className="opp-chips">{p.chips} 🪙</span>
              </div>
              <div className="cards mini">
                {[0, 1].map((i) => (
                  <Card
                    key={i}
                    card={p.cards[i]}
                    hidden={p.folded || (mode === 'friends' ? !reveal : !reveal)}
                    small
                  />
                ))}
              </div>
              {p.folded ? <span className="opp-status fold">Retirado</span>
                : reveal && p.eval ? <span className="opp-status">{p.eval.name}</span>
                : isTurn ? <span className="opp-status">Su turno</span>
                : <span className="opp-status">{p.cards.length ? 'Jugando' : '—'}</span>}
            </div>
          )
        })}
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

      <div className={`outcome-banner ${winners.includes(0) && mode === 'cpu' ? 'win' : ''}`}>{message}</div>

      {/* Mano privada del jugador activo */}
      {(mode === 'cpu' || phase === 'fbet') && (
        <section className="your-hand">
          <h2>
            {mode === 'friends' ? `Cartas de ${turnPlayer?.name}` : 'Tus cartas'}
          </h2>
          <div className="cards">
            {[0, 1].map((i) => (
              <Card
                key={i}
                card={mode === 'friends' ? turnPlayer?.cards[i] : human?.cards[i]}
                hidden={mode === 'friends' ? false : !human?.cards.length}
              />
            ))}
          </div>
        </section>
      )}

      <section className="controls">
        {phase === 'idle' && (
          <>
            <button className="btn primary" onClick={deal} disabled={!players.some((p) => p.chips >= ANTE)}>Repartir (ante {ANTE})</button>
            <button className="btn ghost" onClick={backToMenu}>Cambiar modo</button>
          </>
        )}

        {/* Apuesta vs máquina */}
        {phase === 'bet' && (
          <div className="bet-panel">
            <div className="chips-row">
              {CHIP_VALUES.map((v) => {
                const used = slip[v] || 0
                const disabled = used >= MAX_PER_CHIP || betTotal + v > (human?.chips ?? 0)
                return (
                  <button key={v} type="button" className={`chip chip-${v} ${used ? 'used' : ''}`} onClick={() => addChip(v, human?.chips ?? 0)} disabled={disabled} title={`Ficha de ${v} (máx. ${MAX_PER_CHIP})`}>
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

        {/* Apuesta pase y juega */}
        {phase === 'fbet' && !gate && (
          <div className="bet-panel">
            {currentCall > 0 && (
              <div className="bet-summary">Para seguir hay que igualar <strong>{currentCall}</strong></div>
            )}
            <div className="chips-row">
              {CHIP_VALUES.map((v) => {
                const used = slip[v] || 0
                const disabled = used >= MAX_PER_CHIP || betTotal + v > maxChipsForTurn
                return (
                  <button key={v} type="button" className={`chip chip-${v} ${used ? 'used' : ''}`} onClick={() => addChip(v, maxChipsForTurn)} disabled={disabled} title={`Ficha de ${v} (máx. ${MAX_PER_CHIP})`}>
                    <span className="chip-value">{v}</span>
                    {used > 0 && <span className="chip-count">×{used}</span>}
                  </button>
                )
              })}
            </div>
            <div className="bet-summary">Tu apuesta: <strong>{betTotal}</strong></div>
            <div className="bet-actions">
              {currentCall === 0 ? (
                <>
                  <button className="btn primary" onClick={() => friendsAct('bet')} disabled={betTotal === 0}>Apostar {betTotal || ''}</button>
                  <button className="btn" onClick={() => friendsAct('check')}>Pasar</button>
                </>
              ) : (
                <>
                  <button className="btn primary" onClick={() => friendsAct('call')} disabled={(turnPlayer?.chips ?? 0) < currentCall}>Igualar {currentCall}</button>
                  <button className="btn" onClick={() => friendsAct('bet')} disabled={betTotal <= currentCall}>Subir a {betTotal || ''}</button>
                </>
              )}
              <button className="btn ghost" onClick={clearSlip} disabled={betTotal === 0}>Limpiar</button>
              <button className="btn ghost" onClick={() => friendsAct('fold')}>Retirarse</button>
            </div>
          </div>
        )}

        {phase === 'showdown' && (
          <button className="btn primary" onClick={nextHand}>Siguiente mano</button>
        )}
      </section>

      <footer className="poker-footer">
        <p>
          Texas Hold'em: 2 cartas propias + comunitarias. Flop de 3 cartas; en caso
          de empate se destapan turn y river (hasta 5) y se revelan las cartas.
          Fichas de 5/10/20/50/100 (máx. 2 de cada una por apuesta), sin tope de fichas.
          {mode === 'friends' ? ' Modo pase y juega: cada uno apuesta en su turno y pasa el dispositivo.' : ''}
        </p>
      </footer>
    </div>
  )
}
