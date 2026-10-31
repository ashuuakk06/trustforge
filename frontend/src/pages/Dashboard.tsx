import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Clock3,
  Gavel,
  ShieldCheck,
  Users,
  Vote,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { User } from '../types'
import {
  Badge,
  Card,
  ErrorState,
  Loading,
  Meter,
  SectionTitle,
  Stat,
  Verified,
} from '../components/Primitives'

type Data = {
  event: { name: string; state: string; judgingDeadline: string }
  stats: {
    participants: number
    submissions: number
    judges: number
    votes: number
    anomalies: number
  }
  judging: { completed: number; pending: number; assigned: number; completionPercent: number }
  integrity: {
    assignmentFairness: number
    evaluationCompletion: number
    scoreConsistency: number
    auditIntegrity: boolean
  }
  recentActivity: Array<{
    id: string
    action: string
    actor: string
    entity: string
    timestamp: string
  }>
}

export default function Dashboard({ user }: { user: User }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Data>('/api/v1/dashboard')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!data) return <Loading />

  const stats = data.stats
  const deadline = new Date(data.event.judgingDeadline)
  const deadlineText = Number.isNaN(deadline.getTime())
    ? 'Not set'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        deadline,
      )

  const workspace =
    user.role === 'JUDGE'
      ? { to: '/app/judge', label: 'Open judge workspace' }
      : user.role === 'PARTICIPANT'
        ? { to: '/app/submissions', label: 'Open submissions' }
        : { to: '/app/judging', label: 'Open judging workspace' }

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow accent-text">EVENT OVERVIEW</div>
          <h1>TrustForge dashboard</h1>
          <p className="muted">A current view of the demo event and its judging progress.</p>
        </div>
        <div className="heading-actions">
          <Badge tone="green">
            <span className="live-dot" /> {data.event.state.replaceAll('_', ' ')}
          </Badge>
          {['ORGANIZER', 'ADMIN'].includes(user.role) && (
            <Link to="/app/audit" className="button button-outline">
              <Clock3 size={15} /> Audit timeline
            </Link>
          )}
        </div>
      </div>

      <div className="event-banner">
        <div className="event-banner-mark">
          <ShieldCheck size={24} />
        </div>
        <div>
          <span className="eyebrow">ACTIVE EVENT</span>
          <h3>{data.event.name}</h3>
          <span className="muted">Judging closes {deadlineText}</span>
        </div>
        <div className="event-banner-side">
          <span className="muted tiny">INTEGRITY STATUS</span>
          <strong>
            <span className="status-dot green" />
            {data.integrity.auditIntegrity ? 'Audit verified' : 'Review needed'}
          </strong>
        </div>
        <ArrowUpRight size={18} className="event-arrow" />
      </div>

      <div className="stats-grid">
        <Stat
          label="Participants"
          value={stats.participants}
          meta="Registered for this event"
          icon={Users}
          tone="violet"
          delay={0.02}
        />
        <Stat
          label="Projects"
          value={stats.submissions}
          meta="Submissions in the demo"
          icon={Boxes}
          tone="blue"
          delay={0.08}
        />
        <Stat
          label="Judges"
          value={stats.judges}
          meta="Demo judge accounts"
          icon={Gavel}
          tone="cyan"
          delay={0.14}
        />
        <Stat
          label="Community votes"
          value={stats.votes}
          meta="Votes recorded"
          icon={Vote}
          tone="green"
          delay={0.2}
        />
      </div>

      <div className="content-grid two-thirds">
        <Card className="integrity-card">
          <SectionTitle
            eyebrow="LIVE SIGNALS"
            title="Judging integrity overview"
            description="Signals are calculated from the current event data."
            action={
              <Link to="/app/integrity" className="icon-button" aria-label="Open integrity review">
                <ArrowUpRight size={16} />
              </Link>
            }
          />
          <div className="signal-list">
            <Signal
              label="Assignment fairness"
              value={data.integrity.assignmentFairness}
              detail="Workload balance across judges"
            />
            <Signal
              label="Evaluation completion"
              value={data.integrity.evaluationCompletion}
              detail={`${data.judging.completed} of ${data.judging.assigned} assigned reviews`}
            />
            <Signal
              label="Score consistency"
              value={data.integrity.scoreConsistency}
              detail={`Across ${stats.judges} judge profiles`}
            />
            <Signal
              label="Audit integrity"
              value={data.integrity.auditIntegrity ? 100 : 0}
              detail={
                data.integrity.auditIntegrity ? 'Hash chain verified' : 'Verification needs review'
              }
              verified={data.integrity.auditIntegrity}
            />
          </div>
          <div className="integrity-footer">
            <Verified>Computed by the API</Verified>
            <span className="muted tiny">Refresh the page to update</span>
          </div>
        </Card>

        <Card className="progress-card">
          <SectionTitle eyebrow="JUDGING WINDOW" title="Review progress" />
          <div className="progress-ring">
            <div>
              <strong>{data.judging.completionPercent}%</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="progress-details">
            <div>
              <span className="status-dot green" />
              Completed <strong>{data.judging.completed}</strong>
            </div>
            <div>
              <span className="status-dot amber" />
              Pending <strong>{data.judging.pending}</strong>
            </div>
          </div>
          <Link to={workspace.to} className="button button-ghost button-full">
            {workspace.label} <ArrowUpRight size={14} />
          </Link>
        </Card>
      </div>

      <div className="content-grid two-thirds">
        <Card>
          <SectionTitle
            eyebrow="AUDIT TRAIL"
            title="Recent activity"
            action={
              <Link to="/app/audit" className="link-button">
                View all <ArrowUpRight size={14} />
              </Link>
            }
          />
          <div className="activity-list">
            {data.recentActivity.map((item) => (
              <div className="activity-row" key={item.id}>
                <div className="activity-icon">
                  <Activity size={15} />
                </div>
                <div>
                  <strong>{item.action.replaceAll('_', ' ')}</strong>
                  <span className="muted">
                    {item.actor} · {item.entity}
                  </span>
                </div>
                <span className="activity-time muted">
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <Verified />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="NEXT STEP" title="Review integrity signals" />
          <div className="next-action">
            <div className="next-action-number">01</div>
            <div>
              <strong>
                {stats.anomalies ? 'Review score patterns' : 'Check the audit history'}
              </strong>
              <p className="muted">
                {stats.anomalies
                  ? `${stats.anomalies} scoring signals are available for review.`
                  : 'The current demo data has no open scoring signals.'}
              </p>
              <Link to={stats.anomalies ? '/app/integrity' : '/app/audit'} className="link-button">
                Open review <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Signal({
  label,
  value,
  detail,
  verified,
}: {
  label: string
  value: number
  detail: string
  verified?: boolean
}) {
  return (
    <div className="signal-row">
      <div className="signal-label">
        <strong>{label}</strong>
        <span className="muted">{detail}</span>
      </div>
      <div className="signal-score">
        <strong>{value}%</strong>
        {verified && <Verified />}
      </div>
      <Meter value={value} />
    </div>
  )
}
