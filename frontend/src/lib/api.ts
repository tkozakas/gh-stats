import type { GitHubStats, RepositoriesResult, RepoStats, FunStats } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function getStats(language?: string): Promise<GitHubStats> {
  const url = new URL(`${API_URL}/api/stats`);
  if (language) {
    url.searchParams.set("language", language);
  }

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getRepositories(query?: string): Promise<RepositoriesResult> {
  const url = new URL(`${API_URL}/api/repositories`);
  if (query) {
    url.searchParams.set("q", query);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.statusText}`);
  }

  return res.json();
}

export async function getRepoStats(name: string): Promise<RepoStats> {
  const url = new URL(`${API_URL}/api/repo`);
  url.searchParams.set("name", name);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch repo stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getFunStats(): Promise<FunStats> {
  const res = await fetch(`${API_URL}/api/fun`);
  if (!res.ok) {
    throw new Error(`Failed to fetch fun stats: ${res.statusText}`);
  }

  return res.json();
}
