"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { GitHubStats, UserRanking } from "@/lib/types";
import { getUserStats, getUserRanking } from "@/lib/api";
import { useAuth } from "@/lib/context/AuthContext";
import { Profile } from "./Profile";
import { StreakStats } from "./StreakStats";
import { ContributionGraph } from "./ContributionGraph";
import { Languages } from "./Languages";
import { TopRepos } from "./TopRepos";
import { FunStats } from "./FunStats";
import { RepositoryList } from "./RepositoryList";

interface DashboardProps {
  username: string;
}

type Visibility = "public" | "private" | "all";

export function Dashboard({ username }: DashboardProps) {
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("all");
  const { auth, login, logout } = useAuth();
  const router = useRouter();

  const isOwnProfile = auth.authenticated && auth.username?.toLowerCase() === username.toLowerCase();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserStats(
        username,
        selectedLanguage ?? undefined,
        isOwnProfile ? visibility : undefined
      );
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [username, selectedLanguage, visibility, isOwnProfile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    getUserRanking(username)
      .then((result) => {
        if (result.found && result.ranking) {
          setRanking(result.ranking);
        }
      })
      .catch(() => {});
  }, [username]);

  if (loading && !stats) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !stats) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Header
            auth={auth}
            login={login}
            logout={logout}
            onBack={() => router.push("/")}
            onProfile={() => auth.username && router.push(`/${auth.username}`)}
          />
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Header
          auth={auth}
          login={login}
          logout={logout}
          onBack={() => router.push("/")}
          onProfile={() => auth.username && router.push(`/${auth.username}`)}
          isOwnProfile={isOwnProfile}
          visibility={visibility}
          onVisibilityChange={isOwnProfile ? setVisibility : undefined}
        />

        <Profile profile={stats.profile} ranking={ranking} />

        {!auth.authenticated && (
          <LoginBanner login={login} />
        )}

        <div className="mt-12 space-y-8">
          <StreakStats streak={stats.streak} />
          <FunStats username={username} />
          <ContributionGraph contributions={stats.contributions} />

          <div className="grid gap-8 lg:grid-cols-2">
            <Languages
              languages={stats.languages}
              selectedLanguage={selectedLanguage}
              onLanguageClick={setSelectedLanguage}
            />
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-200">
                Stats
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Repositories shown</span>
                  <span className="text-neutral-200">
                    {stats.repositories.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Last updated</span>
                  <span className="text-neutral-200">
                    {new Date(stats.updatedAt).toLocaleString()}
                  </span>
                </div>
                {selectedLanguage && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Filtered by</span>
                    <span className="text-neutral-200">{selectedLanguage}</span>
                  </div>
                )}
                {isOwnProfile && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Visibility</span>
                    <span className="text-emerald-400 capitalize">{visibility}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TopRepos repositories={stats.repositories} />
          <RepositoryList username={username} />
        </div>

        <footer className="mt-20 border-t border-neutral-900 pt-8 text-center text-sm text-neutral-600">
          <a
            href={`https://github.com/${stats.profile.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neutral-400"
          >
            @{stats.profile.login}
          </a>
        </footer>
      </div>
    </main>
  );
}

interface HeaderProps {
  auth: { authenticated: boolean; username?: string; avatar_url?: string };
  login: () => void;
  logout: () => Promise<void>;
  onBack: () => void;
  onProfile: () => void;
  isOwnProfile?: boolean;
  visibility?: Visibility;
  onVisibilityChange?: (v: Visibility) => void;
}

function Header({ auth, login, logout, onBack, onProfile, isOwnProfile, visibility, onVisibilityChange }: HeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <button
        onClick={onBack}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to search
      </button>
      <div className="flex items-center gap-4">
        {isOwnProfile && onVisibilityChange && (
          <div className="flex items-center gap-1 rounded-lg bg-neutral-800/50 p-1">
            {(["all", "public", "private"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onVisibilityChange(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  visibility === v
                    ? "bg-neutral-700 text-neutral-100"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {v === "all" ? "All" : v === "public" ? "Public" : "Private"}
              </button>
            ))}
          </div>
        )}
        {auth.authenticated ? (
          <>
            <button
              onClick={onProfile}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              {auth.avatar_url && (
                <Image
                  src={auth.avatar_url}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              {auth.username}
            </button>
            <button
              onClick={logout}
              className="text-sm text-neutral-500 hover:text-neutral-300"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}

function LoginBanner({ login }: { login: () => void }) {
  return (
    <div className="mt-6 rounded-xl border border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-200">
            Want to see private contributions?
          </p>
          <p className="text-xs text-neutral-500">
            Login with GitHub to view your complete stats including private repos
          </p>
        </div>
        <button
          onClick={login}
          className="shrink-0 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-600"
        >
          Login with GitHub
        </button>
      </div>
    </div>
  );
}
