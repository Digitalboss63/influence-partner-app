const KEY = "ip_yt_stats";

export interface YtStats {
  found: number;
  totalScore: number;
  scoreCount: number;
  lastSearchAt: string | null;
}

function defaults(): YtStats {
  return { found: 0, totalScore: 0, scoreCount: 0, lastSearchAt: null };
}

export function getYtStats(): YtStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...(JSON.parse(raw) as Partial<YtStats>) };
  } catch {
    return defaults();
  }
}

export function recordYtSearch(channels: Array<{ discoveryScore: number }>): void {
  const s = getYtStats();
  s.found += channels.length;
  s.totalScore += channels.reduce((sum, c) => sum + c.discoveryScore, 0);
  s.scoreCount += channels.length;
  s.lastSearchAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage quota exceeded — not critical
  }
}
