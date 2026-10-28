import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AMBIENT_SRC, reducedMotion } from './ui'
import { Icon } from './icons'

/* ---------- Scene overlays (pointer-events: none, only opacity/transform animate) ---------- */
export function SceneFx({ night }) {
  return (
    <>
      <div className={`clouds${night ? ' is-off' : ''}`} aria-hidden="true">
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
      </div>
      <div className={`night-tint${night ? ' is-on' : ''}`} aria-hidden="true" />
      <Particles night={night} />
      <div className="vignette" aria-hidden="true" />
    </>
  )
}

// Day: slow dust motes. Night: blinking fireflies. One canvas, sprites pre-rendered once.
function Particles({ night }) {
  const ref = useRef()
  const nightRef = useRef(night)
  useEffect(() => {
    nightRef.current = night
  }, [night])

  useEffect(() => {
    if (reducedMotion()) return
    const c = ref.current
    const g = c.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let W = 0
    let H = 0
    const resize = () => {
      // Size same hoy to canvas buffer fari na banavo
      if (W === window.innerWidth && H === window.innerHeight) return
      W = window.innerWidth
      H = window.innerHeight
      c.width = W * dpr
      c.height = H * dpr
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const sprite = (r, stops) => {
      const s = document.createElement('canvas')
      s.width = s.height = r * 2
      const sg = s.getContext('2d')
      const grad = sg.createRadialGradient(r, r, 0, r, r, r)
      stops.forEach(([o, col]) => grad.addColorStop(o, col))
      sg.fillStyle = grad
      sg.fillRect(0, 0, r * 2, r * 2)
      return s
    }
    const dust = sprite(6, [[0, 'rgba(255,248,230,0.9)'], [1, 'rgba(255,248,230,0)']])
    const fly = sprite(14, [[0, 'rgba(255,236,160,1)'], [0.25, 'rgba(255,200,90,0.55)'], [1, 'rgba(255,180,60,0)']])

    const n = Math.round(Math.min(44, Math.max(18, (W * H) / 42000)))
    const ps = Array.from({ length: n }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 10,
      vy: -4 - Math.random() * 8,
      s: 0.5 + Math.random() * 0.8,
      ph: Math.random() * Math.PI * 2,
    }))

    let mix = nightRef.current ? 1 : 0
    let last = performance.now()
    let raf
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      mix += ((nightRef.current ? 1 : 0) - mix) * Math.min(1, dt * 3)
      g.clearRect(0, 0, W, H)
      const t = now / 1000
      for (const p of ps) {
        p.x += (p.vx + Math.sin(t * 0.6 + p.ph) * 6) * dt
        p.y += (p.vy * (1 - mix * 0.6) + Math.cos(t * 0.5 + p.ph) * 5) * dt
        if (p.y < -20) p.y = H + 20
        if (p.x < -20) p.x = W + 20
        if (p.x > W + 20) p.x = -20
        if (mix < 0.99) {
          g.globalAlpha = (1 - mix) * 0.35 * p.s
          g.drawImage(dust, p.x - 3 * p.s, p.y - 3 * p.s, 6 * p.s, 6 * p.s)
        }
        if (mix > 0.01) {
          const blink = Math.pow(Math.sin(t * 1.3 + p.ph) * 0.5 + 0.5, 3)
          g.globalAlpha = mix * (0.15 + 0.85 * blink)
          const r = 9 * p.s
          g.drawImage(fly, p.x - r, p.y - r, r * 2, r * 2)
        }
      }
      g.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="particles" aria-hidden="true" />
}

/* ---------- Day/night crossfade ---------- */
// Lives inside <Canvas>: renders one frame on demand and hands back the WebGL canvas.
// The drawing buffer is still valid in the same task, so it can be copied without preserveDrawingBuffer.
export function Grabber({ api }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    api.current = () => {
      gl.render(scene, camera)
      return gl.domElement
    }
  }, [api, gl, scene, camera])
  return null
}

// Snapshot of the old frame laid over the scene, then faded out to reveal the new mode.
export function Crossfade({ ref }) {
  const el = useRef()
  useImperativeHandle(ref, () => ({
    play(src) {
      const c = el.current
      if (!c || !src) return
      c.width = src.width
      c.height = src.height
      c.getContext('2d').drawImage(src, 0, 0)
      c.style.transition = 'none'
      c.style.opacity = '1'
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          c.style.transition = `opacity ${reducedMotion() ? 0.3 : 0.8}s ease`
          c.style.opacity = '0'
        }),
      )
    },
  }))
  return <canvas ref={el} className="crossfade" aria-hidden="true" />
}

// Tells the loader when the scene has actually drawn a few frames
export function Ready({ onReady }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 3) onReady()
  })
  return null
}

/* ---------- Ambient sound (off by default) ---------- */
export function SoundToggle() {
  const [on, setOn] = useState(false)
  const audio = useRef()
  const synth = useRef()

  useEffect(() => () => {
    audio.current?.pause()
    synth.current?.ctx.close()
  }, [])

  const start = () => {
    const a = audio.current || (audio.current = Object.assign(new Audio(AMBIENT_SRC), { loop: true, volume: 0.35 }))
    a.play().catch(() => startSynth(synth))
  }
  const stop = () => {
    audio.current?.pause()
    if (synth.current) {
      const { ctx, gain } = synth.current
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
      setTimeout(() => ctx.suspend(), 600)
    }
  }

  return (
    <button
      className={`icon-btn glass${on ? ' is-on' : ''}`}
      onClick={() => {
        if (on) stop()
        else start()
        setOn(!on)
      }}
      aria-pressed={on}
      aria-label={on ? 'Mute ambient sound' : 'Play ambient sound'}
      title={on ? 'Mute ambient sound' : 'Play ambient sound'}
    >
      {on ? <Icon.soundOn /> : <Icon.soundOff />}
    </button>
  )
}

// Fallback when no audio file is present: soft filtered brown noise, like a quiet room
function startSynth(synth) {
  if (synth.current) {
    const { ctx, gain } = synth.current
    ctx.resume()
    gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.6)
    return
  }
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    data[i] = last * 3.5
  }
  const src = Object.assign(ctx.createBufferSource(), { buffer: buf, loop: true })
  const filter = Object.assign(ctx.createBiquadFilter(), { type: 'lowpass' })
  filter.frequency.value = 520
  const gain = ctx.createGain()
  gain.gain.value = 0
  src.connect(filter).connect(gain).connect(ctx.destination)
  src.start()
  gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.6)
  synth.current = { ctx, gain }
}
