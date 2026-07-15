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
import Activity from './pages/Activity'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import ProtectedRoute from './components/ProtectedRoute'
import AdminPlayers from './pages/admin/AdminPlayers'
import AdminTournaments from './pages/admin/AdminTournaments'
import AdminTournamentManage from './pages/admin/AdminTournamentManage'
import AdminNews from './pages/admin/AdminNews'
import AdminEvents from './pages/admin/AdminEvents'
import AdminEventManage from './pages/admin/AdminEventManage'

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
            <Route path="activity" element={<Activity />} />
            <Route path="login" element={<Login />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="admin/players" element={<ProtectedRoute><AdminPlayers /></ProtectedRoute>} />
            <Route path="admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />
            <Route path="admin/tournaments/:id" element={<ProtectedRoute><AdminTournamentManage /></ProtectedRoute>} />
            <Route path="admin/news" element={<ProtectedRoute><AdminNews /></ProtectedRoute>} />
            <Route path="admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
            <Route path="admin/events/:id" element={<ProtectedRoute><AdminEventManage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
