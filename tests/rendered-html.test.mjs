import assert from "node:assert/strict";
import test from "node:test";

const { default: worker } = await import("../dist/server/index.js");

async function render(path) {
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.doesNotMatch(html, /substack|Syne|codex-preview/i);
  assert.match(html, /https:\/\/www\.instagram\.com\/philadelphiaspaceforum\//);
  assert.match(html, /href="\/events"/);
  assert.match(html, /href="\/about"/);
  assert.match(html, /starfield\.svg/);
  return html;
}

test("home uses Instagram and the new navigation", async () => {
  const html = await render("/");
  assert.match(html, /Follow on Instagram/);
  assert.match(html, /Meet the cofounders/);
});

test("events render the flyer details and accessible disclosure", async () => {
  const html = await render("/events");
  for (const text of ["Cislunar Space Workshop", "Pennovation Center", "3401 Grays Ferry Ave", "Scott Blender", "C.O.D.E", "2:00 PM", "4:00 PM EDT", "NASA", "Advanced Space Concepts Laboratory"]) {
    assert.ok(html.includes(text), `Missing event information: ${text}`);
  }
  assert.match(html, /2026-10-16T14:00:00-04:00/);
  assert.match(html, /meetup\.com\/code-coffee-philly\/events\/316162308\//);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /id="cislunar-space-workshop-2026-10-16-details"[^>]*hidden/);
  assert.match(html, /aria-live="polite"/);
});

test("about page renders both cofounders and their supplied photos", async () => {
  const html = await render("/about");
  for (const text of ["Scott Blender", "Gianna Voges", "Rensselaer", "Temple University", "journalism", "Philadelphia magazine"]) {
    assert.ok(html.includes(text), `Missing team information: ${text}`);
  }
  assert.match(html, /src="\/team\/scott-blender-portrait\.jpg"/);
  assert.match(html, /aspect-ratio:3 \/ 4/);
  assert.match(html, /object-position:center 40%/);
  assert.match(html, /src="\/team\/gianna-voges\.jpg"/);
});

test("previous calendar URLs still render events", async () => {
  const html = await render("/calendar");
  assert.match(html, /Cislunar Space Workshop/);
  assert.doesNotMatch(html, /Coming.*soon/i);
});
