import { useEffect, useRef, useState } from 'react'
import { Logo } from './icons'
import { reducedMotion } from './ui'

const MIN_SHOW = 1500 // ms: loader kyarey flash jevu na lage

// Loading screen. Progress follows real signals (fonts + first rendered frames);
// the bar creeps towards 90% meanwhile so it never looks stuck.
export default function Intro({ sceneReady, onReveal }) {
  const bar = useRef()
  const [stage, setStage] = useState('loading') // loading -> leaving -> gone
  const done = useRef(false)

  useEffect(() => {
    let fonts = !document.fonts
    document.fonts?.ready.then(() => (fonts = true))
    const t0 = performance.now()
    let p = 0
    let raf
    const tick = (now) => {
      const ready = fonts && sceneReady.current
      const target = ready && now - t0 > MIN_SHOW ? 1 : Math.min(0.9, (now - t0) / 2200)
      p += (target - p) * 0.08
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      if (target === 1 && p > 0.995 && !done.current) {
        done.current = true
        setStage('leaving')
        onReveal()
        setTimeout(() => setStage('gone'), reducedMotion() ? 300 : 1000)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sceneReady, onReveal])

  if (stage === 'gone') return null

  return (
    <div className={`loader${stage === 'leaving' ? ' is-leaving' : ''}`} role="status" aria-label="Loading The Food House">
      <div className="loader-inner">
        <span className="loader-logo">
          <Logo size={64} />
        </span>
        <div className="eyebrow eyebrow--light">Welcome to</div>
        <div className="loader-title">The Food House</div>
        <div className="loader-tag">Fire. Spice. Slow evenings.</div>
        <div className="loader-track">
          <span ref={bar} />
        </div>
      </div>
    </div>
  )
}
