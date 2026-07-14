import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  const isDone = tournament.status === 'completed'

  async function setStatus(target) {
    try {
      await api.post(`/tournaments/${id}/set_status/`, { status: target })
      load()
    } catch (err) {
      alert(err.response?.data?.detail || t('common.error'))
    }
  }

  const hasBracket = (tournament.rounds || []).length > 0
  // Zápasy, do kterých jde (znovu) zapsat výsledek.
  const matches = (tournament.rounds || []).flatMap((r) => r.matches).filter((m) => m.team_a && m.team_b)

  return (
    <div className="grid" style={{ gap: '1.5rem' }}>
      <div>
        <Link to="/admin/tournaments" className="muted">← {t('admin.tournamentsTitle')}</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{tournament.name}</h1>
          <span className={statusBadgeClass(tournament.status)}>{t(`status.${tournament.status}`)}</span>
          <span className="muted">{tournament.format_label} · {t(`bracketType.${tournament.bracket_type}`)}</span>
        </div>
        <div style={{ marginTop: '0.7rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isDraft && (
            <button className="primary" onClick={() => setStatus('in_progress')} disabled={!hasBracket}>
              {t('admin.startTournament')}
            </button>
          )}
          {isLive && (
            <>
              <button onClick={() => setStatus('draft')}>{t('admin.revertToDraft')}</button>
              <button onClick={() => setStatus('completed')}>{t('admin.archiveTournament')}</button>
            </>
          )}
          {isDone && (
            <button onClick={() => setStatus('in_progress')}>{t('admin.reopen')}</button>
          )}
        </div>
        {isDraft && !hasBracket && (
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>{t('admin.generateFirst')}</p>
        )}
      </div>

      <EditTournamentForm tournament={tournament} onSaved={load} />

      {isDraft && (
        <TeamsSection tournament={tournament} players={players} onChange={load} />
      )}

      <section>
        <h3>{t('detail.bracket')}</h3>
        <Bracket rounds={tournament.rounds} />
      </section>

      {isLive && matches.length > 0 && (
        <section className="grid" style={{ gap: '1rem' }}>
          <h3>{t('admin.enterResults')}</h3>
          {matches.map((m) => (
            <MatchResultForm key={m.id} match={m} onSaved={load} />
          ))}
        </section>
      )}
    </div>
  )
}

function EditTournamentForm({ tournament, onSaved }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: tournament.name,
    season: tournament.season || '',
    description: tournament.description || '',
  })
  const [error, setError] = useState(null)

  async function save(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.patch(`/tournaments/${tournament.id}/`, form)
      setOpen(false)
      onSaved()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  if (!open) {
    return (
      <div>
        <button onClick={() => setOpen(true)}>✎ {t('admin.editTournament')}</button>
      </div>
    )
  }
  return (
    <form onSubmit={save} className="panel grid" style={{ gap: '0.6rem', maxWidth: 520 }}>
      <h3 style={{ margin: 0 }}>{t('admin.editTournament')}</h3>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('admin.tournamentName')} required />
      <input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder={t('tournaments.season')} />
      <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('admin.description')} style={{ resize: 'vertical' }} />
      {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="primary">{t('admin.save')}</button>
        <button type="button" onClick={() => setOpen(false)}>{t('admin.cancel')}</button>
      </div>
    </form>
  )
}

function SortableTeamRow({ team, onRename, onDelete }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const [name, setName] = useState(team.name)

  return (
    <div ref={setNodeRef} style={style} className="seed-row">
      <span className="seed-handle" {...attributes} {...listeners} title={t('admin.dragToOrder')}>⣿</span>
      <span className="seed-num muted">#{team.seed || '—'}</span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name !== team.name && onRename(team.id, name)}
        style={{ flex: 1, padding: '0.3em 0.5em' }}
      />
      <span className="muted" style={{ fontSize: '0.8rem' }}>{team.members.map((m) => m.nick).join(', ')}</span>
      <button type="button" onClick={() => onDelete(team.id)} title={t('admin.delete')}>✕</button>
    </div>
  )
}

function TeamsSection({ tournament, players, onChange }) {
  const { t } = useTranslation()
  const size = tournament.team_size
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState(Array(size).fill(''))
  const [seeding, setSeeding] = useState('random')
  const [error, setError] = useState(null)
  const [teams, setTeams] = useState(tournament.teams)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { setTeams(tournament.teams) }, [tournament.teams])

  async function addTeam(e) {
    e.preventDefault()
    setError(null)
    const chosen = memberIds.filter(Boolean).map(Number)
    if (chosen.length !== size) { setError(t('admin.pickPlayers', { count: size })); return }
    const teamName = size === 1
      ? players.find((p) => p.id === chosen[0])?.nick || t('admin.team')
      : name
    if (!teamName) { setError(t('admin.teamNameRequired')); return }
    try {
      await api.post('/teams/', { tournament: tournament.id, name: teamName, member_ids: chosen })
      setName('')
      setMemberIds(Array(size).fill(''))
      onChange()
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : t('common.error'))
    }
  }

  async function autoFill() {
    setError(null)
    const used = new Set(tournament.teams.flatMap((tm) => tm.members.map((m) => m.id)))
    const available = players.filter((p) => !used.has(p.id))
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[available[i], available[j]] = [available[j], available[i]]
    }
    let created = 0
    for (let i = 0; i + size <= available.length; i += size) {
      const chunk = available.slice(i, i + size)
      const teamName = size === 1 ? chunk[0].nick : `${t('admin.team')} ${tournament.teams.length + created + 1}`
      try {
        await api.post('/teams/', { tournament: tournament.id, name: teamName, member_ids: chunk.map((p) => p.id) })
        created += 1
      } catch { /* přeskoč */ }
    }
    if (created === 0) setError(t('admin.autoFillNone'))
    onChange()
  }

  async function renameTeam(teamId, newName) {
    await api.patch(`/teams/${teamId}/`, { name: newName })
    onChange()
  }
  async function deleteTeam(teamId) {
    await api.delete(`/teams/${teamId}/`)
    onChange()
  }

  async function onDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = teams.findIndex((tm) => tm.id === active.id)
    const newIndex = teams.findIndex((tm) => tm.id === over.id)
    const reordered = arrayMove(teams, oldIndex, newIndex)
    setTeams(reordered)
    // Ulož nové pořadí jako seed a přepni na ruční nasazení.
    setSeeding('manual')
    await Promise.all(reordered.map((tm, i) => api.patch(`/teams/${tm.id}/`, { seed: i + 1 })))
    onChange()
  }

  async function generate() {
    await api.post(`/tournaments/${tournament.id}/generate_bracket/`, { seeding })
    onChange()
  }

  return (
    <section className="panel grid" style={{ gap: '1rem' }}>
      <h3 style={{ margin: 0 }}>{t('admin.teams')} ({teams.length})</h3>
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{t('admin.teamsHint')}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={teams.map((tm) => tm.id)} strategy={verticalListSortingStrategy}>
          <div className="seed-list">
            {teams.map((tm) => (
              <SortableTeamRow key={tm.id} team={tm} onRename={renameTeam} onDelete={deleteTeam} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {players.length > 0 && (
        <div>
          <button type="button" onClick={autoFill}>⚡ {t('admin.autoFillTeams')}</button>
          <span className="muted" style={{ marginLeft: '0.6rem', fontSize: '0.85rem' }}>{t('admin.autoFillHint', { size })}</span>
        </div>
      )}

      <form onSubmit={addTeam} className="grid" style={{ gap: '0.6rem', maxWidth: 500 }}>
        <strong>{t('admin.addTeam')}</strong>
        {size > 1 && (
          <input placeholder={t('admin.teamName')} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {Array.from({ length: size }).map((_, i) => (
          <select key={i} value={memberIds[i]} onChange={(e) => {
            const next = [...memberIds]; next[i] = e.target.value; setMemberIds(next)
          }}>
            <option value="">{size === 1 ? t('admin.pickPlayer') : `${t('admin.player')} ${i + 1}`}</option>
            {players.map((p) => (<option key={p.id} value={p.id}>{p.nick}</option>))}
          </select>
        ))}
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        <button type="submit" className="primary">{t('admin.add')}</button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>
          <span className="muted" style={{ fontSize: '0.8rem', marginRight: '0.4rem' }}>{t('admin.seeding')}:</span>
          <select value={seeding} onChange={(e) => setSeeding(e.target.value)}>
            <option value="random">{t('admin.seedingRandom')}</option>
            <option value="rating">{t('admin.seedingRating')}</option>
            <option value="manual">{t('admin.seedingManual')}</option>
          </select>
        </label>
        <button onClick={generate} disabled={teams.length < 2}>{t('admin.generateBracket')}</button>
        {teams.length < 2 && (
          <span className="muted" style={{ fontSize: '0.85rem' }}>{t('admin.needTwoTeams')}</span>
        )}
      </div>
    </section>
  )
}

function MatchResultForm({ match, onSaved }) {
  const { t } = useTranslation()
  const membersA = match.team_a_detail?.members || []
  const membersB = match.team_b_detail?.members || []
  const done = match.status === 'completed'
  const [open, setOpen] = useState(!done)
  const [scoreA, setScoreA] = useState(done ? String(match.score_a) : '')
  const [scoreB, setScoreB] = useState(done ? String(match.score_b) : '')
  const [stats, setStats] = useState(() => {
    const init = {}
    ;(match.stats || []).forEach((s) => { init[s.player] = { kills: s.kills, deaths: s.deaths } })
    return init
  })
  const [error, setError] = useState(null)

  function setStat(pid, field, value) {
    setStats((s) => ({ ...s, [pid]: { ...s[pid], [field]: value } }))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (scoreA === '' || scoreB === '') { setError(t('admin.enterScore')); return }
    if (Number(scoreA) === Number(scoreB)) { setError(t('admin.noTie')); return }
    const statsArr = [...membersA, ...membersB].map((p) => ({
      player: p.id,
      kills: Number(stats[p.id]?.kills || 0),
      deaths: Number(stats[p.id]?.deaths || 0),
    }))
    try {
      await api.post(`/matches/${match.id}/result/`, {
        score_a: Number(scoreA), score_b: Number(scoreB), stats: statsArr,
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    }
  }

  if (done && !open) {
    return (
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <strong>{match.team_a_detail?.name}</strong>
        <span className="muted">{match.score_a} : {match.score_b}</span>
        <strong>{match.team_b_detail?.name}</strong>
        <span style={{ flex: 1 }} />
        <button onClick={() => setOpen(true)}>✎ {t('admin.editResult')}</button>
      </div>
    )
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
          <input type="number" min="0" placeholder="K" style={{ width: 60 }} value={stats[p.id]?.kills ?? ''} onChange={(e) => setStat(p.id, 'kills', e.target.value)} />
          <input type="number" min="0" placeholder="D" style={{ width: 60 }} value={stats[p.id]?.deaths ?? ''} onChange={(e) => setStat(p.id, 'deaths', e.target.value)} />
        </div>
      ))}
      {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="primary">{t('admin.saveResult')}</button>
        {done && <button type="button" onClick={() => setOpen(false)}>{t('admin.cancel')}</button>}
      </div>
    </form>
  )
}
