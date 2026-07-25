import { Injectable } from "@nestjs/common";
import { OSS_GITHUB_USER, type OssRepo } from "@epkd/shared";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

const SEARCH_QUERY = `author:${OSS_GITHUB_USER} type:pr is:merged -user:${OSS_GITHUB_USER}`;
const SEARCH_URL = `https://api.github.com/search/issues?q=${encodeURIComponent(SEARCH_QUERY)}&per_page=100`;

interface SearchIssueItem {
  repository_url: string;
}

interface SearchIssuesResponse {
  items?: SearchIssueItem[];
}

interface OssCache {
  fetchedAt: number;
  repos: OssRepo[];
}

function fullNameFromRepositoryUrl(repositoryUrl: string): string | null {
  const match = /\/repos\/([^/]+\/[^/]+)$/.exec(repositoryUrl);
  return match ? match[1] : null;
}

function aggregate(items: SearchIssueItem[]): OssRepo[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const fullName = fullNameFromRepositoryUrl(item.repository_url);
    if (!fullName) continue;
    counts.set(fullName, (counts.get(fullName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([fullName, prCount]) => ({ fullName, url: `https://github.com/${fullName}`, prCount }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

@Injectable()
export class OssService {
  private cache: OssCache | null = null;

  async getRepos(): Promise<OssRepo[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.repos;
    }

    try {
      const res = await fetch(SEARCH_URL, {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return this.cache?.repos ?? [];

      const body = (await res.json()) as SearchIssuesResponse;
      const repos = aggregate(body.items ?? []);
      this.cache = { fetchedAt: Date.now(), repos };
      return repos;
    } catch {
      return this.cache?.repos ?? [];
    }
  }
}
