import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Obalí admin stránky — nepřihlášeného přesměruje na login.
export default function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}
