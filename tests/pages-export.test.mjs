import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const repositoryBasePath = repoName && !repoName.endsWith(".github.io") ? `/${repoName}` : "";
const basePath = (process.env.PAGES_BASE_PATH ?? repositoryBasePath).replace(/\/$/, "");
const output = new URL("../out/", import.meta.url);

test("Pages exports new and legacy routes with valid prefixed assets and links", async () => {
  for (const route of ["", "events/", "about/", "calendar/"]) {
    const html = await readFile(new URL(`${route}index.html`, output), "utf8");
    assert.ok(html.includes(`href="${basePath}/events/"`));
    assert.ok(html.includes(`href="${basePath}/about/"`));
    assert.ok(html.includes(`${basePath}/starfield.svg`));
    assert.doesNotMatch(html, /substack|codex-preview|Syne/i);
    if (route === "events/" || route === "calendar/") assert.match(html, /Cislunar Space Workshop/);
    if (route === "about/") {
      assert.ok(html.includes(`src="${basePath}/team/scott-blender-portrait.jpg"`));
      assert.ok(html.includes(`src="${basePath}/team/gianna-voges.jpg"`));
    }
  }
  for (const path of ["starfield.svg", "team/scott-blender-portrait.jpg", "team/gianna-voges.jpg"]) {
    assert.ok((await stat(new URL(path, output))).size > 0);
  }
});
