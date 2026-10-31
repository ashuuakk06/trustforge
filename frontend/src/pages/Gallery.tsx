import { useEffect, useState } from 'react'
import { ExternalLink, GitBranch, Heart, Search, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api'
import { Badge, Card, Empty, ErrorState, Loading, SectionTitle, notify } from '../components/Primitives'
import type { Project, User } from '../types'
export default function Gallery({ user }: { user: User }) {
  const [items, setItems] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [voted, setVoted] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [trackFilter, setTrackFilter] = useState('all')
  const [randomized, setRandomized] = useState(false)
  useEffect(() => {
    api<{ items: Project[] }>('/api/v1/gallery')
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true))
  }, [])
  if (error && !items.length && loaded) return <ErrorState message={error} />
  if (!loaded) return <Loading />
  const vote = async (id: string) => {
    try {
      await api('/api/v1/votes', { method: 'POST', body: JSON.stringify({ projectId: id }) })
      setVoted([...voted, id])
      setError('')
      notify('Your vote was counted. Thanks for supporting this project.')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Vote rejected'
      setError(message)
      notify(message, 'error')
    }
  }
  const projects = items
    .filter((project) => trackFilter === 'all' || project.track === trackFilter)
    .filter((project) => Object.values(project).join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((left, right) =>
      randomized
        ? stableOrder(left.id) - stableOrder(right.id)
        : items.indexOf(left) - items.indexOf(right),
    )
  return (
    <div>
      <SectionTitle
        eyebrow="PUBLIC / GALLERY"
        title="Meet the projects."
        description="Explore the work. During voting, results stay hidden by design."
        action={
          <div className="gallery-state">
            <span className="status-dot green" /> Voting open · results hidden
          </div>
        }
      />
      <div className="gallery-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search projects and technology"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects or technology…"
          />
        </div>
        <select aria-label="Filter gallery by track" value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)}>
          <option value="all">All tracks</option>
          {Array.from(new Set(items.map((project) => project.track))).sort().map((track) => (
            <option key={track} value={track}>{track}</option>
          ))}
        </select>
        <button className="button button-outline" type="button" onClick={() => setRandomized((current) => !current)}>
          <Sparkles size={14} /> {randomized ? 'Reset order' : 'Mix the order'}
        </button>
      </div>
      {error && <div className="form-error live-error" role="alert">{error}</div>}
      <div className="gallery-grid">
        {projects.map((p, i) => (
            <Card className="gallery-card" key={p.id} delay={Math.min(i * 0.05, 0.3)}>
              <div className={`gallery-art art-${i % 4}`}>
                <span className="art-code">0{i + 1}</span>
                <span className="art-label">{p.track.split(' ')[0].toUpperCase()}</span>
              </div>
              <div className="gallery-card-body">
                <div className="project-card-top">
                  <Badge tone="blue">{p.track}</Badge>
                  <span className="muted tiny">{p.id}</span>
                </div>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="gallery-meta">
                  <span>
                    <Users size={13} /> {p.team}
                  </span>
                  <span>{p.technology}</span>
                </div>
                <div className="gallery-footer">
                  <button
                    className={`vote-button ${voted.includes(p.id) ? 'voted' : ''}`}
                    disabled={voted.includes(p.id)}
                    onClick={() => vote(p.id)}
                  >
                    <Heart size={15} fill={voted.includes(p.id) ? 'currentColor' : 'none'} />
                    {voted.includes(p.id) ? 'Vote counted' : 'Vote for this project'}
                  </button>
                  <a href={p.repository} target="_blank" rel="noreferrer">
                    <span className="sr-only">Open {p.name} repository</span>
                    <GitBranch size={14} />
                  </a>
                  <a href={p.demo} target="_blank" rel="noreferrer">
                    <span className="sr-only">Open {p.name} demo</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
      </div>
      {!projects.length && <Empty label="No projects match those filters" />}
      <p className="gallery-note">
        Signed in as {user.name}. Each account can cast one vote; your choice is included in the
        community score used for results.
      </p>
    </div>
  )
}

function stableOrder(value: string) {
  return [...value].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) | 0, 7)
}
