# Native event registration

The Fundamentals workshop keeps its Meetup registration. The Situational
Awareness workshop is a test event using the same EventCard and a native modal
RSVP form. Its date and location are intentionally unspecified.

The website remains on GitHub Pages. This standalone Cloudflare Worker stores
registrations in D1. Until the backend is configured, the test modal is a clearly
labelled preview and cannot submit. There are no simulated successful RSVPs.

## One-time activation

Run these commands from the repository root with Node.js 22.13 or newer.

1. Sign in to your own Cloudflare account:

   ```bash
   npm ci
   npx wrangler login
   npx wrangler d1 create philadelphia-space-forum-rsvp
   ```

2. Copy the returned database ID into `backend/wrangler.jsonc`, replacing the
   all-zero `database_id`. The ID is public configuration, not a credential.
   Keep the `DB` binding name unchanged. No DNS or website-hosting migration
   is necessary; the API can use the Worker’s `workers.dev` address.

3. In Cloudflare's **Turnstile** dashboard, add a widget for
   `philadelphiaspaceforum.org`, `www.philadelphiaspaceforum.org`, and
   `scottblender.github.io` if you use that address. Put its public site key in
   the `TURNSTILE_SITE_KEY` variable in `backend/wrangler.jsonc`.

4. Set both private secrets using Wrangler's interactive prompts:

   ```bash
   npx wrangler secret put ADMIN_TOKEN --config backend/wrangler.jsonc
   npx wrangler secret put TURNSTILE_SECRET_KEY --config backend/wrangler.jsonc
   ```

   Generate `ADMIN_TOKEN` with your password manager: at least 32 random
   characters. Store it there and share it privately with the other organizer.
   It is the organizer access key. The Turnstile secret comes from the widget
   dashboard. Never put either secret in GitHub source, a public build variable,
   or chat. If Wrangler asks to create the Worker before setting a secret,
   accept that prompt for this Worker.

5. Apply the schema, sync native events, and deploy:

   ```bash
   npm run rsvp:migrate
   npm run rsvp:seed
   npm run rsvp:deploy
   ```

   Event seeds create registrations **closed with capacity 0**. Re-running the
   seed updates titles and dates without deleting attendees or overwriting your
   capacity. Cancelled events are closed. Meetup and other external events are also seeded into the organizer dashboard.

6. In the GitHub repository, open **Settings → Secrets and variables → Actions
   → Variables**. Add a repository variable named `RSVP_API_URL` containing the
   deployed HTTPS Worker URL, without a trailing slash. This is a public URL,
   not a secret. Run the existing **Deploy Next.js site to Pages** workflow on
   `main` to rebuild the website with it.

7. Open `https://philadelphiaspaceforum.org/organizer/`, sign in with your
   organizer key, select the Situational Awareness workshop, choose a small
   test capacity, check **Open registration**, and save. Only then can the test
   form create database records.

8. Try an RSVP with test details. Verify that it appears in the organizer view
   and CSV download. Save the provided cancellation link, cancel the test RSVP,
   and verify that the available-place count increases. Do not use real attendee
   details while the event is labelled as a test.

The first workshop continues to link to Meetup, including after activation.
Existing Meetup attendees are not imported or counted by the native system.

## Operation

- Attendees provide a name and email; no attendee account is required.
- The browser sends a POST to the Worker; the Worker validates Turnstile and
  atomically inserts a confirmed registration only if capacity remains.
- One active RSVP per normalized email and event is enforced in the database.
- Names and emails are never returned by the public availability endpoint.
- Cancellation tokens are shown once and stored only as SHA-256 hashes. Links
  carry the token in a URL fragment, which is not sent in HTTP requests or
  referrers. Opening a link does not cancel anything until the user confirms.
- Organizer access uses a server secret, held only in browser memory while
  signed in. Sign out or refresh to clear it. Rotate it with `wrangler secret put`
  if access needs to be revoked.
- The organizer can set capacity, open/close registration, cancel a registration,
  and export attendee data. Events without a start date stay open until manually
  closed. Dated events close at their start time.
- Confirmation emails, waitlists, and payments are not implemented. The form
  explicitly tells attendees to save their cancellation link.

For source-defined native events, add `rsvpProvider: "native"` in `app/data/events.ts` and
run `npm run rsvp:seed`. Set a confirmed date/location in that file when known;
use `null` dates while planning. Keep `rsvpProvider: "meetup"` and `rsvpUrl` for
events with external registration.

## Validation and local development

```bash
npm run test:rsvp
npm run rsvp:migrate:local
npm run rsvp:seed:local
npm run rsvp:dev
```

Local testing uses a separate local D1 database. For frontend testing, set
`NEXT_PUBLIC_RSVP_API_URL=http://localhost:8787` before starting the site.
Configure the local Worker’s `ALLOWED_ORIGINS` for the local website origin.
Interactive RSVP testing requires a Turnstile widget configured for that origin;
hostname, action, and event ID validation remain enabled locally. The automated
tests mock verification responses instead.
Use a local organizer secret of at least 32 characters. Local secrets go in a
git-ignored `backend/.dev.vars`; real production credentials should stay in
Cloudflare and your password manager.

The backend tests execute the real schema and reservation SQL against SQLite,
including simultaneous last-seat attempts, duplicate emails, cancellation,
organizer authentication, late event closure, malformed requests, and CSV
formula protection. Turnstile verification is mocked in tests; production
always verifies it server-side and has no bypass mode.

Useful official guides:
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/workers/wrangler/commands/#secret
- https://developers.cloudflare.com/turnstile/get-started/

Cloudflare activation is required before real submissions can be verified on
the live website. Do not interpret a frontend preview or successful local test
as a deployed database.

## Event management update

After pulling this update, apply the new migration and deploy the backend:

```powershell
npm.cmd run rsvp:migrate
npm.cmd run rsvp:seed
npm.cmd run rsvp:deploy
```

The seed now invokes Wrangler directly through Node on Windows and other platforms.
Sign out and back in to `/organizer/`. Use **Add event** to enter the event details.
Events are published to the event page directly from the database without a website
rebuild. Registration starts closed; set capacity and open it when ready.
**Delete event** removes an event from the public listing and closes registration;
it retains attendee records and does not send cancellation emails. Export attendees
before deletion if needed. Deleted events are not restored by subsequent seeds.
The Meetup workshop can be edited in the organizer dashboard; registrations stay on Meetup.

## External events and editing

Pull the latest main branch and run `npm.cmd run rsvp:seed` followed by
`npm.cmd run rsvp:deploy`. The seed includes the existing Fundamentals workshop
with its Meetup link, and preserves edits made in the organizer dashboard.
Use Add event to choose Website RSVP, Meetup RSVP, or Other external RSVP.
Use Edit event to update details. External attendee lists and capacity remain on
the external platform. Events with attendee records retain their registration method.

## Confirmation emails and RSVP management

The verified sending domain is philadelphiaspaceforum.org. Set RESEND_API_KEY as
an encrypted Worker secret. Emails use Philadelphia Space Forum
<events@philadelphiaspaceforum.org>. Pull main, run `npm.cmd run rsvp:migrate`,
then `npm.cmd run rsvp:deploy`. Confirmation emails are sent for new native RSVPs.
Existing attendees can use `/rsvp/manage/` to request a management link.
Management links expire after 30 days and only hashed tokens persist. Requesting
links requires Turnstile and is limited to one per minute per email and per IP.
Unknown addresses receive the same response. Opening a link never cancels an RSVP.
Email acceptance does not guarantee inbox delivery; check Resend logs and spam.
If sending fails, the RSVP remains confirmed and a backup cancellation link is shown.
No past attendees are emailed automatically. Email changes and reminders are not sent.

## Registration consent

New native registrations require explicit agreement to Privacy Notice version
2026-10-08. Apply migration 0004 with `npm.cmd run rsvp:migrate` before deploying.
The API records the timestamp and notice version. Existing records remain null;
consent is not backfilled. Cancellation is not data erasure. No automatic attendee
retention or deletion job is configured. The notice describes the current behavior.
