import type {
  GitHubStats,
  RepositoriesResult,
  RepoStats,
  FunStats,
  UserSearchResult,
  AuthStatus,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function searchUsers(query: string): Promise<UserSearchResult> {
  const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to search users: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserStats(username: string, language?: string): Promise<GitHubStats> {
  const url = new URL(`${API_URL}/api/users/${username}/stats`);
  if (language) {
    url.searchParams.set("language", language);
  }

  const res = await fetch(url.toString(), {
    credentials: "include",
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("User not found");
    }
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserRepositories(
  username: string,
  query?: string
): Promise<RepositoriesResult> {
  const url = new URL(`${API_URL}/api/users/${username}/repositories`);
  if (query) {
    url.searchParams.set("q", query);
  }

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Failed to fetch repositories: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserRepoStats(username: string, repo: string): Promise<RepoStats> {
  const res = await fetch(`${API_URL}/api/users/${username}/repos/${repo}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch repo stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserFunStats(username: string): Promise<FunStats> {
  const res = await fetch(`${API_URL}/api/users/${username}/fun`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch fun stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserFollowers(
  username: string
): Promise<{ count: number; followers: { login: string; avatar_url: string }[] }> {
  const res = await fetch(`${API_URL}/api/users/${username}/followers`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch followers: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserFollowing(
  username: string
): Promise<{ count: number; following: { login: string; avatar_url: string }[] }> {
  const res = await fetch(`${API_URL}/api/users/${username}/following`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch following: ${res.statusText}`);
  }
  return res.json();
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) {
    return { authenticated: false };
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export function getLoginUrl(): string {
  return `${API_URL}/api/auth/login`;
}
