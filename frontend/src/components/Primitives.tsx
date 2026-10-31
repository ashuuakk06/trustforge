import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, CircleAlert } from 'lucide-react'

export type ToastNotice = { message: string; tone: 'success' | 'error' | 'info' }

export function notify(message: string, tone: ToastNotice['tone'] = 'success') {
  window.dispatchEvent(new CustomEvent<ToastNotice>('trustforge:toast', { detail: { message, tone } }))
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'violet'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
export function Card({
  children,
  className = '',
  onClick,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  delay?: number
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.16 } }}
      onClick={onClick}
      className={`card ${className}`}
    >
      {children}
    </motion.div>
  )
}
export function Stat({
  label,
  value,
  meta,
  icon: Icon,
  tone = 'blue',
  delay = 0,
}: {
  label: string
  value: string | number
  meta?: string
  icon?: ComponentType<{ size?: number }>
  tone?: string
  delay?: number
}) {
  return (
    <Card className="stat" delay={delay}>
      <div className={`stat-icon ${tone}`}>{Icon && <Icon size={17} />}</div>
      <div>
        <div className="eyebrow">{label}</div>
        <div className="stat-value">
          <AnimatedValue value={value} />
        </div>
        {meta && <div className="muted stat-meta">{meta}</div>}
      </div>
    </Card>
  )
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow accent-text">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function Loading() {
  return (
    <div className="loading-skeletons" role="status" aria-label="Loading data">
      <span className="sr-only">Loading verified data…</span>
      <div className="skeleton-heading">
        <i />
        <i />
      </div>
      <div className="skeleton-stat-grid" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="skeleton-panel" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
    </div>
  )
}

function AnimatedValue({ value }: { value: string | number }) {
  const numeric = typeof value === 'number' ? value : Number.NaN
  const [display, setDisplay] = useState<string | number>(typeof value === 'number' ? 0 : value)

  useEffect(() => {
    if (!Number.isFinite(numeric)) {
      setDisplay(value)
      return
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplay(value)
      return
    }
    const started = performance.now()
    const duration = 650
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(numeric * eased).toLocaleString())
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [numeric, value])

  return <span aria-label={String(value)}>{display}</span>
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="empty error-state" role="alert">
      <CircleAlert size={24} />
      <strong>Couldn’t load this view</strong>
      <span>{message}</span>
    </div>
  )
}
export function Empty({ label = 'No records yet' }: { label?: string }) {
  return (
    <div className="empty">
      <span>{label}</span>
    </div>
  )
}
export function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button button-${variant}`}
    >
      {children}
    </button>
  )
}
export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="meter-wrap">
      {label && (
        <div className="meter-label">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div
        className="meter"
        role="progressbar"
        aria-label={label ?? 'Progress'}
        aria-valuenow={Math.min(100, Math.max(0, value))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}
export function Verified({ children = 'Verified' }: { children?: ReactNode }) {
  return (
    <span className="verified">
      <Check size={13} />
      {children}
    </span>
  )
}
