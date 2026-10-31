import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ClipboardCheck,
  Command,
  FileCheck2,
  Gavel,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  X,
  CircleAlert,
  CheckCircle2,
} from 'lucide-react'
import { Logo } from './Logo'
import { api, logout } from '../lib/api'
import type { User } from '../types'
import type { ToastNotice } from './Primitives'

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }> }
const mainNav: NavItem[] = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/submissions', label: 'Submissions', icon: Boxes },
  { to: '/app/judging', label: 'Judging', icon: Gavel },
  { to: '/app/normalization', label: 'Normalization', icon: BarChart3 },
  { to: '/app/integrity', label: 'Integrity', icon: ShieldAlert },
  { to: '/app/audit', label: 'Audit explorer', icon: GitBranch },
  { to: '/app/results', label: 'Results', icon: FileCheck2 },
  { to: '/app/gallery', label: 'Public gallery', icon: Archive },
]
type PaletteCommand = [string, string, ComponentType<{ size?: number }>]

export function Shell({
  user,
  children,
  onLogout,
}: {
  user: User
  children: React.ReactNode
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('trustforge.theme') !== 'light')
  const [palette, setPalette] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [toast, setToast] = useState<(ToastNotice & { id: number }) | null>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notifications, setNotifications] = useState<
    Array<{ id: string; type: string; message: string; createdAt: string; read: boolean }>
  >([])
  const toastTimer = useRef<number | undefined>(undefined)
  const visibleMainNav = mainNav.filter(
    (item) =>
      ['ORGANIZER', 'ADMIN'].includes(user.role) ||
      !['/app/judging', '/app/normalization', '/app/integrity', '/app/audit'].includes(item.to),
  )
  const canJudge = user.role === 'JUDGE'
  const unreadCount = notifications.filter((notification) => !notification.read).length
  const toggleNotifications = () => {
    const opening = !notificationOpen
    setNotificationOpen(opening)
    if (!opening) return
    setNotificationLoading(true)
    api<{ items: typeof notifications }>('/api/v1/notifications')
      .then((response) => setNotifications(response.items))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not load notifications'
        window.dispatchEvent(
          new CustomEvent<ToastNotice>('trustforge:toast', {
            detail: { message, tone: 'error' },
          }),
        )
      })
      .finally(() => setNotificationLoading(false))
  }
  useEffect(() => {
    const onToast = (event: Event) => {
      const notice = (event as CustomEvent<ToastNotice>).detail
      const next = { ...notice, id: Date.now() }
      setToast(next)
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(
        () => setToast((current) => (current?.id === next.id ? null : current)),
        4200,
      )
    }
    window.addEventListener('trustforge:toast', onToast)
    return () => {
      window.removeEventListener('trustforge:toast', onToast)
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('trustforge.theme', dark ? 'dark' : 'light')
  }, [dark])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  const signOut = async () => {
    await logout()
    onLogout()
    navigate('/')
  }
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Link to="/" className="brand-link">
            <Logo />
          </Link>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="event-switcher">
          <div className="event-dot" />
          <div>
            <div className="event-name">TrustForge Demo</div>
            <div className="muted tiny">Demo event · {new Date().getFullYear()}</div>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <nav>
          <div className="nav-label">Workspace</div>
          {visibleMainNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                end={item.to === '/app'}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.label === 'Integrity' && <span className="nav-pulse" />}
              </NavLink>
            )
          })}
          <div className="nav-label space-top">Manage</div>
          {canJudge && (
            <NavLink
              to="/app/judge"
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ClipboardCheck size={17} />
              <span>Judge workspace</span>
            </NavLink>
          )}
          <NavLink
            to="/app/certificate"
            onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={17} />
            <span>Certificate verify</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setPalette(true)}>
            <Command size={17} />
            <span>Command palette</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="nav-item" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <div className="profile">
            <div className="avatar">{user.name.slice(0, 1)}</div>
            <div className="profile-copy">
              <strong>{user.name}</strong>
              <span>{user.role.toLowerCase()}</span>
            </div>
            <button className="icon-button" title="Sign out" onClick={signOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="crumb">
            <span className="muted">Workspace</span>
            <span>/</span>
            <strong>
              {visibleMainNav.find(
                (n) => location.pathname === n.to || location.pathname.startsWith(n.to + '/'),
              )?.label ?? (location.pathname === '/app/judge' ? 'Judge workspace' : 'Control room')}
            </strong>
          </div>
          <div className="top-actions">
            <button className="search-button" onClick={() => setPalette(true)}>
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button notification"
              type="button"
              aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={notificationOpen}
              aria-controls="notification-panel"
              onClick={toggleNotifications}
            >
              <Bell size={17} />
              {unreadCount > 0 && <i />}
            </button>
            {notificationOpen && (
              <div className="notification-panel" id="notification-panel" role="region" aria-label="Notifications">
                <div className="notification-panel-heading">
                  <strong>Notifications</strong>
                  <button className="icon-button" type="button" aria-label="Close notifications" onClick={() => setNotificationOpen(false)}>
                    <X size={15} />
                  </button>
                </div>
                {notificationLoading ? (
                  <p className="muted notification-empty">Loading updates…</p>
                ) : notifications.length ? (
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <div className="notification-item" key={notification.id}>
                        <span className={`notification-mark ${notification.read ? '' : 'unread'}`} />
                        <div>
                          <strong>{notification.type.replaceAll('_', ' ')}</strong>
                          <p>{notification.message}</p>
                          <time>{new Date(notification.createdAt).toLocaleString()}</time>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted notification-empty">You’re all caught up.</p>
                )}
              </div>
            )}
          </div>
        </header>
        <div className="page">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <AnimatePresence>
        {toast && (
          <motion.aside
            className={`tf-toast ${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toast.tone === 'error' ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
            <span>{toast.message}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={15} />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
      {palette && (
        <CommandPalette
          close={() => setPalette(false)}
          navigate={(path) => {
            setPalette(false)
            navigate(path)
          }}
        />
      )}
    </div>
  )
}
function CommandPalette({
  close,
  navigate,
}: {
  close: () => void
  navigate: (path: string) => void
}) {
  const [query, setQuery] = useState('')
  const commands: PaletteCommand[] = [
    ['Overview', '/app', LayoutDashboard],
    ['Submissions', '/app/submissions', Boxes],
    ['Judging', '/app/judging', Gavel],
    ['Normalization', '/app/normalization', BarChart3],
    ['Judging Integrity', '/app/integrity', ShieldAlert],
    ['Audit explorer', '/app/audit', GitBranch],
    ['Verified results', '/app/results', FileCheck2],
    ['Public gallery', '/app/gallery', Archive],
  ]
  const filtered = commands.filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Search workspace commands"
            placeholder="Search workspace…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') close()
              if (event.key === 'Enter' && filtered[0]) navigate(filtered[0][1])
            }}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-label">Navigate to</div>
        {filtered.map(([name, path, Icon]) => (
          <button className="palette-row" key={path} onClick={() => navigate(path)}>
            <span className="palette-icon">
              <Icon size={16} />
            </span>
            <span>{name}</span>
            <span className="muted shortcut">↵</span>
          </button>
        ))}
        {!filtered.length && <p className="muted palette-empty">No pages match that search.</p>}
      </div>
    </div>
  )
}
