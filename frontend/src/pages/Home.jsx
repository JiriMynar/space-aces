import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'
import Avatar from '../components/Avatar'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Home() {
  const { t } = useTranslation()
  const [featured, setFeatured] = useState(null)
  const [hof, setHof] = useState([])
  const [news, setNews] = useState([])

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      const live = list.find((x) => x.status === 'in_progress')
      const draft = list.find((x) => x.status === 'draft')
      setFeatured(live || draft || null)
    })
    api.get('/hall-of-fame/').then(({ data }) => setHof(data)).catch(() => setHof([]))
    api.get('/news/').then(({ data }) => setNews(data.results || data)).catch(() => setNews([]))
  }, [])

  const top3 = hof.slice(0, 3)
  const podium = [
    top3[1] && { player: top3[1], place: 2 },
    top3[0] && { player: top3[0], place: 1 },
    top3[2] && { player: top3[2], place: 3 },
  ].filter(Boolean)

  return (
    <div className="home">
      <header className="home-hero">
        <h1>{t('brand')}</h1>
        <p>{t('home.subtitle')}</p>
      </header>

      <p className="home-intro">{t('home.introText')}</p>

      {news.length > 0 && (
        <section>
          <h2 className="section-title">📢 {t('home.news')}</h2>
          <div className="grid" style={{ gap: '0.8rem' }}>
            {news.slice(0, 4).map((n) => (
              <article key={n.id} className="news-item">
                <strong>{n.title}</strong>
                {n.body && <p className="muted" style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">🏆 {t('home.hallOfFame')}</h2>
        {hof.length === 0 ? (
          <p className="muted">{t('home.noChampions')}</p>
        ) : (
          <>
            <div className="podium">
              {podium.map(({ player, place }) => (
                <div className={`podium-place p${place}`} key={player.id}>
                  <div className="podium-medal">{MEDALS[place]}</div>
                  <Avatar player={player} size={48} />
                  <Link to={`/players/${player.id}`} className="podium-name">{player.nick}</Link>
                  <div className="podium-ach">
                    {player.titles > 0 && (
                      <span className="ach-title" title={t('home.titlesLabel')}>👑 {player.titles}</span>
                    )}
                    <span title={t('home.top3Label')}>🏆 {player.podiums}</span>
                  </div>
                  <div className="podium-bar"><span className="podium-num">{place}</span></div>
                </div>
              ))}
            </div>
            <p className="podium-legend muted">
              👑 {t('home.titlesLabel')} · 🏆 {t('home.top3Label')}
            </p>
          </>
        )}
      </section>

      <section className="home-featured">
        <h2 className="section-title">{t('home.featured')}</h2>
        {featured ? (
          <div className="featured-inline">
            <div>
              <Link to={`/tournaments/${featured.id}`} className="featured-name">{featured.name}</Link>
              <span className="muted"> · {featured.format_label} · {t(`bracketType.${featured.bracket_type}`)}</span>
            </div>
            <span className={statusBadgeClass(featured.status)}>{t(`status.${featured.status}`)}</span>
          </div>
        ) : (
          <p className="muted">{t('home.noTournament')}</p>
        )}
      </section>

      <Link to="/tournaments" className="home-viewall">{t('home.viewAll')} →</Link>
    </div>
  )
}
