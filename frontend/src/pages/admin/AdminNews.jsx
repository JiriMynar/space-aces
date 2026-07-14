import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'

const EMPTY = { title: '', body: '' }

export default function AdminNews() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    api.get('/news/').then(({ data }) => setItems(data.results || data))
  }
  useEffect(load, [])

  async function submit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) await api.patch(`/news/${editingId}/`, form)
      else await api.post('/news/', form)
      setForm(EMPTY)
      setEditingId(null)
      load()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  function startEdit(n) {
    setForm({ title: n.title, body: n.body || '' })
    setEditingId(n.id)
  }

  async function remove(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    await api.delete(`/news/${id}/`)
    load()
  }

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <h1>{t('admin.newsTitle')}</h1>

      <form onSubmit={submit} className="panel grid" style={{ gap: '0.7rem', maxWidth: 560 }}>
        <h3 style={{ margin: 0 }}>{editingId ? t('admin.editNews') : t('admin.newNews')}</h3>
        <input placeholder={t('admin.newsHeadline')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea rows={4} placeholder={t('admin.newsBody')} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ resize: 'vertical' }} />
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="primary">{editingId ? t('admin.save') : t('admin.add')}</button>
          {editingId && <button type="button" onClick={() => { setForm(EMPTY); setEditingId(null) }}>{t('admin.cancel')}</button>}
        </div>
      </form>

      <div className="grid" style={{ gap: '0.8rem' }}>
        {items.map((n) => (
          <div key={n.id} className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'start' }}>
              <strong>{n.title}</strong>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => startEdit(n)}>{t('admin.edit')}</button>
                <button onClick={() => remove(n.id)}>{t('admin.delete')}</button>
              </div>
            </div>
            {n.body && <p className="muted" style={{ margin: '0.4rem 0 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
