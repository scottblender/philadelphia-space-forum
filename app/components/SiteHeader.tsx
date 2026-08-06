import Link from "next/link";

export function SiteHeader({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <header className={`site-header site-header-${theme}`}>
      <div className="page-width nav-inner">
        <Link className="brand" href="/" aria-label="Philadelphia Space Forum home">
          <span className="brand-mark"><i /></span>
          <span>PHILADELPHIA<br /><b>SPACE FORUM</b></span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#about">About</Link>
          <Link href="/calendar">Calendar</Link>
        </nav>
        <a className="nav-join" href="https://substack.com/@philadelphiaspaceforum" target="_blank" rel="noreferrer">Join us <span>↗</span></a>
      </div>
    </header>
  );
}
