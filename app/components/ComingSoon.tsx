import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function ComingSoon({ label }: { label: string }) {
  return (
    <main className="coming-soon-page">
      <section className="coming-soon-shell">
        <SiteHeader theme="dark" />
        <div className="page-width coming-soon-content">
          <p className="eyebrow eyebrow-light"><span /> {label}</p>
          <h1>Coming<br /><em>soon.</em></h1>
          <p>We&apos;re getting this part of the forum ready for orbit. Subscribe for the first update.</p>
          <a className="button button-coral" href="https://substack.com/@philadelphiaspaceforum" target="_blank" rel="noreferrer">Follow on Substack <span>↗</span></a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
