import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

function roster(team) {
  return (team?.members || []).map((m) => m.nick).join(', ')
}

// Ligový pohled: bodovací tabulka (jako fotbal) + rozlosování po kolech.
export default function LeagueView({ tournament }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])

  useEffect(() => {
    api
      .get(`/tournaments/${tournament.id}/standings/`)
      .then(({ data }) => setRows(data))
      .catch(() => {})
  }, [tournament.id, tournament.rounds])

  const rounds = (tournament.rounds || []).slice().sort((a, b) => a.index - b.index)

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <section>
        <h3>{t('league.standings')}</h3>
        {rows.length === 0 ? (
          <p className="muted">{t('league.empty')}</p>
        ) : (
          <table className="panel" style={{ padding: 0 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t('league.team')}</th>
                <th title={t('league.playedFull')}>{t('league.played')}</th>
                <th title={t('league.winsFull')}>{t('league.w')}</th>
                <th title={t('league.drawsFull')}>{t('league.d')}</th>
                <th title={t('league.lossesFull')}>{t('league.l')}</th>
                <th>{t('league.kills')}</th>
                <th title={t('league.pointsFull')}>{t('league.points')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.team_id}>
                  <td className="muted">{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td>{row.kills}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>{t('league.fixtures')}</h3>
        {rounds.length === 0 ? (
          <p className="muted">{t('detail.noBracket')}</p>
        ) : (
          rounds.map((rd) => (
            <div key={rd.id} style={{ marginBottom: '0.9rem' }}>
              <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                {t('league.matchday', { n: rd.index })}
              </div>
              <div className="grid" style={{ gap: '0.3rem' }}>
                {rd.matches
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((m) => {
                    const done = m.status === 'completed'
                    const aWin = done && m.winner === m.team_a
                    const bWin = done && m.winner === m.team_b
                    return (
                      <div key={m.id} className="fixture-row">
                        <span className={`fixture-team fx-a${aWin ? ' fx-win' : ''}`} title={roster(m.team_a_detail)}>
                          {m.team_a_detail?.name || t('common.tbd')}
                        </span>
                        <span className="fixture-score">
                          {done ? `${m.score_a} : ${m.score_b}` : t('common.vs')}
                        </span>
                        <span className={`fixture-team fx-b${bWin ? ' fx-win' : ''}`} title={roster(m.team_b_detail)}>
                          {m.team_b_detail?.name || t('common.tbd')}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
