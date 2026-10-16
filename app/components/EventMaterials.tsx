import type { EventMaterialsData } from "../data/eventMaterials";
import { publicAsset } from "../lib/publicAsset";

export function EventMaterials({ materials, eventId }: { materials: EventMaterialsData; eventId: string }) {
  if (!materials.notebookPath && !materials.requirementsPath && !materials.slidesUrl) return null;
  return <section className="event-materials" aria-labelledby={`${eventId}-materials`}>
    <h3 id={`${eventId}-materials`}>Workshop materials</h3>
    {materials.notebookPath && <p>Follow the live Python demo: fill in five inputs to propagate and animate an LRO-like orbit around the Moon.</p>}
    <div className="event-materials-links">
      {materials.notebookPath && <a className="text-link" href={publicAsset(materials.notebookPath)} download>Download participant notebook <span aria-hidden="true">↓</span></a>}
      {materials.requirementsPath && <a className="text-link" href={publicAsset(materials.requirementsPath)} download>Download requirements.txt <span aria-hidden="true">↓</span></a>}
      {materials.slidesUrl && <a className="text-link" href={materials.slidesUrl} target="_blank" rel="noreferrer">View workshop slides <span aria-hidden="true">↗</span></a>}
    </div>
    {materials.notebookPath && <p className="event-materials-note">Open the notebook in Jupyter or upload it to Google Colab. For a local setup, use Python 3.11+ and install the packages in requirements.txt.</p>}
  </section>;
}
