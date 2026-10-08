import Link from "next/link";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

export default function Home() {
  return (
    <main id="top">
      <section className="hero-shell">
        <SiteHeader theme="dark" />
        <div className="hero-content page-width">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-light"><span /> Philadelphia, PA · Online + in person</p>
            <h1>Space is closer<br />than you think.</h1>
            <p className="hero-lede">
              A home for the Philadelphia region&apos;s space-curious—where researchers,
              builders, policymakers, and enthusiasts meet to explore what comes next.
            </p>
            <div className="hero-actions">
              <a className="button button-blue" href="#join">Join the community <span>↓</span></a>
              <Link className="text-link text-link-light" href="/events">Explore events <span>→</span></Link>
            </div>
          </div>
        </div>
        <a className="scroll-cue" href="#about" aria-label="Scroll to the introduction">
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="intro-section" id="about">
        <div className="page-width">
          <div className="intro-grid">
            <div>
              <p className="eyebrow"><span /> Why we&apos;re here</p>
              <h2>Big ideas need<br /><em>room to meet.</em></h2>
            </div>
            <div className="intro-copy">
              <p>
                Philadelphia has world-class universities, aerospace talent, and no dedicated
                front door for its space community. We&apos;re changing that, one conversation at a time.
              </p>
              <p>
                Come for a research talk. Stay for a debate about lunar governance. Meet the
                person who helps your next idea leave the ground.
              </p>
              <Link className="text-link" href="/about">Meet the cofounders <span>→</span></Link>
            </div>
          </div>
        </div>
        <nav className="scroll-cue-group" aria-label="Introduction section navigation">
          <a className="scroll-cue scroll-cue-up" href="#top" aria-label="Scroll to the landing section">
            <span aria-hidden="true">↑</span>
          </a>
          <a className="scroll-cue" href="#join" aria-label="Scroll to community updates">
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </section>

      <section className="join-section" id="join">
        <div className="page-width join-grid">
          <div>
            <p className="eyebrow"><span /> Stay in the loop</p>
            <h2>Your invitation<br />to look <em>up.</em></h2>
          </div>
          <div className="join-card">
            <p>Follow Philadelphia Space Forum for upcoming events and updates from our space community.</p>
            <a className="button button-blue instagram-button" href="https://www.instagram.com/philadelphiaspaceforum/" target="_blank" rel="noreferrer">Follow on Instagram <span>↗</span></a>
            <small>@philadelphiaspaceforum</small>
          </div>
        </div>
        <nav className="scroll-cue-group" aria-label="Community updates section navigation">
          <a className="scroll-cue scroll-cue-up" href="#about" aria-label="Scroll to the introduction">
            <span aria-hidden="true">↑</span>
          </a>
          <a className="scroll-cue" href="#footer" aria-label="Scroll to the footer">
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </section>
      <SiteFooter />
    </main>
  );
}
