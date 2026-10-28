import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { ZONES, ZONE_KEYS } from './CameraRig'
import { Icon } from './icons'

const v = new Vector3()

const GAP = 28          // hotspot na centre thi card sudhi (16px radius + 12px jagya)
const EDGE = 12         // screen, menu ane buttons thi ochhama ochhi doori
const HIDE_DELAY = 120  // hotspot thi card par jata flicker na thay
const TAP_HIDE = 4000   // touch par card aatla ms pachhi jate band thay

// Hotspots (DOM) ane SpotProjector (Canvas) vachche share thatu state, React render vagar
const screen = {}       // key -> [x, y] screen pixels
const live = { el: null, key: null, w: 0, h: 0, area: null }

const clamp = (n, lo, hi) => Math.max(Math.min(n, hi), lo)

// Screen par nu UI (menu, chip bar, upar na buttons, neeche na buttons) je card na dhanke
function measureArea() {
  const view = { l: EDGE, t: EDGE, r: window.innerWidth - EDGE, b: window.innerHeight - EDGE }
  const rect = (sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect()
    return r?.width ? { l: r.left - EDGE, t: r.top - EDGE, r: r.right + EDGE, b: r.bottom + EDGE } : null
  }
  const side = rect('.menu:not(.is-collapsed)') || rect('.menu-open.is-visible')
  const tops = [rect('.chipbar'), rect('.top-actions')].filter(Boolean)
  const cta = rect('.cta-dock .cta')
  // Chhello upay: menu ni jamni baju, bar ni neeche ane buttons ni upar no aakho khullo bhaag
  const safe = {
    l: Math.max(view.l, side?.r ?? 0),
    t: Math.max(view.t, ...tops.map((o) => o.b)),
    r: view.r,
    b: Math.min(view.b, cta?.t ?? Infinity),
  }
  return { view, safe, blocks: [side, ...tops, cta].filter(Boolean) }
}

// Card ne hotspot ni baju muko: right, left, upar, neeche - je pehlu screen ma ane UI thi bahar samay e
function place() {
  const { el, key, w, h, area } = live
  const p = key && screen[key]
  if (!el || !p || !area) return
  const [x, y] = p
  const { view: vp, safe: s, blocks } = area
  const free = (l, t) =>
    l >= vp.l && t >= vp.t && l + w <= vp.r && t + h <= vp.b &&
    !blocks.some((o) => l < o.r && o.l < l + w && t < o.b && o.t < t + h)
  // Card hotspot ni level par j rahe: vachche, nahi to koi UI ni upar/neeche khasedi ne
  const ys = [clamp(y - h / 2, vp.t, vp.b - h), ...blocks.flatMap((o) => [o.b, o.t - h])].filter((t) => t < y && t + h > y)
  const xs = [clamp(x - w / 2, vp.l, vp.r - w), ...blocks.flatMap((o) => [o.r, o.l - w])].filter((l) => l < x && l + w > x)
  const beside = (t) => [[x + GAP, t], [x - GAP - w, t]]
  const stack = (l) => [[l, y - GAP - h], [l, y + GAP]]
  const tries = [...beside(ys[0]), ...stack(xs[0]), ...ys.slice(1).flatMap(beside), ...xs.slice(1).flatMap(stack)]
  const [l, t] = tries.find(([l, t]) => free(l, t)) ?? [clamp(x + GAP, s.l, s.r - w), clamp(y - h / 2, s.t, s.b - h)]
  el.style.transform = `translate3d(${Math.round(l)}px, ${Math.round(t)}px, 0)`
}

// DOM layer with one pulsing marker per section (outside <Canvas>).
// SpotProjector moves them every frame, so React only re-renders on zone and tooltip changes.
// The info card is a tooltip: it shows only on hover, keyboard focus or tap, never by itself.
export default function Hotspots({ zone, setZone, spots }) {
  // key rahe chhe band thaya pachhi pan, etle fade-out vakhte content na badlay.
  // zone = kholti vakhte no section: camera bije jay (menu, chip, swipe) etle card aapo-aap band.
  const [tip, setTip] = useState({ key: ZONE_KEYS[0], open: false, via: null, zone })
  const open = tip.open && tip.zone === zone
  const card = useRef()
  const timer = useRef(0)
  const muted = useRef(null)  // click pachhi, mouse bahar jay tya sudhi e hotspot nu card nahi
  const ptr = useRef('')      // chhello click mouse, touch ke keyboard thi thayo

  const show = (key, via) => {
    clearTimeout(timer.current)
    // Touch thi kholelu card navi jagya sudhi saathe rahe (tap camera ne tya j lai jay chhe)
    setTip({ key, open: true, via, zone: via === 'tap' ? key : zone })
  }
  const hide = useCallback(() => {
    clearTimeout(timer.current)
    setTip((t) => (t.open ? { ...t, open: false } : t))
  }, [])
  const hideSoon = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(hide, HIDE_DELAY)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  // Card ne maapo ane hotspot ni baju muko. Pachhi SpotProjector dar frame e saathe khasede.
  useLayoutEffect(() => {
    live.el = card.current
    live.key = open ? tip.key : null
    if (!open) return
    const measure = () => {
      live.w = card.current.offsetWidth
      live.h = card.current.offsetHeight
      live.area = measureArea()
      place()
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [open, tip.key, tip.via])

  // Khullu hoy tyare: Escape thi band, bije kyay tap/click thi band, touch par 4s pachhi band
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && hide()
    const onDown = (e) => {
      if (card.current?.contains(e.target) || spots.current[tip.key]?.contains(e.target)) return
      hide()
    }
    const auto = tip.via === 'tap' ? setTimeout(hide, TAP_HIDE) : 0
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      clearTimeout(auto)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [open, tip.key, tip.via, hide, spots])

  const onClick = (key) => {
    const via = ptr.current
    ptr.current = ''
    setZone(key)
    if (via === 'touch') {
      if (open && tip.key === key) hide()
      else show(key, 'tap')
      return
    }
    if (via) muted.current = key
    hide()
  }

  const hover = (e) => e.pointerType !== 'touch'
  const described = (key) => open && tip.key === key

  return (
    <>
      <div className="hotspots">
        {ZONE_KEYS.map((key) => (
          <div key={key} className={`hotspot-wrap${key === zone ? ' is-active' : ''}`} ref={(el) => (spots.current[key] = el)}>
            <button
              className={`hotspot${key === zone ? ' is-active' : ''}${described(key) ? ' is-described' : ''}`}
              onClick={() => onClick(key)}
              onPointerDown={(e) => (ptr.current = e.pointerType)}
              onPointerEnter={(e) => {
                if (!hover(e) || muted.current === key) return
                muted.current = null
                show(key, 'hover')
              }}
              onPointerLeave={(e) => {
                if (!hover(e)) return
                if (muted.current === key) muted.current = null
                hideSoon()
              }}
              onFocus={(e) => e.currentTarget.matches(':focus-visible') && show(key, 'focus')}
              onBlur={() => tip.via === 'focus' && hideSoon()}
              aria-label={`Go to ${ZONES[key].label}`}
              aria-describedby={described(key) ? 'spot-card' : undefined}
            >
              <span className="hotspot-ring" />
              <span className="hotspot-dot" />
              <span className="hotspot-label">{ZONES[key].label}</span>
            </button>
          </div>
        ))}
      </div>

      <div
        ref={card}
        id="spot-card"
        role="tooltip"
        className={`spot-card${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        onPointerEnter={(e) => hover(e) && open && clearTimeout(timer.current)}
        onPointerLeave={(e) => hover(e) && hideSoon()}
      >
        <Card zoneKey={tip.key} onClose={tip.via === 'tap' ? hide : undefined} />
      </div>
    </>
  )
}

// Lives inside <Canvas>: projects each section's spot to screen pixels
export function SpotProjector({ spots }) {
  const { camera, size } = useThree()
  useFrame(() => {
    for (const key of ZONE_KEYS) {
      const el = spots.current[key]
      if (!el) continue
      v.fromArray(ZONES[key].spot).project(camera)
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      screen[key] = [x, y]
    }
    // Khullu card pan/zoom/drift vakhte potana hotspot ni saathe rahe
    if (live.key) place()
  })
  return null
}

function Card({ zoneKey, onClose }) {
  const z = ZONES[zoneKey]
  const Ico = Icon[zoneKey]
  return (
    <article className="info-card glass">
      <header className="info-head">
        <span className="info-icon">
          <Ico size={16} />
        </span>
        <h2 className="info-title">{z.label}</h2>
        {onClose && (
          <button className="icon-btn icon-btn--ghost icon-btn--sm" onClick={onClose} aria-label="Close">
            <Icon.close size={14} />
          </button>
        )}
      </header>
      <p className="info-desc">{z.desc}</p>
      <ul className="info-list">
        {z.highlights.map((h) => (
          <li key={h}>
            <Icon.check size={13} />
            {h}
          </li>
        ))}
      </ul>
    </article>
  )
}
