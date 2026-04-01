import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import RoomPage from './pages/RoomPage'

function AuthGate({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ast-void)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <span className="spinner" style={{ width: '24px', height: '24px' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--ast-muted)', letterSpacing: '0.1em' }}>
            Loading
          </span>
        </div>
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
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ast-void)',
        }}
      >
        <span className="spinner" style={{ width: '24px', height: '24px' }} />
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
