import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Tournaments from './pages/Tournaments'
import TournamentDetail from './pages/TournamentDetail'
import Archive from './pages/Archive'
import Leaderboards from './pages/Leaderboards'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminTournaments from './pages/admin/AdminTournaments'
import AdminTournamentManage from './pages/admin/AdminTournamentManage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="tournaments" element={<Tournaments />} />
            <Route path="tournaments/:id" element={<TournamentDetail />} />
            <Route path="archive" element={<Archive />} />
            <Route path="leaderboards" element={<Leaderboards />} />
            <Route path="players" element={<Players />} />
            <Route path="players/:id" element={<PlayerDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="admin/players" element={<ProtectedRoute><AdminPlayers /></ProtectedRoute>} />
            <Route path="admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />
            <Route path="admin/tournaments/:id" element={<ProtectedRoute><AdminTournamentManage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
