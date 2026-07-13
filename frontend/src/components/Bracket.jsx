import { useTranslation } from 'react-i18next'
import { roundName } from '../lib/labels'

function TeamRow({ team, score, isWinner, isLoser }) {
  const { t } = useTranslation()
  if (!team) {
    return (
      <div className="bt-team bt-tbd">
        <span className="bt-name">{t('common.tbd')}</span>
      </div>
    )
  }
  return (
    <div className={`bt-team${isWinner ? ' bt-win' : ''}${isLoser ? ' bt-lose' : ''}`}>
      <span className="bt-name">
        {team.seed ? <span className="bt-seed">{team.seed}</span> : null}
        {team.name}
      </span>
      <span className="bt-score">{score}</span>
    </div>
  )
}

function MatchCard({ match }) {
  const done = match.status === 'completed' && !!match.winner
  const aWin = done && match.winner === match.team_a
  const bWin = done && match.winner === match.team_b
  return (
    <div className="match-card">
      <TeamRow
        team={match.team_a_detail}
        score={match.score_a}
        isWinner={aWin}
        isLoser={done && !aWin && !!match.team_a}
      />
      <TeamRow
        team={match.team_b_detail}
        score={match.score_b}
        isWinner={bWin}
        isLoser={done && !bWin && !!match.team_b}
      />
    </div>
  )
}

export default function Bracket({ rounds }) {
  const { t } = useTranslation()
  const winnersRounds = (rounds || [])
    .filter((r) => r.bracket_side === 'winners')
    .sort((a, b) => a.index - b.index)

  if (winnersRounds.length === 0) {
    return <p className="muted">{t('detail.noBracket')}</p>
  }

  const finalMatch = winnersRounds[winnersRounds.length - 1]?.matches?.[0]
  let champion = null
  if (finalMatch && finalMatch.status === 'completed' && finalMatch.winner) {
    champion =
      finalMatch.winner === finalMatch.team_a
        ? finalMatch.team_a_detail
        : finalMatch.team_b_detail
  }

  return (
    <div className="bracket">
      {winnersRounds.map((round) => (
        <div className="bracket-round" key={round.id}>
          <div className="bracket-round-title">{roundName(round, t)}</div>
          <div className="bracket-round-body">
            {round.matches
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((match) => (
                <div className="bracket-match" key={match.id}>
                  <MatchCard match={match} />
                </div>
              ))}
          </div>
        </div>
      ))}

      {champion && (
        <div className="bracket-round">
          <div className="bracket-round-title">{t('bracket.champion')}</div>
          <div className="bracket-round-body">
            <div className="bracket-match">
              <div className="bracket-champion">
                <span className="bt-trophy">🏆</span>
                <span>{champion.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
