import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import Bracket from '../../components/Bracket'
import { statusBadgeClass } from '../../lib/labels'

export default function AdminTournamentManage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    return api.get(`/tournaments/${id}/`).then(({ data }) => setTournament(data))
  }, [id])

  useEffect(() => {
    Promise.all([
      load(),
      api.get('/players/').then(({ data }) => setPlayers(data.results || data)),
    ]).finally(() => setLoading(false))
  }, [id, load])

  if (loading) return <p className="muted">{t('common.loading')}</p>
  if (!tournament) return <p className="muted">{t('common.error')}</p>

  const isDraft = tournament.status === 'draft'
  const isLive = tournament.status === 'in_progress'

  async function generateBracket() {
    await api.post(`/tournaments/${id}/generate_bracket/`, {})
    load()
  }
  async function setStatus(status) {
    try {
      await api.post(`/tournaments/${id}/set_status/`, { status })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || t('common.error'))
    }
  }

  // Zápasy, do kterých jde zapsat výsledek (oba týmy, ještě nedohráno).
  const playable = (tournament.rounds || [])
    .flatMap((r) => r.matches)
    .filter((m) => m.team_a && m.team_b && m.status !== 'completed')

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <div>
        <Link to="/admin/tournaments" className="muted">← {t('admin.tournamentsTitle')}</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{tournament.name}</h1>
          <span className={statusBadgeClass(tournament.status)}>{t(`status.${tournament.status}`)}</span>
          <span className="muted">{tournament.format_label} · {t(`bracketType.${tournament.bracket_type}`)}</span>
        </div>
        <div style={{ marginTop: '0.7rem', display: 'flex', gap: '0.5rem' }}>
          {isDraft && (
            <button className="primary" onClick={() => setStatus('in_progress')}>{t('admin.startTournament')}</button>
          )}
          {isLive && (
            <button onClick={() => setStatus('completed')}>{t('admin.archiveTournament')}</button>
          )}
        </div>
      </div>

      {isDraft && (
        <TeamsSection tournament={tournament} players={players} onChange={load} onGenerate={generateBracket} />
      )}

      <section>
        <h3>{t('detail.bracket')}</h3>
        <Bracket rounds={tournament.rounds} />
      </section>

      {isLive && playable.length > 0 && (
        <section className="grid" style={{ gap: '1rem' }}>
          <h3>{t('admin.enterResults')}</h3>
          {playable.map((m) => (
            <MatchResultForm key={m.id} match={m} onSaved={load} />
          ))}
        </section>
      )}
    </div>
  )
}

function TeamsSection({ tournament, players, onChange, onGenerate }) {
  const { t } = useTranslation()
  const size = tournament.team_size
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState(Array(size).fill(''))
  const [error, setError] = useState(null)

  async function addTeam(e) {
    e.preventDefault()
    setError(null)
    const chosen = memberIds.filter(Boolean).map(Number)
    if (chosen.length !== size) {
      setError(t('admin.pickPlayers', { count: size }))
      return
    }
    const teamName = size === 1
      ? players.find((p) => p.id === chosen[0])?.nick || t('admin.team')
      : name
    if (!teamName) {
      setError(t('admin.teamNameRequired'))
      return
    }
    try {
      await api.post('/teams/', {
        tournament: tournament.id,
        name: teamName,
        member_ids: chosen,
      })
      setName('')
      setMemberIds(Array(size).fill(''))
      onChange()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  return (
    <section className="panel grid" style={{ gap: '1rem' }}>
      <h3 style={{ margin: 0 }}>{t('admin.teams')} ({tournament.teams.length})</h3>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {tournament.teams.map((team) => (
          <div key={team.id} style={{ fontSize: '0.9rem' }}>
            {team.name}
            <span className="muted"> — {team.members.map((m) => m.nick).join(', ')}</span>
          </div>
        ))}
      </div>

      <form onSubmit={addTeam} className="grid" style={{ gap: '0.6rem', maxWidth: 500 }}>
        <strong>{t('admin.addTeam')}</strong>
        {size > 1 && (
          <input placeholder={t('admin.teamName')} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {Array.from({ length: size }).map((_, i) => (
          <select
            key={i}
            value={memberIds[i]}
            onChange={(e) => {
              const next = [...memberIds]
              next[i] = e.target.value
              setMemberIds(next)
            }}
          >
            <option value="">{size === 1 ? t('admin.pickPlayer') : `${t('admin.player')} ${i + 1}`}</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.nick}</option>
            ))}
          </select>
        ))}
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <button type="submit" className="primary">{t('admin.add')}</button>
      </form>

      <div>
        <button onClick={onGenerate} disabled={tournament.teams.length < 2}>
          {t('admin.generateBracket')}
        </button>
        {tournament.teams.length < 2 && (
          <span className="muted" style={{ marginLeft: '0.6rem', fontSize: '0.85rem' }}>
            {t('admin.needTwoTeams')}
          </span>
        )}
      </div>
    </section>
  )
}

function MatchResultForm({ match, onSaved }) {
  const { t } = useTranslation()
  const membersA = match.team_a_detail?.members || []
  const membersB = match.team_b_detail?.members || []
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [stats, setStats] = useState({})
  const [error, setError] = useState(null)

  function setStat(playerId, field, value) {
    setStats((s) => ({ ...s, [playerId]: { ...s[playerId], [field]: value } }))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (scoreA === '' || scoreB === '') { setError(t('admin.enterScore')); return }
    if (Number(scoreA) === Number(scoreB)) { setError(t('admin.noTie')); return }
    const allPlayers = [...membersA, ...membersB]
    const statsArr = allPlayers.map((p) => ({
      player: p.id,
      kills: Number(stats[p.id]?.kills || 0),
      deaths: Number(stats[p.id]?.deaths || 0),
    }))
    try {
      await api.post(`/matches/${match.id}/result/`, {
        score_a: Number(scoreA),
        score_b: Number(scoreB),
        stats: statsArr,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    }
  }

  return (
    <form onSubmit={submit} className="panel grid" style={{ gap: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <strong>{match.team_a_detail?.name}</strong>
        <input type="number" min="0" value={scoreA} onChange={(e) => setScoreA(e.target.value)} style={{ width: 70 }} placeholder="0" />
        <span className="muted">:</span>
        <input type="number" min="0" value={scoreB} onChange={(e) => setScoreB(e.target.value)} style={{ width: 70 }} placeholder="0" />
        <strong>{match.team_b_detail?.name}</strong>
      </div>

      <div className="muted" style={{ fontSize: '0.8rem' }}>{t('admin.killsDeaths')}</div>
      {[...membersA, ...membersB].map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ minWidth: 100, fontSize: '0.9rem' }}>{p.nick}</span>
          <input type="number" min="0" placeholder="K" style={{ width: 60 }}
            onChange={(e) => setStat(p.id, 'kills', e.target.value)} />
          <input type="number" min="0" placeholder="D" style={{ width: 60 }}
            onChange={(e) => setStat(p.id, 'deaths', e.target.value)} />
        </div>
      ))}

      {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
      <button type="submit" className="primary" style={{ justifySelf: 'start' }}>{t('admin.saveResult')}</button>
    </form>
  )
}
