import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="page-width footer-grid">
        <Link className="brand brand-footer" href="/">
          <span className="brand-mark"><i /></span>
          <span>PHILADELPHIA<br /><b>SPACE FORUM</b></span>
        </Link>
        <p>Building a bigger space community,<br />right here in Philadelphia.</p>
        <div className="footer-links">
          <Link href="/about">About us</Link>
          <Link href="/events">Events</Link>
          <a href="https://www.instagram.com/philadelphiaspaceforum/" target="_blank" rel="noreferrer">Instagram ↗</a>
        </div>
      </div>
      <div className="page-width footer-bottom">
        <span>© 2026 Philadelphia Space Forum</span>
        <span>39.9526° N · 75.1652° W · PA</span>
      </div>
    </footer>
  );
}
