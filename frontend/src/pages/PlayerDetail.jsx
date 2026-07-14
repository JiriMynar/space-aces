import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Avatar from '../components/Avatar'

function StatTile({ label, value }) {
  return (
    <div className="panel" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-2)' }}>{value}</div>
      <div className="muted" style={{ fontSize: '0.8rem' }}>{label}</div>
    </div>
  )
}

export default function PlayerDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/players/${id}/`)
      .then(({ data }) => setPlayer(data))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="muted">{t('common.loading')}</p>
  if (!player) return <p className="muted">{t('common.error')}</p>

  const s = player.stats
  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <div>
        <Link to="/players" className="muted">← {t('common.back')}</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginTop: '0.5rem' }}>
          <Avatar player={player} size={64} />
          <div>
            <h1 style={{ margin: 0 }}>{player.nick}</h1>
            {player.game_id && <p className="muted" style={{ margin: 0 }}>ID: {player.game_id}</p>}
          </div>
        </div>
      </div>

      <section>
        <h3>{t('playerDetail.stats')}</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
          <StatTile label={t('playerDetail.kd')} value={s.kd} />
          <StatTile label={t('playerDetail.winRate')} value={`${Math.round(s.win_rate * 100)}%`} />
          <StatTile label={t('playerDetail.wins')} value={s.wins} />
          <StatTile label={t('playerDetail.matches')} value={s.matches} />
        </div>
      </section>
    </div>
  )
}
