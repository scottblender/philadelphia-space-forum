import type { Metadata } from "next";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
export const metadata: Metadata = { title: "Privacy Notice | Philadelphia Space Forum", description: "How Philadelphia Space Forum handles event registration information." };
export default function PrivacyPage() {
  return <main className="inner-page"><SiteHeader /><section className="page-width inner-hero"><div><p className="eyebrow"><span /> Philadelphia Space Forum</p><h1>Privacy Notice</h1></div></section><section className="page-width privacy-content">
    <p>Effective October 8, 2026 · Version 2026-10-08.2</p>
    <p>This notice explains how Philadelphia Space Forum handles information submitted through its website’s native event registration and RSVP management forms.</p>
    <h2>Information we collect</h2>
    <p>When you register, we collect your name and email address, the event you register for, your registration status and timestamps, and the timestamp and version of the privacy notice you agree to. We also store hashed security tokens used to manage or cancel your RSVP.</p>
    <p>Cloudflare processes technical information, including your IP address and browser or device information, to host the RSVP service and perform Turnstile spam verification. The backend stores hashed email and IP identifiers with request timestamps to limit repeated management-email requests.</p>
    <h2>How we use it</h2>
    <p>We use registration information to reserve places, manage attendance and capacity, handle cancellations, and send confirmation and RSVP management emails. Public event pages display aggregate attendee counts and available spots, without attendee names or email addresses. Registration does not subscribe you to a newsletter or promotional mailing list.</p>
    <h2>Who can access it</h2>
    <p>Authorized organizers can view registration information and export attendee lists for event administration. Cloudflare provides database storage, hosting, and spam protection. Resend processes recipient email addresses and email content to deliver registration messages. GitHub Pages hosts the public website and may process visitor technical information. These providers may process and retain technical logs under their own policies.</p>
    <p>For provider details, see <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare’s Privacy Policy</a> and <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Resend’s Privacy Policy</a>.</p>
    <h2>Retention and cancellation</h2>
    <p>Registration records currently remain stored until an organizer deletes them; automatic attendee-data deletion is not configured. Cancelling your RSVP changes its status but does not erase your name or email. Removing an event from the public listing also retains its attendee records. Organizers can permanently delete individual attendee records, including names, email addresses, status, timestamps, consent records and associated RSVP management tokens. Deleting a confirmed registration releases its place. Deleted records no longer appear in the organizer dashboard or future exports, and their RSVP links no longer work. This action does not remove previously downloaded organizer exports, emails already delivered, provider logs or provider backups; those may remain under the applicable retention policies. Hashed email and IP request-limit entries are separate from attendee records and are not erased by attendee deletion.</p>
    <p>RSVP management links stay valid until the event starts and follow changes to its scheduled date. For events without a date, links expire after 30 days from issuance. You can request a replacement link from the Manage my RSVP page. Link expiration does not delete registration records.</p>
    <h2>Your choices and privacy requests</h2>
    <p>Providing your name, email, and registration consent is required to reserve a place through this website. You can cancel through your private management link. To request access, correction, deletion, or withdrawal of consent, contact Philadelphia Space Forum organizers through <a href="https://www.instagram.com/philadelphiaspaceforum/" target="_blank" rel="noreferrer">our Instagram account</a> to arrange your request. We may need to verify that the registration belongs to you. Do not send access keys or private management links.</p>
    <h2>Externally hosted events</h2>
    <p>Events that direct you to Meetup or another registration platform are registered on that platform. Its privacy policy applies to the information you submit there. The website’s native RSVP database does not automatically import external attendee lists.</p>
    <h2>Changes to this notice</h2>
    <p>We will update the date and version when this notice changes. New native registrations record the notice version agreed to at the time of submission.</p>
  </section><SiteFooter /></main>;
}
