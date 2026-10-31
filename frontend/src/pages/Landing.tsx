import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Fingerprint,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

const stages = [
  ['SUBMISSIONS', 'Projects and team details'],
  ['ASSIGN', 'Judges matched without conflicts'],
  ['JUDGE', 'A consistent scoring rubric'],
  ['NORMALIZE', 'Compare different scoring styles'],
  ['REVIEW', 'Check unusual score patterns'],
  ['VERIFY', 'Follow the event audit history'],
  ['PUBLISH', 'Share the final results'],
]

const skillGroups = [
  { title: 'Languages', items: ['Java', 'C++', 'JavaScript', 'TypeScript', 'SQL'] },
  {
    title: 'Backend',
    items: [
      'Spring Boot',
      'Spring Security',
      'Spring Data JPA',
      'Hibernate',
      'REST APIs',
      'JWT Authentication',
    ],
  },
  { title: 'Frontend', items: ['React', 'TypeScript', 'Framer Motion', 'Recharts', 'CSS3'] },
  { title: 'Database', items: ['PostgreSQL', 'Flyway migrations'] },
  { title: 'Tools', items: ['Git', 'GitHub', 'Maven', 'Docker', 'Docker Compose', 'Flyway'] },
]

type FeatureIcon = ComponentType<{ size?: number }>

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <div className="landing-links">
          <a href="#why">Why TrustForge</a>
          <a href="#engine">How it works</a>
          <a href="#skills">Technical skills</a>
        </div>
        <div className="landing-actions">
          <Link to="/login" className="text-link">
            Sign in
          </Link>
          <Link to="/login" className="button button-primary">
            Open demo <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="kicker">
              <span className="kicker-dot" />
              Third-year student project
            </div>
            <h1>
              Fair hackathons.
              <br />
              <span>Clear results.</span>
            </h1>
            <p>
              TrustForge brings project submissions, judge assignments, rubric scores, and result
              publishing into one place. Organizers can follow each step, while judges and
              participants get a focused workspace.
            </p>
            <div className="hero-ctas">
              <Link to="/login" className="button button-primary">
                Open the live demo <ArrowRight size={16} />
              </Link>
              <a href="#engine" className="button button-ghost">
                <Play size={15} /> See how it works
              </a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <span>O</span>
                <span>J</span>
                <span>P</span>
                <span>+</span>
              </div>
              <div>
                <strong>One event, three workspaces</strong>
                <small>Organizer · judge · participant</small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="pipeline-card">
              <div className="pipeline-head">
                <span className="live-dot" /> TRUSTFORGE WORKFLOW{' '}
                <span className="pipeline-live">DEMO</span>
              </div>
              <div className="pipeline-flow">
                {stages.map(([name, description], index) => (
                  <motion.div
                    key={name}
                    className="pipeline-stage"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.12 }}
                  >
                    <div className={`stage-node node-${index}`}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <CheckCircle2 size={17} />
                    </div>
                    <div>
                      <strong>{name}</strong>
                      <small>{description}</small>
                    </div>
                    {index < stages.length - 1 && <div className="stage-line" />}
                  </motion.div>
                ))}
              </div>
              <div className="pipeline-footer">
                <div>
                  <span className="footer-label">SEE THE FULL FLOW</span>
                  <strong>From submission to published result</strong>
                </div>
                <ShieldCheck size={28} />
              </div>
            </div>
          </div>
        </section>

        <section id="why" className="signal-strip">
          <div>
            <Fingerprint size={19} />
            <span>
              <strong>Verifiable</strong> audit history
            </span>
          </div>
          <div>
            <LockKeyhole size={19} />
            <span>
              <strong>Role-based</strong> workspaces
            </span>
          </div>
          <div>
            <Sparkles size={19} />
            <span>
              <strong>Explainable</strong> score review
            </span>
          </div>
        </section>

        <section id="engine" className="landing-section">
          <div className="section-center">
            <div className="eyebrow accent-text">THE EVENT WORKFLOW</div>
            <h2>Every step leaves a clear trail.</h2>
            <p>
              Run the event from a single dashboard. See why judges were assigned, compare
              normalized scores, and review the history before results are published.
            </p>
          </div>
          <div className="feature-grid">
            <Feature
              icon={Fingerprint}
              title="Conflict-aware assignments"
              text="Match judges to projects with capacity checks and declared conflict rules."
            />
            <Feature
              icon={Sparkles}
              title="Score normalization"
              text="Compare scoring patterns while keeping each judge’s original score available."
            />
            <Feature
              icon={ShieldCheck}
              title="Results with an audit trail"
              text="Verify the recorded event history before sharing the final ranking."
            />
          </div>
        </section>

        <section id="skills" className="student-section">
          <div className="student-intro">
            <div className="eyebrow accent-text">ABOUT THIS PROJECT</div>
            <h2>Built as a third-year student project.</h2>
            <p>
              I built TrustForge to explore how a hackathon team can run judging with a process that
              is easier to follow. The demo includes organizer, judge, and participant accounts,
              with sample event data ready to explore.
            </p>
            <div className="student-byline">
              <span className="student-avatar">AP</span>
              <span>
                <strong>Ashish Pagariya</strong>
                <small>Computer science student · TrustForge project</small>
              </span>
            </div>
          </div>
          <div className="skills-panel">
            <div className="skills-heading">
              <div>
                <div className="eyebrow">TECHNICAL SKILLS</div>
                <h3>Tools and technologies</h3>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="skill-grid">
              {skillGroups.map((group) => (
                <div className="skill-card" key={group.title}>
                  <h4>{group.title}</h4>
                  <div className="skill-tags">
                    {group.items.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <Logo />
        <span>TrustForge · Student project demo</span>
        <span className="footer-right">Built by Ashish Pagariya</span>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: FeatureIcon; title: string; text: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={20} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <ChevronRight size={16} className="feature-arrow" />
    </div>
  )
}
