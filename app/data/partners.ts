export interface PartnerData {
  id: string;
  name: string;
  website: string;
  logo: { src: string; width: number; height: number };
}

export const partners: PartnerData[] = [
  {
    id: "pennovation-works",
    name: "Pennovation Works",
    website: "https://pennovation.upenn.edu/",
    logo: { src: "/partners/pennovation-works.png", width: 646, height: 42 },
  },
  {
    id: "philadelphia-stem-ecosystem",
    name: "Philadelphia STEM Ecosystem",
    website: "https://www.philastemeco.org/",
    logo: { src: "/partners/philadelphia-stem-ecosystem.jpg", width: 508, height: 176 },
  },
];
