// Capa de red P2P sobre PeerJS (usa el broker público de PeerJS para señalización).
// No necesita servidor propio: un jugador hace de "anfitrión" (host) y el resto
// se conecta a él por un código de sala.
import { Peer } from 'peerjs'

const PREFIX = 'raultexas-'

export function randomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 4; i++) c += letters[Math.floor(Math.random() * letters.length)]
  return c
}

// Crea el peer anfitrión con un id derivado del código de sala
export function hostPeer(code, handlers) {
  const peer = new Peer(PREFIX + code)
  peer.on('open', () => handlers.onOpen && handlers.onOpen())
  peer.on('error', (e) => handlers.onError && handlers.onError(e))
  peer.on('connection', (conn) => {
    conn.on('open', () => handlers.onConnect && handlers.onConnect(conn))
    conn.on('data', (d) => handlers.onData && handlers.onData(conn, d))
    conn.on('close', () => handlers.onClose && handlers.onClose(conn))
  })
  return peer
}

// Crea un peer cliente y se conecta al anfitrión por el código
export function joinPeer(code, handlers) {
  const peer = new Peer()
  let conn = null
  peer.on('open', () => {
    conn = peer.connect(PREFIX + code, { reliable: true })
    conn.on('open', () => handlers.onOpen && handlers.onOpen(conn))
    conn.on('data', (d) => handlers.onData && handlers.onData(d))
    conn.on('close', () => handlers.onClose && handlers.onClose())
    conn.on('error', (e) => handlers.onError && handlers.onError(e))
  })
  peer.on('error', (e) => handlers.onError && handlers.onError(e))
  return { peer, getConn: () => conn }
}
