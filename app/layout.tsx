import type { Metadata } from "next";
import { SectionMotion } from "./components/SectionMotion";
import { publicAsset } from "./lib/publicAsset";
import "./globals.css";

export const metadata: Metadata = {
  title: "Philadelphia Space Forum",
  description: "Philadelphia's community for conversations about space policy, Artemis, and emerging research.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <div className="starfield" aria-hidden="true" style={{ backgroundImage: `url("${publicAsset("/starfield.svg")}")` }} />
    <SectionMotion />{children}
  </body></html>;
}
