import { useState } from 'react'

// Tamaro WhatsApp number: 91 + 10 digit, space ke + vagar
const PHONE = '919999999999'

const pill = {
  padding: '13px 24px',
  borderRadius: 999,
  fontFamily: 'Georgia, serif',
  fontSize: 15,
  cursor: 'pointer',
  border: '1px solid #4A3426',
  boxShadow: '0 8px 20px rgba(74, 52, 38, 0.25)',
}

const field = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  marginBottom: 12,
  borderRadius: 8,
  border: '1px solid #4A3426',
  background: '#FFF8EC',
  color: '#4A3426',
  fontFamily: 'Georgia, serif',
  fontSize: 15,
}

export default function Actions() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [guests, setGuests] = useState(2)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00')

  const link = (text) =>
    'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text)

  const sendBooking = () => {
    const msg =
      'Hello The Food House! I would like to book a table.\n' +
      'Name: ' + (name || '-') + '\n' +
      'Guests: ' + guests + '\n' +
      'Date: ' + (date || '-') + '\n' +
      'Time: ' + time
    window.open(link(msg), '_blank')
    setOpen(false)
  }

  const order = () => {
    window.open(
      link('Hello The Food House! I would like to place an order.'),
      '_blank'
    )
  }

  return (
    <>
      {/* Neeche na 2 buttons */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 14,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setOpen(true)}
          style={{ ...pill, background: '#C8553D', color: '#F5E6CC' }}
        >
          Book a Table
        </button>
        <button
          onClick={order}
          style={{ ...pill, background: '#6B7F3A', color: '#F5E6CC' }}
        >
          Order on WhatsApp
        </button>
      </div>

      {/* Booking form */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(43, 29, 20, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 340,
              background: '#F5E6CC',
              border: '1px solid #4A3426',
              borderRadius: 18,
              padding: 24,
              fontFamily: 'Georgia, serif',
              color: '#4A3426',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 3, color: '#C8553D' }}>
              RESERVATION
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 18px' }}>
              Book a Table
            </div>

            <input
              style={field}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={field}
              type="number"
              min="1"
              max="20"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
            <input
              style={field}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              style={field}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                onClick={sendBooking}
                style={{
                  ...pill,
                  flex: 1,
                  background: '#C8553D',
                  color: '#F5E6CC',
                  boxShadow: 'none',
                }}
              >
                Send on WhatsApp
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  ...pill,
                  background: 'transparent',
                  color: '#4A3426',
                  boxShadow: 'none',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
