import test from "node:test";
import assert from "node:assert/strict";
import { collectGitHubStats } from "../scripts/update-github-stats.mjs";
import { validateGitHubStats, languageShares } from "../src/github/stats.ts";

test("GitHub statistics aggregate code bytes only from the configured owner's public non-fork repositories", async () => {
  const repo = (name, overrides = {}) => ({ name, private: false, fork: false, owner: { login: "fixture" }, stargazers_count: 2, ...overrides });
  const requests = [];
  const get = async (path) => {
    requests.push(path);
    if (path === "/users/fixture") return { login: "fixture", followers: 3 };
    if (path.includes("/repos?")) return [repo("one"), repo("two"), repo("fork", { fork: true }), repo("private", { private: true }), repo("foreign", { owner: { login: "other" } })];
    if (path.includes("/one/")) return { C: 200, Python: 100 };
    if (path.includes("/two/")) return { C: 100 };
    throw new Error(path);
  };
  const result = await collectGitHubStats({ username: "fixture", excludeForks: true }, get, new Date("2026-10-15T12:00:00Z"));
  assert.equal(result.repositories, 2);
  assert.equal(result.stars, 4);
  assert.equal(result.followers, 3);
  assert.deepEqual(languageShares(result).map(({ name, percentage }) => ({ name, percentage })), [{ name: "C", percentage: 75 }, { name: "Python", percentage: 25 }]);
  assert.equal(requests.filter((path) => path.endsWith("/languages")).length, 2);
  await assert.rejects(collectGitHubStats({ username: "../escape", excludeForks: true }, get), /username/);
});

test("GitHub snapshots reject negative, invalid and duplicate metrics, while allowing empty public profiles", () => {
  const empty = { username: "fixture", fetchedAt: "2026-10-15T12:00:00Z", excludesForks: true, repositories: 0, stars: 0, followers: 0, languages: [] };
  assert.deepEqual(languageShares(validateGitHubStats(empty)), []);
  assert.throws(() => validateGitHubStats({ ...empty, stars: -1 }), /nonnegative/);
  assert.throws(() => validateGitHubStats({ ...empty, fetchedAt: "yesterday" }), /date/);
  assert.throws(() => validateGitHubStats({ ...empty, languages: [{ name: "C", bytes: 10 }, { name: "C", bytes: 20 }] }), /Duplicate/);
});
