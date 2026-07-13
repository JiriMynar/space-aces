import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

export default function Archive() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tournaments/', { params: { status: 'completed' } }).then(({ data }) => {
      setItems(data.results || data)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <h1>{t('archive.title')}</h1>
      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="muted">{t('archive.empty')}</p>
      ) : (
        <table className="panel" style={{ padding: 0 }}>
          <thead>
            <tr>
              <th>{t('tournaments.title')}</th>
              <th>{t('tournaments.format')}</th>
              <th>{t('tournaments.season')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tourn) => (
              <tr key={tourn.id}>
                <td><Link to={`/tournaments/${tourn.id}`}>{tourn.name}</Link></td>
                <td>{tourn.format_label}</td>
                <td className="muted">{tourn.season || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
