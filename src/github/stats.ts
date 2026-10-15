export interface GitHubStats {
  username: string;
  fetchedAt: string;
  excludesForks: boolean;
  repositories: number;
  stars: number;
  followers: number;
  languages: { name: string; bytes: number }[];
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("GitHub statistics must be nonnegative integers.");
  return value;
}
export function validateGitHubStats(value: unknown): GitHubStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid GitHub snapshot.");
  const data = value as Record<string, unknown>;
  if (typeof data.username !== "string" || !/^[a-zA-Z0-9-]+$/.test(data.username)) throw new Error("Invalid GitHub username.");
  if (typeof data.fetchedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(data.fetchedAt) || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error("Invalid GitHub snapshot date.");
  if (typeof data.excludesForks !== "boolean" || !Array.isArray(data.languages)) throw new Error("Invalid GitHub snapshot scope.");
  const languages = data.languages.map((value) => {
    if (!value || typeof value !== "object") throw new Error("Invalid GitHub language.");
    const item = value as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim() || !count(item.bytes)) throw new Error("Invalid GitHub language.");
    return { name: item.name, bytes: count(item.bytes) };
  });
  if (new Set(languages.map((item) => item.name)).size !== languages.length) throw new Error("Duplicate GitHub language.");
  if (!Number.isSafeInteger(languages.reduce((sum, item) => sum + item.bytes, 0))) throw new Error("GitHub language total is too large.");
  return { username: data.username, fetchedAt: data.fetchedAt, excludesForks: data.excludesForks, repositories: count(data.repositories), stars: count(data.stars), followers: count(data.followers), languages: languages.sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name)) };
}

export function languageShares(stats: GitHubStats) {
  const total = stats.languages.reduce((sum, item) => sum + item.bytes, 0);
  return stats.languages.map((item) => ({ ...item, percentage: total ? item.bytes / total * 100 : 0 }));
}
