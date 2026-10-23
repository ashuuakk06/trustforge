import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Send, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import { Badge, Button, Card, ErrorState, Loading, SectionTitle, Verified } from '../components/Primitives'

type Project = { id: string; name: string; track: string; description: string; repository: string; demo: string; version: number }
type Evaluation = { id: string; projectId: string; scores: Record<string, number>; rawScore: number }
type Criterion = { name: string; key: string; weight: number }
type Workspace = { items: Evaluation[]; assignedProjects: Project[]; rubric: { version: string; totalWeight: number; criteria: Criterion[] }; event?: { judgingDeadline?: string } }

const initialScores: Record<string, string> = { innovation: '8.5', technicalQuality: '9', impact: '7.5', ux: '8', feasibility: '9' }
const criterionKey = (name: string) => name === 'Technical Quality' ? 'technicalQuality' : name.toLowerCase()

export default function JudgeWorkspace() {
  const [data, setData] = useState<Workspace | null>(null)
  const [selected, setSelected] = useState('')
  const [scores, setScores] = useState(initialScores)
  const [comment, setComment] = useState('Strong evidence of user value and a thoughtful implementation.')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Workspace>('/api/v1/evaluations').then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Could not load assignments'))
  }, [])

  useEffect(() => {
    if (!data) return
    if (!data.assignedProjects.some((project) => project.id === selected)) setSelected(data.assignedProjects[0]?.id ?? '')
  }, [data, selected])

  useEffect(() => {
    if (!data || !selected) return
    const existing = data.items.find((evaluation) => evaluation.projectId === selected)
    if (existing) setScores(Object.fromEntries(Object.entries(existing.scores).map(([key, value]) => [key, String(value)])))
    else setScores(initialScores)
  }, [data, selected])

  const project = data?.assignedProjects.find((item) => item.id === selected)
  const completed = useMemo(() => new Set(data?.items.map((item) => item.projectId) ?? []), [data])
  const reviewedCount = data?.assignedProjects.filter((item) => completed.has(item.id)).length ?? 0
  const progress = data?.assignedProjects.length ? Math.round(reviewedCount * 100 / data.assignedProjects.length) : 0
  const weightedScore = data?.rubric.criteria.reduce((total, criterion) => total + Number(scores[criterionKey(criterion.name)] ?? 0) * criterion.weight, 0) ?? 0
  const deadline = data?.event?.judgingDeadline ? new Date(data.event.judgingDeadline).toLocaleString() : 'See event schedule'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      const savedEvaluation = await api<Evaluation>('/api/v1/evaluations', {
        method: 'POST',
        body: JSON.stringify({ projectId: selected, scores, comment }),
      })
      setData((current) => current ? { ...current, items: [...current.items.filter((item) => item.projectId !== selected), savedEvaluation] } : current)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the evaluation')
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) return <ErrorState message={error} />
  if (!data) return <Loading />

  return <div>
    <div className="judge-header">
      <div><div className="eyebrow accent-text">JUDGE WORKSPACE / ASSIGNED PROJECTS</div><h1>Make the call carefully.</h1><p className="muted">Your rubric, your evidence, one immutable submission version.</p></div>
      <div className="judge-progress"><span className="muted">{reviewedCount} of {data.assignedProjects.length} reviewed</span><div className="small-progress"><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
    </div>
    <div className="judge-layout">
      <Card className="assigned-list">
        <SectionTitle eyebrow="YOUR QUEUE" title="Assigned projects" />
        {data.assignedProjects.length === 0 ? <p className="muted">No projects are assigned to this judge account yet.</p> : <div className="assigned-items">{data.assignedProjects.map((item) => <button key={item.id} onClick={() => { setSelected(item.id); setSaved(false); setError('') }} className={`assigned-item ${selected === item.id ? 'selected' : ''}`}><div className="assigned-art">{item.id.slice(-2)}</div><div><strong>{item.name}</strong><span className="muted">{item.track}</span></div><span className={`status-dot ${completed.has(item.id) ? 'green' : 'amber'}`} /></button>)}</div>}
        <div className="judge-deadline"><Clock3 size={16} /><div><strong>Deadline</strong><span className="muted">{deadline}</span></div></div>
      </Card>
      {project ? <Card className="evaluation-card">
        <div className="evaluation-toolbar"><span className="back-link">Assigned project</span><Badge tone={completed.has(project.id) ? 'green' : 'neutral'}>Submission v{project.version} locked</Badge></div>
        <div className="evaluation-project"><div className="eyebrow accent-text">{project.id} · {project.track.toUpperCase()}</div><h2>{project.name}</h2><p className="muted">{project.description}</p><div className="evaluation-links"><a href={project.repository} target="_blank" rel="noreferrer">Repository ↗</a><a href={project.demo} target="_blank" rel="noreferrer">Live demo ↗</a><span><ShieldCheck size={14} /> Version hash verified</span></div></div>
        <form onSubmit={submit}><div className="rubric-heading"><div><div className="eyebrow">{data.rubric.version}</div><strong>Score each criterion from 0 to 10</strong></div><span className="muted">Weights total {data.rubric.totalWeight}%</span></div>
          {data.rubric.criteria.map((criterion) => { const key = criterionKey(criterion.name); return <label className="score-row" key={criterion.key}><span><strong>{criterion.name}</strong><small>{criterion.weight}% weight</small></span><input type="number" min="0" max="10" step="0.5" value={scores[key] ?? '8'} onChange={(e) => setScores((current) => ({ ...current, [key]: e.target.value }))} /><span className="score-max">/ 10</span></label> })}
          <label className="comment-label">Evidence note<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} /></label>
          {error && <div className="form-error">{error}</div>}
          <div className="evaluation-submit"><div><span className="muted">Weighted score</span><strong>{weightedScore.toFixed(1)} / 100</strong></div><Button type="submit" disabled={busy}>{saved ? <><CheckCircle2 size={16} /> Evaluation saved</> : <><Send size={15} /> {busy ? 'Saving…' : 'Submit evaluation'}</>}</Button></div>
          {saved && <div className="save-note"><Verified>Evaluation submitted to the audit chain</Verified></div>}
        </form>
      </Card> : <Card className="evaluation-card"><h2>No assigned project selected</h2><p className="muted">Ask an organizer to run the conflict-aware assignment engine, then refresh this page.</p></Card>}
    </div>
  </div>
}
