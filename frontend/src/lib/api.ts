import type {
  GitHubStats,
  RepositoriesResult,
  RepoStats,
  FunStats,
  UserSearchResult,
  AuthStatus,
  CountryRanking,
  UserRankingResult,
  ContributionWeek,
  GlobalRanking,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type Visibility = "public" | "private" | "all";

export async function searchUsers(query: string): Promise<UserSearchResult> {
  const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to search users: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserStats(
  username: string,
  language?: string,
  visibility?: Visibility
): Promise<GitHubStats> {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (visibility) params.set("visibility", visibility);

  const query = params.toString();
  const endpoint = `${API_URL}/api/users/${username}/stats${query ? `?${query}` : ""}`;

  const res = await fetch(endpoint, {
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
  query?: string,
  visibility?: Visibility
): Promise<RepositoriesResult> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (visibility) params.set("visibility", visibility);

  const queryStr = params.toString();
  const endpoint = `${API_URL}/api/users/${username}/repositories${queryStr ? `?${queryStr}` : ""}`;

  const res = await fetch(endpoint, { credentials: "include" });
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

export async function getUserFunStats(
  username: string,
  visibility?: Visibility
): Promise<FunStats> {
  const params = new URLSearchParams();
  if (visibility) params.set("visibility", visibility);

  const query = params.toString();
  const endpoint = `${API_URL}/api/users/${username}/fun${query ? `?${query}` : ""}`;

  const res = await fetch(endpoint, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch fun stats: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserContributions(
  username: string,
  year?: number
): Promise<{ contributions: ContributionWeek[]; totalContributions: number; year: number }> {
  const params = new URLSearchParams();
  if (year) params.set("year", year.toString());

  const query = params.toString();
  const endpoint = `${API_URL}/api/users/${username}/contributions${query ? `?${query}` : ""}`;

  const res = await fetch(endpoint, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch contributions: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserRepoCommits(
  username: string,
  visibility?: Visibility
): Promise<{ commitsByRepo: Record<string, number>; totalCommits: number }> {
  const params = new URLSearchParams();
  if (visibility) params.set("visibility", visibility);

  const query = params.toString();
  const endpoint = `${API_URL}/api/users/${username}/repo-commits${query ? `?${query}` : ""}`;

  const res = await fetch(endpoint, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch repo commits: ${res.statusText}`);
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

export async function getAvailableCountries(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/rankings/countries`, {
    credentials: "include",
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch countries: ${res.statusText}`);
  }
  const data = await res.json();
  return data.countries;
}

export async function getCountryRanking(country: string): Promise<CountryRanking> {
  const res = await fetch(`${API_URL}/api/rankings/country/${encodeURIComponent(country)}`, {
    credentials: "include",
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Country not found");
    }
    throw new Error(`Failed to fetch country ranking: ${res.statusText}`);
  }
  return res.json();
}

export async function getUserRanking(username: string, country?: string): Promise<UserRankingResult> {
  let endpoint = `${API_URL}/api/rankings/user/${encodeURIComponent(username)}`;
  if (country) {
    endpoint += `?country=${encodeURIComponent(country)}`;
  }

  const res = await fetch(endpoint, {
    credentials: "include",
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user ranking: ${res.statusText}`);
  }
  return res.json();
}

export async function getGlobalRanking(limit?: number): Promise<GlobalRanking> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());

  const query = params.toString();
  const endpoint = `${API_URL}/api/rankings/global${query ? `?${query}` : ""}`;

  const res = await fetch(endpoint, {
    credentials: "include",
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch global ranking: ${res.statusText}`);
  }
  return res.json();
}
