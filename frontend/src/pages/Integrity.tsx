import { useEffect, useState } from 'react'
import {
  CircleAlert,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import { api } from '../lib/api'
import { Badge, Card, Empty, ErrorState, Loading, SectionTitle, Stat, notify } from '../components/Primitives'
export default function Integrity() {
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const [reviewing, setReviewing] = useState<string | null>(null)
  useEffect(() => {
    api<any>('/api/v1/anomalies')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])
  if (error && !data) return <ErrorState message={error} />
  if (!data) return <Loading />
  const visibleItems = data.items.filter(
    (item: any) => showResolved || item.status !== 'RESOLVED',
  )
  const review = async (id: string) => {
    setReviewing(id)
    try {
      await api(`/api/v1/anomalies/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Reviewed in the integrity workspace.' }),
      })
      setData((current: any) => ({
        ...current,
        items: current.items.map((item: any) =>
          item.id === id ? { ...item, status: 'RESOLVED' } : item,
        ),
        summary: {
          ...current.summary,
          openReviews: Math.max(0, current.summary.openReviews - 1),
          resolved: current.summary.resolved + 1,
        },
      }))
      notify('Review decision saved to the audit history.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save review'
      notify(message, 'error')
    } finally {
      setReviewing(null)
    }
  }
  return (
    <div>
      <SectionTitle
        eyebrow="JUDGING / INTEGRITY CENTER"
        title="Potential anomalies"
        description="Evidence-led signals for human review. No heuristic is an accusation."
        action={
          <button className="button button-outline" type="button" onClick={() => setShowResolved((current) => !current)}>
            <Filter size={15} /> {showResolved ? 'Show open only' : 'Include reviewed'}
          </button>
        }
      />
      <div className="stats-grid anomaly-stats">
        <Stat
          label="Potential anomalies"
          value={data.summary.potential}
          meta="requires review"
          icon={ShieldAlert}
          tone="amber"
        />
        <Stat
          label="Open reviews"
          value={data.summary.openReviews}
          meta="no auto-disqualifications"
          icon={Eye}
          tone="violet"
        />
        <Stat
          label="Resolved"
          value={data.summary.resolved}
          meta="this event"
          icon={Clock3}
          tone="green"
        />
        <Stat
          label="Normal evaluations"
          value="±1.55σ"
          meta="review threshold"
          icon={SlidersHorizontal}
          tone="blue"
        />
      </div>
      <div className="content-grid two-thirds">
        <Card>
          <SectionTitle eyebrow="REVIEW QUEUE" title="Signals needing context" />
          <div className="anomaly-list">
            {visibleItems.map((a: any) => (
              <div className="anomaly-row" key={a.id}>
                <div className={`anomaly-severity ${a.severity.toLowerCase()}`}>
                  <CircleAlert size={17} />
                </div>
                <div className="anomaly-main">
                  <div>
                    <strong>{a.type.replaceAll('_', ' ')}</strong>
                    <Badge tone={a.severity === 'HIGH' ? 'red' : 'amber'}>{a.severity}</Badge>
                  </div>
                  <span className="muted">
                    {a.judgeId} · {a.projectId} ·{' '}
                    {new Date(a.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <p>{a.evidence}</p>
                </div>
                <div className="anomaly-score">
                  <span className="eyebrow">OBSERVED</span>
                  <strong>
                    {a.observed > 0 ? '+' : ''}
                    {a.observed}σ
                  </strong>
                  <span className="muted tiny">confidence {a.confidence}</span>
                </div>
                {a.status === 'RESOLVED' ? (
                  <Badge tone="green">Reviewed</Badge>
                ) : (
                  <button
                    className="icon-button review-button"
                    type="button"
                    aria-label={`Mark ${a.type.replaceAll('_', ' ')} as reviewed`}
                    title="Mark as reviewed"
                    disabled={reviewing === a.id}
                    onClick={() => void review(a.id)}
                  >
                    <CheckCircle2 size={17} />
                  </button>
                )}
              </div>
            ))}
            {!visibleItems.length && <Empty label="No signals in this view" />}
          </div>
        </Card>
        <Card className="anomaly-side">
          <SectionTitle eyebrow="LANGUAGE MATTERS" title="Review, don’t accuse." />
          <div className="language-card bad">
            <span>✕</span>
            <div>
              <strong>“Judge is cheating.”</strong>
              <small>Unsupported conclusion</small>
            </div>
          </div>
          <div className="language-card good">
            <span>✓</span>
            <div>
              <strong>“Potential scoring anomaly detected.”</strong>
              <small>Evidence available for review</small>
            </div>
          </div>
          <div className="evidence-note">
            <ShieldAlert size={16} />
            <p>
              Signals surface unusual patterns. Organizers decide what they mean, and every decision
              becomes an auditable event.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
