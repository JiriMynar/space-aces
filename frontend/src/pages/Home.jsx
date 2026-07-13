import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'

export default function Home() {
  const { t } = useTranslation()
  const [featured, setFeatured] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      // Preferuj probíhající, jinak turnaj v přípravě.
      const live = list.find((tourn) => tourn.status === 'in_progress')
      const draft = list.find((tourn) => tourn.status === 'draft')
      setFeatured(live || draft || null)
      setLoading(false)
    })
  }, [])

  return (
    <div className="grid" style={{ gap: '2rem' }}>
      <header>
        <h1>{t('brand')}</h1>
        <p className="muted">{t('home.subtitle')}</p>
      </header>

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
