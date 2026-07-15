import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'

const EMPTY = { name: '', event_date: '', description: '' }

export default function AdminEvents() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  function load() {
    api.get('/events/').then(({ data }) => setItems(data.results || data))
  }
  useEffect(load, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data: created } = await api.post('/events/', form)
      setForm(EMPTY)
      // Po založení rovnou na vyplnění docházky.
      navigate(`/admin/events/${created.id}`)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  async function remove(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    await api.delete(`/events/${id}/`)
    load()
  }

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('admin.eventsTitle')}</h1>

      <form onSubmit={submit} className="panel grid" style={{ gap: '0.7rem', maxWidth: 500 }}>
        <h3 style={{ margin: 0 }}>{t('admin.newEvent')}</h3>
        <input
          placeholder={t('admin.eventName')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.eventDate')}</div>
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
        </label>
        <textarea
          rows={2}
          placeholder={t('admin.description')}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ resize: 'vertical' }}
        />
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <button type="submit" className="primary">{t('admin.createEvent')}</button>
      </form>

      <table className="panel" style={{ padding: 0 }}>
        <thead>
          <tr>
            <th>{t('admin.eventName')}</th>
            <th>{t('admin.eventDate')}</th>
            <th>{t('activity.attendance')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((ev) => (
            <tr key={ev.id}>
              <td><Link to={`/admin/events/${ev.id}`}>{ev.name}</Link></td>
              <td className="muted">{ev.event_date}</td>
              <td className="muted">🟢 {ev.present_count} / {ev.marked_count}</td>
              <td style={{ textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <Link to={`/admin/events/${ev.id}`}><button>{t('activity.attendance')}</button></Link>
                <button onClick={() => remove(ev.id)}>{t('admin.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
