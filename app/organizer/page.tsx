import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { OrganizerDashboard } from "../components/OrganizerDashboard";

export const metadata: Metadata = { title: "Organizer | Philadelphia Space Forum", robots: { index: false, follow: false } };

export default function OrganizerPage() {
  return <main className="inner-page"><SiteHeader /><section className="page-width inner-hero"><div><p className="eyebrow"><span /> Philadelphia Space Forum</p><h1>Organizer</h1></div></section><section className="page-width organizer-section"><OrganizerDashboard /></section><SiteFooter /></main>;
}
