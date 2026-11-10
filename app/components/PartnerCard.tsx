import Image from "next/image";
import type { PartnerData } from "../data/partners";
import { publicAsset } from "../lib/publicAsset";

export function PartnerCard({ partner }: { partner: PartnerData }) {
  return (
    <article className="team-member partner-card" aria-labelledby={`${partner.id}-name`}>
      <div className="partner-logo">
        <Image
          src={publicAsset(partner.logo.src)}
          width={partner.logo.width}
          height={partner.logo.height}
          alt=""
          unoptimized
        />
      </div>
      <div className="team-copy">
        <h2 id={`${partner.id}-name`}>{partner.name}</h2>
        <a className="text-link" href={partner.website} aria-label={`Visit ${partner.name}'s website`}>
          Visit website
        </a>
      </div>
    </article>
  );
}
