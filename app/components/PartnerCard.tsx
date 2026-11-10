import type { PartnerData } from "../data/partners";

export function PartnerCard({ partner }: { partner: PartnerData }) {
  return (
    <article className="team-member" aria-labelledby={`${partner.id}-name`}>
      <div className="team-copy">
        <h2 id={`${partner.id}-name`}>{partner.name}</h2>
        <a className="text-link" href={partner.website} aria-label={`Visit ${partner.name}'s website`}>
          Visit website
        </a>
      </div>
    </article>
  );
}
