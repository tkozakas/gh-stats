export interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  location: string;
  company: string;
  blog: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

export interface Repository {
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  archived: boolean;
  fork: boolean;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  email: string;
  date: string;
  url: string;
  repo: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: number;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface LanguageStats {
  name: string;
  percentage: number;
  color: string;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalContributions: number;
}

export interface GitHubStats {
  profile: GitHubProfile;
  repositories: Repository[];
  contributions: ContributionWeek[];
  languages: LanguageStats[];
  streak: StreakStats;
  updatedAt: string;
}

export interface RepoStats {
  repository: Repository;
  commits: Commit[];
  totalCommits: number;
  firstCommit: string;
  lastCommit: string;
  commitsByDay: Record<string, number>;
  commitsByHour: Record<number, number>;
}

export interface FunStats {
  mostProductiveHour: number;
  mostProductiveDay: string;
  commitsByHour: Record<number, number>;
  commitsByDayOfWeek: Record<string, number>;
  commitsByMonth: Record<string, number>;
  avgCommitsByHour: Record<number, number>;
  avgCommitsByDayOfWeek: Record<string, number>;
  avgCommitsByMonth: Record<string, number>;
  averageCommitsPerDay: number;
  longestCodingStreak: number;
  totalCommits: number;
  totalRepositories: number;
  mostActiveRepo: string;
  mostActiveRepoCommits: number;
  weekendWarriorPercent: number;
  nightOwlPercent: number;
  earlyBirdPercent: number;
}

export interface RepositoriesResult {
  count: number;
  repositories: Repository[];
}

export interface UserSearchResult {
  count: number;
  users: {
    login: string;
    avatar_url: string;
    type: string;
  }[];
}

export interface AuthStatus {
  authenticated: boolean;
  username?: string;
  avatar_url?: string;
}

export interface CountryUser {
  login: string;
  name: string;
  avatarUrl: string;
  location: string;
  followers: number;
  publicContributions: number;
  privateContributions: number;
}

export interface CountryRanking {
  country: string;
  users: CountryUser[];
  updatedAt: string;
}

export interface UserRanking {
  username: string;
  country: string;
  countryRank: number;
  countryTotal: number;
  globalRank: number;
  globalTotal: number;
  publicContributions: number;
  privateContributions: number;
  followers: number;
}

export interface UserRankingResult {
  found: boolean;
  ranking?: UserRanking;
}

export interface GlobalUser {
  login: string;
  country: string;
  publicContributions: number;
}

export interface GlobalRanking {
  users: GlobalUser[];
  total: number;
}

export interface CodeFrequencyWeek {
  week: number;
  additions: number;
  deletions: number;
}

export interface CodeFrequency {
  weeks: CodeFrequencyWeek[];
  totalAdditions: number;
  totalDeletions: number;
}
