import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'

export default function ChangePassword() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  // Bez přihlášení nemá stránka smysl.
  if (!isAdmin) {
    navigate('/login')
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    if (newPassword !== confirm) {
      setError(t('changePassword.mismatch'))
      return
    }
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      setMessage(t('changePassword.success'))
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err.response?.data?.detail || t('common.error'))
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>{t('changePassword.title')}</h2>
      <form onSubmit={handleSubmit} className="grid">
        <label>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{t('changePassword.old')}</div>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
            style={{ width: '100%' }}
          />
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{t('changePassword.new')}</div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            style={{ width: '100%' }}
          />
        </label>
        <label>
          <div className="muted" style={{ fontSize: '0.85rem' }}>{t('changePassword.confirm')}</div>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            style={{ width: '100%' }}
          />
        </label>
        {error && <p style={{ color: 'var(--lose)' }}>{error}</p>}
        {message && <p style={{ color: 'var(--win)' }}>{message}</p>}
        <button type="submit" className="primary">{t('changePassword.submit')}</button>
      </form>
    </div>
  )
}
