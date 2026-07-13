import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'

export default function Tournaments() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      setItems(list.filter((tourn) => tourn.status !== 'completed'))
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <h1>{t('tournaments.title')}</h1>
      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="muted">{t('tournaments.empty')}</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {items.map((tourn) => (
            <Link key={tourn.id} to={`/tournaments/${tourn.id}`} className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--text)' }}>{tourn.name}</strong>
                <span className={statusBadgeClass(tourn.status)}>{t(`status.${tourn.status}`)}</span>
              </div>
              <div className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {tourn.format_label} · {t(`bracketType.${tourn.bracket_type}`)}
                {tourn.season ? ` · ${tourn.season}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
