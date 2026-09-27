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
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

const stages = [
  ['SUBMISSIONS', 'Every project, versioned and accountable'],
  ['ASSIGN', 'Conflict-aware, deterministic coverage'],
  ['JUDGE', 'A rubric that stays consistent'],
  ['NORMALIZE', 'Make different judging styles comparable'],
  ['ANALYZE', 'Evidence-led integrity signals'],
  ['VERIFY', 'A tamper-evident trail'],
  ['RANK', 'Reproducible results, explainable to all'],
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />

        <div className="landing-links">
          <a href="#why">Why TrustForge</a>
          <a href="#engine">Judging engine</a>
          <a href="#security">Security</a>
        </div>

        <div className="landing-actions">
          <Link to="/login" className="text-link">
            Sign in
          </Link>

          <Link to="/login" className="button button-primary">
            Launch demo
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="kicker">
              <span className="kicker-dot" />
              Open-source judging infrastructure
            </div>

            <h1>
              Trust the result.
              <br />
              <span>Verify the process.</span>
            </h1>

            <p>
              TrustForge is the self-hostable judging layer for hackathons—from
              submissions and judge assignment to normalization, anomaly
              detection, and auditable results.
            </p>

            <div className="hero-ctas">
              <Link to="/login" className="button button-primary">
                Launch demo
                <ArrowRight size={16} />
              </Link>

              <a href="#engine" className="button button-ghost">
                <Play size={15} />
                Explore the engine
              </a>
            </div>

            <div className="hero-proof">
              <div className="proof-avatars">
                <span>J</span>
                <span>M</span>
                <span>S</span>
                <span>+</span>
              </div>

              <div>
                <strong>Built for high-trust events</strong>
                <small>Deterministic · explainable · self-hostable</small>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb orb-one" />
            <div className="orb orb-two" />

            <div className="pipeline-card">
              <div className="pipeline-head">
                <span className="live-dot" />
                TRUST PIPELINE
                <span className="pipeline-live">LIVE DEMO</span>
              </div>

              <div className="pipeline-flow">
                {stages.map(([name, desc], i) => (
                  <motion.div
                    key={name}
                    className="pipeline-stage"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <div className={`stage-node node-${i}`}>
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      <CheckCircle2 size={17} />
                    </div>

                    <div>
                      <strong>{name}</strong>
                      <small>{desc}</small>
                    </div>

                    {i < stages.length - 1 && (
                      <div className="stage-line" />
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="pipeline-footer">
                <div>
                  <span className="footer-label">VERIFIED RANKING</span>
                  <strong>
                    Integrity score <b>98.4</b>
                  </strong>
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
              <strong>Tamper-evident</strong> audit trails
            </span>
          </div>

          <div>
            <LockKeyhole size={19} />
            <span>
              <strong>Backend-enforced</strong> access control
            </span>
          </div>

          <div>
            <Sparkles size={19} />
            <span>
              <strong>Evidence-led</strong> anomaly reviews
            </span>
          </div>
        </section>

        <section id="engine" className="landing-section">
          <div className="section-center">
            <div className="eyebrow accent-text">THE TRUST LAYER</div>

            <h2>Fairness you can inspect.</h2>

            <p>
              Every score has context. Every assignment has a reason. Every
              published result can be reproduced from a versioned input
              snapshot.
            </p>
          </div>

          <div className="feature-grid">
            <Feature
              icon={Fingerprint}
              title="Assignment intelligence"
              text="Deterministic coverage with conflict checks, capacity limits, and a human-readable explanation for every match."
            />

            <Feature
              icon={Sparkles}
              title="Normalization that explains itself"
              text="Compare judging styles with z-score normalization while preserving the raw judgment underneath."
            />

            <Feature
              icon={ShieldCheck}
              title="A result you can verify"
              text="Cryptographic audit chaining and immutable result snapshots turn trust into an inspectable property."
            />
          </div>
        </section>

        <section id="security" className="quote-section">
          <div className="quote-mark">“</div>

          <blockquote>
            Trust is not a feeling we add at the end. It is a property we
            design into the event lifecycle.
          </blockquote>

          <div className="quote-by">
            <div className="avatar">TF</div>

            <span>
              <strong>TrustForge principles</strong>
              <small>Build · Judge · Verify</small>
            </span>
          </div>
        </section>
      </main>

      <footer>
        <Logo />

        <span>© 2026 TrustForge · self-hosted by design</span>

        <span className="footer-right">
          Built by Ashish Pagariya ❤️
        </span>
      </footer>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: any
  title: string
  text: string
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={20} />
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <ChevronRight
        size={16}
        className="feature-arrow"
      />
    </div>
  )
}
