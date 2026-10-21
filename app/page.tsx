'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Crosshair, Gauge, Heart, Rocket, Zap } from 'lucide-react'

type Point = { x: number; y: number }
type Asteroid = Point & { r: number; speed: number; spin: number; angle: number; hue: number }
type Burger = Point & { speed: number; rotation: number }
type HeartPickup = Point & { pulse: number; speed: number }
type ScorePopup = Point & { text: string; life: number; color: string }

const WIDTH = 960
const HEIGHT = 560
const ASTEROID_POINTS = 10

function drawBurger(ctx: CanvasRenderingContext2D, burger: Burger) {
  ctx.save()
  ctx.translate(burger.x, burger.y)
  ctx.rotate(burger.rotation)
  ctx.shadowColor = '#f6b73c'
  ctx.shadowBlur = 18
  ctx.fillStyle = '#f6b73c'
  ctx.fillRect(-13, -4, 26, 8)
  ctx.fillStyle = '#ee6c4d'
  ctx.fillRect(-14, 3, 28, 4)
  ctx.fillStyle = '#f6d365'
  ctx.fillRect(-13, 8, 26, 3)
  ctx.fillStyle = '#f4a261'
  ctx.beginPath()
  ctx.arc(0, -7, 13, Math.PI, 0)
  ctx.fill()
  ctx.restore()
}

function drawHeartPickup(ctx: CanvasRenderingContext2D, pickup: HeartPickup) {
  ctx.save()
  ctx.translate(pickup.x, pickup.y)
  const scale = 1 + Math.sin(pickup.pulse) * 0.12
  ctx.scale(scale, scale)
  ctx.shadowColor = '#ff6b8a'
  ctx.shadowBlur = 22
  ctx.fillStyle = '#ff6b8a'
  ctx.beginPath()
  ctx.moveTo(0, 13)
  ctx.bezierCurveTo(-24, -2, -14, -16, 0, -7)
  ctx.bezierCurveTo(14, -16, 24, -2, 0, 13)
  ctx.fill()
  ctx.strokeStyle = '#ffd1dc'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#fff1f4'
  ctx.font = '700 10px Geist Mono, monospace'
  ctx.textAlign = 'center'
  ctx.fillText('1-UP', 0, 3)
  ctx.restore()
}

function drawScorePopup(ctx: CanvasRenderingContext2D, popup: ScorePopup) {
  ctx.save()
  ctx.globalAlpha = Math.min(1, popup.life / 25)
  const scale = 1 + Math.max(0, popup.life - 45) / 30
  ctx.translate(popup.x, popup.y)
  ctx.scale(scale, scale)
  ctx.font = '800 22px Geist Mono, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(7, 28, 22, .85)'
  ctx.strokeText(popup.text, 0, 0)
  ctx.shadowColor = popup.color
  ctx.shadowBlur = 16
  ctx.fillStyle = popup.color
  ctx.fillText(popup.text, 0, 0)
  ctx.restore()
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
  ctx.save()
  ctx.translate(asteroid.x, asteroid.y)
  ctx.rotate(asteroid.angle)
  ctx.shadowColor = `hsla(${asteroid.hue}, 90%, 60%, .55)`
  ctx.shadowBlur = 14
  ctx.fillStyle = `hsl(${asteroid.hue}, 62%, 46%)`
  ctx.strokeStyle = `hsl(${asteroid.hue}, 90%, 72%)`
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2
    const radius = asteroid.r * (0.78 + ((i * 17) % 5) / 20)
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(15, 24, 43, .42)'
  ctx.beginPath()
  ctx.arc(-asteroid.r * 0.25, -asteroid.r * 0.2, asteroid.r * 0.18, 0, Math.PI * 2)
  ctx.arc(asteroid.r * 0.25, asteroid.r * 0.3, asteroid.r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBus(ctx: CanvasRenderingContext2D, bus: Point, firing: boolean) {
  ctx.save()
  ctx.translate(bus.x, bus.y)
  ctx.shadowColor = '#58e1ca'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#58e1ca'
  ctx.fillRect(-34, -22, 48, 44)
  ctx.fillStyle = '#e7f2ef'
  ctx.fillRect(-27, -14, 18, 12)
  ctx.fillRect(-5, -14, 12, 12)
  ctx.fillStyle = '#ffcf5c'
  ctx.fillRect(13, -14, 5, 28)
  ctx.fillStyle = '#31476a'
  ctx.fillRect(-38, -15, 5, 30)
  ctx.fillStyle = '#15233b'
  ctx.beginPath()
  ctx.arc(-18, 24, 7, 0, Math.PI * 2)
  ctx.arc(12, 24, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f6b73c'
  ctx.fillRect(-34, 12, 48, 5)
  if (firing) {
    ctx.fillStyle = '#f6b73c'
    ctx.shadowColor = '#f6b73c'
    ctx.shadowBlur = 24
    ctx.beginPath()
    ctx.moveTo(20, -6)
    ctx.lineTo(47, 0)
    ctx.lineTo(20, 6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Record<string, boolean>>({})
  const gameRef = useRef({ bus: { x: 150, y: 280 }, asteroids: [] as Asteroid[], burgers: [] as Burger[], hearts: [] as HeartPickup[], popups: [] as ScorePopup[], stars: [] as Point[], score: 0, lives: 3, firing: false, lastShot: 0, lastSpawn: 0, lastHeart: 0, running: false })
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const reset = useCallback(() => {
    const state = gameRef.current
    state.bus = { x: 150, y: HEIGHT / 2 }
    state.asteroids = []
    state.burgers = []
    state.hearts = []
    state.popups = []
    state.score = 0
    state.lives = 3
    state.lastSpawn = 0
    state.running = true
    setScore(0)
    setLives(3)
    setIsPlaying(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const state = gameRef.current
    state.stars = Array.from({ length: 90 }, () => ({ x: Math.random() * WIDTH, y: Math.random() * HEIGHT }))
    let frame = 0

    const handleKey = (event: KeyboardEvent, down: boolean) => {
      keysRef.current[event.key.toLowerCase()] = down
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      if (down && event.key === ' ') state.firing = true
    }
    window.addEventListener('keydown', (event) => handleKey(event, true))
    window.addEventListener('keyup', (event) => { handleKey(event, false); if (event.key === ' ') state.firing = false })

    const render = (time: number) => {
      ctx.fillStyle = '#0c1830'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = '#112445'
      ctx.fillRect(0, HEIGHT * 0.72, WIDTH, HEIGHT * 0.28)
      state.stars.forEach((star, index) => {
        star.x -= 0.45 + (index % 3) * 0.18
        if (star.x < 0) star.x = WIDTH
        ctx.fillStyle = index % 7 === 0 ? '#f6b73c' : '#6c88ad'
        ctx.globalAlpha = 0.35 + (index % 5) / 10
        ctx.fillRect(star.x, star.y, index % 6 === 0 ? 3 : 1.5, index % 6 === 0 ? 3 : 1.5)
      })
      ctx.globalAlpha = 1

      if (state.running) {
        const speed = 4
        if (keysRef.current.arrowup || keysRef.current.w) state.bus.y = Math.max(42, state.bus.y - speed)
        if (keysRef.current.arrowdown || keysRef.current.s) state.bus.y = Math.min(HEIGHT - 52, state.bus.y + speed)
        if (keysRef.current.arrowleft || keysRef.current.a) state.bus.x = Math.max(65, state.bus.x - speed)
        if (keysRef.current.arrowright || keysRef.current.d) state.bus.x = Math.min(WIDTH - 100, state.bus.x + speed)
        if ((state.firing || keysRef.current[' ']) && time - state.lastShot > 260) {
          state.burgers.push({ x: state.bus.x + 48, y: state.bus.y, speed: 10, rotation: 0 })
          state.lastShot = time
        }
        if (time - state.lastSpawn > 700) {
          state.asteroids.push({ x: WIDTH + 40, y: 40 + Math.random() * (HEIGHT - 90), r: 18 + Math.random() * 18, speed: 1.8 + Math.random() * 2.4, spin: (Math.random() - 0.5) * 0.06, angle: 0, hue: 190 + Math.random() * 35 })
          state.lastSpawn = time
        }
        if (time - state.lastHeart > 9500) {
          state.hearts.push({ x: WIDTH + 30, y: 55 + Math.random() * (HEIGHT - 115), speed: 2.6, pulse: 0 })
          state.lastHeart = time
        }
        state.hearts = state.hearts.filter((heart) => {
          heart.x -= heart.speed
          heart.pulse += 0.08
          if (Math.hypot(state.bus.x - heart.x, state.bus.y - heart.y) < 38) {
            state.lives = Math.min(5, state.lives + 1)
            setLives(state.lives)
            state.score += 250
            setScore(state.score)
            state.popups.push({ x: heart.x, y: heart.y, text: '+250', life: 60, color: '#ff8fa8' })
            return false
          }
          return heart.x > -40
        })
        state.burgers = state.burgers.filter((burger) => { burger.x += burger.speed; burger.rotation += 0.08; return burger.x < WIDTH + 40 })
        state.asteroids.forEach((asteroid) => { asteroid.x -= asteroid.speed; asteroid.angle += asteroid.spin })
        state.asteroids = state.asteroids.filter((asteroid) => {
          const hitBurger = state.burgers.findIndex((burger) => Math.hypot(burger.x - asteroid.x, burger.y - asteroid.y) < asteroid.r + 16)
          if (hitBurger >= 0) {
            state.burgers.splice(hitBurger, 1)
            state.score += ASTEROID_POINTS
            setScore(state.score)
            state.popups.push({ x: asteroid.x, y: asteroid.y, text: `+${ASTEROID_POINTS}`, life: 60, color: '#c8ed52' })
            return false
          }
          if (Math.hypot(state.bus.x - asteroid.x, state.bus.y - asteroid.y) < asteroid.r + 32) {
            state.lives -= 1
            setLives(state.lives)
            if (state.lives <= 0) { state.running = false; setIsPlaying(false) }
            return false
          }
          return asteroid.x > -70
        })
      }

      state.popups = state.popups.filter((popup) => { popup.y -= 0.9; popup.life -= 1; return popup.life > 0 })

      state.burgers.forEach((burger) => drawBurger(ctx, burger))
      state.hearts.forEach((heart) => drawHeartPickup(ctx, heart))
      state.asteroids.forEach((asteroid) => drawAsteroid(ctx, asteroid))
      drawBus(ctx, state.bus, state.firing || keysRef.current[' '])
      state.popups.forEach((popup) => drawScorePopup(ctx, popup))
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', (event) => handleKey(event, true)); window.removeEventListener('keyup', (event) => handleKey(event, false)) }
  }, [])

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Rocket size={18} strokeWidth={2.5} /></div><span>BURGER<br /><b>ORBIT</b></span></div>
        <div className="mission"><span className="live-dot" /> MISSION 07 <span className="mission-line" /> <span className="muted">DEEP SPACE DELIVERY</span></div>
        <button className="sound-button" aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'} onClick={() => setIsMuted(!isMuted)}><Zap size={16} /> {isMuted ? 'SOUND OFF' : 'SOUND ON'}</button>
      </header>
      <section className="hero-copy"><div><p className="eyebrow">VW-DELUXE / PILOT BRIEFING</p><h1>Grill the <em>galaxy.</em></h1><p className="lede">Your bus. Your burgers. Their bad orbit.</p></div><div className="high-score"><span>HIGH SCORE</span><strong>042,800</strong><small>+ 1,200 TODAY</small></div></section>
      <section className="game-card">
        <div className="hud"><div className="hud-item score-readout"><span className="hud-label">SCORE</span><strong key={score} className={score > 0 ? 'score-bump' : undefined}>{String(score).padStart(6, '0')}</strong><span className="score-rule">+{ASTEROID_POINTS} PER ASTEROID</span></div><div className="hud-item"><span className="hud-label">BURGER FUEL</span><div className="fuel"><i /><i /><i /><i /><i /></div></div><div className="hud-item lives"><span className="hud-label">BUS INTEGRITY</span>{[0, 1, 2].map((heart) => <Heart key={heart} size={18} fill={heart < lives ? 'currentColor' : 'none'} />)}</div></div>
        <div className="canvas-wrap"><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Burger Orbit game canvas" /><div className="scanlines" />{!isPlaying && <div className="start-overlay"><div className="crosshair"><Crosshair size={44} /></div><p className="overlay-kicker">READY WHEN YOU ARE, CAPTAIN</p><h2>{lives === 0 ? 'THE BUS GOT TOASTED' : 'A VERY CHEESY MISSION'}</h2>{lives === 0 && <div className="final-score"><span>FINAL SCORE</span><strong>{String(score).padStart(6, '0')}</strong><small>{score / ASTEROID_POINTS >= 1 ? `≈ ${Math.floor(score / ASTEROID_POINTS)} ASTEROIDS' WORTH` : 'NO ASTEROIDS GRILLED'}</small></div>}<p className="overlay-help">STEER WITH <b>WASD</b> OR ARROW KEYS <span>·</span> FIRE WITH <b>SPACE</b></p><button className="play-button" onClick={reset}>{lives === 0 ? 'RUN IT BACK' : 'START MISSION'} <span>→</span></button></div>}</div>
        <div className="game-footer"><span><Gauge size={16} /> SPEED 88 MPH</span><span><span className="keycap">WASD</span> MOVE <span className="keycap">SPACE</span> LAUNCH BURGER</span><span className="status"><span className="live-dot" /> SYSTEMS NOMINAL</span></div>
      </section>
      <footer className="footer"><span>ALL SYSTEMS GO <i /> BURGER ORBIT ARCADE</span><span>© 1973—2026 VW-DELUXE <span className="footer-dot">✦</span> NO ASTEROIDS WERE FED</span></footer>
    </main>
  )
}

export default function Page() { return <SpaceGame /> }
