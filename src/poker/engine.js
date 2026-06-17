// Motor de póker: baraja, reparto y evaluación de manos (5-Card Draw)

export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

// Valor numérico de cada rango (As alto = 14)
const RANK_VALUE = RANKS.reduce((acc, r, i) => {
  acc[r] = i + 2
  return acc
}, {})

export function isRed(suit) {
  return suit === '♥' || suit === '♦'
}

export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: RANK_VALUE[rank], id: `${rank}${suit}` })
    }
  }
  return deck
}

export function shuffle(deck) {
  const d = deck.slice()
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export const HAND_NAMES = [
  'Carta alta',
  'Pareja',
  'Doble pareja',
  'Trío',
  'Escalera',
  'Color',
  'Full',
  'Póker',
  'Escalera de color',
  'Escalera real',
]

// Evalúa 5 cartas y devuelve { category (0-9), name, ranks (para desempate) }
export function evaluateHand(cards) {
  const values = cards.map((c) => c.value).sort((a, b) => b - a)
  const suits = cards.map((c) => c.suit)

  // Conteo de rangos
  const counts = {}
  for (const v of values) counts[v] = (counts[v] || 0) + 1
  // Grupos ordenados primero por frecuencia, luego por valor
  const groups = Object.entries(counts)
    .map(([v, n]) => ({ value: Number(v), count: n }))
    .sort((a, b) => b.count - a.count || b.value - a.value)

  const isFlush = suits.every((s) => s === suits[0])

  // Detección de escalera (incluye A-2-3-4-5, la "rueda")
  const uniqueDesc = [...new Set(values)].sort((a, b) => b - a)
  let isStraight = false
  let straightHigh = 0
  if (uniqueDesc.length === 5) {
    if (uniqueDesc[0] - uniqueDesc[4] === 4) {
      isStraight = true
      straightHigh = uniqueDesc[0]
    } else if (
      uniqueDesc[0] === 14 &&
      uniqueDesc[1] === 5 &&
      uniqueDesc[2] === 4 &&
      uniqueDesc[3] === 3 &&
      uniqueDesc[4] === 2
    ) {
      isStraight = true
      straightHigh = 5 // el As cuenta como 1
    }
  }

  const tiebreak = groups.map((g) => g.value)

  let category
  if (isStraight && isFlush && straightHigh === 14) category = 9
  else if (isStraight && isFlush) category = 8
  else if (groups[0].count === 4) category = 7
  else if (groups[0].count === 3 && groups[1].count === 2) category = 6
  else if (isFlush) category = 5
  else if (isStraight) category = 4
  else if (groups[0].count === 3) category = 3
  else if (groups[0].count === 2 && groups[1].count === 2) category = 2
  else if (groups[0].count === 2) category = 1
  else category = 0

  // Para escaleras el desempate es la carta alta de la escalera
  const ranks = isStraight && (category === 4 || category === 8 || category === 9)
    ? [straightHigh]
    : tiebreak

  return { category, name: HAND_NAMES[category], ranks }
}

// Compara dos manos evaluadas: >0 si a gana, <0 si b gana, 0 empate
export function compareHands(a, b) {
  if (a.category !== b.category) return a.category - b.category
  for (let i = 0; i < Math.max(a.ranks.length, b.ranks.length); i++) {
    const av = a.ranks[i] || 0
    const bv = b.ranks[i] || 0
    if (av !== bv) return av - bv
  }
  return 0
}

// Genera todas las combinaciones de tamaño k de un array
function combinations(arr, k) {
  const result = []
  const combo = (start, picked) => {
    if (picked.length === k) {
      result.push(picked.slice())
      return
    }
    for (let i = start; i < arr.length; i++) {
      picked.push(arr[i])
      combo(i + 1, picked)
      picked.pop()
    }
  }
  combo(0, [])
  return result
}

// Mejor mano de 5 cartas a partir de un conjunto de 5 a 7 cartas
// (estilo Texas Hold'em: 2 cartas propias + cartas comunitarias)
export function bestHand(cards) {
  if (cards.length < 5) return evaluateHand(cards)
  let best = null
  for (const combo of combinations(cards, 5)) {
    const ev = evaluateHand(combo)
    if (!best || compareHands(ev, best) > 0) best = ev
  }
  return best
}

// IA sencilla: decide qué cartas descartar para mejorar la mano
export function aiDiscard(cards) {
  const evald = evaluateHand(cards)
  // Con trío o mejor, se queda con todo
  if (evald.category >= 3) return []

  const counts = {}
  cards.forEach((c, i) => {
    counts[c.value] = counts[c.value] || []
    counts[c.value].push(i)
  })

  // Conserva cartas que forman pareja/trío; descarta el resto
  const keep = new Set()
  for (const idxs of Object.values(counts)) {
    if (idxs.length >= 2) idxs.forEach((i) => keep.add(i))
  }

  if (keep.size === 0) {
    // Sin pareja: conserva las dos cartas más altas
    const order = cards
      .map((c, i) => ({ i, v: c.value }))
      .sort((a, b) => b.v - a.v)
    keep.add(order[0].i)
    keep.add(order[1].i)
  }

  const discard = []
  for (let i = 0; i < cards.length; i++) {
    if (!keep.has(i)) discard.push(i)
  }
  return discard
}
