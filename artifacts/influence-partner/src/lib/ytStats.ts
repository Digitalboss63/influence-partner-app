// ─── Cumulative search stats ──────────────────────────────────────────────────

const STATS_KEY = "ip_yt_stats";

export interface YtStats {
  found: number;
  totalScore: number;
  scoreCount: number;
  lastSearchAt: string | null;
}

function statsDefaults(): YtStats {
  return { found: 0, totalScore: 0, scoreCount: 0, lastSearchAt: null };
}

export function getYtStats(): YtStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return statsDefaults();
    return { ...statsDefaults(), ...(JSON.parse(raw) as Partial<YtStats>) };
  } catch {
    return statsDefaults();
  }
}

export function recordYtSearch(channels: Array<{ discoveryScore: number }>): void {
  const s = getYtStats();
  s.found += channels.length;
  s.totalScore += channels.reduce((sum, c) => sum + c.discoveryScore, 0);
  s.scoreCount += channels.length;
  s.lastSearchAt = new Date().toISOString();
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    // storage quota exceeded — not critical
  }
}

// ─── Search history ───────────────────────────────────────────────────────────

const HISTORY_KEY = "ip_yt_history";
const MAX_HISTORY = 10;

export interface SearchHistoryEntry {
  id: string;
  keyword: string;
  partnerCategory: string;
  minimumSubscribers: number;
  resultCount: number;
  avgScore: number;
  searchedAt: string;
}

export function getSearchHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryEntry[];
  } catch {
    return [];
  }
}

export function addSearchHistory(entry: Omit<SearchHistoryEntry, "id">): void {
  try {
    const history = getSearchHistory();
    // Remove exact duplicate (same keyword + category + minSubs) so re-runs bubble to top
    const filtered = history.filter(
      (h) =>
        !(
          h.keyword === entry.keyword &&
          h.partnerCategory === entry.partnerCategory &&
          h.minimumSubscribers === entry.minimumSubscribers
        ),
    );
    const newEntry: SearchHistoryEntry = { ...entry, id: String(Date.now()) };
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([newEntry, ...filtered].slice(0, MAX_HISTORY)),
    );
  } catch {
    // quota exceeded — not critical
  }
}

export function deleteSearchHistoryEntry(id: string): void {
  try {
    const updated = getSearchHistory().filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}
