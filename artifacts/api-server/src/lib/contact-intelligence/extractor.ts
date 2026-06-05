/**
 * Deterministic contact extraction from available prospect/creator metadata.
 * No LLM required — pure regex + URL parsing.
 */

export interface ExtractedContacts {
  businessEmail: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  contactPageUrl: string | null;
  youtubeUrl: string | null;
  sourceData: Record<string, string[]>;
}

// ─── Regexes ─────────────────────────────────────────────────────────────────

const EMAIL_RE =
  /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

// Exclude common non-business domains
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "me.com",
  "live.com",
  "aol.com",
  "protonmail.com",
  "pm.me",
]);

function extractEmails(text: string): string[] {
  return [...new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))];
}

function isBusinessEmail(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return !PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase());
}

function pickBestEmail(emails: string[]): string | null {
  const business = emails.filter(isBusinessEmail);
  if (business.length > 0) return business[0];
  return emails[0] ?? null;
}

// ─── URL classification ───────────────────────────────────────────────────────

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractUrlsFromText(text: string): string[] {
  const urlRe =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/gi;
  return [...new Set(text.match(urlRe) ?? [])];
}

function classifyUrl(url: string): keyof Omit<ExtractedContacts, "businessEmail" | "sourceData"> | null {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "instagramUrl";
  if (lower.includes("tiktok.com")) return "tiktokUrl";
  if (lower.includes("linkedin.com")) return "linkedinUrl";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtubeUrl";
  if (/\/(contact|hire|collaborate|work-with|partner|business)/i.test(lower)) return "contactPageUrl";
  return "websiteUrl";
}

// ─── Main extractor ───────────────────────────────────────────────────────────

export interface ProspectInput {
  name?: string | null;
  email?: string | null;
  website?: string | null;
  socialUrl?: string | null;
  notes?: string | null;
  platform?: string | null;
}

export interface CreatorInput {
  handle?: string | null;
  platform?: string | null;
  avatarUrl?: string | null;
}

export interface YouTubeInput {
  channelId?: string | null;
  channelUrl?: string | null;
  customUrl?: string | null;
  description?: string | null;
  latestVideoTitle?: string | null;
}

export interface QualificationInput {
  contactEmail?: string | null;
}

export function extractContacts(params: {
  prospect?: ProspectInput | null;
  creator?: CreatorInput | null;
  youtube?: YouTubeInput | null;
  qualification?: QualificationInput | null;
}): ExtractedContacts {
  const { prospect, creator, youtube, qualification } = params;

  const sourceData: Record<string, string[]> = {};
  const allEmails: string[] = [];

  // Collect all text blobs for parsing
  const textSources: Array<[string, string]> = [];

  if (prospect?.notes) textSources.push(["prospect_notes", prospect.notes]);
  if (youtube?.description) textSources.push(["youtube_description", youtube.description]);
  if (youtube?.latestVideoTitle) textSources.push(["youtube_video_title", youtube.latestVideoTitle]);

  // Direct email fields (highest trust)
  if (qualification?.contactEmail) {
    allEmails.push(qualification.contactEmail);
    sourceData["qualification_contact_email"] = [qualification.contactEmail];
  }
  if (prospect?.email) {
    allEmails.push(prospect.email);
    sourceData["prospect_email_field"] = [prospect.email];
  }

  // Parse text sources for emails
  for (const [srcKey, text] of textSources) {
    const found = extractEmails(text);
    if (found.length > 0) {
      allEmails.push(...found);
      sourceData[srcKey] = found;
    }
  }

  const businessEmail = pickBestEmail([...new Set(allEmails)]);

  // ─── URL extraction ────────────────────────────────────────────────────────

  const classified: Partial<Record<
    "websiteUrl" | "instagramUrl" | "tiktokUrl" | "linkedinUrl" | "contactPageUrl" | "youtubeUrl",
    string
  >> = {};

  const urlCandidates: Array<[string, string]> = [];

  if (prospect?.website) urlCandidates.push(["prospect_website", prospect.website]);
  if (prospect?.socialUrl) urlCandidates.push(["prospect_social_url", prospect.socialUrl]);
  if (youtube?.channelUrl) urlCandidates.push(["youtube_channel_url", youtube.channelUrl]);
  if (youtube?.customUrl) urlCandidates.push(["youtube_custom_url", youtube.customUrl]);

  for (const [srcKey, raw] of urlCandidates) {
    const url = normaliseUrl(raw);
    const category = classifyUrl(url);
    if (category && !classified[category]) {
      classified[category] = url;
      if (!sourceData[srcKey]) sourceData[srcKey] = [];
      sourceData[srcKey].push(url);
    }
  }

  // Parse URLs embedded in text blobs
  for (const [srcKey, text] of textSources) {
    const urls = extractUrlsFromText(text);
    for (const url of urls) {
      const category = classifyUrl(url);
      if (category && !classified[category]) {
        classified[category] = url;
        if (!sourceData[srcKey]) sourceData[srcKey] = [];
        sourceData[srcKey].push(url);
      }
    }
  }

  // YouTube URL from channel data
  if (!classified.youtubeUrl && youtube?.channelId) {
    classified.youtubeUrl = `https://www.youtube.com/channel/${youtube.channelId}`;
    sourceData["youtube_channel_id"] = [classified.youtubeUrl];
  }
  if (!classified.youtubeUrl && youtube?.channelUrl) {
    classified.youtubeUrl = normaliseUrl(youtube.channelUrl);
  }

  // Infer contact page from website
  if (!classified.contactPageUrl && classified.websiteUrl) {
    const base = classified.websiteUrl.replace(/\/$/, "");
    classified.contactPageUrl = `${base}/contact`;
    sourceData["inferred_contact_page"] = [classified.contactPageUrl];
  }

  // Social URL platform inference
  if (!classified.instagramUrl && !classified.tiktokUrl && prospect?.platform && prospect.socialUrl) {
    const lower = (prospect.platform ?? "").toLowerCase();
    const url = normaliseUrl(prospect.socialUrl);
    if (lower.includes("instagram")) classified.instagramUrl = url;
    else if (lower.includes("tiktok")) classified.tiktokUrl = url;
  }

  // Synthesise a creator handle YouTube URL
  if (!classified.youtubeUrl && creator?.handle) {
    const handle = creator.handle.startsWith("@") ? creator.handle : `@${creator.handle}`;
    classified.youtubeUrl = `https://www.youtube.com/${handle}`;
    sourceData["creator_handle"] = [classified.youtubeUrl];
  }

  return {
    businessEmail,
    websiteUrl: classified.websiteUrl ?? null,
    instagramUrl: classified.instagramUrl ?? null,
    tiktokUrl: classified.tiktokUrl ?? null,
    linkedinUrl: classified.linkedinUrl ?? null,
    contactPageUrl: classified.contactPageUrl ?? null,
    youtubeUrl: classified.youtubeUrl ?? null,
    sourceData,
  };
}
