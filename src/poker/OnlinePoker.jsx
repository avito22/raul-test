import { useRef, useState } from 'react'
import './poker.css'
import { createDeck, shuffle, bestHand, compareHands, isRed } from './engine'
import { hostPeer, joinPeer, randomCode } from './net'
import { sfx } from './sfx'

const STARTING_CHIPS = 500
const ANTE = 10
const CHIP_VALUES = [5, 10, 20, 50, 100]
const MAX_PER_CHIP = 2

function Card({ card, hidden, small }) {
  if (hidden || !card) {
    return <div className={`card card-back ${small ? 'small' : ''}`} />
  }
  return (
    <div className={`card ${small ? 'small' : ''} ${isRed(card.suit) ? 'red' : 'black'}`}>
      <span className="corner top">{card.rank}{card.suit}</span>
      <span className="pip">{card.suit}</span>
      <span className="corner bottom">{card.rank}{card.suit}</span>
    </div>
  )
}

export default function OnlinePoker({ onExit }) {
  const [screen, setScreen] = useState('lobbyChoice') // lobbyChoice | hostLobby | joinForm | joining | game | error
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [view, setView] = useState(null)   // snapshot que se renderiza (host y cliente)
  const [slip, setSlip] = useState({})
  const [isHost, setIsHost] = useState(false)
  const [roomPlayers, setRoomPlayers] = useState([]) // lista para la sala de espera (host)

  const peerRef = useRef(null)
  const connsRef = useRef(new Map())       // pid -> conn (solo host)
  const sendRef = useRef(null)             // función para que el cliente envíe al host
  const gameRef = useRef(null)             // estado autoritativo (solo host)
  const isHostRef = useRef(false)
  const lastPhaseRef = useRef(null)

  const betTotal = CHIP_VALUES.reduce((s, v) => s + v * (slip[v] || 0), 0)

  // ============ HOST: estado y sincronización ============
  function snapshotFor(g, pid) {
    return {
      role: 'view',
      phase: g.phase,
      pot: g.pot,
      message: g.message,
      winners: g.winners,
      currentCall: g.currentCall,
      actingPid: g.phase === 'bet' ? g.order[g.ptr] : null,
      yourPid: pid,
      board: g.board.slice(0, g.boardShown),
      players: g.players.map((p) => ({
        pid: p.pid,
        name: p.name,
        chips: p.chips,
        folded: p.folded,
        bet: p.bet,
        hasCards: p.cards.length > 0,
        cards: (g.reveal && !p.folded) || p.pid === pid ? p.cards : null,
        eval: g.reveal && !p.folded ? p.eval : null,
      })),
    }
  }

  function sync() {
    const g = gameRef.current
    if (!g) return
    setView(snapshotFor(g, 'host'))
    connsRef.current.forEach((conn, pid) => {
      try { conn.send(snapshotFor(g, pid)) } catch { /* desconectado */ }
    })
  }

  function hostStartGame() {
    const g = gameRef.current
    if (g.players.length < 2) return
    dealHost()
  }

  function dealHost() {
    sfx.deal()
    const g = gameRef.current
    const d = shuffle(createDeck())
    let idx = 0
    let pot = 0
    g.players = g.players.map((p) => {
      if (p.chips < ANTE) return { ...p, folded: true, cards: [], bet: 0, eval: null }
      const cards = [d[idx], d[idx + 1]]
      idx += 2
      pot += ANTE
      return { ...p, cards, folded: false, bet: 0, eval: null, chips: p.chips - ANTE }
    })
    g.board = d.slice(idx, idx + 5)
    g.boardShown = 3
    g.pot = pot
    g.reveal = false
    g.winners = []
    g.order = g.players.filter((p) => !p.folded).map((p) => p.pid)
    g.ptr = 0
    g.currentCall = 0
    g.phase = 'bet'
    g.message = 'Flop sobre la mesa. Apuesta en tu turno.'
    sync()
  }

  function hostApplyAction(pid, action, amount) {
    const g = gameRef.current
    if (!g || g.phase !== 'bet') return
    if (g.order[g.ptr] !== pid) return // no es su turno
    const idx = g.players.findIndex((p) => p.pid === pid)
    const p = g.players[idx]
    let contribution = 0
    let nextCall = g.currentCall

    if (action === 'fold') {
      g.players[idx] = { ...p, folded: true }
    } else if (action === 'call') {
      contribution = Math.min(g.currentCall, p.chips)
    } else if (action === 'check') {
      contribution = 0
    } else if (action === 'bet') {
      contribution = Math.min(amount, p.chips)
      if (contribution > nextCall) nextCall = contribution
    }
    if (action !== 'fold') {
      g.players[idx] = { ...p, chips: p.chips - contribution, bet: p.bet + contribution }
    }
    g.pot += contribution
    g.currentCall = nextCall

    const stillIn = g.players.filter((pl) => g.order.includes(pl.pid) && !pl.folded)
    const isLast = g.ptr + 1 >= g.order.length
    if (isLast || stillIn.length <= 1) {
      hostShowdown()
    } else {
      g.ptr += 1
      sync()
    }
  }

  function hostShowdown() {
    const g = gameRef.current
    let shown = 3
    let winnersList = []
    let bestEval = null

    while (shown <= 5) {
      const community = g.board.slice(0, shown)
      g.players = g.players.map((p) =>
        p.folded ? p : { ...p, eval: bestHand(p.cards.concat(community)) },
      )
      const contenders = g.players.filter((p) => !p.folded)
      bestEval = null
      for (const p of contenders) {
        if (!bestEval || compareHands(p.eval, bestEval) > 0) bestEval = p.eval
      }
      winnersList = contenders.filter((p) => compareHands(p.eval, bestEval) === 0)
      if (winnersList.length === 1 || shown === 5) break
      shown++
    }

    const share = Math.floor(g.pot / Math.max(1, winnersList.length))
    const winnerIds = new Set(winnersList.map((p) => p.pid))
    g.players = g.players.map((p) =>
      winnerIds.has(p.pid) ? { ...p, chips: p.chips + share } : p,
    )
    g.boardShown = shown
    g.reveal = true
    g.winners = winnersList.map((p) => p.pid)
    g.phase = 'showdown'

    const tie =
      shown === 4 ? ' Hubo empate con el flop; se destapó el turn.'
      : shown === 5 ? ' Hubo empates: se destaparon turn y river.' : ''
    const names = winnersList.map((p) => p.name).join(', ')
    g.message = winnersList.length > 1
      ? `Empate entre ${names} (${bestEval.name}). Reparten ${share} cada uno.${tie}`
      : `Gana ${names} con ${bestEval.name}. Bote: ${g.pot}.${tie}`
    if (winnerIds.has('host')) sfx.win(); else sfx.lose()
    sync()
  }

  function hostNextHand() {
    const g = gameRef.current
    g.phase = 'idle'
    g.board = []
    g.boardShown = 0
    g.pot = 0
    g.reveal = false
    g.winners = []
    g.message = g.players.some((p) => p.chips >= ANTE)
      ? 'Pulsa "Repartir" para la siguiente mano.'
      : 'Sin fichas suficientes para continuar.'
    sync()
  }

  // ============ Crear sala (host) ============
  function createRoom() {
    if (!name.trim()) { setErrorMsg('Escribe tu nombre.'); return }
    const roomCode = randomCode()
    setCode(roomCode)
    isHostRef.current = true
    setIsHost(true)
    setRoomPlayers([{ pid: 'host', name: name.trim() }])
    gameRef.current = {
      players: [{ pid: 'host', name: name.trim(), chips: STARTING_CHIPS, cards: [], folded: false, bet: 0, eval: null }],
      board: [], boardShown: 0, pot: 0, reveal: false, winners: [],
      order: [], ptr: 0, currentCall: 0, phase: 'idle',
      message: 'Esperando jugadores…',
    }
    const peer = hostPeer(roomCode, {
      onOpen: () => setScreen('hostLobby'),
      onError: (e) => { setErrorMsg('No se pudo crear la sala: ' + e.type); setScreen('error') },
      onConnect: (conn) => {
        connsRef.current.set(conn.peer, conn)
      },
      onData: (conn, data) => {
        const g = gameRef.current
        if (data.type === 'join') {
          if (!g.players.find((p) => p.pid === conn.peer)) {
            g.players.push({ pid: conn.peer, name: (data.name || 'Invitado').slice(0, 14), chips: STARTING_CHIPS, cards: [], folded: false, bet: 0, eval: null })
          }
          setRoomPlayers(g.players.map((p) => ({ pid: p.pid, name: p.name })))
          sync()
        } else if (data.type === 'action') {
          hostApplyAction(conn.peer, data.action, data.amount || 0)
        }
      },
      onClose: (conn) => {
        connsRef.current.delete(conn.peer)
        const g = gameRef.current
        if (g && g.phase === 'idle') {
          g.players = g.players.filter((p) => p.pid !== conn.peer)
          setRoomPlayers(g.players.map((p) => ({ pid: p.pid, name: p.name })))
          sync()
        }
      },
    })
    peerRef.current = peer
  }

  // ============ Unirse a sala (cliente) ============
  function joinRoom() {
    if (!name.trim()) { setErrorMsg('Escribe tu nombre.'); return }
    if (code.trim().length < 4) { setErrorMsg('Código de sala incompleto.'); return }
    setScreen('joining')
    isHostRef.current = false
    setIsHost(false)
    const { peer, getConn } = joinPeer(code.trim().toUpperCase(), {
      onOpen: (conn) => {
        sendRef.current = (obj) => conn.send(obj)
        conn.send({ type: 'join', name: name.trim() })
        setScreen('game')
      },
      onData: (data) => {
        if (data.role !== 'view') return
        if (data.phase === 'showdown' && lastPhaseRef.current !== 'showdown') {
          if (data.winners.includes(data.yourPid)) sfx.win(); else sfx.lose()
        }
        lastPhaseRef.current = data.phase
        setView(data)
      },
      onClose: () => { setErrorMsg('Se perdió la conexión con la sala.'); setScreen('error') },
      onError: (e) => { setErrorMsg('No se pudo conectar: ' + (e.type || 'error')); setScreen('error') },
    })
    peerRef.current = peer
    void getConn
  }

  // ============ Acciones del jugador local ============
  function addChip(v, maxChips) {
    const used = slip[v] || 0
    if (used >= MAX_PER_CHIP) return
    if (betTotal + v > maxChips) return
    sfx.chip()
    setSlip({ ...slip, [v]: used + 1 })
  }

  function act(action, amount) {
    setSlip({})
    if (isHostRef.current) {
      hostApplyAction('host', action, amount)
    } else if (sendRef.current) {
      sendRef.current({ type: 'action', action, amount })
    }
  }

  function startOrNext(kind) {
    if (!isHostRef.current) return
    if (kind === 'start') hostStartGame()
    else hostNextHand()
  }

  // ===================== RENDER =====================
  if (screen === 'lobbyChoice') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup">
          <h2>Jugar online en tiempo real</h2>
          <p className="setup-hint" style={{ maxWidth: 420 }}>
            Un jugador crea una sala y comparte el código; los demás se unen desde
            su propio dispositivo. (Beta P2P — funciona mejor con buena conexión.)
          </p>
          <input className="room-input" placeholder="Tu nombre" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} />
          {errorMsg && <p className="opp-status fold">{errorMsg}</p>}
          <div className="bet-actions" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={createRoom}>Crear sala</button>
            <button className="btn" onClick={() => setScreen('joinForm')}>Unirme con código</button>
            <button className="btn ghost" onClick={onExit}>Volver</button>
          </div>
        </section>
      </div>
    )
  }

  if (screen === 'joinForm') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup">
          <h2>Unirse a una sala</h2>
          <input className="room-input" placeholder="Tu nombre" value={name} maxLength={14} onChange={(e) => setName(e.target.value)} />
          <div style={{ height: 10 }} />
          <input className="room-input" placeholder="CÓDIGO" value={code} maxLength={4} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          {errorMsg && <p className="opp-status fold">{errorMsg}</p>}
          <div className="bet-actions" style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={joinRoom}>Entrar</button>
            <button className="btn ghost" onClick={() => setScreen('lobbyChoice')}>Volver</button>
          </div>
        </section>
      </div>
    )
  }

  if (screen === 'joining') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup"><h2>Conectando…</h2></section>
      </div>
    )
  }

  if (screen === 'error') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup">
          <h2>⚠️ Ups</h2>
          <p className="setup-hint">{errorMsg}</p>
          <button className="btn primary" onClick={onExit}>Volver al menú</button>
        </section>
      </div>
    )
  }

  if (screen === 'hostLobby') {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup">
          <h2>Sala creada</h2>
          <p className="setup-hint">Comparte este código con tus amigos:</p>
          <div className="room-code">{code}</div>
          <ul className="peer-list">
            {roomPlayers.map((p) => <li key={p.pid}>{p.name}{p.pid === 'host' ? ' (anfitrión)' : ''}</li>)}
          </ul>
          <p className="setup-hint">{roomPlayers.length} jugador(es) en la sala.</p>
          <div className="bet-actions">
            <button className="btn primary big" onClick={() => startOrNext('start')} disabled={roomPlayers.length < 2}>
              Empezar (mín. 2)
            </button>
            <button className="btn ghost" onClick={onExit}>Salir</button>
          </div>
        </section>
      </div>
    )
  }

  // ----- Pantalla de juego (host o cliente) desde el snapshot `view` -----
  if (!view) {
    return (
      <div className="poker-app">
        <header className="poker-header"><h1>🌐 Póker Online</h1></header>
        <section className="setup"><h2>Esperando al anfitrión…</h2></section>
      </div>
    )
  }

  const me = view.players.find((p) => p.pid === view.yourPid)
  const others = view.players.filter((p) => p.pid !== view.yourPid)
  const myTurn = view.actingPid === view.yourPid
  const maxChips = me?.chips ?? 0

  return (
    <div className="poker-app">
      <header className="poker-header">
        <h1>🌐 Póker Online</h1>
        <div className="stats">
          <div className="stat"><span className="label">Bote</span><span className="value">{view.pot}</span></div>
          <div className="stat"><span className="label">Tus fichas</span><span className="value">{me?.chips ?? 0}</span></div>
        </div>
      </header>

      <section className="opponents">
        {others.map((p) => (
          <div key={p.pid} className={`opponent ${p.folded ? 'folded' : ''} ${view.winners.includes(p.pid) ? 'winner' : ''} ${view.actingPid === p.pid ? 'turn' : ''}`}>
            <div className="opp-info">
              <span className="opp-name">{p.name}</span>
              <span className="opp-chips">{p.chips} 🪙</span>
            </div>
            <div className="cards mini">
              {[0, 1].map((i) => (
                <Card key={i} card={p.cards ? p.cards[i] : null} hidden={!p.cards || p.folded} small />
              ))}
            </div>
            {p.folded ? <span className="opp-status fold">Retirado</span>
              : p.eval ? <span className="opp-status">{p.eval.name}</span>
              : view.actingPid === p.pid ? <span className="opp-status">Su turno</span>
              : <span className="opp-status">{p.hasCards ? 'Jugando' : '—'}</span>}
          </div>
        ))}
      </section>

      <section className="board">
        <h2 className="board-title">Cartas comunitarias</h2>
        <div className="cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <Card key={i} card={view.board[i]} hidden={i >= view.board.length} />
          ))}
        </div>
      </section>

      <div className={`outcome-banner ${view.winners.includes(view.yourPid) ? 'win' : ''}`}>{view.message}</div>

      <section className="your-hand">
        <h2>Tus cartas {me?.eval && <span className="hand-name">— {me.eval.name}</span>}</h2>
        <div className="cards">
          {[0, 1].map((i) => (
            <Card key={i} card={me?.cards ? me.cards[i] : null} hidden={!me?.cards} />
          ))}
        </div>
      </section>

      <section className="controls">
        {view.phase === 'idle' && isHost && (
          <button className="btn primary" onClick={() => startOrNext('next')}>Repartir (ante {ANTE})</button>
        )}
        {view.phase === 'idle' && !isHost && (
          <p className="setup-hint">Esperando a que el anfitrión reparta…</p>
        )}

        {view.phase === 'bet' && myTurn && (
          <div className="bet-panel">
            {view.currentCall > 0 && <div className="bet-summary">Para seguir, iguala <strong>{view.currentCall}</strong></div>}
            <div className="chips-row">
              {CHIP_VALUES.map((v) => {
                const used = slip[v] || 0
                const disabled = used >= MAX_PER_CHIP || betTotal + v > maxChips
                return (
                  <button key={v} className={`chip chip-${v} ${used ? 'used' : ''}`} onClick={() => addChip(v, maxChips)} disabled={disabled}>
                    <span className="chip-value">{v}</span>{used > 0 && <span className="chip-count">×{used}</span>}
                  </button>
                )
              })}
            </div>
            <div className="bet-summary">Tu apuesta: <strong>{betTotal}</strong></div>
            <div className="bet-actions">
              {view.currentCall === 0 ? (
                <>
                  <button className="btn primary" onClick={() => act('bet', betTotal)} disabled={betTotal === 0}>Apostar {betTotal || ''}</button>
                  <button className="btn" onClick={() => act('check', 0)}>Pasar</button>
                </>
              ) : (
                <>
                  <button className="btn primary" onClick={() => act('call', 0)} disabled={maxChips < view.currentCall}>Igualar {view.currentCall}</button>
                  <button className="btn" onClick={() => act('bet', betTotal)} disabled={betTotal <= view.currentCall}>Subir a {betTotal || ''}</button>
                </>
              )}
              <button className="btn ghost" onClick={() => setSlip({})} disabled={betTotal === 0}>Limpiar</button>
              <button className="btn ghost" onClick={() => act('fold', 0)}>Retirarse</button>
            </div>
          </div>
        )}
        {view.phase === 'bet' && !myTurn && (
          <p className="setup-hint">Turno de {view.players.find((p) => p.pid === view.actingPid)?.name}…</p>
        )}

        {view.phase === 'showdown' && isHost && (
          <button className="btn primary" onClick={() => startOrNext('next')}>Siguiente mano</button>
        )}
        {view.phase === 'showdown' && !isHost && (
          <p className="setup-hint">Esperando al anfitrión para la siguiente mano…</p>
        )}
      </section>

      <footer className="poker-footer">
        <p>Sala <strong>{code || '—'}</strong> · Online P2P (beta). El anfitrión dirige el reparto.</p>
      </footer>
    </div>
  )
}
