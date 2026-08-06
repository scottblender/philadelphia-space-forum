import type { Metadata } from "next";
import { SectionMotion } from "./components/SectionMotion";
import "./globals.css";

export const metadata: Metadata = {
  title: "Philadelphia Space Forum",
  description: "Philadelphia's community for conversations about space policy, Artemis, and emerging research.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SectionMotion />{children}</body></html>;
}
