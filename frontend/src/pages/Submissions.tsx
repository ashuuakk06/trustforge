import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Loader2,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react'

import { createSubmission, pollSubmissionEvents, api } from '../lib/api'
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  notify,
  SectionTitle,
} from '../components/Primitives'
import type { Project, SubmissionDraft, SubmissionEvent } from '../types'
import type { User } from '../types'

const initialDraft: SubmissionDraft = {
  name: '',
  track: 'Developer tools',
  description: '',
  problemStatement: '',
  solution: '',
  technology: 'Java · Spring Boot · React · PostgreSQL',
  team: '',
  repository: 'https://github.com/',
  demo: 'https://example.com',
  supportingLinks: [],
}

export default function Submissions({ user }: { user: User }) {
  const [items, setItems] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [trackFilter, setTrackFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<SubmissionDraft>(initialDraft)
  const [busy, setBusy] = useState(false)
  const [liveSubmission, setLiveSubmission] = useState<{
    id: string
    name: string
    events: SubmissionEvent[]
  }>()
  const stopPolling = useRef<(() => void) | undefined>(undefined)

  const load = () =>
    api<{ items: Project[] }>('/api/v1/submissions')
      .then((data) => {
        setItems(data.items)
        setLoaded(true)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load submissions')
        setLoaded(true)
      })
  useEffect(() => {
    void load()
    return () => stopPolling.current?.()
  }, [])

  const update = (key: keyof SubmissionDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    stopPolling.current?.()
    try {
      const result = await createSubmission(draft)
      setShowForm(false)
      setLiveSubmission({
        id: result.submissionId,
        name: draft.name,
        events: result.submission.events ?? [],
      })
      notify('Submission received. Status updates will appear here.')
      stopPolling.current = pollSubmissionEvents(
        result.submissionId,
        (nextEvents) => {
          setLiveSubmission((current) =>
            current
              ? {
                  ...current,
                  events: [
                    ...current.events.filter(
                      (item) => !nextEvents.some((next) => next.sequence === item.sequence),
                    ),
                    ...nextEvents,
                  ].sort((a, b) => a.sequence - b.sequence),
                }
              : current,
          )
        },
        () => {
          window.setTimeout(() => {
            stopPolling.current?.()
            void load()
          }, 500)
        },
        (pollError) => {
          setError(pollError.message)
          notify(pollError.message, 'error')
        },
      )
      setDraft(initialDraft)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not submit project'
      setError(message)
      notify(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const shown = items
    .filter(
      (project) =>
        (trackFilter === 'all' || project.track === trackFilter) &&
        Object.values(project).join(' ').toLowerCase().includes(q.toLowerCase()),
    )
    .sort((left, right) =>
      sortOrder === 'alphabetical'
        ? left.name.localeCompare(right.name)
        : items.indexOf(right) - items.indexOf(left),
    )
  const exportCsv = () => {
    const columns = ['id', 'name', 'track', 'team', 'status', 'technology', 'repository', 'demo'] as const
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const csv = [columns.join(','), ...shown.map((project) => columns.map((key) => escape(project[key])).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'trustforge-submissions.csv'
    link.click()
    URL.revokeObjectURL(url)
    notify(`Exported ${shown.length} project${shown.length === 1 ? '' : 's'} to CSV.`, 'info')
  }
  return (
    <div>
      <SectionTitle
        eyebrow="EVENT / SUBMISSIONS"
        title="Project submissions"
        description="Submit a project and follow its validation, fingerprint, database write, and audit steps."
        action={
          <div className="heading-actions">
            <button className="button button-outline" type="button" onClick={exportCsv}>
              <GitBranch size={15} /> Export CSV
            </button>
            {['PARTICIPANT', 'ORGANIZER', 'ADMIN'].includes(user.role) && (
              <Button onClick={() => setShowForm(true)}>New submission</Button>
            )}
          </div>
        }
      />
      {error && <div className="form-error live-error">{error}</div>}
      {liveSubmission && (
        <LiveSubmissionCard
          submission={liveSubmission}
          onDismiss={() => {
            stopPolling.current?.()
            setLiveSubmission(undefined)
          }}
        />
      )}
      {showForm && (
        <SubmissionForm
          draft={draft}
          busy={busy}
          update={update}
          onSubmit={submit}
          onCancel={() => setShowForm(false)}
        />
      )}
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search projects, teams, and tracks"
            placeholder="Search projects, teams, tracks…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <select aria-label="Filter by track" value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
          <option value="all">All tracks</option>
          {Array.from(new Set(items.map((project) => project.track))).sort().map((track) => (
            <option key={track} value={track}>{track}</option>
          ))}
        </select>
        <select aria-label="Sort projects" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>
      {!loaded ? (
        <Loading />
      ) : items.length ? (
        <div className="project-grid">
          {shown.map((project, index) => (
            <Card className="project-card" key={project.id} delay={Math.min(index * 0.05, 0.3)}>
              <div className="project-card-top">
                <Badge tone={project.status === 'SUBMITTED' ? 'green' : 'amber'}>
                  {project.status}
                </Badge>
                <span className="muted tiny">
                  v{project.version} · {project.id}
                </span>
              </div>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <div className="project-meta">
                <span>
                  <Users size={14} />
                  {project.team}
                </span>
                <span className="track-dot" /> <span>{project.track}</span>
              </div>
              <div className="tag-row">
                {project.technology.split(' · ').map((technology) => (
                  <span className="tag" key={technology}>
                    {technology}
                  </span>
                ))}
              </div>
              <div className="project-card-footer">
                <a href={project.repository} target="_blank" rel="noreferrer">
                  <GitBranch size={14} /> Repository
                </a>
                <a href={project.demo} target="_blank" rel="noreferrer">
                  Demo <ExternalLink size={13} />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty label="No projects have been submitted yet" />
      )}
      {!shown.length && !!items.length && <Empty label="No projects match that search" />}
    </div>
  )
}

function SubmissionForm({
  draft,
  busy,
  update,
  onSubmit,
  onCancel,
}: {
  draft: SubmissionDraft
  busy: boolean
  update: (key: keyof SubmissionDraft, value: string) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}) {
  return (
    <Card className="submission-form-card">
      <div className="submission-form-heading">
        <div>
          <div className="eyebrow accent-text">SUBMISSION PIPELINE</div>
          <h2>Send a project to judging</h2>
          <p className="muted">
            The API validates the record, creates a content fingerprint, stores the submission in
            PostgreSQL, and appends an audit event. This page checks for updates every 1.2 seconds.
          </p>
        </div>
        <button className="icon-button" type="button" aria-label="Close submission form" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>
      <form className="submission-form" onSubmit={onSubmit}>
        <div className="submission-form-grid">
          <Field
            label="Project name"
            value={draft.name}
            onChange={(value) => update('name', value)}
            required
          />
          <Field
            label="Track"
            value={draft.track}
            onChange={(value) => update('track', value)}
            required
          />
          <Field
            label="Team members"
            value={draft.team}
            onChange={(value) => update('team', value)}
            required
          />
          <Field
            label="Technology"
            value={draft.technology}
            onChange={(value) => update('technology', value)}
            required
          />
          <Field
            label="Repository URL"
            value={draft.repository}
            onChange={(value) => update('repository', value)}
            required
          />
          <Field
            label="Live demo URL"
            value={draft.demo}
            onChange={(value) => update('demo', value)}
            required
          />
        </div>
        <Field
          label="Short description"
          value={draft.description}
          onChange={(value) => update('description', value)}
          multiline
          required
        />
        <Field
          label="Problem statement"
          value={draft.problemStatement}
          onChange={(value) => update('problemStatement', value)}
          multiline
          required
        />
        <Field
          label="Solution"
          value={draft.solution}
          onChange={(value) => update('solution', value)}
          multiline
          required
        />
        <div className="submission-form-actions">
          <button className="button button-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={15} className="spin" /> Starting live pipeline…
              </>
            ) : (
              <>
                <Send size={15} /> Submit project
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  required?: boolean
}) {
  return (
    <label className="submission-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      ) : (
        <input
          type={label.endsWith('URL') ? 'url' : 'text'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      )}
    </label>
  )
}

function LiveSubmissionCard({
  submission,
  onDismiss,
}: {
  submission: { id: string; name: string; events: SubmissionEvent[] }
  onDismiss: () => void
}) {
  const latest = submission.events.at(-1)
  const complete = latest?.progress === 100 && latest.status === 'COMPLETED'
  const failed = latest?.status === 'FAILED'
  return (
    <Card className="live-submission-card">
      <div className="live-submission-header">
        <div className="live-submission-title">
          <span className={`live-pulse ${complete ? 'complete' : failed ? 'failed' : ''}`}>
            <Activity size={17} />
          </span>
          <div>
            <div className="eyebrow accent-text">
              {complete
                ? 'PIPELINE COMPLETE'
                : failed
                  ? 'PIPELINE NEEDS ATTENTION'
                  : 'LIVE PIPELINE'}
            </div>
            <h2>{submission.name}</h2>
            <p className="muted">{latest?.message ?? 'Waiting for the first status update…'}</p>
          </div>
        </div>
        <button className="icon-button" type="button" onClick={onDismiss}>
          <X size={17} />
        </button>
      </div>
      <div className="live-progress">
        <div className="live-progress-meta">
          <span>{latest?.stage?.replaceAll('_', ' ') ?? 'QUEUED'}</span>
          <strong>{latest?.progress ?? 0}%</strong>
        </div>
        <div className="meter">
          <span style={{ width: `${latest?.progress ?? 0}%` }} />
        </div>
      </div>
      <div className="live-event-list">
        {submission.events.map((event) => (
          <div className={`live-event ${event.status.toLowerCase()}`} key={event.sequence}>
            <span className="live-event-icon">
              {event.status === 'COMPLETED' ? (
                <CheckCircle2 size={14} />
              ) : event.status === 'FAILED' ? (
                <X size={14} />
              ) : (
                <Loader2 size={14} className="spin" />
              )}
            </span>
            <div>
              <strong>{event.stage.replaceAll('_', ' ')}</strong>
              <p>{event.message}</p>
            </div>
            <time>
              {new Date(event.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </time>
          </div>
        ))}
      </div>
      <div className="live-submission-footer">
        <span>
          <span className="status-dot green" />
          PostgreSQL status polling
        </span>
        <code>{submission.id}</code>
      </div>
    </Card>
  )
}
