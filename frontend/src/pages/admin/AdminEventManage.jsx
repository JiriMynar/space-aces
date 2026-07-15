import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import Avatar from '../../components/Avatar'

// Stav docházky -> třída barevné tečky.
const DOT = { present: 'on', ignored: 'warn', absent: 'off' }
const STATUSES = ['present', 'ignored', 'absent']

export default function AdminEventManage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [event, setEvent] = useState(null)
  const [players, setPlayers] = useState([])
  // Mapa player_id -> stav docházky. Zdroj pravdy pro editor, ukládá se hromadně.
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [{ data: ev }, { data: pl }] = await Promise.all([
      api.get(`/events/${id}/`),
      api.get('/players/'),
    ])
    setEvent(ev)
    setPlayers(pl.results || pl)
    const next = {}
    ;(ev.attendance || []).forEach((a) => { next[a.player] = a.status })
    setMarks(next)
  }, [id])

  useEffect(() => { load().finally(() => setLoading(false)) }, [load])

  if (loading) return <p className="muted">{t('common.loading')}</p>
  if (!event) return <p className="muted">{t('common.error')}</p>

  function setMark(playerId, status) {
    setSaved(false)
    setMarks((m) => ({ ...m, [playerId]: status }))
  }

  function markAll(status) {
    setSaved(false)
    const next = {}
    players.forEach((p) => { next[p.id] = status })
    setMarks(next)
  }

  async function save() {
    setError(null)
    try {
      const entries = players.map((p) => ({ player: p.id, status: marks[p.id] || 'absent' }))
      await api.post(`/events/${id}/set_attendance/`, { entries })
      await load()
      setSaved(true)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  const presentCount = players.filter((p) => marks[p.id] === 'present').length
  const ignoredCount = players.filter((p) => marks[p.id] === 'ignored').length

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <div>
        <Link to="/admin/events" className="muted">← {t('admin.eventsTitle')}</Link>
        <h1 style={{ margin: '0.5rem 0 0.2rem' }}>{event.name}</h1>
        <p className="muted">📅 {event.event_date}</p>
        {event.description && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>}
      </div>

      <section className="panel grid" style={{ gap: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>{t('activity.attendance')}</h3>
          <span className="muted">🟢 {presentCount} / {players.length}</span>
          {ignoredCount > 0 && <span className="muted">🟠 {ignoredCount}</span>}
          <span className="spacer" style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: '0.85rem' }}>{t('admin.markAll')}:</span>
          <button type="button" onClick={() => markAll('present')}>🟢 {t('activity.present')}</button>
          <button type="button" onClick={() => markAll('absent')}>🔴 {t('activity.absent')}</button>
        </div>

        {players.length === 0 ? (
          <p className="muted">{t('admin.noPlayersYet')}</p>
        ) : (
          <div className="att-editor">
            {players.map((p) => {
              const status = marks[p.id] || 'absent'
              return (
                <div key={p.id} className={`att-edit-row is-${status}`}>
                  <span className={`att-dot ${DOT[status]}`} />
                  <Avatar player={p} size={26} />
                  <span style={{ flex: 1 }}>{p.nick}</span>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={status === s ? 'primary' : ''}
                      onClick={() => setMark(p.id, s)}
                      title={t(`activity.${s}Hint`)}
                    >
                      {t(`activity.${s}`)}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button className="primary" onClick={save} disabled={players.length === 0}>
            💾 {t('admin.saveAttendance')}
          </button>
          {saved && <span className="muted">✓ {t('admin.attendanceSaved')}</span>}
        </div>
      </section>
    </div>
  )
}
