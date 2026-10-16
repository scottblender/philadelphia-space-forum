export interface EventMaterialsData {
  notebookPath?: string;
  requirementsPath?: string;
  slidesUrl?: string;
  downloadsExpireAt?: string;
  answers?: { parameter: string; value: string; explanation: string }[];
}

// Keep hosted materials independent of dashboard event details so live edits
// don't remove workshop downloads. Add a public slides URL when available.
export const eventMaterials: Record<string, EventMaterialsData> = {
  "cislunar-space-workshop-2026-10-16": {
    slidesUrl: "https://drive.google.com/file/d/1X1UB4tkdP6bsBe8RjkVYFFTEOITz6nHz/view?usp=drivesdk",
    answers: [
      { parameter: "MU_MOON", value: "4902.800118", explanation: "Lunar GM in km³/s²; sets the strength of gravity." },
      { parameter: "altitude_km", value: "50.0", explanation: "Semi-major-axis altitude in km: a = lunar radius + altitude." },
      { parameter: "eccentricity", value: "0.001", explanation: "A nearly circular orbit; zero would be exactly circular." },
      { parameter: "inclination_deg", value: "90.0", explanation: "A polar orbit, perpendicular to the reference equator." },
      { parameter: "number_of_periods", value: "3", explanation: "Propagate three complete revolutions, about 5.65 hours." },
    ],
    downloadsExpireAt: "2026-10-17T16:00:00-04:00",
    notebookPath: "/workshops/cislunar-space-fundamentals/LRO_Demo_Participant.ipynb",
    requirementsPath: "/workshops/cislunar-space-fundamentals/requirements.txt",
  },
};
