import { useEffect as reactUseEffect, useState } from 'react'
import { ArrowRight, BarChart3, Calculator, CheckCircle2, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  SectionTitle,
  Verified,
  notify,
} from '../components/Primitives'
const useEffect = (effect: () => Promise<unknown> | void, deps: unknown[]) =>
  reactUseEffect(() => {
    void effect()
  }, deps)
export default function Normalization() {
  const [data, setData] = useState<any>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const load = () =>
    api<any>('/api/v1/normalization')
      .then(setData)
      .catch((e) => setError(e.message))
  useEffect(load, [])
  if (error && !data) return <ErrorState message={error} />
  if (!data) return <Loading />
  const scores = data.scores as any[]
  return (
    <div>
      <SectionTitle
        eyebrow="JUDGING / NORMALIZATION CENTER"
        title="Make scores comparable."
        description="Normalize judging styles without hiding the underlying judgment."
        action={
          <Button
            onClick={async () => {
              setBusy(true)
              setActionError('')
              try {
                await api('/api/v1/normalization/run', { method: 'POST' })
                await load()
                notify('Score normalization completed.')
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Could not run normalization'
                setActionError(message)
                notify(message, 'error')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? (
              <>
                <RefreshCw className="spin" size={15} /> Recalculating…
              </>
            ) : (
              <>
                <Calculator size={15} /> Run normalization
              </>
            )}
          </Button>
        }
      />
      {actionError && <div className="form-error live-error" role="alert">{actionError}</div>}
      <div className="formula-banner">
        <div className="formula-icon">
          <BarChart3 size={21} />
        </div>
        <div>
          <strong>z = (score − judge mean) / judge standard deviation</strong>
          <span className="muted">
            TrustForge normalization · {data.algorithmVersion} · {data.id}
          </span>
        </div>
        <Badge tone="green">
          <CheckCircle2 size={13} /> Reproducible
        </Badge>
      </div>
      <div className="content-grid two-thirds">
        <Card className="distribution-card">
          <SectionTitle
            eyebrow="DISTRIBUTION SHIFT"
            title="Judge scores at a glance"
            description="Raw and normalized values use separate scales to keep both signals readable."
          />
          <div className="chart-legend">
            <span>
              <i className="legend-dot raw" />
              Raw average
            </span>
            <span>
              <i className="legend-dot normalized" />
              Normalized signal
            </span>
          </div>
          {scores.length ? (
            <div className="recharts-frame" role="img" aria-label="Raw judging averages and normalized scores by project">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scores} margin={{ top: 12, right: 10, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="projectId" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis yAxisId="raw" domain={[0, 100]} hide />
                  <YAxis yAxisId="normalized" orientation="right" domain={['auto', 'auto']} hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(130, 145, 180, 0.08)' }}
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--text)' }}
                    labelStyle={{ color: 'var(--text)', fontWeight: 700 }}
                  />
                  <Bar yAxisId="raw" dataKey="rawAverage" name="Raw average" fill="#77aaff" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  <Bar yAxisId="normalized" dataKey="normalizedScore" name="Normalized score" fill="#aa95ff" radius={[5, 5, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">Scores will appear after judges submit evaluations.</div>
          )}
        </Card>
        <Card className="why-card">
          <SectionTitle eyebrow="METHODOLOGY" title="Why normalize?" />
          <p>
            Judge 1 tends to score <strong>high</strong>. Judge 2 is more <strong>strict</strong>.
            Raw averages can make their scales look comparable when they aren’t.
          </p>
          <div className="judge-scale">
            <div>
              <span>J-104</span>
              <b>8.4–10</b>
              <i style={{ width: '92%' }} />
            </div>
            <div>
              <span>J-105</span>
              <b>5–8</b>
              <i style={{ width: '59%' }} />
            </div>
            <div>
              <span>J-106</span>
              <b>7–9</b>
              <i style={{ width: '74%' }} />
            </div>
          </div>
          <div className="method-note">
            <Calculator size={15} />
            <span>
              Compare the normalized scores with the judges' original scores. The raw values remain
              visible beside the normalized result.
            </span>
          </div>
        </Card>
      </div>
      <Card>
        <SectionTitle
          eyebrow="RESULTING SIGNAL"
          title="Raw score and normalized context"
          description="Compare each project’s judged average with its normalized score signal."
        />
        <div className="normalization-table">
          <div className="norm-header">
            <span>Project</span>
            <span>Raw average</span>
            <span>Normalized</span>
            <span>Evaluations</span>
            <span>Shift</span>
          </div>
          {scores.map((s, i) => (
            <div className="norm-row" key={s.projectId}>
              <span>
                <b className="rank-number">{i + 1}</b>
                {s.projectId}
              </span>
              <span>{s.rawAverage}</span>
              <span className="normalized-value">
                {s.normalizedScore > 0 ? '+' : ''}
                {s.normalizedScore}
              </span>
              <span>{s.evaluationCount}</span>
              <span>
                <Badge tone={s.normalizedScore > 0 ? 'green' : 'amber'}>
                  {s.normalizedScore > 0 ? '↑ positive signal' : '↓ review context'}
                </Badge>
              </span>
            </div>
          ))}
        </div>
        <div className="card-footer">
          <Verified>Dataset locked at {new Date(data.createdAt).toLocaleString()}</Verified>
          <span className="muted tiny">Edge case policy: σ = 0 → stable unit denominator</span>
        </div>
      </Card>
    </div>
  )
}
