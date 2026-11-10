import type { Metadata } from "next";
import { PartnerCard } from "../components/PartnerCard";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TeamMember } from "../components/TeamMember";
import { partners } from "../data/partners";
import { team } from "../data/team";

export const metadata: Metadata = {
  title: "About Us | Philadelphia Space Forum",
  description: "Meet the Philadelphia Space Forum team and explore our partnerships.",
};

export default function AboutPage() {
  return (
    <main id="top" className="inner-page">
      <SiteHeader />
      <section className="page-width inner-hero">
        <div>
          <p className="eyebrow"><span /> Philadelphia, looking up</p>
          <h1>About us</h1>
        </div>
        <p className="inner-hero-aside">We&apos;re building a place for Philadelphia&apos;s space-curious to connect, share ideas, and explore what comes next.</p>
      </section>
      <section className="page-width team-section" aria-label="Our team">
        <p className="eyebrow"><span /> Meet the team</p>
        <div className="team-grid">
          {team.map((member) => <TeamMember key={member.id} member={member} />)}
        </div>
      </section>
      <section id="partnerships" className="page-width team-section" aria-labelledby="partnerships-label">
        <p className="eyebrow" id="partnerships-label"><span /> Partnerships</p>
        <div className="team-grid">
          {partners.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
