import { FormEvent, useEffect, useRef, useState } from 'react'
import { Activity, ArrowUpRight, CheckCircle2, ExternalLink, GitBranch, Loader2, Search, Send, Users, X } from 'lucide-react'

import { createSubmission, subscribeToSubmission, api } from '../lib/api'
import { Badge, Button, Card, Empty, ErrorState, Loading, SectionTitle } from '../components/Primitives'
import type { Project, SubmissionDraft, SubmissionEvent } from '../types'

const initialDraft: SubmissionDraft = { name: '', track: 'Developer tools', description: '', problemStatement: '', solution: '', technology: 'Java · Spring Boot · React · PostgreSQL', team: '', repository: 'https://github.com/', demo: 'https://', supportingLinks: [] }

export default function Submissions() {
  const [items, setItems] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<SubmissionDraft>(initialDraft)
  const [busy, setBusy] = useState(false)
  const [liveSubmission, setLiveSubmission] = useState<{ id: string; name: string; events: SubmissionEvent[] }>()
  const stopStream = useRef<(() => void) | undefined>(undefined)

  const load = () => api<{ items: Project[] }>('/api/v1/submissions').then((data) => setItems(data.items)).catch((err) => setError(err instanceof Error ? err.message : 'Could not load submissions'))
  useEffect(() => { void load(); return () => stopStream.current?.() }, [])

  const update = (key: keyof SubmissionDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); stopStream.current?.()
    try {
      const result = await createSubmission(draft)
      setShowForm(false)
      setLiveSubmission({ id: result.submissionId, name: draft.name, events: result.submission.events ?? [] })
      stopStream.current = subscribeToSubmission(result.submissionId, (next) => {
        setLiveSubmission((current) => current ? { ...current, events: [...current.events.filter((item) => item.sequence !== next.sequence), next].sort((a, b) => a.sequence - b.sequence) } : current)
        if (next.progress === 100) { window.setTimeout(() => { stopStream.current?.(); void load() }, 500) }
      }, (streamError) => setError(streamError.message))
      setDraft(initialDraft)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit project') }
    finally { setBusy(false) }
  }

  const shown = items.filter((project) => Object.values(project).join(' ').toLowerCase().includes(q.toLowerCase()))
  return <div>
    <SectionTitle eyebrow="EVENT / SUBMISSIONS" title="Project submissions" description="Submit a real project and watch the server validate, fingerprint, persist, and audit it live." action={<div className="heading-actions"><button className="button button-outline" type="button"><GitBranch size={15}/> Export CSV</button><Button onClick={() => setShowForm(true)}>+ New submission</Button></div>} />
    {error && <div className="form-error live-error">{error}</div>}
    {liveSubmission && <LiveSubmissionCard submission={liveSubmission} onDismiss={() => { stopStream.current?.(); setLiveSubmission(undefined) }} />}
    {showForm && <SubmissionForm draft={draft} busy={busy} update={update} onSubmit={submit} onCancel={() => setShowForm(false)} />}
    <div className="toolbar"><div className="search-field"><Search size={16}/><input placeholder="Search projects, teams, tracks…" value={q} onChange={(event) => setQ(event.target.value)}/></div><select><option>All tracks</option><option>Civic infrastructure</option><option>Climate & sustainability</option></select><select><option>Newest first</option><option>Alphabetical</option></select></div>
    {!items.length && !error ? <Loading/> : <div className="project-grid">{shown.map((project) => <Card className="project-card" key={project.id}><div className="project-card-top"><Badge tone={project.status === 'SUBMITTED' ? 'green' : 'amber'}>{project.status}</Badge><span className="muted tiny">v{project.version} · {project.id}</span></div><h3>{project.name}</h3><p>{project.description}</p><div className="project-meta"><span><Users size={14}/>{project.team}</span><span className="track-dot"/> <span>{project.track}</span></div><div className="tag-row">{project.technology.split(' · ').map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div><div className="project-card-footer"><a href={project.repository} target="_blank" rel="noreferrer"><GitBranch size={14}/> Repository</a><a href={project.demo} target="_blank" rel="noreferrer">Demo <ExternalLink size={13}/></a><button className="icon-button" type="button"><ArrowUpRight size={15}/></button></div></Card>)}</div>}
    {!shown.length && !!items.length && <Empty label="No projects match that search"/>}
  </div>
}

function SubmissionForm({ draft, busy, update, onSubmit, onCancel }: { draft: SubmissionDraft; busy: boolean; update: (key: keyof SubmissionDraft, value: string) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  return <Card className="submission-form-card"><div className="submission-form-heading"><div><div className="eyebrow accent-text">LIVE SUBMISSION PIPELINE</div><h2>Send a project to judging</h2><p className="muted">The API will validate the record, create a content fingerprint, persist the submission, and append an audit event.</p></div><button className="icon-button" type="button" onClick={onCancel}><X size={18}/></button></div><form className="submission-form" onSubmit={onSubmit}><div className="submission-form-grid"><Field label="Project name" value={draft.name} onChange={(value) => update('name', value)} required/><Field label="Track" value={draft.track} onChange={(value) => update('track', value)} required/><Field label="Team members" value={draft.team} onChange={(value) => update('team', value)} required/><Field label="Technology" value={draft.technology} onChange={(value) => update('technology', value)} required/><Field label="Repository URL" value={draft.repository} onChange={(value) => update('repository', value)} required/><Field label="Live demo URL" value={draft.demo} onChange={(value) => update('demo', value)} required/></div><Field label="Short description" value={draft.description} onChange={(value) => update('description', value)} multiline required/><Field label="Problem statement" value={draft.problemStatement} onChange={(value) => update('problemStatement', value)} multiline required/><Field label="Solution" value={draft.solution} onChange={(value) => update('solution', value)} multiline required/><div className="submission-form-actions"><button className="button button-ghost" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? <><Loader2 size={15} className="spin"/> Starting live pipeline…</> : <><Send size={15}/> Submit project</>}</button></div></form></Card>
}

function Field({ label, value, onChange, multiline = false, required = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; required?: boolean }) {
  return <label className="submission-field"><span>{label}</span>{multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} required={required}/> : <input value={value} onChange={(event) => onChange(event.target.value)} required={required}/>}</label>
}

function LiveSubmissionCard({ submission, onDismiss }: { submission: { id: string; name: string; events: SubmissionEvent[] }; onDismiss: () => void }) {
  const latest = submission.events.at(-1)
  const complete = latest?.progress === 100 && latest.status === 'COMPLETED'
  const failed = latest?.status === 'FAILED'
  return <Card className="live-submission-card"><div className="live-submission-header"><div className="live-submission-title"><span className={`live-pulse ${complete ? 'complete' : failed ? 'failed' : ''}`}><Activity size={17}/></span><div><div className="eyebrow accent-text">{complete ? 'PIPELINE COMPLETE' : failed ? 'PIPELINE NEEDS ATTENTION' : 'LIVE PIPELINE'}</div><h2>{submission.name}</h2><p className="muted">{latest?.message ?? 'Waiting for the processing stream…'}</p></div></div><button className="icon-button" type="button" onClick={onDismiss}><X size={17}/></button></div><div className="live-progress"><div className="live-progress-meta"><span>{latest?.stage?.replaceAll('_', ' ') ?? 'QUEUED'}</span><strong>{latest?.progress ?? 0}%</strong></div><div className="meter"><span style={{ width: `${latest?.progress ?? 0}%` }}/></div></div><div className="live-event-list">{submission.events.map((event) => <div className={`live-event ${event.status.toLowerCase()}`} key={event.sequence}><span className="live-event-icon">{event.status === 'COMPLETED' ? <CheckCircle2 size={14}/> : event.status === 'FAILED' ? <X size={14}/> : <Loader2 size={14} className="spin"/>}</span><div><strong>{event.stage.replaceAll('_', ' ')}</strong><p>{event.message}</p></div><time>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div>)}</div><div className="live-submission-footer"><span><span className="status-dot green"/>Persisted event stream</span><code>{submission.id}</code></div></Card>
}
