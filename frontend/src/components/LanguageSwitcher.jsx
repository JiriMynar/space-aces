import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'cs', label: 'CS' },
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div style={{ display: 'flex', gap: '0.3rem' }}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          style={{
            padding: '0.2em 0.5em',
            fontSize: '0.8rem',
            opacity: current === l.code ? 1 : 0.55,
            borderColor: current === l.code ? 'var(--border-glow)' : 'var(--border)',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
