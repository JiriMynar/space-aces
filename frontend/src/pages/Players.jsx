import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

export default function Players() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/players/').then(({ data }) => {
      setItems(data.results || data)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <h1>{t('players.title')}</h1>
      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="muted">{t('players.empty')}</p>
      ) : (
        <table className="panel" style={{ padding: 0 }}>
          <thead>
            <tr>
              <th>{t('players.nick')}</th>
              <th>{t('leaderboards.kd')}</th>
              <th>{t('leaderboards.winRate')}</th>
              <th>{t('leaderboards.matches')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/players/${p.id}`}>{p.nick}</Link></td>
                <td>{p.stats.kd}</td>
                <td>{Math.round(p.stats.win_rate * 100)}%</td>
                <td>{p.stats.matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
