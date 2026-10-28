import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { waLink } from './ui'

const ORDER_TEXT = "Hi, I'd like to order from The Food House"

const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const niceDate = (iso) =>
  new Date(iso + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const niceTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export default function Actions() {
  const [open, setOpen] = useState(false)
  const closeModal = useCallback(() => setOpen(false), [])

  return (
    <>
      <div className="cta-dock">
        <div className="cta reveal" style={{ '--i': 2 }}>
          <button className="btn-cta btn-cta--primary" onClick={() => setOpen(true)}>
            <Icon.calendar size={17} />
            Book a Table
          </button>
          <a className="btn-cta btn-cta--whatsapp" href={waLink(ORDER_TEXT)} target="_blank" rel="noopener noreferrer">
            <Icon.whatsapp size={17} />
            Order on WhatsApp
          </a>
        </div>
      </div>
      {open && <BookingModal onClose={closeModal} />}
    </>
  )
}

function BookingModal({ onClose }) {
  const [f, setF] = useState({ name: '', phone: '', date: today(), time: '20:00', guests: '2' })
  const [closing, setClosing] = useState(false)
  const first = useRef()
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 220)
  }, [onClose])

  useEffect(() => {
    first.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const submit = (e) => {
    e.preventDefault()
    const msg = [
      "Hi The Food House! I'd like to book a table.",
      '',
      `• Name: ${f.name.trim()}`,
      `• Phone: ${f.phone.trim()}`,
      `• Date: ${niceDate(f.date)}`,
      `• Time: ${niceTime(f.time)}`,
      `• Guests: ${f.guests}`,
    ].join('\n')
    window.open(waLink(msg), '_blank', 'noopener')
    close()
  }

  return (
    <div className={`modal-backdrop${closing ? ' is-closing' : ''}`} onClick={close}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-title"
      >
        <button type="button" className="icon-btn icon-btn--ghost modal-close" onClick={close} aria-label="Close">
          <Icon.close size={16} />
        </button>
        <div className="eyebrow">Reservation</div>
        <h2 id="book-title" className="modal-title">Book a Table</h2>
        <p className="modal-sub">We'll confirm on WhatsApp within minutes.</p>

        <label className="field">
          <span>Name</span>
          <input ref={first} required autoComplete="name" placeholder="Your name" value={f.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            pattern="[0-9+\s\-]{7,}"
            placeholder="+91 98765 43210"
            value={f.phone}
            onChange={set('phone')}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input required type="date" min={today()} value={f.date} onChange={set('date')} />
          </label>
          <label className="field">
            <span>Time</span>
            <input required type="time" value={f.time} onChange={set('time')} />
          </label>
          <label className="field field--narrow">
            <span>Guests</span>
            <select value={f.guests} onChange={set('guests')}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i}>{i + 1}</option>
              ))}
            </select>
          </label>
        </div>

        <button type="submit" className="btn-cta btn-cta--whatsapp modal-submit">
          <Icon.whatsapp size={17} />
          Send on WhatsApp
        </button>
      </form>
    </div>
  )
}
