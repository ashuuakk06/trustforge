import { useEffect as reactUseEffect, useState } from 'react'
import { ArrowRight, Check, Play, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  Meter,
  SectionTitle,
  notify,
} from '../components/Primitives'
const useEffect = (effect: () => Promise<unknown> | void, deps: unknown[]) =>
  reactUseEffect(() => {
    void effect()
  }, deps)
export default function Judging() {
  const [data, setData] = useState<any>()
  const [tab, setTab] = useState<'assignments' | 'judges'>('assignments')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const load = () =>
    api<any>('/api/v1/assignments')
      .then(setData)
      .catch((e) => setError(e.message))
  useEffect(load, [])
  if (error && !data) return <ErrorState message={error} />
  if (!data) return <Loading />
  return (
    <div>
      <SectionTitle
        eyebrow="JUDGING / ASSIGNMENT ENGINE"
        title="Judge assignment"
        description="A deterministic, conflict-aware assignment run with an explanation for every match."
        action={
          <Button
            onClick={async () => {
              setRunning(true)
              setError('')
              try {
                await api('/api/v1/assignments/run', { method: 'POST' })
                await load()
                notify('Judge assignments were refreshed.')
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Could not run assignments'
                setError(message)
                notify(message, 'error')
              } finally {
                setRunning(false)
              }
            }}
          >
            {running ? (
              <>
                <RefreshCw className="spin" size={15} /> Running…
              </>
            ) : (
              <>
                <Play size={15} /> Run assignment
              </>
            )}
          </Button>
        }
      />
      {error && <div className="form-error live-error" role="alert">{error}</div>}
      <div className="metric-strip">
        <MiniMetric
          label="Coverage rate"
          value={`${data.metrics.coverageRate}%`}
          note="minimum 3 per project"
        />
        <MiniMetric
          label="Conflict rate"
          value={`${data.metrics.conflictRate}%`}
          note="declared conflicts excluded"
        />
        <MiniMetric
          label="Workload variance"
          value={data.metrics.workloadVariance}
          note="lower is fairer"
        />
        <MiniMetric
          label="Judge utilization"
          value={`${data.metrics.judgeUtilization}%`}
          note="capacity used"
        />
      </div>
      <div className="tabs">
        <button
          className={tab === 'assignments' ? 'selected' : ''}
          onClick={() => setTab('assignments')}
        >
          Visual assignment map
        </button>
        <button className={tab === 'judges' ? 'selected' : ''} onClick={() => setTab('judges')}>
          Judge progress
        </button>
      </div>
      {tab === 'assignments' ? <AssignmentMap data={data} /> : <JudgeProgress />}
    </div>
  )
}
function MiniMetric({
  label,
  value,
  note,
}: {
  label: string
  value: string | number
  note: string
}) {
  return (
    <Card className="mini-metric">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <span className="muted tiny">{note}</span>
    </Card>
  )
}
function AssignmentMap({ data }: { data: any }) {
  const [selected, setSelected] = useState<any>(data.items[0] ?? null)
  useEffect(() => setSelected(data.items[0] ?? null), [data.items])
  const groups = data.items.reduce((a: any, x: any) => {
    ;(a[x.projectId] ??= []).push(x)
    return a
  }, {})
  return (
    <div className="assignment-layout">
      <Card>
        <SectionTitle
          eyebrow="COVERAGE MAP"
          title="Projects → judges"
          description="Select an assignment to inspect the explanation returned by the API."
        />
        <div className="assignment-map">
          {Object.entries(groups).map(([projectId, rows]: any) => (
            <div className="assignment-project" key={projectId}>
              <div className="assignment-project-label">
                <div className="project-symbol">{projectId.slice(-2)}</div>
                <div>
                  <strong>{rows[0]?.projectName ?? projectId}</strong>
                  <span className="muted">{projectId}</span>
                </div>
              </div>
              <div className="assignment-lines">
                {rows.map((row: any) => (
                  <button
                    type="button"
                    className={`assignment-line ${selected?.id === row.id ? 'selected' : ''}`}
                    key={row.id}
                    aria-label={`Select ${row.projectName} assigned to ${row.judgeName}`}
                    aria-pressed={selected?.id === row.id}
                    onClick={() => setSelected(row)}
                  >
                    <span className="line-glow" />
                    <div className="judge-pill">
                      <span className="avatar tiny-avatar">{String(row.judgeId).slice(-2)}</span>
                      <span>{row.judgeName ?? row.judgeId}</span>
                      <span className="fairness">{row.fairnessScore}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="assignment-status">
                <Check size={14} /> {rows.length >= 3 ? 'Covered' : 'Coverage warning'}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="explanation-card">
        <SectionTitle eyebrow="SELECTED ASSIGNMENT" title="Why this match?" />
          {selected ? (
            <div className="selected-assignment">
              <div className="selected-nodes">
                <div className="selected-node">
                  <span className="project-symbol">{String(selected.projectId).slice(-2)}</span>
                  <strong>{selected.projectName ?? selected.projectId}</strong>
                </div>
                <ArrowRight size={17} className="accent-text" />
                <div className="selected-node">
                  <span className="avatar">{String(selected.judgeName ?? 'J').slice(0, 1)}</span>
                  <strong>{selected.judgeName ?? selected.judgeId}</strong>
                </div>
              </div>
              <div className="explanation-list">
                <Explain label="Assignment" value={selected.explanation} good />
                <Explain label="Fairness score" value={String(selected.fairnessScore)} />
                <Explain label="Algorithm" value={selected.algorithmVersion} />
                <Explain label="Repeatable seed" value={selected.seed} />
              </div>
              <div className="algorithm-note">
                <ShieldCheck size={16} />
                <div>
                  <strong>Conflict-aware assignment</strong>
                  <span>Lower workloads are preferred; declared conflicts are excluded.</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">Run assignments to create judge and project matches.</p>
          )}
      </Card>
    </div>
  )
}
function Explain({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div>
      <span className="muted">{label}</span>
      <strong className={good ? 'good' : ''}>
        {good && <Check size={13} />} {value}
      </strong>
    </div>
  )
}
function JudgeProgress() {
  const [data, setData] = useState<any>()
  useEffect(() => {
    api<any>('/api/v1/judges').then(setData)
  }, [])
  if (!data) return <Loading />
  return (
    <Card>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Judge</th>
              <th>Assigned</th>
              <th>Completed</th>
              <th>Pending</th>
              <th>Completion</th>
              <th>Profile</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((j: any) => (
              <tr key={j.id}>
                <td>
                  <div className="person">
                    <span className="avatar">{j.name[0]}</span>
                    <div>
                      <strong>{j.name}</strong>
                      <span className="muted">
                        {j.id} · {j.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td>{j.assigned}</td>
                <td className="good">{j.completed}</td>
                <td>{j.pending}</td>
                <td>
                  <div className="inline-meter">
                    <Meter value={j.completionPercent} />
                    <span>{j.completionPercent}%</span>
                  </div>
                </td>
                <td>
                  <Badge tone="neutral">{j.tendency}</Badge>
                </td>
                <td>
                  <span className={`status-dot ${j.pending === 0 ? 'green' : 'amber'}`} />{' '}
                  {j.pending === 0 ? 'Complete' : 'In progress'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
