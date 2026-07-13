import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'

export default function Layout() {
  const { t } = useTranslation()
  const { isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <>
      <nav className="nav">
        <NavLink to="/" className="brand">
          {t('brand')}
        </NavLink>
        <NavLink to="/" end>{t('nav.home')}</NavLink>
        <NavLink to="/tournaments">{t('nav.tournaments')}</NavLink>
        <NavLink to="/archive">{t('nav.archive')}</NavLink>
        <NavLink to="/leaderboards">{t('nav.leaderboards')}</NavLink>
        <NavLink to="/players">{t('nav.players')}</NavLink>
        <span className="spacer" />
        <LanguageSwitcher />
        {isAdmin ? (
          <button onClick={handleLogout}>{t('nav.logout')}</button>
        ) : (
          <NavLink to="/login">{t('nav.login')}</NavLink>
        )}
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
