"use client";

import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { usePathname } from "next/navigation";

export function SiteHeader({ theme = "light" }: { theme?: "light" | "dark" }) {
  const pathname = usePathname().replace(/\/$/, "");
  return (
    <header className={`site-header site-header-${theme}`}>
      <div className="page-width nav-inner">
        <Link className="brand" href="/" aria-label="Philadelphia Space Forum home">
          <BrandMark />
          <span>PHILADELPHIA<br /><b>SPACE FORUM</b></span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/about" aria-current={pathname.endsWith("/about") ? "page" : undefined}>About us</Link>
          <Link href="/events" aria-current={/\/(events|calendar)$/.test(pathname) ? "page" : undefined}>Events</Link>
        </nav>
        <a className="nav-join" href="https://www.instagram.com/philadelphiaspaceforum/" target="_blank" rel="noreferrer">Instagram <span>↗</span></a>
      </div>
    </header>
  );
}
