export interface TeamMemberData {
  id: string;
  name: string;
  role: string;
  photo: string;
  photoPosition?: string;
  bio: string;
}

export const team: TeamMemberData[] = [
  {
    id: "scott-blender",
    name: "Scott Blender",
    role: "Cofounder",
    photo: "/team/scott-blender.jpg",
    photoPosition: "center 30%",
    bio: "Originally from Philadelphia, Scott is a third-year Ph.D. student at Rensselaer Polytechnic Institute (RPI). He earned his bachelor’s degree in mechanical engineering from Temple University and studies cislunar space domain awareness.",
  },
  {
    id: "gianna-voges",
    name: "Gianna Voges",
    role: "Cofounder",
    photo: "/team/gianna-voges.jpg",
    bio: "A Philly transplant, Gianna graduated from Temple University with a degree in journalism. She works in the restaurant industry and as a reporter for Philadelphia magazine.",
  },
];
