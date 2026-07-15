import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'
import Avatar from '../components/Avatar'

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

function money(value) {
  if (value == null || Number(value) <= 0) return null
  return `${Number(value)} €`
}

export default function Home() {
  const { t } = useTranslation()
  const [featured, setFeatured] = useState(null)
  const [hof, setHof] = useState([])
  const [news, setNews] = useState([])
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      const live = list.find((x) => x.status === 'in_progress')
      const draft = list.find((x) => x.status === 'draft')
      setFeatured(live || draft || null)
    })
    api.get('/hall-of-fame/').then(({ data }) => setHof(data)).catch(() => setHof([]))
    api.get('/news/').then(({ data }) => setNews(data.results || data)).catch(() => setNews([]))
    api.get('/last-result/').then(({ data }) => setLastResult(data)).catch(() => setLastResult(null))
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

      {lastResult && lastResult.winner && (
        <section>
          <h2 className="section-title">🏁 {t('home.lastResult')}</h2>
          <div className="last-result">
            <div>
              <Link to={`/tournaments/${lastResult.id}`} className="featured-name">{lastResult.name}</Link>
              <span className="muted"> · {lastResult.format_label} · {t(`mode.${lastResult.mode}`)}</span>
            </div>
            {(lastResult.event_date || money(lastResult.prize_pool)) && (
              <div className="muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                {lastResult.event_date && <span>📅 {lastResult.event_date}</span>}
                {money(lastResult.prize_pool) && <span>💰 {money(lastResult.prize_pool)}</span>}
              </div>
            )}
            <div className="lr-winner">🏆 <strong>{lastResult.winner.name}</strong> <span className="muted">— {t('home.winner')}</span></div>
            {lastResult.mode === 'league' && (lastResult.standings || []).length > 0 && (
              <ol className="lr-standings muted">
                {lastResult.standings.map((row, i) => (
                  <li key={row.team_id}>{i + 1}. {row.name} — {row.points} {t('league.points')}</li>
                ))}
              </ol>
            )}
            {lastResult.mode !== 'league' && lastResult.runner_up && (
              <div className="muted" style={{ fontSize: '0.9rem' }}>🥈 {lastResult.runner_up.name}</div>
            )}
          </div>
        </section>
      )}

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
              <span className="muted">
                {' · '}{featured.format_label} · {t(`mode.${featured.mode}`)}
                {featured.event_date ? ` · 📅 ${featured.event_date}` : ''}
                {money(featured.prize_pool) ? ` · 💰 ${money(featured.prize_pool)}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              {featured.stream_url && (
                <a href={featured.stream_url} target="_blank" rel="noreferrer" className="stream-btn">🔴 {t('home.watchLive')}</a>
              )}
              <span className={statusBadgeClass(featured.status)}>{t(`status.${featured.status}`)}</span>
            </div>
          </div>
        ) : (
          <p className="muted">{t('home.noTournament')}</p>
        )}
      </section>

      <Link to="/tournaments" className="home-viewall">{t('home.viewAll')} →</Link>
    </div>
  )
}
