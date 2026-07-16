import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { statusBadgeClass } from '../lib/labels'

const EURO = String.fromCharCode(8364)
const DOT = String.fromCharCode(183)
const ARROW = String.fromCharCode(8594)

function money(v) {
  if (v == null || Number(v) <= 0) return null
  return `${Number(v)} ${EURO}`
}

function metaChips(tourn, t) {
  const chips = [tourn.format_label, t(`bracketType.${tourn.bracket_type}`)]
  if (tourn.season) chips.push(tourn.season)
  if (tourn.event_date) chips.push(tourn.event_date)
  return chips
}

export default function Tournaments() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/tournaments/').then(({ data }) => {
      const list = data.results || data
      setItems(list.filter((x) => x.status !== 'completed'))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const counts = useMemo(() => ({
    all: items.length,
    in_progress: items.filter((x) => x.status === 'in_progress').length,
    draft: items.filter((x) => x.status === 'draft').length,
  }), [items])

  const segments = [
    { key: 'all', label: t('common.all') },
    { key: 'in_progress', label: t('status.in_progress') },
    { key: 'draft', label: t('status.draft') },
  ]

  const filtered = filter === 'all' ? items : items.filter((x) => x.status === filter)
  const featured = filtered.find((x) => x.status === 'in_progress') || null
  const rest = filtered.filter((x) => x !== featured)

  return (
    <div>
      <h1>{t('tournaments.title')}</h1>

      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="muted">{t('tournaments.empty')}</p>
      ) : (
        <>
          <div className="tl-bar">
            <div className="tl-seg">
              {segments.map((s) => (
                <button
                  key={s.key}
                  className={filter === s.key ? 'on' : ''}
                  onClick={() => setFilter(s.key)}
                >
                  {s.label}<span className="n">{counts[s.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="muted">{t('tournaments.empty')}</p>
          ) : (
            <div className="tl">
              {featured && (
                <div className="tl-feat">
                  <span className="badge live tl-feat-pill"><span className="live-dot" />{t(`status.${featured.status}`)}</span>
                  <Link to={`/tournaments/${featured.id}`} className="tl-feat-name">
                    {featured.name} <span className="tl-arrow">{ARROW}</span>
                  </Link>
                  <div className="tl-feat-row">
                    <div className="tl-meta">
                      {metaChips(featured, t).map((c, i) => <span key={i}>{c}</span>)}
                      {money(featured.prize_pool) && <span className="tl-prize">{money(featured.prize_pool)}</span>}
                    </div>
                    {featured.stream_url && (
                      <a href={featured.stream_url} target="_blank" rel="noreferrer" className="tl-btn tl-btn-mars">
                        <span className="live-dot" />{t('home.watchLive')}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {rest.length > 0 && (
                <div className="tl-list">
                  {rest.map((tourn) => (
                    <Link key={tourn.id} to={`/tournaments/${tourn.id}`} className="tl-row">
                      <span className="tl-row-nm">{tourn.name}</span>
                      <span className="tl-row-meta">
                        {metaChips(tourn, t).join(` ${DOT} `)}
                        {money(tourn.prize_pool) ? ` ${DOT} ${money(tourn.prize_pool)}` : ''}
                      </span>
                      <span className={statusBadgeClass(tourn.status)}>{t(`status.${tourn.status}`)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
