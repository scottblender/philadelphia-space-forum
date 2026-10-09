export const rsvpApiUrl = (process.env.NEXT_PUBLIC_RSVP_API_URL ?? "").replace(/\/$/, "");

export async function rsvpRequest(path: string, init?: RequestInit) {
  if (!rsvpApiUrl) throw new Error("Registration is not available yet.");
  const response = await fetch(`${rsvpApiUrl}${path}`, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Unable to complete this request.");
  return data;
}

export function csvCell(value: string) {
  // Spreadsheet programs can execute cells beginning with formula characters.
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
