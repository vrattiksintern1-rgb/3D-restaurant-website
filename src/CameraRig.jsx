import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { TOUCH, Vector3 } from 'three'
import gsap from 'gsap'
import { reducedMotion } from './ui'

// frame = subject nu maap (world units, screen par jevu dekhay) je hammesha poorepooru dekhavu joie.
// zoom = moti screen par vaparvano zoom; nani screen par frame fit thay etlo ochho thay.
// spot = hotspot marker ane info card ni jagya (world position).
export const ZONES = {
  overview: {
    label: 'Overview',
    desc: 'Ten spaces under one roof. Tap a glowing marker to step inside.',
    highlights: ['Bar, lounge, kitchen and terrace together', 'Parking right beside the garden'],
    target: [0, 0, -3],
    pos: [14, 12, 11],
    zoom: 42,
    frame: [30, 17.5],
    spot: [-5, 2.6, 9.6],
  },
  reception: {
    label: 'Reception',
    desc: 'A warm welcome and your table, ready.',
    highlights: ['Walk-ins and reservations', 'Host desk by the garden gate'],
    target: [-5.5, 0.6, 4],
    pos: [3.5, 8.3, 13],
    zoom: 105,
    frame: [11, 6],
    spot: [-5.5, 1.9, 4.6],
  },
  dining: {
    label: 'Dining Hall',
    desc: 'Cosy tables for couples, families and groups',
    highlights: ['Five tables under brass pendants', 'Served straight from the open kitchen'],
    target: [3, 0.6, 3],
    pos: [12, 8.3, 12],
    zoom: 70,
    frame: [16.5, 9],
    spot: [3.2, 1.7, 3],
  },
  kitchen: {
    label: 'Open Kitchen',
    desc: 'Watch our chefs cook over fire.',
    highlights: ["Live tandoor and chef's counter", 'Plates leave the pass piping hot'],
    target: [4, 0.6, -3.5],
    pos: [13, 8.3, 5.5],
    zoom: 80,
    frame: [14.5, 7.8],
    spot: [4, 2.1, -3],
  },
  lounge: {
    label: 'Lounge',
    desc: 'Sink into a sofa before dinner.',
    highlights: ['Deep sofas around a low table', 'Perfect for pre-dinner drinks'],
    target: [-4.5, 0.6, -3.5],
    pos: [4.5, 8.3, 5.5],
    zoom: 90,
    frame: [12.8, 6.9],
    spot: [-5, 1.6, -3.6],
  },
  bar: {
    label: 'Bar',
    desc: 'Handcrafted cocktails and classics made live at the counter',
    highlights: ['Watch the bartender pour, shake and serve', 'Counter seats facing the bottle wall'],
    target: [-4.3, 0.8, -9],
    pos: [4.7, 8.5, 0],
    zoom: 90,
    frame: [12.8, 6.9],
    spot: [-4.3, 2.2, -9],
  },
  private: {
    label: 'Private Dining',
    desc: "Perfect for family gatherings and friends' get-togethers",
    highlights: ['Seats the whole family', 'Ring of lights over the table'],
    target: [3.8, 0.6, -9],
    pos: [12.8, 8.3, 0],
    zoom: 85,
    frame: [13.5, 7.3],
    spot: [3.8, 2, -9],
  },
  terrace: {
    label: 'Garden Terrace',
    desc: 'Open-air tables under string lights.',
    highlights: ['Al fresco seating by the garden', 'Glows golden after sunset'],
    target: [3.2, 0.4, 8],
    pos: [12.2, 8.1, 17],
    zoom: 85,
    frame: [13.5, 7.3],
    spot: [3.2, 1.6, 8],
  },
  neighbourhood: {
    label: 'Neighbourhood',
    desc: 'Shops, streets and neighbours all around us.',
    highlights: ['Café, books and grocery next door', 'Bus stop right across the road'],
    target: [3, 0, 4],
    pos: [25, 22, 26],
    zoom: 19,
    frame: [80, 42],
    spot: [-17.4, 4.4, 6],
  },
  ground: {
    label: 'Ground',
    desc: 'Kids playing football across the road.',
    highlights: ['Evening matches on the green', 'Wave at the players from the terrace'],
    target: [18, 0, 25],
    pos: [29, 10, 36],
    zoom: 48,
    frame: [27, 15.5],
    spot: [18, 1.4, 25.25],
  },
}

export const ZONE_KEYS = Object.keys(ZONES)

// Orthographic camera: doori thi frame badlatu nathi, pan najik camera hoy to
// near plane screen na neeche no bhaag kaapi nakhe (cream patti dekhay). Etle camera door rakho.
const DIST = 400
const PAD = 16

// Menu ane neeche na buttons screen no ketlo bhaag dhanke che (px)
export function safeArea(w, h) {
  const compact = w < 720 || h < 560
  return compact
    ? { compact, left: 0, top: 132, bottom: 68 }
    : { compact, left: 320, top: 0, bottom: 88 }
}

function fitZoom(z, w, h) {
  const s = safeArea(w, h)
  const aw = w - s.left - PAD * 2
  const ah = h - s.top - s.bottom - PAD * 2
  return Math.min(z.zoom, aw / z.frame[0], ah / z.frame[1])
}

export function useViewport() {
  const read = () => [window.innerWidth, window.innerHeight]
  const [vp, setVp] = useState(read)
  useEffect(() => {
    // Size kharekhar badle tyare j re-render (mobile ma resize event vaaramvaar aave che)
    const onResize = () => setVp((v) => (v[0] === window.innerWidth && v[1] === window.innerHeight ? v : read()))
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return vp
}

const UP = new Vector3(0, 1, 0)
const INTRO_YAW = -0.35     // intro: camera thodo bajuma ane door thi sharu thay
const INTRO_ZOOM = 0.72

const offsetFor = (z) =>
  new Vector3(z.pos[0] - z.target[0], z.pos[1] - z.target[1], z.pos[2] - z.target[2]).setLength(DIST)

// Wheel, trackpad, pinch ane drag camera ne sidhu nathi badalta: e fakt target lakhe,
// ane render loop no ek j frame-callback camera ne target taraf smooth khasede.
const MAX_ZOOM = 160
const WHEEL_STEP = 0.0012   // zoom per wheel pixel (log): ek notch (100px) ~ 11%
const PINCH_STEP = 0.01     // trackpad pinch = ctrl+wheel: nana delta, vadhu asar
const WHEEL_MAX = 100       // ek event ma vadhu ma vadhu delta (free-spin wheel, trackpad flick)
const PINCH_MAX = 25
const LINE_PX = 33          // deltaMode 1 (lines, Firefox): 3 lines ~ ek notch
const EASE_WHEEL = 0.12     // 60fps par dar frame baki antar no aatlo bhaag
const EASE_PINCH = 0.35     // pinch aangli sathe chipkelu lage
const FRICTION = 4          // fling inertia ketli jaldi dhimi pade (per second)
const ZOOMED_IN = 1.02      // zone na fit zoom thi aatlu vadhu = zoom in (ek aangli pan kare, swipe nahi)

// App vanche che: zoom in hoy tyare ek aangli drag = pan, section swipe nahi
export const camState = { zoomedIn: false }

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const right = new Vector3()
const up = new Vector3()
const shift = new Vector3()

// Orbit target screen par kya dekhay (px): setViewOffset ene menu ni bajuna khulla bhaag ma muke che
function focusPoint(w, h) {
  const s = safeArea(w, h)
  return [w / 2 + s.left / 2, h / 2 - (s.bottom - s.top) / 2]
}

export default function CameraRig({ zone, started }) {
  const controls = useRef()
  const { camera, size, gl, scene, events } = useThree()
  const { width: w, height: h } = size
  const zoom = ZONES[zone] ? fitZoom(ZONES[zone], w, h) : 42
  // Neighbourhood sauthi pahodu drashya che: aanathi vadhu zoom out nahi
  const minZoom = Math.min(16, fitZoom(ZONES.neighbourhood, w, h))
  const firstMove = useRef(true)
  const arrived = useRef(null) // chhelle kaya zone par udya
  const flight = useRef(null)  // chalu camera move; null = camera aaram ma, koi lakhe nahi
  const user = useRef({ down: false, coasting: false, moved: false })
  // Zoom/pan input: zt = target zoom (null = aaram), a = zoom anchor (px), d = drag (px), v = fling (px/s)
  const nav = useRef({ zt: null, ease: EASE_WHEEL, ax: 0, ay: 0, dx: 0, dy: 0, vx: 0, vy: 0, drag: false })
  const home = useRef(new Vector3().fromArray(ZONES.overview.target)) // pan aa jagya thi mapay
  // Listeners ane frame loop mate taja maap (layout read nahi, fakt R3F nu cached size)
  const live = useRef({})
  useLayoutEffect(() => {
    live.current = { w, h, left: size.left, top: size.top, fit: zoom, minZoom, started }
  })

  // Dev only: console ma camera tapasva mate (window.__cam.camera.matrixWorld vagere)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__cam = { camera, controls: controls.current, gl, scene }
    return () => delete window.__cam
  }, [camera, gl, scene])

  // Target ne menu/buttons ni bahar na khulla bhaag na vachche rakho
  useLayoutEffect(() => {
    const s = safeArea(w, h)
    camera.setViewOffset(w, h, -s.left / 2, (s.bottom - s.top) / 2, w, h)
    return () => camera.clearViewOffset()
  }, [camera, w, h])

  // Loading screen pachhal: intro ni sharuaat ni jagya
  useLayoutEffect(() => {
    const c = controls.current
    if (started || !c) return
    const z = ZONES.overview
    camera.position.fromArray(z.target).add(offsetFor(z).applyAxisAngle(UP, INTRO_YAW))
    c.target.fromArray(z.target)
    camera.zoom = fitZoom(z, w, h) * INTRO_ZOOM
    camera.updateProjectionMatrix()
    c.update()
  }, [started, camera, w, h])

  // User input chalu flight ne tya j roke (ladai nahi); e jagya j navu home bane
  const stopFlight = useCallback(() => {
    if (!flight.current) return
    flight.current = null
    controls.current.enableDamping = true
    home.current.copy(controls.current.target)
  }, [])

  // User drag/pinch kare: chalu flight roko (ladai nahi), ane chhodya pachhi inertia par nazar
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const u = user.current
    const onStart = () => {
      stopFlight()
      c.enableDamping = true
      u.down = true
      u.coasting = true
    }
    const onEnd = () => (u.down = false)
    const onChange = () => (u.moved = true)
    c.addEventListener('start', onStart)
    c.addEventListener('end', onEnd)
    c.addEventListener('change', onChange)
    return () => {
      c.removeEventListener('start', onStart)
      c.removeEventListener('end', onEnd)
      c.removeEventListener('change', onChange)
    }
  }, [stopFlight])

  // Wheel / trackpad / pinch / zoom-in pachhi ek aangli pan. Ahiya fakt target lakhay, bhare kaam nahi.
  useEffect(() => {
    const el = events.connected || gl.domElement
    const n = nav.current
    const zoomBy = (f, x, y, ease) => {
      stopFlight()
      const { w, h, left, top, minZoom } = live.current
      n.zt = clamp((n.zt ?? camera.zoom) * f, minZoom, MAX_ZOOM)
      n.ease = ease
      // Anchor = pointer, orbit target na screen sthaan thi (px)
      const [fx, fy] = focusPoint(w, h)
      n.ax = x - left - fx
      n.ay = y - top - fy
    }

    const onWheel = (e) => {
      e.preventDefault() // page scroll ke browser zoom nahi
      if (!live.current.started) return
      const pinch = e.ctrlKey
      const max = pinch ? PINCH_MAX : WHEEL_MAX
      const d = clamp(e.deltaY * (e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? live.current.h : 1), -max, max)
      zoomBy(Math.exp(-d * (pinch ? PINCH_STEP : WHEEL_STEP)), e.clientX, e.clientY, pinch ? EASE_PINCH : EASE_WHEEL)
    }

    const pts = new Map() // touch pointerId -> [x, y]
    let spread = 0        // be aangli vachche nu antar (pinch)
    let trail = []        // [time, x, y] drag na chhella sthaan, fling ni gati mate
    const gap = () => {
      const [a, b] = [...pts.values()]
      return Math.hypot(a[0] - b[0], a[1] - b[1])
    }
    const onDown = (e) => {
      if (e.pointerType !== 'touch' || !live.current.started) return
      pts.set(e.pointerId, [e.clientX, e.clientY])
      n.vx = n.vy = 0 // navi touch fling ne pakdi le
      if (pts.size === 1) {
        n.drag = camState.zoomedIn
        trail = [[e.timeStamp, e.clientX, e.clientY]]
      } else {
        n.drag = false
        spread = pts.size === 2 ? gap() : 0
      }
    }
    const onMove = (e) => {
      const p = pts.get(e.pointerId)
      if (!p) return
      const [px, py] = p
      p[0] = e.clientX
      p[1] = e.clientY
      if (pts.size === 1 && n.drag) {
        n.dx += e.clientX - px
        n.dy += e.clientY - py
        trail.push([e.timeStamp, e.clientX, e.clientY])
        if (trail.length > 10) trail.shift()
      } else if (pts.size === 2 && spread) {
        const d = gap()
        const [a, b] = [...pts.values()]
        zoomBy(d / spread, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, EASE_PINCH)
        spread = d
      }
    }
    const onUp = (e) => {
      if (!pts.delete(e.pointerId)) return
      if (n.drag && pts.size === 0) {
        // Fling: chhella ~150ms ni gati, jo aangli chhodta pehla ubhi na rahi hoy.
        // Dhima device par pointermove dar frame ek j aave, etle ochhama ochha be sample lo.
        const last = trail[trail.length - 1]
        let first = trail.find((s) => last[0] - s[0] <= 150)
        if (first === last && trail.length > 1) first = trail[trail.length - 2]
        const dt = (last[0] - first[0]) / 1000
        if (dt > 0.008 && e.timeStamp - last[0] < 120) {
          n.vx = (last[1] - first[1]) / dt
          n.vy = (last[2] - first[2]) / dt
        }
      }
      n.drag = false
      spread = 0
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown, { passive: true })
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerup', onUp, { passive: true })
    el.addEventListener('pointercancel', onUp, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [camera, gl, events.connected, stopFlight])

  useEffect(() => {
    const z = ZONES[zone]
    const c = controls.current
    if (!z || !c || !started) return
    const n = nav.current

    // Same zone, fakt screen size badli (jem ke mobile URL bar): navi flight nahi, zoom j fit karo
    if (arrived.current === zone) {
      if (flight.current) flight.current.z1 = zoom
      else {
        camera.zoom = zoom
        camera.updateProjectionMatrix()
        // Fit zoom par pan ni jagya nathi: home par pachha
        n.zt = null
        n.vx = n.vy = 0
        shift.subVectors(home.current, c.target)
        c.target.add(shift)
        camera.position.add(shift)
        c.update()
      }
      return
    }
    arrived.current = zone

    const intro = firstMove.current
    firstMove.current = false
    const calm = reducedMotion()
    // Damping bandh: juni inertia atyare j poori thay ane flight sathe ladti nathi
    c.enableDamping = false
    c.update()
    user.current.coasting = false
    // Chalu zoom/pan/fling pan bandh: flight j camera chalave
    n.zt = null
    n.dx = n.dy = n.vx = n.vy = 0
    n.drag = false
    camState.zoomedIn = false

    const [tx, ty, tz] = z.target
    flight.current = {
      t: 0,
      dur: calm ? 0.6 : intro ? 2.4 : 1.4,
      ease: gsap.parseEase(intro ? 'expo.inOut' : 'power3.inOut'),
      p0: camera.position.clone(),
      p1: new Vector3(tx, ty, tz).add(offsetFor(z)),
      t0: c.target.clone(),
      t1: new Vector3(tx, ty, tz),
      z0: camera.zoom,
      z1: zoom,
    }
  }, [zone, zoom, camera, started])

  // Flight: render loop ma j chale (render sathe sync). Chhello frame exact value par snap, pachhi kai lakhatu nathi.
  useFrame((_, dt) => {
    const f = flight.current
    const c = controls.current
    if (!f || !c) return
    f.t += Math.min(dt, 0.1)
    if (f.t >= f.dur) {
      camera.position.copy(f.p1)
      c.target.copy(f.t1)
      camera.zoom = f.z1
      home.current.copy(f.t1)
      flight.current = null
      c.enableDamping = true
    } else {
      const k = f.ease(f.t / f.dur)
      camera.position.lerpVectors(f.p0, f.p1, k)
      c.target.lerpVectors(f.t0, f.t1, k)
      camera.zoom = f.z0 + (f.z1 - f.z0) * k
    }
    camera.updateProjectionMatrix()
    c.update()
  }, -3)

  // Zoom/pan: wheel, pinch ane drag mate camera ne khasedti ekmatra jagya, dar frame ek j vaar.
  // Current -> target exponential smoothing (frame-rate independent), nanu antar rahe etle exact snap.
  useFrame((_, delta) => {
    const c = controls.current
    const n = nav.current
    if (!c || flight.current) return
    const { w, h, fit } = live.current
    const dt = Math.min(delta, 0.1)
    const z = camera.zoom
    let nz = z
    if (n.zt !== null) {
      const lz = Math.log(z)
      const lt = Math.log(n.zt)
      if (Math.abs(lt - lz) < 1e-4) {
        nz = n.zt
        n.zt = null
      } else nz = Math.exp(lz + (lt - lz) * (1 - Math.pow(1 - n.ease, dt * 60)))
    }
    const coast = !n.drag && Math.hypot(n.vx, n.vy) > 4
    if (!coast) n.vx = n.vy = 0
    if (nz === z && !n.dx && !n.dy && !coast) {
      camState.zoomedIn = z > fit * ZOOMED_IN
      return
    }

    // Camera plane ni dishao (world): screen ni jamni ane upar
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    shift.subVectors(c.target, home.current)
    const ox = shift.dot(right)
    const oy = shift.dot(up)

    // 1) Pointer ni niche no world point zoom vakhte pointer ni niche j rahe
    const k = 1 / z - 1 / nz
    let mx = n.ax * k
    let my = -n.ay * k
    // 2) Aangli sathe 1:1 drag, pachhi fling dhimi padti jay
    mx -= n.dx / nz
    my += n.dy / nz
    n.dx = n.dy = 0
    if (coast) {
      mx -= (n.vx * dt) / nz
      my += (n.vy * dt) / nz
      const decay = Math.exp(-FRICTION * dt)
      n.vx *= decay
      n.vy *= decay
    }

    // 3) Drashya zone na fit view ni andar j rahe: fit view ma je dekhatu e karta vadhu kyarey nahi
    // (fit zoom ke ochha par jagya 0 = home par kendrit, aaje jem)
    const room = Math.max(0, 1 / fit - 1 / nz)
    const [fx, fy] = focusPoint(w, h)
    const cx = clamp(ox + mx, -fx * room, (w - fx) * room)
    const cy = clamp(oy + my, -(h - fy) * room, fy * room)
    if (cx !== ox + mx) n.vx = 0
    if (cy !== oy + my) n.vy = 0
    shift.copy(right).multiplyScalar(cx - ox).addScaledVector(up, cy - oy)
    c.target.add(shift)
    camera.position.add(shift)
    if (nz !== z) {
      camera.zoom = nz
      camera.updateProjectionMatrix()
    }
    camState.zoomedIn = nz > fit * ZOOMED_IN
  }, -2)

  // Drag pachhi ni inertia (damping) dar frame 5% j ochhi thay, minuto sudhi bahu j nanu sarakatu rahe.
  // Ek frame ma EPS thi ochhi hale etle baki ni inertia turant poori karo ane camera ne sthir karo.
  useFrame(() => {
    const u = user.current
    const c = controls.current
    if (!u.coasting || u.down || !c) return
    if (!u.moved) {
      c.enableDamping = false
      c.update()
      c.enableDamping = true
      u.coasting = false
    }
    u.moved = false
  }, -0.5)

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      // Zoom upar na frame loop ma (smooth, pointer taraf); OrbitControls fakt rotate kare
      enableZoom={false}
      minZoom={minZoom}
      maxZoom={MAX_ZOOM}
      minPolarAngle={Math.PI / 5}
      maxPolarAngle={Math.PI / 2.6}
      // Ek aangli = section badalva swipe (App ma; zoom in hoy tyare pan), be aangli = pinch zoom + rotate
      touches={{ ONE: null, TWO: TOUCH.DOLLY_ROTATE }}
    />
  )
}
