// Lokalizované pojmenování kola podle počtu zápasů (jazykově neutrální v DB).
export function roundName(round, t) {
  const count = round.matches ? round.matches.length : 0
  if (count === 1) return t('round.final')
  if (count === 2) return t('round.semifinal')
  if (count === 4) return t('round.quarterfinal')
  return t('round.n', { n: round.index })
}

export function statusBadgeClass(status) {
  if (status === 'in_progress') return 'badge live'
  if (status === 'completed') return 'badge done'
  return 'badge'
}
