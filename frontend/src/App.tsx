import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, getAccess } from './lib/api'
import type { User } from './types'
import { Shell } from './components/Shell'
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Submissions = lazy(() => import('./pages/Submissions'))
const Judging = lazy(() => import('./pages/Judging'))
const Normalization = lazy(() => import('./pages/Normalization'))
const Integrity = lazy(() => import('./pages/Integrity'))
const Audit = lazy(() => import('./pages/Audit'))
const Results = lazy(() => import('./pages/Results'))
const Gallery = lazy(() => import('./pages/Gallery'))
const JudgeWorkspace = lazy(() => import('./pages/JudgeWorkspace'))
const Certificate = lazy(() => import('./pages/Certificate'))

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(getAccess()))
  const navigate = useNavigate()
  useEffect(() => {
    if (getAccess())
      api<User>('/api/v1/auth/me')
        .then(setUser)
        .catch(() => setUser(null))
        .finally(() => setLoading(false))
    else setLoading(false)
  }, [])
  if (loading)
    return (
      <div className="splash">
        <div className="splash-logo">TF</div>
        <span>Loading TrustForge…</span>
      </div>
    )
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<PageFallback />}>
            <Landing />
          </Suspense>
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/app" />
          ) : (
            <Suspense fallback={<PageFallback />}>
              <Login
                onLogin={(next) => {
                  setUser(next)
                  navigate('/app')
                }}
              />
            </Suspense>
          )
        }
      />
      <Route
        path="/app/*"
        element={
          user ? (
            <Shell
              user={user}
              onLogout={() => setUser(null)}
            >
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route index element={<Dashboard user={user} />} />
                  <Route path="submissions" element={<Submissions user={user} />} />
                  <Route path="judging" element={<RoleGate user={user} roles={['ORGANIZER', 'ADMIN']}><Judging /></RoleGate>} />
                  <Route path="normalization" element={<RoleGate user={user} roles={['ORGANIZER', 'ADMIN']}><Normalization /></RoleGate>} />
                  <Route path="integrity" element={<RoleGate user={user} roles={['ORGANIZER', 'ADMIN']}><Integrity /></RoleGate>} />
                  <Route path="audit" element={<RoleGate user={user} roles={['ORGANIZER', 'ADMIN']}><Audit /></RoleGate>} />
                  <Route path="results" element={<Results user={user} />} />
                  <Route path="gallery" element={<Gallery user={user} />} />
                  <Route path="judge" element={<RoleGate user={user} roles={['JUDGE']}><JudgeWorkspace /></RoleGate>} />
                  <Route path="certificate" element={<Certificate />} />
                  <Route path="*" element={<Navigate to="/app" />} />
                </Routes>
              </Suspense>
            </Shell>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function PageFallback() {
  return (
    <div className="splash" role="status">
      <div className="splash-logo">TF</div>
      <span>Loading workspace…</span>
    </div>
  )
}

function RoleGate({
  user,
  roles,
  children,
}: {
  user: User
  roles: string[]
  children: React.ReactNode
}) {
  return roles.includes(user.role) ? <>{children}</> : <Navigate to="/app" replace />
}
