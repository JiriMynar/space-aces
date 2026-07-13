import { useTranslation } from 'react-i18next'
import { roundName } from '../lib/labels'

function TeamRow({ team, score, isWinner }) {
  const { t } = useTranslation()
  if (!team) {
    return (
      <div className="match-team tbd">
        <span>{t('common.tbd')}</span>
      </div>
    )
  }
  return (
    <div className={`match-team${isWinner ? ' winner' : ''}`}>
      <span>{team.name}</span>
      <span className="score">{score}</span>
    </div>
  )
}

function MatchCard({ match }) {
  const winnerId = match.winner
  return (
    <div className="match-card">
      <TeamRow
        team={match.team_a_detail}
        score={match.score_a}
        isWinner={winnerId && winnerId === match.team_a}
      />
      <TeamRow
        team={match.team_b_detail}
        score={match.score_b}
        isWinner={winnerId && winnerId === match.team_b}
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

  return (
    <div className="bracket">
      {winnersRounds.map((round) => (
        <div className="bracket-round" key={round.id}>
          <h4>{roundName(round, t)}</h4>
          {round.matches
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
        </div>
      ))}
    </div>
  )
}
