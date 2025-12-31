import { execSync } from "child_process";
import type {
  GitHubData,
  GitHubProfile,
  Repository,
  Commit,
  ContributionWeek,
  ContributionDay,
  LanguageStats,
  StreakStats,
} from "./types";

const USERNAME = "tkozakas";

function gh(query: string): string {
  return execSync(`gh api graphql -f query='${query}'`, {
    encoding: "utf-8",
  });
}

function ghRest(endpoint: string): string {
  return execSync(`gh api ${endpoint}`, { encoding: "utf-8" });
}

export async function getGitHubData(): Promise<GitHubData> {
  const profile = getProfile();
  const repositories = getRepositories();
  const recentCommits = getRecentCommits();
  const contributions = getContributions();
  const languages = getLanguages(repositories);
  const streak = calculateStreak(contributions);

  return {
    profile,
    repositories,
    recentCommits,
    contributions,
    languages,
    streak,
  };
}

function getProfile(): GitHubProfile {
  const data = JSON.parse(ghRest(`users/${USERNAME}`));
  return {
    login: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
    bio: data.bio || "",
    location: data.location || "",
    company: data.company || "",
    blog: data.blog || "",
    followers: data.followers,
    following: data.following,
    publicRepos: data.public_repos,
    createdAt: data.created_at,
  };
}

function getRepositories(): Repository[] {
  const data = JSON.parse(
    ghRest(`users/${USERNAME}/repos?sort=updated&per_page=100`)
  );
  return data
    .filter((repo: Record<string, unknown>) => !repo.fork && !repo.archived)
    .slice(0, 20)
    .map((repo: Record<string, unknown>) => ({
      name: repo.name,
      description: repo.description || "",
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || "Unknown",
      updatedAt: repo.updated_at,
      isArchived: repo.archived,
      isFork: repo.fork,
    }));
}

function getRecentCommits(): Commit[] {
  const query = `{
    user(login: "${USERNAME}") {
      contributionsCollection {
        commitContributionsByRepository(maxRepositories: 10) {
          repository {
            name
            url
          }
          contributions(first: 5) {
            nodes {
              commitCount
              occurredAt
            }
          }
        }
      }
    }
  }`;

  try {
    const result = JSON.parse(gh(query));
    const commits: Commit[] = [];
    const repos =
      result.data.user.contributionsCollection.commitContributionsByRepository;

    for (const repo of repos) {
      for (const contrib of repo.contributions.nodes) {
        commits.push({
          sha: "",
          message: `${contrib.commitCount} commit${contrib.commitCount > 1 ? "s" : ""}`,
          repo: repo.repository.name,
          date: contrib.occurredAt,
          url: repo.repository.url,
        });
      }
    }

    return commits
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  } catch {
    return [];
  }
}

function getContributions(): ContributionWeek[] {
  const query = `{
    user(login: "${USERNAME}") {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              contributionLevel
            }
          }
        }
      }
    }
  }`;

  try {
    const result = JSON.parse(gh(query));
    const calendar =
      result.data.user.contributionsCollection.contributionCalendar;

    return calendar.weeks.map(
      (week: { contributionDays: Array<Record<string, unknown>> }) => ({
        days: week.contributionDays.map((day) => ({
          date: day.date,
          count: day.contributionCount,
          level: levelToNumber(day.contributionLevel as string),
        })),
      })
    );
  } catch {
    return [];
  }
}

function levelToNumber(level: string): number {
  const levels: Record<string, number> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };
  return levels[level] || 0;
}

function getLanguages(repos: Repository[]): LanguageStats[] {
  const langCount: Record<string, number> = {};
  let total = 0;

  for (const repo of repos) {
    if (repo.language && repo.language !== "Unknown") {
      langCount[repo.language] = (langCount[repo.language] || 0) + 1;
      total++;
    }
  }

  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Go: "#00ADD8",
    Rust: "#dea584",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Shell: "#89e051",
    Lua: "#000080",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Ruby: "#701516",
    PHP: "#4F5D95",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
  };

  return Object.entries(langCount)
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / total) * 100),
      color: colors[name] || "#8b8b8b",
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);
}

function calculateStreak(contributions: ContributionWeek[]): StreakStats {
  const allDays: ContributionDay[] = contributions.flatMap((w) => w.days);
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalContributions = 0;

  const today = new Date().toISOString().split("T")[0];
  const sortedDays = [...allDays].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const day of sortedDays) {
    totalContributions += day.count;

    if (day.count > 0) {
      tempStreak++;
      if (day.date === today || currentStreak > 0) {
        currentStreak = tempStreak;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
      if (day.date < today) {
        currentStreak = Math.max(currentStreak, 0);
      }
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak, totalContributions };
}
