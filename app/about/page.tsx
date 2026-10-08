import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { TeamMember } from "../components/TeamMember";
import { team } from "../data/team";

export const metadata: Metadata = {
  title: "About Us | Philadelphia Space Forum",
  description: "Meet Philadelphia Space Forum cofounders Scott Blender and Gianna Voges.",
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
      <section className="page-width team-section" aria-label="Our cofounders">
        <p className="eyebrow"><span /> Meet the cofounders</p>
        <div className="team-grid">
          {team.map((member) => <TeamMember key={member.id} member={member} />)}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
