import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Avatar from '../components/Avatar'

// Stav docházky -> třída barevné tečky.
const DOT = { present: 'on', ignored: 'warn', absent: 'off' }

// Barva ukazatele podle míry aktivity (zelená = aktivní, červená = neaktivní).
function rateClass(rate) {
  if (rate >= 0.7) return 'act-high'
  if (rate >= 0.4) return 'act-mid'
  return 'act-low'
}

function EventRow({ event }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !detail) {
      api.get(`/events/${event.id}/`).then(({ data }) => setDetail(data)).catch(() => {})
    }
  }

  return (
    <div className="event-row">
      <button type="button" className="event-head" onClick={toggle}>
        <span className="event-caret">{open ? '▾' : '▸'}</span>
        <strong>{event.name}</strong>
        <span className="muted">📅 {event.event_date}</span>
        <span className="spacer" />
        <span className="muted">
          🟢 {event.present_count} / {event.marked_count}
          {event.ignored_count > 0 ? ` · 🟠 ${event.ignored_count}` : ''}
        </span>
      </button>
      {open && (
        <div className="event-body">
          {event.description && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>}
          {!detail ? (
            <p className="muted">{t('common.loading')}</p>
          ) : detail.attendance.length === 0 ? (
            <p className="muted">{t('activity.noAttendance')}</p>
          ) : (
            <div className="att-list">
              {detail.attendance.map((a) => (
                <div key={a.id} className="att-item">
                  <span className={`att-dot ${DOT[a.status]}`} />
                  <Link to={`/players/${a.player}`}>{a.nick}</Link>
                  <span className="muted" style={{ fontSize: '0.8rem' }} title={t(`activity.${a.status}Hint`)}>
                    {t(`activity.${a.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Activity() {
  const { t } = useTranslation()
  const [board, setBoard] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/activity/').then(({ data }) => setBoard(data)).catch(() => setBoard([])),
      api.get('/events/').then(({ data }) => setEvents(data.results || data)).catch(() => setEvents([])),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">{t('common.loading')}</p>

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('activity.title')}</h1>

      <section>
        <h3>{t('activity.boardTitle')}</h3>
        {board.length === 0 ? (
          <p className="muted">{t('activity.noPlayers')}</p>
        ) : (
          <table className="panel" style={{ padding: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('activity.member')}</th>
                <th>{t('activity.eventsCol')}</th>
                <th>{t('activity.tournamentsCol')}</th>
                <th style={{ minWidth: 160 }}>{t('activity.rate')}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((row, i) => (
                <tr key={row.id}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Avatar player={row} size={26} />
                      <Link to={`/players/${row.id}`}>{row.nick}</Link>
                    </span>
                  </td>
                  <td className="muted">
                    {row.events_attended} / {row.events_total}
                    {row.events_ignored > 0 ? <span title={t('activity.ignoredHint')}> · 🟠 {row.events_ignored}</span> : ''}
                  </td>
                  <td className="muted">{row.tournaments_played} / {row.tournaments_total}</td>
                  <td>
                    <div className="activity-meter" title={`${Math.round(row.activity_rate * 100)} %`}>
                      <div className={`activity-fill ${rateClass(row.activity_rate)}`} style={{ width: `${Math.round(row.activity_rate * 100)}%` }} />
                      <span className="activity-num">{Math.round(row.activity_rate * 100)} %</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{t('activity.hint')}</p>
      </section>

      <section>
        <h3>{t('activity.events')}</h3>
        {events.length === 0 ? (
          <p className="muted">{t('activity.noEvents')}</p>
        ) : (
          <div className="grid" style={{ gap: '0.4rem' }}>
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
