import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(false)
    try {
      await login(username, password)
      navigate('/')
    } catch {
      setError(true)
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 360, margin: '2rem auto' }}>
      <h2>{t('login.title')}</h2>
      <form onSubmit={handleSubmit} className="grid">
        <label>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{t('login.username')}</div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" style={{ width: '100%' }} />
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{t('login.password')}</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ width: '100%' }} />
        </label>
        {error && <p style={{ color: 'var(--lose)' }}>{t('login.error')}</p>}
        <button type="submit" className="primary">{t('login.submit')}</button>
      </form>
    </div>
  )
}
