import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  LockKeyhole,
  Share2,
} from 'lucide-react'
import { api } from '../lib/api'
import type { User } from '../types'
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
export default function Results({ user }: { user: User }) {
  const [data, setData] = useState<any>()
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [actionError, setActionError] = useState('')
  useEffect(() => {
    api<any>('/api/v1/results')
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])
  if (error && !data) return <ErrorState message={error} />
  if (!data) return <Loading />
  const canPublish = ['ORGANIZER', 'ADMIN'].includes(user.role)
  const downloadManifest = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `trustforge-${data.version.toLowerCase()}-manifest.json`
    link.click()
    URL.revokeObjectURL(url)
    notify('Result manifest downloaded.', 'info')
  }
  const shareMethodology = async () => {
    try {
      await navigator.clipboard.writeText(data.methodology)
      notify('Methodology copied to the clipboard.', 'info')
    } catch {
      notify('Clipboard access is unavailable in this browser.', 'error')
    }
  }
  return (
    <div>
      <SectionTitle
        eyebrow="RESULTS / CALCULATION"
        title="Verified results"
        description="Each published result has a version, calculation method, and input hash."
        action={
          <div className="heading-actions">
            <button className="button button-outline" type="button" onClick={shareMethodology}>
              <Share2 size={15} /> Share methodology
            </button>
            {canPublish && (
              <Button
                onClick={async () => {
                  setPublishing(true)
                  setActionError('')
                  try {
                    const next = await api<any>('/api/v1/results/publish', { method: 'POST' })
                    setData(next)
                    notify('Verified result snapshot published.')
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Could not publish results'
                    setActionError(message)
                    notify(message, 'error')
                  } finally {
                    setPublishing(false)
                  }
                }}
              >
                {publishing ? 'Publishing…' : data.published ? 'Published' : 'Publish results'}
              </Button>
            )}
          </div>
        }
      />
      {actionError && <div className="form-error live-error" role="alert">{actionError}</div>}
      <div className="result-status">
        <div>
          <CheckCircle2 size={18} />
          <div>
            <strong>
              {data.published ? 'Results are public' : 'Snapshot ready for publication'}
            </strong>
            <span className="muted">
              {data.version} · {new Date(data.calculatedAt).toLocaleString()}
            </span>
          </div>
        </div>
        <Badge tone={data.published ? 'green' : 'amber'}>
          {data.published ? 'PUBLIC' : 'PENDING'}
        </Badge>
      </div>
      <Card className="results-card">
        <div className="results-table">
          <div className="results-head">
            <span>Rank</span>
            <span>Project</span>
            <span>Raw score</span>
            <span>Normalized</span>
            <span>Community</span>
            <span>Final</span>
            <span>Prize</span>
          </div>
          {data.entries.map((e: any) => (
            <div className={`results-row ${e.rank === 1 ? 'winner' : ''}`} key={e.projectId}>
              <span className="rank">
                <b>{String(e.rank).padStart(2, '0')}</b>
                {e.rank === 1 && <Award size={16} />}
              </span>
              <span>
                <strong>{e.project}</strong>
                <small>{e.projectId}</small>
              </span>
              <span>{e.rawScore}</span>
              <span className="normalized-value">
                {e.normalizedScore > 0 ? '+' : ''}
                {e.normalizedScore}
              </span>
              <span>{e.communityScore}</span>
              <span>
                <strong>{e.finalScore}</strong>
              </span>
              <span>
                {e.prize && (
                  <Badge tone="violet">
                    {e.prize}
                  </Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <div className="content-grid two-thirds">
        <Card>
          <SectionTitle eyebrow="METHODOLOGY" title="How the result is calculated" />
          <div className="method-flow">
            <Method
              number="01"
              title="Judging signal"
              text="The weighted rubric scores are averaged per project. Normalized scores remain visible as comparison context."
            />
            <Method
              number="02"
              title="Community signal"
              text="Eligible votes are counted once per account during the voting window."
            />
            <Method
              number="03"
              title="Final score & tie-break"
              text="The final score is 70% judge average and 30% community score; equal scores sort by project ID."
            />
          </div>
          <div className="method-footer">
            <LockKeyhole size={15} /> {data.methodology}
          </div>
        </Card>
        <Card>
          <SectionTitle eyebrow="INDEPENDENTLY EXPLAINABLE" title="Input snapshot" />
          <div className="snapshot-list">
            <div>
              <span className="muted">Result version</span>
              <strong>{data.version}</strong>
            </div>
            <div>
              <span className="muted">Judging method</span>
              <strong>Z-score normalization</strong>
            </div>
            <div>
              <span className="muted">Audit state</span>
              <Verified />
            </div>
            <div>
              <span className="muted">Publication</span>
              <strong>{data.published ? 'Public' : 'Organizer only'}</strong>
            </div>
          </div>
          <button className="button button-ghost button-full" type="button" onClick={downloadManifest}>
            Download result manifest <ArrowUpRight size={14} />
          </button>
        </Card>
      </div>
    </div>
  )
}
function Method({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="method-row">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p className="muted">{text}</p>
      </div>
    </div>
  )
}
