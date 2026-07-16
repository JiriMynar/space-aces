import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'
import Avatar from '../components/Avatar'

const RANK = { 1: '01', 2: '02', 3: '03' }
const DASH = String.fromCharCode(8212)   // em dash
const ARROW = String.fromCharCode(8594)  // right arrow
const DOT = String.fromCharCode(183)     // middle dot
const EURO = String.fromCharCode(8364)

function money(value) {
  if (value == null || Number(value) <= 0) return null
  return `${Number(value)} ${EURO}`
}

function SectionHead({ idx, children }) {
  return (
    <div className="mo-head">
      <span className="mo-idx">{idx}</span>
      <h2 className="mo-title">{children}</h2>
      <span className="mo-rule" />
    </div>
  )
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
    }).catch(() => setFeatured(null))
    api.get('/hall-of-fame/').then(({ data }) => setHof(data)).catch(() => setHof([]))
    api.get('/news/').then(({ data }) => setNews(data.results || data)).catch(() => setNews([]))
    api.get('/last-result/').then(({ data }) => setLastResult(data)).catch(() => setLastResult(null))
  }, [])

  const top3 = hof.slice(0, 3)
  const byPlace = { 1: top3[0], 2: top3[1], 3: top3[2] }
  const order = [2, 1, 3]

  return (
    <div className="home">
      <header className="home-hero">
        <div className="mo-eyebrow">{t('home.introTitle')}</div>
        <h1>{t('brand')}</h1>
        <p>{t('home.subtitle')}</p>
      </header>

      <p className="home-intro">{t('home.introText')}</p>

      {/* 01 - Sin slavy */}
      <section>
        <SectionHead idx="01">{t('home.hallOfFame')}</SectionHead>
        <div className="pod-grid">
          {order.map((place) => {
            const p = byPlace[place]
            return (
              <div className={`pod p${place}${p ? '' : ' empty'}`} key={place}>
                <div className="pod-rank">{RANK[place]}</div>
                {p ? (
                  <>
                    <div className="pod-id">
                      <Avatar player={p} size={40} />
                      <Link to={`/players/${p.id}`} className="pod-name">{p.nick}</Link>
                    </div>
                    <div className="pod-stats">
                      <div><b>{p.titles || 0}</b><span>{t('home.titlesLabel')}</span></div>
                      <div><b>{p.podiums || 0}</b><span>{t('home.top3Label')}</span></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pod-name pod-vacant">{DASH}</div>
                    <div className="pod-empty-note">{t('home.noChampions')}</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 02 - Vybrany turnaj */}
      <section>
        <SectionHead idx="02">{t('home.featured')}</SectionHead>
        {featured ? (
          <div className="panel mo-feat">
            <div className="mo-feat-l">
              <Link to={`/tournaments/${featured.id}`} className="mo-feat-name">{featured.name}</Link>
              <div className="mo-meta">
                <span>{featured.format_label}</span>
                <span>{t(`mode.${featured.mode}`)}</span>
                {featured.event_date && <span>{featured.event_date}</span>}
                {money(featured.prize_pool) && <span className="mo-prize">{money(featured.prize_pool)}</span>}
              </div>
            </div>
            <div className="mo-feat-r">
              {featured.stream_url && (
                <a href={featured.stream_url} target="_blank" rel="noreferrer" className="stream-btn">
                  <span className="live-dot" />{t('home.watchLive')}
                </a>
              )}
              <span className={statusBadgeClass(featured.status)}>{t(`status.${featured.status}`)}</span>
            </div>
          </div>
        ) : (
          <div className="panel mo-empty">
            <span className="mo-empty-tag">{DASH}</span>
            <span>{t('home.noTournament')}</span>
            <Link to="/tournaments" className="mo-empty-link">{t('home.viewAll')} {ARROW}</Link>
          </div>
        )}
      </section>

      {/* 03 - Posledni vysledek */}
      <section>
        <SectionHead idx="03">{t('home.lastResult')}</SectionHead>
        {lastResult && lastResult.winner ? (
          <div className="panel mo-last">
            <div className="mo-last-head">
              <Link to={`/tournaments/${lastResult.id}`} className="mo-feat-name">{lastResult.name}</Link>
              <span className="muted">{lastResult.format_label} {DOT} {t(`mode.${lastResult.mode}`)}</span>
            </div>
            <div className="mo-winner">
              <span className="mo-winner-tag">{t('home.winner')}</span>
              <strong>{lastResult.winner.name}</strong>
            </div>
            {lastResult.mode === 'league' && (lastResult.standings || []).length > 0 && (
              <ol className="lr-standings muted">
                {lastResult.standings.map((row, i) => (
                  <li key={row.team_id}>{i + 1}. {row.name} {DASH} {row.points} {t('league.points')}</li>
                ))}
              </ol>
            )}
            {lastResult.mode !== 'league' && lastResult.runner_up && (
              <div className="muted mo-runner">2. {lastResult.runner_up.name}</div>
            )}
          </div>
        ) : (
          <div className="panel mo-empty">
            <span className="mo-empty-tag">{DASH}</span>
            <span>{t('home.noChampions')}</span>
          </div>
        )}
      </section>

      {/* 04 - Novinky (jen kdyz existuji) */}
      {news.length > 0 && (
        <section>
          <SectionHead idx="04">{t('home.news')}</SectionHead>
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

      <Link to="/tournaments" className="home-viewall">{t('home.viewAll')} {ARROW}</Link>
    </div>
  )
}
