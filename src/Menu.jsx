import { useEffect, useRef, useState } from 'react'
import { ZONES, ZONE_KEYS } from './CameraRig'
import { Icon, Logo } from './icons'

const pad = (n) => String(n).padStart(2, '0')

export default function Menu({ zone, setZone, compact }) {
  return compact ? <ChipBar zone={zone} setZone={setZone} /> : <SideMenu zone={zone} setZone={setZone} />
}

function SideMenu({ zone, setZone }) {
  const [collapsed, setCollapsed] = useState(false)
  const items = useRef([])
  const idx = ZONE_KEYS.indexOf(zone)
  const [focusIdx, setFocusIdx] = useState(idx)

  // Roving focus: ek j item Tab thi aave, baaki arrow keys thi
  const onKeyDown = (e) => {
    const n = ZONE_KEYS.length
    const moves = { ArrowDown: focusIdx + 1, ArrowUp: focusIdx - 1, Home: 0, End: n - 1 }
    if (!(e.key in moves)) return
    e.preventDefault()
    const next = (moves[e.key] + n) % n
    setFocusIdx(next)
    items.current[next]?.focus()
  }

  return (
    <div className="menu-shell reveal" style={{ '--i': 0 }}>
      <nav className={`menu glass${collapsed ? ' is-collapsed' : ''}`} aria-label="Restaurant sections" aria-hidden={collapsed}>
        <header className="menu-head">
          <div>
            <div className="eyebrow">Welcome to</div>
            <h1 className="menu-title">The Food House</h1>
          </div>
          <button
            className="icon-btn icon-btn--ghost"
            onClick={() => setCollapsed(true)}
            aria-label="Hide menu"
            tabIndex={collapsed ? -1 : 0}
          >
            <Icon.chevronLeft />
          </button>
        </header>

        <div className="menu-list" role="listbox" aria-label="Sections" onKeyDown={onKeyDown} style={{ '--idx': idx }}>
          <span className="menu-pill" aria-hidden="true" />
          {ZONE_KEYS.map((key, i) => {
            const Ico = Icon[key]
            const active = key === zone
            return (
              <button
                key={key}
                ref={(el) => (items.current[i] = el)}
                role="option"
                aria-selected={active}
                tabIndex={collapsed ? -1 : i === focusIdx ? 0 : -1}
                className={`menu-item${active ? ' is-active' : ''}`}
                onClick={() => setZone(key)}
                onFocus={() => setFocusIdx(i)}
              >
                <Ico />
                <span className="menu-label">{ZONES[key].label}</span>
                <span className="menu-num">{pad(i + 1)}</span>
              </button>
            )
          })}
        </div>

        <footer className="menu-foot">
          <div className="dots" aria-hidden="true">
            {ZONE_KEYS.map((key, i) => (
              <span key={key} className={`dot${i === idx ? ' is-active' : ''}${i < idx ? ' is-past' : ''}`} />
            ))}
          </div>
          <span className="menu-count">
            {pad(idx + 1)} / {pad(ZONE_KEYS.length)}
          </span>
        </footer>
      </nav>

      <button
        className={`menu-open glass${collapsed ? ' is-visible' : ''}`}
        onClick={() => setCollapsed(false)}
        aria-label="Show menu"
        tabIndex={collapsed ? 0 : -1}
      >
        <Icon.menu />
        <span>{ZONES[zone].label}</span>
        <span className="menu-num">
          {idx + 1}/{ZONE_KEYS.length}
        </span>
      </button>
    </div>
  )
}

function ChipBar({ zone, setZone }) {
  const strip = useRef()
  const idx = ZONE_KEYS.indexOf(zone)

  // Active chip ne vachche lavo. scrollIntoView nahi: e body ne pan scroll kari shake.
  useEffect(() => {
    const s = strip.current
    const chip = s?.children[idx]
    if (!chip) return
    s.scrollTo({ left: chip.offsetLeft - (s.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' })
  }, [idx])

  return (
    <nav className="chipbar glass reveal" style={{ '--i': 0 }} aria-label="Restaurant sections">
      <div className="chipbar-head">
        <span className="chipbar-logo">
          <Logo size={24} />
        </span>
        <span className="chipbar-title">The Food House</span>
      </div>
      <div className="chips" ref={strip}>
        {ZONE_KEYS.map((key) => {
          const Ico = Icon[key]
          return (
            <button
              key={key}
              className={`chip${key === zone ? ' is-active' : ''}`}
              aria-pressed={key === zone}
              onClick={() => setZone(key)}
            >
              <Ico size={14} />
              {ZONES[key].label}
            </button>
          )
        })}
      </div>
      <div className="chipbar-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${(idx + 1) / ZONE_KEYS.length})` }} />
      </div>
    </nav>
  )
}
