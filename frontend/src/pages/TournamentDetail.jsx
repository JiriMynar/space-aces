import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import Bracket from '../components/Bracket'
import { statusBadgeClass } from '../lib/labels'

export default function TournamentDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get(`/tournaments/${id}/`)
      .then(({ data }) => setTournament(data))
      .catch(() => setTournament(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="muted">{t('common.loading')}</p>
  if (!tournament) return <p className="muted">{t('common.error')}</p>

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <div>
        <Link to="/tournaments" className="muted">← {t('common.back')}</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <h1 style={{ margin: 0 }}>{tournament.name}</h1>
          <span className={statusBadgeClass(tournament.status)}>{t(`status.${tournament.status}`)}</span>
        </div>
        <p className="muted">
          {tournament.format_label} · {t(`bracketType.${tournament.bracket_type}`)}
          {tournament.season ? ` · ${tournament.season}` : ''}
        </p>
      </div>

      <section>
        <h3>{t('detail.bracket')}</h3>
        <Bracket rounds={tournament.rounds} />
      </section>

      <section className="panel">
        <h3>{t('detail.participants')} ({tournament.teams.length})</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {tournament.teams
            .slice()
            .sort((a, b) => (a.seed || 99) - (b.seed || 99))
            .map((team) => (
              <div key={team.id} style={{ fontSize: '0.9rem' }}>
                <span className="muted">#{team.seed || '—'} </span>
                {team.name}
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
