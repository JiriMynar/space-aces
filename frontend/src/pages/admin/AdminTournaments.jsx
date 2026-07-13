import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { statusBadgeClass } from '../../lib/labels'

const EMPTY = {
  name: '',
  team_size: 1,
  bracket_type: 'single',
  seeding_method: 'random',
  season: '',
  description: '',
}

export default function AdminTournaments() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  function load() {
    api.get('/tournaments/').then(({ data }) => setItems(data.results || data))
  }
  useEffect(load, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/tournaments/', { ...form, team_size: Number(form.team_size) })
      setForm(EMPTY)
      load()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  async function remove(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    await api.delete(`/tournaments/${id}/`)
    load()
  }

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('admin.tournamentsTitle')}</h1>

      <form onSubmit={submit} className="panel grid" style={{ gap: '0.7rem', maxWidth: 500 }}>
        <h3 style={{ margin: 0 }}>{t('admin.newTournament')}</h3>
        <input
          placeholder={t('admin.tournamentName')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('tournaments.format')}</div>
          <select value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}v{n}</option>
            ))}
          </select>
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('tournaments.type')}</div>
          <select value={form.bracket_type} onChange={(e) => setForm({ ...form, bracket_type: e.target.value })}>
            <option value="single">{t('bracketType.single')}</option>
            <option value="double">{t('bracketType.double')}</option>
          </select>
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.seeding')}</div>
          <select value={form.seeding_method} onChange={(e) => setForm({ ...form, seeding_method: e.target.value })}>
            <option value="random">{t('admin.seedingRandom')}</option>
            <option value="rating">{t('admin.seedingRating')}</option>
          </select>
        </label>
        <input
          placeholder={t('tournaments.season') + ' (2026-S1)'}
          value={form.season}
          onChange={(e) => setForm({ ...form, season: e.target.value })}
        />
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <button type="submit" className="primary">{t('admin.createTournament')}</button>
      </form>

      <table className="panel" style={{ padding: 0 }}>
        <thead>
          <tr>
            <th>{t('admin.tournamentName')}</th>
            <th>{t('tournaments.format')}</th>
            <th>{t('tournaments.title')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((tourn) => (
            <tr key={tourn.id}>
              <td><Link to={`/admin/tournaments/${tourn.id}`}>{tourn.name}</Link></td>
              <td>{tourn.format_label}</td>
              <td><span className={statusBadgeClass(tourn.status)}>{t(`status.${tourn.status}`)}</span></td>
              <td style={{ textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <Link to={`/admin/tournaments/${tourn.id}`}><button>{t('admin.manage')}</button></Link>
                <button onClick={() => remove(tourn.id)}>{t('admin.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
