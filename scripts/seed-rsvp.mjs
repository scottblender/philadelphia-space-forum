import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { events } from "../app/data/events.ts";

const mode = process.argv[2];
if (!["--local", "--remote"].includes(mode)) throw new Error("Choose --local or --remote.");
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = events.filter((event) => event.rsvpProvider === "native").map((event) => `INSERT INTO events (id, title, starts_at) VALUES (${quote(event.id)}, ${quote(event.title)}, ${event.startsAt ? Date.parse(event.startsAt) : "NULL"})
ON CONFLICT(id) DO UPDATE SET title = excluded.title, starts_at = excluded.starts_at,
registration_open = ${event.status === "cancelled" ? "0" : "events.registration_open"};`).join("\n");
const file = join(tmpdir(), `psf-events-${crypto.randomUUID()}.sql`);
try {
  await writeFile(file, sql);
  const result = spawnSync("npx", ["wrangler", "d1", "execute", "philadelphia-space-forum-rsvp", "--config", "backend/wrangler.jsonc", mode, "--file", file], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(file, { force: true }); }
