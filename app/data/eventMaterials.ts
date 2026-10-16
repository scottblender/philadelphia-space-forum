export interface EventMaterialsData {
  notebookPath?: string;
  requirementsPath?: string;
  slidesUrl?: string;
  downloadsExpireAt?: string;
}

// Keep hosted materials independent of dashboard event details so live edits
// don't remove workshop downloads. Add a public slides URL when available.
export const eventMaterials: Record<string, EventMaterialsData> = {
  "cislunar-space-workshop-2026-10-16": {
    downloadsExpireAt: "2026-10-17T16:00:00-04:00",
    notebookPath: "/workshops/cislunar-space-fundamentals/LRO_Demo_Participant.ipynb",
    requirementsPath: "/workshops/cislunar-space-fundamentals/requirements.txt",
  },
};
