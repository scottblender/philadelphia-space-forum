"use client";

import { useEffect, useState } from "react";
import type { EventMaterialsData } from "../data/eventMaterials";
import { publicAsset } from "../lib/publicAsset";

export function EventMaterials({ materials, eventId }: { materials: EventMaterialsData; eventId: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const expires = materials.downloadsExpireAt ? Date.parse(materials.downloadsExpireAt) : Infinity;
  const expired = now !== null && now >= expires;
  const active = now !== null && now < expires;
  if (!materials.notebookPath && !materials.requirementsPath && !materials.slidesUrl) return null;
  return <section className="event-materials" aria-labelledby={`${eventId}-materials`}>
    <h3 id={`${eventId}-materials`}>Workshop materials</h3>
    {!expired && materials.notebookPath && <p>Follow the live Python demo: fill in five inputs to propagate and animate an LRO-like orbit around the Moon.</p>}
    {expired && <p>The notebook and requirements download window has ended.</p>}
    {!expired && materials.downloadsExpireAt && <p className="event-materials-note">Notebook and requirements downloads close {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(new Date(expires))}.</p>}
    <div className="event-materials-links">
      {!expired && materials.notebookPath && <a className="text-link" href={active ? publicAsset(materials.notebookPath) : undefined} aria-disabled={!active} download>Download participant notebook <span aria-hidden="true">↓</span></a>}
      {!expired && materials.requirementsPath && <a className="text-link" href={active ? publicAsset(materials.requirementsPath) : undefined} aria-disabled={!active} download>Download requirements.txt <span aria-hidden="true">↓</span></a>}
      {materials.slidesUrl && <a className="text-link" href={materials.slidesUrl} target="_blank" rel="noreferrer">View workshop slides <span aria-hidden="true">↗</span></a>}
    </div>
    {!expired && materials.notebookPath && <p className="event-materials-note">Open the notebook in Jupyter or upload it to Google Colab. For a local setup, use Python 3.11+ and install the packages in requirements.txt.</p>}
  </section>;
}
