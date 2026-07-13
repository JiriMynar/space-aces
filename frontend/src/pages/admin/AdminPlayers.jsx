import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'

const EMPTY = { nick: '', game_id: '', avatar_url: '' }

export default function AdminPlayers() {
  const { t } = useTranslation()
  const [players, setPlayers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/players/').then(({ data }) => setPlayers(data.results || data))
  }
  useEffect(load, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) await api.patch(`/players/${editingId}/`, form)
      else await api.post('/players/', form)
      setForm(EMPTY)
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.response?.data?.nick?.[0] || t('common.error'))
    }
  }

  function startEdit(p) {
    setForm({ nick: p.nick, game_id: p.game_id || '', avatar_url: p.avatar_url || '' })
    setEditingId(p.id)
  }

  async function remove(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    await api.delete(`/players/${id}/`)
    load()
  }

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('admin.playersTitle')}</h1>

      <form onSubmit={submit} className="panel grid" style={{ gap: '0.7rem', maxWidth: 500 }}>
        <h3 style={{ margin: 0 }}>{editingId ? t('admin.editPlayer') : t('admin.newPlayer')}</h3>
        <input
          placeholder={t('players.nick')}
          value={form.nick}
          onChange={(e) => setForm({ ...form, nick: e.target.value })}
          required
        />
        <input
          placeholder={t('admin.gameId')}
          value={form.game_id}
          onChange={(e) => setForm({ ...form, game_id: e.target.value })}
        />
        <input
          placeholder={t('admin.avatarUrl')}
          value={form.avatar_url}
          onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
        />
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="primary">{editingId ? t('admin.save') : t('admin.add')}</button>
          {editingId && (
            <button type="button" onClick={() => { setForm(EMPTY); setEditingId(null) }}>
              {t('admin.cancel')}
            </button>
          )}
        </div>
      </form>

      <table className="panel" style={{ padding: 0 }}>
        <thead>
          <tr>
            <th>{t('players.nick')}</th>
            <th>{t('admin.gameId')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>{p.nick}</td>
              <td className="muted">{p.game_id || '—'}</td>
              <td style={{ textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(p)}>{t('admin.edit')}</button>
                <button onClick={() => remove(p.id)}>{t('admin.delete')}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
