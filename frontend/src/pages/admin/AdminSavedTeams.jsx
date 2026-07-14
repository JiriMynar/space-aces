import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'

export default function AdminSavedTeams() {
  const { t } = useTranslation()
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [name, setName] = useState('')
  const [selected, setSelected] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/saved-teams/').then(({ data }) => setTeams(data.results || data))
    api.get('/players/').then(({ data }) => setPlayers(data.results || data))
  }
  useEffect(load, [])

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function reset() {
    setName('')
    setSelected([])
    setEditingId(null)
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!name || selected.length === 0) {
      setError(t('admin.needNameAndPlayers'))
      return
    }
    try {
      const body = { name, member_ids: selected }
      if (editingId) await api.patch(`/saved-teams/${editingId}/`, body)
      else await api.post('/saved-teams/', body)
      reset()
      load()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  function startEdit(tm) {
    setName(tm.name)
    setSelected(tm.members.map((m) => m.id))
    setEditingId(tm.id)
  }

  async function remove(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    await api.delete(`/saved-teams/${id}/`)
    load()
  }

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('admin.savedTeamsTitle')}</h1>
      <p className="muted" style={{ margin: 0 }}>{t('admin.savedTeamsHint')}</p>

      <form onSubmit={submit} className="panel grid" style={{ gap: '0.7rem', maxWidth: 560 }}>
        <h3 style={{ margin: 0 }}>{editingId ? t('admin.editSavedTeam') : t('admin.newSavedTeam')}</h3>
        <input placeholder={t('admin.savedTeamName')} value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="muted" style={{ fontSize: '0.85rem' }}>{t('admin.selectPlayers')} ({selected.length})</div>
        <div className="saved-players">
          {players.map((p) => (
            <label key={p.id} className={`saved-player${selected.includes(p.id) ? ' on' : ''}`}>
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.nick}
            </label>
          ))}
        </div>
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="primary">{editingId ? t('admin.save') : t('admin.add')}</button>
          {editingId && <button type="button" onClick={reset}>{t('admin.cancel')}</button>}
        </div>
      </form>

      <table className="panel" style={{ padding: 0 }}>
        <thead>
          <tr>
            <th>{t('admin.savedTeamName')}</th>
            <th>{t('admin.players')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {teams.map((tm) => (
            <tr key={tm.id}>
              <td>{tm.name} <span className="muted">({tm.size})</span></td>
              <td className="muted">{tm.members.map((m) => m.nick).join(', ')}</td>
              <td style={{ textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(tm)}>{t('admin.edit')}</button>
                <button onClick={() => remove(tm.id)}>{t('admin.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
