import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'

function rankMedal(index) {
  return ['🥇', '🥈', '🥉'][index] || `#${index + 1}`
}

export default function Home() {
  const { t } = useTranslation()
  const [featured, setFeatured] = useState(null)
  const [hof, setHof] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      const live = list.find((tourn) => tourn.status === 'in_progress')
      const draft = list.find((tourn) => tourn.status === 'draft')
      setFeatured(live || draft || null)
      setLoading(false)
    })
    api.get('/hall-of-fame/').then(({ data }) => setHof(data)).catch(() => setHof([]))
  }, [])

  return (
    <div className="grid" style={{ gap: '1.6rem' }}>
      <header className="home-hero">
        <h1>{t('brand')}</h1>
        <p>{t('home.subtitle')}</p>
      </header>

      <section className="panel">
        <h3>{t('home.introTitle')}</h3>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{t('home.introText')}</p>
      </section>

      <section className="panel">
        <h3>🏆 {t('home.hallOfFame')}</h3>
        {hof.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{t('home.noChampions')}</p>
        ) : (
          <>
            <ol className="hall">
              {hof.slice(0, 5).map((p, i) => (
                <li key={p.id}>
                  <span className="hall-rank">{rankMedal(i)}</span>
                  <Link to={`/players/${p.id}`} className="hall-name">{p.nick}</Link>
                  <span className="hall-stats">
                    {p.titles > 0 && (
                      <span className="t" title={t('home.titlesLabel')}>👑 {p.titles}</span>
                    )}
                    <span title={t('home.top3Label')}>🏆 {p.podiums}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.6rem' }}>
              👑 {t('home.titlesLabel')} · 🏆 {t('home.top3Label')}
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h3>{t('home.featured')}</h3>
        {loading ? (
          <p className="muted">{t('common.loading')}</p>
        ) : featured ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Link to={`/tournaments/${featured.id}`} style={{ fontSize: '1.3rem' }}>
                {featured.name}
              </Link>
              <div className="muted" style={{ marginTop: '0.3rem' }}>
                {featured.format_label} · {t(`bracketType.${featured.bracket_type}`)}
              </div>
            </div>
            <span className={statusBadgeClass(featured.status)}>
              {t(`status.${featured.status}`)}
            </span>
          </div>
        ) : (
          <p className="muted">{t('home.noTournament')}</p>
        )}
      </section>

      <Link to="/tournaments">{t('home.viewAll')} →</Link>
    </div>
  )
}
