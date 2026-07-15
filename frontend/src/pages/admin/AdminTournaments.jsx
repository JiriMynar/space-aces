import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { statusBadgeClass } from '../../lib/labels'

const EMPTY = {
  name: '',
  team_size: 1,
  mode: 'elimination',
  bracket_type: 'single',
  seeding_method: 'random',
  season: '',
  description: '',
  event_date: '',
  prize_pool: '',
  stream_url: '',
  points_per_win: '1',
  points_per_draw: '0',
  points_per_loss: '0',
  points_per_kill: '0.5',
}

export default function AdminTournaments() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [teamSets, setTeamSets] = useState([])
  const [lineupId, setLineupId] = useState('')
  const [error, setError] = useState(null)

  function load() {
    api.get('/tournaments/').then(({ data }) => setItems(data.results || data))
    api.get('/team-sets/').then(({ data }) => setTeamSets(data.results || data)).catch(() => {})
  }
  useEffect(load, [])

  // Uložené soupisky odpovídající zvolené velikosti turnaje.
  const matchingLineups = teamSets.filter((s) => s.team_size === Number(form.team_size))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      const { data: created } = await api.post('/tournaments/', {
        ...form,
        team_size: Number(form.team_size),
        // Prázdné datum/prize pošli jako null (DateField/DecimalField neberou '').
        event_date: form.event_date || null,
        prize_pool: form.prize_pool === '' ? null : form.prize_pool,
      })
      // Volitelně rovnou načti celou uloženou soupisku (všechny týmy naráz).
      if (lineupId) {
        await api.post(`/tournaments/${created.id}/apply_teamset/`, { team_set: Number(lineupId) })
      }
      setForm(EMPTY)
      setLineupId('')
      // Po založení rovnou do správy turnaje.
      navigate(`/admin/tournaments/${created.id}`)
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
          <select value={form.team_size} onChange={(e) => { setForm({ ...form, team_size: e.target.value }); setLineupId('') }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}v{n}</option>
            ))}
          </select>
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.mode')}</div>
          <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="elimination">{t('mode.elimination')}</option>
            <option value="league">{t('mode.league')}</option>
          </select>
        </label>
        {form.mode === 'league' && (
          <div className="grid" style={{ gap: '0.5rem', padding: '0.7rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <strong style={{ fontSize: '0.9rem' }}>{t('admin.scoringTitle')}</strong>
            {[
              ['points_per_win', t('admin.pointsPerWin')],
              ['points_per_draw', t('admin.pointsPerDraw')],
              ['points_per_loss', t('admin.pointsPerLoss')],
              ['points_per_kill', t('admin.pointsPerKill')],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{label}</span>
                <input type="number" step="0.5" min="0" value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: 90 }} />
              </label>
            ))}
          </div>
        )}
        {matchingLineups.length > 0 && (
          <label>
            <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.loadLineupOnCreate')}</div>
            <select value={lineupId} onChange={(e) => setLineupId(e.target.value)}>
              <option value="">{t('admin.lineupNone')}</option>
              {matchingLineups.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.team_count} {t('admin.teamsWord')})</option>
              ))}
            </select>
          </label>
        )}
        {/* Double elimination zatím není implementované — zůstává jen single. */}
        <input
          placeholder={t('tournaments.season') + ' (2026-S1)'}
          value={form.season}
          onChange={(e) => setForm({ ...form, season: e.target.value })}
        />
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.eventDate')}</div>
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.prizePool')}</div>
          <input type="number" min="0" step="1" placeholder="0" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} />
        </label>
        <input
          type="url"
          placeholder={t('admin.streamUrl')}
          value={form.stream_url}
          onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
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
