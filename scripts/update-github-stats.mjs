import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { validateGitHubStats } from "../src/github/stats.ts";

const configPath = new URL("../src/data/github.json", import.meta.url);
const outputPath = fileURLToPath(new URL("../src/data/github-stats.json", import.meta.url));

async function request(path) {
  const response = await fetch(`https://api.github.com${path}`, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/vnd.github+json", "User-Agent": "Samuel-Matos-Portfolio" } });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}.`);
  return response.json();
}

export async function collectGitHubStats(config, get = request, now = new Date()) {
  if (!/^[a-zA-Z0-9-]+$/.test(config.username)) throw new Error("Invalid GitHub username.");
  const username = config.username;
  const user = await get(`/users/${username}`);
  const repositories = [];
  for (let page = 1; ; page++) {
    const entries = await get(`/users/${username}/repos?per_page=100&type=owner&sort=full_name&page=${page}`);
    if (!Array.isArray(entries)) throw new Error("Invalid GitHub repository list.");
    repositories.push(...entries.filter((repo) => !repo.private && repo.owner.login.toLowerCase() === username.toLowerCase() && (!config.excludeForks || !repo.fork)));
    if (entries.length < 100) break;
  }
  // Small batches avoid bursting the public API; no token is needed or shipped.
  const totals = {};
  for (let i = 0; i < repositories.length; i += 4) {
    const languages = await Promise.all(repositories.slice(i, i + 4).map((repo) => get(`/repos/${username}/${encodeURIComponent(repo.name)}/languages`)));
    for (const result of languages) for (const [name, bytes] of Object.entries(result)) {
      if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error(`Invalid GitHub language bytes: ${name}.`);
      totals[name] = (totals[name] ?? 0) + bytes;
    }
  }
  return validateGitHubStats({
    username: user.login,
    fetchedAt: now.toISOString(),
    excludesForks: config.excludeForks,
    repositories: repositories.length,
    stars: repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    followers: user.followers,
    languages: Object.entries(totals).filter(([, bytes]) => bytes > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, bytes]) => ({ name, bytes })),
  });
}

async function main() {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const data = await collectGitHubStats(config);
  const temporary = `${outputPath}.tmp-${process.pid}`;
  try { await writeFile(temporary, JSON.stringify(data, null, 2) + "\n"); await rename(temporary, outputPath); }
  finally { await rm(temporary, { force: true }); }
  console.log({ username: data.username, repositories: data.repositories, stars: data.stars, languages: data.languages.length, fetchedAt: data.fetchedAt });
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main().catch(async (error) => {
  if (process.argv.includes("--optional")) {
    try {
      const config = JSON.parse(await readFile(configPath, "utf8"));
      const cached = validateGitHubStats(JSON.parse(await readFile(outputPath, "utf8")));
      if (cached.username.toLowerCase() !== config.username.toLowerCase() || cached.excludesForks !== config.excludeForks) throw new Error("GitHub snapshot does not match its configuration.");
      console.warn(`GitHub refresh unavailable; using snapshot from ${cached.fetchedAt}.`);
      return;
    } catch { /* No valid cache: fail rather than publish made-up statistics. */ }
  }
  console.error(error.message); process.exitCode = 1;
});
