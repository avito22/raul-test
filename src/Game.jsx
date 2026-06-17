import { useCallback, useEffect, useRef, useState } from 'react'
import './Game.css'

const GAME_DURATION = 30 // segundos
const MAX_AMMO = 6
const RELOAD_MS = 900
const SPAWN_MS = 850
const TARGET_LIFETIME = 2200

function rand(min, max) {
  return Math.random() * (max - min) + min
}

export default function Game({ onExit }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | playing | over
  const [hud, setHud] = useState({ score: 0, ammo: MAX_AMMO, time: GAME_DURATION, reloading: false })
  const [best, setBest] = useState(() => Number(localStorage.getItem('shooter-best') || 0))

  // Estado mutable del juego, fuera de React para el loop de animación.
  const resetState = useCallback(() => {
    stateRef.current = {
      score: 0,
      ammo: MAX_AMMO,
      reloading: false,
      reloadEnd: 0,
      targets: [],
      particles: [],
      mouse: { x: -100, y: -100 },
      lastSpawn: 0,
      startTime: performance.now(),
      shots: 0,
      hits: 0,
    }
  }, [])

  const start = useCallback(() => {
    resetState()
    setHud({ score: 0, ammo: MAX_AMMO, time: GAME_DURATION, reloading: false })
    setStatus('playing')
  }, [resetState])

  const shoot = useCallback(() => {
    const s = stateRef.current
    if (!s || status !== 'playing') return
    if (s.reloading) return
    if (s.ammo <= 0) {
      // recarga automática al quedarte sin balas
      s.reloading = true
      s.reloadEnd = performance.now() + RELOAD_MS
      return
    }
    s.ammo -= 1
    s.shots += 1

    const { x, y } = s.mouse
    // Fogonazo
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x, y,
        vx: rand(-2, 2), vy: rand(-2, 2),
        life: 1, color: '#ffd166', r: rand(1, 3),
      })
    }

    // Impacto sobre el objetivo más cercano dentro del radio
    let hitIdx = -1
    for (let i = s.targets.length - 1; i >= 0; i--) {
      const t = s.targets[i]
      const d = Math.hypot(t.x - x, t.y - y)
      if (d <= t.r) { hitIdx = i; break }
    }
    if (hitIdx >= 0) {
      const t = s.targets[hitIdx]
      s.hits += 1
      s.score += t.points
      // explosión de partículas
      for (let i = 0; i < 18; i++) {
        const a = rand(0, Math.PI * 2)
        const sp = rand(1, 5)
        s.particles.push({
          x: t.x, y: t.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, color: t.color, r: rand(2, 4),
        })
      }
      s.targets.splice(hitIdx, 1)
    }

    if (s.ammo <= 0) {
      s.reloading = true
      s.reloadEnd = performance.now() + RELOAD_MS
    }
  }, [status])

  // Bucle principal
  useEffect(() => {
    if (status !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf

    const loop = (now) => {
      const s = stateRef.current
      const w = canvas.width
      const h = canvas.height
      const elapsed = (now - s.startTime) / 1000
      const remaining = Math.max(0, GAME_DURATION - elapsed)

      // Recarga
      if (s.reloading && now >= s.reloadEnd) {
        s.reloading = false
        s.ammo = MAX_AMMO
      }

      // Spawn de objetivos
      if (now - s.lastSpawn > SPAWN_MS) {
        s.lastSpawn = now
        const r = rand(18, 34)
        const small = r < 24
        s.targets.push({
          x: rand(r, w - r),
          y: rand(r + 40, h - r),
          r,
          born: now,
          color: small ? '#ef476f' : '#06d6a0',
          points: small ? 30 : 10,
        })
      }

      // Caducidad de objetivos
      s.targets = s.targets.filter((t) => now - t.born < TARGET_LIFETIME)

      // Fondo
      ctx.fillStyle = '#0b1020'
      ctx.fillRect(0, 0, w, h)
      // rejilla sutil
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let gx = 0; gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke()
      }
      for (let gy = 0; gy < h; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke()
      }

      // Objetivos (estilo diana)
      for (const t of s.targets) {
        const age = (now - t.born) / TARGET_LIFETIME
        const pulse = 1 + Math.sin(now / 120 + t.x) * 0.05
        const rr = t.r * pulse
        ctx.globalAlpha = age > 0.75 ? 1 - (age - 0.75) / 0.25 : 1
        ctx.beginPath(); ctx.arc(t.x, t.y, rr, 0, Math.PI * 2)
        ctx.fillStyle = t.color; ctx.fill()
        ctx.beginPath(); ctx.arc(t.x, t.y, rr * 0.66, 0, Math.PI * 2)
        ctx.fillStyle = '#0b1020'; ctx.fill()
        ctx.beginPath(); ctx.arc(t.x, t.y, rr * 0.33, 0, Math.PI * 2)
        ctx.fillStyle = t.color; ctx.fill()
        ctx.globalAlpha = 1
      }

      // Partículas
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]
        p.x += p.vx; p.y += p.vy; p.life -= 0.04
        if (p.life <= 0) { s.particles.splice(i, 1); continue }
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1

      // Mira
      const { x, y } = s.mouse
      ctx.strokeStyle = s.reloading ? '#ef476f' : '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x - 6, y)
      ctx.moveTo(x + 6, y); ctx.lineTo(x + 20, y)
      ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 6)
      ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 20); ctx.stroke()

      setHud({
        score: s.score,
        ammo: s.ammo,
        time: Math.ceil(remaining),
        reloading: s.reloading,
      })

      if (remaining <= 0) {
        const finalScore = s.score
        const acc = s.shots === 0 ? 0 : Math.round((s.hits / s.shots) * 100)
        setHud({ score: finalScore, ammo: s.ammo, time: 0, reloading: false, accuracy: acc })
        setBest((b) => {
          const nb = Math.max(b, finalScore)
          localStorage.setItem('shooter-best', String(nb))
          return nb
        })
        setStatus('over')
        return
      }

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [status])

  const handleMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const s = stateRef.current
    if (s) {
      s.mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width
      s.mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height
    }
  }

  return (
    <div className="game-overlay">
      <div className="game-frame">
        <div className="game-topbar">
          <div className="game-stats">
            <span>🎯 <b>{hud.score}</b></span>
            <span>⏱️ <b>{hud.time}s</b></span>
            <span className={hud.reloading ? 'reload' : ''}>
              {hud.reloading ? 'RECARGANDO…' : `🔫 ${'▮'.repeat(hud.ammo)}${'▯'.repeat(MAX_AMMO - hud.ammo)}`}
            </span>
            <span>🏆 <b>{best}</b></span>
          </div>
          <button className="game-exit" onClick={onExit}>✕ Salir</button>
        </div>

        <div className="game-stage">
          <canvas
            ref={canvasRef}
            width={760}
            height={460}
            onMouseMove={handleMove}
            onMouseDown={shoot}
          />

          {status === 'idle' && (
            <div className="game-panel">
              <h2>🔫 Tiro al blanco</h2>
              <p>Apunta con el ratón y haz clic para disparar. Tienes {MAX_AMMO} balas;
                se recargan solas cuando se acaban. Los blancos rojos pequeños valen más.</p>
              <p className="game-hint">Dispone de {GAME_DURATION} segundos. ¡Consigue la máxima puntuación!</p>
              <button className="game-play" onClick={start}>▶ Jugar</button>
            </div>
          )}

          {status === 'over' && (
            <div className="game-panel">
              <h2>¡Tiempo!</h2>
              <p className="game-final">Puntuación: <b>{hud.score}</b></p>
              <p>Precisión: <b>{hud.accuracy ?? 0}%</b> · Récord: <b>{best}</b></p>
              <button className="game-play" onClick={start}>↻ Jugar otra vez</button>
            </div>
          )}
        </div>

        <p className="game-foot">Clic = disparar · Ratón = apuntar</p>
      </div>
    </div>
  )
}
