import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── YouTube API types ────────────────────────────────────────────────────────

interface YtSearchItem {
  id: { channelId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { default?: { url: string }; medium?: { url: string } };
    channelId: string;
  };
}

interface YtChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: { default?: { url: string }; medium?: { url: string } };
  };
  statistics: {
    subscriberCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

interface YtPlaylistItem {
  snippet: {
    title: string;
    publishedAt: string;
  };
}

// ─── Normalised result type (exported to frontend) ───────────────────────────

export interface YoutubeChannel {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  subscriberCountHidden: boolean;
  channelUrl: string;
  customUrl: string | null;
  description: string;
  thumbnailUrl: string;
  discoveryScore: number;
  discoveryLabel: "Excellent" | "Good" | "Moderate" | "Low";
  searchRank: number;
  latestVideoTitle: string | null;
  latestVideoPublishedAt: string | null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function subscriberScore(count: number): number {
  if (count < 1_000) return 5;
  if (count < 10_000) return 15;
  if (count < 50_000) return 35;
  if (count < 200_000) return 40;
  if (count < 500_000) return 30;
  if (count < 1_000_000) return 22;
  if (count < 5_000_000) return 12;
  return 5;
}

function rankScore(index: number, total: number): number {
  const max = 30;
  const min = 3;
  if (total <= 1) return max;
  return Math.round(max - ((max - min) * index) / Math.max(total - 1, 1));
}

function keywordRelevanceScore(keyword: string, title: string, description: string): number {
  const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 10;
  const text = `${title} ${description}`.toLowerCase();
  const matched = words.filter((w) => text.includes(w)).length;
  return Math.round(Math.min(20, (matched / words.length) * 20));
}

function discoveryLabel(score: number): YoutubeChannel["discoveryLabel"] {
  if (score >= 75) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 25) return "Moderate";
  return "Low";
}

function computeScore(
  index: number,
  total: number,
  subscriberCount: number,
  keyword: string,
  title: string,
  description: string,
): number {
  const base = 10;
  const sub = subscriberScore(subscriberCount);
  const rank = rankScore(index, total);
  const rel = keywordRelevanceScore(keyword, title, description);
  return Math.min(100, base + sub + rank + rel);
}

// ─── YouTube API helpers ──────────────────────────────────────────────────────

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${YT_BASE}${path}?${qs}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason =
      (body as { error?: { message?: string; errors?: Array<{ reason?: string }> } })?.error
        ?.errors?.[0]?.reason ?? "unknown";
    const message =
      (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;

    if (res.status === 403 && reason === "quotaExceeded") {
      const err = new Error("QUOTA_EXCEEDED");
      err.name = "QuotaExceeded";
      throw err;
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.get("/youtube/search", async (req, res): Promise<void> => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "YouTube API key not configured. Add YOUTUBE_API_KEY to your environment secrets.",
    });
    return;
  }

  const {
    keyword,
    partnerCategory,
    minimumSubscribers,
  } = req.query as Record<string, string | undefined>;

  if (!keyword?.trim()) {
    res.status(400).json({ error: "keyword is required" });
    return;
  }

  const minSubs = parseInt(minimumSubscribers ?? "0", 10) || 0;

  try {
    // 1. Search for channels matching keyword (100 quota units)
    const searchResp = await ytFetch<{ items?: YtSearchItem[] }>("/search", {
      part: "snippet",
      type: "channel",
      q: keyword.trim(),
      maxResults: "25",
      key: apiKey,
    });

    const items = searchResp.items ?? [];
    if (items.length === 0) {
      res.json({ channels: [], total: 0 });
      return;
    }

    // 2. Fetch channel statistics + contentDetails in a single batch call (1 quota unit)
    //    contentDetails gives us the uploads playlist ID for latest-video fetching.
    const channelIds = items.map((i) => i.id.channelId).join(",");
    const channelsResp = await ytFetch<{ items?: YtChannelItem[] }>("/channels", {
      part: "statistics,snippet,contentDetails",
      id: channelIds,
      key: apiKey,
    });

    const channelMap = new Map<string, YtChannelItem>(
      (channelsResp.items ?? []).map((c) => [c.id, c]),
    );

    // 3. Build, filter, and score results
    const raw: Array<{ index: number; ch: YtChannelItem; subCount: number }> = [];
    items.forEach((item, index) => {
      const ch = channelMap.get(item.id.channelId);
      if (!ch) return;
      if (ch.statistics.hiddenSubscriberCount) return;
      const subCount = parseInt(ch.statistics.subscriberCount ?? "0", 10);
      if (subCount < minSubs) return;
      raw.push({ index, ch, subCount });
    });

    const channels: YoutubeChannel[] = raw.map(({ index, ch, subCount }) => {
      const title = ch.snippet.title;
      const description = ch.snippet.description ?? "";
      const thumb =
        ch.snippet.thumbnails.medium?.url ??
        ch.snippet.thumbnails.default?.url ??
        "";
      const customUrl = ch.snippet.customUrl ?? null;
      const channelUrl = customUrl
        ? `https://www.youtube.com/${customUrl}`
        : `https://www.youtube.com/channel/${ch.id}`;

      const score = computeScore(index, items.length, subCount, keyword, title, description);

      return {
        channelId: ch.id,
        channelName: title,
        subscriberCount: subCount,
        subscriberCountHidden: false,
        channelUrl,
        customUrl,
        description,
        thumbnailUrl: thumb,
        discoveryScore: score,
        discoveryLabel: discoveryLabel(score),
        searchRank: index + 1,
        latestVideoTitle: null,
        latestVideoPublishedAt: null,
      };
    });

    // Sort by discovery score descending
    channels.sort((a, b) => b.discoveryScore - a.discoveryScore);

    // 4. Fetch latest video for each channel in parallel (1 quota unit each).
    //    Quota cost: ~1 unit × N channels (typically 10–20 channels after filtering).
    //    Total per search: 100 (search.list) + 1 (channels.list) + N (playlistItems) ≈ 115–125 units.
    //    Uses Promise.allSettled so individual failures don't surface to the user.
    const latestVideoMap = new Map<string, { title: string; publishedAt: string }>();

    await Promise.allSettled(
      channels.map(async (ch) => {
        const uploadsPlaylistId =
          channelMap.get(ch.channelId)?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) return;
        try {
          const resp = await ytFetch<{ items?: YtPlaylistItem[] }>("/playlistItems", {
            part: "snippet",
            playlistId: uploadsPlaylistId,
            maxResults: "1",
            key: apiKey,
          });
          const item = resp.items?.[0];
          if (item?.snippet?.title) {
            latestVideoMap.set(ch.channelId, {
              title: item.snippet.title,
              publishedAt: item.snippet.publishedAt,
            });
          }
        } catch {
          // Per-channel failure — degrade gracefully, don't fail the whole request
        }
      }),
    );

    // Merge latest video data into channels
    const finalChannels = channels.map((ch) => {
      const latest = latestVideoMap.get(ch.channelId);
      return latest
        ? { ...ch, latestVideoTitle: latest.title, latestVideoPublishedAt: latest.publishedAt }
        : ch;
    });

    const videosFetched = latestVideoMap.size;
    req.log.info(
      { keyword, partnerCategory, minSubs, resultCount: finalChannels.length, videosFetched },
      "YouTube search complete",
    );

    res.json({ channels: finalChannels, total: finalChannels.length });
  } catch (err) {
    if ((err as Error).name === "QuotaExceeded") {
      res.status(429).json({
        error: "Search limit reached. YouTube API quota exceeded. Try again tomorrow.",
      });
      return;
    }
    logger.error({ err }, "YouTube search error");
    res.status(503).json({
      error: "YouTube search failed. Check your API key and try again.",
    });
  }
});

export default router;
