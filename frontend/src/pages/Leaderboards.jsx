import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

const SORTS = ['kd', 'win_rate', 'wins', 'kills', 'matches']
const SORT_LABEL = { kd: 'kd', win_rate: 'winRate', wins: 'wins', kills: 'kills', matches: 'matches' }

export default function Leaderboards() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [teamSize, setTeamSize] = useState('')
  const [sortBy, setSortBy] = useState('kd')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = { sort_by: sortBy }
    if (teamSize) params.team_size = teamSize
    api.get('/leaderboards/', { params }).then(({ data }) => {
      setRows(data)
      setLoading(false)
    })
  }, [teamSize, sortBy])

  return (
    <div>
      <h1>{t('leaderboards.title')}</h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('leaderboards.format')}</div>
          <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
            <option value="">{t('common.all')}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}v{n}</option>
            ))}
          </select>
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.8rem' }}>{t('leaderboards.sortBy')}</div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s} value={s}>{t(`leaderboards.${SORT_LABEL[s]}`)}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{t('leaderboards.empty')}</p>
      ) : (
        <table className="panel" style={{ padding: 0 }}>
          <thead>
            <tr>
              <th>{t('leaderboards.rank')}</th>
              <th>{t('leaderboards.player')}</th>
              <th>{t('leaderboards.kd')}</th>
              <th>{t('leaderboards.winRate')}</th>
              <th>{t('leaderboards.wins')}</th>
              <th>{t('leaderboards.matches')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="muted">{i + 1}</td>
                <td><Link to={`/players/${r.id}`}>{r.nick}</Link></td>
                <td>{r.kd}</td>
                <td>{Math.round(r.win_rate * 100)}%</td>
                <td>{r.wins}</td>
                <td>{r.matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
