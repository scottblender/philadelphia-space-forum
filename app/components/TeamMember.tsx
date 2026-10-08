import Image from "next/image";
import type { TeamMemberData } from "../data/team";
import { publicAsset } from "../lib/publicAsset";

export function TeamMember({ member }: { member: TeamMemberData }) {
  return (
    <article className="team-member" aria-labelledby={`${member.id}-name`}>
      <div className="team-photo">
        <Image src={publicAsset(member.photo)} alt={member.name} width={800} height={800} unoptimized style={{ objectPosition: member.photoPosition ?? "center", transform: member.photoZoom ? `scale(${member.photoZoom})` : undefined, transformOrigin: member.photoZoom ? "center bottom" : undefined }} />
      </div>
      <div className="team-copy">
        <p className="eyebrow"><span /> {member.role}</p>
        <h2 id={`${member.id}-name`}>{member.name}</h2>
        <p>{member.bio}</p>
      </div>
    </article>
  );
}
