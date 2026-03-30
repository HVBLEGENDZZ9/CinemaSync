import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import RoomPage from './pages/RoomPage'

function AuthGate({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <span className="spinner" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}

function LoginGate({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <span className="spinner" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/room" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LoginGate>
            <LoginPage />
          </LoginGate>
        }
      />
      <Route
        path="/room"
        element={
          <AuthGate>
            <RoomPage />
          </AuthGate>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
